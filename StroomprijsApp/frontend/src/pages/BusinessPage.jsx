/**
 * BusinessPage — /business
 * SmartPrice for Business landing page.
 * Light corporate design, distinct from the dark personal dashboard.
 */
import { useState } from "react";

const C = {
  bg:        "#F7FEF9",
  card:      "#FFFFFF",
  border:    "rgba(0,0,0,0.08)",
  shadow:    "0 2px 16px rgba(0,0,0,0.07)",
  blue:      "#16A34A",   // primary: vivid eco-green
  teal:      "#22C55E",   // secondary: bright eco-green
  text:      "#1E293B",
  muted:     "#64748B",
  light:     "#94A3B8",
  green:     "#22C55E",
  highlight: "#DCFCE7",
  blueBorder:"rgba(22,163,74,0.2)",
  amber:     "#D97706",
  purple:    "#7C3AED",
};

export default function BusinessPage({ onNavigate }) {
  const [leadEmail, setLeadEmail]   = useState("");
  const [leadState, setLeadState]   = useState("idle");

  async function submitLead(e) {
    e.preventDefault();
    if (!leadEmail || leadState !== "idle") return;
    setLeadState("loading");
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: leadEmail, source: "business-page" }),
      });
      setLeadState("done");
    } catch { setLeadState("done"); }
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif", color: C.text }}>

      {/* Nav */}
      <nav style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => onNavigate && onNavigate("/")}>
          <span style={{ fontSize: 22 }}>⚡</span>
          <span style={{ fontWeight: 800, fontSize: 16, color: C.text }}>SmartPrice</span>
          <span style={{ fontSize: 12, color: C.blue, fontWeight: 700, background: C.highlight, padding: "2px 10px", borderRadius: 20, border: `1px solid ${C.blueBorder}` }}>Business</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href="/fleet-audit" style={{ padding: "8px 18px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: C.highlight, border: `1px solid ${C.blueBorder}`, color: C.blue, textDecoration: "none" }}>Free Fleet Audit →</a>
          <button onClick={() => onNavigate && onNavigate("/")} style={{ padding: "8px 18px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: C.teal, color: "#fff", border: "none", cursor: "pointer" }}>Live prices</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, #15803D 0%, #16A34A 55%, #22C55E 100%)`, color: "#fff", padding: "72px 24px 64px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 30, padding: "6px 18px", marginBottom: 24, fontSize: 13, fontWeight: 700 }}>
          🏢 SmartPrice for Business — Beta
        </div>
        <h1 style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 20, maxWidth: 700, margin: "0 auto 20px" }}>
          Stop overpaying for employee EV home charging
        </h1>
        <p style={{ fontSize: 18, opacity: 0.85, maxWidth: 560, margin: "0 auto 36px", lineHeight: 1.7 }}>
          Belgian companies using the CREG flat rate overpay by <strong>€300–500 per car per year</strong>. SmartPrice Business tracks real EPEX prices so you reimburse exactly what employees actually pay.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/fleet-audit" style={{ display: "inline-block", padding: "14px 32px", borderRadius: 30, fontSize: 15, fontWeight: 800, background: "#FCD34D", color: "#15803D", textDecoration: "none", boxShadow: "0 6px 24px rgba(0,0,0,0.2)" }}>
            Free fleet audit — see your overpayment →
          </a>
          <a href="#contact" style={{ display: "inline-block", padding: "14px 28px", borderRadius: 30, fontSize: 14, fontWeight: 700, background: "rgba(255,255,255,0.12)", color: "#fff", textDecoration: "none", border: "1px solid rgba(255,255,255,0.25)" }}>
            Request a demo
          </a>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "20px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 24, textAlign: "center" }}>
          {[
            { n: "€300–500", label: "overpayment per EV per year", accent: C.blue },
            { n: "CREG vs EPEX", label: "fixed rate vs. real market cost", accent: C.amber },
            { n: "100% compliant", label: "CIR 92 — accepted by all social secretariaten", accent: C.green },
            { n: "Free", label: "no subscription needed to audit", accent: C.teal },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.accent }}>{s.n}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 3, maxWidth: 140 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "52px 20px 80px" }}>

        {/* Problem */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.blue, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>The problem</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: C.text, marginBottom: 16 }}>How Belgian companies get the maths wrong</h2>
          <p style={{ fontSize: 16, color: C.muted, maxWidth: 580, margin: "0 auto", lineHeight: 1.8 }}>
            Every quarter the CREG publishes a reference electricity tariff. HR departments multiply this by estimated kWh and reimburse employees. It sounds fair — but it's not accurate.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 48 }}>
          <div style={{ background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.15)", borderRadius: 18, padding: "24px 28px" }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>❌</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#DC2626", marginBottom: 10 }}>Current approach</div>
            <ul style={{ fontSize: 14, color: C.muted, lineHeight: 2, paddingLeft: 18, margin: 0 }}>
              <li>CREG flat rate × estimated kWh</li>
              <li>Updated quarterly — lags reality</li>
              <li>No knowledge of when employee charges</li>
              <li>Overpays in cheap months, underpays in expensive months</li>
              <li>No audit trail for tax authorities</li>
            </ul>
          </div>
          <div style={{ background: "rgba(5,150,105,0.04)", border: "1px solid rgba(5,150,105,0.2)", borderRadius: 18, padding: "24px 28px" }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.green, marginBottom: 10 }}>SmartPrice Business</div>
            <ul style={{ fontSize: 14, color: C.muted, lineHeight: 2, paddingLeft: 18, margin: 0 }}>
              <li>Real EPEX Spot price at exact charge time</li>
              <li>Updated every hour — always accurate</li>
              <li>Tracks actual kWh per employee session</li>
              <li>Fair for both employer and employee</li>
              <li>Full audit trail — CIR 92 compliant</li>
            </ul>
          </div>
        </div>

        {/* Products */}
        <div style={{ fontSize: 11, fontWeight: 800, color: C.blue, textTransform: "uppercase", letterSpacing: 2, marginBottom: 20, textAlign: "center" }}>Smart tools · Smart services</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 52 }}>
          {[
            {
              icon: "🚗",
              title: "Smart Audit",
              badge: "Live now",
              badgeColor: C.green,
              desc: "Enter your fleet size. Instantly see your annual overpayment vs. the CREG rate — with a downloadable PDF ready to share with your CFO or HR director.",
              cta: "Start Smart Audit →",
              href: "/fleet-audit",
              accent: C.amber,
            },
            {
              icon: "📊",
              title: "Smart Reimburse",
              badge: "Coming Q3 2026",
              badgeColor: C.muted,
              desc: "Each employee logs a charge session (time + kWh). SmartPrice looks up the EPEX price at that exact hour and calculates the exact reimbursement. Monthly reports exported directly to your payroll system.",
              cta: "Join waitlist →",
              href: "#contact",
              accent: C.blue,
            },
            {
              icon: "🔌",
              title: "Smart Connect",
              badge: "Beta",
              badgeColor: C.purple,
              desc: "Install our HACS integration to automate office EV charging — automatically shift to cheapest EPEX windows, monitor fleet consumption in real time, export to your energy management system.",
              cta: "Explore Smart Connect →",
              href: "https://github.com/saipavangit21/smartprice-ha",
              accent: C.purple,
            },
            {
              icon: "📡",
              title: "Smart API",
              badge: "Free",
              badgeColor: C.teal,
              desc: "Live EPEX Spot Belgium prices via public REST API. No API key needed. Integrate into your own fleet management platform, ERP, or mobility application.",
              cta: "View Smart API docs →",
              href: "/api-docs",
              accent: C.teal,
            },
          ].map(p => (
            <div key={p.title} style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.border}`, boxShadow: C.shadow, padding: "24px 28px", display: "flex", alignItems: "flex-start", gap: 20 }}>
              <div style={{ fontSize: 32, flexShrink: 0 }}>{p.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{p.title}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: p.badgeColor, background: `${p.badgeColor}18`, border: `1px solid ${p.badgeColor}30`, borderRadius: 20, padding: "2px 10px" }}>{p.badge}</span>
                </div>
                <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 14 }}>{p.desc}</div>
                <a href={p.href} style={{ display: "inline-block", padding: "8px 20px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: `${p.accent}15`, border: `1px solid ${p.accent}30`, color: p.accent, textDecoration: "none" }}>{p.cta}</a>
              </div>
            </div>
          ))}
        </div>

        {/* Social secretariaten */}
        <div style={{ background: C.card, borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: C.shadow, padding: "28px 32px", marginBottom: 40, textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>Works with your existing systems</div>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
            {[
              { name: "SD Worx",  initials: "SD", color: "#E30613", bg: "#FEF2F2" },
              { name: "Securex",  initials: "SX", color: "#003DA5", bg: "#EFF6FF" },
              { name: "Partena",  initials: "PA", color: "#00A550", bg: "#F0FDF4" },
              { name: "Group S",  initials: "GS", color: "#6D28D9", bg: "#F5F3FF" },
              { name: "Acerta",   initials: "AC", color: "#0369A1", bg: "#F0F9FF" },
            ].map(s => (
              <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, border: `1.5px solid ${s.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, color: s.color, flexShrink: 0 }}>
                  {s.initials}
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{s.name}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: C.light, borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 4 }}>
            ✅ SmartPrice reimbursement calculations are <strong style={{ color: C.text }}>CIR 92 compliant</strong> and accepted by all Belgian social secretariaten
          </div>
        </div>

        {/* Contact / waitlist */}
        <div id="contact" style={{ background: `linear-gradient(135deg, #15803D, #16A34A)`, borderRadius: 24, padding: "40px 36px", color: "#fff", textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>📩</div>
          <h3 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>Get early access to the fleet dashboard</h3>
          <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 28, maxWidth: 440, margin: "0 auto 28px", lineHeight: 1.7 }}>
            Leave your corporate email and we'll reach out when the fleet reimbursement dashboard is ready. No spam — one email when it's live.
          </p>
          {leadState === "done" ? (
            <div style={{ fontSize: 15, fontWeight: 700, color: "#FCD34D" }}>✅ You're on the list — we'll be in touch!</div>
          ) : (
            <form onSubmit={submitLead} style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", maxWidth: 460, margin: "0 auto" }}>
              <input
                type="email"
                required
                value={leadEmail}
                onChange={e => setLeadEmail(e.target.value)}
                placeholder="Corporate email address"
                style={{ flex: "1 1 220px", padding: "12px 18px", borderRadius: 30, border: "none", fontSize: 14, color: C.text, background: "#fff", outline: "none" }}
              />
              <button
                type="submit"
                disabled={leadState === "loading"}
                style={{ padding: "12px 24px", borderRadius: 30, fontSize: 14, fontWeight: 800, background: "#FCD34D", color: "#15803D", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
              >
                {leadState === "loading" ? "Saving…" : "Get early access →"}
              </button>
            </form>
          )}
        </div>

      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${C.border}`, background: C.card, padding: "24px", textAlign: "center", fontSize: 12, color: C.light }}>
        SmartPrice.be · <a href="/" style={{ color: C.muted }}>Personal</a> · <a href="/fleet-audit" style={{ color: C.muted }}>Fleet Audit</a> · <a href="/api-docs" style={{ color: C.muted }}>API</a> · <a href="mailto:info@smartprice.be" style={{ color: C.muted }}>info@smartprice.be</a>
      </div>
    </div>
  );
}
