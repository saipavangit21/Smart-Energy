/**
 * routes/suppliers.js — SmartPrice.be
 *
 * SCRAPING STRATEGY (3-tier, most reliable first):
 *  1. VREG tariff database — official Flemish regulator, monthly XML/CSV
 *  2. CallMePower.be       — aggregator with clean HTML price tables
 *  3. Individual supplier pages — Bolt, Mega, Octa+ (have public tariff cards)
 *
 * Endpoints:
 *   GET  /api/suppliers/electricity   ?consumption=3500&region=flanders&green=true&epex=100
 *   GET  /api/suppliers/gas           ?consumption=13000&region=flanders&ttf=35
 *   GET  /api/suppliers/appliances                — electricity appliance metadata
 *   GET  /api/suppliers/gas-appliances            — gas appliance metadata
 *   POST /api/suppliers/calculate                 — electricity: {appliances, region, epex_avg}
 *   POST /api/suppliers/calculate-gas             — gas: {appliances, region, ttf_avg}
 *   GET  /api/suppliers/meta                      — data freshness + supplier list
 *   GET  /api/suppliers/scrape                    — manual trigger (admin)
 */

const express   = require("express");
const axios     = require("axios");
const router    = express.Router();
const NodeCache = require("node-cache");
const fs        = require("fs");
const path      = require("path");

const cache    = new NodeCache({ stdTTL: 3600 * 6 });
const SEED_FILE = path.join(__dirname, "../data/tariffs.json");
const SCRAPE_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

// ─────────────────────────────────────────────────────────────
// EMBEDDED SEED DATA  (deployed with the app, always available)
// ─────────────────────────────────────────────────────────────
const EMBEDDED_TARIFFS = {
  "_meta": {
    "source":      "SmartPrice seed Q1 2026",
    "updated":     "2026-03-06",
    "next_scrape": "2026-03-13",
    "currency":    "EUR",
    "vat_elec":    0.06,
    "vat_gas":     0.21
  },

  // ── Electricity grid costs (excl VAT) ──────────────────────
  "grid_costs": {
    "flanders": {
      "distribution_kWh":  0.0487,
      "capacity_kW_monthly": 4.48,    // Flanders capacity tariff €/kW/month (CREG 2024)
      "transport_kWh":     0.0089,
      "levies_kWh":        0.0312,
      "prosumer_kWh":      0.0          // 0 if no solar
    },
    "wallonia": {
      "distribution_kWh":  0.0521,
      "transport_kWh":     0.0089,
      "levies_kWh":        0.0289
    },
    "brussels": {
      "distribution_kWh":  0.0498,
      "transport_kWh":     0.0089,
      "levies_kWh":        0.0341
    }
  },

  // ── Gas grid costs (excl VAT) ───────────────────────────────
  "gas_grid_costs": {
    "flanders": { "distribution_kWh": 0.0285, "transport_kWh": 0.0042, "levies_kWh": 0.0089, "excise_kWh": 0.0028 },
    "wallonia":  { "distribution_kWh": 0.0312, "transport_kWh": 0.0042, "levies_kWh": 0.0076, "excise_kWh": 0.0028 },
    "brussels":  { "distribution_kWh": 0.0298, "transport_kWh": 0.0042, "levies_kWh": 0.0081, "excise_kWh": 0.0028 }
  },

  // ── Supplier plans ─────────────────────────────────────────
  "suppliers": {
    "engie": {
      "id": "engie", "name": "Engie", "logo": "🔵", "color": "#009DE0",
      "url": "https://www.engie.be", "scrape_url": "https://www.engie.be/nl/thuis/elektriciteit-en-gas/tarieven/",
      "plans": [
        { "id":"engie-elec-comfort",    "name":"Comfort",       "type":"variable", "energy_type":"electricity", "duration":"indefinite",  "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.1021, "standing_charge_year":96.00,  "green":true,  "highlights":["Monthly TTF/EPEX indexed","No exit fee","100% renewable"], "formula":"EPEX_SPP × 1.02 + 2.1 c€", "last_verified":"2026-03-01" },
        { "id":"engie-elec-fix12",      "name":"Fix 12",        "type":"fixed",    "energy_type":"electricity", "duration":"12 months",  "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.1089, "standing_charge_year":96.00,  "green":true,  "highlights":["Guaranteed rate 12 months","Early exit €75"],               "formula":null,                   "last_verified":"2026-03-01" },
        { "id":"engie-elec-fix24",      "name":"Fix 24",        "type":"fixed",    "energy_type":"electricity", "duration":"24 months",  "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.1105, "standing_charge_year":96.00,  "green":true,  "highlights":["Guaranteed rate 24 months","Early exit €130"],              "formula":null,                   "last_verified":"2026-03-01" },
        { "id":"engie-gas-comfort",     "name":"Gas Comfort",   "type":"variable", "energy_type":"gas",         "duration":"indefinite",  "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.0821, "standing_charge_year":85.20,  "green":false, "highlights":["Monthly TTF-indexed","No exit fee","Combined elec+gas discount"], "formula":"TTF_monthly + 2.1 c€", "last_verified":"2026-03-01" },
        { "id":"engie-gas-fix12",       "name":"Gas Fix 12",    "type":"fixed",    "energy_type":"gas",         "duration":"12 months",  "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.0879, "standing_charge_year":85.20,  "green":false, "highlights":["Price locked 12 months","Exit fee €75"],                   "formula":null,                   "last_verified":"2026-03-01" }
      ]
    },
    "luminus": {
      "id": "luminus", "name": "Luminus", "logo": "🟡", "color": "#FFD100",
      "url": "https://www.luminus.be", "scrape_url": "https://www.luminus.be/nl/prive/elektriciteit-gas/tarieven",
      "plans": [
        { "id":"luminus-elec-greenflex", "name":"Green Flex",   "type":"variable", "energy_type":"electricity", "duration":"indefinite", "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.0998, "standing_charge_year":89.00, "green":true,  "highlights":["EDF Group","100% Belgian wind & solar","Monthly indexed"], "formula":"EPEX_SPP × 0.98 + 1.8 c€", "last_verified":"2026-03-01" },
        { "id":"luminus-elec-fix24",     "name":"Fix 24",       "type":"fixed",    "energy_type":"electricity", "duration":"24 months",  "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.1045, "standing_charge_year":89.00, "green":true,  "highlights":["Price locked 24 months","Early exit €150"],                "formula":null,                       "last_verified":"2026-03-01" },
        { "id":"luminus-gas-flex",       "name":"Gas Flex",     "type":"variable", "energy_type":"gas",         "duration":"indefinite", "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.0805, "standing_charge_year":79.00, "green":false, "highlights":["EDF Group","Monthly TTF indexed","Online management"],      "formula":"TTF_monthly + 1.8 c€",     "last_verified":"2026-03-01" },
        { "id":"luminus-gas-fix24",      "name":"Gas Fix 24",   "type":"fixed",    "energy_type":"gas",         "duration":"24 months",  "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.0869, "standing_charge_year":79.00, "green":false, "highlights":["Price certainty 24 months","Exit fee €150"],                "formula":null,                       "last_verified":"2026-03-01" }
      ]
    },
    "bolt": {
      "id": "bolt", "name": "Bolt Energy", "logo": "⚡", "color": "#00C896",
      "url": "https://www.bolt.eu/en-be/energy", "scrape_url": "https://www.bolt.eu/en-be/energy/electricity/",
      "plans": [
        { "id":"bolt-elec-dynamic", "name":"Dynamic",   "type":"dynamic",  "energy_type":"electricity", "duration":"indefinite", "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":null,   "markup_cEkWh":0.3,  "standing_charge_year":72.00, "green":true,  "highlights":["EPEX hourly pricing","Lowest markup 0.3 c€/kWh","Best for EV owners","Smart charging support"], "formula":"EPEX_hour + 0.3 c€/kWh", "last_verified":"2026-03-01" },
        { "id":"bolt-elec-flex",    "name":"Flex",       "type":"variable", "energy_type":"electricity", "duration":"indefinite", "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.0965, "markup_cEkWh":null, "standing_charge_year":72.00, "green":true,  "highlights":["Monthly EPEX average","No exit fee","100% renewable"],                                           "formula":"EPEX_SPP + 0.5 c€/kWh",  "last_verified":"2026-03-01" },
        { "id":"bolt-gas-dynamic",  "name":"Gas Dynamic","type":"dynamic",  "energy_type":"gas",         "duration":"indefinite", "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":null,   "markup_cEkWh":0.5,  "standing_charge_year":65.00, "green":false, "highlights":["TTF daily price + 0.5 c€/kWh","Lowest standing charge","Flexible month-to-month"],              "formula":"TTF_daily + 0.5 c€/kWh", "last_verified":"2026-03-01" }
      ]
    },
    "totalenergies": {
      "id": "totalenergies", "name": "TotalEnergies", "logo": "🔴", "color": "#F04E23",
      "url": "https://www.totalenergies.be", "scrape_url": "https://www.totalenergies.be/nl/prive/energie/elektriciteit/tarieven",
      "plans": [
        { "id":"total-elec-comfort", "name":"Comfort",       "type":"variable", "energy_type":"electricity", "duration":"indefinite", "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.1034, "standing_charge_year":84.00, "green":false, "highlights":["Monthly EPEX indexed","Combined gas+elec discount","5% multi-energy discount"], "formula":"EPEX_SPP × 1.01 + 1.9 c€", "last_verified":"2026-03-01" },
        { "id":"total-elec-fix12",   "name":"Fix 12",        "type":"fixed",    "energy_type":"electricity", "duration":"12 months",  "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.1098, "standing_charge_year":84.00, "green":false, "highlights":["12-month price guarantee","No price surprises"],                                  "formula":null,                       "last_verified":"2026-03-01" },
        { "id":"total-elec-green",   "name":"Green Comfort", "type":"variable", "energy_type":"electricity", "duration":"indefinite", "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.1052, "standing_charge_year":84.00, "green":true,  "highlights":["100% certified renewable","Monthly indexed"],                                     "formula":"EPEX_SPP × 1.01 + 2.1 c€", "last_verified":"2026-03-01" },
        { "id":"total-gas-comfort",  "name":"Gas Comfort",   "type":"variable", "energy_type":"gas",         "duration":"indefinite", "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.0849, "standing_charge_year":72.00, "green":false, "highlights":["Monthly TTF indexed","Combined discount available"],                              "formula":"TTF_monthly + 1.9 c€",     "last_verified":"2026-03-01" },
        { "id":"total-gas-fix12",    "name":"Gas Fix 12",    "type":"fixed",    "energy_type":"gas",         "duration":"12 months",  "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.0899, "standing_charge_year":72.00, "green":false, "highlights":["12-month price guarantee","Early exit €75"],                                       "formula":null,                       "last_verified":"2026-03-01" }
      ]
    },
    "eneco": {
      "id": "eneco", "name": "Eneco", "logo": "🟢", "color": "#00A651",
      "url": "https://www.eneco.be", "scrape_url": "https://www.eneco.be/nl/energie/stroom-en-gas/tarieven/",
      "plans": [
        { "id":"eneco-elec-stroom",  "name":"Stroom",       "type":"variable", "energy_type":"electricity", "duration":"indefinite", "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.0989, "standing_charge_year":99.00, "green":true,  "highlights":["100% wind energy","Dutch parent company","Monthly EPEX indexed"], "formula":"EPEX_SPP × 0.97 + 1.6 c€", "last_verified":"2026-03-01" },
        { "id":"eneco-elec-vast",    "name":"Vast 1 jaar",  "type":"fixed",    "energy_type":"electricity", "duration":"12 months",  "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.1041, "standing_charge_year":99.00, "green":true,  "highlights":["Price certainty","100% renewable","Exit fee €95"],               "formula":null,                       "last_verified":"2026-03-01" },
        { "id":"eneco-gas-flex",     "name":"Gas Flex",     "type":"variable", "energy_type":"gas",         "duration":"indefinite", "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.0792, "standing_charge_year":90.00, "green":false, "highlights":["Dutch parent company","Monthly TTF indexed"],                     "formula":"TTF_monthly + 1.5 c€",     "last_verified":"2026-03-01" },
        { "id":"eneco-gas-vast",     "name":"Gas Vast",     "type":"fixed",    "energy_type":"gas",         "duration":"12 months",  "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.0845, "standing_charge_year":90.00, "green":false, "highlights":["12-month fixed rate","Exit fee €95"],                            "formula":null,                       "last_verified":"2026-03-01" }
      ]
    },
    "mega": {
      "id": "mega", "name": "Mega", "logo": "🟣", "color": "#7C3AED",
      "url": "https://www.mega.be", "scrape_url": "https://www.mega.be/nl/energie/tariefkaarten",
      "plans": [
        { "id":"mega-elec-online",      "name":"Online",       "type":"variable", "energy_type":"electricity", "duration":"indefinite", "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.0887, "standing_charge_year":108.00, "green":false, "highlights":["Lowest energy rate","Online-only management","EPEX-linked"], "formula":"EPEX_SPP × 0.91 − 2.5 c€", "last_verified":"2026-03-01" },
        { "id":"mega-elec-online-green","name":"Online Green", "type":"variable", "energy_type":"electricity", "duration":"indefinite", "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.0912, "standing_charge_year":108.00, "green":true,  "highlights":["100% renewable","Low rate","EPEX-linked"],                 "formula":"EPEX_SPP × 0.91 − 2.2 c€", "last_verified":"2026-03-01" },
        { "id":"mega-gas-online",       "name":"Gas Online",   "type":"variable", "energy_type":"gas",         "duration":"indefinite", "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.0713, "standing_charge_year":95.40,  "green":false, "highlights":["Lowest gas rate","Online-only","TTF × 0.91"],               "formula":"TTF_monthly × 0.91 − 1.5 c€","last_verified":"2026-03-01" }
      ]
    },
    "octaplus": {
      "id": "octaplus", "name": "Octa+", "logo": "🟠", "color": "#F97316",
      "url": "https://www.octaplus.be", "scrape_url": "https://www.octaplus.be/nl/tarieven",
      "plans": [
        { "id":"octa-elec-flex",   "name":"Flex",       "type":"variable", "energy_type":"electricity", "duration":"indefinite", "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.1008, "standing_charge_year":91.20, "green":false, "highlights":["Belgian independent","No exit fee","Monthly indexed"],           "formula":"EPEX_SPP + 1.4 c€",     "last_verified":"2026-03-01" },
        { "id":"octa-elec-green",  "name":"Green Flex", "type":"variable", "energy_type":"electricity", "duration":"indefinite", "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.1029, "standing_charge_year":91.20, "green":true,  "highlights":["100% Belgian green","No exit fee","Monthly indexed"],            "formula":"EPEX_SPP + 1.6 c€",     "last_verified":"2026-03-01" },
        { "id":"octa-elec-fix12",  "name":"Fix 12",     "type":"fixed",    "energy_type":"electricity", "duration":"12 months",  "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.1065, "standing_charge_year":91.20, "green":false, "highlights":["12-month fixed price","Belgian independent","Exit fee €50"],   "formula":null,                     "last_verified":"2026-03-01" },
        { "id":"octa-gas-flex",    "name":"Gas Flex",   "type":"variable", "energy_type":"gas",         "duration":"indefinite", "regions":["flanders","wallonia","brussels"], "energy_rate_excl_vat":0.0810, "standing_charge_year":80.00, "green":false, "highlights":["Belgian independent","Monthly TTF indexed","No exit fee"],     "formula":"TTF_monthly + 1.6 c€",   "last_verified":"2026-03-01" }
      ]
    }
  },

  // ── Electricity appliances ─────────────────────────────────
  "appliances": {
    "washing_machine":   { "label":"Washing machine",        "icon":"👕", "kwh_per_use":0.9,  "default_uses_per_week":4, "peak_kw":2.0,  "tip":"Run at 30°C and off-peak hours to cut costs by up to 40%" },
    "dishwasher":        { "label":"Dishwasher",              "icon":"🍽️", "kwh_per_use":1.05, "default_uses_per_week":7, "peak_kw":1.8,  "tip":"Use eco-mode and only run full loads off-peak" },
    "dryer":             { "label":"Tumble dryer",            "icon":"🌀", "kwh_per_use":2.5,  "default_uses_per_week":2, "peak_kw":2.5,  "tip":"Biggest single load after EV — air-dry when possible" },
    "ev_charging":       { "label":"EV charging (7.4kW)",     "icon":"🚗", "kwh_per_use":15.0, "default_uses_per_week":3, "peak_kw":7.4,  "tip":"Schedule overnight (00:00–06:00) to benefit from low EPEX prices" },
    "ev_charging_fast":  { "label":"EV fast charge (22kW)",   "icon":"⚡", "kwh_per_use":40.0, "default_uses_per_week":1, "peak_kw":22.0, "tip":"High peak load — use slower overnight charging to avoid high capacity tariff (Flanders)" },
    "heat_pump":         { "label":"Heat pump / boiler",      "icon":"🌡️", "kwh_per_use":8.0,  "default_uses_per_week":7, "peak_kw":3.5,  "tip":"Programme heating schedule; 1°C lower = ~7% savings" },
    "fridge_freezer":    { "label":"Fridge/freezer",          "icon":"🧊", "kwh_per_use":1.2,  "default_uses_per_week":7, "peak_kw":0.15, "tip":"Always-on load — check door seals and keep coils clean" },
    "oven":              { "label":"Oven / hob",              "icon":"🍳", "kwh_per_use":1.5,  "default_uses_per_week":5, "peak_kw":2.2,  "tip":"Use residual heat for last 10 min and batch-cook where possible" },
    "lighting":          { "label":"Lighting",                "icon":"💡", "kwh_per_use":0.5,  "default_uses_per_week":7, "peak_kw":0.3,  "tip":"LED bulbs use 80% less — replace any remaining halogen/incandescent" },
    "tv_electronics":    { "label":"TV / home electronics",   "icon":"📺", "kwh_per_use":0.3,  "default_uses_per_week":7, "peak_kw":0.2,  "tip":"Smart plugs eliminate standby — ~80 kWh/yr saved per device cluster" },
    "pc_office":         { "label":"PC / home office",        "icon":"💻", "kwh_per_use":0.4,  "default_uses_per_week":5, "peak_kw":0.35, "tip":"Enable power-save mode; a laptop uses 5× less than a desktop+monitor" },
    "pool_pump":         { "label":"Pool pump",               "icon":"🏊", "kwh_per_use":1.2,  "default_uses_per_week":7, "peak_kw":0.75, "tip":"Timer-control to run during cheapest EPEX hours (usually 01:00–06:00)" },
    "sauna":             { "label":"Sauna",                   "icon":"🧖", "kwh_per_use":3.5,  "default_uses_per_week":1, "peak_kw":6.0,  "tip":"High peak load — never run simultaneously with EV or heat pump" }
  },

  // ── Gas appliances ─────────────────────────────────────────
  "appliances_gas": {
    "gas_heating":   { "label":"Central heating (gas)",  "icon":"🔥", "kwh_per_use":45.0, "default_uses_per_week":7, "tip":"Lower thermostat 1°C = ~7% less gas. Night setback saves 10–15%." },
    "gas_boiler":    { "label":"Hot water (gas boiler)",  "icon":"🚿", "kwh_per_use":8.0,  "default_uses_per_week":7, "tip":"Set to 55°C; insulate hot water pipes and cylinder" },
    "gas_cooking":   { "label":"Gas hob / oven",          "icon":"🍲", "kwh_per_use":0.6,  "default_uses_per_week":10,"tip":"Use lids on pots; match burner size to pan; batch-cook" },
    "gas_dryer":     { "label":"Gas tumble dryer",        "icon":"🌀", "kwh_per_use":1.2,  "default_uses_per_week":2, "tip":"More efficient per cycle than electric; only run full loads" },
    "gas_fireplace": { "label":"Gas fireplace",           "icon":"🕯️", "kwh_per_use":3.5,  "default_uses_per_week":3, "tip":"Zone heating — great for supplementing central heating in one room" }
  }
};

// ─────────────────────────────────────────────────────────────
// SEED DATA I/O
// ─────────────────────────────────────────────────────────────
function loadSeedData() {
  try {
    const dir = path.dirname(SEED_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(SEED_FILE)) {
      fs.writeFileSync(SEED_FILE, JSON.stringify(EMBEDDED_TARIFFS, null, 2), "utf8");
    }
    return JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
  } catch (e) {
    console.error("[suppliers] loadSeedData:", e.message);
    return JSON.parse(JSON.stringify(EMBEDDED_TARIFFS)); // deep clone
  }
}

function saveSeedData(data) {
  try {
    data._meta.updated     = new Date().toISOString().split("T")[0];
    data._meta.next_scrape = new Date(Date.now() + 7*24*3600*1000).toISOString().split("T")[0];
    fs.writeFileSync(SEED_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("[suppliers] saveSeedData:", e.message);
  }
}

function getTariffs() {
  const cached = cache.get("tariffs");
  if (cached) return cached;
  const data = loadSeedData();
  cache.set("tariffs", data, 3600 * 6);
  return data;
}

// ─────────────────────────────────────────────────────────────
// COST CALCULATION ENGINE
// ─────────────────────────────────────────────────────────────
function calcAnnualCostElec({ energyRate, markupCEkWh, standingCharge, consumption, region, peakKw, epexAvg }) {
  let rate = energyRate;
  if (rate == null && markupCEkWh != null) {
    rate = (epexAvg / 1000) + (markupCEkWh / 100); // EPEX €/MWh → €/kWh + markup
  }
  if (rate == null) return null;

  const grid   = getTariffs().grid_costs[region] || getTariffs().grid_costs.flanders;
  const VAT    = 0.06; // Belgian electricity VAT — permanently 6% since April 2023 (excise duties raised to compensate)

  let gridCost;
  if (region === "flanders") {
    // Capacity tariff: peak kW × €53.90/kW/month × 12
    const capacityAnnual = (peakKw || 2.5) * (grid.capacity_kW_monthly || 53.90) * 12;
    const kWhPart        = (grid.transport_kWh + grid.levies_kWh) * consumption;
    gridCost = capacityAnnual + kWhPart;
  } else {
    gridCost = (grid.distribution_kWh + grid.transport_kWh + grid.levies_kWh) * consumption;
  }

  const energyCost = rate * consumption;
  const subtotal   = energyCost + gridCost + standingCharge;
  const vat        = subtotal * VAT;
  const total      = subtotal + vat;

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

function calcAnnualCostGas({ energyRate, markupCEkWh, standingCharge, consumption, region, ttfAvg }) {
  let rate = energyRate;
  if (rate == null && markupCEkWh != null) rate = (ttfAvg / 1000) + (markupCEkWh / 100);
  if (rate == null) return null;

  const data   = getTariffs();
  const grid   = data.gas_grid_costs[region] || data.gas_grid_costs.flanders;
  const VAT    = 0.06; // Belgian gas VAT — permanently 6% since April 2023, no increase until 2030

  const energyCost = rate * consumption;
  const gridCost   = (grid.distribution_kWh + grid.transport_kWh + grid.levies_kWh + (grid.excise_kWh || 0)) * consumption;
  const subtotal   = energyCost + gridCost + standingCharge;
  const vat        = subtotal * VAT;
  const total      = subtotal + vat;

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

// ─────────────────────────────────────────────────────────────
// APPLIANCE CONSUMPTION CALCULATOR
// ─────────────────────────────────────────────────────────────
function calcConsumptionFromAppliances(inputs, energyType = "electricity") {
  const data = getTariffs();
  const apps = energyType === "gas" ? (data.appliances_gas || {}) : (data.appliances || {});

  // Baseline: always-on loads not in the list
  let totalKwh = energyType === "gas" ? 500 : 300;
  let peakKw   = 0;
  const breakdown = [];

  for (const inp of inputs) {
    const a = apps[inp.id];
    if (!a) continue;
    const uses   = inp.uses_per_week ?? a.default_uses_per_week;
    const annual = a.kwh_per_use * uses * 52;
    totalKwh += annual;
    if (a.peak_kw && a.peak_kw > peakKw) peakKw = a.peak_kw;
    breakdown.push({
      id: inp.id, label: a.label, icon: a.icon,
      uses_per_week: uses, kwh_per_use: a.kwh_per_use,
      annual_kwh: Math.round(annual), pct: 0, tip: a.tip,
    });
  }

  breakdown.forEach(b => { b.pct = Math.round((b.annual_kwh / totalKwh) * 100); });
  breakdown.sort((a, b) => b.annual_kwh - a.annual_kwh);

  const householdLabel = energyType === "gas"
    ? (totalKwh < 5000 ? "Flat / studio" : totalKwh < 10000 ? "Flat with gas heating" : totalKwh < 15000 ? "Average house" : totalKwh < 20000 ? "Large house" : "Large house with extras")
    : (totalKwh < 1500 ? "Studio" : totalKwh < 3000 ? "1–2 person flat" : totalKwh < 5000 ? "Family home" : totalKwh < 8000 ? "Large home" : "Large home + EV/heat pump");

  return {
    total_kwh:      Math.round(totalKwh),
    peak_kw:        parseFloat(peakKw.toFixed(1)),
    household_size: householdLabel,
    breakdown,
  };
}

// ─────────────────────────────────────────────────────────────
// SCRAPING (3-tier)
// ─────────────────────────────────────────────────────────────

// Tier 1: VREG open data — official Flemish regulator tariff database
async function scrapeVREG() {
  const updates = {};
  try {
    // VREG publishes a public JSON/XML API for approved tariffs
    const urls = [
      "https://www.vreg.be/nl/tools/tariefscanner/api/products?productType=ELECTRICITY&region=FLEMISH",
      "https://www.vreg.be/nl/tools/tariefscanner/api/products?productType=GAS&region=FLEMISH",
    ];
    for (const url of urls) {
      const energyType = url.includes("GAS") ? "gas" : "electricity";
      const { data } = await axios.get(url, { headers: { "User-Agent": SCRAPE_UA, "Accept": "application/json" }, timeout: 10000 });
      const products = Array.isArray(data) ? data : (data.products || data.items || []);
      for (const p of products) {
        const name  = (p.supplier || p.supplierName || p.name || "").toLowerCase().replace(/\s+/g, "");
        const price = parseFloat(p.energyRate || p.rate || p.price || 0);
        if (name && price > 0.03 && price < 0.5) {
          const key = `${name}_${energyType}`;
          updates[key] = { rate: price, type: p.contractType || "variable", name: p.productName || p.name };
        }
      }
    }
    console.log(`[VREG] Got ${Object.keys(updates).length} tariff entries`);
  } catch (e) {
    console.warn("[VREG] scrape failed:", e.message);
  }
  return updates;
}

// Tier 2: CallMePower — Belgian comparison site with clean HTML tables
async function scrapeCallMePower() {
  const updates = {};
  const urls = [
    { url: "https://callmepower.be/en/energy/tariffs",     type: "electricity" },
    { url: "https://callmepower.be/en/gas/tariffs",        type: "gas" },
  ];
  const KNOWN_SUPPLIERS = [
    { key: "engie",         aliases: ["engie"] },
    { key: "luminus",       aliases: ["luminus"] },
    { key: "bolt",          aliases: ["bolt", "bolt energy"] },
    { key: "totalenergies", aliases: ["totalenergies", "total energies", "total"] },
    { key: "eneco",         aliases: ["eneco"] },
    { key: "mega",          aliases: ["mega"] },
    { key: "octaplus",      aliases: ["octa+", "octaplus", "octa"] },
  ];

  for (const { url, type } of urls) {
    try {
      const { data: html } = await axios.get(url, {
        headers: { "User-Agent": SCRAPE_UA, "Accept": "text/html", "Accept-Language": "nl-BE,nl;q=0.9" },
        timeout: 12000,
      });

      // Parse HTML table rows
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let m;
      while ((m = rowRegex.exec(html)) !== null) {
        const row = m[1].toLowerCase();
        for (const sup of KNOWN_SUPPLIERS) {
          const nameFound = sup.aliases.some(a => row.includes(a));
          if (!nameFound) continue;
          // Extract price: look for patterns like 10.19 c€/kWh or 0.1019 €/kWh
          const priceMatch =
            row.match(/(\d{1,2}[.,]\d{2,4})\s*c[€e]/i) ||
            row.match(/0\.(\d{4})\s*€\/kwh/i);
          if (!priceMatch) continue;
          let price = parseFloat(priceMatch[1].replace(",", "."));
          if (price > 5) price = price / 100; // c€ → €
          if (price < 0.03 || price > 0.5) continue;
          updates[`${sup.key}_${type}`] = { rate: price, source: "callmepower" };
        }
      }

      // Fallback: scan full page for supplier name near price
      if (Object.keys(updates).filter(k => k.endsWith(type)).length === 0) {
        for (const sup of KNOWN_SUPPLIERS) {
          for (const alias of sup.aliases) {
            const re = new RegExp(`${alias}[\\s\\S]{0,300}?(\\d{1,2}[.,]\\d{2,4})\\s*c[€e]`, "i");
            const found = html.match(re);
            if (found) {
              let price = parseFloat(found[1].replace(",", "."));
              if (price > 5) price = price / 100;
              if (price >= 0.03 && price <= 0.5) {
                updates[`${sup.key}_${type}`] = { rate: price, source: "callmepower_fallback" };
              }
            }
          }
        }
      }
      console.log(`[CallMePower] ${type}: ${Object.keys(updates).filter(k => k.endsWith(type)).length} rates found`);
    } catch (e) {
      console.warn(`[CallMePower] ${type} failed:`, e.message);
    }
  }
  return updates;
}

// Tier 3: Individual supplier pages (Bolt, Mega, Octa+ have public tariff cards)
async function scrapeSupplierPages() {
  const updates = {};
  const targets = [
    {
      key: "bolt_electricity",
      url: "https://www.bolt.eu/en-be/energy/electricity/",
      pattern: /markup[^€\d]*([0-9][.,][0-9]{1,2})\s*c[€e]|([0-9][.,][0-9]{1,2})\s*c[€e]\/kWh\s*markup/i,
    },
    {
      key: "bolt_gas",
      url: "https://www.bolt.eu/en-be/energy/gas/",
      pattern: /markup[^€\d]*([0-9][.,][0-9]{1,2})\s*c[€e]|([0-9][.,][0-9]{1,2})\s*c[€e]\/kWh\s*markup/i,
    },
    {
      key: "mega_electricity",
      url: "https://www.mega.be/nl/energie/tariefkaarten",
      pattern: /elektriciteit[^€\d]{0,200}(\d{1,2}[.,]\d{2,4})\s*c[€e]|\b(\d{1,2}[.,]\d{2,4})\s*c[€e]\/kWh/i,
    },
    {
      key: "mega_gas",
      url: "https://www.mega.be/nl/energie/tariefkaarten",
      pattern: /aardgas[^€\d]{0,200}(\d{1,2}[.,]\d{2,4})\s*c[€e]|gas[^€\d]{0,100}(\d{1,2}[.,]\d{2,4})\s*c[€e]/i,
    },
    {
      key: "octaplus_electricity",
      url: "https://www.octaplus.be/nl/tarieven",
      pattern: /(\d{1,2}[.,]\d{2,4})\s*c[€e]\/kWh|(\d{1,2}[.,]\d{2,4})\s*euro(?:cent)?\/kWh/i,
    },
  ];

  for (const t of targets) {
    try {
      const { data: html } = await axios.get(t.url, {
        headers: { "User-Agent": SCRAPE_UA, "Accept": "text/html" },
        timeout: 10000,
      });
      const m = html.match(t.pattern);
      if (m) {
        const raw   = (m[1] || m[2]).replace(",", ".");
        let price = parseFloat(raw);
        if (price > 5) price = price / 100;
        if (price >= 0.03 && price <= 0.5) {
          updates[t.key] = { rate: price, source: "supplier_page" };
          console.log(`[Supplier] ${t.key}: ${price} €/kWh`);
        }
      }
    } catch (e) {
      console.warn(`[Supplier] ${t.key} failed:`, e.message);
    }
  }
  return updates;
}

// ── Apply scraped updates to seed data ────────────────────────
function applyScrapedUpdates(data, allUpdates) {
  let count = 0;
  const today = new Date().toISOString().split("T")[0];

  for (const [key, update] of Object.entries(allUpdates)) {
    const [supplierKey, energyType] = key.split("_", 2);
    const supplier = data.suppliers[supplierKey];
    if (!supplier) continue;

    // Find variable plan for this energy type
    const plan = supplier.plans.find(p => p.energy_type === energyType && p.type === "variable");
    if (!plan) continue;

    // For dynamic plans (Bolt), update markup not rate
    if (plan.type === "dynamic" && update.markup != null) {
      const prev = plan.markup_cEkWh;
      if (Math.abs(prev - update.markup) > 0.05) {
        console.log(`[update] ${supplier.name} ${energyType} markup: ${prev} → ${update.markup}`);
        plan.markup_cEkWh   = update.markup;
        plan.last_verified  = today;
        plan.scrape_source  = update.source;
        count++;
      }
    } else if (update.rate != null && plan.energy_rate_excl_vat != null) {
      const prev = plan.energy_rate_excl_vat;
      const diff = Math.abs(prev - update.rate);
      // Only update if meaningful change (>0.5 c€) and plausible range
      if (diff > 0.005 && update.rate > 0.03 && update.rate < 0.5) {
        console.log(`[update] ${supplier.name} ${energyType}: ${(prev*100).toFixed(3)} → ${(update.rate*100).toFixed(3)} c€/kWh (${update.source})`);
        plan.energy_rate_excl_vat = parseFloat(update.rate.toFixed(4));
        plan.last_verified        = today;
        plan.scrape_source        = update.source;
        count++;
      }
    }
  }
  return count;
}

// ── Weekly scrape orchestrator ────────────────────────────────
async function runWeeklyScrape() {
  console.log("[suppliers] Weekly scrape starting…");
  const data = loadSeedData();
  let totalUpdated = 0;

  // Tier 1: VREG (most authoritative)
  const vreg = await scrapeVREG();
  totalUpdated += applyScrapedUpdates(data, vreg);

  // Tier 2: CallMePower
  const cmp = await scrapeCallMePower();
  totalUpdated += applyScrapedUpdates(data, cmp);

  // Tier 3: Direct supplier pages
  const direct = await scrapeSupplierPages();
  totalUpdated += applyScrapedUpdates(data, direct);

  saveSeedData(data);
  cache.del("tariffs"); // force reload
  console.log(`[suppliers] Scrape done — ${totalUpdated} rate(s) updated`);
  return { updated: totalUpdated, vreg: Object.keys(vreg).length, cmp: Object.keys(cmp).length, direct: Object.keys(direct).length };
}

// ─────────────────────────────────────────────────────────────
// SHARED RESULT BUILDER
// ─────────────────────────────────────────────────────────────
function buildResults(energyType, { consumption, region, epexAvg = 100, ttfAvg = 35, peakKw = 2.5, greenOnly = false }) {
  const data    = getTariffs();
  const results = [];

  for (const [sid, supplier] of Object.entries(data.suppliers)) {
    for (const plan of supplier.plans) {
      if (plan.energy_type !== energyType) continue;
      if (greenOnly && !plan.green) continue;
      if (plan.regions && !plan.regions.includes(region)) continue;

      const costs = energyType === "electricity"
        ? calcAnnualCostElec({ energyRate: plan.energy_rate_excl_vat, markupCEkWh: plan.markup_cEkWh, standingCharge: plan.standing_charge_year, consumption, region, peakKw, epexAvg })
        : calcAnnualCostGas({ energyRate: plan.energy_rate_excl_vat, markupCEkWh: plan.markup_cEkWh, standingCharge: plan.standing_charge_year, consumption, region, ttfAvg });

      if (!costs) continue;

      const staleDays = plan.last_verified
        ? Math.floor((Date.now() - new Date(plan.last_verified)) / 86400000)
        : 999;

      results.push({
        supplier_id:    sid,
        supplier_name:  supplier.name,
        supplier_logo:  supplier.logo,
        supplier_color: supplier.color,
        supplier_url:   supplier.url,
        plan_id:        plan.id,
        plan_name:      plan.name,
        type:           plan.type,
        green:          plan.green,
        duration:       plan.duration,
        highlights:     plan.highlights || [],
        formula:        plan.formula,
        energy_rate:    plan.energy_rate_excl_vat,
        markup_cEkWh:   plan.markup_cEkWh,
        standing_charge: plan.standing_charge_year,
        costs,
        stale_days:    staleDays,
        last_verified: plan.last_verified,
        data_fresh:    staleDays < 14,
        scrape_source: plan.scrape_source,
      });
    }
  }

  results.sort((a, b) => a.costs.total - b.costs.total);
  if (results.length) results[0].cheapest = true;
  const cheapest = results[0]?.costs.total || 0;
  results.forEach((r, i) => { r.rank = i + 1; r.savings_vs_cheapest = i === 0 ? 0 : r.costs.total - cheapest; });

  return results;
}

// ─────────────────────────────────────────────────────────────
// API ROUTES
// ─────────────────────────────────────────────────────────────

// GET /api/suppliers/electricity
router.get("/electricity", (req, res) => {
  const consumption = parseInt(req.query.consumption) || 3500;
  const region      = req.query.region  || "flanders";
  const greenOnly   = req.query.green   === "true";
  const epexAvg     = parseFloat(req.query.epex) || 100;
  const peakKw      = parseFloat(req.query.peak_kw) || 2.5;

  const results = buildResults("electricity", { consumption, region, epexAvg, peakKw, greenOnly });
  const data    = getTariffs();
  res.json({ success: true, region, consumption, peak_kw: peakKw, epex_avg: epexAvg,
    data_updated: data._meta.updated, next_scrape: data._meta.next_scrape,
    count: results.length, results });
});

// GET /api/suppliers/gas
router.get("/gas", (req, res) => {
  const consumption = parseFloat(req.query.consumption) || 13000;
  const region      = req.query.region || "flanders";
  const ttfAvg      = parseFloat(req.query.ttf) || 35;

  const results = buildResults("gas", { consumption, region, ttfAvg });
  const data    = getTariffs();
  res.json({ success: true, region, consumption, ttf_avg: ttfAvg,
    data_updated: data._meta.updated, next_scrape: data._meta.next_scrape,
    count: results.length, results });
});

// GET /api/suppliers/appliances
router.get("/appliances", (req, res) => {
  const data = getTariffs();
  res.json({ success: true, appliances: Object.entries(data.appliances).map(([id, a]) => ({ id, ...a })) });
});

// GET /api/suppliers/gas-appliances
router.get("/gas-appliances", (req, res) => {
  const data = getTariffs();
  res.json({ success: true, appliances: Object.entries(data.appliances_gas).map(([id, a]) => ({ id, ...a })) });
});

// POST /api/suppliers/calculate  (electricity)
router.post("/calculate", (req, res) => {
  const { appliances: inputs = [], region = "flanders", epex_avg = 100, green_only = false } = req.body;
  if (!inputs.length) return res.status(400).json({ success: false, error: "No appliances provided" });

  const consumption = calcConsumptionFromAppliances(inputs, "electricity");
  const results     = buildResults("electricity", {
    consumption: consumption.total_kwh, region, epexAvg: epex_avg,
    peakKw: consumption.peak_kw, greenOnly: green_only,
  });

  res.json({ success: true, consumption, region, plan_count: results.length, results });
});

// POST /api/suppliers/calculate-gas
router.post("/calculate-gas", (req, res) => {
  const { appliances: inputs = [], region = "flanders", ttf_avg = 35 } = req.body;
  if (!inputs.length) return res.status(400).json({ success: false, error: "No appliances provided" });

  const consumption = calcConsumptionFromAppliances(inputs, "gas");
  const results     = buildResults("gas", { consumption: consumption.total_kwh, region, ttfAvg: ttf_avg });

  res.json({ success: true, consumption, region, plan_count: results.length, results });
});

// GET /api/suppliers/meta
router.get("/meta", (req, res) => {
  const data = getTariffs();
  res.json({
    success: true,
    meta: data._meta,
    supplier_count: Object.keys(data.suppliers).length,
    plan_count: Object.values(data.suppliers).reduce((n, s) => n + s.plans.length, 0),
    elec_plans: Object.values(data.suppliers).reduce((n, s) => n + s.plans.filter(p => p.energy_type === "electricity").length, 0),
    gas_plans:  Object.values(data.suppliers).reduce((n, s) => n + s.plans.filter(p => p.energy_type === "gas").length, 0),
    suppliers: Object.entries(data.suppliers).map(([id, s]) => ({
      id, name: s.name, logo: s.logo, color: s.color,
      elec_plans: s.plans.filter(p => p.energy_type === "electricity").length,
      gas_plans:  s.plans.filter(p => p.energy_type === "gas").length,
    })),
  });
});

// GET /api/suppliers/scrape  (manual trigger — Railway admin use)
router.get("/scrape", async (req, res) => {
  try {
    const result = await runWeeklyScrape();
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = { router, runWeeklyScrape };