/**
 * BusinessPage — /business
 * SmartPrice for Business — enterprise B2B landing page.
 * v2: updated hero copy, ROI calculator, GDPR trust section,
 *     3-column Belgian feature grid, OG meta tags, audit form modal.
 */
import { useState, useEffect } from "react";

const C = {
  bg:        "#F7FEF9",
  card:      "#FFFFFF",
  border:    "rgba(0,0,0,0.08)",
  shadow:    "0 4px 24px rgba(0,0,0,0.07)",
  primary:   "#16A34A",
  bright:    "#22C55E",
  text:      "#0F1A0F",
  muted:     "#52635A",
  light:     "#9DB3A3",
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
  const [fleetSize,    setFleetSize]    = useState(20);
  const [monthlyKm,    setMonthlyKm]    = useState(1500);

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
                <h3 style={{ fontSize: 22, fontWeight: 900, color: C.primary, marginBottom: 10 }}>Audit request received</h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>We'll prepare your personalised fleet cost report and reach out within 1 business day.</p>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.primary, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Smart Audit</div>
                <h3 style={{ fontSize: 22, fontWeight: 900, color: C.text, marginBottom: 6 }}>Get your Detailed Cost Audit</h3>
                <p style={{ fontSize: 13, color: C.muted, marginBottom: 28, lineHeight: 1.7 }}>
                  We'll calculate your fleet's exact CREG overpayment and send a PDF ready to share with your CFO or HR director.
                </p>
                {/* Pre-filled from ROI calculator */}
                <div style={{ background: C.highlight, border: `1px solid ${C.border2}`, borderRadius: 12, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: C.primary, fontWeight: 700 }}>
                  📊 Based on your inputs: {fleetSize} EVs · {monthlyKm.toLocaleString()} km/month — estimated saving <strong>€{annualSaving.toLocaleString()}/year</strong>
                </div>
                <form onSubmit={submitLead} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Text inputs */}
                  {[
                    { label: "Company name *",    val: leadCompany, set: setLeadCompany, ph: "Acme NV",       type: "text",  req: true  },
                    { label: "Your name *",        val: leadName,    set: setLeadName,    ph: "Jan Janssen",   type: "text",  req: true  },
                    { label: "Corporate email *",  val: leadEmail,   set: setLeadEmail,   ph: "jan@acme.be",   type: "email", req: true  },
                    { label: "Phone (optional)",   val: leadPhone,   set: setLeadPhone,   ph: "+32 …",         type: "tel",   req: false },
                  ].map(f => (
                    <div key={f.label}>
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
                      <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 5 }}>Fleet size *</label>
                      <select required value={leadFleetRange} onChange={e => setLeadFleetRange(e.target.value)}
                        style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 13, color: leadFleetRange ? C.text : C.light, background: C.bg, outline: "none", fontFamily: "inherit", cursor: "pointer" }}
                        onFocus={e => e.target.style.border = `1.5px solid ${C.primary}`}
                        onBlur={e => e.target.style.border = `1.5px solid ${C.border}`}>
                        <option value="" disabled>Select range…</option>
                        {["1–5 EVs","6–15 EVs","16–30 EVs","31–50 EVs","51–100 EVs","100+ EVs"].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 5 }}>Payroll provider</label>
                      <select value={leadPayroll} onChange={e => setLeadPayroll(e.target.value)}
                        style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 13, color: leadPayroll ? C.text : C.light, background: C.bg, outline: "none", fontFamily: "inherit", cursor: "pointer" }}
                        onFocus={e => e.target.style.border = `1.5px solid ${C.primary}`}
                        onBlur={e => e.target.style.border = `1.5px solid ${C.border}`}>
                        <option value="">Select…</option>
                        {["SD Worx","Securex","Partena","Group S","Acerta","Liantis","Other"].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 5 }}>Current reimbursement method *</label>
                    <select required value={leadReimbMethod} onChange={e => setLeadReimbMethod(e.target.value)}
                      style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 13, color: leadReimbMethod ? C.text : C.light, background: C.bg, outline: "none", fontFamily: "inherit", cursor: "pointer" }}
                      onFocus={e => e.target.style.border = `1.5px solid ${C.primary}`}
                      onBlur={e => e.target.style.border = `1.5px solid ${C.border}`}>
                      <option value="" disabled>How do you reimburse now?</option>
                      <option value="creg-flat">CREG quarterly flat rate</option>
                      <option value="company-fixed">Fixed company rate (e.g. €0.25/kWh)</option>
                      <option value="dynamic">Dynamic tariff — already tracking EPEX</option>
                      <option value="not-yet">Not reimbursing yet</option>
                      <option value="other">Other / not sure</option>
                    </select>
                  </div>
                  <button type="submit" disabled={leadState === "loading"} style={{ marginTop: 8, padding: "14px", borderRadius: 30, fontSize: 15, fontWeight: 800, background: `linear-gradient(135deg, ${C.primary}, ${C.bright})`, color: "#fff", border: "none", cursor: "pointer", boxShadow: `0 6px 24px rgba(22,163,74,0.3)`, opacity: leadState === "loading" ? 0.7 : 1 }}>
                    {leadState === "loading" ? "Sending…" : leadState === "error" ? "Error — try again" : "Send my Cost Audit request →"}
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
          <span style={{ fontSize: 11, color: C.primary, fontWeight: 800, background: C.highlight, padding: "3px 12px", borderRadius: 20, border: `1px solid ${C.border2}` }}>Business</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href="/fleet-audit" style={{ padding: "9px 20px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: C.highlight, border: `1px solid ${C.border2}`, color: C.primary, textDecoration: "none" }}>Free Fleet Audit →</a>
          <button onClick={() => setShowModal(true)} style={{ padding: "9px 20px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: `linear-gradient(135deg,${C.primary},${C.bright})`, color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(22,163,74,0.3)" }}>
            Request audit
          </button>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <div style={{ background: "linear-gradient(135deg, #15803D 0%, #16A34A 55%, #22C55E 100%)", color: "#fff", padding: "80px 32px 72px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        {/* decorative blobs */}
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "rgba(255,255,255,0.05)", top: -200, right: -100, pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.05)", bottom: -100, left: -50, pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 30, padding: "6px 20px", marginBottom: 28, fontSize: 13, fontWeight: 700, backdropFilter: "blur(8px)" }}>
            🏢 SmartPrice for Business — Beta · Belgium
          </div>

          {/* Updated hero headline per review */}
          <h1 style={{ fontSize: "clamp(30px,5.5vw,58px)", fontWeight: 900, lineHeight: 1.08, margin: "0 auto 24px", maxWidth: 760, letterSpacing: "-2px", textShadow: "0 2px 24px rgba(0,0,0,0.15)" }}>
            Automate EV Fleet Reimbursements<br />
            <span style={{ color: "#FCD34D" }}>on Dynamic Tariffs</span>
          </h1>
          <p style={{ fontSize: "clamp(15px,2vw,19px)", opacity: 0.88, maxWidth: 580, margin: "0 auto 40px", lineHeight: 1.75 }}>
            Stop overpaying based on fixed CREG averages. SmartPrice tracks live EPEX data to calculate exact home-charging costs for your employees — saving up to <strong>40% on corporate energy bills</strong>.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => setShowModal(true)} style={{ padding: "15px 36px", borderRadius: 30, fontSize: 15, fontWeight: 800, background: "#FCD34D", color: "#15803D", border: "none", cursor: "pointer", boxShadow: "0 6px 28px rgba(0,0,0,0.2)" }}>
              Get a Detailed Cost Audit →
            </button>
            <a href="/fleet-audit" style={{ padding: "15px 28px", borderRadius: 30, fontSize: 14, fontWeight: 700, background: "rgba(255,255,255,0.12)", color: "#fff", textDecoration: "none", border: "1px solid rgba(255,255,255,0.28)", backdropFilter: "blur(8px)" }}>
              Free instant fleet audit
            </a>
          </div>
        </div>
      </div>

      {/* ── STATS BAR ─────────────────────────────────────────────── */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "24px 32px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 24, textAlign: "center" }}>
          {[
            { n: "€300–500", label: "overpayment per EV per year on CREG rate", accent: C.primary },
            { n: "CIR 92",   label: "Belgian tax law compliance — accepted by all secretariaten", accent: C.amber },
            { n: "40%",      label: "average corporate energy bill reduction", accent: C.bright },
            { n: "Free",     label: "instant fleet audit — no subscription required", accent: "#0EA5E9" },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.accent, letterSpacing: "-0.5px" }}>{s.n}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4, maxWidth: 160, lineHeight: 1.5 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "60px 32px 80px" }}>

        {/* ── PROBLEM ───────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.primary, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>The problem</div>
          <h2 style={{ fontSize: "clamp(24px,3.5vw,38px)", fontWeight: 900, color: C.text, marginBottom: 14, letterSpacing: "-0.8px" }}>Why CREG-based reimbursements fail the legal audit</h2>
          <p style={{ fontSize: 15, color: C.muted, maxWidth: 580, margin: "0 auto", lineHeight: 1.85 }}>
            Every quarter the CREG publishes a reference electricity tariff. HR departments multiply this by estimated kWh and reimburse employees. It sounds fair — but under CIR 92, the reimbursement must reflect the <em>actual cost at the moment of charging</em>. Fixed quarterly averages don't satisfy that requirement.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 64 }}>
          <div style={{ background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.16)", borderRadius: 20, padding: "28px 32px" }}>
            <div style={{ fontSize: 26, marginBottom: 12 }}>❌</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.red, marginBottom: 12 }}>Current CREG approach</div>
            <ul style={{ fontSize: 14, color: C.muted, lineHeight: 2.1, paddingLeft: 20, margin: 0 }}>
              <li>Fixed CREG rate × estimated kWh</li>
              <li>Updated quarterly — lags real market</li>
              <li>No knowledge of when employee charges</li>
              <li>Overpays cheap months, underpays expensive months</li>
              <li>No audit trail for tax authorities or social secretariaten</li>
            </ul>
          </div>
          <div style={{ background: "rgba(22,163,74,0.04)", border: "1px solid rgba(22,163,74,0.2)", borderRadius: 20, padding: "28px 32px" }}>
            <div style={{ fontSize: 26, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.primary, marginBottom: 12 }}>SmartPrice Business</div>
            <ul style={{ fontSize: 14, color: C.muted, lineHeight: 2.1, paddingLeft: 20, margin: 0 }}>
              <li>Real EPEX Spot price at exact charge time</li>
              <li>Updated every 15 minutes — always accurate</li>
              <li>Tracks actual kWh per employee session</li>
              <li>Fair and correct for both employer and employee</li>
              <li>Full audit trail — CIR 92 compliant, accepted by all secretariaten</li>
            </ul>
          </div>
        </div>

        <SectionDivider label="ROI Calculator" />
        {/* ── ROI CALCULATOR ────────────────────────────────────────── */}
        <div style={{ background: C.card, borderRadius: 24, border: `1px solid ${C.border}`, boxShadow: C.shadow, overflow: "hidden", marginBottom: 64 }}>
          <div style={{ background: "linear-gradient(135deg,#15803D,#16A34A)", padding: "28px 36px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>Smart Audit · ROI Calculator</div>
            <h3 style={{ fontSize: "clamp(20px,3vw,30px)", fontWeight: 900, color: "#fff", marginBottom: 6, letterSpacing: "-0.5px" }}>How much is your fleet overpaying — and is your audit trail CIR 92-ready?</h3>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.65 }}>Based on CREG Q2 2026 (€{CREG_RATE}/kWh) vs. actual EPEX smart-charging average (€{EPEX_SMART}/kWh) · All figures exportable as a tax-authority audit report</p>
          </div>

          <div style={{ padding: "36px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 32, marginBottom: 36 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 10 }}>
                  EVs in your fleet: <strong style={{ color: C.primary }}>{fleetSize}</strong>
                </label>
                <input type="range" min={2} max={150} step={1} value={fleetSize} onChange={e => setFleetSize(+e.target.value)}
                  style={{ width: "100%", accentColor: C.primary, cursor: "pointer" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.light, marginTop: 4 }}><span>2</span><span>150</span></div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 10 }}>
                  Avg. monthly km per car: <strong style={{ color: C.primary }}>{monthlyKm.toLocaleString()} km</strong>
                </label>
                <input type="range" min={300} max={4000} step={100} value={monthlyKm} onChange={e => setMonthlyKm(+e.target.value)}
                  style={{ width: "100%", accentColor: C.primary, cursor: "pointer" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.light, marginTop: 4 }}><span>300 km</span><span>4,000 km</span></div>
              </div>
            </div>

            {/* Result display */}
            <div style={{ background: "linear-gradient(135deg,rgba(22,163,74,0.06),rgba(34,197,94,0.03))", border: `1px solid rgba(22,163,74,0.2)`, borderRadius: 20, padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24, marginBottom: 28 }}>
              <div>
                <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Estimated annual fleet savings with SmartPrice</div>
                <div style={{ fontSize: "clamp(40px,6vw,64px)", fontWeight: 900, color: C.primary, fontFamily: "monospace", letterSpacing: "-3px", lineHeight: 1 }}>
                  €{annualSaving.toLocaleString()}
                </div>
                <div style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>= €{perCarSaving.toLocaleString()} per car per year · {fleetSize} cars</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Monthly kWh per car", val: `${Math.round(kwhPerCarPerMonth).toLocaleString()} kWh` },
                  { label: "Saving per kWh",      val: `€${SAVING_KWH}/kWh` },
                  { label: "Saving rate",          val: `~${Math.round((SAVING_KWH / CREG_RATE) * 100)}% of CREG rate` },
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
                Get a Detailed Cost Audit →
              </button>
              <div style={{ fontSize: 12, color: C.light, marginTop: 10 }}>Personalised PDF ready to share with your CFO · Free · No spam</div>
            </div>
          </div>
        </div>

        <SectionDivider label="Smart tools · Smart services" />
        {/* ── 3-COLUMN FEATURE GRID (Belgian context) ───────────────── */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.primary, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Smart tools · Smart services</div>
          <h2 style={{ fontSize: "clamp(24px,3.5vw,38px)", fontWeight: 900, color: C.text, letterSpacing: "-0.8px", marginBottom: 10 }}>Built for the Belgian corporate market</h2>
          <p style={{ fontSize: 15, color: C.muted, maxWidth: 500, margin: "0 auto", lineHeight: 1.85 }}>Every feature is designed around Belgian tax law, payroll systems, and grid regulations.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20, marginBottom: 52 }}>
          {[
            {
              icon: "📤", accent: C.primary,
              title: "Automated Social Secretariat Exports",
              badge: "Coming Q3 2026", badgeCol: C.amber,
              desc: "Export monthly employee charging reports formatted perfectly for SD Worx, Liantis, Securex, and Acerta. Eliminate manual Excel tracking and avoid payroll errors.",
              cta: "Join waitlist →", href: "#contact",
            },
            {
              icon: "⚖️", accent: "#0EA5E9",
              title: "CREG vs. EPEX Intelligence",
              badge: "Live now", badgeCol: C.primary,
              desc: "Automatically detect whether an employee is on a dynamic or fixed-rate tariff. Ensure corporate reimbursements are legally exact to avoid social contribution penalties under CIR 92.",
              cta: "See how it works →", href: "/fleet-audit",
            },
            {
              icon: "🔌", accent: C.purple,
              title: "Smart Connect — Fleet Throttling",
              badge: "Beta", badgeCol: C.purple,
              desc: "Intelligently manage EV charging speeds via the HACS integration so employee home grids never breach the Flemish Capaciteitstarief thresholds — protecting them from grid bill surprises.",
              cta: "Explore Smart Connect →", href: "https://github.com/saipavangit21/smartprice-ha",
            },
            {
              icon: "🚗", accent: C.amber,
              title: "Smart Audit — Instant Overpayment Report",
              badge: "Free", badgeCol: C.bright,
              desc: "Enter your fleet size and current reimbursement rate. Instantly see your annual overpayment versus the live EPEX average — with a downloadable PDF ready to share with your CFO or HR director.",
              cta: "Start Smart Audit →", href: "/fleet-audit",
            },
            {
              icon: "📡", accent: C.muted,
              title: "Smart API — REST Integration",
              badge: "Free", badgeCol: C.bright,
              desc: "Live EPEX Spot Belgium prices via public REST API. No API key required. Integrate directly into your existing fleet management platform, ERP system, or mobility application.",
              cta: "View Smart API →", href: "/api-docs",
            },
            {
              icon: "📊", accent: "#0EA5E9",
              title: "Smart Reimburse — Per-Session Dashboard",
              badge: "Coming Q3 2026", badgeCol: C.amber,
              desc: "Each employee logs a charge session (time + kWh). SmartPrice looks up the EPEX price at that exact hour and calculates the exact reimbursement — exported directly to your payroll system.",
              cta: "Join waitlist →", href: "#contact",
            },
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
              <a href={p.href} style={{ display: "inline-block", padding: "8px 18px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: `${p.accent}10`, border: `1px solid ${p.accent}28`, color: p.accent, textDecoration: "none" }}>{p.cta}</a>
            </div>
          ))}
        </div>

        <SectionDivider label="Payroll integrations" />
        {/* ── SOCIAL SECRETARIATEN ──────────────────────────────────── */}
        <div style={{ background: C.card, borderRadius: 22, border: `1px solid ${C.border}`, boxShadow: C.shadow, padding: "30px 36px", marginBottom: 40, textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 22 }}>Works with your existing payroll systems</div>
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
            ✅ SmartPrice reimbursement calculations are <strong style={{ color: C.text }}>CIR 92 compliant</strong> and accepted by all Belgian social secretariaten
          </div>
        </div>

        <SectionDivider label="Security & compliance" />
        {/* ── GDPR & ENTERPRISE SECURITY ────────────────────────────── */}
        <div style={{ marginBottom: 52 }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.primary, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Enterprise security & privacy</div>
            <h2 style={{ fontSize: "clamp(22px,3vw,34px)", fontWeight: 900, color: C.text, letterSpacing: "-0.5px", marginBottom: 10 }}>Your employees' data stays private</h2>
            <p style={{ fontSize: 15, color: C.muted, maxWidth: 520, margin: "0 auto", lineHeight: 1.85 }}>Belgian companies need confidence that connecting employee home charging data is safe. Here is exactly how we protect it.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
            {[
              {
                icon: "🛡️", accent: C.primary,
                title: "GDPR Compliant by Design",
                desc: "Employee home location, private energy contract details, and personal charging schedules are fully isolated per employer account and are never stored in raw form or shared with third parties.",
              },
              {
                icon: "🇪🇺", accent: "#0EA5E9",
                title: "EU-Only Infrastructure",
                desc: "All cloud processing, database storage, and data-in-transit takes place exclusively on European nodes (Vercel EU West — Frankfurt, Ireland). No data ever leaves the EU.",
              },
              {
                icon: "🔒", accent: C.amber,
                title: "Secure OAuth 2.0 Authentication",
                desc: "Direct secure token authentication with all connected APIs — no raw passwords are ever stored or transmitted. Tokens are scoped, short-lived, and revokable at any time.",
              },
              {
                icon: "📋", accent: C.purple,
                title: "CIR 92 Audit Trail",
                desc: "Every reimbursement calculation is logged with a timestamp, EPEX price source, kWh amount, and employee ID. Full exportable audit trail for tax authorities and social secretariaten.",
              },
            ].map(t => (
              <div key={t.title} style={{ background: C.card, borderRadius: 18, border: `1.5px solid ${t.accent}18`, boxShadow: C.shadow, padding: "24px 26px" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${t.accent}12`, border: `1px solid ${t.accent}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 16 }}>{t.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 8 }}>{t.title}</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.8 }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CONTACT / CTA ──────────────────────────────────────────── */}
        <div id="contact" style={{ background: "linear-gradient(135deg, #15803D, #16A34A)", borderRadius: 24, padding: "44px 40px", color: "#fff", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 14 }}>📩</div>
          <h3 style={{ fontSize: "clamp(20px,3vw,30px)", fontWeight: 900, marginBottom: 10, letterSpacing: "-0.5px" }}>Ready to stop overpaying?</h3>
          <p style={{ fontSize: 15, opacity: 0.82, marginBottom: 32, maxWidth: 480, margin: "0 auto 32px", lineHeight: 1.75 }}>
            We'll generate your CIR 92-ready fleet cost report — exact EPEX vs CREG delta, per employee, exportable to your payroll provider — and reach out within 1 business day.
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
          <a href="/api-docs" style={{ color: C.muted, textDecoration: "none", fontWeight: 600, fontSize: 13 }}>API & HA</a>
          <a href="mailto:info@smartprice.be" style={{ color: C.muted, textDecoration: "none", fontWeight: 600, fontSize: 13 }}>info@smartprice.be</a>
        </div>
        <div>🛡️ GDPR Compliant · 🇪🇺 EU Hosted · 🔒 OAuth 2.0 · CIR 92 Compliant</div>
      </div>
    </div>
  );
}
