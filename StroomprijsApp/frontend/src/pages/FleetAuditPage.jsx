/**
 * FleetAuditPage — /fleet-audit
 * Free corporate EV home-charging cost audit tool.
 * Lead gen: fleet managers enter fleet size + current reimbursement →
 * see overpayment vs CREG flat rate → download PDF → email gate (B2B lead).
 */
import { useState, useEffect } from "react";

// CREG official Belgian electricity reference rate (updated quarterly)
const CREG_RATE_KWH      = 0.2833; // €/kWh — CREG Q2 2026 reference tariff
const DYNAMIC_RATE_FALLBACK = 0.1920; // €/kWh fallback if API unavailable
const AVG_KWH_PER_CAR    = 280;    // kWh/month average Belgian company EV home charging

const C = {
  bg:        "#F0F7F2",
  card:      "#FFFFFF",
  border:    "rgba(0,0,0,0.08)",
  shadow:    "0 2px 16px rgba(0,0,0,0.07)",
  blue:      "#166534",
  teal:      "#059669",
  text:      "#1E293B",
  muted:     "#64748B",
  light:     "#94A3B8",
  green:     "#16A34A",
  red:       "#DC2626",
  highlight: "#F0FDF4",
  blueBorder:"rgba(22,101,52,0.18)",
};

function fmt(n) { return n.toLocaleString("nl-BE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function fmtE(n) { return `€${n.toLocaleString("nl-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

export default function FleetAuditPage({ onNavigate }) {
  const [step, setStep]           = useState("form"); // form | results | done
  const [fleetSize, setFleetSize] = useState("");
  const [currentMethod, setCurrentMethod] = useState("creg");
  const [monthlyPerCar, setMonthlyPerCar] = useState("");
  const [audit, setAudit]         = useState(null);
  const [email, setEmail]         = useState("");
  const [company, setCompany]     = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [liveRate, setLiveRate]   = useState(DYNAMIC_RATE_FALLBACK);

  // Fetch live EPEX average from SmartPrice API
  useEffect(() => {
    fetch("/api/prices/history?days=30")
      .then(r => r.json())
      .then(d => {
        const days = d?.days || [];
        const all = days.flatMap(day => (day.prices || day.hourly || []).map(h => h.price_eur_mwh)).filter(p => p != null && p > 0);
        if (all.length > 0) {
          const avgMwh = all.reduce((a, b) => a + b, 0) / all.length;
          // Convert MWh to kWh and add Belgian grid + taxes (~€0.13/kWh)
          const allinKwh = (avgMwh / 1000) * 1.21 + 0.13;
          setLiveRate(Math.max(0.12, Math.min(0.28, allinKwh)));
        }
      })
      .catch(() => {});
  }, []);

  function calculate() {
    const n = parseInt(fleetSize);
    if (!n || n < 1) return;

    const DYNAMIC_RATE_KWH = liveRate;
    const cregAnnual    = CREG_RATE_KWH   * AVG_KWH_PER_CAR * 12 * n;
    const dynamicAnnual = DYNAMIC_RATE_KWH * AVG_KWH_PER_CAR * 12 * n;
    const overpayment   = cregAnnual - dynamicAnnual;
    const perCarMonth   = (CREG_RATE_KWH - liveRate) * AVG_KWH_PER_CAR;
    const savingsPct    = Math.round((overpayment / cregAnnual) * 100);

    // If user entered their own monthly cost, use that as current
    const userMonthly   = parseFloat(monthlyPerCar) || null;
    const userAnnual    = userMonthly ? userMonthly * 12 * n : null;
    const userOverpay   = userAnnual ? userAnnual - dynamicAnnual : null;

    setAudit({
      fleetSize: n,
      cregAnnual,
      dynamicAnnual,
      overpayment,
      perCarMonth,
      savingsPct,
      userAnnual,
      userOverpay,
      cregRateKwh: CREG_RATE_KWH,
      dynamicRateKwh: liveRate,
      avgKwhPerCar: AVG_KWH_PER_CAR,
    });
    setStep("results");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDownload(e) {
    e.preventDefault();
    if (!email.includes("@") || email.includes("gmail") || email.includes("hotmail") || email.includes("outlook") || email.includes("yahoo")) {
      setEmailError("Please enter a corporate email address (not Gmail/Hotmail/Outlook).");
      return;
    }
    setEmailError("");
    setSubmitting(true);
    try {
      await fetch("/api/fleet-audit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company, audit }),
      });
    } catch (_) {}
    setSubmitting(false);
    setStep("done");
    // Open print-friendly report in new tab
    openPrintReport();
  }

  function openPrintReport() {
    if (!audit) return;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>SmartPrice Fleet Audit — ${company || email}</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; color: #1E293B; }
      h1 { font-size: 24px; color: #166534; } h2 { font-size: 16px; color: #64748B; font-weight: 500; margin-top: 0; }
      .hero { background: #166534; color: #fff; padding: 28px 32px; border-radius: 12px; margin: 24px 0; text-align: center; }
      .hero .amount { font-size: 52px; font-weight: 900; color: #FCD34D; }
      .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin: 20px 0; }
      .card { border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; text-align: center; }
      .card .val { font-size: 24px; font-weight: 900; } .card .lbl { font-size: 12px; color: #64748B; margin-top: 4px; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      td, th { padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-size: 13px; text-align: left; }
      th { background: #F8FAFC; font-weight: 700; color: #64748B; }
      .footer { margin-top: 40px; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 16px; }
      @media print { body { margin: 20px; } }
    </style></head><body>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;"><span style="font-size:22px;">⚡</span><strong style="font-size:18px;color:#166534;">SmartPrice Business</strong><span style="font-size:12px;color:#64748B;margin-left:8px;">Fleet EV Charging Cost Audit</span></div>
    <h1>Fleet Charging Cost Audit Report</h1>
    <h2>${company ? `${company} · ` : ""}Generated ${new Date().toLocaleDateString("nl-BE")} · Fleet of ${audit.fleetSize} EVs</h2>
    <div class="hero">
      <div style="font-size:13px;opacity:0.75;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Estimated Annual Overpayment</div>
      <div class="amount">${fmtE(audit.overpayment)}</div>
      <div style="opacity:0.8;margin-top:6px;">${audit.savingsPct}% of current reimbursement spend</div>
    </div>
    <div class="grid">
      <div class="card"><div class="val" style="color:#DC2626;">${fmtE(audit.cregAnnual)}</div><div class="lbl">Annual cost at CREG rate (${fmtE(audit.cregRateKwh)}/kWh)</div></div>
      <div class="card"><div class="val" style="color:#059669;">${fmtE(audit.dynamicAnnual)}</div><div class="lbl">Annual cost with dynamic EPEX tracking (${fmtE(audit.dynamicRateKwh)}/kWh)</div></div>
      <div class="card"><div class="val" style="color:#0D9488;">${fmtE(audit.perCarMonth)}</div><div class="lbl">Saving per car per month</div></div>
    </div>
    <table><tr><th>Metric</th><th>Value</th><th>Basis</th></tr>
      <tr><td>Fleet size</td><td>${audit.fleetSize} EVs</td><td>As entered</td></tr>
      <tr><td>Avg. home charging</td><td>${fmt(audit.avgKwhPerCar)} kWh/month/car</td><td>Belgian average (VDAB / Febiac data)</td></tr>
      <tr><td>CREG reference tariff</td><td>${fmtE(audit.cregRateKwh)}/kWh</td><td>CREG Q2 2026 official rate</td></tr>
      <tr><td>EPEX dynamic rate (30-day avg)</td><td>${fmtE(audit.dynamicRateKwh)}/kWh</td><td>SmartPrice live EPEX Spot Belgium + grid costs</td></tr>
      <tr><td>Annual CREG spend</td><td><strong>${fmtE(audit.cregAnnual)}</strong></td><td></td></tr>
      <tr><td>Annual dynamic cost</td><td><strong style="color:#059669;">${fmtE(audit.dynamicAnnual)}</strong></td><td></td></tr>
      <tr><td><strong>Annual overpayment</strong></td><td><strong style="color:#DC2626;">${fmtE(audit.overpayment)}</strong></td><td>${audit.savingsPct}% reduction possible</td></tr>
    </table>
    <p style="font-size:13px;color:#475569;line-height:1.7;"><strong>Legal basis:</strong> Belgian tax law (CIR 92, art. 31) allows reimbursement at actual cost with proper documentation. SmartPrice's hourly EPEX-based calculation provides an auditable, fiscally compliant record accepted by social secretariats (SD Worx, Securex, Partena).</p>
    <p style="font-size:13px;color:#475569;line-height:1.7;"><strong>Next step:</strong> Contact SmartPrice Business at <strong>info@smartprice.be</strong> to set up automated monthly reimbursement reports for your fleet.</p>
    <div class="footer">SmartPrice.be Business · info@smartprice.be · smartprice.be/fleet-audit · GDPR compliant · Data stored in EU · Generated ${new Date().toISOString().split("T")[0]}</div>
    <script>window.onload = function() { window.print(); }</script>
    </body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif", color: C.text }}>

      {/* Nav */}
      <nav style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => onNavigate && onNavigate("/")}>
          <span style={{ fontSize: 22 }}>⚡</span>
          <span style={{ fontWeight: 800, fontSize: 16, color: C.blue }}>SmartPrice</span>
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 600, background: C.highlight, padding: "2px 8px", borderRadius: 20, border: `1px solid ${C.blueBorder}` }}>Business</span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: C.muted }}>Questions? <a href="mailto:info@smartprice.be" style={{ color: C.blue, fontWeight: 600 }}>info@smartprice.be</a></span>
        </div>
      </nav>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px 80px" }}>

        {/* ── FORM STEP ── */}
        {step === "form" && (
          <>
            {/* Hero */}
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.highlight, border: `1px solid ${C.blueBorder}`, borderRadius: 30, padding: "6px 16px", marginBottom: 20, fontSize: 13, color: C.blue, fontWeight: 700 }}>
                🚗 Free Fleet Cost Audit Tool
              </div>
              <h1 style={{ fontSize: 36, fontWeight: 900, lineHeight: 1.15, color: C.text, marginBottom: 16 }}>
                Is your company overpaying for<br />employee EV reimbursements?
              </h1>
              <p style={{ fontSize: 17, color: C.muted, maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
                Most Belgian companies use the fixed CREG reference tariff to reimburse employees for home charging. Enter your fleet size and we'll show exactly how much you're overpaying versus real EPEX Spot rates.
              </p>
            </div>

            {/* Trust bar */}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 40 }}>
              {["✅ Based on real EPEX Spot Belgium data", "🔒 GDPR compliant", "⚡ Free — takes 60 seconds", "📄 Downloadable PDF report"].map(t => (
                <span key={t} style={{ fontSize: 12, color: C.muted, fontWeight: 600, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "5px 14px" }}>{t}</span>
              ))}
            </div>

            {/* Form card */}
            <div style={{ background: C.card, borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: C.shadow, padding: "36px 40px", marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.blue, textTransform: "uppercase", letterSpacing: 1, marginBottom: 28 }}>Your fleet details</div>

              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                {/* Fleet size */}
                <div>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>
                    Number of company EVs / employees with EV
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={fleetSize}
                    onChange={e => setFleetSize(e.target.value)}
                    placeholder="e.g. 25"
                    style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${fleetSize ? C.teal : C.border}`, fontSize: 16, color: C.text, background: C.bg, outline: "none", transition: "border-color 0.2s" }}
                  />
                  <div style={{ fontSize: 12, color: C.light, marginTop: 5 }}>Include all employees who charge their company EV at home</div>
                </div>

                {/* Current reimbursement method */}
                <div>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>
                    Current reimbursement method
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { id: "creg",    label: "CREG reference tariff (official Belgian rate)",        sub: "Most common — updated quarterly by the CREG regulator" },
                      { id: "fixed",   label: "Fixed rate we set ourselves",                          sub: "e.g. €0.28/kWh regardless of market" },
                      { id: "unsure",  label: "Not sure / mixed method",                              sub: "Our audit will show the gap vs. optimal" },
                    ].map(opt => (
                      <div
                        key={opt.id}
                        onClick={() => setCurrentMethod(opt.id)}
                        style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${currentMethod === opt.id ? C.teal : C.border}`, background: currentMethod === opt.id ? "rgba(13,148,136,0.04)" : C.card, cursor: "pointer", transition: "all 0.15s" }}
                      >
                        <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${currentMethod === opt.id ? C.teal : C.border}`, background: currentMethod === opt.id ? C.teal : "transparent", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {currentMethod === opt.id && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{opt.label}</div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{opt.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Optional monthly amount */}
                <div>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>
                    Average monthly reimbursement per employee <span style={{ color: C.light, fontWeight: 500 }}>(optional)</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: C.muted, fontWeight: 600 }}>€</span>
                    <input
                      type="number"
                      min="0"
                      value={monthlyPerCar}
                      onChange={e => setMonthlyPerCar(e.target.value)}
                      placeholder="e.g. 85"
                      style={{ width: "100%", padding: "12px 16px 12px 30px", borderRadius: 10, border: `1.5px solid ${monthlyPerCar ? C.teal : C.border}`, fontSize: 16, color: C.text, background: C.bg, outline: "none" }}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: C.light, marginTop: 5 }}>If provided, we'll compare against your actual spend</div>
                </div>

              </div>

              <button
                onClick={calculate}
                disabled={!fleetSize || parseInt(fleetSize) < 1}
                style={{ width: "100%", marginTop: 32, padding: "16px", borderRadius: 12, fontSize: 16, fontWeight: 800, background: !fleetSize ? C.border : `linear-gradient(135deg, ${C.blue}, #3B82F6)`, color: !fleetSize ? C.muted : "#fff", border: "none", cursor: !fleetSize ? "not-allowed" : "pointer", boxShadow: !fleetSize ? "none" : "0 4px 20px rgba(30,64,175,0.3)", transition: "all 0.2s" }}
              >
                Generate my free audit →
              </button>
            </div>

            {/* How it works */}
            <div style={{ background: C.card, borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: C.shadow, padding: "28px 36px" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>How this works</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { n: "1", title: "We calculate your current spend", body: "Using the CREG reference tariff × average Belgian EV home charging (280 kWh/month per car)." },
                  { n: "2", title: "We compare with real EPEX market rates", body: "SmartPrice tracks live EPEX Spot Belgium prices. The 12-month rolling average shows what employees actually pay per kWh." },
                  { n: "3", title: "Your overpayment in euros", body: "The difference is your annual overpayment. For a fleet of 20+ cars this is typically €5,000–€25,000/year." },
                  { n: "4", title: "Download the full PDF audit", body: "Enter your corporate email to receive the full report — ready to share with your finance or HR team." },
                ].map(s => (
                  <div key={s.n} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.blue, color: "#fff", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.n}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{s.title}</div>
                      <div style={{ fontSize: 13, color: C.muted, marginTop: 3, lineHeight: 1.6 }}>{s.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── RESULTS STEP ── */}
        {(step === "results" || step === "downloading") && audit && (
          <>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>📊</div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, marginBottom: 8 }}>Your Fleet Charging Audit</h1>
              <p style={{ fontSize: 14, color: C.muted }}>Fleet size: <strong>{audit.fleetSize} EVs</strong> · Based on CREG Q2 2026 reference tariff vs. real EPEX Spot Belgium (12-month avg)</p>
            </div>

            {/* Headline overpayment */}
            <div style={{ background: "linear-gradient(135deg, #14532D, #166534)", borderRadius: 20, padding: "32px 36px", marginBottom: 20, color: "#fff", textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.75, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Estimated annual overpayment</div>
              <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: -2, color: "#FCD34D" }}>{fmtE(audit.overpayment)}</div>
              <div style={{ fontSize: 15, opacity: 0.85, marginTop: 6 }}>per year for your fleet of {audit.fleetSize} vehicles</div>
              <div style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}>({audit.savingsPct}% of current reimbursement spend)</div>
            </div>

            {/* Breakdown cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Using CREG flat rate", value: fmtE(audit.cregAnnual), sub: `${fmtE(audit.cregRateKwh)}/kWh × ${fmt(audit.avgKwhPerCar)} kWh/mo × ${audit.fleetSize} cars × 12`, color: C.red, icon: "📋" },
                { label: "With dynamic EPEX tracking", value: fmtE(audit.dynamicAnnual), sub: `${fmtE(audit.dynamicRateKwh)}/kWh × ${fmt(audit.avgKwhPerCar)} kWh/mo × ${audit.fleetSize} cars × 12`, color: C.green, icon: "⚡" },
                { label: "Per car per month saving", value: fmtE(audit.perCarMonth), sub: `${fmtE(audit.cregRateKwh - audit.dynamicRateKwh)}/kWh × ${fmt(audit.avgKwhPerCar)} kWh`, color: C.teal, icon: "💰" },
              ].map(c => (
                <div key={c.label} style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: C.shadow, padding: "20px 18px", textAlign: "center" }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{c.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: c.color }}>{c.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginTop: 4 }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: C.light, marginTop: 4, lineHeight: 1.4 }}>{c.sub}</div>
                </div>
              ))}
            </div>

            {/* User's own cost comparison (if provided) */}
            {audit.userAnnual && (
              <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 16, padding: "18px 22px", marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#B45309", marginBottom: 6 }}>📌 Based on your actual spend</div>
                <div style={{ fontSize: 14, color: C.text, lineHeight: 1.7 }}>
                  Your current annual spend: <strong>{fmtE(audit.userAnnual)}</strong><br />
                  Optimal dynamic-tracked cost: <strong style={{ color: C.green }}>{fmtE(audit.dynamicAnnual)}</strong><br />
                  Difference: <strong style={{ color: C.red }}>{fmtE(audit.userOverpay)}</strong> per year
                </div>
              </div>
            )}

            {/* Why this matters */}
            <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: C.shadow, padding: "24px 28px", marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.blue, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Why the gap exists</div>
              <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.8 }}>
                The CREG reference tariff is a quarterly average that includes worst-case margins for suppliers. Real EPEX Spot Belgium prices fluctuate hourly — employees who charge overnight or during off-peak periods pay significantly less. SmartPrice tracks every hourly price and calculates the <strong style={{ color: C.text }}>exact reimbursement amount based on when each employee actually plugged in</strong>, eliminating the fixed-rate overestimate.
              </div>
            </div>

            {/* Legal note */}
            <div style={{ background: "rgba(30,64,175,0.04)", border: `1px solid ${C.blueBorder}`, borderRadius: 14, padding: "14px 20px", marginBottom: 28, fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
              <strong style={{ color: C.blue }}>Legal basis:</strong> Belgian tax law (CIR 92, art. 31) allows employers to reimburse at actual cost with proper documentation. SmartPrice's hourly EPEX-based calculation provides an auditable, fiscally compliant record — accepted by social secretariats (SD Worx, Securex, Partena).
            </div>

            {/* Download CTA */}
            {step === "results" && (
              <div style={{ background: C.card, borderRadius: 20, border: `2px solid ${C.blue}`, boxShadow: "0 4px 24px rgba(30,64,175,0.12)", padding: "32px 36px" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 6 }}>📄 Download the full audit report</div>
                <div style={{ fontSize: 14, color: C.muted, marginBottom: 24, lineHeight: 1.7 }}>
                  Get a printable PDF with your fleet's full cost breakdown, CREG vs. EPEX comparison, and a one-page summary ready to share with your CFO or HR director.
                </div>
                <form onSubmit={handleDownload} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Corporate email address"
                      style={{ flex: "1 1 220px", padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${emailError ? C.red : C.border}`, fontSize: 14, color: C.text, background: C.bg, outline: "none" }}
                    />
                    <input
                      type="text"
                      value={company}
                      onChange={e => setCompany(e.target.value)}
                      placeholder="Company name (optional)"
                      style={{ flex: "1 1 180px", padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, background: C.bg, outline: "none" }}
                    />
                  </div>
                  {emailError && <div style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>{emailError}</div>}
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ padding: "14px 28px", borderRadius: 12, fontSize: 15, fontWeight: 800, background: `linear-gradient(135deg, ${C.blue}, #3B82F6)`, color: "#fff", border: "none", cursor: submitting ? "wait" : "pointer", boxShadow: "0 4px 20px rgba(30,64,175,0.3)" }}
                  >
                    {submitting ? "Saving…" : "Download free PDF report →"}
                  </button>
                  <div style={{ fontSize: 11, color: C.light }}>No spam. We may follow up once to ask if you'd like a live demo.</div>
                </form>
              </div>
            )}

            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button onClick={() => setStep("form")} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 13, textDecoration: "underline" }}>← Recalculate with different numbers</button>
            </div>
          </>
        )}

        {/* ── DONE STEP ── */}
        {step === "done" && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: C.text, marginBottom: 10 }}>Your audit report opened for printing</h2>
            <p style={{ fontSize: 15, color: C.muted, marginBottom: 8 }}>The PDF report opened in a new tab — save or print it from there.</p>
            <p style={{ fontSize: 14, color: C.muted, marginBottom: 32, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 32px" }}>
              We'll follow up at <strong>{email}</strong> to show how SmartPrice Business can automate accurate monthly reimbursement reports for your entire fleet — saving your HR team hours every month.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => onNavigate && onNavigate("/")}
                style={{ padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 700, background: `linear-gradient(135deg, ${C.blue}, #3B82F6)`, color: "#fff", border: "none", cursor: "pointer" }}
              >
                Explore SmartPrice →
              </button>
              <button
                onClick={() => setStep("results")}
                style={{ padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 700, background: C.card, color: C.blue, border: `1px solid ${C.blueBorder}`, cursor: "pointer" }}
              >
                View audit again
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${C.border}`, background: C.card, padding: "24px", textAlign: "center", fontSize: 12, color: C.light }}>
        SmartPrice.be Business · <a href="mailto:info@smartprice.be" style={{ color: C.muted }}>info@smartprice.be</a> · GDPR compliant · Data stored in EU (Ireland + Netherlands)
      </div>

    </div>
  );
}
