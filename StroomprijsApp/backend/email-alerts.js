/**
 * email-alerts.js — Hourly price alert checker
 * Runs every hour via cron
 * Checks all users with alerts enabled and sends email if price < threshold
 */

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  family: 4,
});

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.FROM_EMAIL || "alerts@resend.dev";

// ── Fetch current Belgian price ───────────────────────────────
async function getCurrentPrice() {
  const axios = require("axios");
  const TZ = "Europe/Brussels";
  function toLocalISODate(d) {
    return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(d);
  }
  const today = toLocalISODate(new Date());
  const { data } = await axios.get(
    `https://api.energy-charts.info/price?bzn=BE&start=${today}&end=${today}`,
    { timeout: 10000 }
  );
  const now = new Date();
  const currentHourTs = data.unix_seconds.find((ts, i) => {
    const d = new Date(ts * 1000);
    return d.getHours() === now.getHours();
  });
  const idx = data.unix_seconds.indexOf(currentHourTs);
  return idx >= 0 ? data.price[idx] : data.price[data.price.length - 1];
}

// ── Send alert email via Resend ───────────────────────────────
async function sendAlertEmail({ to, name, currentPrice, threshold, supplier }) {
  const axios = require("axios");
  const priceColor = currentPrice < 0 ? "#22C55E" : currentPrice < 50 ? "#00C896" : "#F59E0B";
  const savingVsThreshold = threshold - currentPrice;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060B14;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:40px;margin-bottom:8px;">⚡</div>
      <div style="color:#00C896;font-size:24px;font-weight:800;letter-spacing:-0.5px;">StroomSlim</div>
      <div style="color:#445;font-size:13px;margin-top:4px;">Belgium Real-Time Electricity Prices</div>
    </div>

    <!-- Alert card -->
    <div style="background:linear-gradient(135deg,#0A1628,#0D2040);border:1px solid ${priceColor}44;border-radius:20px;padding:28px;margin-bottom:24px;">
      <div style="color:#778;font-size:13px;margin-bottom:8px;">⚡ PRICE ALERT</div>
      <div style="color:#fff;font-size:22px;font-weight:700;margin-bottom:4px;">Hi ${name || "there"}!</div>
      <div style="color:#aaa;font-size:15px;line-height:1.6;margin-bottom:20px;">
        The Belgian electricity price just dropped below your alert threshold of <strong style="color:#fff">€${threshold}/MWh</strong>.
      </div>
      
      <!-- Price display -->
      <div style="background:rgba(0,0,0,0.3);border-radius:14px;padding:20px;text-align:center;margin-bottom:20px;">
        <div style="color:#556;font-size:12px;margin-bottom:4px;">CURRENT PRICE</div>
        <div style="color:${priceColor};font-size:48px;font-weight:900;font-family:monospace;line-height:1;">
          €${currentPrice.toFixed(1)}
        </div>
        <div style="color:#556;font-size:13px;margin-top:4px;">per MWh · right now</div>
      </div>

      <!-- Stats row -->
      <div style="display:flex;gap:12px;margin-bottom:20px;">
        <div style="flex:1;background:rgba(0,200,150,0.1);border:1px solid rgba(0,200,150,0.2);border-radius:10px;padding:12px;text-align:center;">
          <div style="color:#556;font-size:11px;">YOUR THRESHOLD</div>
          <div style="color:#fff;font-size:18px;font-weight:700;">€${threshold}</div>
        </div>
        <div style="flex:1;background:rgba(0,200,150,0.1);border:1px solid rgba(0,200,150,0.2);border-radius:10px;padding:12px;text-align:center;">
          <div style="color:#556;font-size:11px;">SAVING VS THRESHOLD</div>
          <div style="color:#00C896;font-size:18px;font-weight:700;">€${savingVsThreshold.toFixed(1)}</div>
        </div>
      </div>

      <!-- CTA -->
      <a href="https://smart-energy-six.vercel.app" style="display:block;background:linear-gradient(135deg,#0D9488,#1A56A4);color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:12px;font-weight:700;font-size:15px;">
        View Live Prices →
      </a>
    </div>

    <!-- Tip -->
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:16px;margin-bottom:24px;">
      <div style="color:#0D9488;font-size:13px;font-weight:600;margin-bottom:6px;">💡 Now is a great time to:</div>
      <div style="color:#556;font-size:13px;line-height:1.8;">
        • Run your washing machine or dishwasher<br>
        • Charge your electric vehicle<br>
        • Heat your home or water boiler
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;color:#334;font-size:11px;line-height:1.8;">
      <div>You're receiving this because you set a price alert in StroomSlim</div>
      <div>Supplier: ${supplier || "Not set"} · Threshold: €${threshold}/MWh</div>
      <div style="margin-top:8px;">
        <a href="https://smart-energy-six.vercel.app" style="color:#445;text-decoration:none;">Open App</a>
        &nbsp;·&nbsp;
        <a href="https://smart-energy-six.vercel.app" style="color:#445;text-decoration:none;">Manage Alerts</a>
      </div>
      <div style="margin-top:8px;color:#223;">Data: EPEX Spot via Energy-Charts.info · Not financial advice</div>
    </div>

  </div>
</body>
</html>`;

  await axios.post("https://api.resend.com/emails", {
    from: FROM_EMAIL,
    to,
    subject: `⚡ Price Alert: €${currentPrice.toFixed(0)}/MWh — below your €${threshold} threshold`,
    html,
  }, {
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
  });
}

// ── Main alert checker ────────────────────────────────────────
async function checkAndSendAlerts() {
  console.log(`[${new Date().toISOString()}] Checking price alerts...`);

  try {
    const currentPrice = await getCurrentPrice();
    console.log(`Current price: €${currentPrice}/MWh`);

    // Get all users with alerts enabled and threshold set
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

      // Don't send more than once per hour
      if (user.last_alert_sent) {
        const lastSent = new Date(user.last_alert_sent);
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (lastSent > hourAgo) {
          console.log(`Skipping ${user.email} — already alerted this hour`);
          continue;
        }
      }

      try {
        await sendAlertEmail({
          to:           user.email,
          name:         user.name,
          currentPrice,
          threshold:    user.threshold,
          supplier:     user.supplier,
        });

        // Record that we sent the alert
        await pool.query(`
          UPDATE users
          SET preferences = preferences || '{"lastAlertSent":"${new Date().toISOString()}"}'::jsonb
          WHERE id = $1
        `, [user.id]);

        console.log(`✅ Alert sent to ${user.email} (€${currentPrice} < €${user.threshold})`);
      } catch (err) {
        console.error(`❌ Failed to send alert to ${user.email}:`, err.message);
      }
    }

    console.log("Alert check complete.");
  } catch (err) {
    console.error("Alert check failed:", err.message);
  }
}

// Export for use in server.js cron
module.exports = { checkAndSendAlerts };

// Run immediately if called directly
if (require.main === module) {
  checkAndSendAlerts().then(() => process.exit(0));
}