/**
 * analytics.js — SmartPrice event tracking
 *
 * Tracks:
 *  - calculator_start      : user hits /api/suppliers/calculate
 *  - calculator_start_gas  : user hits /api/suppliers/calculate-gas
 *  - login_attempt_email   : POST /auth/login
 *  - login_attempt_google  : GET /auth/google (OAuth redirect)
 *  - register_email        : POST /auth/register
 *  - guest_session         : any request with no auth + session cookie
 *  - page_view             : GET /api/prices/today (proxy for dashboard load)
 *
 * Admin dashboard: GET /api/admin/analytics?days=7
 * Protected by ADMIN_SECRET env var.
 */

const crypto = require("crypto");

// Hash IP for GDPR compliance — one-way, non-reversible
function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHash("sha256").update(ip + process.env.JWT_SECRET).digest("hex").slice(0, 16);
}

// Get or create anonymous session ID from cookie
function getSession(req, res) {
  let sid = req.cookies?.sp_session;
  if (!sid) {
    sid = crypto.randomBytes(16).toString("hex");
    res.cookie("sp_session", sid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  }
  return sid;
}

// Core track function — fire and forget, never blocks the request
async function track(pool, { event, method = null, userId = null, sessionId, path, ip }) {
  try {
    await pool.query(
      `INSERT INTO analytics_events (event, method, user_id, session_id, path, ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [event, method, userId || null, sessionId, path, hashIp(ip)]
    );
  } catch (e) {
    // Never crash the server for analytics
    console.warn("[analytics] track failed:", e.message);
  }
}

// ── Attach analytics middleware + admin route to Express app ──
module.exports = function attachAnalytics(app, pool) {

  // ── Middleware: runs on every request ──────────────────────
  app.use((req, res, next) => {
    const sid = getSession(req, res);
    req._sessionId = sid;
    req._ip = req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim();
    next();
  });

  // ── Calculator usage ───────────────────────────────────────
  app.use("/api/suppliers/calculate", (req, res, next) => {
    if (req.method === "POST") {
      const isGas = req.path.includes("gas");
      track(pool, {
        event: isGas ? "calculator_start_gas" : "calculator_start",
        userId: req.user?.id,
        sessionId: req._sessionId,
        path: req.originalUrl,
        ip: req._ip,
      });
    }
    next();
  });

  // ── Auth events ────────────────────────────────────────────
  app.use("/auth/login", (req, res, next) => {
    if (req.method === "POST") {
      track(pool, {
        event: "login_attempt_email",
        method: "email",
        sessionId: req._sessionId,
        path: req.originalUrl,
        ip: req._ip,
      });
    }
    next();
  });

  app.use("/auth/register", (req, res, next) => {
    if (req.method === "POST") {
      track(pool, {
        event: "register_email",
        method: "email",
        sessionId: req._sessionId,
        path: req.originalUrl,
        ip: req._ip,
      });
    }
    next();
  });

  app.use("/auth/google", (req, res, next) => {
    if (req.method === "GET" && !req.path.includes("callback")) {
      track(pool, {
        event: "login_attempt_google",
        method: "google",
        sessionId: req._sessionId,
        path: req.originalUrl,
        ip: req._ip,
      });
    }
    next();
  });

  // ── Dashboard loads (proxy for active users) ───────────────
  app.use("/api/prices/today", (req, res, next) => {
    if (req.method === "GET") {
      const isGuest = !req.cookies?.access_token && !req.headers.authorization;
      track(pool, {
        event: isGuest ? "guest_session" : "page_view",
        method: isGuest ? "guest" : "logged_in",
        userId: req.user?.id || null,
        sessionId: req._sessionId,
        path: req.originalUrl,
        ip: req._ip,
      });
    }
    next();
  });

  // ── Admin analytics endpoint ───────────────────────────────
  // GET /api/admin/analytics?days=7
  // Header: x-admin-secret: YOUR_ADMIN_SECRET
  app.get("/api/admin/analytics", async (req, res) => {
    const secret = req.headers["x-admin-secret"];
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const days = Math.min(parseInt(req.query.days || 7), 90);

    try {
      // ── Summary counts ──────────────────────────────────────
      const summary = await pool.query(`
        SELECT
          event,
          COUNT(*)                                          AS total,
          COUNT(DISTINCT session_id)                        AS unique_sessions,
          COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS logged_in_users
        FROM analytics_events
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY event
        ORDER BY total DESC
      `);

      // ── Daily breakdown ─────────────────────────────────────
      const daily = await pool.query(`
        SELECT
          DATE_TRUNC('day', created_at AT TIME ZONE 'Europe/Brussels')::date AS day,
          event,
          COUNT(*) AS count
        FROM analytics_events
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY day, event
        ORDER BY day DESC, count DESC
      `);

      // ── Auth method breakdown ───────────────────────────────
      const authMethods = await pool.query(`
        SELECT
          method,
          COUNT(*)                       AS attempts,
          COUNT(DISTINCT session_id)     AS unique_users
        FROM analytics_events
        WHERE event IN ('login_attempt_email','login_attempt_google','register_email')
          AND created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY method
        ORDER BY attempts DESC
      `);

      // ── Guest vs logged-in ratio ────────────────────────────
      const guestRatio = await pool.query(`
        SELECT
          method,
          COUNT(DISTINCT session_id) AS sessions
        FROM analytics_events
        WHERE event IN ('guest_session','page_view')
          AND created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY method
      `);

      // ── Calculator funnel ───────────────────────────────────
      const funnel = await pool.query(`
        SELECT
          event,
          COUNT(*)                   AS total,
          COUNT(DISTINCT session_id) AS unique_sessions
        FROM analytics_events
        WHERE event IN ('calculator_start','calculator_start_gas','login_attempt_email','login_attempt_google','register_email')
          AND created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY event
        ORDER BY total DESC
      `);

      // ── Total registered users ──────────────────────────────
      const userCount = await pool.query(`
        SELECT COUNT(*) AS total,
          COUNT(*) FILTER (WHERE providers->>'google' = 'true') AS google_users,
          COUNT(*) FILTER (WHERE providers->>'email'  = 'true') AS email_users
        FROM users
      `);

      res.json({
        success: true,
        period_days: days,
        generated_at: new Date().toISOString(),
        total_registered_users: userCount.rows[0],
        summary: summary.rows,
        auth_methods: authMethods.rows,
        guest_vs_loggedin: guestRatio.rows,
        calculator_funnel: funnel.rows,
        daily_breakdown: daily.rows,
      });

    } catch (e) {
      console.error("[analytics] admin query failed:", e.message);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  console.log("   Analytics: ✅ Tracking enabled");
};