/**
 * LandingPage.jsx — StrooomSlim public landing page
 * Shown to logged-out visitors before auth
 */

const features = [
  {
    icon: "⚡",
    title: "Real-Time EPEX Prices",
    desc: "Live Belgium day-ahead electricity prices from EPEX Spot, updated every 15 minutes. Know exactly what you're paying right now.",
  },
  {
    icon: "💚",
    title: "5 Cheapest Hours Today",
    desc: "We find the best windows to run your EV, washing machine or dishwasher — saving you money every single day.",
  },
  {
    icon: "🔔",
    title: "Price Drop Alerts",
    desc: "Set a threshold and get an email when prices fall below it. Never miss cheap electricity again.",
  },
  {
    icon: "🏢",
    title: "All Major Suppliers",
    desc: "See your real retail price from Bolt Energy, Engie, TotalEnergies, EDF Luminus and Lampiris — based on live spot prices.",
  },
  {
    icon: "📅",
    title: "7-Day History",
    desc: "Understand price patterns over the past week. Plan your consumption around Belgium's energy market.",
  },
  {
    icon: "📱",
    title: "Works on Any Device",
    desc: "Mobile-first design. Install it on your phone like an app — no app store needed.",
  },
];

const faqs = [
  {
    q: "What is EPEX Spot?",
    a: "EPEX Spot is the European Power Exchange where electricity is traded on the wholesale market. In Belgium, many dynamic energy contracts directly follow these hourly prices — meaning your cost per kWh changes every hour.",
  },
  {
    q: "What is a dynamic electricity contract?",
    a: "A dynamic contract means your electricity price follows the EPEX Spot market price, changing every hour. Suppliers like Bolt Energy, Engie and others offer these. They can save you money if you shift consumption to cheap hours.",
  },
  {
    q: "How much can I actually save?",
    a: "On an average day in Belgium, the price difference between the cheapest and most expensive hour can be €100–150/MWh. For a 2kW appliance (washing machine, EV charger), that's €0.10–0.30 per hour saved — adding up to €100+ per year.",
  },
  {
    q: "Is this free?",
    a: "Yes, completely free. Price data comes from Energy-Charts.info and Elia Open Data — both open public sources licensed under CC BY 4.0.",
  },
  {
    q: "Is my data safe?",
    a: "All data is stored in the EU (GDPR compliant). We never sell your data or show ads. You can delete your account at any time.",
  },
];

export default function LandingPage({ onGetStarted }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#060B14",
      color: "#E8EDF5",
      fontFamily: "'DM Sans', system-ui, sans-serif",
      overflowX: "hidden",
    }}>

      {/* ── NAV ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(6,11,20,0.85)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "14px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🇧🇪</span>
          <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.5px" }}>StrooomSlim</span>
          <span style={{ fontSize: 10, color: "#00C896", background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.25)", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>● LIVE</span>
        </div>
        <button onClick={onGetStarted} style={{
          padding: "9px 22px", borderRadius: 30, fontSize: 13, fontWeight: 700,
          background: "linear-gradient(135deg,#0D9488,#1A56A4)",
          border: "none", color: "#fff", cursor: "pointer",
          boxShadow: "0 4px 20px rgba(13,148,136,0.35)",
        }}>
          Get Started Free →
        </button>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        maxWidth: 900, margin: "0 auto",
        padding: "80px 24px 60px",
        textAlign: "center",
        position: "relative",
      }}>
        {/* Background glow */}
        <div style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: 600, height: 400,
          background: "radial-gradient(ellipse, rgba(13,148,136,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ fontSize: 13, color: "#0D9488", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 20 }}>
          Belgium · Real-Time Electricity Prices
        </div>

        <h1 style={{
          fontSize: "clamp(36px, 6vw, 68px)",
          fontWeight: 900, letterSpacing: "-2px", lineHeight: 1.05,
          margin: "0 0 24px",
          background: "linear-gradient(135deg, #ffffff 30%, #0D9488 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Stop Overpaying<br />for Electricity
        </h1>

        <p style={{
          fontSize: "clamp(16px, 2.5vw, 20px)", color: "#778",
          maxWidth: 580, margin: "0 auto 40px", lineHeight: 1.7,
        }}>
          Track live EPEX Spot prices, find the 5 cheapest hours every day,
          and get email alerts when prices drop — completely free for Belgian households.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onGetStarted} style={{
            padding: "16px 36px", borderRadius: 50, fontSize: 16, fontWeight: 800,
            background: "linear-gradient(135deg,#0D9488,#1A56A4)",
            border: "none", color: "#fff", cursor: "pointer",
            boxShadow: "0 8px 32px rgba(13,148,136,0.4)",
            transform: "translateY(0)", transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(13,148,136,0.5)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(13,148,136,0.4)"; }}
          >
            Start for Free →
          </button>
          <button onClick={onGetStarted} style={{
            padding: "16px 36px", borderRadius: 50, fontSize: 16, fontWeight: 700,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
            color: "#aaa", cursor: "pointer", transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#aaa"; }}
          >
            Sign In
          </button>
        </div>

        <div style={{ marginTop: 24, fontSize: 12, color: "#334" }}>
          Free forever · No credit card · GDPR compliant · Data stored in EU
        </div>
      </section>

      {/* ── LIVE PRICE TICKER ── */}
      <section style={{ maxWidth: 900, margin: "0 auto 60px", padding: "0 24px" }}>
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 20, padding: "24px 28px",
          display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 11, color: "#445", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Live EPEX Spot · Belgium</div>
            <div style={{ fontSize: 13, color: "#556" }}>Prices update every hour · Day-ahead market</div>
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[
              { label: "Today Min", color: "#00C896", ex: "~€40" },
              { label: "Today Avg", color: "#F59E0B", ex: "~€95" },
              { label: "Today Max", color: "#EF4444", ex: "~€160" },
              { label: "Negative hrs", color: "#00E5FF", ex: "0–4h" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#445", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: "monospace" }}>{s.ex}</div>
              </div>
            ))}
          </div>
          <button onClick={onGetStarted} style={{
            padding: "10px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700,
            background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.3)",
            color: "#00C896", cursor: "pointer",
          }}>
            See Live Prices →
          </button>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ maxWidth: 900, margin: "0 auto 80px", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 11, color: "#0D9488", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12 }}>Features</div>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 900, letterSpacing: "-1px", margin: 0 }}>
            Everything you need to<br />pay less for electricity
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 18, padding: "24px 22px",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(13,148,136,0.06)"; e.currentTarget.style.border = "1px solid rgba(13,148,136,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.border = "1px solid rgba(255,255,255,0.07)"; }}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#E8EDF5" }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "#667", lineHeight: 1.7 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{
        background: "rgba(255,255,255,0.015)",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        padding: "64px 24px", marginBottom: 80,
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 11, color: "#0D9488", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12 }}>How It Works</div>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 900, letterSpacing: "-1px", margin: 0 }}>Up and running in 60 seconds</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 0 }}>
            {[
              { n: "1", title: "Create free account", desc: "Sign up with email or Google. No credit card needed." },
              { n: "2", title: "Select your supplier", desc: "Choose from Bolt, Engie, TotalEnergies, EDF or Lampiris." },
              { n: "3", title: "Check live prices", desc: "See today's hourly prices and the 5 cheapest windows." },
              { n: "4", title: "Set an alert", desc: "Get emailed when prices drop below your threshold." },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "center", padding: "0 20px", position: "relative" }}>
                {i < 3 && (
                  <div style={{ position: "absolute", right: 0, top: 20, width: 1, height: 60, background: "rgba(255,255,255,0.06)", display: "none" }} />
                )}
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: "linear-gradient(135deg,#0D9488,#1A56A4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: 900, color: "#fff",
                  margin: "0 auto 16px",
                }}>{s.n}</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: "#667", lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <button onClick={onGetStarted} style={{
              padding: "14px 40px", borderRadius: 50, fontSize: 15, fontWeight: 800,
              background: "linear-gradient(135deg,#0D9488,#1A56A4)",
              border: "none", color: "#fff", cursor: "pointer",
              boxShadow: "0 8px 32px rgba(13,148,136,0.4)",
            }}>
              Create Free Account →
            </button>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ maxWidth: 720, margin: "0 auto 80px", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 11, color: "#0D9488", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12 }}>FAQ</div>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 900, letterSpacing: "-1px", margin: 0 }}>Common questions</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {faqs.map((f, i) => (
            <details key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
              <summary style={{
                padding: "18px 22px", fontSize: 15, fontWeight: 700, cursor: "pointer",
                listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center",
                color: "#E8EDF5",
              }}>
                {f.q}
                <span style={{ color: "#0D9488", fontSize: 20, fontWeight: 300, flexShrink: 0, marginLeft: 12 }}>+</span>
              </summary>
              <div style={{ padding: "0 22px 18px", fontSize: 14, color: "#778", lineHeight: 1.75, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ paddingTop: 14 }}>{f.a}</div>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        maxWidth: 900, margin: "0 auto 80px", padding: "0 24px",
      }}>
        <div style={{
          background: "linear-gradient(135deg, rgba(13,148,136,0.15) 0%, rgba(26,86,164,0.15) 100%)",
          border: "1px solid rgba(13,148,136,0.25)",
          borderRadius: 24, padding: "48px 32px", textAlign: "center",
        }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>⚡</div>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 900, letterSpacing: "-1px", margin: "0 0 16px" }}>
            Start saving on electricity today
          </h2>
          <p style={{ fontSize: 15, color: "#778", marginBottom: 32, maxWidth: 480, margin: "0 auto 32px" }}>
            Join Belgian households already using StrooomSlim to shift consumption to cheap hours.
          </p>
          <button onClick={onGetStarted} style={{
            padding: "16px 44px", borderRadius: 50, fontSize: 16, fontWeight: 800,
            background: "linear-gradient(135deg,#0D9488,#1A56A4)",
            border: "none", color: "#fff", cursor: "pointer",
            boxShadow: "0 8px 32px rgba(13,148,136,0.45)",
          }}>
            Get Started — It's Free →
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "32px 24px", textAlign: "center",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 18 }}>🇧🇪</span>
            <span style={{ fontWeight: 800, fontSize: 16 }}>StrooomSlim</span>
          </div>
          <div style={{ fontSize: 12, color: "#334", lineHeight: 2 }}>
            Price data: Energy-Charts.info · Elia Open Data (CC BY 4.0) · ENTSO-E · EPEX Spot Belgium<br />
            <span
              onClick={() => window.dispatchEvent(new CustomEvent("showPrivacy"))}
              style={{ color: "#445", cursor: "pointer", textDecoration: "underline" }}
            >Privacy Policy</span>
            {" · "}GDPR Compliant · All data stored in EU · Not financial advice
          </div>
        </div>
      </footer>

      <style>{`
        * { box-sizing: border-box; }
        details summary::-webkit-details-marker { display: none; }
        details[open] summary span { transform: rotate(45deg); display: inline-block; }
      `}</style>
    </div>
  );
}