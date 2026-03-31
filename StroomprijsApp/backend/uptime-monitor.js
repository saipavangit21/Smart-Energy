/**
 * uptime-monitor.js — Ping smartprice.be every 5 min, alert on failure
 */

const axios = require("axios");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL    = process.env.ALERT_ADMIN_EMAIL || "hello@smartprice.be";
const FRONTEND_URL   = process.env.FRONTEND_URL_PROD || "https://smartprice.be";
const CHECK_INTERVAL = 5 * 60 * 1000;   // 5 minutes
const ALERT_COOLDOWN = 60 * 60 * 1000;  // 1 alert per hour max

let lastAlertSent = 0;
let consecutiveFails = 0;

async function sendDownAlert(reason) {
  if (!RESEND_API_KEY) return;
  const now = Date.now();
  if (now - lastAlertSent < ALERT_COOLDOWN) return; // cooldown
  lastAlertSent = now;

  const time = new Date().toLocaleString("en-GB", { timeZone: "Europe/Brussels" });
  try {
    await axios.post("https://api.resend.com/emails", {
      from:    "SmartPrice.be <hello@smartprice.be>",
      to:      ADMIN_EMAIL,
      subject: "🚨 SmartPrice.be is DOWN",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <h2 style="color:#ef4444;">🚨 SmartPrice.be is DOWN</h2>
          <p><strong>Time:</strong> ${time} (Brussels)</p>
          <p><strong>URL checked:</strong> ${FRONTEND_URL}</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p style="color:#888;font-size:13px;">Consecutive failures: ${consecutiveFails}<br>
          Next alert cooldown: 1 hour</p>
        </div>`,
    }, {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      timeout: 8000,
    });
    console.warn(`[Uptime] 🚨 Down alert sent to ${ADMIN_EMAIL} — ${reason}`);
  } catch (e) {
    console.error("[Uptime] Failed to send down alert:", e.message);
  }
}

async function sendRecoveryAlert() {
  if (!RESEND_API_KEY) return;
  const time = new Date().toLocaleString("en-GB", { timeZone: "Europe/Brussels" });
  try {
    await axios.post("https://api.resend.com/emails", {
      from:    "SmartPrice.be <hello@smartprice.be>",
      to:      ADMIN_EMAIL,
      subject: "✅ SmartPrice.be is back UP",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <h2 style="color:#22c55e;">✅ SmartPrice.be is back online</h2>
          <p><strong>Recovered at:</strong> ${time} (Brussels)</p>
          <p>${FRONTEND_URL} is responding normally again.</p>
        </div>`,
    }, {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      timeout: 8000,
    });
    console.log(`[Uptime] ✅ Recovery alert sent`);
  } catch (e) {
    console.error("[Uptime] Failed to send recovery alert:", e.message);
  }
}

async function pingCheck() {
  try {
    const { status } = await axios.get(FRONTEND_URL, { timeout: 10000, validateStatus: null });
    if (status >= 200 && status < 400) {
      if (consecutiveFails >= 2) {
        console.log(`[Uptime] ✅ Recovered after ${consecutiveFails} failures`);
        await sendRecoveryAlert();
      }
      consecutiveFails = 0;
    } else {
      consecutiveFails++;
      console.warn(`[Uptime] ⚠ ${FRONTEND_URL} returned HTTP ${status} (fail #${consecutiveFails})`);
      if (consecutiveFails >= 2) await sendDownAlert(`HTTP ${status}`);
    }
  } catch (err) {
    consecutiveFails++;
    console.warn(`[Uptime] ⚠ ${FRONTEND_URL} unreachable (fail #${consecutiveFails}): ${err.message}`);
    if (consecutiveFails >= 2) await sendDownAlert(err.message);
  }
}

function startUptimeMonitor() {
  console.log(`[Uptime] 🔍 Monitoring ${FRONTEND_URL} every 5 min → alerts to ${ADMIN_EMAIL}`);
  // First check after 1 min (give server time to fully start)
  setTimeout(() => {
    pingCheck();
    setInterval(pingCheck, CHECK_INTERVAL);
  }, 60 * 1000);
}

module.exports = { startUptimeMonitor };
