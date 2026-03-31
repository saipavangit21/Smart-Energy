/**
 * LandingPage.jsx — SmartPrice.be
 * Elite redesign: live price hero, today's schedule, savings hook, clean funnel.
 */
import { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import LangSwitcher   from "../components/LangSwitcher";
import ThemeSwitcher  from "../components/ThemeSwitcher";

export default function LandingPage({ onGetStarted, onOpenCalculator }) {
  const { tSection } = useLanguage();
  const L = tSection("landing");
  const C = tSection("common");

  // All constants inside component to prevent Vite/esbuild TDZ bundle errors
  const SUPPLIERS = [
    { name: "Engie",         abbr: "EN",  color: "#fff",    bg: "#0066A1", accent: "#0066A1" },
    { name: "Luminus",       abbr: "LU",  color: "#1a1a1a", bg: "#FFB800", accent: "#FFB800" },
    { name: "Bolt",          abbr: "⚡",  color: "#fff",    bg: "#1A1A2E", accent: "#00C896", border: "#00C896" },
    { name: "TotalEnergies", abbr: "TE",  color: "#fff",    bg: "#EF3340", accent: "#EF3340" },
    { name: "Eneco",         abbr: "EC",  color: "#fff",    bg: "#00A651", accent: "#00A651" },
    { name: "Mega",          abbr: "MG",  color: "#fff",    bg: "#7C3AED", accent: "#7C3AED" },
    { name: "Octa+",         abbr: "O+",  color: "#fff",    bg: "#F97316", accent: "#F97316" },
  ];

  const getPriceColor = (mwh) => {
    if (mwh == null) return "#64748B";
    if (mwh < 0)   return "#10B981";
    if (mwh < 50)  return "#10B981";
    if (mwh < 100) return "#84CC16";
    if (mwh < 150) return "#F59E0B";
    if (mwh < 200) return "#F97316";
    return "#EF4444";
  };

  const getPriceLabel = (mwh) => {
    if (mwh == null) return "";
    if (mwh < 0)   return "Negative";
    if (mwh < 50)  return "Very cheap";
    if (mwh < 100) return "Cheap";
    if (mwh < 150) return "Average";
    if (mwh < 200) return "Expensive";
    return "Very expensive";
  };

  // State declarations FIRST — before any effects that reference them
  const [heroVisible, setHeroVisible] = useState(false);
  const [liveStats,   setLiveStats]   = useState(null);
  const [openFaq,     setOpenFaq]     = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    fetch("/api/prices/today")
      .then(r => r.json())
      .then(d => {
        if (!d.prices?.length) return;
        const prices = d.prices;
        const vals = prices.map(p => p.price_eur_mwh).filter(p => p != null);
        if (!vals.length) return;
        const current = prices.find(p => p.is_current)?.price_eur_mwh ?? vals[vals.length - 1];
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        const pctVsAvg = Math.round(((current - avg) / Math.abs(avg)) * 100);

        // Find cheapest upcoming 2-hour window
        const now = new Date().getHours();
        const upcoming = prices.filter(p => {
          const h = new Date(p.timestamp_utc || p.hour).getHours();
          return h >= now;
        });
        const sorted = [...upcoming].sort((a, b) => a.price_eur_mwh - b.price_eur_mwh);
        const cheapestHour = sorted[0];
        const cheapHourNum = cheapestHour ? new Date(cheapestHour.timestamp_utc || cheapestHour.hour).getHours() : null;

        // Build 24-bar array for schedule visualization
        const bars = prices.slice(0, 24).map(p => ({
          hour: new Date(p.timestamp_utc || p.hour).getHours(),
          price: p.price_eur_mwh,
          isCurrent: !!p.is_current,
        }));

        setLiveStats({
          current: current?.toFixed(1),
          min:     Math.min(...vals).toFixed(1),
          avg:     avg.toFixed(1),
          max:     Math.max(...vals).toFixed(1),
          pctVsAvg,
          cheapHour: cheapHourNum != null ? `${String(cheapHourNum).padStart(2,"0")}:00` : null,
          cheapHourEnd: cheapHourNum != null ? `${String(cheapHourNum + 2).padStart(2,"0")}:00` : null,
          bars,
        });
      })
      .catch(() => {});
  }, []);

  const faqs = [
    { q: L.faq1Q, a: L.faq1A },
    { q: L.faq2Q, a: L.faq2A },
    { q: L.faq3Q, a: L.faq3A },
    { q: L.faq4Q, a: L.faq4A },
  ];

  const currentMwh = liveStats ? parseFloat(liveStats.current) : null;
  const priceColor = getPriceColor(currentMwh);
  const pct = liveStats?.pctVsAvg ?? 0;
  const cheaper = pct <= 0;

  return (
    <div style={{ minHeight: "100vh", background: "#060B14", color: "#E8EDF5", fontFamily: "'DM Sans', system-ui, sans-serif", overflowX: "hidden" }}>

      {/* AMBIENT GLOW */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-15%", left: "50%", transform: "translateX(-50%)", width: 900, height: 700, background: `radial-gradient(ellipse, ${liveStats ? priceColor + "0D" : "rgba(13,148,136,0.07)"} 0%, transparent 65%)`, transition: "background 2s ease" }} />
        <div style={{ position: "absolute", top: "45%", right: "-10%", width: 500, height: 500, background: "radial-gradient(circle, rgba(26,86,164,0.05) 0%, transparent 70%)" }} />
      </div>

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(6,11,20,0.9)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🇧🇪</span>
          <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.5px" }}>SmartPrice</span>
          <span style={{ fontSize: 9, color: "#00C896", background: "rgba(0,200,150,0.12)", border: "1px solid rgba(0,200,150,0.3)", borderRadius: 20, padding: "2px 8px", fontWeight: 700, letterSpacing: "0.5px" }}>● LIVE</span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <ThemeSwitcher />
          <LangSwitcher style={{ marginRight: 4 }} />
          <a href="/ev-charging-belgium" style={{ padding: "7px 13px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.22)", color: "#00C896", textDecoration: "none" }}>🚗 EV</a>
          <button onClick={onGetStarted} style={{ padding: "9px 22px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#0D9488,#1A56A4)", border: "none", color: "#fff", cursor: "pointer", boxShadow: "0 4px 20px rgba(13,148,136,0.3)" }}>
            {L.openDashboard || "Open Dashboard"}
          </button>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════
          HERO — Live price as centrepiece
      ══════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 860, margin: "0 auto", padding: "72px 24px 48px", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(24px)", transition: "all 0.7s ease" }}>

          {/* Eyebrow */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.25)", borderRadius: 30, padding: "5px 15px", fontSize: 11, color: "#0D9488", fontWeight: 700, letterSpacing: "1.8px", textTransform: "uppercase", marginBottom: 32 }}>
            🇧🇪 {C.tagline || "Belgium Real-Time Energy Prices"}
          </div>

          {/* Main headline */}
          <h1 style={{ fontSize: "clamp(38px, 6.5vw, 72px)", fontWeight: 900, letterSpacing: "-2.5px", lineHeight: 1.04, margin: "0 0 20px" }}>
            <span style={{ background: "linear-gradient(135deg,#ffffff 20%,#0D9488 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {L.heroLine1 || "Stop Overpaying"}
            </span>
            <br />
            <span style={{ background: "linear-gradient(135deg,#E8EDF5 40%,#1A56A4 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {L.heroLine2 || "for Energy"}
            </span>
          </h1>

          {/* LIVE PRICE — centrepiece */}
          {liveStats ? (
            <div onClick={onGetStarted} style={{ display: "inline-block", cursor: "pointer", marginBottom: 28 }}>
              <div style={{ background: "rgba(0,0,0,0.45)", border: `1.5px solid ${priceColor}33`, borderRadius: 28, padding: "28px 40px", transition: "all 0.25s", position: "relative", overflow: "hidden" }}
                onMouseEnter={e => { e.currentTarget.style.border = `1.5px solid ${priceColor}66`; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 20px 60px ${priceColor}1A`; }}
                onMouseLeave={e => { e.currentTarget.style.border = `1.5px solid ${priceColor}33`; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>

                {/* Glow behind number */}
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 280, height: 180, background: `radial-gradient(ellipse, ${priceColor}12 0%, transparent 70%)`, pointerEvents: "none" }} />

                <div style={{ fontSize: 10, color: "#445566", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 8 }}>{L.belgiumNow || "Belgium · Now"}</div>
                <div style={{ fontSize: "clamp(64px,10vw,100px)", fontWeight: 900, fontFamily: "monospace", color: priceColor, lineHeight: 1, letterSpacing: "-3px", marginBottom: 4 }}>
                  €{liveStats.current}
                  <span style={{ fontSize: "clamp(18px,2.5vw,26px)", color: "#445566", fontWeight: 600, letterSpacing: 0 }}>/MWh</span>
                </div>

                {/* Context: % vs average */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: cheaper ? "#10B981" : "#F97316" }}>
                    {cheaper ? "↓" : "↑"} {Math.abs(pct)}% {cheaper ? "below" : "above"} today's average
                  </span>
                  <span style={{ fontSize: 12, color: "#334455" }}>·</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: priceColor }}>{getPriceLabel(currentMwh)}</span>
                </div>

                {/* Min / Avg / Max row */}
                <div style={{ display: "flex", gap: 24, justifyContent: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
                  {[
                    { label: L.statMin || "Today Min",  val: liveStats.min,  color: "#10B981" },
                    { label: L.statAvg || "Avg",         val: liveStats.avg,  color: "#F59E0B" },
                    { label: L.statMax || "Today Max",  val: liveStats.max,  color: "#EF4444" },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: "#334455", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 2 }}>{s.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: "monospace" }}>€{s.val}</div>
                    </div>
                  ))}
                </div>

                <div style={{ position: "absolute", top: 14, right: 18, fontSize: 10, color: "#334455", fontWeight: 700 }}>LIVE →</div>
              </div>
            </div>
          ) : (
            <div style={{ display: "inline-block", marginBottom: 28 }}>
              <div style={{ background: "rgba(0,0,0,0.35)", border: "1.5px solid rgba(255,255,255,0.06)", borderRadius: 28, padding: "28px 40px", minWidth: 280 }}>
                <div style={{ fontSize: 10, color: "#445566", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>{L.belgiumNow || "Belgium · Now"}</div>
                <div style={{ fontSize: 72, fontWeight: 900, fontFamily: "monospace", color: "#1E2D3E", lineHeight: 1, marginBottom: 8 }}>—</div>
                <div style={{ fontSize: 12, color: "#334455" }}>Loading live prices…</div>
              </div>
            </div>
          )}

          {/* Best window callout */}
          {liveStats?.cheapHour && (
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 30, padding: "8px 18px", fontSize: 13, fontWeight: 700, color: "#10B981" }}>
                ✅ Best window today: {liveStats.cheapHour} – {liveStats.cheapHourEnd}
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 30, padding: "8px 18px", fontSize: 13, fontWeight: 600, color: "#F97316" }}>
                💸 EV owners save €300–600/yr
              </div>
            </div>
          )}

          {/* CTA */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 28 }}>
            <button onClick={onGetStarted}
              style={{ padding: "17px 42px", borderRadius: 50, fontSize: 16, fontWeight: 800, background: "linear-gradient(135deg,#0D9488,#1A56A4)", border: "none", color: "#fff", cursor: "pointer", boxShadow: "0 8px 32px rgba(13,148,136,0.4)", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(13,148,136,0.55)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(13,148,136,0.4)"; }}>
              {L.seeLivePrices || "See live prices →"}
            </button>
            <button onClick={() => onOpenCalculator && onOpenCalculator("electricity")}
              style={{ padding: "17px 38px", borderRadius: 50, fontSize: 15, fontWeight: 700, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "#94A3B8", cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(13,148,136,0.1)"; e.currentTarget.style.borderColor = "rgba(13,148,136,0.35)"; e.currentTarget.style.color = "#0D9488"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#94A3B8"; }}>
              🔌 {L.tryCalculator || "Plan Calculator"}
            </button>
          </div>

          {/* Trust badges */}
          <div style={{ display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { icon: "🇧🇪", text: L.badgeBelgian || "Belgian data" },
              { icon: "🔒", text: L.badgeGdpr || "GDPR compliant" },
              { icon: "⚡", text: L.badgeUpdated || "Updated every 15 min" },
              { icon: "🆓", text: L.badgeFree || "Free forever" },
            ].map(b => (
              <div key={b.text} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#334455" }}>
                <span>{b.icon}</span><span>{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          TODAY'S PRICE SCHEDULE — 24-bar visual
      ══════════════════════════════════════════════════════════ */}
      {liveStats?.bars?.length > 0 && (
        <section style={{ maxWidth: 960, margin: "0 auto 56px", padding: "0 24px", position: "relative", zIndex: 1 }}>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 24, padding: "28px 28px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: "#3A4D63", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 5 }}>Today's price schedule · Belgium</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#C4D4E0" }}>Hourly EPEX Spot prices</div>
              </div>
              <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#3A4D63", alignItems: "center" }}>
                <span><span style={{ color: "#10B981" }}>■</span> Cheap</span>
                <span><span style={{ color: "#F59E0B" }}>■</span> Average</span>
                <span><span style={{ color: "#EF4444" }}>■</span> Expensive</span>
              </div>
            </div>

            {/* Bar chart */}
            <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 80, marginBottom: 8 }}>
              {liveStats.bars.map((bar, i) => {
                const maxVal = Math.max(...liveStats.bars.map(b => Math.max(b.price, 0)));
                const pct = maxVal > 0 ? Math.max((bar.price / maxVal) * 100, 4) : 4;
                const col = getPriceColor(bar.price);
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}
                    title={`${String(bar.hour).padStart(2,"0")}:00 — €${bar.price?.toFixed(0)}/MWh`}>
                    <div style={{
                      width: "100%", height: `${pct}%`, borderRadius: "3px 3px 0 0",
                      background: bar.isCurrent ? col : `${col}88`,
                      boxShadow: bar.isCurrent ? `0 0 8px ${col}88` : "none",
                      border: bar.isCurrent ? `1px solid ${col}` : "none",
                      transition: "all 0.2s",
                    }} />
                  </div>
                );
              })}
            </div>
            {/* Hour labels — every 6 hours */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#2A3A4A", paddingRight: 2 }}>
              {["00:00", "06:00", "12:00", "18:00", "23:00"].map(h => <span key={h}>{h}</span>)}
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={onGetStarted} style={{ padding: "9px 22px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.3)", color: "#00C896", cursor: "pointer" }}>
                See full schedule + alerts →
              </button>
              <span style={{ fontSize: 12, color: "#2A3A4A" }}>Current bar highlighted · click any hour in dashboard for detail</span>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════
          SAVINGS HOOK — tangible €/year
      ══════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 960, margin: "0 auto 56px", padding: "0 24px", position: "relative", zIndex: 1 }}>
        <div style={{ background: "linear-gradient(135deg, rgba(0,200,150,0.07) 0%, rgba(26,86,164,0.05) 100%)", border: "1px solid rgba(0,200,150,0.18)", borderRadius: 24, padding: "40px 36px", display: "flex", gap: 32, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontSize: 10, color: "#00C896", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 14 }}>Why it matters</div>
            <h2 style={{ fontSize: "clamp(24px,4vw,38px)", fontWeight: 900, letterSpacing: "-1px", margin: "0 0 14px", lineHeight: 1.15 }}>
              The same electricity.<br />
              <span style={{ color: "#00C896" }}>Different price every hour.</span>
            </h2>
            <p style={{ fontSize: 15, color: "#556B82", lineHeight: 1.8, marginBottom: 22, maxWidth: 440 }}>
              Belgian electricity prices swing from <strong style={{ color: "#10B981" }}>−€50/MWh</strong> to <strong style={{ color: "#EF4444" }}>+€400/MWh</strong> on the same day. Running your EV, washing machine or heat pump at the wrong hour is just burning money.
            </p>
            <button onClick={onGetStarted} style={{ padding: "13px 30px", borderRadius: 50, fontSize: 14, fontWeight: 700, background: "linear-gradient(135deg,#0D9488,#1A56A4)", border: "none", color: "#fff", cursor: "pointer", boxShadow: "0 6px 24px rgba(13,148,136,0.35)" }}>
              See cheapest hours now →
            </button>
          </div>

          {/* Savings cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 220 }}>
            {[
              { device: "⚡ EV charging",       saving: "€300–600", period: "per year" },
              { device: "🌡️ Heat pump",         saving: "€200–400", period: "per year" },
              { device: "🫧 Washing machine",    saving: "€40–80",   period: "per year" },
            ].map(s => (
              <div key={s.device} style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, color: "#8899AA" }}>{s.device}</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#10B981", fontFamily: "monospace" }}>{s.saving}</div>
                  <div style={{ fontSize: 10, color: "#334455" }}>{s.period}</div>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 10, color: "#2A3A4A", textAlign: "center", marginTop: 2 }}>
              Savings vs charging at peak hours
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          HOW IT WORKS — 3 steps
      ══════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 960, margin: "0 auto 64px", padding: "0 24px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 10, color: "#0D9488", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12 }}>How it works</div>
          <h2 style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 900, letterSpacing: "-1.2px", margin: 0 }}>Smart energy in 3 steps</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {[
            { step: "01", icon: "📊", title: "See live prices", desc: "Live EPEX Spot prices for Belgium, updated every 15 minutes. No account needed." },
            { step: "02", icon: "💡", title: "Know when to act", desc: "The dashboard highlights your 5 cheapest upcoming hours — for EV, heating, or laundry." },
            { step: "03", icon: "🔔", title: "Get alerts", desc: "Set a price threshold and get emailed when prices drop. Never miss cheap electricity again." },
          ].map(s => (
            <div key={s.step} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "28px 24px", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(13,148,136,0.05)"; e.currentTarget.style.border = "1px solid rgba(13,148,136,0.2)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.border = "1px solid rgba(255,255,255,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: "#0D9488", background: "rgba(13,148,136,0.15)", border: "1px solid rgba(13,148,136,0.3)", borderRadius: 20, padding: "3px 10px", letterSpacing: "1px" }}>{s.step}</span>
                <span style={{ fontSize: 24 }}>{s.icon}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, color: "#DDE8F0", letterSpacing: "-0.3px" }}>{s.title}</div>
              <div style={{ fontSize: 13, color: "#556B82", lineHeight: 1.75 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          PLAN CALCULATOR — showcase
      ══════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 960, margin: "0 auto 64px", padding: "0 24px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 10, color: "#0D9488", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12 }}>{L.calcSectionLabel || "Plan Calculator"}</div>
          <h2 style={{ fontSize: "clamp(26px,4vw,42px)", fontWeight: 900, letterSpacing: "-1.5px", margin: "0 0 10px" }}>{L.calcSectionTitle || "Find your cheapest energy plan in 30 seconds"}</h2>
          <p style={{ color: "#556B82", fontSize: 14, maxWidth: 500, margin: "0 auto" }}>{L.calcSteps || "Select appliances → pick region → see all 7 suppliers ranked by real annual cost."}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {/* Calculator CTA card */}
          <div style={{ background: "linear-gradient(135deg, rgba(13,148,136,0.1), rgba(26,86,164,0.06))", border: "1px solid rgba(13,148,136,0.3)", borderRadius: 20, padding: "28px 24px", cursor: "pointer", transition: "all 0.2s", gridColumn: "1 / -1" }}
            onClick={() => onOpenCalculator && onOpenCalculator("electricity")}
            onMouseEnter={e => { e.currentTarget.style.border = "1px solid rgba(13,148,136,0.55)"; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 16px 48px rgba(13,148,136,0.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.border = "1px solid rgba(13,148,136,0.3)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 32 }}>🔌</span>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#0D9488" }}>{L.calcTitle || "Plan Calculator — Electricity & Gas"}</div>
                </div>
                <div style={{ fontSize: 13, color: "#556B82", marginBottom: 16, lineHeight: 1.7 }}>{L.calcDesc || "Select appliances · choose region · see all 7 suppliers ranked by real annual cost."}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 18 }}>
                  {(L.calcTags || ["⚡ Electricity","🔥 Gas","☀️ Solar","🚗 EV","🌡️ Heat pump","📍 Flanders / Wallonia / Brussels"]).map(t => (
                    <span key={t} style={{ fontSize: 10, background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.25)", color: "#0D9488", borderRadius: 20, padding: "3px 9px", fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#0D9488,#1A56A4)", borderRadius: 50, padding: "11px 26px", color: "#fff", fontWeight: 800, fontSize: 14 }}>
                  {L.calcCta || "Start Calculator →"}
                </div>
              </div>

              {/* Sample results */}
              <div style={{ minWidth: 220, flex: "0 0 220px" }}>
                <div style={{ fontSize: 10, color: "#3A4D63", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>Example · Flanders · 3,500 kWh/yr</div>
                {[
                  { name: "Bolt Dynamic+",    total: 987,  color: "#10B981", best: true },
                  { name: "Eneco Variabel",   total: 1043, color: "#0D9488" },
                  { name: "Engie Comfort",    total: 1118, color: "#0066A1" },
                  { name: "TotalEnergies",    total: 1204, color: "#EF3340" },
                ].map((p, i) => (
                  <div key={i} style={{ marginBottom: 9 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: p.best ? "#10B981" : "#6B7E99" }}>{p.best && "🏆 "}{p.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: p.best ? "#10B981" : "#E8EDF5" }}>€{p.total}</span>
                    </div>
                    <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${(p.total / 1204) * 100}%`, background: p.color, borderRadius: 2, opacity: p.best ? 1 : 0.4 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          EV CHARGING
      ══════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 960, margin: "0 auto 64px", padding: "0 24px", position: "relative", zIndex: 1 }}>
        <div style={{ background: "linear-gradient(135deg, rgba(0,200,150,0.07), rgba(0,200,150,0.02))", border: "1px solid rgba(0,200,150,0.22)", borderRadius: 24, padding: "32px 32px", cursor: "pointer", transition: "all 0.2s" }}
          onClick={() => window.location.href = "/ev-charging-belgium"}
          onMouseEnter={e => { e.currentTarget.style.border = "1px solid rgba(0,200,150,0.45)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
          onMouseLeave={e => { e.currentTarget.style.border = "1px solid rgba(0,200,150,0.22)"; e.currentTarget.style.transform = "translateY(0)"; }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 48 }}>🚗</span>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 10, color: "#00C896", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>{L.evSectionLabel || "EV Charging"}</div>
              <div style={{ fontSize: "clamp(18px,3vw,26px)", fontWeight: 900, letterSpacing: "-0.5px", color: "#E2E8F0", marginBottom: 8 }}>{L.evSectionTitle || "Best time to charge your EV tonight"}</div>
              <div style={{ fontSize: 13, color: "#556B82", lineHeight: 1.7, maxWidth: 500, marginBottom: 14 }}>{L.evSectionDesc || "Live EPEX prices tell you the cheapest hours. Belgian EV drivers save €300–600/year by timing their charging."}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ color: "#00C896", fontWeight: 700, fontSize: 14 }}>{L.evSectionCta || "See cheapest charging hours →"}</div>
                <a href="/ev-charging-stations-belgium" onClick={e => { e.stopPropagation(); window.location.href="/ev-charging-stations-belgium"; }}
                  style={{ fontSize: 12, color: "#0D9488", textDecoration: "none", background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.25)", borderRadius: 20, padding: "4px 12px", fontWeight: 600 }}>
                  🗺️ Find stations →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SUPPLIERS
      ══════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 960, margin: "0 auto 60px", padding: "0 24px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: "#0D9488", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12 }}>{L.coverage || "Coverage"}</div>
          <h2 style={{ fontSize: "clamp(24px,3.5vw,38px)", fontWeight: 900, letterSpacing: "-1px", margin: "0 0 8px" }}>{L.suppliersTitle || "All 7 Belgian suppliers compared"}</h2>
          <p style={{ color: "#556B82", fontSize: 13 }}>{L.coverageSub || "Variable · Fixed · Dynamic — electricity and gas plans"}</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {SUPPLIERS.map(s => (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.03)", border: `1px solid ${s.accent}33`, borderRadius: 14, padding: "10px 16px", transition: "all 0.2s", cursor: "default" }}
              onMouseEnter={e => { e.currentTarget.style.border = `1px solid ${s.accent}66`; e.currentTarget.style.background = `${s.accent}0A`; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.border = `1px solid ${s.accent}33`; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: s.abbr.length > 2 ? 14 : 13, fontWeight: 900, color: s.color, flexShrink: 0 }}>{s.abbr}</div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#C4D4E0" }}>{s.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 740, margin: "0 auto 60px", padding: "0 24px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ fontSize: 10, color: "#0D9488", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12 }}>{L.faqLabel || "FAQ"}</div>
          <h2 style={{ fontSize: "clamp(26px,4vw,38px)", fontWeight: 900, letterSpacing: "-1px", margin: 0 }}>{L.faqTitle || "Common questions"}</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {faqs.map((f, i) => (
            <div key={i} onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${openFaq === i ? "rgba(13,148,136,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "border-color 0.2s" }}>
              <div style={{ padding: "18px 22px", fontSize: 15, fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center", color: openFaq === i ? "#0D9488" : "#DDE8F0" }}>
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

      {/* ══════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════ */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "40px 24px 32px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 28, marginBottom: 32 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>🇧🇪</span>
                <span style={{ fontWeight: 900, fontSize: 17, letterSpacing: "-0.5px" }}>SmartPrice.be</span>
              </div>
              <div style={{ fontSize: 12, color: "#334455", lineHeight: 2 }}>
                {L.hero || "Belgium's Smartest Energy Price Tracker"}<br />
                <a href="mailto:hello@smartprice.be" style={{ color: "#0D9488", textDecoration: "none" }}>hello@smartprice.be</a>
              </div>
            </div>
            <div style={{ display: "flex", gap: 44, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 10, color: "#334455", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12, fontWeight: 700 }}>{L.footerProduct || "Product"}</div>
                {[
                  { label: L.footerElecLink || "⚡ Electricity Prices", action: onGetStarted },
                  { label: L.footerGasLink  || "🔥 Gas Prices",        action: onGetStarted },
                  { label: L.footerCalcLink || "🔌 Plan Calculator",   action: () => onOpenCalculator && onOpenCalculator("electricity") },
                  { label: L.footerEvLink   || "🚗 EV Charging",       action: () => window.location.href = "/ev-charging-belgium" },
                  { label: L.stationsLink   || "🗺️ Charging Stations", action: () => window.location.href = "/ev-charging-stations-belgium" },
                ].map(l => (
                  <div key={l.label} onClick={l.action} style={{ fontSize: 13, color: "#445566", marginBottom: 8, cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#0D9488"}
                    onMouseLeave={e => e.currentTarget.style.color = "#445566"}>
                    {l.label}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#334455", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12, fontWeight: 700 }}>{L.footerLegal || "Legal"}</div>
                <div onClick={() => window.dispatchEvent(new CustomEvent("showPrivacy"))} style={{ fontSize: 13, color: "#445566", marginBottom: 8, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#0D9488"}
                  onMouseLeave={e => e.currentTarget.style.color = "#445566"}>
                  Privacy Policy
                </div>
                <div style={{ fontSize: 13, color: "#445566" }}>GDPR Compliant</div>
              </div>
            </div>
          </div>

          {/* SOCIAL SHARE */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 20, marginBottom: 18, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#334455", marginRight: 4 }}>{L.shareLabel || "Share SmartPrice:"}</span>
            {[
              { label: "WhatsApp", icon: "💬", color: "#25D366", href: `https://wa.me/?text=${encodeURIComponent("⚡ SmartPrice.be — Live EPEX electricity prices & cheapest hours for Belgian EV drivers and households. Completely free 🔗 https://smartprice.be")}` },
              { label: "X",        icon: "𝕏",  color: "#fff",    href: `https://twitter.com/intent/tweet?text=${encodeURIComponent("⚡ SmartPrice.be — Live EPEX electricity prices & supplier comparison for Belgium. Free for everyone 🔗 https://smartprice.be")}` },
              { label: "Facebook", icon: "f",  color: "#1877F2", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://smartprice.be")}` },
              { label: "LinkedIn", icon: "in", color: "#0A66C2", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://smartprice.be")}` },
              { label: "Email",    icon: "✉",  color: "#94A3B8", href: `mailto:?subject=${encodeURIComponent("Check out SmartPrice.be — free Belgian energy price tracker")}&body=${encodeURIComponent("Hi,\n\nI've been using SmartPrice.be to track live electricity prices in Belgium and find the cheapest hours to charge my EV.\n\nIt's completely free — check it out: https://smartprice.be")}` },
            ].map(s => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" title={`Share on ${s.label}`}
                style={{ width: 32, height: 32, borderRadius: 8, background: `${s.color}15`, border: `1px solid ${s.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: s.color, textDecoration: "none", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = `${s.color}28`; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${s.color}15`; e.currentTarget.style.transform = "translateY(0)"; }}>
                {s.icon}
              </a>
            ))}
          </div>

          <div style={{ fontSize: 11, color: "#2A3A4A", lineHeight: 2 }}>
            {L.footer || "Data: Energy-Charts.info · Elia Open Data (CC BY 4.0) · ENTSO-E · Prices refresh every 15 min"}<br />
            {L.disclaimer || "Not financial advice. Always verify tariffs on supplier websites before switching."}
          </div>
        </div>
      </footer>

      <style>{`* { box-sizing: border-box; } @media (max-width: 640px) { .grid-2 { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
