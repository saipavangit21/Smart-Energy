/**
 * ha-tracking.js — counts distinct Home Assistant integration installs
 * pinging the public price endpoints. Identified by the X-SmartPrice-Client
 * header the HACS integration sends (see hacs-integration/.../const.py).
 * IPs are hashed (sha256) before storage — never kept in plaintext.
 */
const crypto = require("crypto");

let tableReady = false;
async function ensureTable(pool) {
  if (tableReady) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS ha_integration_pings (
    ip_hash TEXT NOT NULL,
    ping_date DATE NOT NULL,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    request_count INT DEFAULT 1,
    PRIMARY KEY (ip_hash, ping_date)
  )`);
  tableReady = true;
}

function hashIp(ip) {
  return crypto.createHash("sha256").update(String(ip)).digest("hex").slice(0, 32);
}

function trackHaPing(pool) {
  return (req, res, next) => {
    if (req.headers["x-smartprice-client"] === "homeassistant") {
      const ipHash = hashIp(req.ip);
      const pingDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Brussels" }).format(new Date());
      ensureTable(pool)
        .then(() => pool.query(
          `INSERT INTO ha_integration_pings (ip_hash, ping_date, last_seen, request_count)
           VALUES ($1, $2, NOW(), 1)
           ON CONFLICT (ip_hash, ping_date)
           DO UPDATE SET request_count = ha_integration_pings.request_count + 1, last_seen = NOW()`,
          [ipHash, pingDate]
        ))
        .catch(e => console.error("[ha-tracking] write failed:", e.message));
    }
    next();
  };
}

async function getHaStats(pool) {
  await ensureTable(pool);
  const { rows } = await pool.query(`
    SELECT
      COUNT(DISTINCT ip_hash) FILTER (WHERE ping_date = CURRENT_DATE) AS active_today,
      COUNT(DISTINCT ip_hash) FILTER (WHERE ping_date >= CURRENT_DATE - INTERVAL '7 days') AS active_7d,
      COUNT(DISTINCT ip_hash) FILTER (WHERE ping_date >= CURRENT_DATE - INTERVAL '30 days') AS active_30d,
      COUNT(DISTINCT ip_hash) AS total_ever
    FROM ha_integration_pings
  `);
  const r = rows[0];
  return {
    active_today: parseInt(r.active_today),
    active_7d: parseInt(r.active_7d),
    active_30d: parseInt(r.active_30d),
    total_ever: parseInt(r.total_ever),
  };
}

module.exports = { trackHaPing, getHaStats };
