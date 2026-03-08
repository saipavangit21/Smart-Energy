/**
 * LandingPage.jsx — SmartPrice.be
 * Redesigned: bold dark-tech aesthetic, calculator showcase, supplier grid, 
 * separate elec/gas CTA buttons, improved FAQ, richer footer.
 */
import { useState, useEffect } from "react";

const features = [
  { icon: "⚡", title: "Live EPEX Spot Prices", desc: "Belgium day-ahead electricity prices from EPEX Spot, refreshed every hour. Know exactly what the market is doing right now." },
  { icon: "🔥", title: "Gas Prices (TTF)", desc: "Real-time TTF natural gas prices alongside electricity — track both energy costs in one dashboard." },
  { icon: "💚", title: "5 Cheapest Hours", desc: "We find the best windows each day to run your EV, washing machine, or dishwasher — saving money every single day." },
  { icon: "🔔", title: "Price Drop Alerts", desc: "Set a threshold and get emailed when prices fall below it. Never miss cheap electricity again." },
  { icon: "🔌", title: "Plan Calculator", desc: "Pick your appliances, adjust weekly usage, choose your region — we rank all 7 Belgian suppliers by your real annual cost including grid fees and VAT." },
  { icon: "📅", title: "7-Day History", desc: "Understand price patterns over the past week. Plan consumption around Belgium's energy market rhythm." },
];

const suppliers = [
  { name: "Engie",         logo: "🔵" },
  { name: "Luminus",       logo: "🟡" },
  { name: "Bolt Energy",   logo: "⚡" },
  { name: "TotalEnergies", logo: "🔴" },
  { name: "Eneco",         logo: "🟢" },
  { name: "Mega",          logo: "🟠" },
  { name: "Octa+",         logo: "🔷" },
];

const faqs = [
  { q: "What is EPEX Spot?", a: "EPEX Spot is the European Power Exchange where electricity is traded on the wholesale day-ahead market. In Belgium, dynamic energy contracts follow these hourly prices — your cost per kWh changes every hour." },
  { q: "How does the Plan Calculator work?", a: "Select your appliances, set how many times per week you use each, choose your region (Flanders/Wallonia/Brussels) and we calculate your annual kWh + peak kW, then rank all 7 Belgian suppliers showing your real total cost including grid fees and VAT." },
  { q: "How much can I actually save?", a: "On an average day, the spread between cheapest and most expensive hour is €100–150/MWh. Choosing the right supplier can save an additional €100–300/year depending on your consumption profile." },
  { q: "Is this free and safe?", a: "Yes, completely free — no credit card, no ads. All data stored in the EU (GDPR compliant). We never sell your data. Delete your account at any time." },
];

export default function LandingPage({ onGetStarted, onOpenCalculator }) {
  const [openFaq, setOpenFaq] = useState(null);
  const [heroVisible, setHeroVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setHeroVisible(true), 60); return () => clearTimeout(t); }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#060B14", color: "#E8EDF5", fontFamily: "\'DM Sans\', system-ui, sans-serif", overflowX: "hidden" }}>

      {/* AMBIENT BG */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)", width: 900, height: 600, background: "radial-gradient(ellipse, rgba(13,148,136,0.07) 0%, transparent 65%)" }} />
        <div style={{ position: "absolute", top: "40%", right: "-10%", width: 500, height: 500, background: "radial-gradient(circle, rgba(26,86,164,0.06) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "-5%", width: 400, height: 400, background: "radial-gradient(circle, rgba(249,115,22,0.04) 0%, transparent 70%)" }} />
      </div>

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(6,11,20,0.88)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "13px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🇧🇪</span>
          <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.5px" }}>SmartPrice</span>
          <span style={{ fontSize: 9, color: "#00C896", background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.25)", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>● LIVE</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => onOpenCalculator && onOpenCalculator("electricity")}
            style={{ padding: "8px 18px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.3)", color: "#0D9488", cursor: "pointer" }}>
            🔌 Calculator
          </button>
          <button onClick={onGetStarted}
            style={{ padding: "9px 22px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#0D9488,#1A56A4)", border: "none", color: "#fff", cursor: "pointer", boxShadow: "0 4px 20px rgba(13,148,136,0.35)" }}>
            Get Started Free →
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "64px 24px 48px", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(22px)", transition: "all 0.7s ease" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.25)", borderRadius: 30, padding: "6px 16px", fontSize: 12, color: "#0D9488", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 28 }}>
            🇧🇪 Belgium · Real-Time Energy Prices
          </div>
          <h1 style={{ fontSize: "clamp(38px, 6.5vw, 72px)", fontWeight: 900, letterSpacing: "-2.5px", lineHeight: 1.04, margin: "0 0 26px" }}>
            <span style={{ background: "linear-gradient(135deg, #ffffff 20%, #0D9488 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Stop Overpaying</span>
            <br />
            <span style={{ background: "linear-gradient(135deg, #E8EDF5 40%, #1A56A4 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>for Energy</span>
          </h1>
          <p style={{ fontSize: "clamp(16px, 2.2vw, 20px)", color: "#6B7E99", maxWidth: 600, margin: "0 auto 42px", lineHeight: 1.75 }}>
            Track live EPEX &amp; TTF prices, find the cheapest hours for your appliances, compare all 7 Belgian suppliers, and get alerts when prices drop.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
            <button onClick={onGetStarted}
              style={{ padding: "16px 38px", borderRadius: 50, fontSize: 16, fontWeight: 800, background: "linear-gradient(135deg,#0D9488,#1A56A4)", border: "none", color: "#fff", cursor: "pointer", boxShadow: "0 8px 32px rgba(13,148,136,0.4)", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(13,148,136,0.55)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(13,148,136,0.4)"; }}>
              Start for Free →
            </button>
            <button onClick={() => onOpenCalculator && onOpenCalculator("electricity")}
              style={{ padding: "16px 38px", borderRadius: 50, fontSize: 16, fontWeight: 700, background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.4)", color: "#0D9488", cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(13,148,136,0.2)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(13,148,136,0.1)"; e.currentTarget.style.color = "#0D9488"; }}>
              🔌 Try the Calculator
            </button>
          </div>
          <div style={{ fontSize: 12, color: "#2E3D52" }}>Free forever · No credit card · GDPR compliant · Data stored in EU</div>
        </div>
      </section>

      {/* LIVE STATS */}
      <section style={{ maxWidth: 960, margin: "0 auto 44px", padding: "0 24px", position: "relative", zIndex: 1 }}>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "24px 28px", display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, color: "#3A4D63", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 10 }}>Live EPEX Spot · Belgium</div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {[{ label: "Today Min", color: "#10B981", val: "~€38" }, { label: "Today Avg", color: "#F59E0B", val: "~€92" }, { label: "Today Max", color: "#EF4444", val: "~€154" }, { label: "TTF Gas", color: "#F97316", val: "~€35/MWh" }].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "#3A4D63", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 3 }}>{s.label}</div>
                  <div style={{ fontSize: 19, fontWeight: 800, color: s.color, fontFamily: "monospace" }}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={onGetStarted} style={{ padding: "11px 22px", borderRadius: 12, fontSize: 13, fontWeight: 700, background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.3)", color: "#00C896", cursor: "pointer", whiteSpace: "nowrap" }}>
            See Live Prices →
          </button>
        </div>
      </section>

      {/* CALCULATOR SHOWCASE */}
      <section style={{ maxWidth: 960, margin: "0 auto 64px", padding: "0 24px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: "#0D9488", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 14 }}>Plan Calculator</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, letterSpacing: "-1.5px", margin: "0 0 16px" }}>Find your cheapest energy plan<br />in 30 seconds</h2>
          <p style={{ color: "#556B82", fontSize: 15, maxWidth: 520, margin: "0 auto" }}>Select appliances → set weekly usage → pick region → see all 7 suppliers ranked by real annual cost.</p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ background: "linear-gradient(135deg, rgba(13,148,136,0.08), transparent)", border: "1px solid rgba(13,148,136,0.25)", borderRadius: 20, padding: "26px 24px", cursor: "pointer", transition: "all 0.2s" }}
            onClick={() => onOpenCalculator && onOpenCalculator("electricity")}
            onMouseEnter={e => { e.currentTarget.style.border = "1px solid rgba(13,148,136,0.5)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
            onMouseLeave={e => { e.currentTarget.style.border = "1px solid rgba(13,148,136,0.25)"; e.currentTarget.style.transform = "translateY(0)"; }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 34 }}>🔌</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#0D9488", marginBottom: 4 }}>Plan Calculator — Electricity &amp; Gas</div>
                <div style={{ fontSize: 12, color: "#556B82", lineHeight: 1.6 }}>Select your appliances · choose region · see all 7 suppliers ranked by real annual cost including grid fees &amp; VAT</div>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 16 }}>
              {["⚡ Electricity", "🔥 Gas", "☀️ Solar aware", "🚗 EV charging", "🌡️ Heat pump", "📍 Flanders / Wallonia / Brussels"].map(t => (
                <span key={t} style={{ fontSize: 10, background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.25)", color: "#0D9488", borderRadius: 20, padding: "3px 9px", fontWeight: 600 }}>{t}</span>
              ))}
            </div>
            <div style={{ color: "#0D9488", fontWeight: 700, fontSize: 13 }}>Start Calculator →</div>
          </div>
        </div>

        {/* Sample results strip */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "18px 22px" }}>
          <div style={{ fontSize: 10, color: "#3A4D63", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 14 }}>Example · 3,500 kWh/yr · Flanders</div>
          {[
            { name: "Bolt Energy — Dynamic+",  total: 987,  type: "Dynamic",  pct: 72, color: "#10B981", best: true },
            { name: "Eneco — Variabel",         total: 1043, type: "Variable", pct: 76, color: "#0D9488" },
            { name: "Engie — Comfort Flex",     total: 1118, type: "Variable", pct: 81, color: "#0066A1" },
            { name: "TotalEnergies — Serenity", total: 1204, type: "Fixed",    pct: 88, color: "#EF3340" },
          ].map(p => (
            <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: p.best ? "#10B981" : "#8899AA" }}>{p.best && "🏆 "}{p.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: p.best ? "#10B981" : "#E8EDF5" }}>€{p.total}/yr</span>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${p.pct}%`, background: p.color, borderRadius: 2, opacity: p.best ? 1 : 0.5 }} />
                </div>
              </div>
              <span style={{ fontSize: 10, color: "#3A4D63", background: "rgba(255,255,255,0.04)", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>{p.type}</span>
            </div>
          ))}
          <div style={{ textAlign: "right", marginTop: 12 }}>
            <button onClick={() => onOpenCalculator && onOpenCalculator("electricity")}
              style={{ padding: "8px 18px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg,#0D9488,#1A56A4)", border: "none", color: "#fff", cursor: "pointer" }}>
              Calculate my plan →
            </button>
          </div>
        </div>
      </section>

      {/* SUPPLIERS */}
      <section style={{ maxWidth: 960, margin: "0 auto 56px", padding: "0 24px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 10, color: "#0D9488", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12 }}>Coverage</div>
          <h2 style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 900, letterSpacing: "-1px", margin: "0 0 10px" }}>All 7 Belgian suppliers compared</h2>
          <p style={{ color: "#556B82", fontSize: 13 }}>Variable · Fixed · Dynamic — electricity and gas plans</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {suppliers.map(s => (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "10px 18px" }}>
              <span style={{ fontSize: 18 }}>{s.logo}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#C4D4E0" }}>{s.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ maxWidth: 960, margin: "0 auto 56px", padding: "0 24px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ fontSize: 10, color: "#0D9488", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12 }}>Features</div>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 900, letterSpacing: "-1.5px", margin: 0 }}>Everything in one dashboard</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 13 }}>
          {features.map((f, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "24px 20px", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(13,148,136,0.05)"; e.currentTarget.style.border = "1px solid rgba(13,148,136,0.18)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.border = "1px solid rgba(255,255,255,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ fontSize: 26, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "#DDE8F0" }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "#556B82", lineHeight: 1.75 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 740, margin: "0 auto 56px", padding: "0 24px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ fontSize: 10, color: "#0D9488", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12 }}>FAQ</div>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 900, letterSpacing: "-1px", margin: 0 }}>Common questions</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {faqs.map((f, i) => (
            <div key={i} onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${openFaq === i ? "rgba(13,148,136,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "border-color 0.2s" }}>
              <div style={{ padding: "17px 22px", fontSize: 15, fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center", color: openFaq === i ? "#0D9488" : "#DDE8F0" }}>
                {f.q}
                <span style={{ color: "#0D9488", fontSize: 20, fontWeight: 300, flexShrink: 0, marginLeft: 12, transform: openFaq === i ? "rotate(45deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>+</span>
              </div>
              {openFaq === i && (
                <div style={{ padding: "0 22px 18px", fontSize: 14, color: "#6B7E99", lineHeight: 1.8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ paddingTop: 14 }}>{f.a}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "36px 24px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 24, marginBottom: 26 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>🇧🇪</span>
                <span style={{ fontWeight: 900, fontSize: 17, letterSpacing: "-0.5px" }}>SmartPrice.be</span>
              </div>
              <div style={{ fontSize: 12, color: "#334455", lineHeight: 1.9 }}>
                Free Belgian energy price tracker<br />
                <a href="mailto:hello@smartprice.be" style={{ color: "#0D9488", textDecoration: "none" }}>hello@smartprice.be</a>
              </div>
            </div>
            <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 10, color: "#334455", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10, fontWeight: 700 }}>Product</div>
                {[
                  { label: "⚡ Electricity Prices", action: onGetStarted },
                  { label: "🔥 Gas Prices", action: onGetStarted },
                  { label: "🔌 Plan Calculator", action: () => onOpenCalculator && onOpenCalculator("electricity") },
                ].map(l => (
                  <div key={l.label} onClick={l.action} style={{ fontSize: 13, color: "#445566", marginBottom: 7, cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#0D9488"}
                    onMouseLeave={e => e.currentTarget.style.color = "#445566"}>
                    {l.label}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#334455", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10, fontWeight: 700 }}>Legal</div>
                <div onClick={() => window.dispatchEvent(new CustomEvent("showPrivacy"))} style={{ fontSize: 13, color: "#445566", marginBottom: 6, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#0D9488"}
                  onMouseLeave={e => e.currentTarget.style.color = "#445566"}>
                  Privacy Policy
                </div>
                <div style={{ fontSize: 13, color: "#445566" }}>GDPR Compliant</div>
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 18, fontSize: 11, color: "#2A3A4A", lineHeight: 2 }}>
            Price data: Energy-Charts.info · Elia Open Data (CC BY 4.0) · ENTSO-E · EPEX Spot Belgium · ICE EEX (TTF Gas)<br />
            Not financial advice. Always verify tariffs on supplier websites before switching.
          </div>
        </div>
      </footer>

      <style>{`* { box-sizing: border-box; }`}</style>
    </div>
  );
}