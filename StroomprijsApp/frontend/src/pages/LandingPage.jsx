/**
 * LandingPage.jsx — SmartPrice.be
 * Redesigned: bold dark-tech aesthetic, calculator showcase, supplier grid, 
 * separate elec/gas CTA buttons, improved FAQ, richer footer.
 */
import { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import LangSwitcher   from "../components/LangSwitcher";
import ThemeSwitcher  from "../components/ThemeSwitcher";

const featureIcons = ["⚡", "🔥", "💚", "🔔", "🔌", "📅"];

const suppliers = [
  { name: "Engie",         logo: "🔵" },
  { name: "Luminus",       logo: "🟡" },
  { name: "Bolt Energy",   logo: "⚡" },
  { name: "TotalEnergies", logo: "🔴" },
  { name: "Eneco",         logo: "🟢" },
  { name: "Mega",          logo: "🟠" },
  { name: "Octa+",         logo: "🔷" },
];

export default function LandingPage({ onGetStarted, onOpenCalculator }) {
  const { theme } = useTheme();
  const { t, tSection } = useLanguage();
  const L = tSection("landing");
  const C = tSection("common");

  const features = [
    { icon: "🚗", title: L.featureEvTitle || "EV Charging Optimizer", desc: L.featureEvBody || "Find the cheapest hours to charge your EV. Live EPEX prices + best windows + cost calculator.", link: "/ev-charging-belgium", linkLabel: "Open EV page →" },
    { icon: "⚡", title: L.feature1Title, desc: L.feature1Body },
    { icon: "🔥", title: L.feature2Title, desc: L.feature2Body },
    { icon: "💚", title: L.feature3Title, desc: L.feature3Body },
    { icon: "🔔", title: L.feature4Title, desc: L.feature4Body },
    { icon: "🔌", title: L.feature5Title, desc: L.feature5Body },
    { icon: "📅", title: L.feature6Title, desc: L.feature6Body },
  ];

  const faqs = [
    { q: L.faq1Q, a: L.faq1A },
    { q: L.faq2Q, a: L.faq2A },
    { q: L.faq3Q, a: L.faq3A },
    { q: L.faq4Q, a: L.faq4A },
  ];
  const [openFaq, setOpenFaq] = useState(null);
  const [heroVisible, setHeroVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setHeroVisible(true), 60); return () => clearTimeout(t); }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#060B14", color: theme === "light" ? "#1E293B" : "#E8EDF5", fontFamily: "\'DM Sans\', system-ui, sans-serif", overflowX: "hidden" }}>

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
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <ThemeSwitcher />
          <LangSwitcher style={{ marginRight: 4 }} />
          <a href="/ev-charging-belgium"
            style={{ padding: "8px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.25)", color: "#00C896", cursor: "pointer", textDecoration: "none" }}>
            🚗 EV
          </a>
          <button onClick={() => onOpenCalculator && onOpenCalculator("electricity")}
            style={{ padding: "8px 18px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.3)", color: "#0D9488", cursor: "pointer" }}>
            {C.calculator}
          </button>
          <button onClick={onGetStarted}
            style={{ padding: "9px 22px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#0D9488,#1A56A4)", border: "none", color: "#fff", cursor: "pointer", boxShadow: "0 4px 20px rgba(13,148,136,0.35)" }}>
            {L.openDashboard}
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "64px 24px 48px", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(22px)", transition: "all 0.7s ease" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.25)", borderRadius: 30, padding: "6px 16px", fontSize: 12, color: "#0D9488", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 28 }}>
            {C.tagline}
          </div>
          <h1 style={{ fontSize: "clamp(38px, 6.5vw, 72px)", fontWeight: 900, letterSpacing: "-2.5px", lineHeight: 1.04, margin: "0 0 26px" }}>
            <span style={{ background: "linear-gradient(135deg, #ffffff 20%, #0D9488 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{L.heroLine1 || "Stop Overpaying"}</span>
            <br />
            <span style={{ background: "linear-gradient(135deg, #E8EDF5 40%, #1A56A4 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{L.heroLine2 || "for Energy"}</span>
          </h1>
          <p style={{ fontSize: "clamp(16px, 2.2vw, 20px)", color: "#6B7E99", maxWidth: 600, margin: "0 auto 42px", lineHeight: 1.75 }}>
            {L.heroDesc || "Track live EPEX & TTF prices, find the cheapest hours, compare all 7 Belgian suppliers, and get alerts when prices drop."}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
            <button onClick={onGetStarted}
              style={{ padding: "16px 38px", borderRadius: 50, fontSize: 16, fontWeight: 800, background: "linear-gradient(135deg,#0D9488,#1A56A4)", border: "none", color: "#fff", cursor: "pointer", boxShadow: "0 8px 32px rgba(13,148,136,0.4)", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(13,148,136,0.55)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(13,148,136,0.4)"; }}>
              {L.openDashboard}
            </button>
          <button onClick={() => onOpenCalculator && onOpenCalculator("electricity")}
              style={{ padding: "16px 38px", borderRadius: 50, fontSize: 16, fontWeight: 700, background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.4)", color: "#0D9488", cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(13,148,136,0.2)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(13,148,136,0.1)"; e.currentTarget.style.color = "#0D9488"; }}>
              🔌 {L.tryCalculator}
            </button>
          </div>
          <div style={{ fontSize: 12, color: "#2E3D52" }}>{L.heroBadge || "Free forever · No credit card · GDPR compliant"}</div>
        </div>
      </section>

      {/* LIVE STATS */}
      <section style={{ maxWidth: 960, margin: "0 auto 44px", padding: "0 24px", position: "relative", zIndex: 1 }}>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "24px 28px", display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, color: "#3A4D63", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 10 }}>{L.liveEpex || "Live EPEX Spot · Belgium"}</div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {[{ label: L.statMin || "Today Min", color: "#10B981", val: "~€38" }, { label: L.statAvg || "Today Avg", color: "#F59E0B", val: "~€92" }, { label: L.statMax || "Today Max", color: "#EF4444", val: "~€154" }, { label: L.statGas || "TTF Gas", color: "#F97316", val: "~€35/MWh" }].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "#3A4D63", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 3 }}>{s.label}</div>
                  <div style={{ fontSize: 19, fontWeight: 800, color: s.color, fontFamily: "monospace" }}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={onGetStarted} style={{ padding: "11px 22px", borderRadius: 12, fontSize: 13, fontWeight: 700, background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.3)", color: "#00C896", cursor: "pointer", whiteSpace: "nowrap" }}>
            {L.seeLivePrices || "See Live Prices →"}
          </button>
        </div>
      </section>

      {/* CALCULATOR SHOWCASE */}
      <section style={{ maxWidth: 960, margin: "0 auto 64px", padding: "0 24px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: "#0D9488", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 14 }}>{L.calcSectionLabel || "Plan Calculator"}</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, letterSpacing: "-1.5px", margin: "0 0 16px" }}>{L.calcSectionTitle || "Find your cheapest energy plan in 30 seconds"}</h2>
          <p style={{ color: "#556B82", fontSize: 15, maxWidth: 520, margin: "0 auto" }}>{L.calcSteps || "Select appliances → set weekly usage → pick region → see all 7 suppliers ranked."}</p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ background: "linear-gradient(135deg, rgba(13,148,136,0.08), transparent)", border: "1px solid rgba(13,148,136,0.25)", borderRadius: 20, padding: "26px 24px", cursor: "pointer", transition: "all 0.2s" }}
            onClick={() => onOpenCalculator && onOpenCalculator("electricity")}
            onMouseEnter={e => { e.currentTarget.style.border = "1px solid rgba(13,148,136,0.5)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
            onMouseLeave={e => { e.currentTarget.style.border = "1px solid rgba(13,148,136,0.25)"; e.currentTarget.style.transform = "translateY(0)"; }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 34 }}>🔌</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#0D9488", marginBottom: 4 }}>{L.calcTitle || "Plan Calculator — Electricity & Gas"}</div>
                <div style={{ fontSize: 12, color: "#556B82", lineHeight: 1.6 }}>{L.calcDesc || "Select your appliances · choose region · see all 7 suppliers ranked"}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 16 }}>
              {(L.calcTags || ["⚡ Electricity", "🔥 Gas", "☀️ Solar", "🚗 EV", "🌡️ Heat pump", "📍 Flanders / Wallonia / Brussels"]).map(t => (
                <span key={t} style={{ fontSize: 10, background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.25)", color: "#0D9488", borderRadius: 20, padding: "3px 9px", fontWeight: 600 }}>{t}</span>
              ))}
            </div>
            <div style={{ color: "#0D9488", fontWeight: 700, fontSize: 13 }}>{L.calcCta || "Start Calculator →"}</div>
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
              {L.calcMyPlan || "Calculate my plan →"}
            </button>
          </div>
        </div>
      </section>

      {/* EV CHARGING SECTION */}
      <section style={{ maxWidth: 960, margin: "0 auto 64px", padding: "0 24px", position: "relative", zIndex: 1 }}>
        <div style={{ background: "linear-gradient(135deg, rgba(0,200,150,0.08), rgba(0,200,150,0.03))", border: "1px solid rgba(0,200,150,0.25)", borderRadius: 20, padding: "28px 28px", cursor: "pointer", transition: "all 0.2s" }}
          onClick={() => window.location.href = "/ev-charging-belgium"}
          onMouseEnter={e => { e.currentTarget.style.border = "1px solid rgba(0,200,150,0.5)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
          onMouseLeave={e => { e.currentTarget.style.border = "1px solid rgba(0,200,150,0.25)"; e.currentTarget.style.transform = "translateY(0)"; }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
            <div style={{ fontSize: 44, lineHeight: 1 }}>🚗</div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 10, color: "#00C896", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>{L.evSectionLabel || "EV Charging"}</div>
              <div style={{ fontSize: "clamp(18px, 3vw, 26px)", fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 10, color: "#E2E8F0" }}>{L.evSectionTitle || "Best time to charge your EV tonight"}</div>
              <div style={{ fontSize: 13, color: "#556B82", lineHeight: 1.7, marginBottom: 16, maxWidth: 520 }}>{L.evSectionDesc || "Live EPEX prices tell you the cheapest hours. Belgian EV drivers save €300–600/year by timing their charging."}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {(L.evSectionTags || ["🕐 Hourly prices", "💚 Cheapest windows", "🔋 Cost calculator", "🇧🇪 Belgium"]).map(t => (
                  <span key={t} style={{ fontSize: 10, background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.25)", color: "#00C896", borderRadius: 20, padding: "3px 9px", fontWeight: 600 }}>{t}</span>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ color: "#00C896", fontWeight: 700, fontSize: 14 }}>{L.evSectionCta || "See cheapest charging hours →"}</div>
                <a href="/ev-charging-stations-belgium" onClick={e => { e.stopPropagation(); window.location.href="/ev-charging-stations-belgium"; }}
                  style={{ fontSize: 12, color: "#0D9488", textDecoration: "none", background: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.25)", borderRadius: 20, padding: "4px 12px", fontWeight: 600 }}>
                  🗺️ Find stations →
                </a>
              </div>
            </div>
            {/* Mini price preview */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 130 }}>
              {[
                { time: "02:00", price: "~€18", color: "#00C896" },
                { time: "03:00", price: "~€22", color: "#00C896" },
                { time: "13:00", price: "~€45", color: "#84CC16" },
                { time: "19:00", price: "~€165", color: "#EF4444" },
              ].map(h => (
                <div key={h.time} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "6px 10px" }}>
                  <span style={{ fontSize: 11, color: "#556B82", fontFamily: "monospace" }}>{h.time}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: h.color, fontFamily: "monospace" }}>{h.price}/MWh</span>
                </div>
              ))}
              <div style={{ fontSize: 9, color: "#3A4D63", textAlign: "center", marginTop: 2 }}>typical day prices</div>
            </div>
          </div>
        </div>
      </section>

      {/* SUPPLIERS */}
      <section style={{ maxWidth: 960, margin: "0 auto 56px", padding: "0 24px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 10, color: "#0D9488", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12 }}>{L.coverage || "Coverage"}</div>
          <h2 style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 900, letterSpacing: "-1px", margin: "0 0 10px" }}>{L.suppliersTitle}</h2>
          <p style={{ color: "#556B82", fontSize: 13 }}>{L.coverageSub || "Variable · Fixed · Dynamic — electricity and gas plans"}</p>
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
          <div style={{ fontSize: 10, color: "#0D9488", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12 }}>{L.featuresLabel || "Features"}</div>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 900, letterSpacing: "-1.5px", margin: 0 }}>{L.featuresTitle || "Everything in one dashboard"}</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 13 }}>
          {features.map((f, i) => (
            <div key={i} style={{ background: i === 0 ? "rgba(0,200,150,0.05)" : "rgba(255,255,255,0.02)", border: i === 0 ? "1px solid rgba(0,200,150,0.2)" : "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "24px 20px", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = i === 0 ? "rgba(0,200,150,0.09)" : "rgba(13,148,136,0.05)"; e.currentTarget.style.border = i === 0 ? "1px solid rgba(0,200,150,0.35)" : "1px solid rgba(13,148,136,0.18)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = i === 0 ? "rgba(0,200,150,0.05)" : "rgba(255,255,255,0.02)"; e.currentTarget.style.border = i === 0 ? "1px solid rgba(0,200,150,0.2)" : "1px solid rgba(255,255,255,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ fontSize: 26, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "#DDE8F0" }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "#556B82", lineHeight: 1.75 }}>{f.desc}</div>
              {f.link && <a href={f.link} style={{ display: "inline-block", marginTop: 12, fontSize: 12, fontWeight: 700, color: "#00C896", textDecoration: "none" }}>{f.linkLabel}</a>}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 740, margin: "0 auto 56px", padding: "0 24px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ fontSize: 10, color: "#0D9488", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12 }}>{L.faqLabel || "FAQ"}</div>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 900, letterSpacing: "-1px", margin: 0 }}>{L.faqTitle || "Common questions"}</h2>
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
                {L.hero}<br />
                <a href="mailto:hello@smartprice.be" style={{ color: "#0D9488", textDecoration: "none" }}>hello@smartprice.be</a>
              </div>
            </div>
            <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 10, color: "#334455", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10, fontWeight: 700 }}>{L.footerProduct || "Product"}</div>
                {[
                  { label: L.footerElecLink || "⚡ Electricity Prices", action: onGetStarted },
                  { label: L.footerGasLink || "🔥 Gas Prices", action: onGetStarted },
                  { label: L.footerCalcLink || "🔌 Plan Calculator", action: () => onOpenCalculator && onOpenCalculator("electricity") },
                  { label: L.footerEvLink || "🚗 EV Charging", action: () => window.location.href = "/ev-charging-belgium" },
                ].map(l => (
                  <div key={l.label} onClick={l.action} style={{ fontSize: 13, color: "#445566", marginBottom: 7, cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#0D9488"}
                    onMouseLeave={e => e.currentTarget.style.color = "#445566"}>
                    {l.label}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#334455", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10, fontWeight: 700 }}>{L.footerLegal || "Legal"}</div>
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
            {L.footer}<br />
            {L.disclaimer || "Not financial advice."}
          </div>
        </div>
      </footer>

      <style>{`* { box-sizing: border-box; }`}</style>
    </div>
  );
}