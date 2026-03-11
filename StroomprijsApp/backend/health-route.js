// ── /api/health  (replace the one-liner in server.js) ─────────────────────────
// Returns a detailed status report: DB, EPEX feed, data freshness, price sanity.
// Used by staging checks, monitoring, and the test suite.

const axios = require("axios");

const EPEX_MIN = -50;   // €/MWh — below this something is wrong
const EPEX_MAX = 500;   // €/MWh — above this something is wrong
const STALE_MS = 2 * 60 * 60 * 1000; // 2 hours — prices older than this = stale

module.exports = function mountHealth(app, pool) {

  app.get("/api/health", async (req, res) => {
    const report = {
      status: "ok",
      version: "2.0.0",
      timestamp: new Date().toISOString(),
      checks: {},
    };

    // ── 1. Database ────────────────────────────────────────────
    try {
      await pool.query("SELECT 1");
      report.checks.database = { status: "ok" };
    } catch (e) {
      report.checks.database = { status: "fail", error: e.message };
      report.status = "degraded";
    }

    // ── 2. EPEX feed ───────────────────────────────────────────
    try {
      const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Brussels" }).format(new Date());
      const { data } = await axios.get(
        `https://api.energy-charts.info/price?bzn=BE&start=${today}&end=${today}`,
        { timeout: 8000 }
      );

      const prices = (data.price || []).filter(p => p != null);
      const latest = data.unix_seconds?.[data.unix_seconds.length - 1];
      const latestDate = latest ? new Date(latest * 1000) : null;
      const ageMs = latestDate ? Date.now() - latestDate.getTime() : Infinity;
      const allSane = prices.every(p => p >= EPEX_MIN && p <= EPEX_MAX);
      const hasNaN  = prices.some(p => isNaN(p));

      report.checks.epex = {
        status: prices.length > 0 && !hasNaN && allSane ? "ok" : "warn",
        points: prices.length,
        latest_price: prices[prices.length - 1] ?? null,
        latest_at: latestDate?.toISOString() ?? null,
        age_minutes: latestDate ? Math.round(ageMs / 60000) : null,
        stale: ageMs > STALE_MS,
        has_nan: hasNaN,
        all_in_range: allSane,
      };

      if (report.checks.epex.status === "warn") report.status = "degraded";

    } catch (e) {
      report.checks.epex = { status: "fail", error: e.message };
      report.status = "degraded";
    }

    // ── 3. Auth table ──────────────────────────────────────────
    try {
      const { rows } = await pool.query("SELECT COUNT(*) FROM users");
      report.checks.auth = { status: "ok", user_count: parseInt(rows[0].count) };
    } catch (e) {
      report.checks.auth = { status: "fail", error: e.message };
      report.status = "degraded";
    }

    const httpStatus = report.status === "ok" ? 200 : 503;
    res.status(httpStatus).json(report);
  });

};