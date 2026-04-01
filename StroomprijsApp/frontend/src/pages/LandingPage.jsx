/**
 * LandingPage.jsx — SmartPrice.be
 * Tile-grid redesign: pingprice-style cards, decision-first, interactive EV planner.
 */
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import LangSwitcher  from "../components/LangSwitcher";
import ThemeSwitcher from "../components/ThemeSwitcher";

function retailKwh(mwh) { return ((mwh / 1000) + 0.173).toFixed(3); }
function priceColor(mwh) {
  if (mwh == null) return "#64748B";
  if (mwh < 0)   return "#10B981";
  if (mwh < 60)  return "#10B981";
  if (mwh < 110) return "#84CC16";
  if (mwh < 160) return "#F59E0B";
  if (mwh < 220) return "#F97316";
  return "#EF4444";
}
function fmtHour(h) { return `${String(h).padStart(2,"0")}:00`; }

// Reusable tile card
function Tile({ accent = "#0D9488", icon, label, children, onClick, style = {} }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? `rgba(255,255,255,0.055)` : "rgba(255,255,255,0.035)",
        border: `1px solid ${hovered ? accent + "55" : "rgba(255,255,255,0.09)"}`,
        borderTop: `3px solid ${accent}`,
        borderRadius: 20,
        padding: "22px 24px",
        boxShadow: hovered
          ? `0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px ${accent}18`
          : "0 8px 32px rgba(0,0,0,0.38)",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        transition: "all 0.22s ease",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {(icon || label) && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
          {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
          {label && <span style={{ fontSize: 10, fontWeight: 800, color: accent, textTransform: "uppercase", letterSpacing: "1.8px" }}>{label}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

export default function LandingPage({ onGetStarted, onOpenCalculator }) {
  const { tSection } = useLanguage();
  const L = tSection("landing");

  // ── State (all declared before effects) ──────────────────────────────
  const [prices,     setPrices]     = useState([]);
  const [heroIn,     setHeroIn]     = useState(false);
  const [openFaq,    setOpenFaq]    = useState(null);
  const [battPct,    setBattPct]    = useState(20);
  const [needByHour, setNeedByHour] = useState(7);
  const [chargerKw,  setChargerKw]  = useState(7.4);
  const [planResult, setPlanResult] = useState(null);
  const planRef = useRef(null);

  // ── Effects ───────────────────────────────────────────────────────────
  useEffect(() => { setTimeout(() => setHeroIn(true), 40); }, []);

  useEffect(() => {
    fetch("/api/prices/today")
      .then(r => r.json())
      .then(d => { if (d.prices?.length) setPrices(d.prices); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!prices.length) return;
    const needed = ((100 - battPct) / 100) * 60;
    const hoursNeeded = Math.max(1, Math.ceil(needed / chargerKw));
    const now = new Date().getHours();
    const upcoming = prices.filter(p => {
      const h = new Date(p.timestamp_utc || p.timestamp).getHours();
      if (needByHour > now) return h >= now && h < needByHour;
      return h >= now || h < needByHour;
    }).sort((a, b) => new Date(a.timestamp_utc || a.timestamp) - new Date(b.timestamp_utc || b.timestamp));
    if (upcoming.length < hoursNeeded) { setPlanResult(null); return; }
    let best = null;
    for (let i = 0; i <= upcoming.length - hoursNeeded; i++) {
      const win = upcoming.slice(i, i + hoursNeeded);
      const avg = win.reduce((s, p) => s + p.price_eur_mwh, 0) / hoursNeeded;
      if (!best || avg < best.avg) {
        best = {
          avg, hours: hoursNeeded, needed,
          start: new Date(win[0].timestamp_utc || win[0].timestamp).getHours(),
          end:   new Date(win[hoursNeeded - 1].timestamp_utc || win[hoursNeeded - 1].timestamp).getHours() + 1,
          cost:  (avg / 1000 + 0.173) * needed,
        };
      }
    }
    const nowPrices = prices.filter(p => {
      const h = new Date(p.timestamp_utc || p.timestamp).getHours();
      return h >= now && h < now + hoursNeeded;
    });
    const nowAvg = nowPrices.length
      ? nowPrices.reduce((s, p) => s + p.price_eur_mwh, 0) / nowPrices.length
      : (prices.find(p => p.is_current)?.price_eur_mwh ?? 120);
    if (best) best.saving = Math.max(0, (nowAvg / 1000 + 0.173) * needed - best.cost);
    setPlanResult(best);
  }, [prices, battPct, needByHour, chargerKw]);

  // ── Derived values ────────────────────────────────────────────────────
  const current    = prices.find(p => p.is_current) || prices[prices.length - 1];
  const currentMwh = current?.price_eur_mwh ?? null;
  const currentCol = priceColor(currentMwh);
  const now        = new Date().getHours();
  const upcoming   = prices.filter(p => new Date(p.timestamp_utc || p.timestamp).getHours() >= now);
  const sorted     = [...upcoming].sort((a, b) => a.price_eur_mwh - b.price_eur_mwh);
  const cheapHour  = sorted[0] ? new Date(sorted[0].timestamp_utc || sorted[0].timestamp).getHours() : null;
  const cheapMwh   = sorted[0]?.price_eur_mwh ?? null;
  const peakEntry  = [...upcoming].sort((a, b) => b.price_eur_mwh - a.price_eur_mwh)[0];
  const peakH      = peakEntry ? new Date(peakEntry.timestamp_utc || peakEntry.timestamp).getHours() : null;
  const peakMwh    = peakEntry?.price_eur_mwh ?? null;
  const ratio      = cheapMwh && peakMwh && cheapMwh > 0 ? (peakMwh / cheapMwh).toFixed(1) : null;
  const hoursUntilCheap = cheapHour != null ? cheapHour - now : null;
  const cheapNow  = hoursUntilCheap === 0;
  const cheapSoon = hoursUntilCheap != null && hoursUntilCheap > 0 && hoursUntilCheap <= 2;

  const SUPPLIERS = [
    { name: "Engie",         abbr: "EN", color: "#fff",    bg: "#0066A1", accent: "#0066A1" },
    { name: "Luminus",       abbr: "LU", color: "#1a1a1a", bg: "#FFB800", accent: "#FFB800" },
    { name: "Bolt",          abbr: "⚡", color: "#fff",    bg: "#1A1A2E", accent: "#00C896" },
    { name: "TotalEnergies", abbr: "TE", color: "#fff",    bg: "#EF3340", accent: "#EF3340" },
    { name: "Eneco",         abbr: "EC", color: "#fff",    bg: "#00A651", accent: "#00A651" },
    { name: "Mega",          abbr: "MG", color: "#fff",    bg: "#7C3AED", accent: "#7C3AED" },
    { name: "Octa+",         abbr: "O+", color: "#fff",    bg: "#F97316", accent: "#F97316" },
  ];

  const faqs = [
    { q: L.faq1Q, a: L.faq1A },
    { q: L.faq2Q, a: L.faq2A },
    { q: L.faq3Q, a: L.faq3A },
    { q: L.faq4Q, a: L.faq4A },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#060B14", color: "#E8EDF5", fontFamily: "'DM Sans', system-ui, sans-serif", overflowX: "hidden" }}>

      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)", width: 900, height: 600, background: `radial-gradient(ellipse, ${currentCol}0B 0%, transparent 65%)`, transition: "background 3s ease" }} />
      </div>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(6,11,20,0.92)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "11px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🇧🇪</span>
          <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.5px" }}>SmartPrice</span>
          <span style={{ fontSize: 9, color: "#00C896", background: "rgba(0,200,150,0.12)", border: "1px solid rgba(0,200,150,0.3)", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>● LIVE</span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <ThemeSwitcher />
          <LangSwitcher style={{ marginRight: 4 }} />
          <a href="/ev-charging-belgium" style={{ padding: "7px 13px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.22)", color: "#00C896", textDecoration: "none" }}>🚗 EV</a>
          <button onClick={onGetStarted} style={{ padding: "9px 22px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#0D9488,#1A56A4)", border: "none", color: "#fff", cursor: "pointer" }}>
            Dashboard →
          </button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "52px 20px 16px", position: "relative", zIndex: 1 }}>
        <div style={{ opacity: heroIn ? 1 : 0, transform: heroIn ? "translateY(0)" : "translateY(18px)", transition: "all 0.65s ease" }}>

          {/* Urgency badge */}
          {prices.length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: cheapNow ? "rgba(16,185,129,0.13)" : cheapSoon ? "rgba(249,115,22,0.1)" : "rgba(13,148,136,0.08)",
                border: `1px solid ${cheapNow ? "rgba(16,185,129,0.4)" : cheapSoon ? "rgba(249,115,22,0.32)" : "rgba(13,148,136,0.22)"}`,
                borderRadius: 30, padding: "7px 18px", fontSize: 13, fontWeight: 700,
                color: cheapNow ? "#10B981" : cheapSoon ? "#F97316" : "#0D9488",
              }}>
                {cheapNow
                  ? `✅ Cheapest window is RIGHT NOW — €${cheapMwh?.toFixed(0)}/MWh`
                  : cheapSoon
                  ? `⚡ Cheapest window in ${hoursUntilCheap}h — Set your charger now`
                  : `⚡ Today's cheapest: ${fmtHour(cheapHour ?? 0)} · €${cheapMwh?.toFixed(0) ?? "—"}/MWh`}
              </div>
            </div>
          )}

          {/* Headline */}
          <h1 style={{ fontSize: "clamp(32px,6vw,64px)", fontWeight: 900, letterSpacing: "-2.5px", lineHeight: 1.05, margin: "0 0 10px", textAlign: "center" }}>
            <span style={{ background: "linear-gradient(135deg,#fff 20%,#0D9488 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Stop paying peak price</span>
          </h1>
          <p style={{ fontSize: "clamp(15px,2vw,19px)", color: "#556B82", textAlign: "center", margin: "0 0 36px", fontWeight: 500 }}>
            We tell you exactly when to charge — and how much you save.
          </p>

          {/* ── 3-TILE GRID ─────────────────────────────────────────────── */}
          {prices.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 14 }}>

              {/* Tile 1 — Live price */}
              <Tile accent={currentCol} icon="⚡" label="Belgium · Right now">
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: "clamp(44px,7vw,68px)", fontWeight: 900, fontFamily: "monospace", color: currentCol, lineHeight: 1, letterSpacing: "-2px" }}>
                    €{currentMwh?.toFixed(0) ?? "—"}
                  </span>
                  <span style={{ fontSize: 14, color: "#445566", fontWeight: 600 }}>/MWh</span>
                </div>
                <div style={{ fontSize: 13, color: "#445566", fontWeight: 600, marginBottom: 14 }}>
                  €{currentMwh != null ? retailKwh(currentMwh) : "—"}/kWh retail
                </div>
                <button onClick={onGetStarted} style={{ width: "100%", padding: "10px 0", borderRadius: 50, fontSize: 13, fontWeight: 800, background: "linear-gradient(135deg,#0D9488,#1A56A4)", border: "none", color: "#fff", cursor: "pointer", boxShadow: "0 4px 18px rgba(13,148,136,0.35)" }}>
                  See full schedule →
                </button>
              </Tile>

              {/* Tile 2 — Cheapest */}
              <Tile accent="#10B981" icon="✅" label="Cheapest today">
                <div style={{ fontSize: "clamp(36px,5vw,52px)", fontWeight: 900, color: "#10B981", fontFamily: "monospace", letterSpacing: "-1.5px", lineHeight: 1, marginBottom: 6 }}>
                  {fmtHour(cheapHour ?? 0)}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#10B981", marginBottom: 4 }}>
                  €{cheapMwh?.toFixed(0) ?? "—"}/MWh
                </div>
                <div style={{ fontSize: 12, color: "#445566", marginBottom: 4 }}>
                  €{cheapMwh != null ? retailKwh(cheapMwh) : "—"}/kWh retail
                </div>
                {ratio && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 8, padding: "4px 10px", marginTop: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#10B981" }}>{ratio}× cheaper than peak</span>
                  </div>
                )}
              </Tile>

              {/* Tile 3 — Peak */}
              <Tile accent="#EF4444" icon="⚠️" label="Peak — avoid">
                <div style={{ fontSize: "clamp(36px,5vw,52px)", fontWeight: 900, color: "#EF4444", fontFamily: "monospace", letterSpacing: "-1.5px", lineHeight: 1, marginBottom: 6 }}>
                  {fmtHour(peakH ?? 19)}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#EF4444", marginBottom: 4 }}>
                  €{peakMwh?.toFixed(0) ?? "—"}/MWh
                </div>
                <div style={{ fontSize: 12, color: "#445566", marginBottom: 4 }}>
                  €{peakMwh != null ? retailKwh(peakMwh) : "—"}/kWh retail
                </div>
                {ratio && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "4px 10px", marginTop: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#EF4444" }}>Pay {ratio}× more if you charge now</span>
                  </div>
                )}
              </Tile>

            </div>
          ) : (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "40px", textAlign: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: "#334455" }}>Loading live prices…</div>
            </div>
          )}

          {/* Trust badges */}
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 8 }}>
            {[
              { icon: "🇧🇪", text: L.badgeBelgian || "Belgian data" },
              { icon: "🆓", text: L.badgeFree || "Free forever" },
              { icon: "⚡", text: L.badgeUpdated || "Every 15 min" },
              { icon: "🔒", text: L.badgeGdpr || "GDPR" },
            ].map(b => (
              <span key={b.text} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#334455" }}>{b.icon} {b.text}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── EV PLANNER TILE ──────────────────────────────────────────────── */}
      <section ref={planRef} style={{ maxWidth: 900, margin: "0 auto 40px", padding: "0 20px", position: "relative", zIndex: 1 }}>
        <Tile accent="#00C896" icon="🔋" label="EV Charge Planner — cheapest window for your battery">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 22 }}>

            {/* Battery */}
            <div>
              <label style={{ fontSize: 10, color: "#445566", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, display: "block", marginBottom: 8 }}>
                Battery now: <span style={{ color: "#00C896" }}>{battPct}%</span>
              </label>
              <input type="range" min={5} max={90} step={5} value={battPct} onChange={e => setBattPct(+e.target.value)}
                style={{ width: "100%", accentColor: "#00C896", cursor: "pointer" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#2A3A4A", marginTop: 3 }}>
                <span>5%</span><span>50%</span><span>90%</span>
              </div>
            </div>

            {/* Need by */}
            <div>
              <label style={{ fontSize: 10, color: "#445566", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, display: "block", marginBottom: 8 }}>Full by:</label>
              <select value={needByHour} onChange={e => setNeedByHour(+e.target.value)}
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "9px 12px", color: "#E2E8F0", fontSize: 14, fontWeight: 700, cursor: "pointer", outline: "none" }}>
                {[5,6,7,8,9,10,11,12].map(h => (
                  <option key={h} value={h} style={{ background: "#0A1628" }}>{String(h).padStart(2,"0")}:00{h <= 8 ? " (morning)" : ""}</option>
                ))}
              </select>
            </div>

            {/* Charger */}
            <div>
              <label style={{ fontSize: 10, color: "#445566", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, display: "block", marginBottom: 8 }}>Charger:</label>
              <div style={{ display: "flex", gap: 5 }}>
                {[3.7, 7.4, 11, 22].map(kw => (
                  <button key={kw} onClick={() => setChargerKw(kw)} style={{ flex: 1, padding: "9px 4px", borderRadius: 10, fontSize: 11, fontWeight: 700, border: `1px solid ${chargerKw === kw ? "rgba(0,200,150,0.5)" : "rgba(255,255,255,0.1)"}`, background: chargerKw === kw ? "rgba(0,200,150,0.15)" : "rgba(255,255,255,0.03)", color: chargerKw === kw ? "#00C896" : "#556B82", cursor: "pointer" }}>
                    {kw}kW
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Result */}
          {planResult ? (
            <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.28)", borderRadius: 16, padding: "20px 22px" }}>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 10, color: "#10B981", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 700, marginBottom: 6 }}>⚡ Optimal window</div>
                  <div style={{ fontSize: "clamp(26px,4vw,38px)", fontWeight: 900, color: "#10B981", fontFamily: "monospace", letterSpacing: "-1px", marginBottom: 4 }}>
                    {fmtHour(planResult.start)} – {fmtHour(planResult.end)}
                  </div>
                  <div style={{ fontSize: 12, color: "#334455" }}>{planResult.hours}h · {planResult.needed.toFixed(0)} kWh</div>
                </div>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#445566", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Cost</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: "#10B981", fontFamily: "monospace" }}>€{planResult.cost.toFixed(2)}</div>
                  </div>
                  {planResult.saving > 0.05 && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "#445566", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>vs now</div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: "#F97316", fontFamily: "monospace" }}>-€{planResult.saving.toFixed(2)}</div>
                    </div>
                  )}
                  {planResult.saving > 0.05 && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "#445566", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Per year ×250</div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: "#F97316", fontFamily: "monospace" }}>-€{(planResult.saving * 250).toFixed(0)}</div>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={onGetStarted} style={{ padding: "10px 24px", borderRadius: 50, fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#0D9488,#1A56A4)", border: "none", color: "#fff", cursor: "pointer" }}>
                  Get alerts for this window →
                </button>
                <span style={{ fontSize: 11, color: "#334455" }}>Free · No credit card</span>
              </div>
            </div>
          ) : (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px", textAlign: "center" }}>
              <span style={{ fontSize: 13, color: "#445566" }}>{prices.length ? "Adjust inputs to calculate your window" : "Loading prices…"}</span>
            </div>
          )}
        </Tile>
      </section>

      {/* ── 24H PRICE SCHEDULE TILE ──────────────────────────────────────── */}
      {prices.length > 0 && (
        <section style={{ maxWidth: 900, margin: "0 auto 40px", padding: "0 20px", position: "relative", zIndex: 1 }}>
          <Tile accent="#1A56A4" icon="📊" label="Today's price schedule — 24 hours">
            <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 70, marginBottom: 8 }}>
              {prices.slice(0, 24).map((p, i) => {
                const maxP = Math.max(...prices.slice(0, 24).map(x => Math.max(x.price_eur_mwh, 0)));
                const barH = maxP > 0 ? Math.max((p.price_eur_mwh / maxP) * 100, 4) : 4;
                const col  = priceColor(p.price_eur_mwh);
                return (
                  <div key={i} style={{ flex: 1, height: `${barH}%`, borderRadius: "3px 3px 0 0", background: p.is_current ? col : `${col}66`, border: p.is_current ? `1px solid ${col}` : "none", boxShadow: p.is_current ? `0 0 8px ${col}88` : "none", transition: "all 0.15s" }}
                    title={`${String(new Date(p.timestamp_utc || p.timestamp).getHours()).padStart(2,"0")}:00 — €${p.price_eur_mwh?.toFixed(0)}/MWh`} />
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#2A3A4A", marginBottom: 14 }}>
              {["00:00","06:00","12:00","18:00","23:00"].map(h => <span key={h}>{h}</span>)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#3A4D63" }}>
                <span><span style={{ color: "#10B981" }}>■</span> Cheap</span>
                <span><span style={{ color: "#F59E0B" }}>■</span> Mid</span>
                <span><span style={{ color: "#EF4444" }}>■</span> Peak</span>
              </div>
              <button onClick={onGetStarted} style={{ padding: "7px 18px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.3)", color: "#00C896", cursor: "pointer" }}>
                Open dashboard with alerts →
              </button>
            </div>
          </Tile>
        </section>
      )}

      {/* ── PLAN CALCULATOR TILE ─────────────────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: "0 auto 40px", padding: "0 20px", position: "relative", zIndex: 1 }}>
        <Tile accent="#0D9488" icon="🔌" label="Plan Calculator" onClick={() => onOpenCalculator && onOpenCalculator("electricity")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: "clamp(17px,2.5vw,22px)", fontWeight: 900, color: "#E2E8F0", letterSpacing: "-0.5px", marginBottom: 6 }}>Is your current supplier the cheapest?</div>
              <div style={{ fontSize: 13, color: "#556B82" }}>Compare all 7 Belgian suppliers · real annual cost · 30 seconds</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.28)", borderRadius: 12, padding: "8px 14px" }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: "#10B981", fontFamily: "monospace" }}>€987</span>
                <span style={{ fontSize: 10, color: "#556B82" }}>vs €1,204 (cheapest vs most expensive)</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0D9488" }}>{L.calcCta || "Calculate my plan →"}</span>
            </div>
          </div>
        </Tile>
      </section>

      {/* ── SUPPLIERS TILE ───────────────────────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: "0 auto 40px", padding: "0 20px", position: "relative", zIndex: 1 }}>
        <Tile accent="#334455" label="7 Belgian suppliers tracked">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {SUPPLIERS.map(s => (
              <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8, background: `${s.accent}0A`, border: `1px solid ${s.accent}28`, borderRadius: 12, padding: "8px 14px", transition: "all 0.18s", cursor: "default" }}
                onMouseEnter={e => { e.currentTarget.style.border = `1px solid ${s.accent}55`; e.currentTarget.style.background = `${s.accent}15`; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.border = `1px solid ${s.accent}28`; e.currentTarget.style.background = `${s.accent}0A`; e.currentTarget.style.transform = "translateY(0)"; }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: s.color, flexShrink: 0 }}>{s.abbr}</div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#B0C4D8" }}>{s.name}</span>
              </div>
            ))}
          </div>
        </Tile>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 720, margin: "0 auto 52px", padding: "0 20px", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 10, color: "#0D9488", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 16 }}>FAQ</div>
        {faqs.filter(f => f.q).map((f, i) => (
          <div key={i} onClick={() => setOpenFaq(openFaq === i ? null : i)}
            style={{ background: openFaq === i ? "rgba(13,148,136,0.05)" : "rgba(255,255,255,0.02)", border: `1px solid ${openFaq === i ? "rgba(13,148,136,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: 14, overflow: "hidden", cursor: "pointer", marginBottom: 8, boxShadow: openFaq === i ? "0 4px 20px rgba(0,0,0,0.3)" : "none", transition: "all 0.2s" }}>
            <div style={{ padding: "15px 20px", fontSize: 14, fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center", color: openFaq === i ? "#0D9488" : "#DDE8F0" }}>
              {f.q}
              <span style={{ color: "#0D9488", fontSize: 20, fontWeight: 300, flexShrink: 0, marginLeft: 12, transform: openFaq === i ? "rotate(45deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>+</span>
            </div>
            {openFaq === i && (
              <div style={{ padding: "0 20px 16px", fontSize: 13, color: "#6B7E99", lineHeight: 1.8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ paddingTop: 12 }}>{f.a}</div>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "36px 24px 28px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 28, marginBottom: 28 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 17 }}>🇧🇪</span>
                <span style={{ fontWeight: 900, fontSize: 16, letterSpacing: "-0.5px" }}>SmartPrice.be</span>
              </div>
              <div style={{ fontSize: 12, color: "#334455", lineHeight: 2 }}>
                <a href="mailto:hello@smartprice.be" style={{ color: "#0D9488", textDecoration: "none" }}>hello@smartprice.be</a>
              </div>
            </div>
            <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 10, color: "#334455", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10, fontWeight: 700 }}>Product</div>
                {[
                  { label: "⚡ Electricity Prices", action: onGetStarted },
                  { label: "🔥 Gas Prices",        action: onGetStarted },
                  { label: "🔌 Plan Calculator",   action: () => onOpenCalculator && onOpenCalculator("electricity") },
                  { label: "🚗 EV Charging",       action: () => window.location.href = "/ev-charging-belgium" },
                  { label: "🗺️ Charging Stations", action: () => window.location.href = "/ev-charging-stations-belgium" },
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

          {/* Share row */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 18, marginBottom: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#334455", marginRight: 4 }}>{L.shareLabel || "Share SmartPrice:"}</span>
            {[
              { label: "WhatsApp", icon: "💬", color: "#25D366", href: `https://wa.me/?text=${encodeURIComponent("⚡ SmartPrice.be — tells you exactly when to charge your EV to save money. Live EPEX prices, free. https://smartprice.be")}` },
              { label: "X",        icon: "𝕏",  color: "#fff",    href: `https://twitter.com/intent/tweet?text=${encodeURIComponent("⚡ SmartPrice.be — live electricity prices for Belgium + EV charge planner. Free. https://smartprice.be")}` },
              { label: "Facebook", icon: "f",  color: "#1877F2", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://smartprice.be")}` },
              { label: "LinkedIn", icon: "in", color: "#0A66C2", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://smartprice.be")}` },
              { label: "Email",    icon: "✉",  color: "#94A3B8", href: `mailto:?subject=${encodeURIComponent("SmartPrice.be — free EV charge optimizer for Belgium")}&body=${encodeURIComponent("Check this out: SmartPrice.be tells you exactly when to charge your EV to save the most. Free tool for Belgium — https://smartprice.be")}` },
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

      <style>{`* { box-sizing: border-box; } input[type=range] { height: 4px; } select option { background: #0A1628; }`}</style>
    </div>
  );
}
