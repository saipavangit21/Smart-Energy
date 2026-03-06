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


// ── Embedded seed data (fallback if tariffs.json not deployed) ─────────────
const EMBEDDED_TARIFFS = {
  "_meta": { "source": "Embedded seed Q1 2026", "updated": "2026-03-05", "next_scrape": "2026-03-12", "currency": "EUR", "vat_rate": 0.06 },
  "grid_costs": {
    "flanders":  { "distribution_kWh": 0.0487, "capacity_kW_monthly": 53.90, "transport_kWh": 0.0089, "levies_kWh": 0.0312 },
    "wallonia":  { "distribution_kWh": 0.0521, "transport_kWh": 0.0089, "levies_kWh": 0.0289 },
    "brussels":  { "distribution_kWh": 0.0498, "transport_kWh": 0.0089, "levies_kWh": 0.0341 }
  },
  "suppliers": {
    "engie":         { "id":"engie",         "name":"Engie",         "logo":"🔵","color":"#009DE0","url":"https://www.engie.be",         "plans": [{ "id":"engie-comfort",   "name":"Comfort",      "type":"variable","energy_type":"electricity","duration":"indefinite","regions":["flanders","wallonia","brussels"],"energy_rate_excl_vat":0.1021,"standing_charge_year":96.00, "green":true, "highlights":["Monthly indexed","No exit fee","100% renewable"],"formula":"EPEX_SPP × 1.02 + 2.1","last_verified":"2026-02-01"},{"id":"engie-fix-12","name":"Fix 12","type":"fixed","energy_type":"electricity","duration":"12 months","regions":["flanders","wallonia","brussels"],"energy_rate_excl_vat":0.1089,"standing_charge_year":96.00,"green":true,"highlights":["Price guarantee 12 months","Early exit €75"],"formula":null,"last_verified":"2026-02-01"}] },
    "luminus":       { "id":"luminus",       "name":"Luminus",       "logo":"🟡","color":"#FFD100","url":"https://www.luminus.be",       "plans": [{ "id":"luminus-green",   "name":"Green Flex",   "type":"variable","energy_type":"electricity","duration":"indefinite","regions":["flanders","wallonia","brussels"],"energy_rate_excl_vat":0.0998,"standing_charge_year":89.00, "green":true, "highlights":["EDF Group","100% Belgian wind & solar"],"formula":"EPEX_SPP × 0.98 + 1.8","last_verified":"2026-02-01"},{"id":"luminus-fix-24","name":"Fix 24","type":"fixed","energy_type":"electricity","duration":"24 months","regions":["flanders","wallonia","brussels"],"energy_rate_excl_vat":0.1045,"standing_charge_year":89.00,"green":true,"highlights":["Price locked 2 years","Early exit €150"],"formula":null,"last_verified":"2026-02-01"}] },
    "bolt":          { "id":"bolt",          "name":"Bolt Energy",   "logo":"⚡","color":"#00C896","url":"https://www.bolt.eu/en-be/energy","plans": [{ "id":"bolt-dynamic",    "name":"Dynamic",      "type":"dynamic", "energy_type":"electricity","duration":"indefinite","regions":["flanders","wallonia","brussels"],"energy_rate_excl_vat":null,"markup_cEkWh":0.3,"standing_charge_year":72.00,"green":true,"highlights":["EPEX hourly prices","Lowest markup 0.3 c€/kWh","Best for EV"],"formula":"EPEX_hour + 0.3 c€/kWh","last_verified":"2026-02-01"},{"id":"bolt-flex","name":"Flex","type":"variable","energy_type":"electricity","duration":"indefinite","regions":["flanders","wallonia","brussels"],"energy_rate_excl_vat":0.0965,"standing_charge_year":72.00,"green":true,"highlights":["Monthly EPEX average","No exit fee"],"formula":"EPEX_SPP + 0.5","last_verified":"2026-02-01"}] },
    "totalenergies": { "id":"totalenergies", "name":"TotalEnergies", "logo":"🔴","color":"#F04E23","url":"https://www.totalenergies.be",  "plans": [{ "id":"total-comfort",   "name":"Comfort",      "type":"variable","energy_type":"electricity","duration":"indefinite","regions":["flanders","wallonia","brussels"],"energy_rate_excl_vat":0.1034,"standing_charge_year":84.00,"green":false,"highlights":["Monthly indexed","Combined gas+elec discount"],"formula":"EPEX_SPP × 1.01 + 1.9","last_verified":"2026-02-01"},{"id":"total-fix-12","name":"Fix 12","type":"fixed","energy_type":"electricity","duration":"12 months","regions":["flanders","wallonia","brussels"],"energy_rate_excl_vat":0.1098,"standing_charge_year":84.00,"green":false,"highlights":["12-month price guarantee"],"formula":null,"last_verified":"2026-02-01"},{"id":"total-green","name":"Green Comfort","type":"variable","energy_type":"electricity","duration":"indefinite","regions":["flanders","wallonia","brussels"],"energy_rate_excl_vat":0.1052,"standing_charge_year":84.00,"green":true,"highlights":["100% renewable","Monthly indexed"],"formula":"EPEX_SPP × 1.01 + 2.1","last_verified":"2026-02-01"}] },
    "eneco":         { "id":"eneco",         "name":"Eneco",         "logo":"🟢","color":"#00A651","url":"https://www.eneco.be",         "plans": [{ "id":"eneco-stroom",    "name":"Stroom",       "type":"variable","energy_type":"electricity","duration":"indefinite","regions":["flanders","wallonia","brussels"],"energy_rate_excl_vat":0.0989,"standing_charge_year":99.00, "green":true, "highlights":["100% wind energy","Dutch parent company"],"formula":"EPEX_SPP × 0.97 + 1.6","last_verified":"2026-02-01"},{"id":"eneco-vast","name":"Vast 1 jaar","type":"fixed","energy_type":"electricity","duration":"12 months","regions":["flanders","wallonia","brussels"],"energy_rate_excl_vat":0.1041,"standing_charge_year":99.00,"green":true,"highlights":["Price certainty","Exit fee €95"],"formula":null,"last_verified":"2026-02-01"}] },
    "mega":          { "id":"mega",          "name":"Mega",          "logo":"🟣","color":"#7C3AED","url":"https://www.mega.be",          "plans": [{ "id":"mega-online",     "name":"Online",       "type":"variable","energy_type":"electricity","duration":"indefinite","regions":["flanders","wallonia","brussels"],"energy_rate_excl_vat":0.0887,"standing_charge_year":108.00,"green":false,"highlights":["Lowest energy rate","Online-only management"],"formula":"EPEX_SPP × 0.91 - 2.5","last_verified":"2026-02-01"},{"id":"mega-online-green","name":"Online Green","type":"variable","energy_type":"electricity","duration":"indefinite","regions":["flanders","wallonia","brussels"],"energy_rate_excl_vat":0.0912,"standing_charge_year":108.00,"green":true,"highlights":["100% renewable","Low rate"],"formula":"EPEX_SPP × 0.91 - 2.2","last_verified":"2026-02-01"}] },
    "octaplus":      { "id":"octaplus",      "name":"Octa+",         "logo":"🟠","color":"#F97316","url":"https://www.octaplus.be",      "plans": [{ "id":"octa-flex",       "name":"Flex",         "type":"variable","energy_type":"electricity","duration":"indefinite","regions":["flanders","wallonia","brussels"],"energy_rate_excl_vat":0.1008,"standing_charge_year":91.20, "green":false,"highlights":["Belgian independent","No exit fee"],"formula":"EPEX_SPP + 1.4","last_verified":"2026-02-01"},{"id":"octa-green","name":"Green Flex","type":"variable","energy_type":"electricity","duration":"indefinite","regions":["flanders","wallonia","brussels"],"energy_rate_excl_vat":0.1029,"standing_charge_year":91.20,"green":true,"highlights":["100% Belgian green energy","No exit fee"],"formula":"EPEX_SPP + 1.6","last_verified":"2026-02-01"}] }
  },
  "appliances": {
    "washing_machine": {"label":"Washing machine","icon":"👕","kwh_per_use":0.9, "default_uses_per_week":4,"peak_kw":2.0,"tip":"Run at 30°C or off-peak to save"},
    "dryer":           {"label":"Dryer",           "icon":"🌀","kwh_per_use":2.5, "default_uses_per_week":2,"peak_kw":2.5,"tip":"Air-dry when possible"},
    "dishwasher":      {"label":"Dishwasher",      "icon":"🍽️","kwh_per_use":1.05,"default_uses_per_week":7,"peak_kw":1.8,"tip":"Use eco mode & run off-peak"},
    "ev_charging":     {"label":"EV charging",     "icon":"🚗","kwh_per_use":15.0,"default_uses_per_week":3,"peak_kw":7.4,"tip":"Schedule overnight charging"},
    "heat_pump":       {"label":"Heat pump / boiler","icon":"🌡️","kwh_per_use":8.0,"default_uses_per_week":7,"peak_kw":3.5,"tip":"Program heating schedules"},
    "fridge_freezer":  {"label":"Fridge/freezer",  "icon":"🧊","kwh_per_use":1.2, "default_uses_per_week":7,"peak_kw":0.15,"tip":"Check door seals regularly"},
    "oven":            {"label":"Oven / hob",       "icon":"🍳","kwh_per_use":1.5, "default_uses_per_week":5,"peak_kw":2.2,"tip":"Use residual heat & batch cook"},
    "lighting":        {"label":"Lighting",         "icon":"💡","kwh_per_use":0.5, "default_uses_per_week":7,"peak_kw":0.3,"tip":"Switch to LED — 80% savings"},
    "tv_electronics":  {"label":"TV / electronics", "icon":"📺","kwh_per_use":0.3, "default_uses_per_week":7,"peak_kw":0.2,"tip":"Use smart plugs to kill standby"}
  }
};

// ── Load seed data ────────────────────────────────────────────
function loadSeedData() {
  try {
    // Auto-create data dir + seed file if missing (e.g. first Railway deploy)
    const dir = path.dirname(SEED_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(SEED_FILE)) {
      console.log("[suppliers] tariffs.json not found — writing embedded seed data");
      fs.writeFileSync(SEED_FILE, JSON.stringify(EMBEDDED_TARIFFS, null, 2), "utf8");
    }
    return JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
  } catch (e) {
    console.error("[suppliers] Failed to load seed data:", e.message);
    // Last resort: return embedded data directly
    return EMBEDDED_TARIFFS;
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


// ── GET /api/suppliers/gas ────────────────────────────────────
router.get("/gas", (req, res) => {
  const data = getTariffs();
  if (!data) return res.status(500).json({ success: false, error: "Tariff data unavailable" });

  const consumption = parseFloat(req.query.consumption) || 1700; // avg Belgian gas kWh/yr
  const region      = req.query.region || "flanders";
  const epexAvg     = parseFloat(req.query.ttf) || 35;           // TTF €/MWh

  const gasGrid = (data.gas_grid_costs || {})[region] || { distribution_kWh: 0.0285, transport_kWh: 0.0042, levies_kWh: 0.0089 };
  const VAT = 0.21; // gas VAT is 21% in Belgium

  const results = [];
  for (const [supplierId, supplier] of Object.entries(data.suppliers)) {
    for (const plan of supplier.plans) {
      if (plan.energy_type !== "gas") continue;
      if (!plan.regions.includes(region)) continue;

      let energyRate = plan.energy_rate_excl_vat;
      if (!energyRate && plan.markup_cEkWh != null) {
        energyRate = (epexAvg / 1000) + (plan.markup_cEkWh / 100);
      }
      if (!energyRate) continue;

      const energyCost  = energyRate * consumption;
      const gridCost    = (gasGrid.distribution_kWh + gasGrid.transport_kWh + gasGrid.levies_kWh) * consumption;
      const subtotal    = energyCost + gridCost + plan.standing_charge_year;
      const vat         = subtotal * VAT;
      const total       = subtotal + vat;

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
        formula:        plan.formula,
        energy_rate:    plan.energy_rate_excl_vat,
        markup_cEkWh:   plan.markup_cEkWh,
        standing_charge: plan.standing_charge_year,
        costs: {
          energy:   Math.round(energyCost),
          grid:     Math.round(gridCost),
          standing: Math.round(plan.standing_charge_year),
          vat:      Math.round(vat),
          total:    Math.round(total),
          monthly:  Math.round(total / 12),
          perKwh:   parseFloat((total / consumption * 100).toFixed(3)),
        },
      });
    }
  }

  results.sort((a, b) => a.costs.total - b.costs.total);
  if (results.length > 0) results[0].cheapest = true;
  const cheapestTotal = results[0]?.costs.total || 0;
  results.forEach((r, i) => { r.rank = i + 1; r.savings_vs_cheapest = i === 0 ? 0 : r.costs.total - cheapestTotal; });

  res.json({ success: true, region, consumption, ttf_avg: epexAvg, count: results.length, results });
});

module.exports = { router, runWeeklyScrape };