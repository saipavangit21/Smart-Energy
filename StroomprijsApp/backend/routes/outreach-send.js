/**
 * outreach-send.js — Admin endpoint to send B2B outreach emails via Resend
 * POST /api/admin/send-outreach
 * Header: x-admin-secret: <ADMIN_SECRET>
 */

const express   = require("express");
const axiosHttp = require("axios");
const router    = express.Router();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM           = "SmartPrice Business <info@smartprice.be>";
const ADMIN_SECRET   = process.env.ADMIN_SECRET;

// Verified contacts — leasing companies & OEM fleet teams
const PRESET_CONTACTS = [
  // ── Leasing / Fleet Management Companies ──────────────────────────────
  { to: "luc.blockx@athlon.com",                    name: "Luc",          company: "Athlon Car Lease Belgium",      lang: "nl" },
  { to: "driverdesk.belgium@athlon.com",             name: "Fleet Team",   company: "Athlon Car Lease Belgium",      lang: "nl" },
  { to: "tom.vlaminck@kbcautolease.be",              name: "Tom",          company: "KBC Autolease",                 lang: "nl" },
  { to: "julien.minne@drivalia.com",                 name: "Julien",       company: "Drivalia Lease Belgium",        lang: "fr" },
  { to: "jan.deknuydt@vanmossel.be",                 name: "Jan",          company: "Van Mossel Autolease",          lang: "nl" },
  { to: "alain.peers@bmw.be",                        name: "Alain",        company: "BMW Financial Services Belgium", lang: "nl" },
  { to: "care@lizy.be",                              name: "Sam",          company: "Lizy",                          lang: "nl" },
  { to: "peter.stockmans@financialfleetservices.eu", name: "Peter",        company: "Financial Fleet Services",      lang: "nl" },
  { to: "commercial@financialfleetservices.eu",      name: "Fleet Team",   company: "Financial Fleet Services",      lang: "nl" },
  { to: "kristof.de-backer@mhcmobility.be",         name: "Kristof",      company: "MHC Mobility Belgium",          lang: "nl" },
  // ── OEM Fleet Teams ───────────────────────────────────────────────────
  { to: "vcbfleet@volvocars.com",                    name: "Fleet Team",   company: "Volvo Car Belgium",             lang: "en" },
  { to: "fleet@vw.be",                               name: "Fleet Team",   company: "Volkswagen Belgium",            lang: "nl" },
  { to: "fleet@audi.be",                             name: "Fleet Team",   company: "Audi Belgium",                  lang: "nl" },
  { to: "steve.nys@toyota.be",                       name: "Steve",        company: "Toyota Belgium",                lang: "en" },
  { to: "fleet@toyota.be",                           name: "Fleet Team",   company: "Toyota Belgium",                lang: "nl" },
  { to: "fleet@renault.be",                          name: "Fleet Team",   company: "Renault Belgium",               lang: "fr" },
  { to: "EnterpriseBE@tesla.com",                    name: "Enterprise Team", company: "Tesla Belgium",              lang: "en" },
  { to: "corporate.sales.belux@bmw.be",              name: "Fleet Team",   company: "BMW Group Belgium",             lang: "en" },
  { to: "jf.mailleux@kia.be",                       name: "Jean-François", company: "Kia Belgium",                  lang: "fr" },
  { to: "be@ayvens.com",                             name: "Fleet Team",   company: "Ayvens Belgium",                lang: "en" },
  { to: "servicecenter@arval.be",                    name: "Fleet Team",   company: "Arval Belgium",                 lang: "en" },
  { to: "info@alphabet.be",                          name: "Fleet Team",   company: "Alphabet Belgium",              lang: "en" },
  { to: "sblanckaert@renta.be",                      name: "Stijn",        company: "RENTA",                         lang: "nl" },
  { to: "steve.vanslype@mercedes-benz.com",          name: "Steve",        company: "Mercedes-Benz Belgium",         lang: "en" },
  { to: "steven.schurmann@astara.com",               name: "Steven",       company: "Hyundai Belgium / Astara",      lang: "en" },
];

function buildHtml(name, company, lang) {
  const content = {
    nl: {
      greeting: `Dag ${name}`,
      intro: `Ik ben de oprichter van SmartPrice.be. Ik contacteer u omdat de meeste Belgische bedrijven — waarschijnlijk ook ${company} — te veel betalen voor de thuislaadvergoeding van hun EV-rijders, zonder het te weten.`,
      problemTitle: "Het probleem",
      problem: `De meeste bedrijven vergoeden thuisladen op basis van het vaste CREG-kwartaaltarief. Dat klinkt eerlijk, maar de wet (CIR 92) vereist dat de vergoeding de <strong>werkelijke kosten op het moment van laden</strong> weerspiegelt. Een vast gemiddeld tarief voldoet daar niet aan — en levert geen controleerbaar auditspoor op voor het sociaal secretariaat.`,
      solutionTitle: "Wat SmartPrice doet",
      solution: `Wij koppelen live EPEX Spot-prijzen aan de laadsessies van de medewerkers van uw klanten. Elke vergoeding is berekend op de werkelijke marktprijs — CIR 92-conform, exporteerbaar naar SD Worx, Securex, Partena of Acerta.`,
      ctaText: "Gratis vlootaudit",
      ctaDesc: "In minder dan 2 minuten berekenen wij hoeveel een wagenpark overbetaalt op het huidige CREG-tarief.",
      closing: "Met vriendelijke groet",
      unsubscribe: "Antwoord op deze e-mail om u af te melden.",
    },
    fr: {
      greeting: `Bonjour ${name}`,
      intro: `Je suis le fondateur de SmartPrice.be. Je vous contacte parce que la plupart des entreprises belges — probablement aussi ${company} — sur-paient le remboursement de recharge à domicile de leurs conducteurs VE, sans en être conscientes.`,
      problemTitle: "Le problème",
      problem: `La plupart des entreprises remboursent la recharge à domicile sur la base du tarif trimestriel fixe CREG. Cela paraît équitable, mais la loi belge (CIR 92) exige que le remboursement reflète le <strong>coût réel au moment de la recharge</strong>. Un tarif moyen fixe ne satisfait pas cette exigence — et ne fournit pas de piste d'audit vérifiable pour le secrétariat social.`,
      solutionTitle: "Ce que fait SmartPrice",
      solution: `Nous relions les prix EPEX Spot en direct aux sessions de recharge des employés de vos clients. Chaque remboursement est calculé au prix de marché réel — conforme CIR 92, exportable vers SD Worx, Securex, Partena ou Acerta.`,
      ctaText: "Audit flotte gratuit",
      ctaDesc: "En moins de 2 minutes, nous calculons combien une flotte sur-paie sur le tarif CREG actuel.",
      closing: "Cordialement",
      unsubscribe: "Répondez à cet e-mail pour vous désabonner.",
    },
    en: {
      greeting: `Hi ${name}`,
      intro: `I'm the founder of SmartPrice.be. I'm reaching out because most Belgian companies — likely ${company} too — are unknowingly overpaying for employee EV home-charging reimbursements.`,
      problemTitle: "The problem",
      problem: `Belgian companies typically reimburse home charging using the fixed quarterly CREG reference rate. It sounds fair, but Belgian tax law (CIR 92) requires reimbursements to reflect the <strong>actual cost at the moment of charging</strong>. A fixed average doesn't satisfy that requirement — and leaves no verifiable audit trail for social secretariaten.`,
      solutionTitle: "What SmartPrice does",
      solution: `We connect live EPEX Spot market prices to each employee charging session. Every reimbursement is calculated at the real market rate — CIR 92-compliant and exportable to SD Worx, Securex, Partena, or Acerta.`,
      ctaText: "Free fleet audit",
      ctaDesc: "In under 2 minutes, we calculate exactly how much a fleet is overpaying versus real EPEX market costs.",
      closing: "Best regards",
      unsubscribe: "Reply to this email to unsubscribe.",
    },
  };

  const t = content[lang] || content.en;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:580px;margin:0 auto;padding:32px 16px;">

  <!-- Header -->
  <div style="text-align:center;margin-bottom:28px;">
    <div style="display:inline-flex;align-items:center;gap:10px;background:#EFF6FF;border:1px solid rgba(30,64,175,0.15);border-radius:30px;padding:8px 20px;">
      <span style="font-size:20px;">🇧🇪</span>
      <span style="font-weight:900;font-size:18px;color:#1E3A8A;letter-spacing:-0.5px;">SmartPrice</span>
      <span style="font-size:11px;font-weight:700;color:#1E40AF;background:#DBEAFE;border-radius:20px;padding:2px 10px;">Business</span>
    </div>
  </div>

  <!-- Card -->
  <div style="background:#fff;border-radius:20px;border:1px solid rgba(0,0,0,0.07);box-shadow:0 4px 24px rgba(0,0,0,0.06);padding:36px;">

    <p style="font-size:16px;font-weight:700;color:#0F172A;margin:0 0 16px;">${t.greeting},</p>
    <p style="font-size:14px;color:#475569;line-height:1.8;margin:0 0 24px;">${t.intro}</p>

    <!-- Problem box -->
    <div style="background:rgba(220,38,38,0.04);border:1px solid rgba(220,38,38,0.15);border-radius:14px;padding:20px 24px;margin-bottom:20px;">
      <div style="font-size:11px;font-weight:800;color:#DC2626;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">❌ ${t.problemTitle}</div>
      <p style="font-size:13px;color:#475569;line-height:1.8;margin:0;">${t.problem}</p>
    </div>

    <!-- Solution box -->
    <div style="background:rgba(22,163,74,0.04);border:1px solid rgba(22,163,74,0.18);border-radius:14px;padding:20px 24px;margin-bottom:24px;">
      <div style="font-size:11px;font-weight:800;color:#16A34A;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">✅ ${t.solutionTitle}</div>
      <p style="font-size:13px;color:#475569;line-height:1.8;margin:0;">${t.solution}</p>
    </div>

    <!-- Stats row -->
    <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;">
      <div style="flex:1;min-width:120px;background:#F0FDF4;border:1px solid rgba(22,163,74,0.2);border-radius:12px;padding:14px;text-align:center;">
        <div style="font-size:22px;font-weight:900;color:#16A34A;">€300–500</div>
        <div style="font-size:11px;color:#475569;margin-top:4px;">overpayment per EV/year on CREG</div>
      </div>
      <div style="flex:1;min-width:120px;background:#FFFBEB;border:1px solid rgba(217,119,6,0.2);border-radius:12px;padding:14px;text-align:center;">
        <div style="font-size:22px;font-weight:900;color:#D97706;">CIR 92</div>
        <div style="font-size:11px;color:#475569;margin-top:4px;">Belgian tax law compliance</div>
      </div>
      <div style="flex:1;min-width:120px;background:#EFF6FF;border:1px solid rgba(30,64,175,0.15);border-radius:12px;padding:14px;text-align:center;">
        <div style="font-size:22px;font-weight:900;color:#1E40AF;">Free</div>
        <div style="font-size:11px;color:#475569;margin-top:4px;">fleet audit · no signup needed</div>
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:8px;">
      <p style="font-size:13px;color:#475569;margin:0 0 16px;">${t.ctaText} — ${t.ctaDesc}</p>
      <a href="https://smartprice.be/fleet-audit" style="display:inline-block;background:linear-gradient(135deg,#15803D,#16A34A);color:#fff;text-decoration:none;padding:14px 36px;border-radius:30px;font-weight:800;font-size:15px;box-shadow:0 6px 20px rgba(22,163,74,0.3);">
        smartprice.be/fleet-audit →
      </a>
    </div>

  </div>

  <!-- Footer -->
  <div style="text-align:center;color:#94A3B8;font-size:11px;margin-top:24px;line-height:1.8;">
    <div>SmartPrice.be · Belgium · GDPR Compliant · EU Hosted</div>
    <div style="margin-top:6px;">${t.unsubscribe}</div>
  </div>

</div>
</body></html>`;
}

function subject(company, lang) {
  if (lang === "nl") return `SmartPrice Business — CIR 92-conforme EV-vlootvergoeding voor ${company}`;
  if (lang === "fr") return `SmartPrice Business — Remboursement flotte VE conforme CIR 92 pour ${company}`;
  return `SmartPrice Business — CIR 92-compliant EV fleet reimbursement for ${company}`;
}

async function sendOne({ to, name, company, lang }) {
  const html = buildHtml(name, company, lang);
  const sub  = subject(company, lang);
  await axiosHttp.post("https://api.resend.com/emails", {
    from: FROM, to, subject: sub, html,
    reply_to: "info@smartprice.be",
    tags: [{ name: "campaign", value: "fleet_outreach_jun2026" }],
  }, {
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
  });
  return { to, company, status: "sent" };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// POST /api/admin/send-outreach
// Body: { contacts?: [...], preset?: "all", dryRun?: true }
router.post("/", async (req, res) => {
  const secret = req.headers["x-admin-secret"];
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  if (!RESEND_API_KEY) {
    return res.status(500).json({ success: false, error: "RESEND_API_KEY not configured" });
  }

  const { contacts, preset, dryRun = false } = req.body || {};
  const list = contacts || (preset === "all" ? PRESET_CONTACTS : []);

  if (!list.length) {
    return res.status(400).json({ success: false, error: "No contacts. Pass contacts[] or preset:'all'" });
  }

  if (dryRun) {
    return res.json({ success: true, dryRun: true, would_send: list.map(c => ({ to: c.to, company: c.company, lang: c.lang })) });
  }

  const sent = [], failed = [];
  for (const contact of list) {
    try {
      const result = await sendOne(contact);
      sent.push(result);
      console.log(`[outreach] ✓ sent → ${contact.to}`);
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      failed.push({ to: contact.to, company: contact.company, error: msg });
      console.error(`[outreach] ✗ failed → ${contact.to}: ${msg}`);
    }
    await sleep(600); // 600ms between sends — stays well within Resend rate limits
  }

  res.json({ success: true, total: list.length, sent: sent.length, failed: failed.length, results: { sent, failed } });
});

module.exports = router;
