/**
 * analytics.js — SmartPrice event tracking
 */

const crypto = require("crypto");

function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHash("sha256").update(ip + (process.env.JWT_SECRET || "salt")).digest("hex").slice(0, 16);
}

function getSession(req, res) {
  let sid = req.cookies?.sp_session;
  if (!sid) {
    sid = crypto.randomBytes(16).toString("hex");
    res.cookie("sp_session", sid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }
  return sid;
}

async function track(pool, { event, method = null, userId = null, sessionId, path, ip }) {
  try {
    await pool.query(
      `INSERT INTO analytics_events (event, method, user_id, session_id, path, ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [event, method, userId || null, sessionId, path, hashIp(ip)]
    );
  } catch (e) {
    console.warn("[analytics] track failed:", e.message);
  }
}

module.exports = function attachAnalytics(app, pool) {

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
        track(pool, {
          event: "calculator_start_gas",
          userId: req.user?.id,
          sessionId: req._sessionId,
          path: req.originalUrl,
          ip: req._ip,
        });
      } else if (req.originalUrl.includes("/api/suppliers/calculate")) {
        track(pool, {
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
  app.use("/auth/login", (req, res, next) => {
    if (req.method === "POST") {
      track(pool, { event: "login_attempt_email", method: "email", sessionId: req._sessionId, path: req.originalUrl, ip: req._ip });
    }
    next();
  });

  app.use("/auth/register", (req, res, next) => {
    if (req.method === "POST") {
      track(pool, { event: "register_email", method: "email", sessionId: req._sessionId, path: req.originalUrl, ip: req._ip });
    }
    next();
  });

  app.use("/auth/google", (req, res, next) => {
    if (req.method === "GET" && !req.path.includes("callback")) {
      track(pool, { event: "login_attempt_google", method: "google", sessionId: req._sessionId, path: req.originalUrl, ip: req._ip });
    }
    next();
  });

  // Dashboard loads
  app.use("/api/prices/today", (req, res, next) => {
    if (req.method === "GET") {
      const hasToken = !!(req.cookies?.access_token || req.headers.authorization);
      track(pool, {
        event: "page_view",
        method: hasToken ? "logged_in" : "guest",
        userId: req.user?.id || null,
        sessionId: req._sessionId,
        path: req.originalUrl,
        ip: req._ip,
      });
    }
    next();
  });

  // EV page loads — track via /api/cheapest endpoint
  app.use("/api/cheapest", (req, res, next) => {
    if (req.method === "GET") {
      track(pool, {
        event: "ev_page_view",
        method: "guest",
        userId: null,
        sessionId: req._sessionId,
        path: req.originalUrl,
        ip: req._ip,
      });
    }
    next();
  });

  // SEO page views — track via /api/current endpoint
  app.use("/api/current", (req, res, next) => {
    if (req.method === "GET") {
      track(pool, {
        event: "seo_page_view",
        method: "guest",
        userId: null,
        sessionId: req._sessionId,
        path: req.originalUrl,
        ip: req._ip,
      });
    }
    next();
  });

  // Admin analytics endpoint
  app.get("/api/admin/analytics", async (req, res) => {
    const secret = req.headers["x-admin-secret"];
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const days = Math.min(parseInt(req.query.days || 7), 90);

    // For 1 day: use calendar day from midnight Brussels time
    // For 7d+: use rolling window
    const dateFilter = days === 1
      ? `created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Brussels') AT TIME ZONE 'Europe/Brussels'`
      : `created_at >= NOW() - INTERVAL '${days} days'`;

    try {
      const summary = await pool.query(`
        SELECT event, COUNT(*) AS total,
          COUNT(DISTINCT session_id) AS unique_sessions,
          COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS logged_in_users
        FROM analytics_events
        WHERE ${dateFilter}
        GROUP BY event ORDER BY total DESC
      `);

      const daily = await pool.query(`
        SELECT DATE_TRUNC('day', created_at AT TIME ZONE 'Europe/Brussels')::date AS day,
          event, COUNT(*) AS count
        FROM analytics_events
        WHERE ${dateFilter}
        GROUP BY day, event ORDER BY day DESC, count DESC
      `);

      const authMethods = await pool.query(`
        SELECT method, COUNT(*) AS attempts, COUNT(DISTINCT session_id) AS unique_users
        FROM analytics_events
        WHERE event IN ('login_attempt_email','login_attempt_google','register_email')
          AND ${dateFilter}
        GROUP BY method ORDER BY attempts DESC
      `);

      const guestRatio = await pool.query(`
        SELECT method, COUNT(DISTINCT session_id) AS sessions
        FROM analytics_events
        WHERE event IN ('guest_session','page_view','ev_page_view','seo_page_view')
          AND ${dateFilter}
        GROUP BY method
      `);

      const funnel = await pool.query(`
        SELECT event, COUNT(*) AS total, COUNT(DISTINCT session_id) AS unique_sessions
        FROM analytics_events
        WHERE event IN ('calculator_start','calculator_start_gas','login_attempt_email','login_attempt_google','register_email','ev_page_view','seo_page_view')
          AND ${dateFilter}
        GROUP BY event ORDER BY total DESC
      `);

      const userCount = await pool.query(`
        SELECT COUNT(*) AS total,
          COUNT(*) FILTER (WHERE providers->>'google' = 'true') AS google_users,
          COUNT(*) FILTER (WHERE password_hash IS NOT NULL)     AS email_users,
          COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Brussels') AT TIME ZONE 'Europe/Brussels') AS new_today,
          COUNT(*) FILTER (WHERE ${dateFilter}) AS new_in_period,
          COUNT(*) FILTER (WHERE preferences->>'tesla_access_token' IS NOT NULL) AS tesla_connected
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

  console.log("   Analytics: enabled");
};