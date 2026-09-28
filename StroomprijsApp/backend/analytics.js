/**
 * analytics.js — SmartPrice event tracking
 */

const crypto = require("crypto");
const { Pool } = require("pg");
const { sendMail } = require("./mailer");

// Raw analytics_events rows can live in a separate, higher-capacity database
// (set ANALYTICS_DATABASE_URL) so high-volume event logging doesn't compete
// with the main app's Supabase storage quota. Falls back to the main pool
// (same DB) if unset, so this works unmodified until that env var is added.
let _analyticsPool = null;
function getAnalyticsPool(mainPool) {
  if (_analyticsPool) return _analyticsPool;
  if (process.env.ANALYTICS_DATABASE_URL) {
    _analyticsPool = new Pool({
      connectionString: process.env.ANALYTICS_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    _analyticsPool.on("error", (err) => console.error("❌ Analytics DB pool error:", err.message));
    console.log("📊 Analytics events: routed to dedicated ANALYTICS_DATABASE_URL");
  } else {
    _analyticsPool = mainPool;
    console.log("📊 Analytics events: sharing main database (set ANALYTICS_DATABASE_URL to split off)");
  }
  return _analyticsPool;
}

// No FK to users(id) here — the analytics store may be a separate database
// (e.g. CockroachDB) that doesn't have a users table at all.
async function ensureAnalyticsTable(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id BIGSERIAL PRIMARY KEY,
      event TEXT NOT NULL,
      method TEXT,
      user_id UUID,
      session_id TEXT,
      path TEXT,
      ip TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      properties JSONB
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events (event)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events (created_at)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events (session_id)`);
}

// Permanent, tiny long-term store: one row per event-type per day (a few
// thousand rows/year, vs. millions for raw events) so history survives raw
// event pruning. Always lives on the main DB alongside `users` — it's small
// enough to never threaten quota on its own.
async function ensureRollupTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS analytics_daily_rollup (
      day DATE NOT NULL,
      event TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT '',
      total INTEGER NOT NULL DEFAULT 0,
      unique_sessions INTEGER NOT NULL DEFAULT 0,
      logged_in_users INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, event, method)
    )
  `);
}

// Raw event detail is only useful for recent, granular debugging (see the
// Erik/ACIT investigations this history was built for) — nothing has ever
// needed row-level data older than a few weeks. Rows older than this get
// collapsed into analytics_daily_rollup (permanent) and deleted from the raw
// table, which is what actually controls storage growth long-term.
const RAW_RETENTION_DAYS = 45;

// Guards against two overlapping runs (e.g. the startup pass and a manual
// /api/admin/run-analytics-cleanup call landing close together) both reading
// the same not-yet-deleted rows and double-adding them into the rollup
// table's `total` column — exactly what happened the first time this ran.
let _rollupInProgress = false;

async function rollupAndPruneAnalytics(pool, eventsDb) {
  if (_rollupInProgress) {
    console.log("[analytics-maintenance] Skipped — a run is already in progress");
    return { rolled_up_groups: 0, deleted: 0, skipped: true };
  }
  _rollupInProgress = true;
  try {
    const cutoff = new Date(Date.now() - RAW_RETENTION_DAYS * 24 * 3600 * 1000).toISOString();
    const result = await _doRollupAndPrune(pool, eventsDb, cutoff);
    // Once raw events live on a separate store, whatever was left in the main
    // DB's analytics_events table is legacy: nothing writes there anymore and
    // the dashboard reads only the new store, so those rows were invisible
    // and never pruned. Fold ALL of them into the rollup and delete them.
    if (eventsDb !== pool) {
      const legacy = await _doRollupAndPrune(pool, pool, new Date().toISOString()).catch(e => {
        if (/relation "analytics_events" does not exist/.test(e.message)) return { rolled_up_groups: 0, deleted: 0 };
        throw e;
      });
      result.legacy_rolled_up_groups = legacy.rolled_up_groups;
      result.legacy_deleted = legacy.deleted;
    }
    return result;
  } finally {
    _rollupInProgress = false;
  }
}

async function _doRollupAndPrune(pool, eventsDb, cutoff) {
  const { rows } = await eventsDb.query(
    `SELECT DATE_TRUNC('day', created_at AT TIME ZONE 'Europe/Brussels')::date AS day,
       event, COALESCE(method, '') AS method,
       COUNT(*) AS total,
       COUNT(DISTINCT session_id) AS unique_sessions,
       COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS logged_in_users
     FROM analytics_events
     WHERE created_at < $1
     GROUP BY day, event, method`,
    [cutoff]
  );
  if (!rows.length) return { rolled_up_groups: 0, deleted: 0 };

  for (const r of rows) {
    await pool.query(
      `INSERT INTO analytics_daily_rollup (day, event, method, total, unique_sessions, logged_in_users)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (day, event, method) DO UPDATE SET
         total = analytics_daily_rollup.total + EXCLUDED.total,
         unique_sessions = GREATEST(analytics_daily_rollup.unique_sessions, EXCLUDED.unique_sessions),
         logged_in_users = GREATEST(analytics_daily_rollup.logged_in_users, EXCLUDED.logged_in_users)`,
      [r.day, r.event, r.method, r.total, r.unique_sessions, r.logged_in_users]
    );
  }

  const del = await eventsDb.query(`DELETE FROM analytics_events WHERE created_at < $1`, [cutoff]);
  console.log(`[analytics-maintenance] Rolled up ${rows.length} day/event groups, pruned ${del.rowCount} raw rows older than ${RAW_RETENTION_DAYS}d`);
  return { rolled_up_groups: rows.length, deleted: del.rowCount };
}

const FUNNEL_EVENTS = ["calculator_start", "calculator_start_gas", "login_attempt_email", "login_attempt_google", "register_email", "ev_page_view", "seo_page_view", "auth_page_view", "register_success", "login_success"];
const AUTH_EVENTS = ["login_attempt_email", "login_attempt_google", "register_email"];

function mergeWithRollup(raw, rollupRows) {
  const dayStr = d => new Date(d).toISOString().slice(0, 10);
  const int = v => parseInt(v || 0, 10);

  const sumBy = (rawRows, rollupSubset, keyFn, seed, addRaw, addRoll) => {
    const m = new Map();
    for (const r of rawRows) { const k = keyFn(r); m.set(k, addRaw(m.get(k) || seed(r), r)); }
    for (const r of rollupSubset) { const k = keyFn(r); m.set(k, addRoll(m.get(k) || seed(r), r)); }
    return [...m.values()];
  };

  const summary = sumBy(raw.summary, rollupRows, r => r.event,
    r => ({ event: r.event, total: 0, unique_sessions: 0, logged_in_users: 0 }),
    (a, r) => ({ ...a, total: a.total + int(r.total), unique_sessions: a.unique_sessions + int(r.unique_sessions), logged_in_users: a.logged_in_users + int(r.logged_in_users) }),
    (a, r) => ({ ...a, total: a.total + int(r.total), unique_sessions: a.unique_sessions + int(r.unique_sessions), logged_in_users: a.logged_in_users + int(r.logged_in_users) })
  ).sort((a, b) => b.total - a.total).map(r => ({ event: r.event, total: String(r.total), unique_sessions: String(r.unique_sessions), logged_in_users: String(r.logged_in_users) }));

  const daily = sumBy(raw.daily, rollupRows, r => `${dayStr(r.day)}|${r.event}`,
    r => ({ day: `${dayStr(r.day)}T00:00:00.000Z`, event: r.event, count: 0 }),
    (a, r) => ({ ...a, count: a.count + int(r.count) }),
    (a, r) => ({ ...a, count: a.count + int(r.total) })
  ).sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : b.count - a.count)).map(r => ({ ...r, count: String(r.count) }));

  const funnel = sumBy(raw.funnel, rollupRows.filter(r => FUNNEL_EVENTS.includes(r.event)), r => r.event,
    r => ({ event: r.event, total: 0, unique_sessions: 0 }),
    (a, r) => ({ ...a, total: a.total + int(r.total), unique_sessions: a.unique_sessions + int(r.unique_sessions) }),
    (a, r) => ({ ...a, total: a.total + int(r.total), unique_sessions: a.unique_sessions + int(r.unique_sessions) })
  ).sort((a, b) => b.total - a.total).map(r => ({ event: r.event, total: String(r.total), unique_sessions: String(r.unique_sessions) }));

  const authMethods = sumBy(raw.authMethods, rollupRows.filter(r => AUTH_EVENTS.includes(r.event)), r => r.method,
    r => ({ method: r.method, attempts: 0, unique_users: 0 }),
    (a, r) => ({ ...a, attempts: a.attempts + int(r.attempts), unique_users: a.unique_users + int(r.unique_users) }),
    (a, r) => ({ ...a, attempts: a.attempts + int(r.total), unique_users: a.unique_users + int(r.unique_sessions) })
  ).sort((a, b) => b.attempts - a.attempts).map(r => ({ method: r.method, attempts: String(r.attempts), unique_users: String(r.unique_users) }));

  const partner = sumBy(raw.partner, rollupRows.filter(r => r.event === "partner_api_call"), r => `${r.partner ?? r.method}|${dayStr(r.day)}`,
    r => ({ partner: r.partner ?? r.method, day: `${dayStr(r.day)}T00:00:00.000Z`, calls: 0 }),
    (a, r) => ({ ...a, calls: a.calls + int(r.calls) }),
    (a, r) => ({ ...a, calls: a.calls + int(r.total) })
  ).sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : b.calls - a.calls)).map(r => ({ ...r, calls: String(r.calls) }));

  return { summary, daily, funnel, authMethods, partner };
}

function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHash("sha256").update(ip + (process.env.JWT_SECRET || "salt")).digest("hex").slice(0, 16);
}

const IS_PROD = process.env.NODE_ENV === "production";

function getSession(req, res) {
  let sid = req.cookies?.sp_session;
  if (!sid) {
    sid = crypto.randomBytes(16).toString("hex");
    res.cookie("sp_session", sid, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: IS_PROD ? "none" : "lax", // "none" needed for cross-origin Railway calls (SEO pages etc.), same fix as auth.js
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }
  return sid;
}

// In-memory dedup: prevents polling endpoints from inflating page-view counts.
// Key: "sessionId:event" → timestamp of last tracked fire.
// Entries expire after DEDUP_TTL_MS; the map is pruned every 10 min.
const _dedupMap = new Map();
const DEDUP_TTL_MS = 60 * 60 * 1000; // 1 hour per session per event

setInterval(() => {
  const cutoff = Date.now() - DEDUP_TTL_MS;
  for (const [k, ts] of _dedupMap) {
    if (ts < cutoff) _dedupMap.delete(k);
  }
}, 10 * 60 * 1000);

function shouldTrackOnce(sessionId, event) {
  if (!sessionId) return true;
  const key = `${sessionId}:${event}`;
  const last = _dedupMap.get(key);
  if (last && Date.now() - last < DEDUP_TTL_MS) return false;
  _dedupMap.set(key, Date.now());
  return true;
}

// Cache for /api/admin/analytics — the underlying queries scan most/all of a
// multi-million-row table for large day ranges (12-30s+), so short-lived
// caching keyed by `days` avoids re-running that on every dashboard refresh.
const _analyticsCache = new Map(); // key: days -> { data, ts }
const ANALYTICS_CACHE_TTL_MS = 5 * 60 * 1000;

// Coarse, non-identifying traffic class from the User-Agent (never stored raw).
function uaClass(req) {
  const ua = req.headers["user-agent"] || "";
  if (!ua) return "none";
  if (/bot|crawl|spider|slurp|facebookexternalhit|preview|headless|python|curl|wget|axios|node-fetch|go-http|java\/|okhttp|homeassistant/i.test(ua)) return "bot";
  if (/mobile|android|iphone|ipad/i.test(ua)) return "mobile";
  return "desktop";
}

async function track(pool, { event, method = null, userId = null, sessionId, path, ip, dedup = false, properties = null }) {
  if (dedup && !shouldTrackOnce(sessionId, event)) return;
  try {
    await pool.query(
      `INSERT INTO analytics_events (event, method, user_id, session_id, path, ip, properties)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [event, method, userId || null, sessionId, path, hashIp(ip), properties ? JSON.stringify(properties) : null]
    );
  } catch (e) {
    console.warn("[analytics] track failed:", e.message);
  }
}

// Optional partner identification — no key required, purely for visibility.
// A device/integration can send ?partner=name or X-Partner: name on requests
// to see its own daily call count separately in /api/admin/analytics
// (event: "partner_api_call", broken down by method = partner name).
//
// Fair-use monitoring, not enforcement: agreed usage patterns (e.g. ACIT SA's
// ~12/day centralized-server polling) are never hard-blocked — a threshold
// crossing just triggers one alert email per partner per day so we notice
// and can follow up, rather than silently breaking someone's integration
// over normal retry variance.
const PARTNER_FAIR_USE_THRESHOLD = 30; // ~2.5x a typical agreed 12/day pattern
const _partnerAlertedToday = new Map(); // partner -> "YYYY-MM-DD" already alerted

async function checkPartnerSpike(pool, partner) {
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Brussels" }).format(new Date());
  if (_partnerAlertedToday.get(partner) === today) return;
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS c FROM analytics_events
       WHERE event = 'partner_api_call' AND method = $1
         AND created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Brussels') AT TIME ZONE 'Europe/Brussels'`,
      [partner]
    );
    const count = parseInt(rows[0]?.c || 0, 10);
    if (count > PARTNER_FAIR_USE_THRESHOLD) {
      _partnerAlertedToday.set(partner, today);
      console.warn(`[partner-usage] ${partner} exceeded fair-use threshold: ${count} calls today`);
      sendMail({
        from: "SmartPrice.be <info@smartprice.be>",
        to: "info@smartprice.be",
        subject: `⚠️ Partner API usage spike — ${partner}`,
        html: `<p><strong>${partner}</strong> has made <strong>${count}</strong> calls today, above the expected fair-use pattern (~12/day, centralized-server polling). Worth checking in with them — their usage pattern may have changed (e.g. per-device calls instead of one central server).</p>`,
      }).catch(e => console.warn("[partner-usage] alert email failed:", e.message));
    }
  } catch (e) {
    console.warn("[partner-usage] spike check failed:", e.message);
  }
}

function trackPartnerCall(pool, req) {
  const partner = req.headers["x-partner"] || req.query.partner;
  if (!partner) return;
  const name = String(partner).slice(0, 40);
  track(pool, {
    event: "partner_api_call",
    method: name,
    sessionId: req._sessionId,
    path: req.originalUrl,
    ip: req._ip,
  });
  checkPartnerSpike(pool, name).catch(() => {});
}

module.exports = function attachAnalytics(app, pool) {
  const eventsDb = getAnalyticsPool(pool);

  // Bootstrap both tables, then run an immediate cleanup pass — sequenced so
  // a brand-new analytics store (e.g. first-time CockroachDB setup) has its
  // table created before anything tries to query it. Runs at startup too, so
  // a deploy doesn't wait up to an hour to start relieving a storage-quota
  // situation.
  (async () => {
    try {
      await ensureAnalyticsTable(eventsDb);
      await ensureRollupTable(pool);
      await rollupAndPruneAnalytics(pool, eventsDb);
    } catch (e) {
      console.error("[analytics] startup bootstrap/cleanup failed:", e.message);
    }
  })();
  setInterval(() => {
    rollupAndPruneAnalytics(pool, eventsDb).catch(e => console.warn("[analytics-maintenance] run failed:", e.message));
  }, 60 * 60 * 1000);

  // Session middleware
  app.use((req, res, next) => {
    const sid = getSession(req, res);
    req._sessionId = sid;
    req._ip = req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim();
    next();
  });

  // Calculator usage — use general middleware checking originalUrl
  // because these routes go through an Express router (app.use strips prefix)
  app.use((req, res, next) => {
    if (req.method === "POST") {
      if (req.originalUrl.includes("/api/suppliers/calculate-gas")) {
        track(eventsDb, {
          event: "calculator_start_gas",
          userId: req.user?.id,
          sessionId: req._sessionId,
          path: req.originalUrl,
          ip: req._ip,
        });
      } else if (req.originalUrl.includes("/api/suppliers/calculate")) {
        track(eventsDb, {
          event: "calculator_start",
          userId: req.user?.id,
          sessionId: req._sessionId,
          path: req.originalUrl,
          ip: req._ip,
        });
      }
    }
    next();
  });

  // Auth events
  // Records an outcome event once the response is sent, only if it succeeded —
  // this is what separates "tried to sign up" from "actually signed up".
  const trackOnSuccess = (req, res, event, method) => {
    res.on("finish", () => {
      if (res.statusCode < 300) track(eventsDb, { event, method, sessionId: req._sessionId, path: req.originalUrl, ip: req._ip });
    });
  };

  app.use("/auth/login", (req, res, next) => {
    if (req.method === "POST") {
      track(eventsDb, { event: "login_attempt_email", method: "email", sessionId: req._sessionId, path: req.originalUrl, ip: req._ip });
      trackOnSuccess(req, res, "login_success", "email");
    }
    next();
  });

  app.use("/auth/register", (req, res, next) => {
    if (req.method === "POST") {
      track(eventsDb, { event: "register_email", method: "email", sessionId: req._sessionId, path: req.originalUrl, ip: req._ip });
      trackOnSuccess(req, res, "register_success", "email");
    }
    next();
  });

  // Google flow completes when the frontend swaps its one-time tokens for cookies
  app.use("/auth/exchange", (req, res, next) => {
    if (req.method === "POST") trackOnSuccess(req, res, "login_success", "google");
    next();
  });

  // Frontend funnel beacon: fires when the sign-in/sign-up screen is opened.
  // `src` = the page the visitor was on (path only), i.e. which page's CTA led here.
  app.get("/api/track-event", (req, res) => {
    const name = String(req.query.e || "");
    if (name !== "auth_page_view") return res.status(400).end();
    const src = typeof req.query.src === "string" ? req.query.src.replace(/[^\w\-/]/g, "").slice(0, 80) : "";
    track(eventsDb, { event: name, method: src || "unknown", sessionId: req._sessionId, path: src, ip: req._ip, dedup: true, properties: { ua: uaClass(req) } });
    res.status(204).end();
  });

  // Sign-up funnel: distinct sessions per step, plus which pages send people to the auth screen
  app.get("/api/admin/signup-funnel", async (req, res) => {
    if (!process.env.ADMIN_SECRET || req.headers["x-admin-secret"] !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const days = Math.min(parseInt(req.query.days || 7, 10) || 7, RAW_RETENTION_DAYS);
    try {
      const [steps, bySrc] = await Promise.all([
        eventsDb.query(
          `SELECT event, COUNT(DISTINCT session_id) AS sessions, COUNT(*) AS events
           FROM analytics_events
           WHERE event IN ('page_view','auth_page_view','login_attempt_google','register_email','register_success','login_success')
             AND created_at >= NOW() - ($1 || ' days')::interval
           GROUP BY event`, [String(days)]),
        eventsDb.query(
          `SELECT method AS from_page, COUNT(DISTINCT session_id) AS sessions
           FROM analytics_events WHERE event = 'auth_page_view' AND created_at >= NOW() - ($1 || ' days')::interval
           GROUP BY 1 ORDER BY 2 DESC LIMIT 20`, [String(days)]),
      ]);
      res.json({ success: true, days, steps: steps.rows, auth_screen_opened_from: bySrc.rows });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.use("/auth/google", (req, res, next) => {
    if (req.method === "GET" && !req.path.includes("callback")) {
      track(eventsDb, { event: "login_attempt_google", method: "google", sessionId: req._sessionId, path: req.originalUrl, ip: req._ip });
    }
    next();
  });

  // Dashboard loads — dedup:true prevents each auto-refresh from counting as a new view
  app.use("/api/prices/today", (req, res, next) => {
    if (req.method === "GET") {
      const hasToken = !!(req.cookies?.access_token || req.headers.authorization);
      track(eventsDb, {
        event: "page_view",
        method: hasToken ? "logged_in" : "guest",
        userId: req.user?.id || null,
        sessionId: req._sessionId,
        path: req.originalUrl,
        ip: req._ip,
        dedup: true,
        properties: { ua: uaClass(req) },
      });
      trackPartnerCall(eventsDb, req);
    }
    next();
  });

  // EV page loads — track via /api/cheapest endpoint
  // dedup:true → only count once per session per hour (endpoint is called by multiple components on mount)
  app.use("/api/cheapest", (req, res, next) => {
    if (req.method === "GET") {
      track(eventsDb, {
        event: "ev_page_view",
        method: "guest",
        userId: null,
        sessionId: req._sessionId,
        path: req.originalUrl,
        ip: req._ip,
        dedup: true,
        properties: { ua: uaClass(req) },
      });
      trackPartnerCall(eventsDb, req);
    }
    next();
  });

  // SEO page views — track via /api/current endpoint
  // dedup:true → only count once per session per hour (/api/current is polled every 60s for live price)
  app.use("/api/current", (req, res, next) => {
    if (req.method === "GET") {
      track(eventsDb, {
        event: "seo_page_view",
        method: "guest",
        userId: null,
        sessionId: req._sessionId,
        path: req.originalUrl,
        ip: req._ip,
        dedup: true,
        properties: { ua: uaClass(req) },
      });
    }
    next();
  });

  // Where visitors come from. Fired once per browser session by the frontend
  // (main.jsx) with document.referrer + UTM params. Stores only the referrer
  // HOSTNAME (no path/query), UTM labels, landing path and a coarse device
  // class — no raw User-Agent, no full URLs.
  app.get("/api/track-visit", (req, res) => {
    const clean = (v, n) => (typeof v === "string" ? v.replace(/[^\w.\-:/ +@]/g, "").slice(0, n) : "");
    let refHost = "";
    try { refHost = new URL(String(req.query.ref || "")).hostname.replace(/^www\./, "").slice(0, 80); } catch {}
    track(eventsDb, {
      event: "visit",
      method: refHost || "direct",
      sessionId: req._sessionId,
      path: clean(req.query.path, 100),
      ip: req._ip,
      dedup: true,
      properties: {
        ua: uaClass(req),
        ref: refHost || null,
        utm_source: clean(req.query.utm_source, 40) || null,
        utm_medium: clean(req.query.utm_medium, 40) || null,
        utm_campaign: clean(req.query.utm_campaign, 40) || null,
      },
    });
    res.status(204).end();
  });

  // Traffic sources report (raw events only, so limited to the retention window)
  app.get("/api/admin/traffic-sources", async (req, res) => {
    if (!process.env.ADMIN_SECRET || req.headers["x-admin-secret"] !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const days = Math.min(parseInt(req.query.days || 7, 10) || 7, RAW_RETENTION_DAYS);
    try {
      const [byRef, byUa, byDay] = await Promise.all([
        eventsDb.query(
          `SELECT method AS source, properties->>'utm_source' AS utm_source, properties->>'ua' AS device, COUNT(*) AS visits
           FROM analytics_events WHERE event = 'visit' AND created_at >= NOW() - ($1 || ' days')::interval
           GROUP BY 1, 2, 3 ORDER BY visits DESC LIMIT 60`, [String(days)]),
        eventsDb.query(
          `SELECT event, properties->>'ua' AS device, COUNT(*) AS events
           FROM analytics_events WHERE event IN ('seo_page_view','page_view','ev_page_view')
             AND created_at >= NOW() - ($1 || ' days')::interval
           GROUP BY 1, 2 ORDER BY 1, events DESC`, [String(days)]),
        eventsDb.query(
          `SELECT DATE_TRUNC('day', created_at AT TIME ZONE 'Europe/Brussels')::date AS day,
             properties->>'ua' AS device, COUNT(*) AS page_views
           FROM analytics_events WHERE event = 'page_view' AND created_at >= NOW() - ($1 || ' days')::interval
           GROUP BY 1, 2 ORDER BY 1 DESC, 3 DESC`, [String(days)]),
      ]);
      res.json({ success: true, days, visits_by_source: byRef.rows, page_events_by_device: byUa.rows, dashboard_views_by_day_device: byDay.rows });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Business page views — lightweight ping called on mount by BusinessPage.jsx
  app.get("/api/business-ping", (req, res) => {
    track(eventsDb, {
      event: "business_page_view",
      method: "guest",
      userId: null,
      sessionId: req._sessionId,
      path: req.originalUrl,
      ip: req._ip,
      dedup: true,
    });
    res.json({ ok: true });
  });

  // Admin analytics endpoint
  app.get("/api/admin/analytics", async (req, res) => {
    const secret = req.headers["x-admin-secret"];
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const days = Math.min(parseInt(req.query.days || 7), 365);

    const cached = _analyticsCache.get(days);
    if (cached && Date.now() - cached.ts < ANALYTICS_CACHE_TTL_MS) {
      return res.json(cached.data);
    }

    // For 1 day: use calendar day from midnight Brussels time
    // For 7d+: use rolling window
    const dateFilter = days === 1
      ? `created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Brussels') AT TIME ZONE 'Europe/Brussels'`
      : `created_at >= NOW() - INTERVAL '${days} days'`;

    try {
      const [summary, daily, authMethods, guestRatio, funnel, userCount, partnerBreakdown] = await Promise.all([
        eventsDb.query(`
          SELECT event, COUNT(*) AS total,
            COUNT(DISTINCT session_id) AS unique_sessions,
            COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS logged_in_users
          FROM analytics_events
          WHERE ${dateFilter}
          GROUP BY event ORDER BY total DESC
        `),

        eventsDb.query(`
          SELECT DATE_TRUNC('day', created_at AT TIME ZONE 'Europe/Brussels')::date AS day,
            event, COUNT(*) AS count
          FROM analytics_events
          WHERE ${dateFilter}
          GROUP BY day, event ORDER BY day DESC, count DESC
        `),

        eventsDb.query(`
          SELECT method, COUNT(*) AS attempts, COUNT(DISTINCT session_id) AS unique_users
          FROM analytics_events
          WHERE event IN ('login_attempt_email','login_attempt_google','register_email')
            AND ${dateFilter}
          GROUP BY method ORDER BY attempts DESC
        `),

        eventsDb.query(`
          SELECT method, COUNT(DISTINCT session_id) AS sessions
          FROM analytics_events
          WHERE event IN ('guest_session','page_view','ev_page_view','seo_page_view')
            AND ${dateFilter}
          GROUP BY method
        `),

        eventsDb.query(`
          SELECT event, COUNT(*) AS total, COUNT(DISTINCT session_id) AS unique_sessions
          FROM analytics_events
          WHERE event IN ('calculator_start','calculator_start_gas','login_attempt_email','login_attempt_google','register_email','ev_page_view','seo_page_view','auth_page_view','register_success','login_success')
            AND ${dateFilter}
          GROUP BY event ORDER BY total DESC
        `),

        pool.query(`
          SELECT COUNT(*) AS total,
            COUNT(*) FILTER (WHERE providers->>'google' = 'true') AS google_users,
            COUNT(*) FILTER (WHERE password_hash IS NOT NULL)     AS email_users,
            COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Brussels') AT TIME ZONE 'Europe/Brussels') AS new_today,
            COUNT(*) FILTER (WHERE ${dateFilter}) AS new_in_period,
            COUNT(*) FILTER (WHERE preferences->>'tesla_access_token' IS NOT NULL) AS tesla_connected
          FROM users
        `),

        eventsDb.query(`
          SELECT method AS partner,
            DATE_TRUNC('day', created_at AT TIME ZONE 'Europe/Brussels')::date AS day,
            COUNT(*) AS calls
          FROM analytics_events
          WHERE event = 'partner_api_call' AND ${dateFilter}
          GROUP BY partner, day ORDER BY day DESC, calls DESC
        `),
      ]);

      // Raw rows and rollup rows are disjoint (rollup only holds events already
      // deleted from raw), so adding them is exact for totals. unique_sessions
      // summed across days slightly overcounts sessions spanning several days.
      const todayBrussels = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Brussels" }).format(new Date());
      const startDay = new Date(todayBrussels + "T00:00:00Z");
      startDay.setUTCDate(startDay.getUTCDate() - (days - 1));
      const rollupRows = (await pool.query(
        `SELECT day, event, method, total, unique_sessions, logged_in_users
         FROM analytics_daily_rollup WHERE day >= $1`,
        [startDay.toISOString().slice(0, 10)]
      ).catch(() => ({ rows: [] }))).rows;
      const merged = mergeWithRollup(
        { summary: summary.rows, daily: daily.rows, authMethods: authMethods.rows, funnel: funnel.rows, partner: partnerBreakdown.rows },
        rollupRows
      );

      const payload = {
        success: true,
        period_days: days,
        generated_at: new Date().toISOString(),
        total_registered_users: userCount.rows[0],
        summary: merged.summary,
        partner_api_calls: merged.partner,
        auth_methods: merged.authMethods,
        guest_vs_loggedin: guestRatio.rows,
        calculator_funnel: merged.funnel,
        daily_breakdown: merged.daily,
      };
      _analyticsCache.set(days, { data: payload, ts: Date.now() });
      res.json(payload);

    } catch (e) {
      console.error("[analytics] admin query failed:", e.message);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Admin users list endpoint
  app.get("/api/admin/users", async (req, res) => {
    const secret = req.headers["x-admin-secret"];
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    try {
      const result = await pool.query(`
        SELECT
          id, name, email,
          CASE WHEN providers->>'google' = 'true' THEN true ELSE false END AS google,
          CASE WHEN password_hash IS NOT NULL      THEN true ELSE false END AS email_auth,
          CASE WHEN preferences->>'tesla_access_token' IS NOT NULL THEN true ELSE false END AS tesla_connected,
          preferences->>'referral_source' AS referral_source,
          created_at
        FROM users
        ORDER BY created_at DESC
      `);
      res.json({ success: true, users: result.rows });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Admin leads list endpoint
  app.get("/api/admin/leads", async (req, res) => {
    const secret = req.headers["x-admin-secret"];
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    try {
      const result = await pool.query(`
        SELECT id, email, source, created_at
        FROM leads
        ORDER BY created_at DESC
      `);
      res.json({ success: true, leads: result.rows, total: result.rows.length });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Manual trigger for the rollup+prune job — for urgent runs (e.g. a
  // storage-quota crisis) rather than waiting up to an hour for the
  // scheduled pass.
  app.post("/api/admin/run-analytics-cleanup", async (req, res) => {
    const { secret } = req.body || {};
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    try {
      const result = await rollupAndPruneAnalytics(pool, eventsDb);
      res.json({ success: true, ...result });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Row-count check for both stores — quick way to see storage impact
  // without needing direct DB access (e.g. Supabase/CockroachDB dashboards).
  app.get("/api/admin/analytics-storage", async (req, res) => {
    const secret = req.headers["x-admin-secret"];
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    try {
      const [raw, rollup] = await Promise.all([
        eventsDb.query(`SELECT COUNT(*) AS c, MIN(created_at) AS oldest, MAX(created_at) AS newest FROM analytics_events`),
        pool.query(`SELECT COUNT(*) AS c, MIN(day) AS oldest, MAX(day) AS newest FROM analytics_daily_rollup`),
      ]);
      res.json({
        success: true,
        split_active: eventsDb !== pool,
        raw_events: raw.rows[0],
        daily_rollup: rollup.rows[0],
        raw_retention_days: RAW_RETENTION_DAYS,
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  console.log("   Analytics: enabled");
};