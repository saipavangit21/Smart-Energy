/**
 * BusinessPage — /business
 * SmartPrice for Business — enterprise B2B landing page.
 * v2: updated hero copy, ROI calculator, GDPR trust section,
 *     3-column Belgian feature grid, OG meta tags, audit form modal.
 */
import { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import LangSwitcher  from "../components/LangSwitcher";

const C = {
  bg:        "#F8FAFC",
  card:      "#FFFFFF",
  border:    "rgba(0,0,0,0.08)",
  shadow:    "0 4px 24px rgba(0,0,0,0.07)",
  primary:   "#16A34A",
  bright:    "#22C55E",
  text:      "#0F172A",
  muted:     "#475569",
  light:     "#94A3B8",
  green:     "#22C55E",
  highlight: "#DCFCE7",
  border2:   "rgba(22,163,74,0.2)",
  amber:     "#D97706",
  purple:    "#7C3AED",
  red:       "#DC2626",
};

/* CREG Q2 2026 vs dynamic EPEX saving per kWh */
const CREG_RATE   = 0.2833;
const EPEX_SMART  = 0.1920;
const SAVING_KWH  = +(CREG_RATE - EPEX_SMART).toFixed(4); // 0.0913
const KWH_PER_KM  = 0.20;  // 5 km/kWh average EV

/* ── CREG tooltip ────────────────────────────────────────────── */
function CregTooltip() {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-block", marginLeft: 5, verticalAlign: "middle", cursor: "help" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} onFocus={() => setShow(true)} onBlur={() => setShow(false)}>
      <span style={{ fontSize: 12, color: C.primary, fontWeight: 700 }}>ℹ️</span>
      {show && (
        <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#1E293B", color: "#fff", fontSize: 12, fontWeight: 500, lineHeight: 1.65, padding: "10px 14px", borderRadius: 10, width: 280, zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,0.25)", pointerEvents: "none" }}>
          <strong>CREG</strong> — Commissie voor de Regulering van de Elektriciteit en het Gas. Belgium's federal energy regulator. Publishes a standard quarterly reference tariff used by most HR departments to calculate home-charging reimbursements.
          <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", border: "6px solid transparent", borderTopColor: "#1E293B" }} />
        </div>
      )}
    </span>
  );
}

/* ── Section divider ─────────────────────────────────────────── */
function SectionDivider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "56px 0 48px" }}>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(22,163,74,0.2))" }} />
      <span style={{ fontSize: 10, fontWeight: 800, color: C.primary, textTransform: "uppercase", letterSpacing: "2.5px", whiteSpace: "nowrap", background: C.highlight, border: `1px solid ${C.border2}`, borderRadius: 20, padding: "4px 14px" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(22,163,74,0.2), transparent)" }} />
    </div>
  );
}

export default function BusinessPage({ onNavigate }) {
  const { tSection, lang } = useLanguage();
  const L = tSection("business");
  const locale = lang === "fr" ? "fr-BE" : lang === "nl" ? "nl-BE" : "en-BE";
  const fmtInt  = val => new Intl.NumberFormat(locale, {maximumFractionDigits:0}).format(val);
  const fmtNum4 = val => new Intl.NumberFormat(locale, {minimumFractionDigits:4,maximumFractionDigits:4}).format(val);

  /* Lead / contact form */
  const [leadEmail,       setLeadEmail]       = useState("");
  const [leadCompany,     setLeadCompany]     = useState("");
  const [leadName,        setLeadName]        = useState("");
  const [leadPhone,       setLeadPhone]       = useState("");
  const [leadFleetRange,  setLeadFleetRange]  = useState("");
  const [leadPayroll,     setLeadPayroll]     = useState("");
  const [leadReimbMethod, setLeadReimbMethod] = useState("");
  const [leadState,       setLeadState]       = useState("idle");

  /* ROI Calculator */
  const [fleetSize,       setFleetSize]       = useState(20);
  const [monthlyKm,       setMonthlyKm]       = useState(1500);
  const [calculatorUsed,  setCalculatorUsed]  = useState(false);

  /* Modal */
  const [showModal,    setShowModal]    = useState(false);

  /* Derived ROI */
  const kwhPerCarPerMonth = monthlyKm * KWH_PER_KM;
  const annualSaving      = Math.round(fleetSize * kwhPerCarPerMonth * SAVING_KWH * 12);
  const perCarSaving      = Math.round(kwhPerCarPerMonth * SAVING_KWH * 12);

  /* OpenGraph / meta */
  useEffect(() => {
    document.title = "SmartPrice for Business — Automate EV Fleet Reimbursements | Belgium";
    const setMeta = (name, val, prop = false) => {
      const sel = prop ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let el = document.querySelector(sel);
      if (!el) { el = document.createElement("meta"); prop ? el.setAttribute("property", name) : el.setAttribute("name", name); document.head.appendChild(el); }
      el.setAttribute("content", val);
    };
    setMeta("description", "Automate dynamic tariff EV home-charging reimbursements for Belgian corporate fleets. CIR 92 compliant. Works with SD Worx, Securex, Partena, Acerta, Group S.");
    setMeta("og:title",       "SmartPrice for Business — EV Fleet Energy Optimization", true);
    setMeta("og:description", "Automate dynamic tariff charging reimbursements for Belgian corporate fleets. Stop overpaying on CREG flat rates.", true);
    setMeta("og:url",         "https://smartprice.be/business", true);
    setMeta("og:type",        "website", true);
    setMeta("twitter:card",   "summary_large_image");
    setMeta("twitter:title",  "SmartPrice for Business — EV Fleet Energy Optimization");
    fetch("/api/business-ping").catch(() => {});
  }, []);

  /* Form submit */
  async function submitLead(e) {
    e.preventDefault();
    if (!leadEmail || leadState !== "idle") return;
    setLeadState("loading");
    try {
      const r = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:           leadEmail,
          source:          "business-audit-form",
          company:         leadCompany,
          name:            leadName,
          phone:           leadPhone,
          fleet_size:      leadFleetRange || String(fleetSize),
          payroll_provider:leadPayroll,
          reimb_method:    leadReimbMethod,
          metadata: { annual_saving_estimate: annualSaving, monthly_km: monthlyKm },
        }),
      });
      if (r.ok) setLeadState("done"); else setLeadState("error");
    } catch { setLeadState("error"); }
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif", color: C.text }}>

      {/* ── MODAL — Detailed Cost Audit form ──────────────────────── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ background: C.card, borderRadius: 24, padding: "40px", maxWidth: 520, width: "100%", boxShadow: "0 24px 80px rgba(0,0,0,0.2)", position: "relative" }}>
            <button onClick={() => setShowModal(false)} style={{ position: "absolute", top: 16, right: 20, background: "none", border: "none", fontSize: 24, cursor: "pointer", color: C.muted, lineHeight: 1 }}>✕</button>

            {leadState === "done" ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <h3 style={{ fontSize: 22, fontWeight: 900, color: C.primary, marginBottom: 10 }}>{L.modalDone||"Audit request received!"}</h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>{L.modalDoneSub||"We'll prepare your personalised fleet cost report and reach out within 1 business day."}</p>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.primary, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Smart Audit</div>
                <h3 style={{ fontSize: 22, fontWeight: 900, color: C.text, marginBottom: 6 }}>{L.modalTitle||"Get your Detailed Cost Audit"}</h3>
                <p style={{ fontSize: 13, color: C.muted, marginBottom: 28, lineHeight: 1.7 }}>
                  We'll calculate your fleet's exact CREG overpayment and send a PDF ready to share with your CFO or HR director.
                </p>
                {/* Pre-filled from ROI calculator — only shown if user interacted with sliders */}
                {calculatorUsed && (
                  <div style={{ background: C.highlight, border: `1px solid ${C.border2}`, borderRadius: 12, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: C.primary, fontWeight: 700 }}>
                    📊 Based on your inputs: {fleetSize} EVs · {fmtInt(monthlyKm)} km/month — estimated saving <strong>€{fmtInt(annualSaving)}/year</strong>
                  </div>
                )}
                <form onSubmit={submitLead} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Text inputs */}
                  {[
                    { id: "company", label: (L.modalCompany||"Company name")+" *", val: leadCompany, set: setLeadCompany, ph: "Acme NV",     type: "text",  req: true  },
                    { id: "name",    label: (L.modalName||"Your name")+" *",    val: leadName,    set: setLeadName,    ph: "Jan Janssen", type: "text",  req: true  },
                    { id: "email",   label: (L.modalEmail||"Work email")+" *",  val: leadEmail,   set: setLeadEmail,   ph: "jan@acme.be", type: "email", req: true  },
                    { id: "phone",   label: L.modalPhone||"Phone (optional)",   val: leadPhone,   set: setLeadPhone,   ph: "+32 …",       type: "tel",   req: false },
                  ].map(f => (
                    <div key={f.id}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 5 }}>{f.label}</label>
                      <input type={f.type} required={f.req} placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)}
                        style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, background: C.bg, outline: "none", fontFamily: "inherit", transition: "border 0.2s" }}
                        onFocus={e => e.target.style.border = `1.5px solid ${C.primary}`}
                        onBlur={e => e.target.style.border = `1.5px solid ${C.border}`} />
                    </div>
                  ))}

                  {/* Segmented dropdowns */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 5 }}>{L.modalFleet||"Fleet size"} *</label>
                      <select required value={leadFleetRange} onChange={e => setLeadFleetRange(e.target.value)}
                        style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 13, color: leadFleetRange ? C.text : C.light, background: C.bg, outline: "none", fontFamily: "inherit", cursor: "pointer" }}
                        onFocus={e => e.target.style.border = `1.5px solid ${C.primary}`}
                        onBlur={e => e.target.style.border = `1.5px solid ${C.border}`}>
                        <option value="" disabled>Select range…</option>
                        {["1–9 cars","10–49 cars","50+ cars"].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 5 }}>{L.modalPayroll||"Fleet setup"}</label>
                      <select value={leadPayroll} onChange={e => setLeadPayroll(e.target.value)}
                        style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 13, color: leadPayroll ? C.text : C.light, background: C.bg, outline: "none", fontFamily: "inherit", cursor: "pointer" }}
                        onFocus={e => e.target.style.border = `1.5px solid ${C.primary}`}
                        onBlur={e => e.target.style.border = `1.5px solid ${C.border}`}>
                        <option value="">Select…</option>
                        {["Fleet cards (Velocity / DKV / UTA)","Home charging + reimbursement","Both models","Not sure / other"].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* CREG / EPEX mini-explainer */}
                  <div style={{ background: "#F0F9FF", border: "1px solid rgba(14,165,233,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: 11, color: "#0369A1", lineHeight: 1.65 }}>
                    <strong>CREG</strong> = Belgium's federal regulator — publishes a flat quarterly tariff (€{CREG_RATE}/kWh Q2 2026) used by most HR teams.<br />
                    <strong>EPEX Spot</strong> = real-time hourly market price — varies from €0.05 to €0.45/kWh depending on time of day. SmartPrice tracks this to calculate exact reimbursements.
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 5 }}>Current reimbursement / billing method *</label>
                    <select required value={leadReimbMethod} onChange={e => setLeadReimbMethod(e.target.value)}
                      style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 13, color: leadReimbMethod ? C.text : C.light, background: C.bg, outline: "none", fontFamily: "inherit", cursor: "pointer" }}
                      onFocus={e => e.target.style.border = `1.5px solid ${C.primary}`}
                      onBlur={e => e.target.style.border = `1.5px solid ${C.border}`}>
                      <option value="" disabled>How does your fleet pay for charging?</option>
                      <option value="fleet-card">Fleet energy cards (Velocity / DKV / UTA) — billed to company</option>
                      <option value="creg-flat">Fixed CREG allowance — reimburse employees at quarterly CREG rate</option>
                      <option value="fuel-card">Other flat rate / fuel card</option>
                      <option value="excel">Manual Excel tracking</option>
                      <option value="dynamic">Dynamic EPEX tariff — already tracking hourly prices</option>
                      <option value="not-yet">Not reimbursing / no system yet</option>
                      <option value="other">Other / not sure</option>
                    </select>
                  </div>
                  <button type="submit" disabled={leadState === "loading"} style={{ marginTop: 8, padding: "14px", borderRadius: 30, fontSize: 15, fontWeight: 800, background: `linear-gradient(135deg, ${C.primary}, ${C.bright})`, color: "#fff", border: "none", cursor: "pointer", boxShadow: `0 6px 24px rgba(22,163,74,0.3)`, opacity: leadState === "loading" ? 0.7 : 1 }}>
                    {leadState === "loading" ? "…" : leadState === "error" ? "Error — try again" : (L.modalSubmit||"Send my Cost Audit request →")}
                  </button>
                  <div style={{ fontSize: 11, color: C.light, textAlign: "center" }}>🛡️ GDPR compliant · EU hosted · No spam</div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── NAV ───────────────────────────────────────────────────── */}
      <nav style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => onNavigate?.("/")}>
          <span style={{ fontSize: 22 }}>🇧🇪</span>
          <span style={{ fontWeight: 900, fontSize: 17, color: C.text, letterSpacing: "-0.3px" }}>SmartPrice</span>
          <span style={{ fontSize: 11, color: "#1E40AF", fontWeight: 800, background: "#EFF6FF", padding: "3px 12px", borderRadius: 20, border: "1px solid rgba(30,64,175,0.25)" }}>Business</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <LangSwitcher />
          <a href="/session-calc" style={{ padding: "9px 18px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: "rgba(22,163,74,0.08)", border: `1px solid ${C.border2}`, color: C.primary, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>⚡ Session Calculator</a>
          <a href="/fleet-audit" style={{ padding: "9px 18px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: "#FEF3C7", border: "1px solid rgba(180,83,9,0.25)", color: "#B45309", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>{L.navFleetAudit||"Free Fleet Audit →"}</a>
          <button onClick={() => setShowModal(true)} style={{ padding: "9px 20px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: `linear-gradient(135deg,${C.primary},${C.bright})`, color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(22,163,74,0.3)", whiteSpace: "nowrap", flexShrink: 0 }}>
            {L.navAudit||"Request audit"}
          </button>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <div style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 55%, #2563EB 100%)", color: "#fff", padding: "80px 32px 72px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        {/* decorative blobs — enterprise blue/teal */}
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "rgba(59,130,246,0.12)", top: -200, right: -100, pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "rgba(13,148,136,0.1)", bottom: -100, left: -50, pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 30, padding: "6px 20px", marginBottom: 28, fontSize: 13, fontWeight: 700, backdropFilter: "blur(8px)" }}>
            🏢 SmartPrice for Business — Beta · Belgium
          </div>

          {/* Updated hero headline per review */}
          <h1 style={{ fontSize: "clamp(30px,5.5vw,58px)", fontWeight: 900, lineHeight: 1.08, margin: "0 auto 24px", maxWidth: 760, letterSpacing: "-2px", textShadow: "0 2px 24px rgba(0,0,0,0.15)" }}>
            {L.heroTitle||"Automate EV Fleet Reimbursements"}
          </h1>
          <p style={{ fontSize: "clamp(15px,2vw,19px)", opacity: 0.88, maxWidth: 580, margin: "0 auto 40px", lineHeight: 1.75 }}>
            {L.heroSub||"Stop overpaying based on fixed CREG averages. SmartPrice tracks live EPEX data to calculate exact home-charging costs for your employees."}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => setShowModal(true)} style={{ padding: "15px 36px", borderRadius: 30, fontSize: 15, fontWeight: 800, background: "#FFFFFF", color: "#1E3A8A", border: "none", cursor: "pointer", boxShadow: "0 6px 28px rgba(0,0,0,0.25)" }}>
              {L.heroCta||"Get a Detailed Cost Audit →"}
            </button>
            <a href="/fleet-audit" style={{ padding: "15px 28px", borderRadius: 30, fontSize: 14, fontWeight: 700, background: "rgba(255,255,255,0.12)", color: "#fff", textDecoration: "none", border: "1px solid rgba(255,255,255,0.28)", backdropFilter: "blur(8px)" }}>
              {L.navFleetAudit||"Free instant fleet audit"}
            </a>
          </div>
        </div>
      </div>

      {/* ── STATS BAR — dark, extends hero zone ───────────────────── */}
      <div style={{ background: "linear-gradient(180deg, #1A2F6E 0%, #0F172A 100%)", padding: "24px 32px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 24, textAlign: "center" }}>
          {[
            { n: "€300–500", label: L.stat1Label||"overpayment per EV per year on CREG rate",              accent: "#22C55E" },
            { n: "CIR 92",   label: L.stat2Label||"Belgian tax law compliance — accepted by all secretariaten", accent: "#FBBF24" },
            { n: "40%",      label: L.stat3Label||"average corporate energy bill reduction",                 accent: "#34D399" },
            { n: L.stat4N||"Free", label: L.stat4Label||"instant fleet audit — no subscription required",   accent: "#38BDF8" },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.accent, letterSpacing: "-0.5px" }}>{s.n}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4, maxWidth: 160, lineHeight: 1.5 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Dark-to-light gradient bridge */}
      <div style={{ height: 60, background: "linear-gradient(180deg, #0F172A 0%, #F8FAFC 100%)" }} />

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "8px 32px 80px" }}>

        {/* ── PROBLEM ───────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.primary, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>{L.problemLabel||"The problem"}</div>
          <h2 style={{ fontSize: "clamp(24px,3.5vw,38px)", fontWeight: 900, color: C.text, marginBottom: 14, letterSpacing: "-0.8px" }}>{L.problemTitle||"Why CREG"}<CregTooltip />{"-based reimbursements fail the legal audit"}</h2>
          <p style={{ fontSize: 15, color: C.muted, maxWidth: 580, margin: "0 auto", lineHeight: 1.85 }}>
            {L.problemBody||"Every quarter the CREG publishes a reference electricity tariff. HR departments multiply this by estimated kWh and reimburse employees. It sounds fair — but under CIR 92, the reimbursement must reflect the actual cost at the moment of charging. Fixed quarterly averages don't satisfy that requirement."}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 64 }}>
          <div style={{ background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.16)", borderRadius: 20, padding: "28px 32px" }}>
            <div style={{ fontSize: 26, marginBottom: 12 }}>❌</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.red, marginBottom: 12 }}>{L.cregTitle||"Current CREG approach"}</div>
            <ul style={{ fontSize: 14, color: C.muted, lineHeight: 2.1, paddingLeft: 20, margin: 0 }}>
              {(L.cregItems||["Fixed CREG rate × estimated kWh","Updated quarterly — lags real market","No knowledge of when employee charges","Overpays cheap months, underpays expensive months","No audit trail for tax authorities or social secretariaten"]).map((item,i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
          <div style={{ background: "rgba(22,163,74,0.04)", border: "1px solid rgba(22,163,74,0.2)", borderRadius: 20, padding: "28px 32px" }}>
            <div style={{ fontSize: 26, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.primary, marginBottom: 12 }}>{L.spTitle||"SmartPrice Business"}</div>
            <ul style={{ fontSize: 14, color: C.muted, lineHeight: 2.1, paddingLeft: 20, margin: 0 }}>
              {(L.spItems||["Real EPEX Spot price at exact charge time","Updated every 15 minutes — always accurate","Tracks actual kWh per employee session","Fair and correct for both employer and employee","Full audit trail — CIR 92 compliant, accepted by all secretariaten"]).map((item,i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        </div>

        <SectionDivider label={L.sectionROI||"ROI Calculator"} />
        {/* ── ROI CALCULATOR ────────────────────────────────────────── */}
        <div style={{ background: C.card, borderRadius: 24, border: `1px solid ${C.border}`, boxShadow: C.shadow, overflow: "hidden", marginBottom: 64 }}>
          <div style={{ background: "linear-gradient(135deg,#15803D,#16A34A)", padding: "28px 36px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>{L.roiCalcLabel||"Smart Audit · ROI Calculator"}</div>
            <h3 style={{ fontSize: "clamp(20px,3vw,30px)", fontWeight: 900, color: "#fff", marginBottom: 6, letterSpacing: "-0.5px" }}>{L.roiCalcTitle||"How much is your fleet overpaying — and is your audit trail CIR 92-ready?"}</h3>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.65 }}>{L.roiCalcDesc||`Based on CREG Q2 2026 (€${CREG_RATE}/kWh) vs. actual EPEX smart-charging average (€${EPEX_SMART}/kWh) · All figures exportable as a tax-authority audit report`}</p>
          </div>

          <div style={{ padding: "36px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 32, marginBottom: 36 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 10 }}>
                  {L.roiEvLabel2||"EVs in your fleet:"} <strong style={{ color: C.primary }}>{fleetSize}</strong>
                </label>
                <input type="range" min={2} max={150} step={1} value={fleetSize} onChange={e => { setFleetSize(+e.target.value); setCalculatorUsed(true); }}
                  style={{ width: "100%", accentColor: C.primary, cursor: "pointer" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.light, marginTop: 4 }}><span>2</span><span>150</span></div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 10 }}>
                  {L.roiKmLabel2||"Avg. monthly km per car:"} <strong style={{ color: C.primary }}>{fmtInt(monthlyKm)} km</strong>
                </label>
                <input type="range" min={300} max={4000} step={100} value={monthlyKm} onChange={e => { setMonthlyKm(+e.target.value); setCalculatorUsed(true); }}
                  style={{ width: "100%", accentColor: C.primary, cursor: "pointer" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.light, marginTop: 4 }}><span>300 km</span><span>4,000 km</span></div>
              </div>
            </div>

            {/* Result display */}
            <div style={{ background: "linear-gradient(135deg,rgba(22,163,74,0.06),rgba(34,197,94,0.03))", border: `1px solid rgba(22,163,74,0.2)`, borderRadius: 20, padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24, marginBottom: 28 }}>
              <div>
                <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{L.roiResultLabel||"Estimated annual fleet savings with SmartPrice"}</div>
                <div style={{ fontSize: "clamp(40px,6vw,64px)", fontWeight: 900, color: C.primary, fontFamily: "monospace", letterSpacing: "-3px", lineHeight: 1 }}>
                  €{fmtInt(annualSaving)}
                </div>
                {/* Per-vehicle callout — makes small fleets feel the ROI too */}
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, background: C.highlight, border: `1px solid ${C.border2}`, borderRadius: 20, padding: "6px 14px" }}>
                  <span style={{ fontSize: 14 }}>⚡</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>
                    <strong>€{fmtInt(perCarSaving)}+ {L.roiPerVehicle||"per vehicle every year"}</strong>
                  </span>
                </div>
                <div style={{ fontSize: 12, color: C.light, marginTop: 8 }}>{fleetSize} {L.roiVehicleNote||"vehicles · software pays for itself instantly"}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: L.roiStatKwh||"Monthly kWh per car",  val: `${fmtInt(Math.round(kwhPerCarPerMonth))} kWh` },
                  { label: L.roiStatSavKwh||"Saving per kWh",    val: `€${fmtNum4(SAVING_KWH)}/kWh` },
                  { label: L.roiStatSavRate||"Saving rate",       val: `~${Math.round((SAVING_KWH / CREG_RATE) * 100)}% of CREG rate` },
                ].map(r => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", gap: 24, fontSize: 13 }}>
                    <span style={{ color: C.muted }}>{r.label}</span>
                    <strong style={{ color: C.text }}>{r.val}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <button onClick={() => setShowModal(true)} style={{ padding: "14px 40px", borderRadius: 30, fontSize: 15, fontWeight: 800, background: `linear-gradient(135deg,${C.primary},${C.bright})`, color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 6px 24px rgba(22,163,74,0.3)" }}>
                {L.roiCtaBtn||"Get a Detailed Cost Audit →"}
              </button>
              <div style={{ fontSize: 12, color: C.light, marginTop: 10 }}>{L.roiCtaSub||"Personalised PDF ready to share with your CFO · Free · No spam"}</div>
            </div>
          </div>
        </div>

        <SectionDivider label={L.sectionTools||"Smart tools · Smart services"} />
        {/* ── 3-COLUMN FEATURE GRID (Belgian context) ───────────────── */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.primary, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>{L.toolsLabel||"Smart tools · Smart services"}</div>
          <h2 style={{ fontSize: "clamp(24px,3.5vw,38px)", fontWeight: 900, color: C.text, letterSpacing: "-0.8px", marginBottom: 10 }}>{L.toolsTitle||"Built for the Belgian corporate market"}</h2>
          <p style={{ fontSize: 15, color: C.muted, maxWidth: 500, margin: "0 auto", lineHeight: 1.85 }}>{L.toolsBody||"Every feature is designed around Belgian tax law, payroll systems, and grid regulations."}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20, marginBottom: 52 }}>
          {[
            { icon: "📤", accent: C.primary,  title: L.tool1Title||"Fleet Card Invoice Checker",       badge: L.tool1Badge||"Free · Live",    badgeCol: C.primary, desc: L.tool1Desc||"Enter sessions from your Velocity, DKV, or UTA invoice. See the real EPEX market price at each exact hour vs. what you were charged.",      cta: L.tool1Cta||"Check your invoice →", href: "/session-calc?mode=fleet" },
            { icon: "⚖️", accent: "#0EA5E9", title: L.tool2Title||"CREG vs. EPEX Intelligence",       badge: L.tool2Badge||"Live now",       badgeCol: C.primary, desc: L.tool2Desc||"Automatically detect whether an employee is on a dynamic or fixed-rate tariff. Ensure reimbursements are legally exact under CIR 92.",        cta: L.tool2Cta||"See how it works →", href: "/fleet-audit" },
            { icon: "🚗", accent: C.amber,    title: L.tool4Title||"Smart Audit — Instant Report",     badge: L.tool4Badge||"Free",           badgeCol: C.bright,  desc: L.tool4Desc||"Enter your fleet size and charging method. Instantly see your annual overpayment versus live EPEX rates — with a downloadable PDF.",        cta: L.tool4Cta||"Start Smart Audit →", href: "/fleet-audit" },
            { icon: "📊", accent: "#0EA5E9", title: L.tool6Title||"Per-Session Reimbursement Calculator", badge: L.tool6Badge||"Free · Live", badgeCol: C.primary, desc: L.tool6Desc||"Enter date, time and kWh for any charging session. SmartPrice looks up the exact EPEX price at that hour and calculates the CIR 92-compliant reimbursement.", cta: L.tool6Cta||"Calculate now →", href: "/session-calc?mode=reimburse" },
            { icon: "📡", accent: C.muted,    title: L.tool5Title||"Smart API — REST Integration",     badge: L.tool5Badge||"Free",           badgeCol: C.bright,  desc: L.tool5Desc||"Live EPEX Spot Belgium prices via public REST API. No API key required. Integrate into your fleet management platform or ERP.",              cta: L.tool5Cta||"View Smart API →", href: "/api-docs" },
            { icon: "🔌", accent: C.purple,   title: L.tool3Title||"Smart Connect — Fleet Throttling", badge: L.tool3Badge||"Coming 2026",    badgeCol: C.purple,  desc: L.tool3Desc||"Automatically shift employee home charging to off-peak EPEX hours via smart charger integration — cutting home charging costs by up to 60%.", cta: L.tool3Cta||"Register interest →", modal: true },
          ].map(p => (
            <div key={p.title} style={{ background: C.card, borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: C.shadow, padding: "28px 26px", display: "flex", flexDirection: "column", transition: "transform 0.25s ease, box-shadow 0.25s ease" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = `0 20px 48px rgba(22,163,74,0.14)`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = C.shadow; }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${p.accent}12`, border: `1px solid ${p.accent}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 18 }}>{p.icon}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{p.title}</div>
                <span style={{ fontSize: 10, fontWeight: 700, color: p.badgeCol, background: `${p.badgeCol}15`, border: `1px solid ${p.badgeCol}28`, borderRadius: 20, padding: "2px 9px", flexShrink: 0 }}>{p.badge}</span>
              </div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, flex: 1, marginBottom: 18 }}>{p.desc}</div>
              {p.modal
                ? <button onClick={() => setShowModal(true)} style={{ display: "inline-block", padding: "8px 18px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: `${p.accent}10`, border: `1px solid ${p.accent}28`, color: p.accent, cursor: "pointer", fontFamily: "inherit" }}>{p.cta}</button>
                : <a href={p.href} style={{ display: "inline-block", padding: "8px 18px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: `${p.accent}10`, border: `1px solid ${p.accent}28`, color: p.accent, textDecoration: "none" }}>{p.cta}</a>
              }
            </div>
          ))}
        </div>

        <SectionDivider label={L.sectionPayroll||"Fleet ecosystem"} />
        {/* ── FLEET ECOSYSTEM ───────────────────────────────────────── */}
        <div style={{ background: C.card, borderRadius: 22, border: `1px solid ${C.border}`, boxShadow: C.shadow, padding: "30px 36px", marginBottom: 40, textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>{L.payrollLabel||"Works with your fleet cards & payroll systems"}</div>

          {/* Fleet card providers */}
          <div style={{ fontSize: 10, fontWeight: 700, color: C.light, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Fleet energy cards</div>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
            {[
              { name: "Velocity",     initials: "VL", color: "#DC2626", bg: "#FEF2F2" },
              { name: "DKV",          initials: "DK", color: "#1D4ED8", bg: "#EFF6FF" },
              { name: "UTA",          initials: "UT", color: "#059669", bg: "#F0FDF4" },
              { name: "Total Fleet",  initials: "TF", color: "#D97706", bg: "#FFFBEB" },
            ].map(s => (
              <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, border: `1.5px solid ${s.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, color: s.color, flexShrink: 0 }}>{s.initials}</div>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{s.name}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ borderTop: `1px dashed ${C.border}`, margin: "0 0 16px" }} />

          {/* Social secretariaten */}
          <div style={{ fontSize: 10, fontWeight: 700, color: C.light, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Social secretariaten</div>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
            {[
              { name: "SD Worx",  initials: "SD", color: "#E30613", bg: "#FEF2F2" },
              { name: "Securex",  initials: "SX", color: "#003DA5", bg: "#EFF6FF" },
              { name: "Partena",  initials: "PA", color: "#00A550", bg: "#F0FDF4" },
              { name: "Group S",  initials: "GS", color: "#6D28D9", bg: "#F5F3FF" },
              { name: "Acerta",   initials: "AC", color: "#0369A1", bg: "#F0F9FF" },
              { name: "Liantis",  initials: "LI", color: "#D97706", bg: "#FFFBEB" },
            ].map(s => (
              <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, border: `1.5px solid ${s.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, color: s.color, flexShrink: 0 }}>{s.initials}</div>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{s.name}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12, color: C.light, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            ✅ {L.payrollNote||"SmartPrice integrates with fleet card providers and social secretariaten — CIR 92 compliant"}
          </div>
        </div>

        <SectionDivider label={L.sectionSecurity||"Security & compliance"} />
        {/* ── GDPR & ENTERPRISE SECURITY — isolated trust box ──────── */}
        <div style={{ background: "rgba(22,163,74,0.035)", border: "1.5px solid rgba(22,163,74,0.18)", borderRadius: 24, padding: "36px 32px", marginBottom: 52 }}>
          {/* Header row with lock icon */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(22,163,74,0.12)", border: "1px solid rgba(22,163,74,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔒</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.primary, textTransform: "uppercase", letterSpacing: 2 }}>{L.secLabel||"Enterprise security & privacy"}</div>
          </div>
          <h2 style={{ fontSize: "clamp(20px,3vw,32px)", fontWeight: 900, color: C.text, letterSpacing: "-0.5px", marginBottom: 10 }}>{L.secTitle||"Your employees' data stays private"}</h2>
          <p style={{ fontSize: 15, color: C.muted, maxWidth: 560, lineHeight: 1.85, marginBottom: 28 }}>{L.secBody||"Belgian companies hesitate to connect employee home-charging data. Here is exactly how we isolate and protect every record — by design, not as an afterthought."}</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            {[
              { icon: "🛡️", accent: C.primary,  title: L.sec1Title||"GDPR Compliant by Design",          desc: L.sec1Desc||"Employee home location, private energy contracts, and personal charging schedules are fully isolated per employer account." },
              { icon: "🇪🇺", accent: "#0EA5E9", title: L.sec2Title||"EU-Only Infrastructure",             desc: L.sec2Desc||"All cloud processing takes place exclusively on European nodes (Vercel EU West — Frankfurt, Ireland). No data ever leaves the EU." },
              { icon: "🔑", accent: C.amber,     title: L.sec3Title||"Secure OAuth 2.0 Authentication",   desc: L.sec3Desc||"Direct secure token auth with all connected APIs — no raw passwords are ever stored or transmitted." },
              { icon: "📋", accent: C.purple,    title: L.sec4Title||"CIR 92 Audit Trail",                desc: L.sec4Desc||"Every reimbursement calculation is logged with a timestamp, EPEX price source, kWh amount, and employee ID." },
            ].map(t => (
              <div key={t.title} style={{ background: C.card, borderRadius: 16, border: `1px solid ${t.accent}20`, padding: "20px 22px" }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: `${t.accent}10`, border: `1px solid ${t.accent}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 14 }}>{t.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 6 }}>{t.title}</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.8 }}>{t.desc}</div>
              </div>
            ))}
          </div>

          {/* Footer trust strip */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(22,163,74,0.15)", display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
            {["🛡️ GDPR Article 25 — Privacy by Design", "🇪🇺 EU GDPR & NIS2 Compliant", "🔒 OAuth 2.0 / OpenID Connect", "📋 CIR 92 Audit Ready"].map(b => (
              <span key={b} style={{ fontSize: 12, fontWeight: 700, color: C.primary }}>{b}</span>
            ))}
          </div>
        </div>

        {/* ── CONTACT / CTA ──────────────────────────────────────────── */}
        <div id="contact" style={{ background: "linear-gradient(135deg, #15803D, #16A34A)", borderRadius: 24, padding: "44px 40px", color: "#fff", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 14 }}>📩</div>
          <h3 style={{ fontSize: "clamp(20px,3vw,30px)", fontWeight: 900, marginBottom: 10, letterSpacing: "-0.5px" }}>{L.ctaTitle||"Ready to stop overpaying?"}</h3>
          <p style={{ fontSize: 15, opacity: 0.82, marginBottom: 32, maxWidth: 480, margin: "0 auto 32px", lineHeight: 1.75 }}>
            {L.ctaBody||"We'll generate your CIR 92-ready fleet cost report — exact EPEX vs CREG delta, per employee, exportable to your payroll provider — and reach out within 1 business day."}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => setShowModal(true)} style={{ padding: "14px 36px", borderRadius: 30, fontSize: 15, fontWeight: 800, background: "#FCD34D", color: "#15803D", border: "none", cursor: "pointer", boxShadow: "0 6px 24px rgba(0,0,0,0.2)" }}>
              Generate my CIR 92 Audit Report →
            </button>
            <a href="/fleet-audit" style={{ padding: "14px 24px", borderRadius: 30, fontSize: 14, fontWeight: 700, background: "rgba(255,255,255,0.12)", color: "#fff", textDecoration: "none", border: "1px solid rgba(255,255,255,0.25)" }}>
              Free instant audit first
            </a>
          </div>
        </div>

      </div>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${C.border}`, background: C.card, padding: "28px 32px", textAlign: "center", fontSize: 12, color: C.light }}>
        <div style={{ marginBottom: 10, display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/" style={{ color: C.muted, textDecoration: "none", fontWeight: 600, fontSize: 13 }}>SmartPrice Personal</a>
          <a href="/fleet-audit" style={{ color: C.muted, textDecoration: "none", fontWeight: 600, fontSize: 13 }}>Fleet Audit</a>
          <a href="/session-calc" style={{ color: C.primary, textDecoration: "none", fontWeight: 600, fontSize: 13 }}>⚡ Session Calculator</a>
          <a href="/api-docs" style={{ color: C.muted, textDecoration: "none", fontWeight: 600, fontSize: 13 }}>API & HA</a>
          <a href="mailto:info@smartprice.be" style={{ color: C.muted, textDecoration: "none", fontWeight: 600, fontSize: 13 }}>info@smartprice.be</a>
        </div>
        <div>🛡️ GDPR Compliant · 🇪🇺 EU Hosted · 🔒 OAuth 2.0 · CIR 92 Compliant</div>
      </div>
    </div>
  );
}
