/**
 * email-alerts.js — Hourly price alert checker
 */

const axios = require("axios");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.FROM_EMAIL || "alerts@smartprice.be";
const APP_URL        = process.env.FRONTEND_URL || "https://smartprice.be";
// Self-URL for internal API calls: prefer Railway domain to avoid going through Vercel rewrite
const SELF_URL = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : "https://smart-energy-production-aef3.up.railway.app";

const TZ = "Europe/Brussels";
function toLocalISODate(d) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(d);
}
function getLocalHour(d) {
  return parseInt(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", hour12: false }).format(d));
}

async function getCurrentPrice() {
  const today = toLocalISODate(new Date());
  const { data } = await axios.get(
    `https://api.energy-charts.info/price?bzn=BE&start=${today}&end=${today}`,
    { timeout: 10000 }
  );
  const nowHour = getLocalHour(new Date());
  const idx = data.unix_seconds.findIndex(ts => getLocalHour(new Date(ts * 1000)) === nowHour);
  return idx >= 0 ? data.price[idx] : data.price[data.price.length - 1];
}

async function sendAlertEmail({ to, name, currentPrice, threshold, supplier }) {
  const priceColor = currentPrice < 0 ? "#22C55E" : currentPrice < 50 ? "#00C896" : "#F59E0B";
  const saving = (threshold - currentPrice).toFixed(1);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#060B14;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="font-size:40px;">⚡</div>
    <div style="color:#00C896;font-size:24px;font-weight:800;">SmartPrice.be</div>
    <div style="color:#445;font-size:13px;">Belgium Real-Time Electricity Prices</div>
  </div>
  <div style="background:linear-gradient(135deg,#0A1628,#0D2040);border:1px solid ${priceColor}44;border-radius:20px;padding:28px;margin-bottom:24px;">
    <div style="color:#778;font-size:13px;margin-bottom:8px;">⚡ PRICE ALERT</div>
    <div style="color:#fff;font-size:22px;font-weight:700;margin-bottom:4px;">Hi ${name || "there"}!</div>
    <div style="color:#aaa;font-size:15px;line-height:1.6;margin-bottom:20px;">
      Belgian electricity price dropped below your threshold of <strong style="color:#fff">€${threshold}/MWh</strong>.
    </div>
    <div style="background:rgba(0,0,0,0.3);border-radius:14px;padding:20px;text-align:center;margin-bottom:20px;">
      <div style="color:#556;font-size:12px;">CURRENT PRICE</div>
      <div style="color:${priceColor};font-size:48px;font-weight:900;font-family:monospace;">€${currentPrice.toFixed(1)}</div>
      <div style="color:#556;font-size:13px;">per MWh · right now</div>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:20px;">
      <div style="flex:1;background:rgba(0,200,150,0.1);border-radius:10px;padding:12px;text-align:center;">
        <div style="color:#556;font-size:11px;">YOUR THRESHOLD</div>
        <div style="color:#fff;font-size:18px;font-weight:700;">€${threshold}</div>
      </div>
      <div style="flex:1;background:rgba(0,200,150,0.1);border-radius:10px;padding:12px;text-align:center;">
        <div style="color:#556;font-size:11px;">SAVING vs THRESHOLD</div>
        <div style="color:#00C896;font-size:18px;font-weight:700;">€${saving}</div>
      </div>
    </div>
    <a href="${APP_URL}" style="display:block;background:linear-gradient(135deg,#0D9488,#1A56A4);color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:12px;font-weight:700;">
      View Live Prices on SmartPrice.be →
    </a>
  </div>
  <div style="background:rgba(255,255,255,0.03);border-radius:14px;padding:16px;margin-bottom:24px;">
    <div style="color:#0D9488;font-size:13px;font-weight:600;margin-bottom:6px;">💡 Now is a great time to:</div>
    <div style="color:#556;font-size:13px;line-height:1.8;">
      • Run your washing machine or dishwasher<br>
      • Charge your electric vehicle<br>
      • Heat your home or water boiler
    </div>
  </div>
  <div style="text-align:center;color:#334;font-size:11px;line-height:1.8;">
    <div>You receive this because you enabled price alerts on SmartPrice.be</div>
    <div>Threshold: €${threshold}/MWh · Supplier: ${supplier || "Not set"}</div>
    <div style="margin-top:8px;">© SmartPrice.be · Belgium · GDPR Compliant</div>
  </div>
</div>
</body></html>`;

  await axios.post("https://api.resend.com/emails", {
    from: FROM_EMAIL,
    to,
    subject: `⚡ Price Alert: €${currentPrice.toFixed(0)}/MWh — below your €${threshold} threshold`,
    html,
  }, {
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
  });
}

async function checkAndSendAlerts(pool) {
  console.log(`[${new Date().toISOString()}] Checking price alerts...`);
  try {
    const currentPrice = await getCurrentPrice();
    console.log(`Current price: €${currentPrice}/MWh`);

    const { rows: users } = await pool.query(`
      SELECT id, email, name,
             (preferences->>'alertThreshold')::float AS threshold,
             (preferences->>'alertEnabled')::boolean AS alerts_enabled,
             preferences->>'supplier' AS supplier,
             preferences->>'lastAlertSent' AS last_alert_sent
      FROM users
      WHERE (preferences->>'alertEnabled')::boolean = true
        AND (preferences->>'alertThreshold') IS NOT NULL
        AND COALESCE((preferences->>'email_opt_out')::boolean, false) = false
    `);

    console.log(`Found ${users.length} users with alerts enabled`);

    for (const user of users) {
      if (!user.threshold || currentPrice >= user.threshold) continue;
      if (!user.email) { console.warn(`Skipping user id=${user.id} — no email address`); continue; }
      if (user.last_alert_sent) {
        const lastSent = new Date(user.last_alert_sent);
        if (lastSent > new Date(Date.now() - 60 * 60 * 1000)) {
          console.log(`Skipping ${user.email} — already alerted this hour`);
          continue;
        }
      }
      try {
        await sendAlertEmail({ to: user.email, name: user.name, currentPrice, threshold: user.threshold, supplier: user.supplier });
        await pool.query(
          `UPDATE users SET preferences = preferences || $1::jsonb WHERE id = $2`,
          [JSON.stringify({ lastAlertSent: new Date().toISOString() }), user.id]
        );
        console.log(`✅ Alert sent to ${user.email}`);
      } catch (err) {
        console.error(`❌ Failed to send to ${user.email}:`, err.message);
      }
    }
  } catch (err) {
    console.error("Alert check failed:", err.message);
  }
}

module.exports = { checkAndSendAlerts };

// ── Gas alert email ───────────────────────────────────────────
async function sendGasAlertEmail({ to, name, currentPrice, threshold }) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#060B14;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="font-size:40px;">🔥</div>
    <div style="color:#00C896;font-size:24px;font-weight:800;">SmartPrice.be</div>
    <div style="color:#445;font-size:13px;">Belgium Gas Price Alert</div>
  </div>
  <div style="background:linear-gradient(135deg,#0A1628,#0D2040);border:1px solid #F9730644;border-radius:20px;padding:28px;margin-bottom:24px;">
    <div style="color:#778;font-size:13px;margin-bottom:8px;">🔥 GAS PRICE ALERT</div>
    <div style="color:#fff;font-size:22px;font-weight:700;margin-bottom:4px;">Hi ${name || "there"}!</div>
    <div style="color:#aaa;font-size:15px;line-height:1.6;margin-bottom:20px;">
      TTF gas price dropped below your threshold of <strong style="color:#fff">€${threshold}/MWh</strong>.
    </div>
    <div style="background:rgba(0,0,0,0.3);border-radius:14px;padding:20px;text-align:center;margin-bottom:20px;">
      <div style="color:#556;font-size:12px;">CURRENT TTF PRICE</div>
      <div style="color:#F97316;font-size:48px;font-weight:900;font-family:monospace;">€${currentPrice.toFixed(1)}</div>
      <div style="color:#556;font-size:13px;">per MWh · today's market rate</div>
    </div>
    <a href="${APP_URL}?tab=gas" style="display:block;background:linear-gradient(135deg,#F97316,#EF4444);color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:12px;font-weight:700;">
      View Gas Prices on SmartPrice.be →
    </a>
  </div>
  <div style="text-align:center;color:#334;font-size:11px;line-height:1.8;">
    <div>You receive this because you enabled gas price alerts on SmartPrice.be</div>
    <div style="margin-top:8px;">© SmartPrice.be · Belgium · GDPR Compliant</div>
  </div>
</div>
</body></html>`;

  await axios.post("https://api.resend.com/emails", {
    from: FROM_EMAIL, to,
    subject: `🔥 Gas Alert: TTF €${currentPrice.toFixed(0)}/MWh — below your €${threshold} threshold`,
    html,
  }, { headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" } });
}

async function checkAndSendGasAlerts(pool) {
  console.log(`[${new Date().toISOString()}] Checking gas price alerts...`);
  try {
    const { fetchTTFPrice } = require("./routes/gas");
    const ttf = await fetchTTFPrice();
    const currentPrice = ttf.price;
    console.log(`TTF gas price: €${currentPrice}/MWh`);

    const { rows: users } = await pool.query(`
      SELECT id, email, name,
             (preferences->>'gasAlertThreshold')::float AS threshold,
             (preferences->>'gasAlertEnabled')::boolean  AS alerts_enabled,
             preferences->>'alertEmail'                  AS alert_email,
             preferences->>'gasLastAlertSent'            AS last_alert_sent
      FROM users
      WHERE (preferences->>'gasAlertEnabled')::boolean = true
        AND (preferences->>'gasAlertThreshold') IS NOT NULL
        AND COALESCE((preferences->>'email_opt_out')::boolean, false) = false
    `);

    console.log(`Found ${users.length} users with gas alerts enabled`);

    for (const user of users) {
      if (!user.threshold || currentPrice >= user.threshold) continue;
      const emailTo = user.alert_email || user.email;
      if (!emailTo) continue;
      if (user.last_alert_sent) {
        const lastSent = new Date(user.last_alert_sent);
        // Gas is daily — don't re-alert within 6 hours
        if (lastSent > new Date(Date.now() - 6 * 60 * 60 * 1000)) continue;
      }
      try {
        await sendGasAlertEmail({ to: emailTo, name: user.name, currentPrice, threshold: user.threshold });
        await pool.query(
          `UPDATE users SET preferences = preferences || $1::jsonb WHERE id = $2`,
          [JSON.stringify({ gasLastAlertSent: new Date().toISOString() }), user.id]
        );
        console.log(`✅ Gas alert sent to ${emailTo}`);
      } catch (err) {
        console.error(`❌ Gas alert failed for ${emailTo}:`, err.message);
      }
    }
  } catch (err) {
    console.error("Gas alert check failed:", err.message);
  }
}

module.exports = { checkAndSendAlerts, checkAndSendGasAlerts };

// ── Welcome email ─────────────────────────────────────────────
async function sendWelcomeEmail(email, name) {
  if (!RESEND_API_KEY || !email) return;
  try {
    await axios.post("https://api.resend.com/emails", {
      from: "SmartPrice.be <info@smartprice.be>",
      to: email,
      subject: "🎉 Welcome to SmartPrice.be!",
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background:#060B14;font-family:'Helvetica Neue',Arial,sans-serif;">
          <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
            
            <!-- Header -->
            <div style="text-align:center;margin-bottom:32px;">
              <div style="font-size:48px;margin-bottom:12px;">🇧🇪⚡</div>
              <h1 style="margin:0;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-1px;">Welcome to SmartPrice.be!</h1>
              <p style="color:#64748B;font-size:15px;margin-top:8px;">Hey ${name}, you're in! 🎉</p>
            </div>

            <!-- Main card -->
            <div style="background:#0D1626;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:28px;margin-bottom:20px;">
              <p style="color:#E2E8F0;font-size:15px;line-height:1.7;margin:0 0 20px;">
                You now have access to everything SmartPrice has to offer — live EPEX Spot prices, supplier comparison, price alerts and more.
              </p>

              <div style="margin-bottom:16px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                  <span style="font-size:20px;">⚡</span>
                  <div>
                    <div style="color:#E2E8F0;font-weight:700;font-size:14px;">Live EPEX Spot prices</div>
                    <div style="color:#64748B;font-size:12px;">Updated every 15 minutes · hourly chart</div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                  <span style="font-size:20px;">🔌</span>
                  <div>
                    <div style="color:#E2E8F0;font-weight:700;font-size:14px;">Plan calculator</div>
                    <div style="color:#64748B;font-size:12px;">Compare all 7 Belgian suppliers with real annual costs</div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                  <span style="font-size:20px;">🔔</span>
                  <div>
                    <div style="color:#E2E8F0;font-weight:700;font-size:14px;">Price alerts</div>
                    <div style="color:#64748B;font-size:12px;">Get emailed when electricity drops below your threshold</div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                  <span style="font-size:20px;">🚗</span>
                  <div>
                    <div style="color:#E2E8F0;font-weight:700;font-size:14px;">EV charging optimizer</div>
                    <div style="color:#64748B;font-size:12px;">Best hours to charge · save up to €600/year</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- CTA -->
            <div style="text-align:center;margin-bottom:28px;">
              <a href="https://smartprice.be" style="display:inline-block;background:linear-gradient(135deg,#0D9488,#1A56A4);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:30px;letter-spacing:0.3px;">
                Go to Dashboard →
              </a>
            </div>

            <!-- Tip -->
            <div style="background:rgba(0,200,150,0.06);border:1px solid rgba(0,200,150,0.2);border-radius:14px;padding:16px 20px;margin-bottom:28px;">
              <div style="color:#00C896;font-weight:700;font-size:13px;margin-bottom:6px;">💡 Quick tip</div>
              <div style="color:#94A3B8;font-size:13px;line-height:1.6;">
                Set up a price alert in the <strong style="color:#E2E8F0;">Alerts tab</strong> to get notified when electricity prices drop below your threshold. Most Belgian households save €200–400/year by timing their usage.
              </div>
            </div>

            <!-- How did you find us -->
            <div style="background:#0D1626;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:18px 20px;margin-bottom:24px;">
              <div style="color:#94A3B8;font-size:13px;font-weight:700;margin-bottom:12px;">🙋 Quick question — how did you find SmartPrice?</div>
              <div style="display:flex;flex-wrap:wrap;gap:8px;">
                ${[
                  { label: "Facebook group", source: "facebook" },
                  { label: "Google search", source: "google" },
                  { label: "Friend / word of mouth", source: "friend" },
                  { label: "Home Assistant community", source: "homeassistant" },
                  { label: "LinkedIn", source: "linkedin" },
                  { label: "Tesla group", source: "tesla_group" },
                  { label: "Other", source: "other" },
                ].map(s => `<a href="https://smartprice.be/api/referral-source?source=${s.source}&email=${encodeURIComponent(email)}" style="display:inline-block;padding:7px 14px;border-radius:20px;font-size:12px;font-weight:600;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#94A3B8;text-decoration:none;">${s.label}</a>`).join("")}
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align:center;color:#334155;font-size:12px;line-height:1.8;">
              <div>SmartPrice.be · Belgium's real-time energy price tracker</div>
              <div>Free · No ads · GDPR compliant · Data stored in EU</div>
              <div style="margin-top:8px;">
                <a href="https://smartprice.be/privacy" style="color:#475569;text-decoration:none;">Privacy Policy</a>
                &nbsp;·&nbsp;
                <a href="mailto:info@smartprice.be" style="color:#475569;text-decoration:none;">info@smartprice.be</a>
              </div>
            </div>

          </div>
        </body>
        </html>
      `,
    }, { headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" } });
    console.log(`[welcome] Email sent to ${email}`);
  } catch (e) {
    console.error("[welcome] Failed:", e.message);
  }
}

module.exports.sendWelcomeEmail = sendWelcomeEmail;

// ── Admin notification: new user registered ────────────────────
async function sendAdminNewUserNotification(name, email, totalUsers) {
  const adminEmail = process.env.ALERT_ADMIN_EMAIL || "info@smartprice.be";
  if (!RESEND_API_KEY) return;
  const now = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, dateStyle: "medium", timeStyle: "short",
  }).format(new Date());
  try {
    await axios.post("https://api.resend.com/emails", {
      from: "SmartPrice.be <info@smartprice.be>",
      to: adminEmail,
      subject: `🎉 New user registered — ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;background:#060B14;color:#E2E8F0;padding:32px;max-width:480px;border-radius:16px;">
          <h2 style="margin:0 0 16px;color:#00C896;">🎉 New SmartPrice.be registration</h2>
          <table style="border-collapse:collapse;width:100%;">
            <tr><td style="color:#64748B;padding:6px 0;width:100px;">Name</td><td style="color:#fff;font-weight:700;">${name}</td></tr>
            <tr><td style="color:#64748B;padding:6px 0;">Email</td><td style="color:#fff;">${email || "<em>not provided</em>"}</td></tr>
            <tr><td style="color:#64748B;padding:6px 0;">Time</td><td style="color:#fff;">${now} (Brussels)</td></tr>
            <tr><td style="color:#64748B;padding:6px 0;">Total users</td><td style="color:#fff;font-weight:700;">${totalUsers}</td></tr>
          </table>
          <div style="margin-top:20px;">
            <a href="https://smartprice.be/admin" style="background:#0D9488;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;">View Admin Dashboard →</a>
          </div>
        </div>
      `,
    }, { headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" } });
    console.log(`[admin-notify] New user notification sent for ${name}`);
  } catch (e) {
    console.error("[admin-notify] Failed:", e.message);
  }
}
module.exports.sendAdminNewUserNotification = sendAdminNewUserNotification;

// ── Weekly digest email to all users ──────────────────────────
let _lastDigestDate = null; // in-memory guard — prevents duplicate sends on same day

async function sendWeeklyDigest(pool, force = false) {
  if (!RESEND_API_KEY) return;

  // Prevent sending more than once per calendar day (Brussels timezone)
  const todayBrussels = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date());
  if (!force && _lastDigestDate === todayBrussels) {
    console.log(`[weekly-digest] Already sent today (${todayBrussels}) — skipping. Use force=true to override.`);
    return;
  }
  _lastDigestDate = todayBrussels;

  try {
    // Get all registered users who haven't opted out
    const { rows: registeredUsers } = await pool.query(
      "SELECT id, name, email, NULL AS unsubscribe_token FROM users WHERE email IS NOT NULL AND email != '' AND COALESCE((preferences->>'email_opt_out')::boolean, false) = false ORDER BY created_at"
    );
    // Get active newsletter subscribers (guest opt-ins)
    let newsletterSubs = [];
    try {
      const { rows } = await pool.query(
        "SELECT id, name, email, unsubscribe_token FROM newsletter_subscribers WHERE active = true ORDER BY subscribed_at"
      );
      newsletterSubs = rows;
    } catch (_) {} // table may not exist yet on first run

    // Merge, dedup by email (registered user wins)
    const emailSeen = new Set(registeredUsers.map(u => u.email.toLowerCase()));
    const extraSubs = newsletterSubs.filter(s => !emailSeen.has(s.email.toLowerCase()));
    const users = [...registeredUsers, ...extraSubs];
    if (users.length === 0) { console.log("[weekly-digest] No recipients found"); return; }
    console.log(`[weekly-digest] Recipients: ${registeredUsers.length} registered + ${extraSubs.length} newsletter subs = ${users.length} total`);

    // Fetch last 7 days using SmartPrice's own history endpoint (has caching + fallbacks)
    let weekStats = null;
    try {
      const r = await axios.get(`${SELF_URL}/api/prices/history?days=7`, { timeout: 20000 });
      const days = r.data?.days || [];
      const allPrices = days.flatMap(d => (d.prices || d.hourly || []).map(h => h.price_eur_mwh)).filter(p => p != null && !isNaN(p));
      if (allPrices.length > 0) {
        const avg = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
        const min = Math.min(...allPrices);
        const max = Math.max(...allPrices);
        const negative = allPrices.filter(p => p < 0).length;
        weekStats = { avg: avg.toFixed(1), min: min.toFixed(1), max: max.toFixed(1), negative, total: allPrices.length };
      }
    } catch (e) {
      console.warn("[weekly-digest] Could not fetch price data:", e.message);
    }

    // Price trend label
    const avgMwh = weekStats ? parseFloat(weekStats.avg) : null;
    const trendColor = avgMwh == null ? "#64748B" : avgMwh < 50 ? "#00C896" : avgMwh < 100 ? "#84CC16" : avgMwh < 140 ? "#F59E0B" : "#EF4444";
    const trendLabel = avgMwh == null ? "—" : avgMwh < 50 ? "Very low ✅" : avgMwh < 100 ? "Below average 🟡" : avgMwh < 140 ? "Average 🟠" : "High ⚠️";

    const weekLabel = (() => {
      const d = new Date(); d.setDate(d.getDate() - 7);
      return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" }).format(d) + " – " +
             new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" }).format(new Date());
    })();

    const statsHtml = weekStats ? `
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
        <tr>
          <td style="padding:10px;background:#0D1626;border-radius:10px;text-align:center;width:25%;">
            <div style="font-size:22px;font-weight:900;color:${trendColor};">€${weekStats.avg}</div>
            <div style="font-size:11px;color:#64748B;margin-top:4px;">Avg/MWh</div>
          </td>
          <td style="width:8px;"></td>
          <td style="padding:10px;background:#0D1626;border-radius:10px;text-align:center;width:25%;">
            <div style="font-size:22px;font-weight:900;color:#00C896;">€${weekStats.min}</div>
            <div style="font-size:11px;color:#64748B;margin-top:4px;">Min/MWh</div>
          </td>
          <td style="width:8px;"></td>
          <td style="padding:10px;background:#0D1626;border-radius:10px;text-align:center;width:25%;">
            <div style="font-size:22px;font-weight:900;color:#EF4444;">€${weekStats.max}</div>
            <div style="font-size:11px;color:#64748B;margin-top:4px;">Max/MWh</div>
          </td>
          <td style="width:8px;"></td>
          <td style="padding:10px;background:#0D1626;border-radius:10px;text-align:center;width:25%;">
            <div style="font-size:22px;font-weight:900;color:#3B82F6;">${weekStats.negative}</div>
            <div style="font-size:11px;color:#64748B;margin-top:4px;">Negative hrs</div>
          </td>
        </tr>
      </table>
      <div style="background:rgba(0,200,150,0.06);border:1px solid rgba(0,200,150,0.15);border-radius:10px;padding:12px 16px;margin-top:12px;">
        <span style="color:#64748B;font-size:12px;">Week trend: </span>
        <span style="color:${trendColor};font-weight:700;font-size:13px;">${trendLabel}</span>
        ${weekStats.negative > 0 ? `<div style="color:#3B82F6;font-size:12px;margin-top:4px;">💡 ${weekStats.negative} hours with negative prices — electricity was free (or paid to consume)</div>` : ""}
      </div>` : `<div style="color:#64748B;padding:16px;text-align:center;">Price data temporarily unavailable</div>`;

    let sent = 0;
    for (const user of users) {
      // Build the correct unsubscribe URL for this recipient
      const unsubUrl = user.unsubscribe_token
        ? `${APP_URL}/api/newsletter/unsubscribe?token=${user.unsubscribe_token}`
        : `${APP_URL}/api/user/unsubscribe-digest?email=${Buffer.from(user.email).toString("base64")}`;

      try {
        await axios.post("https://api.resend.com/emails", {
          from: "SmartPrice.be <info@smartprice.be>",
          to: user.email,
          subject: `⚡ SmartPrice Wekelijks — Belgische stroomprijzen (${weekLabel})`,
          html: `
            <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
            <body style="margin:0;padding:0;background:#060B14;font-family:'Helvetica Neue',Arial,sans-serif;">
              <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

                <div style="text-align:center;margin-bottom:28px;">
                  <div style="font-size:36px;margin-bottom:10px;">⚡🇧🇪</div>
                  <h1 style="margin:0;font-size:22px;font-weight:900;color:#fff;">Belgische Stroomprijzen — Wekelijks Overzicht</h1>
                  <p style="color:#64748B;font-size:13px;margin-top:4px;">Belgium Electricity — Weekly Recap</p>
                  <p style="color:#64748B;font-size:13px;margin-top:2px;">${weekLabel}</p>
                </div>

                <div style="background:#0A1220;border:1px solid rgba(255,255,255,0.07);border-radius:18px;padding:24px;margin-bottom:20px;">
                  <div style="font-size:13px;font-weight:700;color:#94A3B8;margin-bottom:14px;text-transform:uppercase;letter-spacing:1px;">📊 Last week's EPEX Spot Belgium</div>
                  ${statsHtml}
                </div>

                <div style="background:#0A1220;border:1px solid rgba(255,255,255,0.07);border-radius:18px;padding:24px;margin-bottom:20px;">
                  <div style="font-size:13px;font-weight:700;color:#94A3B8;margin-bottom:14px;text-transform:uppercase;letter-spacing:1px;">💡 Wat betekent dit voor jou? / What this means for you</div>
                  <div style="color:#E2E8F0;font-size:14px;line-height:1.7;">
                    ${avgMwh != null && avgMwh < 80
                      ? "<strong style='color:#00C896'>🟢 Goede week voor EV opladen</strong> — Prijzen lagen ruim onder het gemiddelde van €100/MWh. Met een dynamisch contract heb je flink bespaard.<br><span style='color:#64748B;font-size:13px;'>Great week for EV charging — prices were well below the €100/MWh average. Dynamic contract holders saved significantly.</span>"
                      : avgMwh != null && avgMwh > 130
                      ? "<strong style='color:#EF4444'>🔴 Dure week</strong> — Verschuif zwaar verbruik (EV, wasmachine, vaatwasser) naar 's nachts en in het weekend wanneer prijzen typisch dalen.<br><span style='color:#64748B;font-size:13px;'>Expensive week — shift heavy usage to nights and weekends when prices typically drop.</span>"
                      : "<strong style='color:#F59E0B'>🟡 Gemiddelde week</strong> — De beste besparingen komen van EV opladen en apparaten draaien tijdens daluren (typisch 23:00–07:00).<br><span style='color:#64748B;font-size:13px;'>Typical week. Best savings from off-peak hours (typically 23:00–07:00).</span>"}
                  </div>
                </div>

                <!-- What's new section -->
                <div style="background:#0A1220;border:1px solid rgba(255,255,255,0.07);border-radius:18px;padding:24px;margin-bottom:20px;">
                  <div style="font-size:13px;font-weight:700;color:#94A3B8;margin-bottom:16px;text-transform:uppercase;letter-spacing:1px;">🆕 Nieuw deze week / What's new</div>

                  <!-- Fluvius P1 -->
                  <div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <div style="font-size:28px;flex-shrink:0;">📡</div>
                    <div>
                      <div style="font-size:14px;font-weight:800;color:#E2E8F0;margin-bottom:4px;">Fluvius P1 Slimme Meter</div>
                      <div style="font-size:13px;color:#94A3B8;line-height:1.7;margin-bottom:10px;">
                        Koppel uw P1-poort aan SmartPrice via Home Assistant. Uw EV-dashboard toont dan live stroomverbruik, zonne-export én een <strong style="color:#10B981;">oplaadsignaal</strong> — groen als de EPEX-prijs onder €0,12/kWh zit.<br>
                        <span style="color:#556B82;font-size:12px;">Connect your Fluvius P1 port via Home Assistant. Your EV dashboard shows live power, solar export, and a charge-now / wait signal.</span>
                      </div>
                      <a href="${APP_URL}/api-docs#fluvius" style="font-size:12px;color:#818CF8;text-decoration:none;font-weight:700;">Bekijk de installatie-instructies / Setup guide →</a>
                    </div>
                  </div>

                  <!-- Session Calculator -->
                  <div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <div style="font-size:28px;flex-shrink:0;">⚡</div>
                    <div>
                      <div style="font-size:14px;font-weight:800;color:#E2E8F0;margin-bottom:4px;">Sessie-calculator — Exacte EPEX-prijs per laadsessie</div>
                      <div style="font-size:13px;color:#94A3B8;line-height:1.7;margin-bottom:10px;">
                        Voer datum, uur en kWh in van een laadsessie en zie de werkelijke EPEX-prijs op dat exacte moment. Ideaal voor CIR 92-conforme thuislaadvergoedingen of om uw Velocity/DKV/UTA-factuur te controleren.<br>
                        <span style="color:#556B82;font-size:12px;">Enter date, time, and kWh for any charging session — see the real EPEX price at that exact hour. Works for home reimbursements and fleet card invoice checks.</span>
                      </div>
                      <a href="${APP_URL}/session-calc" style="font-size:12px;color:#10B981;text-decoration:none;font-weight:700;">Probeer gratis / Try free →</a>
                    </div>
                  </div>

                  <!-- Fleet Audit -->
                  <div style="display:flex;gap:14px;align-items:flex-start;">
                    <div style="font-size:28px;flex-shrink:0;">🚛</div>
                    <div>
                      <div style="font-size:14px;font-weight:800;color:#E2E8F0;margin-bottom:4px;">Vlootaudit — Nu ook voor laadpassen</div>
                      <div style="font-size:13px;color:#94A3B8;line-height:1.7;margin-bottom:10px;">
                        De gratis vlootaudit berekent nu ook de meerkosten van Velocity, DKV of UTA laadpassen ten opzichte van live EPEX-tarieven. Gemiddeld €73 besparing per wagen per maand.<br>
                        <span style="color:#556B82;font-size:12px;">The free fleet audit now also covers fleet energy cards (Velocity/DKV/UTA) vs live EPEX — average saving €73/car/month.</span>
                      </div>
                      <a href="${APP_URL}/fleet-audit" style="font-size:12px;color:#60A5FA;text-decoration:none;font-weight:700;">Gratis vlootaudit starten / Start free audit →</a>
                    </div>
                  </div>
                </div>

                <div style="text-align:center;margin-bottom:24px;">
                  <a href="${APP_URL}" style="display:inline-block;background:linear-gradient(135deg,#0D9488,#1A56A4);color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:30px;">
                    Bekijk live prijzen / See live prices →
                  </a>
                  &nbsp;
                  <a href="${APP_URL}/ev-charging-belgium" style="display:inline-block;background:rgba(255,255,255,0.06);color:#94A3B8;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:30px;border:1px solid rgba(255,255,255,0.1);">
                    EV oplaadtijden / Charging times
                  </a>
                </div>

                <!-- Business CTA -->
                <div style="background:rgba(30,64,175,0.08);border:1px solid rgba(30,64,175,0.25);border-radius:16px;padding:20px 24px;margin-bottom:20px;">
                  <div style="font-size:13px;font-weight:800;color:#60A5FA;margin-bottom:6px;">💼 Beheert u een EV-vloot? / Managing a company EV fleet?</div>
                  <div style="font-size:13px;color:#94A3B8;line-height:1.7;margin-bottom:14px;">
                    De wet (CIR 92) vereist vergoedingen op basis van werkelijke EPEX-tarieven — niet vaste CREG-gemiddelden. SmartPrice Business genereert CIR 92-conforme rapporten per laadsessie, klaar voor SD Worx, Securex en Acerta.<br>
                    <span style="color:#556B82;font-size:12px;">Belgian tax law (CIR 92) requires reimbursements at actual EPEX rates per session. SmartPrice Business automates this.</span>
                  </div>
                  <a href="${APP_URL}/business" style="display:inline-block;background:linear-gradient(135deg,#1E40AF,#1D4ED8);color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:10px 22px;border-radius:30px;">
                    Gratis vlootaudit / Free fleet audit →
                  </a>
                </div>

                <!-- Share ask -->
                <div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.25);border-radius:16px;padding:20px 24px;margin-bottom:20px;text-align:center;">
                  <div style="font-size:15px;font-weight:800;color:#F59E0B;margin-bottom:8px;">📢 Ken je iemand die dit nuttig zou vinden?</div>
                  <div style="font-size:13px;color:#94A3B8;line-height:1.7;margin-bottom:16px;">
                    SmartPrice is gratis en gemaakt voor Belgische huishoudens, EV-rijders en iedereen met een dynamisch elektriciteitscontract.<br>
                    Als dit wekelijks overzicht nuttig is, stuur het door naar een vriend of deel de link.<br>
                    <span style="color:#556B82;font-size:12px;">If this weekly recap is useful, forward it to a friend or share the link.</span>
                  </div>
                  <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
                    <a href="https://wa.me/?text=${encodeURIComponent('⚡ SmartPrice.be — free live Belgian electricity prices, cheapest EV charging hours & Tesla integration. Check it out: https://smartprice.be')}"
                       style="display:inline-block;background:rgba(37,211,102,0.12);border:1px solid rgba(37,211,102,0.3);color:#25D366;text-decoration:none;font-weight:700;font-size:13px;padding:9px 18px;border-radius:20px;">
                      💬 Share on WhatsApp
                    </a>
                    <a href="mailto:?subject=${encodeURIComponent('Free Belgian electricity price tracker')}&body=${encodeURIComponent('Hey, I thought you might find this useful — SmartPrice.be shows live EPEX electricity prices for Belgium and the cheapest hours to charge your EV. Completely free: https://smartprice.be')}"
                       style="display:inline-block;background:rgba(148,163,184,0.1);border:1px solid rgba(148,163,184,0.25);color:#94A3B8;text-decoration:none;font-weight:700;font-size:13px;padding:9px 18px;border-radius:20px;">
                      ✉ Forward by email
                    </a>
                  </div>
                </div>

                <div style="text-align:center;color:#334155;font-size:11px;line-height:1.8;">
                  <div>SmartPrice.be · Free · No ads · GDPR compliant · Data stored in EU</div>
                  <div style="margin-top:6px;">
                    <a href="https://smartprice.be/privacy" style="color:#475569;text-decoration:none;">Privacy</a>
                    &nbsp;·&nbsp;
                    <a href="${unsubUrl}" style="color:#475569;text-decoration:none;">Unsubscribe</a>
                  </div>
                </div>

              </div>
            </body></html>
          `,
        }, { headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" } });
        sent++;
        // Small delay between sends to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      } catch (e) {
        console.error(`[weekly-digest] Failed to send to ${user.email}:`, e.message);
      }
    }
    console.log(`[weekly-digest] Sent to ${sent}/${users.length} users`);
  } catch (e) {
    console.error("[weekly-digest] Fatal error:", e.message);
  }
}
module.exports.sendWeeklyDigest = sendWeeklyDigest;