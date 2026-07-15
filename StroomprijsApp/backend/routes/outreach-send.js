/**
 * outreach-send.js — Admin endpoint to send B2B outreach emails via SMTP
 * POST /api/admin/send-outreach
 * Header: x-admin-secret: <ADMIN_SECRET>
 */

const express        = require("express");
const router         = express.Router();
const { sendMail }   = require("../mailer");

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
  // steve.vanslype@mercedes-benz.com — unsubscribed 2026-07-01
  { to: "steven.schurmann@astara.com",               name: "Steven",       company: "Hyundai Belgium / Astara",      lang: "en" },
];

// ── Social Secretariats + Fleet Software — API integration pitch ──────────
const SECRETARIAT_CONTACTS = [
  { to: "mobility@sdworx.be",          name: "Mobility Team",    company: "SD Worx",                        lang: "nl", type: "secretariat" },
  { to: "info@acerta.be",              name: "Solutions Team",   company: "Acerta",                         lang: "nl", type: "secretariat" },
  { to: "fleet@securex.be",            name: "Fleet Team",       company: "Securex",                        lang: "nl", type: "secretariat" },
  { to: "info@liantis.be",             name: "HR Team",          company: "Liantis",                        lang: "nl", type: "secretariat" },
  { to: "info@partena.be",             name: "Mobility Team",    company: "Partena Professional",           lang: "fr", type: "secretariat" },
  { to: "info@group-s.be",             name: "HR Team",          company: "Group S",                        lang: "fr", type: "secretariat" },
  { to: "info@xerius.be",              name: "Fleet Team",       company: "Xerius",                         lang: "nl", type: "secretariat" },
  { to: "info@ucm.be",                 name: "HR Team",          company: "UCM",                            lang: "fr", type: "secretariat" },
  // Fleet management software — same API integration pitch
  { to: "info@sofico.com",             name: "Partnerships Team",company: "Sofico",                         lang: "nl", type: "secretariat" },
  { to: "info.be@webfleet.com",        name: "Fleet Team",       company: "Webfleet Solutions Belgium",     lang: "en", type: "secretariat" },
  { to: "belgium@geotab.com",          name: "Fleet Team",       company: "Geotab Belgium",                 lang: "en", type: "secretariat" },
];

// ── Expanded fleet — new OEMs + leasing + fleet card (CIR 92 audit pitch) ─
const EXPANDED_FLEET_CONTACTS = [
  { to: "fleet.belgium@ford.com",       name: "Fleet Team", company: "Ford Belgium",          lang: "nl", type: "expanded_fleet" },
  { to: "fleet@peugeot.be",             name: "Fleet Team", company: "Peugeot Belgium",       lang: "fr", type: "expanded_fleet" },
  { to: "fleet@citroen.be",             name: "Fleet Team", company: "Citroën Belgium",       lang: "fr", type: "expanded_fleet" },
  { to: "fleet@opel.be",                name: "Fleet Team", company: "Opel Belgium",          lang: "nl", type: "expanded_fleet" },
  { to: "fleet@skoda.be",               name: "Fleet Team", company: "Skoda Belgium",         lang: "nl", type: "expanded_fleet" },
  { to: "fleet@seat.be",                name: "Fleet Team", company: "SEAT/Cupra Belgium",    lang: "nl", type: "expanded_fleet" },
  { to: "fleet.be@polestar.com",        name: "Fleet Team", company: "Polestar Belgium",      lang: "en", type: "expanded_fleet" },
  { to: "fleet@nissan.be",              name: "Fleet Team", company: "Nissan Belgium",        lang: "en", type: "expanded_fleet" },
  { to: "fleet@byd-europe.com",         name: "Fleet Team", company: "BYD Europe Belgium",    lang: "en", type: "expanded_fleet" },
  { to: "lease@belfius.be",             name: "Fleet Team", company: "Belfius Lease",         lang: "nl", type: "expanded_fleet" },
  { to: "fleet@free2move.com",          name: "Fleet Team", company: "Free2Move Lease",       lang: "fr", type: "expanded_fleet" },
  { to: "be@dkv-mobility.com",          name: "Fleet Team", company: "DKV Mobility Belgium",  lang: "nl", type: "expanded_fleet" },
  { to: "belgium@uta.com",              name: "Fleet Team", company: "UTA Belgium",           lang: "nl", type: "expanded_fleet" },
  { to: "fleet.belgium@wexeurope.com",  name: "Fleet Team", company: "WEX Europe Belgium",    lang: "nl", type: "expanded_fleet" },
];

function buildHtml(name, company, lang) {
  const t = {
    nl: {
      p1: `Ik ben Sai, oprichter van SmartPrice.be. Korte vraag voor u.`,
      p2: `De meeste Belgische bedrijven vergoeden thuisladen op basis van het vaste CREG-kwartaaltarief — momenteel rond €0,24/kWh. Dat klinkt eerlijk, maar de Belgische elektriciteitsprijs schommelt van €0,04 tot €0,48/kWh binnen dezelfde dag. Sommige medewerkers ontvangen daardoor meer terug dan ze betaald hebben, anderen minder.`,
      p3: `Fiscaal-juridisch vereist CIR 92 dat de vergoeding de werkelijke kost op het laadmoment weerspiegelt. Een vast gemiddelde voldoet daar niet aan — en het fiscale risico ligt bij de werkgever.`,
      p4: `Wij bouwden een gratis vlootaudit op <a href="https://smartprice.be/fleet-audit" style="color:#15803D;">smartprice.be/fleet-audit</a> die in 2 minuten toont hoeveel het wagenpark van ${company} waarschijnlijk overbetaalt. Geen account nodig.`,
      ask: `Is dat het bekijken waard?`,
      sig: `Sai`,
      unsub: `Antwoord op deze e-mail om u af te melden.`,
    },
    fr: {
      p1: `Je suis Sai, fondateur de SmartPrice.be. Une courte question pour vous.`,
      p2: `La plupart des entreprises belges remboursent la recharge à domicile sur la base du tarif trimestriel CREG fixe — actuellement environ €0,24/kWh. Cela paraît équitable, mais le prix de l'électricité en Belgique varie de €0,04 à €0,48/kWh dans la même journée. Certains employés reçoivent donc plus que ce qu'ils ont réellement payé, d'autres moins.`,
      p3: `Sur le plan fiscal, la loi belge (CIR 92) exige que le remboursement reflète le coût réel au moment de la recharge. Un tarif moyen fixe ne satisfait pas cette exigence — et le risque fiscal repose sur l'employeur.`,
      p4: `Nous avons créé un audit gratuit sur <a href="https://smartprice.be/fleet-audit" style="color:#15803D;">smartprice.be/fleet-audit</a> qui montre en 2 minutes combien la flotte de ${company} sur-paie probablement. Sans inscription.`,
      ask: `Cela vaut-il le coup d'œil ?`,
      sig: `Sai`,
      unsub: `Répondez à cet e-mail pour vous désabonner.`,
    },
    en: {
      p1: `I'm Sai, founder of SmartPrice.be. One quick question for you.`,
      p2: `Most Belgian companies reimburse employee EV home-charging using the fixed CREG quarterly rate — currently around €0.24/kWh. That sounds fair, but Belgium's actual electricity price swings from €0.04 to €0.48/kWh within the same day. That means some employees get reimbursed more than they paid, others less.`,
      p3: `Belgian tax law (CIR 92) requires reimbursements to reflect the actual cost at the moment of charging. A fixed average doesn't satisfy that — and the fiscal risk sits with the employer.`,
      p4: `We built a free fleet audit at <a href="https://smartprice.be/fleet-audit" style="color:#15803D;">smartprice.be/fleet-audit</a> that shows in 2 minutes how much ${company}'s fleet is likely overpaying. No account needed.`,
      ask: `Worth a look?`,
      sig: `Sai`,
      unsub: `Reply to unsubscribe.`,
    },
  };

  const c = t[lang] || t.en;
  const greeting = lang === "nl" ? `Dag ${name}` : lang === "fr" ? `Bonjour ${name}` : `Hi ${name}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;">
<div style="max-width:560px;margin:0 auto;padding:40px 28px;">

  <p style="font-size:15px;line-height:1.7;margin:0 0 22px;">${greeting},</p>

  <p style="font-size:15px;line-height:1.7;margin:0 0 18px;">${c.p1}</p>

  <p style="font-size:15px;line-height:1.7;margin:0 0 18px;">${c.p2}</p>

  <p style="font-size:15px;line-height:1.7;margin:0 0 18px;">${c.p3}</p>

  <p style="font-size:15px;line-height:1.7;margin:0 0 22px;">${c.p4}</p>

  <p style="font-size:15px;line-height:1.7;margin:0 0 32px;">${c.ask}</p>

  <p style="font-size:15px;line-height:1.8;margin:0 0 40px;">${c.sig}<br>
  <span style="color:#555;">SmartPrice.be</span><br>
  <a href="mailto:info@smartprice.be" style="color:#555;text-decoration:none;">info@smartprice.be</a>
  </p>

  <hr style="border:none;border-top:1px solid #e5e5e5;margin:0 0 16px;">
  <p style="font-size:11px;color:#aaa;margin:0;">${c.unsub}</p>

</div>
</body></html>`;
}

function subject(company, lang, followUp = false, finalTouch = false) {
  if (finalTouch) {
    if (lang === "nl") return `SmartPrice & ${company} — afsluiting`;
    if (lang === "fr") return `SmartPrice & ${company} — dernier message`;
    return `SmartPrice & ${company} — closing the loop`;
  }
  if (followUp) {
    if (lang === "nl") return `Re: SmartPrice Business — bereikte dit de juiste persoon bij ${company}?`;
    if (lang === "fr") return `Re: SmartPrice Business — ce message est-il parvenu à la bonne personne chez ${company} ?`;
    return `Re: SmartPrice Business — did this reach the right person at ${company}?`;
  }
  if (lang === "nl") return `SmartPrice Business — CIR 92-conforme EV-vlootvergoeding voor ${company}`;
  if (lang === "fr") return `SmartPrice Business — Remboursement flotte VE conforme CIR 92 pour ${company}`;
  return `SmartPrice Business — CIR 92-compliant EV fleet reimbursement for ${company}`;
}

function buildFinalTouchHtml(name, company, lang) {
  const t = {
    nl: {
      greeting: `Dag ${name}`,
      line1: `Ik stuur u nog één kort bericht voor ik mijn outreach naar ${company} afsluit.`,
      line2: `Als CIR 92-conforme EV-laadvergoedingen ooit relevant worden — de gratis vlootaudit staat op elk moment beschikbaar op <a href="https://smartprice.be/fleet-audit" style="color:#16A34A;font-weight:700;">smartprice.be/fleet-audit</a>. Twee minuten, geen account nodig.`,
      line3: `Als het moment niet juist is of dit niet uw domein is, geen probleem. Bedankt voor uw tijd.`,
      closing: "Met vriendelijke groet",
    },
    fr: {
      greeting: `Bonjour ${name}`,
      line1: `Je vous envoie un dernier message avant de clôturer mes démarches auprès de ${company}.`,
      line2: `Si les remboursements de recharge VE conformes CIR 92 deviennent un jour pertinents, l'audit gratuit reste disponible à tout moment sur <a href="https://smartprice.be/fleet-audit" style="color:#16A34A;font-weight:700;">smartprice.be/fleet-audit</a> — 2 minutes, sans inscription.`,
      line3: `Si le moment n'est pas opportun ou si ce n'est pas votre domaine, pas de souci. Merci pour votre temps.`,
      closing: "Cordialement",
    },
    en: {
      greeting: `Hi ${name}`,
      line1: `One last note before I close out my outreach to ${company}.`,
      line2: `If CIR 92-compliant EV fleet reimbursements ever become relevant, the free audit is available any time at <a href="https://smartprice.be/fleet-audit" style="color:#16A34A;font-weight:700;">smartprice.be/fleet-audit</a> — 2 minutes, no account needed.`,
      line3: `If the timing's off or this isn't your area, no worries at all — I appreciate your time.`,
      closing: "Best regards",
    },
  };
  const c = t[lang] || t.en;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:32px 16px;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="display:inline-flex;align-items:center;gap:10px;background:#EFF6FF;border:1px solid rgba(30,64,175,0.15);border-radius:30px;padding:8px 20px;">
      <span style="font-size:18px;">🇧🇪</span>
      <span style="font-weight:900;font-size:16px;color:#1E3A8A;">SmartPrice</span>
      <span style="font-size:11px;font-weight:700;color:#1E40AF;background:#DBEAFE;border-radius:20px;padding:2px 10px;">Business</span>
    </div>
  </div>
  <div style="background:#fff;border-radius:20px;border:1px solid rgba(0,0,0,0.07);box-shadow:0 4px 24px rgba(0,0,0,0.06);padding:32px 36px;">
    <p style="font-size:16px;font-weight:700;color:#0F172A;margin:0 0 16px;">${c.greeting},</p>
    <p style="font-size:14px;color:#475569;line-height:1.8;margin:0 0 14px;">${c.line1}</p>
    <p style="font-size:14px;color:#475569;line-height:1.8;margin:0 0 20px;">${c.line2}</p>
    <p style="font-size:13px;color:#94A3B8;line-height:1.7;margin:0 0 20px;">${c.line3}</p>
    <p style="font-size:14px;color:#475569;margin:0;">${c.closing},<br><strong style="color:#0F172A;">SmartPrice Business</strong><br><span style="color:#94A3B8;font-size:13px;">info@smartprice.be · smartprice.be</span></p>
  </div>
  <div style="text-align:center;color:#94A3B8;font-size:11px;margin-top:20px;">SmartPrice.be · Belgium · GDPR Compliant · Reply to unsubscribe.</div>
</div>
</body></html>`;
}

function buildFollowUpHtml(name, company, lang) {
  const t = {
    nl: {
      greeting: `Dag ${name}`,
      line1: `Ik stuurde u vorige week een bericht over CIR 92-conforme EV-laadvergoedingen voor uw vloot bij ${company}. Ik wilde even controleren of dit bij de juiste persoon is terechtgekomen.`,
      line2: `Als u interesse heeft om te zien hoeveel uw vloot overbetaalt op het huidige CREG-tarief, staat de gratis audit in 2 minuten klaar — geen account, geen installatie.`,
      cta: "Gratis vlootaudit →",
      line3: `Anders verwijs ik u graag door naar de juiste collega. Geef gewoon even aan wie dat is.`,
      closing: "Met vriendelijke groet",
    },
    fr: {
      greeting: `Bonjour ${name}`,
      line1: `Je vous ai envoyé un message la semaine dernière concernant les remboursements de recharge VE conformes CIR 92 pour la flotte de ${company}. Je voulais juste vérifier si ce message est bien parvenu à la bonne personne.`,
      line2: `Si vous souhaitez voir combien votre flotte sur-paie sur le tarif CREG actuel, l'audit gratuit est prêt en 2 minutes — sans compte ni installation.`,
      cta: "Audit flotte gratuit →",
      line3: `Sinon, n'hésitez pas à me rediriger vers le bon collègue.`,
      closing: "Cordialement",
    },
    en: {
      greeting: `Hi ${name}`,
      line1: `I sent you a note last week about CIR 92-compliant EV fleet reimbursements for ${company}. Just checking this reached the right person.`,
      line2: `If you'd like to see exactly how much your fleet is overpaying on the current CREG rate, the free audit takes 2 minutes — no account or installation needed.`,
      cta: "Free fleet audit →",
      line3: `If this isn't your area, happy to be pointed to the right colleague.`,
      closing: "Best regards",
    },
  };
  const c = t[lang] || t.en;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="display:inline-flex;align-items:center;gap:10px;background:#EFF6FF;border:1px solid rgba(30,64,175,0.15);border-radius:30px;padding:8px 20px;">
      <span style="font-size:18px;">🇧🇪</span>
      <span style="font-weight:900;font-size:16px;color:#1E3A8A;">SmartPrice</span>
      <span style="font-size:11px;font-weight:700;color:#1E40AF;background:#DBEAFE;border-radius:20px;padding:2px 10px;">Business</span>
    </div>
  </div>
  <div style="background:#fff;border-radius:20px;border:1px solid rgba(0,0,0,0.07);box-shadow:0 4px 24px rgba(0,0,0,0.06);padding:32px 36px;">
    <p style="font-size:16px;font-weight:700;color:#0F172A;margin:0 0 16px;">${c.greeting},</p>
    <p style="font-size:14px;color:#475569;line-height:1.8;margin:0 0 16px;">${c.line1}</p>
    <p style="font-size:14px;color:#475569;line-height:1.8;margin:0 0 24px;">${c.line2}</p>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="https://smartprice.be/fleet-audit" style="display:inline-block;background:linear-gradient(135deg,#15803D,#16A34A);color:#fff;text-decoration:none;padding:13px 32px;border-radius:30px;font-weight:800;font-size:14px;box-shadow:0 4px 16px rgba(22,163,74,0.3);">${c.cta}</a>
    </div>
    <p style="font-size:13px;color:#94A3B8;line-height:1.7;margin:0;">${c.line3}</p>
    <p style="font-size:14px;color:#475569;margin:20px 0 0;">${c.closing},<br><strong style="color:#0F172A;">SmartPrice Business</strong><br><span style="color:#94A3B8;font-size:13px;">info@smartprice.be · smartprice.be</span></p>
  </div>
  <div style="text-align:center;color:#94A3B8;font-size:11px;margin-top:20px;">SmartPrice.be · Belgium · GDPR Compliant · Reply to unsubscribe.</div>
</div>
</body></html>`;
}

// ── Social Secretariat / API integration email (NL · FR · EN) ───────────────
function buildSecretariatHtml(name, company, lang) {
  const t = {
    nl: {
      greeting: `Dag ${name}`,
      intro: `Ik ben de oprichter van SmartPrice.be — een gratis Belgisch platform dat live EPEX Spot-prijzen beschikbaar maakt voor gezinnen, EV-rijders en bedrijfsvloten.`,
      intro2: `Ik contacteer ${company} omdat u voor duizenden Belgische werkgevers de CIR 92-vergoeding voor thuisladen verwerkt — en we denken dat we dat proces samen nauwkeuriger en auditproof kunnen maken.`,
      problemTitle: "Het probleem van uw klanten vandaag",
      problem: `Bedrijven die thuisladen vergoeden op basis van het vaste CREG-kwartaaltarief voldoen strikt genomen niet aan CIR 92. De wet vereist de <strong>werkelijke energiekost op het moment van laden</strong>. Een vast tarief is een benadering — maar geen aantoonbaar correcte berekening, en het levert geen auditspoor op voor de belastingdienst.`,
      solutionTitle: "Wat SmartPrice.be kan toevoegen",
      solution: `Onze gratis publieke API levert elke 15 minuten de werkelijke EPEX Spot-prijs per kWh voor België — waardoor het voor het eerst technisch mogelijk wordt om elke laadsessie te koppelen aan de exacte marktprijs: <strong>volledig CIR 92-conform en controleerbaar</strong>.`,
      collab: "Mogelijke samenwerking:",
      b1: "Uw klanten sturen laadsessiedata (datum, uur, kWh) → wij leveren de EPEX-prijs → u berekent de exacte vergoeding",
      b2: "White-label of API-integratie in uw verloningstool of klantportaal",
      b3: "Gezamenlijke communicatie naar uw klantenbase over CIR 92-compliance",
      ctaDesc: "De API is gratis, gedocumenteerd en al live.",
      ctaBtn: "API-documentatie bekijken →",
      ps: "Ik plan graag een gesprek van 20 minuten met iemand van uw product- of partnerteam.",
      closing: "Met vriendelijke groet",
      unsubscribe: "Antwoord op deze e-mail om u af te melden.",
    },
    fr: {
      greeting: `Bonjour ${name}`,
      intro: `Je suis le fondateur de SmartPrice.be — une plateforme belge gratuite qui rend les prix EPEX Spot en direct accessibles aux ménages, conducteurs VE et flottes d'entreprise.`,
      intro2: `Je contacte ${company} parce que vous traitez le remboursement CIR 92 de la recharge à domicile pour des milliers d'employeurs belges — et nous pensons pouvoir rendre ce processus plus précis et auditable ensemble.`,
      problemTitle: "Le problème que vivent vos clients aujourd'hui",
      problem: `Les entreprises remboursant la recharge à domicile au tarif fixe CREG ne respectent pas strictement le CIR 92. La loi exige le <strong>coût énergétique réel au moment de la recharge</strong>. Un tarif fixe est une approximation — pas un calcul démontrablement correct, et il ne laisse aucune piste d'audit pour l'administration fiscale.`,
      solutionTitle: "Ce que SmartPrice.be peut apporter",
      solution: `Notre API publique gratuite fournit le prix EPEX Spot réel par kWh pour la Belgique toutes les 15 minutes — rendant possible, pour la première fois, de lier chaque session au prix exact du marché : <strong>entièrement conforme CIR 92 et vérifiable</strong>.`,
      collab: "Collaboration envisageable :",
      b1: "Vos clients envoient les données de session (date, heure, kWh) → nous fournissons le prix EPEX → vous calculez le remboursement exact",
      b2: "Intégration API ou white-label dans votre outil de paie ou portail client",
      b3: "Communication conjointe à votre clientèle sur la conformité CIR 92",
      ctaDesc: "L'API est gratuite, documentée et déjà en production.",
      ctaBtn: "Voir la documentation API →",
      ps: "Je serais ravi d'échanger 20 minutes avec votre équipe produit ou partenariats.",
      closing: "Cordialement",
      unsubscribe: "Répondez à cet e-mail pour vous désabonner.",
    },
    en: {
      greeting: `Hi ${name}`,
      intro: `I'm the founder of SmartPrice.be — a free Belgian platform delivering live EPEX Spot electricity prices to households, EV drivers, and company fleets.`,
      intro2: `I'm reaching out to ${company} because you process CIR 92 home-charging reimbursements for thousands of Belgian employers — and we think we can make that process more accurate and audit-ready together.`,
      problemTitle: "The problem your clients have today",
      problem: `Companies reimbursing home charging at the fixed quarterly CREG rate are, strictly speaking, not fully compliant with CIR 92. The law requires the <strong>actual energy cost at the moment of charging</strong>. A fixed rate is an approximation — not a demonstrably correct calculation, and it leaves no audit trail for the tax authority.`,
      solutionTitle: "What SmartPrice.be can add",
      solution: `Our free public API delivers the actual EPEX Spot price per kWh for Belgium every 15 minutes — making it possible for the first time to link each charging session to the exact market price at that moment: <strong>fully CIR 92-compliant and verifiable</strong>.`,
      collab: "Possible collaboration:",
      b1: "Your clients send session data (date, hour, kWh) → we supply the EPEX price → you calculate the exact reimbursement",
      b2: "API or white-label integration into your payroll tool or client portal",
      b3: "Joint communication to your client base about CIR 92 compliance",
      ctaDesc: "The API is free, documented, and already live.",
      ctaBtn: "View API documentation →",
      ps: "I'd love 20 minutes with someone from your product or partnerships team.",
      closing: "Best regards",
      unsubscribe: "Reply to this email to unsubscribe.",
    },
  };
  const c = t[lang] || t.en;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:580px;margin:0 auto;padding:32px 16px;">
  <div style="text-align:center;margin-bottom:28px;">
    <div style="display:inline-flex;align-items:center;gap:10px;background:#EFF6FF;border:1px solid rgba(30,64,175,0.15);border-radius:30px;padding:8px 20px;">
      <span style="font-size:20px;">🇧🇪</span>
      <span style="font-weight:900;font-size:18px;color:#1E3A8A;letter-spacing:-0.5px;">SmartPrice</span>
      <span style="font-size:11px;font-weight:700;color:#0891B2;background:#ECFEFF;border-radius:20px;padding:2px 10px;">API · Partnerships</span>
    </div>
  </div>
  <div style="background:#fff;border-radius:20px;border:1px solid rgba(0,0,0,0.07);box-shadow:0 4px 24px rgba(0,0,0,0.06);padding:36px;">
    <p style="font-size:16px;font-weight:700;color:#0F172A;margin:0 0 12px;">${c.greeting},</p>
    <p style="font-size:14px;color:#475569;line-height:1.8;margin:0 0 6px;">${c.intro}</p>
    <p style="font-size:14px;color:#475569;line-height:1.8;margin:0 0 24px;">${c.intro2}</p>
    <div style="background:rgba(220,38,38,0.04);border:1px solid rgba(220,38,38,0.15);border-radius:14px;padding:20px 24px;margin-bottom:20px;">
      <div style="font-size:11px;font-weight:800;color:#DC2626;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">❌ ${c.problemTitle}</div>
      <p style="font-size:13px;color:#475569;line-height:1.8;margin:0;">${c.problem}</p>
    </div>
    <div style="background:rgba(8,145,178,0.05);border:1px solid rgba(8,145,178,0.2);border-radius:14px;padding:20px 24px;margin-bottom:24px;">
      <div style="font-size:11px;font-weight:800;color:#0891B2;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">📡 ${c.solutionTitle}</div>
      <p style="font-size:13px;color:#475569;line-height:1.8;margin:0 0 12px;">${c.solution}</p>
      <div style="font-size:12px;font-weight:700;color:#0F172A;margin-bottom:8px;">${c.collab}</div>
      <ul style="font-size:12px;color:#475569;line-height:1.9;margin:0;padding-left:16px;">
        <li>${c.b1}</li><li>${c.b2}</li><li>${c.b3}</li>
      </ul>
    </div>
    <div style="text-align:center;margin-bottom:20px;">
      <p style="font-size:13px;color:#475569;margin:0 0 16px;">${c.ctaDesc}</p>
      <a href="https://smartprice.be/api-docs" style="display:inline-block;background:linear-gradient(135deg,#0D7490,#06B6D4);color:#fff;text-decoration:none;padding:14px 36px;border-radius:30px;font-weight:800;font-size:15px;box-shadow:0 6px 20px rgba(8,145,178,0.3);">${c.ctaBtn}</a>
    </div>
    <p style="font-size:13px;color:#94A3B8;line-height:1.7;margin:0 0 20px;">${c.ps}</p>
    <p style="font-size:14px;color:#475569;margin:0;">${c.closing},<br><strong style="color:#0F172A;">SmartPrice</strong><br><span style="color:#94A3B8;font-size:13px;">info@smartprice.be · smartprice.be/api-docs</span></p>
  </div>
  <div style="text-align:center;color:#94A3B8;font-size:11px;margin-top:24px;line-height:1.8;">
    <div>SmartPrice.be · Belgium · GDPR Compliant · EU Hosted</div>
    <div style="margin-top:6px;">${c.unsubscribe}</div>
  </div>
</div>
</body></html>`;
}

function subjectSecretariat(company, lang) {
  if (lang === "nl") return `CIR 92 thuisladen: live EPEX-data rechtstreeks in uw verloning — SmartPrice.be`;
  if (lang === "fr") return `CIR 92 recharge domicile : données EPEX en direct dans votre traitement salarial`;
  return `CIR 92 home charging: live EPEX data for your payroll processing — SmartPrice.be`;
}

// ── Fluvius waitlist update email (NL) ───────────────────────────────────────
const FLUVIUS_WAITLIST_CONTACTS = [
  { to: "danny.maesen@telenet.be",        name: "Danny"   },
  { to: "dion@dionverbeke.com",           name: "Dion"    },
  { to: "smartprice@chacsam.be",          name: "Team"    },
  { to: "karel.vanderkerken@outlook.be",  name: "Karel"   },
  { to: "christian.joret@gmail.com",      name: "Christian" },
  { to: "marianne@hotmail.be",            name: "Marianne" },
  { to: "pollarisjan@gmail.com",          name: "Jan"     },
  { to: "cleberson.eng@gmail.com",        name: "Cleberson" },
  { to: "lucdc@telenet.be",              name: "Luc"     },
  { to: "patrick.berghmans@gmail.com",    name: "Patrick" },
  { to: "vaddamanis@yahoo.com",           name: "daar"    },
];

function buildFluviusUpdateHtml(name) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:580px;margin:0 auto;padding:32px 16px;">

  <div style="text-align:center;margin-bottom:28px;">
    <div style="display:inline-flex;align-items:center;gap:10px;background:#EFF6FF;border:1px solid rgba(30,64,175,0.15);border-radius:30px;padding:8px 20px;">
      <span style="font-size:20px;">🇧🇪</span>
      <span style="font-weight:900;font-size:18px;color:#1E3A8A;letter-spacing:-0.5px;">SmartPrice</span>
      <span style="font-size:11px;font-weight:700;color:#1E40AF;background:#DBEAFE;border-radius:20px;padding:2px 10px;">Update</span>
    </div>
  </div>

  <div style="background:#fff;border-radius:20px;border:1px solid rgba(0,0,0,0.07);box-shadow:0 4px 24px rgba(0,0,0,0.06);padding:36px;">

    <p style="font-size:16px;font-weight:700;color:#0F172A;margin:0 0 16px;">Dag ${name},</p>
    <p style="font-size:14px;color:#475569;line-height:1.8;margin:0 0 20px;">
      Bedankt dat u zich hebt aangemeld voor de <strong>Fluvius-koppeling</strong> van SmartPrice. We zijn actief bezig met de integratie van digitale meters — en willen u alvast een update geven over waar we staan.
    </p>

    <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.25);border-radius:14px;padding:20px 24px;margin-bottom:20px;">
      <div style="font-size:11px;font-weight:800;color:#D97706;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">📡 Status Fluvius-koppeling</div>
      <p style="font-size:13px;color:#475569;line-height:1.8;margin:0;">
        De directe Fluvius P1-poortkoppeling is gepland voor <strong>later dit jaar</strong>. We werken samen met meterfabrikanten en testen de betrouwbaarheid van de uitlezing voordat we het voor iedereen openstellen. Zodra het live gaat, bent u als eerste aan de beurt — u hoeft niets te doen.
      </p>
    </div>

    <div style="background:rgba(22,163,74,0.04);border:1px solid rgba(22,163,74,0.18);border-radius:14px;padding:20px 24px;margin-bottom:24px;">
      <div style="font-size:11px;font-weight:800;color:#16A34A;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;">✅ Wat u vandaag al kunt gebruiken</div>
      <ul style="font-size:13px;color:#475569;line-height:1.9;margin:0;padding-left:18px;">
        <li><strong>Live EPEX Spot-prijzen</strong> — zie uur per uur wanneer stroom het goedkoopst is in België</li>
        <li><strong>Goedkoopste uren van morgen</strong> — dagelijkse alert wanneer de laagste laad-uren bekend zijn</li>
        <li><strong>Sessie-calculator</strong> — bereken de werkelijke prijs van elke laadsessie op basis van het EPEX-uurtarief</li>
        <li><strong>Gratis · geen installatie</strong> — werkt direct via de browser, geen app nodig</li>
      </ul>
    </div>

    <div style="text-align:center;margin-bottom:8px;">
      <p style="font-size:13px;color:#475569;margin:0 0 16px;">Ga naar SmartPrice.be en ontdek wat u nu al kunt besparen.</p>
      <a href="https://smartprice.be" style="display:inline-block;background:linear-gradient(135deg,#15803D,#16A34A);color:#fff;text-decoration:none;padding:14px 36px;border-radius:30px;font-weight:800;font-size:15px;box-shadow:0 6px 20px rgba(22,163,74,0.3);">
        Open SmartPrice.be →
      </a>
    </div>

    <p style="font-size:14px;color:#475569;margin:24px 0 0;">Met vriendelijke groet,<br><strong style="color:#0F172A;">Het SmartPrice-team</strong><br><span style="color:#94A3B8;font-size:13px;">info@smartprice.be · smartprice.be</span></p>
  </div>

  <div style="text-align:center;color:#94A3B8;font-size:11px;margin-top:24px;line-height:1.8;">
    <div>SmartPrice.be · België · GDPR Conform · EU-hosting</div>
    <div style="margin-top:6px;">Antwoord op deze e-mail om u af te melden.</div>
  </div>
</div>
</body></html>`;
}

async function sendFluviusUpdate({ to, name }) {
  await sendMail({
    from: FROM,
    to,
    subject: `SmartPrice — update over uw Fluvius-registratie`,
    html: buildFluviusUpdateHtml(name),
    replyTo: "info@smartprice.be",
  });
  return { to, name, status: "sent" };
}

async function sendOne({ to, name, company, lang, followUp = false, finalTouch = false, type = "fleet" }) {
  const html = type === "secretariat" ? buildSecretariatHtml(name, company, lang)
             : finalTouch             ? buildFinalTouchHtml(name, company, lang)
             : followUp               ? buildFollowUpHtml(name, company, lang)
             :                          buildHtml(name, company, lang);
  const sub  = type === "secretariat" ? subjectSecretariat(company, lang)
             :                          subject(company, lang, followUp, finalTouch);
  const tag  = type === "secretariat"   ? "secretariat_outreach_jul2026"
             : type === "expanded_fleet" ? "fleet_expanded_jul2026"
             : finalTouch               ? "fleet_finaltouch_jun2026"
             : followUp                 ? "fleet_followup_jun2026"
             :                            "fleet_outreach_jun2026";
  await sendMail({ from: FROM, to, subject: sub, html, replyTo: "info@smartprice.be" });
  return { to, company, status: "sent" };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// POST /api/admin/send-outreach
// Body: { contacts?: [...], preset?: "all"|"fluvius_waitlist", dryRun?: true }
router.post("/", async (req, res) => {
  const secret = req.headers["x-admin-secret"];
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }


  const { contacts, preset, dryRun = false, followUp = false, finalTouch = false } = req.body || {};

  // Fluvius waitlist update — separate template
  if (preset === "fluvius_waitlist") {
    const list = FLUVIUS_WAITLIST_CONTACTS;
    if (dryRun) {
      return res.json({ success: true, dryRun: true, would_send: list.map(c => ({ to: c.to, name: c.name })) });
    }
    const sent = [], failed = [];
    for (const contact of list) {
      try {
        const result = await sendFluviusUpdate(contact);
        sent.push(result);
        console.log(`[fluvius-update] ✓ sent → ${contact.to}`);
      } catch (e) {
        const msg = e.response?.data?.message || e.message;
        failed.push({ to: contact.to, error: msg });
        console.error(`[fluvius-update] ✗ failed → ${contact.to}: ${msg}`);
      }
      await sleep(600);
    }
    return res.json({ success: true, total: list.length, sent: sent.length, failed: failed.length, results: { sent, failed } });
  }

  const list = contacts
    || (preset === "all"            ? PRESET_CONTACTS          : null)
    || (preset === "secretariat"    ? SECRETARIAT_CONTACTS     : null)
    || (preset === "expanded_fleet" ? EXPANDED_FLEET_CONTACTS  : null)
    || [];

  if (!list.length) {
    return res.status(400).json({ success: false, error: "No contacts. Pass contacts[] or preset:'all'|'fluvius_waitlist'" });
  }

  if (dryRun) {
    return res.json({ success: true, dryRun: true, would_send: list.map(c => ({ to: c.to, company: c.company, lang: c.lang })) });
  }

  const sent = [], failed = [];
  for (const contact of list) {
    try {
      const result = await sendOne({ ...contact, followUp, finalTouch });
      sent.push(result);
      console.log(`[outreach] ✓ sent → ${contact.to}`);
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      failed.push({ to: contact.to, company: contact.company, error: msg });
      console.error(`[outreach] ✗ failed → ${contact.to}: ${msg}`);
    }
    await sleep(600);
  }

  res.json({ success: true, total: list.length, sent: sent.length, failed: failed.length, results: { sent, failed } });
});

module.exports = router;
