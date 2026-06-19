/**
 * fluvius.js — P1 smart meter data ingestion + query
 *
 * POST /api/fluvius/push   — receive reading from P1 reader / Home Assistant
 * GET  /api/fluvius/latest — latest reading + current EPEX price + charge signal
 * GET  /api/fluvius/history?hours=N — readings for last N hours (max 168)
 *
 * Auth: Bearer JWT (same token as dashboard) or x-api-key header (HA automations)
 *
 * P1 readers send data every 10 s → ~8 640 readings/day per user.
 * We auto-prune to keep only the last 7 days per user to control DB size.
 */

const express      = require("express");
const router       = express.Router();
const { requireAuth } = require("../middleware/auth");
const pool         = require("../db").pool;
const NodeCache    = require("node-cache");
const epexCache    = new NodeCache({ stdTTL: 300 });

// ── Table bootstrap (idempotent) ────────────────────────────────────────────
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fluvius_readings (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL,
      device_id   TEXT,
      power_w     NUMERIC,
      solar_w     NUMERIC,
      energy_kwh  NUMERIC,
      gas_m3      NUMERIC,
      recorded_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS fluvius_readings_user_ts
      ON fluvius_readings (user_id, recorded_at DESC);
  `);
}
ensureTable().catch(e => console.error("[fluvius] table bootstrap failed:", e.message));

// ── EPEX price helper ────────────────────────────────────────────────────────
// All-in consumer price: EPEX spot (€/MWh) → €/kWh including VAT + grid
const GRID_COST = 0.13;
const VAT       = 1.21;

async function currentEpexAllIn() {
  const cached = epexCache.get("current");
  if (cached !== undefined) return cached;
  try {
    const r = await fetch("https://smartprice.be/api/current");
    const d = await r.json();
    const mwh = d?.current?.price_eur_mwh;
    if (mwh == null) return null;
    const price = Math.max(0.04, (mwh / 1000) * VAT + GRID_COST);
    epexCache.set("current", price);
    return price;
  } catch {
    return null;
  }
}

// ── Auth middleware — accepts JWT OR x-api-key ───────────────────────────────
// x-api-key is the user's JWT stored in HA configuration.yaml as a header.
// This keeps the HA config identical to the normal auth flow.
async function flexAuth(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  if (apiKey) {
    // Treat as Bearer token
    req.headers.authorization = `Bearer ${apiKey}`;
  }
  return requireAuth(req, res, next);
}

// ── Prune old readings (keep last 7 days per user) ──────────────────────────
async function pruneOld(userId) {
  await pool.query(
    `DELETE FROM fluvius_readings
     WHERE user_id = $1 AND recorded_at < NOW() - INTERVAL '7 days'`,
    [userId]
  );
}

// ── POST /api/fluvius/push ──────────────────────────────────────────────────
router.post("/push", flexAuth, async (req, res) => {
  const { power_w, solar_w, energy_kwh, gas_m3, device_id } = req.body || {};

  if (power_w == null) {
    return res.status(400).json({ success: false, error: "power_w is required" });
  }

  const userId = req.user.id;

  try {
    await pool.query(
      `INSERT INTO fluvius_readings (user_id, device_id, power_w, solar_w, energy_kwh, gas_m3)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, device_id || null, power_w, solar_w ?? null, energy_kwh ?? null, gas_m3 ?? null]
    );

    // Prune old data asynchronously (don't block response)
    pruneOld(userId).catch(() => {});

    res.json({ success: true, recorded_at: new Date().toISOString() });
  } catch (e) {
    console.error("[fluvius] push error:", e.message);
    res.status(500).json({ success: false, error: "DB write failed" });
  }
});

// ── GET /api/fluvius/latest ─────────────────────────────────────────────────
router.get("/latest", flexAuth, async (req, res) => {
  const userId = req.user.id;

  try {
    const { rows } = await pool.query(
      `SELECT power_w, solar_w, energy_kwh, gas_m3, recorded_at
       FROM fluvius_readings
       WHERE user_id = $1
       ORDER BY recorded_at DESC LIMIT 1`,
      [userId]
    );

    if (!rows.length) {
      return res.json({ success: true, reading: null, message: "No readings yet" });
    }

    const reading = rows[0];
    const epexPrice = await currentEpexAllIn();

    // Charge signal: recommend charging if all-in price < €0.12/kWh
    const CHARGE_THRESHOLD = 0.12;
    const chargeSignal = epexPrice != null
      ? (epexPrice <= CHARGE_THRESHOLD ? "charge_now" : "wait")
      : null;

    res.json({
      success: true,
      reading: {
        power_w:    Number(reading.power_w),
        solar_w:    reading.solar_w != null ? Number(reading.solar_w) : null,
        energy_kwh: reading.energy_kwh != null ? Number(reading.energy_kwh) : null,
        gas_m3:     reading.gas_m3 != null ? Number(reading.gas_m3) : null,
        recorded_at: reading.recorded_at,
      },
      epex: {
        price_eur_kwh: epexPrice,
        charge_signal: chargeSignal,
        charge_threshold_eur_kwh: CHARGE_THRESHOLD,
      },
    });
  } catch (e) {
    console.error("[fluvius] latest error:", e.message);
    res.status(500).json({ success: false, error: "DB read failed" });
  }
});

// ── GET /api/fluvius/history?hours=N ────────────────────────────────────────
router.get("/history", flexAuth, async (req, res) => {
  const userId = req.user.id;
  const hours  = Math.min(parseInt(req.query.hours || 24), 168); // max 7 days

  try {
    // Return 1 reading per 5-minute bucket to keep response size manageable
    const { rows } = await pool.query(
      `SELECT
         date_trunc('minute', recorded_at) - (extract(minute FROM recorded_at)::int % 5) * interval '1 minute' AS bucket,
         AVG(power_w)    AS power_w,
         AVG(solar_w)    AS solar_w,
         MAX(energy_kwh) AS energy_kwh,
         MAX(gas_m3)     AS gas_m3
       FROM fluvius_readings
       WHERE user_id = $1
         AND recorded_at >= NOW() - ($2 || ' hours')::interval
       GROUP BY bucket
       ORDER BY bucket DESC`,
      [userId, hours]
    );

    res.json({
      success: true,
      hours,
      readings: rows.map(r => ({
        time:       r.bucket,
        power_w:    r.power_w != null ? Math.round(Number(r.power_w)) : null,
        solar_w:    r.solar_w != null ? Math.round(Number(r.solar_w)) : null,
        energy_kwh: r.energy_kwh != null ? Number(Number(r.energy_kwh).toFixed(3)) : null,
        gas_m3:     r.gas_m3    != null ? Number(Number(r.gas_m3).toFixed(3))    : null,
      })),
    });
  } catch (e) {
    console.error("[fluvius] history error:", e.message);
    res.status(500).json({ success: false, error: "DB read failed" });
  }
});

module.exports = router;
