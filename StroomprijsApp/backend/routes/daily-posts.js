/**
 * daily-posts.js — Generate daily social media posts from live EPEX prices
 * and email them to info@smartprice.be via Resend.
 * POST /api/admin/daily-posts  (x-admin-secret required)
 */

const express   = require("express");
const axiosHttp = require("axios");
const router    = express.Router();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_SECRET   = process.env.ADMIN_SECRET;
const SELF_URL       = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : "https://smart-energy-production-aef3.up.railway.app";

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

router.post("/", async (req, res) => {
  const secret = req.headers["x-admin-secret"];
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  if (!RESEND_API_KEY) {
    return res.status(500).json({ success: false, error: "RESEND_API_KEY not configured" });
  }

  try {
    // Fetch current price + cheapest hours from our own endpoints
    const [curRes, cheapRes] = await Promise.all([
      axiosHttp.get(`${SELF_URL}/api/current`, { timeout: 10000 }).catch(() => null),
      axiosHttp.get(`${SELF_URL}/api/cheapest?hours=8`, { timeout: 10000 }).catch(() => null),
    ]);

    const current  = curRes?.data?.current  || null;
    const cheapest = cheapRes?.data?.cheapest || [];

    const now     = new Date();
    const dateStr = new Intl.DateTimeFormat("nl-BE", {
      timeZone: "Europe/Brussels", day: "numeric", month: "long", year: "numeric",
    }).format(now);

    const { nlPost, enPost, html } = buildEmail(current, cheapest, dateStr);

    // Send via Resend
    await axiosHttp.post("https://api.resend.com/emails", {
      from: "SmartPrice Posts <info@smartprice.be>",
      to:   "info@smartprice.be",
      subject: `📋 Daily posts ready — ${dateStr}`,
      html,
      tags: [{ name: "type", value: "daily_social_posts" }],
    }, {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    });

    res.json({ success: true, date: dateStr, nlPost, enPost });

  } catch (e) {
    console.error("[daily-posts] error:", e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
