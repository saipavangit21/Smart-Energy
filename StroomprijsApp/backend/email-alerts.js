/**
 * email-alerts.js — Hourly price alert checker
 */

const axios = require("axios");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.FROM_EMAIL || "onboarding@resend.dev";
const APP_URL        = process.env.FRONTEND_URL || "https://smart-energy-six.vercel.app";

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
    <div style="color:#00C896;font-size:24px;font-weight:800;">StroomSlim</div>
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
        <div style="color:#556;font-size:11px;">SAVING</div>
        <div style="color:#00C896;font-size:18px;font-weight:700;">€${saving}</div>
      </div>
    </div>
    <a href="${APP_URL}" style="display:block;background:linear-gradient(135deg,#0D9488,#1A56A4);color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:12px;font-weight:700;">
      View Live Prices →
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
    <div>You receive this because you enabled price alerts in StroomSlim</div>
    <div>Threshold: €${threshold}/MWh · Supplier: ${supplier || "Not set"}</div>
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
             (preferences->>'alertsEnabled')::boolean AS alerts_enabled,
             preferences->>'supplier' AS supplier,
             preferences->>'lastAlertSent' AS last_alert_sent
      FROM users
      WHERE (preferences->>'alertsEnabled')::boolean = true
        AND (preferences->>'alertThreshold') IS NOT NULL
    `);

    console.log(`Found ${users.length} users with alerts enabled`);

    for (const user of users) {
      if (!user.threshold || currentPrice >= user.threshold) continue;
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