/**
 * LandingPage.jsx — SmartPrice.be
 * v3: decision-first hero. The ANSWER is the headline.
 * Philosophy: show "charge between 14:00–16:00" before anything else.
 */
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "../context/LanguageContext";
import LangSwitcher  from "../components/LangSwitcher";
import ThemeSwitcher from "../components/ThemeSwitcher";

function retailKwh(mwh) { return ((mwh / 1000) + 0.173); }
function retailFmt(mwh) { return retailKwh(mwh).toFixed(3); }
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

function Tile({ accent = "#0D9488", icon, label, children, onClick, style = {} }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${hov ? accent + "55" : "rgba(255,255,255,0.09)"}`,
        borderTop: `3px solid ${accent}`,
        borderRadius: 20,
        padding: "22px 24px",
        boxShadow: hov ? `0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px ${accent}18` : "0 8px 32px rgba(0,0,0,0.35)",
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        transition: "all 0.22s ease",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}>
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
  const { tSection, lang } = useLanguage();
  const L = tSection("landing");

  useEffect(() => {
    document.title = "SmartPrice.be — Live Belgian Electricity & Gas Prices | Free";
    const desc = document.querySelector("meta[name='description']");
    if (desc) desc.setAttribute("content", "Track live EPEX Spot electricity prices in Belgium, compare all suppliers, find the cheapest hours to charge your EV, and set price alerts. 100% free.");
    const canonical = document.getElementById('canonical-tag');
    if (canonical) canonical.setAttribute("href", "https://smartprice.be/");
  }, []);

  // ── State ─────────────────────────────────────────────────────────────
  const [prices,     setPrices]     = useState([]);
  const [heroIn,     setHeroIn]     = useState(false);
  const [openFaq,    setOpenFaq]    = useState(null);
  const [battPct,    setBattPct]    = useState(20);
  const [needByHour, setNeedByHour] = useState(7);
  const [chargerKw,  setChargerKw]  = useState(7.4);
  const [planResult, setPlanResult] = useState(null);
  const [tick,       setTick]       = useState(0); // for live countdown
  const [hasSolar,   setHasSolar]   = useState(false);
  const [leadEmail,  setLeadEmail]  = useState("");
  const [leadState,  setLeadState]  = useState("idle"); // idle | loading | done | error
  const [fluviusEmail,  setFluviusEmail]  = useState("");
  const [fluviusState,  setFluviusState]  = useState("idle");
  const [fetchedAt,     setFetchedAt]     = useState(null);
  const [siteStats,     setSiteStats]     = useState(null);
  const [gasCurrent,    setGasCurrent]    = useState(null);
  const planRef = useRef(null);

  // ── Effects ───────────────────────────────────────────────────────────
  useEffect(() => { setTimeout(() => setHeroIn(true), 40); }, []);

  useEffect(() => {
    fetch("/api/prices/today")
      .then(r => r.json())
      .then(d => { if (d.data?.length) { setPrices(d.data); setFetchedAt(d.fetched_at || new Date().toISOString()); } })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/gas/current")
      .then(r => r.json())
      .then(d => { if (d.success && d.ttf) setGasCurrent({ price: d.ttf.price, ttf_cEkWh: d.ttf_cEkWh }); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/stats")
      .then(r => r.json())
      .then(d => { if (d.success) setSiteStats(d); })
      .catch(() => {});
  }, []);

  // Countdown ticker — updates every 60s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // EV plan computation
  useEffect(() => {
    if (!prices.length) return;
    const needed = ((100 - battPct) / 100) * 60;
    const hoursNeeded = Math.max(1, Math.ceil(needed / chargerKw));
    const nowH = new Date().getHours();
    const upcoming = prices.filter(p => {
      const h = new Date(p.timestamp_utc || p.timestamp).getHours();
      if (needByHour > nowH) return h >= nowH && h < needByHour;
      return h >= nowH || h < needByHour;
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
    const nowSlice = prices.filter(p => {
      const h = new Date(p.timestamp_utc || p.timestamp).getHours();
      return h >= nowH && h < nowH + hoursNeeded;
    });
    const nowAvg = nowSlice.length
      ? nowSlice.reduce((s, p) => s + p.price_eur_mwh, 0) / nowSlice.length
      : (prices.find(p => p.is_current)?.price_eur_mwh ?? 120);
    if (best) best.saving = Math.max(0, (nowAvg / 1000 + 0.173) * needed - best.cost);
    setPlanResult(best);
  }, [prices, battPct, needByHour, chargerKw]);

  // ── Derived values ────────────────────────────────────────────────────
  const nowDate    = new Date();
  const nowH       = nowDate.getHours();
  const nowM       = nowDate.getMinutes();

  const current    = prices.find(p => p.is_current) || prices[prices.length - 1];
  const currentMwh = current?.price_eur_mwh ?? null;
  const currentCol = priceColor(currentMwh);

  // Use backend-computed `hour` (Brussels timezone) — never rely on browser getHours() for price slots
  const currentHour = current?.hour ?? nowH;
  const upcoming    = prices.filter(p => p.hour != null ? p.hour >= currentHour && p.day === "today" || p.day === "tomorrow" : false);
  const sorted      = [...upcoming].sort((a, b) => a.price_eur_mwh - b.price_eur_mwh);

  // Skip current hour for "cheapest" so we always show a FUTURE window to act on
  const futureOnly  = sorted.filter(p => !(p.is_current));
  const cheapEntry  = futureOnly[0] || sorted[0];
  const cheapHour   = cheapEntry?.hour ?? null;
  const cheapMwh    = cheapEntry?.price_eur_mwh ?? null;
  const cheapIsNow  = cheapEntry?.is_current ?? false;

  // Cheap window = cheapest 2 consecutive hours
  let cheapWindowEnd = cheapHour != null ? cheapHour + 1 : null;
  if (cheapHour != null && futureOnly[1] && Math.abs(futureOnly[1].hour - cheapHour) <= 1) {
    cheapWindowEnd = Math.max(cheapHour, futureOnly[1].hour) + 1;
  }

  const peakEntry  = [...upcoming].sort((a, b) => b.price_eur_mwh - a.price_eur_mwh)[0];
  const peakH      = peakEntry?.hour ?? null;
  const peakMwh    = peakEntry?.price_eur_mwh ?? null;

  // Savings: assume 40kWh fill-up for a typical EV
  const FILL_KWH   = 40;
  const savingToday = (currentMwh != null && cheapMwh != null)
    ? Math.max(0, (retailKwh(currentMwh) - retailKwh(cheapMwh)) * FILL_KWH)
    : null;

  // Urgency countdown
  const minsUntilCheap = cheapHour != null ? (cheapHour - nowH) * 60 - nowM : null;
  const cheapNow  = minsUntilCheap != null && minsUntilCheap <= 0;
  const cheapSoon = minsUntilCheap != null && minsUntilCheap > 0 && minsUntilCheap <= 90;

  const countdownStr = minsUntilCheap < 60 ? `${minsUntilCheap} min` : `${Math.floor(minsUntilCheap/60)}h ${minsUntilCheap%60}m`;
  let urgencyText = null;
  let urgencyColor = "#0D9488";
  if (prices.length) {
    if (cheapNow) {
      urgencyText = L.urgencyNow || "⚡ CHEAPEST WINDOW IS RIGHT NOW — Plug in now";
      urgencyColor = "#10B981";
    } else if (cheapSoon) {
      urgencyText = (L.urgencySoon || "⚡ Cheapest window starts in {x} — get ready").replace("{x}", countdownStr);
      urgencyColor = "#F97316";
    } else if (cheapHour != null) {
      urgencyText = (L.urgencyLater || "Today's cheapest: {time} · €{price}/MWh").replace("{time}", fmtHour(cheapHour)).replace("{price}", cheapMwh?.toFixed(0));
      urgencyColor = "#0D9488";
    }
  }

  // "Updated X min ago" — recalculates every tick (every 60s)
  const updatedMinsAgo = fetchedAt ? Math.max(0, Math.floor((Date.now() - new Date(fetchedAt).getTime()) / 60000)) : null;
  const updatedStr = updatedMinsAgo === null ? null : updatedMinsAgo === 0 ? "just now" : `${updatedMinsAgo} min ago`;

  // Habit trigger: tomorrow's prices publish around 14:00 CET
  const tomorrowPublishHour = 14;
  const showTomorrowTeaser = prices.length > 0 && nowH < tomorrowPublishHour;

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

  async function submitFluvius(e) {
    e.preventDefault();
    if (!fluviusEmail || fluviusState === "loading" || fluviusState === "done") return;
    setFluviusState("loading");
    try {
      const r = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fluviusEmail, source: "fluvius_waitlist" }),
      });
      if (r.ok) setFluviusState("done");
      else setFluviusState("error");
    } catch { setFluviusState("error"); }
  }

  async function submitLead(e) {
    e.preventDefault();
    if (!leadEmail || leadState === "loading" || leadState === "done") return;
    setLeadState("loading");
    try {
      const r = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: leadEmail, source: "landing" }),
      });
      if (r.ok) setLeadState("done");
      else setLeadState("error");
    } catch { setLeadState("error"); }
  }

  const CTAButton = ({ label = "Start saving on every charge →", style = {} }) => (
    <button onClick={onGetStarted} style={{
      padding: "14px 32px", borderRadius: 50, fontSize: 15, fontWeight: 800,
      background: "linear-gradient(135deg,#10B981,#0D9488)", border: "none",
      color: "#fff", cursor: "pointer", boxShadow: "0 6px 28px rgba(16,185,129,0.45)",
      whiteSpace: "nowrap", transition: "all 0.2s", ...style,
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 36px rgba(16,185,129,0.55)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(16,185,129,0.45)"; }}>
      {label}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#060B14", color: "#E8EDF5", fontFamily: "'DM Sans', system-ui, sans-serif", overflowX: "hidden" }}>

      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)", width: 900, height: 600, background: `radial-gradient(ellipse, ${currentCol}0A 0%, transparent 65%)`, transition: "background 3s ease" }} />
      </div>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(6,11,20,0.94)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "11px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🇧🇪</span>
          <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.5px" }}>SmartPrice</span>
          <span style={{ fontSize: 9, color: "#10B981", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>● LIVE</span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <ThemeSwitcher />
          <LangSwitcher style={{ marginRight: 4 }} />
          <a href="/ev-charging-belgium" style={{ padding: "7px 13px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.22)", color: "#00C896", textDecoration: "none" }}>🚗 EV</a>
          <a href="/business" style={{ padding: "7px 13px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "rgba(30,64,175,0.1)", border: "1px solid rgba(30,64,175,0.3)", color: "#60A5FA", textDecoration: "none" }}>🏢 Business</a>
          <button onClick={onGetStarted} style={{ padding: "9px 22px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#10B981,#0D9488)", border: "none", color: "#fff", cursor: "pointer" }}>
            Dashboard →
          </button>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════
          HERO — THE DECISION ENGINE
          First thing visible = "Charge between 14:00–16:00"
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 860, margin: "0 auto", padding: "48px 20px 0", position: "relative", zIndex: 1 }}>
        <div style={{ opacity: heroIn ? 1 : 0, transform: heroIn ? "translateY(0)" : "translateY(16px)", transition: "all 0.6s ease" }}>

          {/* Negative price alert banner */}
          {currentMwh != null && currentMwh < 0 && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                background: "linear-gradient(135deg,rgba(0,229,255,0.12),rgba(0,200,150,0.08))",
                border: "1px solid rgba(0,229,255,0.45)",
                borderRadius: 30, padding: "10px 22px",
                fontSize: 14, fontWeight: 800, color: "#00E5FF",
                boxShadow: "0 0 24px rgba(0,229,255,0.2)",
                animation: "pulse-elec 2s infinite",
                cursor: "pointer",
              }} onClick={onGetStarted}>
                <span style={{ fontSize: 20 }}>⚡</span>
                <span>
                  Electricity is <strong>FREE</strong> right now — {currentMwh.toFixed(1)} €/MWh
                  &nbsp;·&nbsp;
                  <span style={{ textDecoration: "underline" }}>
                    {lang === "nl" ? "Laad nu op →" : lang === "fr" ? "Rechargez maintenant →" : "Charge now →"}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Context label */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 700, color: "#F59E0B" }}>
              <span>⚡</span><span>Live Belgian electricity prices — updated every 15 min</span>
            </div>
          </div>

          {/* Social proof counter */}
          {siteStats && (siteStats.ev_views_today > 10 || siteStats.registered_users > 10) && (
            <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 16, flexWrap: "wrap" }}>
              {siteStats.ev_views_today > 10 && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748B" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00C896", boxShadow: "0 0 6px #00C896", display: "inline-block" }} />
                  <span><strong style={{ color: "#E2E8F0" }}>{siteStats.ev_views_today.toLocaleString()}</strong> people checked EV prices today</span>
                </div>
              )}
              {siteStats.registered_users > 10 && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748B" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3B82F6", boxShadow: "0 0 6px #3B82F6", display: "inline-block" }} />
                  <span><strong style={{ color: "#E2E8F0" }}>{siteStats.registered_users}</strong> users tracking Belgian energy</span>
                </div>
              )}
            </div>
          )}

          {/* Headline */}
          <h1 style={{ fontSize: "clamp(32px,6vw,62px)", fontWeight: 900, letterSpacing: "-2.5px", lineHeight: 1.05, margin: "0 0 8px", textAlign: "center" }}>
            <span style={{ background: "linear-gradient(135deg,#fff 20%,#10B981 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{L.headline || "Stop paying peak price"}</span>
          </h1>
          <p style={{ fontSize: "clamp(14px,2vw,18px)", color: "#556B82", textAlign: "center", margin: "0 0 20px", fontWeight: 500 }}>
            {L.tagline || "We tell you exactly when to charge — and how much you save."}
          </p>

          {/* Product scope row */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
            {[
              { icon: "⚡", label: L.pillElec || "Electricity prices", color: "#F59E0B", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
              { icon: "🔥", label: L.pillGas  || "Gas prices",         color: "#F97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.25)" },
              { icon: "🚗", label: L.pillEv   || "EV charging",        color: "#10B981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)" },
            ].map(p => (
              <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 6, background: p.bg, border: `1px solid ${p.border}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: p.color }}>
                <span>{p.icon}</span><span>{p.label}</span>
              </div>
            ))}
          </div>

          {/* Urgency pill */}
          {urgencyText && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: cheapNow ? "rgba(16,185,129,0.13)" : cheapSoon ? "rgba(249,115,22,0.12)" : "rgba(13,148,136,0.08)",
                border: `1px solid ${cheapNow ? "rgba(16,185,129,0.45)" : cheapSoon ? "rgba(249,115,22,0.4)" : "rgba(13,148,136,0.22)"}`,
                borderRadius: 30, padding: "8px 20px", fontSize: 13, fontWeight: 800, color: urgencyColor,
                boxShadow: cheapNow ? "0 0 20px rgba(16,185,129,0.2)" : cheapSoon ? "0 0 16px rgba(249,115,22,0.15)" : "none",
              }}>
                {urgencyText}
              </div>
            </div>
          )}

          {/* ── MAIN CARD (zinc style) ── */}
          <div style={{
            background: "rgba(24,24,27,0.85)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(63,63,70,0.8)",
            borderRadius: 20,
            boxShadow: "0 24px 48px rgba(0,0,0,0.6)",
            overflow: "hidden",
            marginBottom: 14,
          }}>
            {prices.length > 0 && cheapHour != null ? (
              <div style={{ padding: "24px 24px 20px" }}>

                {/* Card header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#F59E0B" }}>
                    <span>⚡</span><span>Electricity · EPEX Spot Belgium</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#52525b", fontWeight: 600 }}>Today's prices</div>
                </div>

                {/* Price grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  {/* Cheapest */}
                  <div style={{ background: "rgba(39,39,42,0.9)", border: "1px solid rgba(63,63,70,0.6)", borderRadius: 14, padding: "16px 18px" }}>
                    <div style={{ fontSize: 11, color: "#71717a", marginBottom: 6, fontWeight: 600 }}>
                      {cheapIsNow ? "⚡ Cheapest — plug in now" : (cheapEntry?.day === "tomorrow" ? "Best window (tomorrow)" : "Best window today")}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#f4f4f5", marginBottom: 4, fontFamily: "monospace", letterSpacing: "-0.5px" }}>
                      {cheapIsNow ? "Right now!" : `${fmtHour(cheapHour)} – ${fmtHour((cheapWindowEnd ?? cheapHour + 2))}`}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#4ade80", animation: "priceGlow 3s ease-in-out infinite" }}>€{retailFmt(cheapMwh)}/kWh</div>
                  </div>

                  {/* Most expensive */}
                  <div style={{ background: "rgba(39,39,42,0.9)", border: "1px solid rgba(63,63,70,0.6)", borderRadius: 14, padding: "16px 18px" }}>
                    <div style={{ fontSize: 11, color: "#71717a", marginBottom: 6, fontWeight: 600 }}>{L.mostExpensiveLabel || "Most expensive"}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#f4f4f5", marginBottom: 4, fontFamily: "monospace", letterSpacing: "-0.5px" }}>
                      {peakH != null ? `${fmtHour(peakH)} – ${fmtHour(peakH + 2)}` : "—"}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#f87171" }}>€{peakMwh != null ? retailFmt(peakMwh) : "—"}/kWh</div>
                  </div>
                </div>

                {/* Cost comparison block */}
                <div style={{ background: "rgba(39,39,42,0.9)", border: "1px solid rgba(63,63,70,0.6)", borderRadius: 14, padding: "16px 18px", marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: "#71717a", marginBottom: 10, fontWeight: 600 }}>{L.fullChargeLabel || "Full charge cost (40 kWh)"}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 14, color: "#a1a1aa" }}>{cheapIsNow ? "Now (cheapest)" : `Best window (${fmtHour(cheapHour)})`}</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#4ade80" }}>€{(retailKwh(cheapMwh) * 40).toFixed(2)}</span>
                  </div>
                  {currentMwh != null && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 14, color: "#a1a1aa" }}>{L.rightNowLabel || "Right now"} ({fmtHour(nowH)})</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: currentCol }}>€{(retailKwh(currentMwh) * 40).toFixed(2)}</span>
                    </div>
                  )}
                  {savingToday != null && savingToday > 0.3 && (
                    <div style={{ borderTop: "1px solid rgba(63,63,70,0.5)", paddingTop: 10, fontSize: 15, fontWeight: 700, color: "#4ade80" }}>
                      {(L.youSave || "→ You save €{x} per charge").replace("{x}", savingToday.toFixed(2))}
                    </div>
                  )}
                </div>

                {/* Solar toggle */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 14px", background: hasSolar ? "rgba(251,191,36,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${hasSolar ? "rgba(251,191,36,0.3)" : "rgba(63,63,70,0.5)"}`, borderRadius: 12, cursor: "pointer", transition: "all 0.2s" }}
                  onClick={() => setHasSolar(s => !s)}>
                  <div style={{ width: 36, height: 20, borderRadius: 10, background: hasSolar ? "#f59e0b" : "rgba(63,63,70,0.8)", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                    <div style={{ position: "absolute", top: 2, left: hasSolar ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: hasSolar ? "#fbbf24" : "#71717a" }}>
                    ☀️ {L.hasSolarLabel || "I have solar panels"}
                  </span>
                  {hasSolar && cheapMwh != null && (
                    <span style={{ fontSize: 11, color: "#a16207", marginLeft: "auto" }}>{L.capacityTariffApplies || "capacity tariff applies"}</span>
                  )}
                </div>

                {/* Solar capacity tariff warning */}
                {hasSolar && cheapMwh != null && (
                  <div style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24", marginBottom: 4 }}>{L.capacityTariffLabel || "☀️ Capacity tariff (Fluvius) impact"}</div>
                    <div style={{ fontSize: 12, color: "#a16207", lineHeight: 1.7 }}>
                      {(L.capacityTariffDesc || "Charging at peak ({peak}) sets your monthly peak demand — adding ~€20–30 to your Fluvius bill. Charging at {cheap} avoids this.").replace("{peak}", fmtHour(peakH ?? 19)).replace("{cheap}", fmtHour(cheapHour))} <span style={{ color: "#fbbf24", fontWeight: 700 }}>{(L.capacityTariffRealSaving || "Real saving: €{x}/month.").replace("{x}", ((savingToday ?? 0) + 22).toFixed(0))}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#713f12", marginTop: 6 }}>{L.fluviusComingSoon || "Full Fluvius integration coming soon →"}</div>
                  </div>
                )}

                {/* Action */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#60a5fa", marginBottom: 14 }}>
                    {(L.chargeBeforeCta || "👉 Charge before {x} to save money").replace("{x}", fmtHour(cheapWindowEnd ?? cheapHour + 2))}
                  </div>
                  <CTAButton label={L.mainCta || "Start saving on every charge →"} style={{ width: "100%", fontSize: 15, padding: "14px 0", borderRadius: 14 }} />
                  <div style={{ fontSize: 11, color: "#3f3f46", marginTop: 10 }}>{L.freeNote || "Free · No account needed · 30 sec to set alerts"}</div>
                </div>

              </div>
            ) : (
              <div style={{ padding: "52px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "#52525b" }}>Loading live prices…</div>
              </div>
            )}

            {/* Card footer — trust signal + live timestamp */}
            <div style={{ borderTop: "1px solid rgba(63,63,70,0.5)", padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#52525b" }}>
                Based on real-time Belgian EPEX electricity prices
              </span>
              {updatedStr && (
                <span style={{ fontSize: 11, color: "#3f3f46", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block", animation: "dot-pulse 2s ease-in-out infinite" }} />
                  Updated {updatedStr}
                </span>
              )}
            </div>
          </div>

          {/* Habit trigger — tomorrow's prices */}
          {showTomorrowTeaser && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 12, marginTop: 10, fontSize: 12, color: "#60a5fa", fontWeight: 600 }}>
              <span>📅</span>
              <span>Tomorrow's cheapest hours publish at {String(tomorrowPublishHour).padStart(2,"0")}:00 — check back then</span>
            </div>
          )}

          {/* Trust */}
          <div style={{ display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap", marginBottom: 8 }}>
            {["🇧🇪 Belgian data", "🆓 Free forever", "⚡ Every 15 min", "🔒 GDPR"].map(b => (
              <span key={b} style={{ fontSize: 11, color: "#3f3f46" }}>{b}</span>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          PLATFORM HUB — 4 audience cards
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 860, margin: "28px auto 0", padding: "0 20px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#556B82", textTransform: "uppercase", letterSpacing: "2px" }}>SmartPrice is built for</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {[
            {
              icon: "👤",
              label: "Households",
              accent: "#0D9488",
              desc: "Live prices · EV charging · Price alerts · Supplier compare",
              cta: "You're here ↓",
              href: null,
              active: true,
            },
            {
              icon: "🏢",
              label: "Business",
              accent: "#1E40AF",
              desc: "Fleet EV cost management · Reimbursement tracking · HR reports",
              cta: "Explore Business →",
              href: "/business",
              active: false,
            },
            {
              icon: "🚗",
              label: "Fleet Audit",
              accent: "#F59E0B",
              desc: "Free audit · See exactly how much your company overpays on EV reimbursements",
              cta: "Free audit →",
              href: "/fleet-audit",
              active: false,
            },
            {
              icon: "🔌",
              label: "API & HA",
              accent: "#7C3AED",
              desc: "Home Assistant HACS · REST API · Public endpoints for developers",
              cta: "View docs →",
              href: "/api-docs",
              active: false,
            },
          ].map(card => (
            <div
              key={card.label}
              onClick={() => card.href && (window.location.href = card.href)}
              style={{
                background: card.active ? `rgba(13,148,136,0.07)` : "rgba(255,255,255,0.025)",
                border: `1px solid ${card.active ? card.accent + "44" : "rgba(255,255,255,0.07)"}`,
                borderTop: `3px solid ${card.accent}`,
                borderRadius: 16,
                padding: "18px 16px",
                cursor: card.href ? "pointer" : "default",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { if (card.href) { e.currentTarget.style.background = `rgba(255,255,255,0.045)`; e.currentTarget.style.transform = "translateY(-2px)"; } }}
              onMouseLeave={e => { e.currentTarget.style.background = card.active ? `rgba(13,148,136,0.07)` : "rgba(255,255,255,0.025)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={{ fontSize: 22, marginBottom: 8 }}>{card.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: card.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 6 }}>{card.label}</div>
              <div style={{ fontSize: 12, color: "#556B82", lineHeight: 1.6, marginBottom: 12, minHeight: 52 }}>{card.desc}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: card.active ? card.accent : "#64748B" }}>{card.cta}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          GAS PRICE TILE
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 860, margin: "20px auto 0", padding: "0 20px", position: "relative", zIndex: 1 }}>
        <div style={{
          background: "rgba(24,24,27,0.85)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(249,115,22,0.25)", borderRadius: 18,
          padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14,
        }}>
          {/* Left — label + price */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 22 }}>🔥</span>
              <div>
                <div style={{ fontSize: 11, color: "#71717a", fontWeight: 700, marginBottom: 2 }}>TTF Natural Gas · Today</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#f97316", fontFamily: "monospace", letterSpacing: "-0.5px" }}>
                  {gasCurrent ? `€${gasCurrent.price?.toFixed(1)}/MWh` : "—"}
                </div>
                {gasCurrent?.ttf_cEkWh != null && (
                  <div style={{ fontSize: 12, color: "#78716c", marginTop: 1 }}>= {gasCurrent.ttf_cEkWh.toFixed(3)} c€/kWh energy</div>
                )}
              </div>
            </div>
          </div>
          {/* Right — bill breakdown hint + CTA */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: "#57534e", lineHeight: 1.5 }}>
              <span style={{ color: "#f97316", fontWeight: 700 }}>~40%</span> of your gas bill<br />tracks this price
            </div>
            <a href="/calculator/gas" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.35)",
              borderRadius: 12, padding: "8px 16px", fontSize: 13, fontWeight: 700, color: "#f97316",
              textDecoration: "none",
            }}>Compare gas plans →</a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          EMAIL CAPTURE
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 860, margin: "24px auto 0", padding: "0 20px", position: "relative", zIndex: 1 }}>
        <div style={{
          background: leadState === "done"
            ? "linear-gradient(135deg,rgba(16,185,129,0.13),rgba(13,148,136,0.07))"
            : "linear-gradient(135deg,rgba(13,148,136,0.1),rgba(26,86,164,0.06))",
          border: `1px solid ${leadState === "done" ? "rgba(16,185,129,0.4)" : "rgba(13,148,136,0.28)"}`,
          borderRadius: 20, padding: "24px 28px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
          transition: "all 0.4s ease",
        }}>
          {leadState === "done" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <span style={{ fontSize: 28 }}>✅</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#10B981" }}>{L.onListTitle || "You're on the list"}</div>
                <div style={{ fontSize: 13, color: "#445566", marginTop: 3 }}>{L.onListDesc || "We'll alert you when tomorrow's cheapest window is published — every day at 13:00 CET."}</div>
              </div>
            </div>
          ) : (
            <form onSubmit={submitLead} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#E2E8F0", marginBottom: 6 }}>
                  {L.alertCaptureTitle || "🔔 Alert me when the cheapest window opens"}
                </div>
                <div style={{ fontSize: 12, color: "#445566" }}>{L.alertCaptureSub || "Daily at 13:00 CET · No spam · Unsubscribe anytime"}</div>
              </div>
              <div style={{ display: "flex", gap: 8, flex: 1, minWidth: 260 }}>
                <input
                  type="email"
                  required
                  placeholder={L.emailPlaceholder || "your@email.com"}
                  value={leadEmail}
                  onChange={e => setLeadEmail(e.target.value)}
                  style={{
                    flex: 1, padding: "11px 16px", borderRadius: 12, fontSize: 14,
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
                    color: "#E2E8F0", outline: "none", fontFamily: "inherit",
                  }}
                  onFocus={e => e.target.style.border = "1px solid rgba(16,185,129,0.5)"}
                  onBlur={e => e.target.style.border = "1px solid rgba(255,255,255,0.15)"}
                />
                <button type="submit" disabled={leadState === "loading"} style={{
                  padding: "11px 22px", borderRadius: 12, fontSize: 13, fontWeight: 800,
                  background: "linear-gradient(135deg,#10B981,#0D9488)", border: "none",
                  color: "#fff", cursor: leadState === "loading" ? "wait" : "pointer",
                  whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(16,185,129,0.35)",
                  opacity: leadState === "loading" ? 0.7 : 1, transition: "all 0.2s",
                }}>
                  {leadState === "loading" ? "…" : (L.notifyBtn || "Notify me →")}
                </button>
              </div>
              {leadState === "error" && (
                <div style={{ width: "100%", fontSize: 12, color: "#EF4444" }}>{L.alertError || "Something went wrong — try again or email hello@smartprice.be"}</div>
              )}
            </form>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          EV CHARGE PLANNER
      ══════════════════════════════════════════════════════════════════ */}
      <section ref={planRef} style={{ maxWidth: 860, margin: "28px auto 0", padding: "0 20px", position: "relative", zIndex: 1 }}>
        <Tile accent="#00C896" icon="🔋" label={L.evPlannerTitle || "EV Charge Planner — tell us your battery, we find the window"}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 22 }}>
            <div>
              <label style={{ fontSize: 10, color: "#445566", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, display: "block", marginBottom: 8 }}>
                {L.batteryLabel || "Battery now:"} <span style={{ color: "#00C896" }}>{battPct}%</span>
              </label>
              <input type="range" min={5} max={90} step={5} value={battPct} onChange={e => setBattPct(+e.target.value)}
                style={{ width: "100%", accentColor: "#00C896", cursor: "pointer" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#2A3A4A", marginTop: 3 }}>
                <span>5%</span><span>50%</span><span>90%</span>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#445566", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, display: "block", marginBottom: 8 }}>{L.fullByLabel || "Full by:"}</label>
              <select value={needByHour} onChange={e => setNeedByHour(+e.target.value)}
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "9px 12px", color: "#E2E8F0", fontSize: 14, fontWeight: 700, cursor: "pointer", outline: "none" }}>
                {Array.from({ length: 23 }, (_, i) => (new Date().getHours() + 1 + i) % 24).map(h => (
                  <option key={h} value={h} style={{ background: "#0A1628" }}>
                    {String(h).padStart(2,"0")}:00{h >= 5 && h <= 9 ? ` ${L.morningLabel || "(morning)"}` : h >= 17 && h <= 20 ? ` ${L.eveningLabel || "(evening)"}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#445566", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, display: "block", marginBottom: 8 }}>{L.chargerLabel || "Charger:"}</label>
              <div style={{ display: "flex", gap: 5 }}>
                {[3.7, 7.4, 11, 22].map(kw => (
                  <button key={kw} onClick={() => setChargerKw(kw)} style={{ flex: 1, padding: "9px 4px", borderRadius: 10, fontSize: 11, fontWeight: 700, border: `1px solid ${chargerKw === kw ? "rgba(0,200,150,0.5)" : "rgba(255,255,255,0.1)"}`, background: chargerKw === kw ? "rgba(0,200,150,0.15)" : "rgba(255,255,255,0.03)", color: chargerKw === kw ? "#00C896" : "#556B82", cursor: "pointer" }}>
                    {kw}kW
                  </button>
                ))}
              </div>
            </div>
          </div>

          {planResult ? (
            <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 16, padding: "22px 24px" }}>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#10B981", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 700, marginBottom: 6 }}>{L.optimalWindow || "⚡ Charge between"}</div>
                  <div style={{ fontSize: "clamp(28px,5vw,44px)", fontWeight: 900, color: "#10B981", fontFamily: "monospace", letterSpacing: "-1.5px", lineHeight: 1, marginBottom: 4 }}>
                    {fmtHour(planResult.start)} – {fmtHour(planResult.end)}
                  </div>
                  <div style={{ fontSize: 12, color: "#334455" }}>{(L.hoursKwh || "{h}h · {kwh} kWh needed").replace("{h}", planResult.hours).replace("{kwh}", planResult.needed.toFixed(0))}</div>
                </div>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#445566", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>{L.costLabel || "Cost"}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "#10B981", fontFamily: "monospace" }}>€{planResult.cost.toFixed(2)}</div>
                  </div>
                  {planResult.saving > 0.1 && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "#445566", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>{L.vsNowLabel || "vs charging now"}</div>
                      <div style={{ fontSize: 28, fontWeight: 900, color: "#F97316", fontFamily: "monospace" }}>-€{planResult.saving.toFixed(2)}</div>
                    </div>
                  )}
                  {planResult.saving > 0.1 && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "#445566", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>{L.perYearLabel || "Per year ×250"}</div>
                      <div style={{ fontSize: 28, fontWeight: 900, color: "#F97316", fontFamily: "monospace" }}>-€{(planResult.saving * 250).toFixed(0)}</div>
                    </div>
                  )}
                </div>
              </div>
              <CTAButton label={L.alertsBtn || "Get alerts for this window →"} />
              <div style={{ fontSize: 11, color: "#2A3A4A", marginTop: 8, textAlign: "center" }}>{L.freeNoCard || "Free · No credit card"}</div>
            </div>
          ) : (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px", textAlign: "center" }}>
              <span style={{ fontSize: 13, color: "#445566" }}>{prices.length ? (L.adjustInputs || "Adjust inputs to calculate your window") : (L.loadingPrices || "Loading prices…")}</span>
            </div>
          )}
        </Tile>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          24H PRICE SCHEDULE
      ══════════════════════════════════════════════════════════════════ */}
      {prices.length > 0 && (
        <section style={{ maxWidth: 860, margin: "28px auto 0", padding: "0 20px", position: "relative", zIndex: 1 }}>
          <Tile accent="#1A56A4" icon="📊" label={L.scheduleTitle || "Today's full schedule — 24 hours"}>
            <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 72, marginBottom: 8 }}>
              {prices.slice(0, 24).map((p, i) => {
                const maxP = Math.max(...prices.slice(0, 24).map(x => Math.max(x.price_eur_mwh, 0)));
                const barH = maxP > 0 ? Math.max((p.price_eur_mwh / maxP) * 100, 4) : 4;
                const col  = priceColor(p.price_eur_mwh);
                const pHour = new Date(p.timestamp_utc || p.timestamp).getHours();
                const isCheap = pHour === cheapHour;
                return (
                  <div key={i} style={{ flex: 1, height: `${barH}%`, borderRadius: "3px 3px 0 0", background: p.is_current ? col : isCheap ? col : `${col}55`, border: (p.is_current || isCheap) ? `1px solid ${col}` : "none", boxShadow: (p.is_current || isCheap) ? `0 0 8px ${col}88` : "none" }}
                    title={`${String(pHour).padStart(2,"0")}:00 — €${p.price_eur_mwh?.toFixed(0)}/MWh`} />
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#2A3A4A", marginBottom: 14 }}>
              {["00:00","06:00","12:00","18:00","23:00"].map(h => <span key={h}>{h}</span>)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#3A4D63" }}>
                <span><span style={{ color: "#10B981" }}>■</span> {L.legendCheap || "Cheap"}</span>
                <span><span style={{ color: "#F59E0B" }}>■</span> {L.legendMid || "Mid"}</span>
                <span><span style={{ color: "#EF4444" }}>■</span> {L.legendPeak || "Peak"}</span>
                <span><span style={{ color: "#fff" }}>■</span> {L.legendNow || "Now/Best"}</span>
              </div>
              <button onClick={onGetStarted} style={{ padding: "7px 18px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.3)", color: "#00C896", cursor: "pointer" }}>
                {L.openDashBtn || "Open full dashboard →"}
              </button>
            </div>
          </Tile>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PLAN CALCULATOR
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 860, margin: "28px auto 0", padding: "0 20px", position: "relative", zIndex: 1 }}>
        <Tile accent="#0D9488" icon="🔌" label="Plan Calculator" onClick={() => onOpenCalculator && onOpenCalculator("electricity")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: "clamp(16px,2.5vw,20px)", fontWeight: 900, color: "#E2E8F0", letterSpacing: "-0.3px", marginBottom: 5 }}>{L.calcTitle2 || "Is your energy supplier the cheapest?"}</div>
              <div style={{ fontSize: 13, color: "#556B82" }}>{L.calcDesc2 || "Compare all 7 Belgian suppliers · real annual cost · 30 sec"}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#10B981", fontFamily: "monospace" }}>€987 <span style={{ fontSize: 12, color: "#334455", fontFamily: "inherit", fontWeight: 400 }}>vs €1,204</span></div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0D9488", marginTop: 2 }}>{L.calcCta || "Calculate my plan →"}</div>
            </div>
          </div>
        </Tile>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECOND CTA BLOCK
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 860, margin: "40px auto 0", padding: "0 20px", position: "relative", zIndex: 1 }}>
        <div style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(13,148,136,0.06))", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 20, padding: "36px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#10B981", textTransform: "uppercase", letterSpacing: "2.5px", fontWeight: 700, marginBottom: 12 }}>{L.setItForgetIt || "Set it. Forget it."}</div>
          <div style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 900, color: "#E2E8F0", marginBottom: 8, letterSpacing: "-0.5px" }}>
            {L.alertPushTitle || "Get a push alert when the cheapest window opens"}
          </div>
          <div style={{ fontSize: 13, color: "#445566", marginBottom: 24 }}>
            {L.alertPushDesc || "We track prices 24/7. You just plug in when we say."}
          </div>
          <CTAButton style={{ fontSize: 15, padding: "15px 36px" }} />
          <div style={{ fontSize: 11, color: "#2A3A4A", marginTop: 12 }}>{L.freeUnsubscribe || "Free · No credit card · Unsubscribe anytime"}</div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SUPPLIERS
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 860, margin: "28px auto 0", padding: "0 20px", position: "relative", zIndex: 1 }}>
        <Tile accent="#334455" label={L.suppliersLabel || "7 Belgian suppliers tracked"}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {SUPPLIERS.map(s => (
              <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8, background: `${s.accent}0A`, border: `1px solid ${s.accent}28`, borderRadius: 12, padding: "8px 14px", transition: "all 0.18s" }}
                onMouseEnter={e => { e.currentTarget.style.border = `1px solid ${s.accent}55`; e.currentTarget.style.background = `${s.accent}15`; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.border = `1px solid ${s.accent}28`; e.currentTarget.style.background = `${s.accent}0A`; e.currentTarget.style.transform = "translateY(0)"; }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: s.color, flexShrink: 0 }}>{s.abbr}</div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#B0C4D8" }}>{s.name}</span>
              </div>
            ))}
          </div>
        </Tile>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FLUVIUS TEASER
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 860, margin: "28px auto 0", padding: "0 20px", position: "relative", zIndex: 1 }}>
        <div style={{ background: "linear-gradient(135deg,rgba(251,191,36,0.08),rgba(245,158,11,0.04))", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 20, padding: "28px 28px 24px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.35)", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 800, color: "#fbbf24", marginBottom: 12, letterSpacing: "1px", textTransform: "uppercase" }}>
                {L.fluviusComingSoonBadge || "⚡ Coming soon"}
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#f4f4f5", marginBottom: 8, letterSpacing: "-0.3px" }}>
                {L.fluviusTitle || "Fluvius capacity tariff integration"}
              </div>
              <div style={{ fontSize: 13, color: "#71717a", lineHeight: 1.75, marginBottom: 16 }}>
                {L.fluviusDesc || "Since 2023, Belgian households with a smart meter pay a capacity tariff — your monthly grid bill is based on your highest 15-min peak. Charging your EV at the wrong hour doesn't just cost more per kWh — it raises your entire month's Fluvius bill by €20–30. We're building full Fluvius integration to show you the real cost of every charging decision."}
              </div>
              <form onSubmit={submitFluvius} style={{ display: "flex", gap: 8 }}>
                {fluviusState === "done" ? (
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fbbf24" }}>{L.fluviusWaitlistDone || "✅ You're on the Fluvius waitlist"}</div>
                ) : (
                  <>
                    <input
                      type="email" required placeholder={L.emailPlaceholder || "your@email.com"}
                      value={fluviusEmail} onChange={e => setFluviusEmail(e.target.value)}
                      style={{ flex: 1, padding: "10px 14px", borderRadius: 10, fontSize: 13, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(251,191,36,0.3)", color: "#e4e4e7", outline: "none", fontFamily: "inherit" }}
                      onFocus={e => e.target.style.border = "1px solid rgba(251,191,36,0.6)"}
                      onBlur={e => e.target.style.border = "1px solid rgba(251,191,36,0.3)"}
                    />
                    <button type="submit" disabled={fluviusState === "loading"} style={{ padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#f59e0b,#d97706)", border: "none", color: "#1c1917", cursor: "pointer", whiteSpace: "nowrap", opacity: fluviusState === "loading" ? 0.7 : 1 }}>
                      {fluviusState === "loading" ? "…" : (L.notifyBtn || "Notify me →")}
                    </button>
                  </>
                )}
              </form>
            </div>
            <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 14, padding: "16px 18px", minWidth: 180 }}>
              <div style={{ fontSize: 11, color: "#a16207", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>{L.fluviusWhatWeShow || "What we'll show"}</div>
              {(L.fluviusFeatures || [
                "Real cost incl. capacity tariff",
                "Optimal charge time for solar owners",
                "Monthly peak demand tracker",
                "Fluvius bill simulator",
              ]).map(f => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#78716c", marginBottom: 7 }}>
                  <span style={{ color: "#f59e0b" }}>→</span> {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 720, margin: "40px auto 0", padding: "0 20px", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 10, color: "#0D9488", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 16 }}>FAQ</div>
        {faqs.filter(f => f.q).map((f, i) => (
          <div key={i} onClick={() => setOpenFaq(openFaq === i ? null : i)}
            style={{ background: openFaq === i ? "rgba(13,148,136,0.05)" : "rgba(255,255,255,0.02)", border: `1px solid ${openFaq === i ? "rgba(13,148,136,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: 14, overflow: "hidden", cursor: "pointer", marginBottom: 8, transition: "all 0.2s" }}>
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
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "44px 24px 28px", marginTop: 52, position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 28, marginBottom: 28 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 17 }}>🇧🇪</span>
                <span style={{ fontWeight: 900, fontSize: 16, letterSpacing: "-0.5px" }}>SmartPrice.be</span>
              </div>
              <div style={{ fontSize: 12, color: "#334455", lineHeight: 2 }}>
                <a href="mailto:info@smartprice.be" style={{ color: "#0D9488", textDecoration: "none" }}>info@smartprice.be</a>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <a href="https://www.facebook.com/groups/819979377511277" target="_blank" rel="noopener noreferrer"
                  style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(24,119,242,0.1)", border: "1px solid rgba(24,119,242,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#1877F2", textDecoration: "none" }}
                  title="Join our Facebook community">f</a>
                <a href="https://www.linkedin.com/company/smartprice-be/" target="_blank" rel="noopener noreferrer"
                  style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(10,102,194,0.1)", border: "1px solid rgba(10,102,194,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#0A66C2", textDecoration: "none" }}
                  title="Follow on LinkedIn">in</a>
              </div>
            </div>
            <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 10, color: "#334455", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10, fontWeight: 700 }}>Product</div>
                {[
                  { label: "⚡ Electricity Prices", action: onGetStarted },
                  { label: "🔥 Gas Prices",         action: onGetStarted },
                  { label: "🔌 Plan Calculator",    action: () => onOpenCalculator && onOpenCalculator("electricity") },
                  { label: "🚗 EV Charging",        action: () => window.location.href = "/ev-charging-belgium" },
                  { label: "🗺️ Charging Stations",  action: () => window.location.href = "/ev-charging-stations-belgium" },
                ].map(l => (
                  <div key={l.label} onClick={l.action} style={{ fontSize: 13, color: "#445566", marginBottom: 7, cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#0D9488"}
                    onMouseLeave={e => e.currentTarget.style.color = "#445566"}>
                    {l.label}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#334455", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10, fontWeight: 700 }}>Community</div>
                {[
                  { label: "Facebook Group", href: "https://www.facebook.com/groups/819979377511277" },
                  { label: "LinkedIn Page",  href: "https://www.linkedin.com/company/smartprice-be/" },
                  { label: "API Docs",       href: "/api-docs" },
                ].map(l => (
                  <a key={l.label} href={l.href} target={l.href.startsWith("http") ? "_blank" : "_self"} rel="noopener noreferrer"
                    style={{ display: "block", fontSize: 13, color: "#445566", marginBottom: 7, textDecoration: "none" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#0D9488"}
                    onMouseLeave={e => e.currentTarget.style.color = "#445566"}>
                    {l.label}
                  </a>
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

      <style>{`
        * { box-sizing: border-box; }
        input[type=range] { height: 4px; }
        select option { background: #0A1628; }
        @keyframes priceGlow {
          0%, 100% { text-shadow: 0 0 0px transparent; }
          50% { text-shadow: 0 0 14px rgba(74,222,128,0.65); }
        }
        @keyframes dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}
