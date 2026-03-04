/**
 * routes/gas.js — Gas prices + supplier comparison
 * TTF prices via oilpriceapi.com (free tier)
 * Belgian supplier tariffs (updated Q1 2026)
 */

const express   = require("express");
const axios     = require("axios");
const NodeCache = require("node-cache");

const router   = express.Router();
const cache    = new NodeCache({ stdTTL: 3600 }); // 1hr cache for gas (daily prices)

const OIL_API_KEY  = process.env.OIL_PRICE_API_KEY;
const OIL_API_BASE = "https://api.oilpriceapi.com/v1";

// ── Belgian gas suppliers (Q1 2026 tariffs) ──────────────────
// Prices in c€/kWh (energy component only)
// Standing charge in €/year
// Source: supplier websites + VREG/CWaPE published tariffs
const GAS_SUPPLIERS = [
  {
    id:         "engie",
    name:       "Engie",
    logo:       "🔵",
    type:       "variable",
    typeLabel:  "Variable",
    tariff:     8.21,        // c€/kWh
    standing:   85.20,       // €/year
    color:      "#0070F3",
    highlight:  false,
    note:       "Monthly indexed on Zeebrugge TTF",
    contract:   "Monthly",
    url:        "https://www.engie.be",
  },
  {
    id:         "luminus",
    name:       "Luminus",
    logo:       "🟡",
    type:       "variable",
    typeLabel:  "Variable",
    tariff:     8.05,
    standing:   79.00,
    color:      "#FFB800",
    highlight:  false,
    note:       "EDF Group — Belgium's 2nd largest supplier",
    contract:   "Monthly",
    url:        "https://www.luminus.be",
  },
  {
    id:         "totalenergies",
    name:       "TotalEnergies",
    logo:       "🔴",
    type:       "fixed",
    typeLabel:  "Fixed 1yr",
    tariff:     8.49,
    standing:   72.00,
    color:      "#E8002D",
    highlight:  false,
    note:       "Price locked for 12 months — no surprises",
    contract:   "12 months",
    url:        "https://www.totalenergies.be",
  },
  {
    id:         "bolt",
    name:       "Bolt Energy",
    logo:       "⚡",
    type:       "dynamic",
    typeLabel:  "Dynamic TTF",
    tariff:     null,        // TTF-indexed — calculated at runtime
    tariffSurcharge: 0.50,  // c€/kWh markup on TTF
    standing:   65.00,
    color:      "#00C896",
    highlight:  true,
    note:       "TTF spot price + 0.5 c€/kWh — cheapest when markets are calm",
    contract:   "Monthly",
    url:        "https://www.bolt.eu/en-be/energy",
  },
  {
    id:         "eneco",
    name:       "Eneco",
    logo:       "🟢",
    type:       "variable",
    typeLabel:  "Variable",
    tariff:     7.92,
    standing:   90.00,
    color:      "#00A651",
    highlight:  false,
    note:       "Green gas options available",
    contract:   "Monthly",
    url:        "https://www.eneco.be",
  },
  {
    id:         "mega",
    name:       "Mega",
    logo:       "🟣",
    type:       "fixed",
    typeLabel:  "Fixed 1yr",
    tariff:     7.13,
    standing:   95.40,
    color:      "#7C3AED",
    highlight:  false,
    note:       "Lowest energy rate — higher standing charge",
    contract:   "12 months",
    url:        "https://www.mega.be",
  },
  {
    id:         "octaplus",
    name:       "Octa+",
    logo:       "🟠",
    type:       "variable",
    typeLabel:  "Variable",
    tariff:     8.10,
    standing:   80.00,
    color:      "#F97316",
    highlight:  false,
    note:       "Belgian independent supplier",
    contract:   "Monthly",
    url:        "https://www.octaplus.be",
  },
  {
    id:         "lampiris",
    name:       "Lampiris (TotalEnergies)",
    logo:       "💚",
    type:       "variable",
    typeLabel:  "Variable",
    tariff:     8.30,
    standing:   76.00,
    color:      "#22C55E",
    highlight:  false,
    note:       "100% renewable gas (green certificates)",
    contract:   "Monthly",
    url:        "https://www.lampiris.be",
  },
];

// ── Grid costs (Fluvius/ORES/RESA — average) ─────────────────
// Distribution + transmission tariffs — these are added to the energy price
// Values in c€/kWh — approximate Belgian average 2026
const GRID_COSTS = {
  distribution:  2.85,  // Fluvius/ORES/RESA (regional — average)
  transmission:  0.42,  // Fluxys Belgium
  taxes:         0.89,  // Federal contribution + VAT portion
  vat_rate:      0.21,  // 21% VAT on everything
};

function calcTotalTariff(energyCost_cEkWh, standing_eYear, consumption_kWh) {
  const energyTotal  = (energyCost_cEkWh / 100) * consumption_kWh;
  const gridTotal    = ((GRID_COSTS.distribution + GRID_COSTS.transmission + GRID_COSTS.taxes) / 100) * consumption_kWh;
  const subTotal     = energyTotal + gridTotal + standing_eYear;
  const vat          = subTotal * GRID_COSTS.vat_rate;
  return {
    energyCost:  Math.round(energyTotal),
    gridCost:    Math.round(gridTotal),
    standingCost: Math.round(standing_eYear),
    vat:         Math.round(vat),
    total:       Math.round(subTotal + vat),
    monthly:     Math.round((subTotal + vat) / 12),
    perKwh:      ((subTotal + vat) / consumption_kWh * 100).toFixed(2), // c€/kWh all-in
  };
}

// ── Fetch TTF price from oilpriceapi.com ──────────────────────
async function fetchTTFPrice() {
  const cached = cache.get("ttf_current");
  if (cached) return cached;

  if (!OIL_API_KEY) {
    // Fallback: return a reasonable estimate when no key configured
    console.warn("[Gas] No OIL_PRICE_API_KEY set — using fallback price");
    return { price: 34.50, currency: "EUR", unit: "MWh", source: "fallback", timestamp: new Date().toISOString() };
  }

  try {
    const { data } = await axios.get(`${OIL_API_BASE}/prices/latest`, {
      headers: { Authorization: `Token ${OIL_API_KEY}` },
      params:  { by_code: "TTF_GAS" },
      timeout: 8000,
    });
    const result = {
      price:     parseFloat(data.data?.price) || 34.50,
      currency:  "EUR",
      unit:      "MWh",
      source:    "oilpriceapi",
      timestamp: data.data?.created_at || new Date().toISOString(),
    };
    cache.set("ttf_current", result);
    return result;
  } catch (err) {
    console.error("[Gas] TTF fetch error:", err.message);
    // Return last known or fallback
    return { price: 34.50, currency: "EUR", unit: "MWh", source: "fallback", timestamp: new Date().toISOString() };
  }
}

// ── Fetch TTF history ─────────────────────────────────────────
async function fetchTTFHistory(days = 30) {
  const key = `ttf_history_${days}`;
  const cached = cache.get(key);
  if (cached) return cached;

  if (!OIL_API_KEY) {
    // Generate realistic mock history for development
    const history = [];
    const base = 34.50;
    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      // Skip weekends (gas markets closed)
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const noise = (Math.random() - 0.5) * 8;
      history.push({
        date:  d.toISOString().split("T")[0],
        price: Math.max(15, parseFloat((base + noise).toFixed(2))),
      });
    }
    cache.set(key, history, 3600);
    return history;
  }

  try {
    const end   = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const { data } = await axios.get(`${OIL_API_BASE}/prices`, {
      headers: { Authorization: `Token ${OIL_API_KEY}` },
      params: {
        by_code:    "TTF_GAS",
        start_date: start.toISOString().split("T")[0],
        end_date:   end.toISOString().split("T")[0],
      },
      timeout: 10000,
    });

    const history = (data.data || []).map(p => ({
      date:  p.created_at?.split("T")[0] || p.date,
      price: parseFloat(p.price),
    })).filter(p => !isNaN(p.price));

    cache.set(key, history, 3600);
    return history;
  } catch (err) {
    console.error("[Gas] History fetch error:", err.message);
    return [];
  }
}

// ── GET /api/gas/current ──────────────────────────────────────
router.get("/current", async (req, res) => {
  try {
    const ttf = await fetchTTFPrice();
    // Convert TTF €/MWh → c€/kWh: divide by 10
    const ttf_cEkWh = (ttf.price / 10).toFixed(3);
    res.json({ success: true, ttf, ttf_cEkWh: parseFloat(ttf_cEkWh) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/gas/history?days=30 ──────────────────────────────
router.get("/history", async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const history = await fetchTTFHistory(days);

    // Calculate stats
    const prices = history.map(h => h.price);
    const avg    = prices.reduce((a, b) => a + b, 0) / prices.length;
    const min    = Math.min(...prices);
    const max    = Math.max(...prices);
    const latest = history[history.length - 1];
    const prev   = history[history.length - 2];
    const change = prev ? ((latest?.price - prev.price) / prev.price * 100).toFixed(1) : 0;

    res.json({
      success: true,
      history,
      stats: {
        avg:    parseFloat(avg.toFixed(2)),
        min:    parseFloat(min.toFixed(2)),
        max:    parseFloat(max.toFixed(2)),
        latest: latest?.price || 0,
        change: parseFloat(change),
        days,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/gas/suppliers?consumption=13000 ──────────────────
router.get("/suppliers", async (req, res) => {
  try {
    const consumption = Math.min(parseInt(req.query.consumption) || 13000, 50000);
    const ttf = await fetchTTFPrice();
    const ttf_cEkWh = ttf.price / 10;

    const suppliers = GAS_SUPPLIERS.map(s => {
      const energyRate = s.type === "dynamic"
        ? ttf_cEkWh + (s.tariffSurcharge || 0)
        : s.tariff;

      const costs = calcTotalTariff(energyRate, s.standing, consumption);

      return {
        ...s,
        tariff:      parseFloat(energyRate.toFixed(3)),
        costs,
        ttfBased:    s.type === "dynamic",
      };
    }).sort((a, b) => a.costs.total - b.costs.total);

    // Tag cheapest
    if (suppliers.length > 0) suppliers[0].cheapest = true;

    res.json({
      success: true,
      suppliers,
      consumption,
      ttf_cEkWh: parseFloat(ttf_cEkWh.toFixed(3)),
      gridCosts: GRID_COSTS,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/gas/combined?elec=3500&gas=13000&elecSupplier=bolt&gasSupplier=mega ──
router.get("/combined", async (req, res) => {
  try {
    const { elec = 3500, gas = 13000 } = req.query;
    const elecKwh = parseInt(elec);
    const gasKwh  = parseInt(gas);
    const ttf     = await fetchTTFPrice();
    const ttf_cEkWh = ttf.price / 10;

    // Use a simplified electricity tariff table for the combined view
    const ELEC_SUPPLIERS = [
      { id: "bolt",          name: "Bolt",          tariff: null, standing: 65,  type: "dynamic", surcharge: 0.5 },
      { id: "engie",         name: "Engie",          tariff: 28.5, standing: 85,  type: "variable" },
      { id: "luminus",       name: "Luminus",        tariff: 27.8, standing: 79,  type: "variable" },
      { id: "totalenergies", name: "TotalEnergies",  tariff: 29.1, standing: 72,  type: "fixed" },
      { id: "eneco",         name: "Eneco",          tariff: 27.2, standing: 90,  type: "variable" },
      { id: "mega",          name: "Mega",           tariff: 25.9, standing: 95,  type: "fixed" },
    ];

    // Build all combinations
    const combos = [];
    for (const es of ELEC_SUPPLIERS) {
      for (const gs of GAS_SUPPLIERS) {
        const eRate  = es.type === "dynamic" ? (ttf_cEkWh * 2.5 + es.surcharge) : es.tariff;
        const gRate  = gs.type === "dynamic" ? ttf_cEkWh + gs.tariffSurcharge : gs.tariff;
        const eCost  = calcTotalTariff(eRate, es.standing, elecKwh);
        const gCost  = calcTotalTariff(gRate, gs.standing, gasKwh);
        combos.push({
          elecSupplier: es.name,
          gasSupplier:  gs.name,
          elecTotal:    eCost.total,
          gasTotal:     gCost.total,
          combined:     eCost.total + gCost.total,
          monthly:      Math.round((eCost.total + gCost.total) / 12),
          sameSupplier: es.id === gs.id,
        });
      }
    }

    combos.sort((a, b) => a.combined - b.combined);
    const top5       = combos.slice(0, 5);
    const sameSupplier = combos.filter(c => c.sameSupplier).sort((a, b) => a.combined - b.combined)[0];

    res.json({ success: true, top5, bestSameSupplier: sameSupplier, elecKwh, gasKwh });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = { router, fetchTTFPrice };