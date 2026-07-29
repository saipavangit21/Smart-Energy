/**
 * daily-posts.js — Generate daily social media posts from live EPEX prices
 * and email them to info@smartprice.be via Resend.
 * POST /api/admin/daily-posts  (x-admin-secret required)
 */

const express   = require("express");
const axiosHttp = require("axios");
const router    = express.Router();

const { sendMail }     = require("../mailer");
const pool              = require("../db").pool;
const ADMIN_SECRET     = process.env.ADMIN_SECRET;
const TELEGRAM_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const FB_PAGE_ID       = process.env.FACEBOOK_PAGE_ID;
const FB_PAGE_TOKEN    = process.env.FACEBOOK_PAGE_TOKEN;
const SELF_URL         = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : "https://smart-energy-production-aef3.up.railway.app";

async function sendTelegram(text) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  await axiosHttp.post(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
    { chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true },
    { timeout: 8000 }
  ).catch(e => console.warn("[daily-posts] Telegram send failed:", e.message));
}

async function postToFacebook(message) {
  if (!FB_PAGE_ID || !FB_PAGE_TOKEN) return { skipped: true };
  try {
    const r = await axiosHttp.post(
      `https://graph.facebook.com/${FB_PAGE_ID}/feed`,
      { message, access_token: FB_PAGE_TOKEN },
      { timeout: 12000 }
    );
    console.log("[daily-posts] Facebook posted:", r.data.id);
    return { ok: true, post_id: r.data.id };
  } catch (e) {
    const msg = e.response?.data?.error?.message || e.message;
    console.error("[daily-posts] Facebook post failed:", msg);
    return { ok: false, error: msg };
  }
}

async function deleteFacebookPost(postId) {
  if (!FB_PAGE_TOKEN) return { skipped: true };
  try {
    const r = await axiosHttp.delete(
      `https://graph.facebook.com/${postId}`,
      { params: { access_token: FB_PAGE_TOKEN }, timeout: 12000 }
    );
    console.log("[daily-posts] Facebook post deleted:", postId, r.data);
    return { ok: true, post_id: postId, deleted: true };
  } catch (e) {
    const msg = e.response?.data?.error?.message || e.message;
    console.error("[daily-posts] Facebook delete failed:", msg);
    return { ok: false, error: msg };
  }
}

async function editFacebookPost(postId, message) {
  if (!FB_PAGE_TOKEN) return { skipped: true };
  try {
    const r = await axiosHttp.post(
      `https://graph.facebook.com/${postId}`,
      { message, access_token: FB_PAGE_TOKEN },
      { timeout: 12000 }
    );
    console.log("[daily-posts] Facebook post edited:", postId, r.data);
    return { ok: true, post_id: postId };
  } catch (e) {
    const msg = e.response?.data?.error?.message || e.message;
    console.error("[daily-posts] Facebook edit failed:", msg);
    return { ok: false, error: msg };
  }
}

function fmt(mwh) {
  return (mwh / 1000).toFixed(4); // MWh → kWh
}
function fmtMwh(mwh) {
  return Math.round(mwh);
}
function label(mwh) {
  if (mwh < 0)   return "🟣 NEGATIEF";
  if (mwh < 50)  return "🟢 HEEL GOEDKOOP";
  if (mwh < 100) return "🟢 GOEDKOOP";
  if (mwh < 150) return "🟡 GEMIDDELD";
  if (mwh < 250) return "🟠 DUUR";
  return "🔴 PIEKPRIJS";
}
function labelEn(mwh) {
  if (mwh < 0)   return "🟣 NEGATIVE";
  if (mwh < 50)  return "🟢 VERY CHEAP";
  if (mwh < 100) return "🟢 CHEAP";
  if (mwh < 150) return "🟡 AVERAGE";
  if (mwh < 250) return "🟠 EXPENSIVE";
  return "🔴 PEAK";
}

function buildEmail(current, cheapest, dateStr) {
  const curPrice  = current?.price_eur_mwh ?? 0;
  const curHour   = current?.hour ?? new Date().getHours();
  const top5      = (cheapest || []).slice(0, 5);

  // ── Dutch Facebook post ───────────────────────────────────────────────
  const nlLines = top5.map(h =>
    `  ${String(h.hour).padStart(2, "0")}:00–${String(h.hour + 1).padStart(2, "0")}:00  →  €${fmtMwh(h.price_eur_mwh)}/MWh  (€${fmt(h.price_eur_mwh)}/kWh)  ${label(h.price_eur_mwh)}`
  ).join("\n");

  const nlPost = `🔋 Goedkoopste laaduren vandaag in België (${dateStr})

${nlLines}

⚡ Nu (${String(curHour).padStart(2,"0")}:00): €${fmtMwh(curPrice)}/MWh — ${label(curPrice)}

Heeft u een EV, warmtepomp of vaatwasser? Plan uw verbruik tijdens deze uren en bespaar tot 80% op uw energiekost. De prijzen worden elke 15 minuten bijgewerkt.

➡️ Live prijzen + gratis laadplanner: smartprice.be

#elektriciteit #energiebesparing #EVrijden #België #EPEX #goedkoopstroom #warmtepomp`;

  // ── English Reddit / EV groups post ──────────────────────────────────
  const enLines = top5.map(h =>
    `  ${String(h.hour).padStart(2, "0")}:00 → €${fmtMwh(h.price_eur_mwh)}/MWh (€${fmt(h.price_eur_mwh)}/kWh) ${labelEn(h.price_eur_mwh)}`
  ).join("\n");

  const enPost = `⚡ Belgium EPEX electricity — cheapest hours today (${dateStr})

${enLines}

Current price (${String(curHour).padStart(2,"0")}:00): €${fmtMwh(curPrice)}/MWh — ${labelEn(curPrice)}

Prices swing up to 8× within the same day. If you have a dynamic tariff (Bolt, Eneco, Megacharge), charging or running heavy appliances in these windows can cut your energy cost significantly.

Free live tracker + smart charge planner → smartprice.be

No account needed. Updates every 15 min.`;

  // ── Email HTML ────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0B0F1A;font-family:'Segoe UI',monospace,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">

  <div style="text-align:center;margin-bottom:24px;">
    <div style="color:#00C896;font-size:22px;font-weight:900;">⚡ SmartPrice — Daily Posts</div>
    <div style="color:#445;font-size:13px;">${dateStr} · Copy → paste into groups</div>
  </div>

  <!-- Dutch post -->
  <div style="background:#0D1626;border:1px solid rgba(0,200,150,0.2);border-radius:16px;padding:24px;margin-bottom:20px;">
    <div style="font-size:11px;font-weight:800;color:#00C896;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">
      🇳🇱 DUTCH — Facebook groups (EV rijders / Energie besparen / algemeen)
    </div>
    <pre style="font-size:13px;color:#C8D8E8;line-height:1.8;white-space:pre-wrap;margin:0;font-family:'Segoe UI',sans-serif;">${nlPost}</pre>
  </div>

  <!-- English post -->
  <div style="background:#0D1626;border:1px solid rgba(59,130,246,0.2);border-radius:16px;padding:24px;margin-bottom:20px;">
    <div style="font-size:11px;font-weight:800;color:#3B82F6;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">
      🇬🇧 ENGLISH — Reddit (r/belgium / r/electricvehicles / r/homeassistant) + EV FB groups
    </div>
    <pre style="font-size:13px;color:#C8D8E8;line-height:1.8;white-space:pre-wrap;margin:0;font-family:'Segoe UI',sans-serif;">${enPost}</pre>
  </div>

  <!-- Tip -->
  <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:16px;text-align:center;">
    <div style="color:#334;font-size:12px;line-height:1.8;">
      💡 <strong style="color:#556;">Tip:</strong> Post the Dutch version in 2–3 different FB groups (space them 1h apart).<br>
      Post the English version on Reddit between 07:00–09:00 for best engagement.<br>
      Always put the link in the <strong>first comment</strong> in groups that ban links in posts.
    </div>
  </div>

  <div style="text-align:center;color:#223;font-size:11px;margin-top:20px;">SmartPrice.be · Auto-generated daily at 08:00 Brussels time</div>
</div>
</body></html>`;

  return { nlPost, enPost, html };
}

// Generates the daily posts, emails/telegrams them, and auto-posts to the FB
// Page. Callable directly (in-process, e.g. from the hourly scheduler in
// server.js) or via the HTTP route below — kept as a plain function so the
// scheduler doesn't have to round-trip an HTTP request to itself to run it.
async function runDailyPost(pool, { force = false } = {}) {
  // Prevent re-posting the same day (Brussels calendar day), persisted in the DB
  // so it survives redeploys — an in-memory flag alone resets on every restart.
  const todayBrussels = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Brussels" }).format(new Date());
  if (!force) {
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, value TEXT)`);
      const { rows } = await pool.query(`SELECT value FROM app_state WHERE key = 'daily_post_last_sent'`);
      if (rows[0]?.value === todayBrussels) {
        console.log(`[daily-posts] Already posted today (${todayBrussels}) — skipping. Use force:true to override.`);
        return { success: true, skipped: true, reason: "already_sent_today" };
      }
      await pool.query(
        `INSERT INTO app_state (key, value) VALUES ('daily_post_last_sent', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [todayBrussels]
      );
    } catch (e) {
      console.warn("[daily-posts] Dedup guard check failed, continuing anyway:", e.message);
    }
  }

  // Fetch current price + cheapest hours from our own endpoints
  const [curRes, cheapRes] = await Promise.all([
    axiosHttp.get(`${SELF_URL}/api/current`, { timeout: 10000 }).catch(() => null),
    axiosHttp.get(`${SELF_URL}/api/cheapest?hours=8`, { timeout: 10000 }).catch(() => null),
  ]);

  const current  = curRes?.data?.current  || null;
  const rawCheapest = cheapRes?.data?.cheapest_hours || cheapRes?.data?.cheapest || [];
  // Deduplicate to one entry per hour (cheapest slot wins)
  const seen = new Set();
  const cheapest = rawCheapest.filter(h => {
    if (seen.has(h.hour)) return false;
    seen.add(h.hour);
    return true;
  });

  const now     = new Date();
  const dateStr = new Intl.DateTimeFormat("nl-BE", {
    timeZone: "Europe/Brussels", day: "numeric", month: "long", year: "numeric",
  }).format(now);

  const { nlPost, enPost, html } = buildEmail(current, cheapest, dateStr);

  await sendMail({
    from:    "SmartPrice Posts <info@smartprice.be>",
    to:      "info@smartprice.be",
    subject: `📋 Daily posts ready — ${dateStr}`,
    html,
  });

  // Send Telegram notification with ready-to-paste NL post
  const top5 = cheapest.slice(0, 5);
  const cheapLines = top5.map(h =>
    `${String(h.hour).padStart(2,"0")}:00 → €${Math.round(h.price_eur_mwh)}/MWh`
  ).join("\n");
  const curHour = current?.hour ?? new Date().getHours();
  const curPrice = current?.price_eur_mwh ?? 0;
  const tgMsg = [
    `⚡ <b>SmartPrice — posts klaar voor ${dateStr}</b>`,
    ``,
    `Nu (${String(curHour).padStart(2,"0")}:00): <b>€${Math.round(curPrice)}/MWh</b>${curPrice < 0 ? " 🟣 NEGATIEF!" : ""}`,
    ``,
    `Goedkoopste uren vandaag:`,
    cheapLines,
    ``,
    `📋 <b>Kopieer &amp; plak NL post:</b>`,
    `<code>${nlPost.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</code>`,
    ``,
    `🔗 <a href="https://www.facebook.com">Facebook</a> · <a href="https://www.reddit.com/r/belgium">Reddit r/belgium</a> · <a href="https://www.linkedin.com">LinkedIn</a>`,
  ].join("\n");

  await sendTelegram(tgMsg);

  // Auto-post Dutch content to Facebook Page
  const fbResult = await postToFacebook(nlPost);

  return { success: true, date: dateStr, nlPost, enPost, telegram: !!TELEGRAM_TOKEN, facebook: fbResult };
}

router.post("/", async (req, res) => {
  const secret = req.headers["x-admin-secret"];
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  // Delete a specific post
  if (req.body?.deletePostId) {
    const fbResult = await deleteFacebookPost(req.body.deletePostId);
    return res.json({ success: true, custom: true, facebook: fbResult });
  }

  // Custom one-off post (e.g. a holiday greeting) — bypasses the price-data post
  if (req.body?.message) {
    const fbResult = req.body.editPostId
      ? await editFacebookPost(req.body.editPostId, req.body.message)
      : await postToFacebook(req.body.message);
    return res.json({ success: true, custom: true, facebook: fbResult });
  }

  try {
    const result = await runDailyPost(pool, { force: !!req.body?.force });
    res.json(result);
  } catch (e) {
    console.error("[daily-posts] error:", e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
module.exports.runDailyPost = runDailyPost;
