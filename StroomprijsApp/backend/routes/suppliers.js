/**
 * routes/suppliers.js
 * 
 * Supplier tariff scraping + appliance-based consumption calculator
 * Scrapes publicly accessible tariff pages weekly, falls back to seed data
 * 
 * Endpoints:
 *   GET /api/suppliers/electricity?region=flanders&consumption=3500&region=flanders
 *   GET /api/suppliers/appliances          — appliance metadata
 *   POST /api/suppliers/calculate          — body: { appliances: [{id, uses_per_week}], region }
 *   GET /api/suppliers/plans/:supplierId   — all plans for one supplier
 *   GET /api/suppliers/compare             — ranked comparison for given consumption
 */

const express   = require("express");
const router    = express.Router();
const NodeCache = require("node-cache");
const fs        = require("fs");
const path      = require("path");

const cache    = new NodeCache({ stdTTL: 3600 * 6 }); // 6hr cache
const SEED_FILE = path.join(__dirname, "../data/tariffs.json");

// ── Load seed data ────────────────────────────────────────────
function loadSeedData() {
  try {
    return JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
  } catch (e) {
    console.error("[suppliers] Failed to load seed data:", e.message);
    return null;
  }
}

function saveSeedData(data) {
  try {
    data._meta.updated = new Date().toISOString().split("T")[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    data._meta.next_scrape = nextWeek.toISOString().split("T")[0];
    fs.writeFileSync(SEED_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("[suppliers] Failed to save tariff data:", e.message);
  }
}

// ── Scraper: try to fetch latest energy rates from supplier pages ──
// We can only scrape publicly available tariff card PDFs/pages
// Each supplier that publishes machine-readable data gets a scraper
// Others fall back to seed data with a staleness warning

async function scrapeBolt() {
  try {
    // Bolt publishes tariffs on a simple page we can parse
    const res = await fetch("https://www.bolt.eu/en-be/energy/electricity/", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SmartPrice/1.0; +https://smartprice.be)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    // Look for markup value pattern like "0.3 c€/kWh" or "€0.003/kWh"
    const markupMatch = html.match(/(\d+\.?\d*)\s*c[€e]\/kWh\s*markup/i);
    const standingMatch = html.match(/(\d+)[,.]?\d*\s*€\s*\/\s*year/i);

    const result = {};
    if (markupMatch) result.markup_cEkWh = parseFloat(markupMatch[1]);
    if (standingMatch) result.standing_charge_year = parseFloat(standingMatch[1]);
    return result;
  } catch (e) {
    console.warn("[suppliers] Bolt scrape failed:", e.message);
    return null;
  }
}

async function scrapeMega() {
  try {
    // Mega publishes a tariff card PDF — parse the URL pattern
    const res = await fetch("https://www.mega.be/nl/energie/tariefkaarten", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SmartPrice/1.0; +https://smartprice.be)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    // Look for energy rate patterns
    const rateMatch = html.match(/(\d+,\d+)\s*c[€e]\/kWh/);
    if (rateMatch) {
      const rate = parseFloat(rateMatch[1].replace(",", ".")) / 100;
      return { energy_rate_excl_vat: rate };
    }
    return null;
  } catch (e) {
    console.warn("[suppliers] Mega scrape failed:", e.message);
    return null;
  }
}

// ── Full weekly scrape ────────────────────────────────────────
async function runWeeklyScrape() {
  console.log("[suppliers] Starting weekly tariff scrape...");
  const data = loadSeedData();
  if (!data) return;

  let updated = 0;

  // Bolt
  const boltData = await scrapeBolt();
  if (boltData) {
    const dynPlan = data.suppliers.bolt.plans.find(p => p.id === "bolt-dynamic");
    if (dynPlan) {
      if (boltData.markup_cEkWh)       dynPlan.markup_cEkWh = boltData.markup_cEkWh;
      if (boltData.standing_charge_year) dynPlan.standing_charge_year = boltData.standing_charge_year;
      dynPlan.last_verified = new Date().toISOString().split("T")[0];
      updated++;
      console.log("[suppliers] Bolt tariff updated from scrape");
    }
  }

  // Mega
  const megaData = await scrapeMega();
  if (megaData) {
    const onlinePlan = data.suppliers.mega.plans.find(p => p.id === "mega-online");
    if (onlinePlan && megaData.energy_rate_excl_vat) {
      onlinePlan.energy_rate_excl_vat = megaData.energy_rate_excl_vat;
      onlinePlan.last_verified = new Date().toISOString().split("T")[0];
      updated++;
      console.log("[suppliers] Mega tariff updated from scrape");
    }
  }

  // Save updated data
  saveSeedData(data);
  cache.del("tariffs");
  console.log(`[suppliers] Weekly scrape complete. ${updated} supplier(s) auto-updated. ${Object.keys(data.suppliers).length - updated} use seed data.`);
}

// ── Get tariff data (cached) ──────────────────────────────────
function getTariffs() {
  const cached = cache.get("tariffs");
  if (cached) return cached;
  const data = loadSeedData();
  if (data) cache.set("tariffs", data);
  return data;
}

// ── Cost calculation engine ───────────────────────────────────
// Uses Belgian bill breakdown:
// Total = (energy + grid + levies) × (1 + VAT)
// Flanders: grid = capacity-based (kW peak) + small kWh component
// Wallonia/Brussels: grid = pure kWh-based

function calcAnnualCost({ energyRate, markupCEkWh, standingCharge, consumption, region, peakKw, epexAvg }) {
  const grid = getTariffs()?.grid_costs?.[region] || getTariffs()?.grid_costs?.flanders;
  const VAT = 0.06;

  // Energy component (excl VAT)
  let energyCost;
  if (energyRate) {
    energyCost = energyRate * consumption;
  } else if (markupCEkWh !== undefined && epexAvg) {
    // Dynamic: EPEX average + markup
    energyCost = ((epexAvg / 1000) + (markupCEkWh / 100)) * consumption;
  } else {
    return null;
  }

  // Grid cost
  let gridCost;
  if (region === "flanders") {
    // Flanders: capacity tariff (monthly peak kW × rate × 12) + small kWh component + transport
    const peak = Math.max(peakKw || 2.5, 2.5); // min 2.5 kW
    const capacityCost = peak * grid.capacity_kW_monthly * 12;
    const distribCost  = grid.distribution_kWh * consumption;
    const transportCost = grid.transport_kWh * consumption;
    const leviesCost   = grid.levies_kWh * consumption;
    gridCost = capacityCost + distribCost + transportCost + leviesCost;
  } else {
    gridCost = (grid.distribution_kWh + grid.transport_kWh + grid.levies_kWh) * consumption;
  }

  const subtotal = energyCost + gridCost + standingCharge;
  const vat      = subtotal * VAT;
  const total    = subtotal + vat;

  return {
    energy:   Math.round(energyCost),
    grid:     Math.round(gridCost),
    standing: Math.round(standingCharge),
    vat:      Math.round(vat),
    total:    Math.round(total),
    monthly:  Math.round(total / 12),
    perKwh:   parseFloat((total / consumption * 100).toFixed(3)),
  };
}

// ── Consumption from appliances ───────────────────────────────
function calcConsumptionFromAppliances(applianceInputs) {
  const data = getTariffs();
  if (!data) return null;

  let totalAnnualKwh = 0;
  let peakKw = 0;
  const breakdown = [];

  for (const input of applianceInputs) {
    const appliance = data.appliances[input.id];
    if (!appliance) continue;

    const usesPerWeek = input.uses_per_week ?? appliance.default_uses_per_week;
    const annualUses  = usesPerWeek * 52;
    const annualKwh   = appliance.kwh_per_use * annualUses;
    totalAnnualKwh   += annualKwh;

    // Estimate peak (simplified: assume worst-case concurrent usage contributes to peak)
    if (appliance.peak_kw > peakKw) peakKw = appliance.peak_kw;

    breakdown.push({
      id:          input.id,
      label:       appliance.label,
      icon:        appliance.icon,
      uses_per_week: usesPerWeek,
      kwh_per_use: appliance.kwh_per_use,
      annual_kwh:  Math.round(annualKwh),
      pct:         0, // filled below
      tip:         appliance.tip,
    });
  }

  // Add base consumption (always-on devices not listed)
  const baseKwh = 600; // ~600 kWh/yr baseline (network equipment, chargers, etc.)
  totalAnnualKwh += baseKwh;

  // Fill percentages
  breakdown.forEach(b => {
    b.pct = Math.round((b.annual_kwh / totalAnnualKwh) * 100);
  });

  return {
    total_kwh: Math.round(totalAnnualKwh),
    peak_kw:   parseFloat(peakKw.toFixed(1)),
    breakdown,
    household_size: estimateHouseholdSize(totalAnnualKwh),
  };
}

function estimateHouseholdSize(kwh) {
  if (kwh < 2000) return "Studio / 1 person";
  if (kwh < 3500) return "1–2 persons";
  if (kwh < 5000) return "Family (3–4 persons)";
  if (kwh < 8000) return "Large family or EV";
  return "Large household with EV / heat pump";
}

// ── GET /api/suppliers/electricity ───────────────────────────
router.get("/electricity", (req, res) => {
  const data = getTariffs();
  if (!data) return res.status(500).json({ success: false, error: "Tariff data unavailable" });

  const consumption = parseInt(req.query.consumption) || 3500;
  const region      = req.query.region || "flanders";
  const greenOnly   = req.query.green === "true";
  const epexAvg     = parseFloat(req.query.epex) || 100; // €/MWh current average
  const peakKw      = parseFloat(req.query.peak_kw) || 2.5;

  const results = [];

  for (const [supplierId, supplier] of Object.entries(data.suppliers)) {
    for (const plan of supplier.plans) {
      if (plan.energy_type !== "electricity") continue;
      if (greenOnly && !plan.green) continue;
      if (!plan.regions.includes(region)) continue;

      const costs = calcAnnualCost({
        energyRate:    plan.energy_rate_excl_vat,
        markupCEkWh:   plan.markup_cEkWh,
        standingCharge: plan.standing_charge_year,
        consumption,
        region,
        peakKw,
        epexAvg,
      });

      if (!costs) continue;

      const staleDays = plan.last_verified
        ? Math.floor((Date.now() - new Date(plan.last_verified).getTime()) / 86400000)
        : 999;

      results.push({
        supplier_id:   supplierId,
        supplier_name: supplier.name,
        supplier_logo: supplier.logo,
        supplier_color: supplier.color,
        supplier_url:  supplier.url,
        plan_id:       plan.id,
        plan_name:     plan.name,
        type:          plan.type,
        green:         plan.green,
        duration:      plan.duration,
        highlights:    plan.highlights,
        formula:       plan.formula,
        energy_rate:   plan.energy_rate_excl_vat,
        markup_cEkWh:  plan.markup_cEkWh,
        standing_charge: plan.standing_charge_year,
        costs,
        stale_days:    staleDays,
        last_verified: plan.last_verified,
        data_fresh:    staleDays < 14,
      });
    }
  }

  // Sort by total annual cost
  results.sort((a, b) => a.costs.total - b.costs.total);

  // Mark cheapest
  if (results.length > 0) results[0].cheapest = true;

  // Add rank + savings vs cheapest
  const cheapestTotal = results[0]?.costs.total || 0;
  results.forEach((r, i) => {
    r.rank = i + 1;
    r.savings_vs_cheapest = i === 0 ? 0 : r.costs.total - cheapestTotal;
  });

  res.json({
    success: true,
    region,
    consumption,
    peak_kw: peakKw,
    epex_avg: epexAvg,
    data_updated: data._meta.updated,
    next_scrape:  data._meta.next_scrape,
    count: results.length,
    results,
  });
});

// ── GET /api/suppliers/appliances ────────────────────────────
router.get("/appliances", (req, res) => {
  const data = getTariffs();
  if (!data) return res.status(500).json({ success: false, error: "Data unavailable" });

  res.json({
    success: true,
    appliances: Object.entries(data.appliances).map(([id, a]) => ({ id, ...a })),
  });
});

// ── POST /api/suppliers/calculate ────────────────────────────
// Body: { appliances: [{id, uses_per_week}], region, epex_avg, green_only }
router.post("/calculate", (req, res) => {
  const { appliances: inputs = [], region = "flanders", epex_avg = 100, green_only = false } = req.body;
  if (!inputs.length) return res.status(400).json({ success: false, error: "No appliances provided" });

  const consumption = calcConsumptionFromAppliances(inputs);
  if (!consumption) return res.status(500).json({ success: false, error: "Calculation failed" });

  // Now get supplier results for this consumption
  const data = getTariffs();
  const results = [];

  for (const [supplierId, supplier] of Object.entries(data.suppliers)) {
    for (const plan of supplier.plans) {
      if (plan.energy_type !== "electricity") continue;
      if (green_only && !plan.green) continue;
      if (!plan.regions.includes(region)) continue;

      const costs = calcAnnualCost({
        energyRate:    plan.energy_rate_excl_vat,
        markupCEkWh:   plan.markup_cEkWh,
        standingCharge: plan.standing_charge_year,
        consumption:   consumption.total_kwh,
        region,
        peakKw:        consumption.peak_kw,
        epexAvg:       epex_avg,
      });

      if (!costs) continue;

      results.push({
        supplier_id:    supplierId,
        supplier_name:  supplier.name,
        supplier_logo:  supplier.logo,
        supplier_color: supplier.color,
        supplier_url:   supplier.url,
        plan_id:        plan.id,
        plan_name:      plan.name,
        type:           plan.type,
        green:          plan.green,
        duration:       plan.duration,
        highlights:     plan.highlights,
        costs,
      });
    }
  }

  results.sort((a, b) => a.costs.total - b.costs.total);
  if (results.length > 0) results[0].cheapest = true;
  const cheapestTotal = results[0]?.costs.total || 0;
  results.forEach((r, i) => { r.rank = i + 1; r.savings_vs_cheapest = i === 0 ? 0 : r.costs.total - cheapestTotal; });

  res.json({
    success: true,
    consumption,
    region,
    plan_count: results.length,
    results,
  });
});

// ── GET /api/suppliers/plans/:supplierId ─────────────────────
router.get("/plans/:supplierId", (req, res) => {
  const data = getTariffs();
  if (!data) return res.status(500).json({ success: false });
  const supplier = data.suppliers[req.params.supplierId];
  if (!supplier) return res.status(404).json({ success: false, error: "Supplier not found" });
  res.json({ success: true, supplier: { ...supplier } });
});

// ── GET /api/suppliers/meta ───────────────────────────────────
router.get("/meta", (req, res) => {
  const data = getTariffs();
  if (!data) return res.status(500).json({ success: false });
  res.json({
    success: true,
    meta: data._meta,
    supplier_count: Object.keys(data.suppliers).length,
    plan_count: Object.values(data.suppliers).reduce((n, s) => n + s.plans.length, 0),
    suppliers: Object.entries(data.suppliers).map(([id, s]) => ({
      id, name: s.name, logo: s.logo, color: s.color, plan_count: s.plans.length,
    })),
  });
});

module.exports = { router, runWeeklyScrape };