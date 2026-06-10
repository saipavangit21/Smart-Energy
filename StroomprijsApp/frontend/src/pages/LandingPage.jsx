/**
 * LandingPage.jsx — SmartPrice.be
 * v5: Frank Energie–style. Hero → product → how it works → features → stats → tools → CTA
 */
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "../context/LanguageContext";
import LangSwitcher  from "../components/LangSwitcher";
import ThemeSwitcher from "../components/ThemeSwitcher";

const C = {
  bg:     "#F0F4F8",
  white:  "#FFFFFF",
  text:   "#0F172A",
  body:   "#1E293B",
  muted:  "#64748B",
  light:  "#94A3B8",
  border: "#E2E8F0",
  teal:   "#0D9488",
  blue:   "#1E40AF",
  navy:   "#1E3A8A",
  shadow: "0 2px 16px rgba(0,0,0,0.07)",
  shadowM:"0 8px 40px rgba(0,0,0,0.1)",
};

function retailKwh(mwh) { return (mwh / 1000) + 0.173; }
function retailFmt(mwh) { return retailKwh(mwh).toFixed(3); }
function priceColor(mwh) {
  if (mwh == null) return C.light;
  if (mwh < 0)   return "#10B981";
  if (mwh < 60)  return "#10B981";
  if (mwh < 110) return "#84CC16";
  if (mwh < 160) return "#F59E0B";
  if (mwh < 220) return "#F97316";
  return "#EF4444";
}
function priceLabel(mwh) {
  if (mwh == null) return "—";
  if (mwh < 0)   return "FREE";
  if (mwh < 60)  return "VERY LOW";
  if (mwh < 110) return "LOW";
  if (mwh < 160) return "NORMAL";
  if (mwh < 220) return "HIGH";
  return "VERY HIGH";
}
function fmtHour(h) { return `${String(h).padStart(2,"0")}:00`; }

// Shared section header component
function SectionHeader({ badge, title, sub, light = false }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 52 }}>
      {badge && (
        <div style={{ display: "inline-block", fontSize: 11, fontWeight: 800, color: C.teal, background: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.2)", borderRadius: 20, padding: "4px 14px", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 14 }}>
          {badge}
        </div>
      )}
      <h2 style={{ fontSize: "clamp(26px,4vw,38px)", fontWeight: 900, color: light ? "#fff" : C.text, letterSpacing: "-1px", lineHeight: 1.15, margin: "0 0 14px" }}>{title}</h2>
      {sub && <p style={{ fontSize: 16, color: light ? "rgba(255,255,255,0.7)" : C.muted, maxWidth: 500, margin: "0 auto", lineHeight: 1.65 }}>{sub}</p>}
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

  const [prices,       setPrices]       = useState([]);
  const [heroIn,       setHeroIn]       = useState(false);
  const [openFaq,      setOpenFaq]      = useState(null);
  const [battPct,      setBattPct]      = useState(20);
  const [needByHour,   setNeedByHour]   = useState(7);
  const [chargerKw,    setChargerKw]    = useState(7.4);
  const [planResult,   setPlanResult]   = useState(null);
  const [tick,         setTick]         = useState(0);
  const [hasSolar,     setHasSolar]     = useState(false);
  const [leadEmail,    setLeadEmail]    = useState("");
  const [leadState,    setLeadState]    = useState("idle");
  const [fluviusEmail, setFluviusEmail] = useState("");
  const [fluviusState, setFluviusState] = useState("idle");
  const [fetchedAt,    setFetchedAt]    = useState(null);
  const [siteStats,    setSiteStats]    = useState(null);
  const [gasCurrent,   setGasCurrent]   = useState(null);
  const priceRef = useRef(null);

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

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

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
          end:   new Date(win[hoursNeeded-1].timestamp_utc || win[hoursNeeded-1].timestamp).getHours() + 1,
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

  // ── Derived ───────────────────────────────────────────────────────────
  const nowDate = new Date();
  const nowH    = nowDate.getHours();
  const nowM    = nowDate.getMinutes();

  const current    = prices.find(p => p.is_current) || prices[prices.length - 1];
  const currentMwh = current?.price_eur_mwh ?? null;
  const currentCol = priceColor(currentMwh);
  const currentLbl = priceLabel(currentMwh);

  const currentHour = current?.hour ?? nowH;
  const upcoming2   = prices.filter(p => p.hour != null ? (p.hour >= currentHour && p.day === "today") || p.day === "tomorrow" : false);
  const sorted      = [...upcoming2].sort((a, b) => a.price_eur_mwh - b.price_eur_mwh);
  const futureOnly  = sorted.filter(p => !p.is_current);
  const cheapEntry  = futureOnly[0] || sorted[0];
  const cheapHour   = cheapEntry?.hour ?? null;
  const cheapMwh    = cheapEntry?.price_eur_mwh ?? null;
  const cheapIsNow  = cheapEntry?.is_current ?? false;

  let cheapWindowEnd = cheapHour != null ? cheapHour + 1 : null;
  if (cheapHour != null && futureOnly[1] && Math.abs(futureOnly[1].hour - cheapHour) <= 1)
    cheapWindowEnd = Math.max(cheapHour, futureOnly[1].hour) + 1;

  const peakEntry = [...upcoming2].sort((a, b) => b.price_eur_mwh - a.price_eur_mwh)[0];
  const peakH     = peakEntry?.hour ?? null;
  const peakMwh   = peakEntry?.price_eur_mwh ?? null;

  const FILL_KWH   = 40;
  const savingToday = (currentMwh != null && cheapMwh != null)
    ? Math.max(0, (retailKwh(currentMwh) - retailKwh(cheapMwh)) * FILL_KWH) : null;

  const minsUntilCheap = cheapHour != null ? (cheapHour - nowH) * 60 - nowM : null;
  const cheapNow  = minsUntilCheap != null && minsUntilCheap <= 0;
  const cheapSoon = minsUntilCheap != null && minsUntilCheap > 0 && minsUntilCheap <= 90;
  const countdownStr = minsUntilCheap < 60 ? `${minsUntilCheap} min` : `${Math.floor(minsUntilCheap/60)}h ${minsUntilCheap%60}m`;

  const updatedMinsAgo = fetchedAt ? Math.max(0, Math.floor((Date.now() - new Date(fetchedAt).getTime()) / 60000)) : null;
  const updatedStr = updatedMinsAgo === null ? null : updatedMinsAgo === 0 ? "just now" : `${updatedMinsAgo} min ago`;
  const tomorrowPublishHour = 14;
  const showTomorrowTeaser  = prices.length > 0 && nowH < tomorrowPublishHour;

  async function submitLead(e) {
    e.preventDefault();
    if (!leadEmail || leadState !== "idle") return;
    setLeadState("loading");
    try {
      const r = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: leadEmail, source: "landing" }) });
      setLeadState(r.ok ? "done" : "error");
    } catch { setLeadState("error"); }
  }

  async function submitFluvius(e) {
    e.preventDefault();
    if (!fluviusEmail || fluviusState !== "idle") return;
    setFluviusState("loading");
    try {
      const r = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: fluviusEmail, source: "fluvius_waitlist" }) });
      setFluviusState(r.ok ? "done" : "error");
    } catch { setFluviusState("error"); }
  }

  const CTABtn = ({ label, onClick, outline = false, style = {} }) => (
    <button onClick={onClick || onGetStarted} style={{
      padding: "14px 30px", borderRadius: 50, fontSize: 15, fontWeight: 800,
      background: outline ? "transparent" : "linear-gradient(135deg,#10B981,#0D9488)",
      border: outline ? `2px solid ${C.teal}` : "none",
      color: outline ? C.teal : "#fff",
      cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s",
      boxShadow: outline ? "none" : "0 6px 24px rgba(13,148,136,0.3)",
      ...style,
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; if (!outline) e.currentTarget.style.boxShadow = "0 10px 32px rgba(13,148,136,0.4)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; if (!outline) e.currentTarget.style.boxShadow = "0 6px 24px rgba(13,148,136,0.3)"; }}>
      {label}
    </button>
  );

  const SUPPLIERS = [
    { name: "Engie",         abbr: "EN", color: "#fff", bg: "#0066A1" },
    { name: "Luminus",       abbr: "LU", color: "#1a1a1a", bg: "#FFB800" },
    { name: "Bolt",          abbr: "⚡", color: "#fff", bg: "#1A1A2E" },
    { name: "TotalEnergies", abbr: "TE", color: "#fff", bg: "#EF3340" },
    { name: "Eneco",         abbr: "EC", color: "#fff", bg: "#00A651" },
    { name: "Mega",          abbr: "MG", color: "#fff", bg: "#7C3AED" },
    { name: "Octa+",         abbr: "O+", color: "#fff", bg: "#F97316" },
  ];

  const faqs = [
    { q: L.faq1Q, a: L.faq1A },
    { q: L.faq2Q, a: L.faq2A },
    { q: L.faq3Q, a: L.faq3A },
    { q: L.faq4Q, a: L.faq4A },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.white, color: C.body, fontFamily: "'DM Sans', system-ui, sans-serif", overflowX: "hidden" }}>

      {/* Thin 3-colour accent bar */}
      <div style={{ height: 3, background: "linear-gradient(90deg,#0D9488,#1E40AF,#7C3AED)", position: "fixed", top: 0, left: 0, right: 0, zIndex: 100 }} />

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: C.white, borderBottom: `1px solid ${C.border}`, padding: "12px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🇧🇪</span>
          <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.5px", color: C.text }}>SmartPrice</span>
          <span style={{ fontSize: 9, color: "#10B981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>● LIVE</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ThemeSwitcher />
          <LangSwitcher style={{ marginRight: 4 }} />
          <a href="/ev-charging-belgium" style={{ padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "rgba(13,148,136,0.07)", border: "1px solid rgba(13,148,136,0.2)", color: C.teal, textDecoration: "none" }}>🚗 EV</a>
          <a href="/business" style={{ padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "rgba(30,64,175,0.07)", border: "1px solid rgba(30,64,175,0.2)", color: C.blue, textDecoration: "none" }}>🏢 Business</a>
          <CTABtn label="Dashboard →" style={{ padding: "9px 22px", borderRadius: 20, fontSize: 13 }} />
        </div>
      </nav>

      {/* ── PLATFORM STRIP ── */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 63, zIndex: 40 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", overflow: "auto" }}>
          {[
            { icon: "👤", label: "Households", accent: C.teal,    href: null,          active: true  },
            { icon: "🏢", label: "Business",   accent: C.blue,    href: "/business",   active: false },
            { icon: "🚗", label: "Fleet Audit",accent: "#F59E0B", href: "/fleet-audit",active: false },
            { icon: "🔌", label: "API & HA",   accent: "#7C3AED", href: "/api-docs",   active: false },
          ].map(s => (
            <a key={s.label} href={s.href || "#"} onClick={s.href ? undefined : e => e.preventDefault()}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 22px", fontSize: 12, fontWeight: 700, color: s.active ? s.accent : C.muted, textDecoration: "none", borderBottom: `2px solid ${s.active ? s.accent : "transparent"}`, whiteSpace: "nowrap" }}>
              <span>{s.icon}</span>{s.label}
            </a>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          § 1  HERO
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ background: C.white, padding: "88px 24px 72px", textAlign: "center" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", opacity: heroIn ? 1 : 0, transform: heroIn ? "translateY(0)" : "translateY(20px)", transition: "all 0.6s ease" }}>

          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(13,148,136,0.07)", border: "1px solid rgba(13,148,136,0.2)", borderRadius: 20, padding: "5px 16px", fontSize: 12, fontWeight: 700, color: C.teal, marginBottom: 24 }}>
            🇧🇪 Belgium · EPEX Spot · Updated every 15 min
          </div>

          {/* H1 */}
          <h1 style={{ fontSize: "clamp(36px,7vw,64px)", fontWeight: 900, color: C.text, letterSpacing: "-2px", lineHeight: 1.1, margin: "0 0 20px" }}>
            {L.headline || "Stop overpaying for every EV charge"}
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: 18, color: C.muted, maxWidth: 520, margin: "0 auto 32px", lineHeight: 1.7 }}>
            Live EPEX electricity prices for Belgium — we find the cheapest hours, compare 7 suppliers, and alert you. Free, always.
          </p>

          {/* Live price inline */}
          {currentMwh != null && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 16, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, padding: "16px 28px", marginBottom: 32, boxShadow: C.shadow }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 11, color: C.light, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 2 }}>Live now</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 44, fontWeight: 900, fontFamily: "monospace", color: currentCol, letterSpacing: "-2px", lineHeight: 1 }}>{Math.round(currentMwh)}</span>
                  <span style={{ fontSize: 16, color: C.muted, fontWeight: 600 }}>€/MWh</span>
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>= €{retailFmt(currentMwh)}/kWh at your meter</div>
              </div>
              <div style={{ width: 1, height: 48, background: C.border }} />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: currentCol, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>{currentLbl}</div>
                {cheapHour != null && (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Best window: {fmtHour(cheapHour)}–{fmtHour(cheapWindowEnd ?? cheapHour + 1)}</div>
                    <div style={{ fontSize: 12, color: "#16A34A", fontWeight: 600 }}>€{retailFmt(cheapMwh)}/kWh</div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* CTAs */}
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
            <CTABtn label="Get started free →" style={{ fontSize: 16, padding: "15px 36px" }} />
            <CTABtn label="See live prices ↓" outline onClick={() => priceRef.current?.scrollIntoView({ behavior: "smooth" })} style={{ fontSize: 15, padding: "13px 28px" }} />
          </div>

          {/* Trust strip */}
          <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              `🇧🇪 ${siteStats?.registered_users ?? "100+"} Belgian users`,
              "🆓 Free forever",
              "⚡ Every 15 min",
              "🔒 GDPR compliant",
            ].map(t => <span key={t} style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>{t}</span>)}
          </div>

          {/* Urgency chip */}
          {prices.length > 0 && (cheapNow || cheapSoon) && (
            <div style={{ display: "inline-block", marginTop: 20, padding: "8px 20px", borderRadius: 8, background: cheapNow ? "rgba(16,185,129,0.08)" : "rgba(249,115,22,0.07)", border: `1px solid ${cheapNow ? "rgba(16,185,129,0.3)" : "rgba(249,115,22,0.25)"}`, fontSize: 13, fontWeight: 700, color: cheapNow ? "#10B981" : "#F97316" }}>
              {cheapNow ? "⚡ Cheapest window is RIGHT NOW — plug in now" : `⚡ Cheapest window in ${countdownStr} — get ready`}
            </div>
          )}

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          § 2  LIVE PRICE CARD
      ══════════════════════════════════════════════════════════════════ */}
      <section ref={priceRef} style={{ background: C.bg, padding: "72px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <SectionHeader badge="Live pricing" title="Today's electricity prices" sub="Real-time EPEX Spot Belgium data — see when it's cheap and when to avoid charging." />

          {/* Negative price banner */}
          {currentMwh != null && currentMwh < 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.35)", borderRadius: 14, padding: "14px 22px", marginBottom: 20, cursor: "pointer" }} onClick={onGetStarted}>
              <span style={{ fontSize: 22 }}>⚡</span>
              <div>
                <div style={{ fontWeight: 800, color: "#0891B2" }}>Electricity is FREE right now — {currentMwh.toFixed(1)} €/MWh</div>
                <div style={{ fontSize: 13, color: C.muted }}>Negative prices mean you're paid to consume. Charge everything now.</div>
              </div>
            </div>
          )}

          {/* Price card */}
          <div style={{ background: C.white, borderRadius: 24, border: `1px solid ${C.border}`, boxShadow: C.shadowM, overflow: "hidden" }}>
            {prices.length > 0 && cheapHour != null ? (
              <>
                {/* Card top bar */}
                <div style={{ background: "linear-gradient(135deg,#1E3A8A,#1E40AF)", padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 700, marginBottom: 4 }}>⚡ Electricity · EPEX Spot Belgium</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 42, fontWeight: 900, fontFamily: "monospace", color: currentCol, letterSpacing: "-2px" }}>{Math.round(currentMwh ?? 0)}</span>
                      <span style={{ fontSize: 18, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>€/MWh</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: currentCol, background: `${currentCol}22`, border: `1px solid ${currentCol}55`, borderRadius: 20, padding: "3px 10px", marginLeft: 4 }}>{currentLbl}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
                      = €{currentMwh != null ? retailFmt(currentMwh) : "—"}/kWh at your meter
                      {updatedStr && <span style={{ marginLeft: 10 }}>· updated {updatedStr}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Best window today</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", fontFamily: "monospace" }}>
                      {cheapIsNow ? "Right now!" : `${fmtHour(cheapHour)}–${fmtHour(cheapWindowEnd ?? cheapHour + 1)}`}
                    </div>
                    <div style={{ fontSize: 14, color: "#4ADE80", fontWeight: 700 }}>€{retailFmt(cheapMwh)}/kWh</div>
                  </div>
                </div>

                {/* Card body */}
                <div style={{ padding: "24px 28px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
                    {/* Cheapest */}
                    <div style={{ background: "rgba(22,163,74,0.05)", border: "1px solid rgba(22,163,74,0.2)", borderRadius: 14, padding: "16px 20px" }}>
                      <div style={{ fontSize: 11, color: "#16A34A", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {cheapIsNow ? "⚡ Cheapest — plug in now" : "Best window today"}
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 4 }}>
                        {cheapIsNow ? "Right now!" : `${fmtHour(cheapHour)} – ${fmtHour(cheapWindowEnd ?? cheapHour + 2)}`}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#16A34A" }}>€{retailFmt(cheapMwh)}/kWh</div>
                    </div>
                    {/* Most expensive */}
                    <div style={{ background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.15)", borderRadius: 14, padding: "16px 20px" }}>
                      <div style={{ fontSize: 11, color: "#DC2626", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Most expensive
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 4 }}>
                        {peakH != null ? `${fmtHour(peakH)} – ${fmtHour(peakH + 2)}` : "—"}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#DC2626" }}>€{peakMwh != null ? retailFmt(peakMwh) : "—"}/kWh</div>
                    </div>
                    {/* Saving */}
                    {savingToday != null && savingToday > 0.3 && (
                      <div style={{ background: "rgba(13,148,136,0.05)", border: "1px solid rgba(13,148,136,0.2)", borderRadius: 14, padding: "16px 20px" }}>
                        <div style={{ fontSize: 11, color: C.teal, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Full charge (40 kWh)</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 4 }}>€{(retailKwh(cheapMwh) * 40).toFixed(2)}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.teal }}>Save €{savingToday.toFixed(2)} vs now</div>
                      </div>
                    )}
                  </div>

                  {/* 24h bar chart */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: "1px" }}>24-hour price schedule</div>
                    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 60 }}>
                      {prices.slice(0, 24).map((p, i) => {
                        const maxP = Math.max(...prices.slice(0,24).map(x => Math.max(x.price_eur_mwh, 0)));
                        const barH = maxP > 0 ? Math.max((p.price_eur_mwh / maxP) * 100, 4) : 4;
                        const col  = priceColor(p.price_eur_mwh);
                        const pHour = new Date(p.timestamp_utc || p.timestamp).getHours();
                        const highlight = p.is_current || pHour === cheapHour;
                        return <div key={i} style={{ flex: 1, height: `${barH}%`, borderRadius: "3px 3px 0 0", background: highlight ? col : `${col}55`, border: highlight ? `1px solid ${col}` : "none" }} title={`${String(pHour).padStart(2,"0")}:00 — €${p.price_eur_mwh?.toFixed(0)}/MWh`} />;
                      })}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.light, marginTop: 4 }}>
                      {["00:00","06:00","12:00","18:00","23:00"].map(h => <span key={h}>{h}</span>)}
                    </div>
                  </div>

                  {/* Solar toggle */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: hasSolar ? "rgba(251,191,36,0.06)" : C.bg, border: `1px solid ${hasSolar ? "rgba(251,191,36,0.3)" : C.border}`, borderRadius: 12, cursor: "pointer", transition: "all 0.2s", marginBottom: 20 }}
                    onClick={() => setHasSolar(s => !s)}>
                    <div style={{ width: 36, height: 20, borderRadius: 10, background: hasSolar ? "#f59e0b" : "#CBD5E1", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                      <div style={{ position: "absolute", top: 2, left: hasSolar ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: hasSolar ? "#92400E" : C.muted }}>
                      ☀️ {L.hasSolarLabel || "I have solar panels — show capacity tariff impact"}
                    </span>
                  </div>

                  {hasSolar && cheapMwh != null && (
                    <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E", marginBottom: 6 }}>☀️ Capacity tariff (Fluvius) impact</div>
                      <div style={{ fontSize: 13, color: "#78350F", lineHeight: 1.7 }}>
                        Charging at peak ({fmtHour(peakH ?? 19)}) raises your monthly Fluvius bill by ~€20–30. Charging at {fmtHour(cheapHour)} avoids this. <strong>Real saving: €{((savingToday ?? 0) + 22).toFixed(0)}/month.</strong>
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.blue, marginBottom: 16 }}>
                      👉 {(L.chargeBeforeCta || "Charge before {x} to save money").replace("{x}", fmtHour(cheapWindowEnd ?? cheapHour + 2))}
                    </div>
                    <CTABtn label={L.mainCta || "Start saving on every charge →"} style={{ width: "100%", maxWidth: 400, padding: "15px 0", borderRadius: 14, fontSize: 15 }} />
                    <div style={{ fontSize: 12, color: C.light, marginTop: 10 }}>Free · No account needed · 30 sec to set alerts</div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: "60px", textAlign: "center", color: C.light }}>Loading live prices…</div>
            )}
          </div>

          {showTomorrowTeaser && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.18)", borderRadius: 12, marginTop: 14, fontSize: 13, color: C.blue, fontWeight: 600 }}>
              📅 Tomorrow's cheapest hours publish at {String(tomorrowPublishHour).padStart(2,"0")}:00 — check back then
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          § 3  HOW IT WORKS
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ background: C.white, padding: "88px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <SectionHeader badge="How it works" title="Three steps to cheaper energy" sub="SmartPrice does the work. You just plug in at the right time." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 28 }}>
            {[
              { n: "1", icon: "📡", title: "We monitor 24/7", desc: "EPEX Spot Belgium prices updated every 15 minutes. Gas TTF prices tracked in parallel." },
              { n: "2", icon: "🎯", title: "We find your window", desc: "Our algorithm calculates the cheapest hours for your EV based on your battery, charger power, and deadline." },
              { n: "3", icon: "💶", title: "You charge smarter", desc: "Plug in at the optimal time. The average Belgian EV driver saves €200+ per year." },
            ].map(s => (
              <div key={s.n} style={{ background: C.bg, borderRadius: 20, padding: "32px 28px", position: "relative", overflow: "hidden" }}>
                <div style={{ fontSize: 56, fontWeight: 900, color: C.border, position: "absolute", top: 12, right: 20, lineHeight: 1, fontFamily: "monospace", userSelect: "none" }}>{s.n}</div>
                <div style={{ fontSize: 32, marginBottom: 16 }}>{s.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          § 4  FEATURES
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ background: C.bg, padding: "88px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <SectionHeader badge="Features" title="Everything you need to optimise your energy" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {[
              { icon: "🔋", accent: "#00C896", title: "EV Charge Planner", desc: "Set your battery %, charger speed, and deadline. We calculate the cheapest window and total cost.", cta: "Try the planner", onClick: () => priceRef.current?.scrollIntoView({ behavior: "smooth" }) },
              { icon: "🔔", accent: "#1E40AF", title: "Daily Price Alerts", desc: "Get an email every day at 13:00 when tomorrow's cheapest window is confirmed.", cta: "Set up alerts", onClick: onGetStarted },
              { icon: "🔌", accent: "#0D9488", title: "Plan Calculator", desc: "Compare all 7 Belgian suppliers side by side. See your real annual electricity cost in 30 seconds.", cta: "Compare suppliers", onClick: () => onOpenCalculator?.("electricity") },
              { icon: "🏠", accent: "#7C3AED", title: "Home Assistant", desc: "Official HACS integration. Automate your EV charger and appliances based on live EPEX prices.", cta: "View HACS docs", onClick: () => window.location.href = "/api-docs" },
            ].map(f => (
              <div key={f.title} style={{ background: C.white, borderRadius: 20, border: `1px solid ${C.border}`, padding: "28px 24px", boxShadow: C.shadow, display: "flex", flexDirection: "column" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${f.accent}12`, border: `1px solid ${f.accent}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16 }}>{f.icon}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, flex: 1, marginBottom: 16 }}>{f.desc}</div>
                <button onClick={f.onClick} style={{ fontSize: 13, fontWeight: 700, color: f.accent, background: `${f.accent}0D`, border: `1px solid ${f.accent}25`, borderRadius: 10, padding: "8px 16px", cursor: "pointer", textAlign: "left" }}>
                  {f.cta} →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          § 5  EV CHARGE PLANNER (interactive)
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ background: C.white, padding: "88px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <SectionHeader badge="EV Charge Planner" title="Find your cheapest charging window" sub="Tell us your battery level and deadline — we'll do the maths." />
          <div style={{ background: C.bg, borderRadius: 24, border: `1px solid ${C.border}`, padding: "36px", boxShadow: C.shadow }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 20, marginBottom: 28 }}>
              {/* Battery */}
              <div>
                <label style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, display: "block", marginBottom: 8 }}>
                  Battery now: <span style={{ color: "#00C896" }}>{battPct}%</span>
                </label>
                <input type="range" min={5} max={90} step={5} value={battPct} onChange={e => setBattPct(+e.target.value)}
                  style={{ width: "100%", accentColor: "#00C896", cursor: "pointer" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.light, marginTop: 3 }}>
                  <span>5%</span><span>50%</span><span>90%</span>
                </div>
              </div>
              {/* Full by */}
              <div>
                <label style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, display: "block", marginBottom: 8 }}>Full by:</label>
                <select value={needByHour} onChange={e => setNeedByHour(+e.target.value)}
                  style={{ width: "100%", background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 14, fontWeight: 700, cursor: "pointer", outline: "none" }}>
                  {Array.from({ length: 23 }, (_, i) => (new Date().getHours() + 1 + i) % 24).map(h => (
                    <option key={h} value={h}>{String(h).padStart(2,"0")}:00{h >= 5 && h <= 9 ? " (morning)" : h >= 17 && h <= 20 ? " (evening)" : ""}</option>
                  ))}
                </select>
              </div>
              {/* Charger */}
              <div>
                <label style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, display: "block", marginBottom: 8 }}>Charger speed:</label>
                <div style={{ display: "flex", gap: 5 }}>
                  {[3.7, 7.4, 11, 22].map(kw => (
                    <button key={kw} onClick={() => setChargerKw(kw)} style={{ flex: 1, padding: "9px 4px", borderRadius: 10, fontSize: 11, fontWeight: 700, border: `1px solid ${chargerKw === kw ? "rgba(0,200,150,0.5)" : C.border}`, background: chargerKw === kw ? "rgba(0,200,150,0.1)" : C.white, color: chargerKw === kw ? "#00C896" : C.muted, cursor: "pointer" }}>
                      {kw}kW
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {planResult ? (
              <div style={{ background: C.white, border: "1px solid rgba(16,185,129,0.25)", borderRadius: 18, padding: "24px 28px" }}>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#10B981", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 700, marginBottom: 6 }}>⚡ Optimal window</div>
                    <div style={{ fontSize: "clamp(28px,5vw,44px)", fontWeight: 900, color: "#10B981", fontFamily: "monospace", letterSpacing: "-1.5px", lineHeight: 1, marginBottom: 4 }}>
                      {fmtHour(planResult.start)} – {fmtHour(planResult.end)}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted }}>{planResult.hours}h · {planResult.needed.toFixed(0)} kWh needed</div>
                  </div>
                  <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Cost</div>
                      <div style={{ fontSize: 32, fontWeight: 900, color: "#10B981", fontFamily: "monospace" }}>€{planResult.cost.toFixed(2)}</div>
                    </div>
                    {planResult.saving > 0.1 && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>vs now</div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: "#F97316", fontFamily: "monospace" }}>-€{planResult.saving.toFixed(2)}</div>
                      </div>
                    )}
                    {planResult.saving > 0.1 && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Per year ×250</div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: "#F97316", fontFamily: "monospace" }}>-€{(planResult.saving * 250).toFixed(0)}</div>
                      </div>
                    )}
                  </div>
                </div>
                <CTABtn label="Get alerts for this window →" />
                <div style={{ fontSize: 11, color: C.light, marginTop: 8 }}>Free · No credit card</div>
              </div>
            ) : (
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px", textAlign: "center" }}>
                <span style={{ fontSize: 13, color: C.muted }}>{prices.length ? "Adjust the inputs above to calculate your window" : "Loading prices…"}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          § 6  STATS BAR
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ background: "linear-gradient(135deg,#1E3A8A,#1E40AF)", padding: "60px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 0 }}>
            {[
              { n: siteStats?.registered_users ?? "100+", label: "Belgian users tracking" },
              { n: "7",    label: "Suppliers compared" },
              { n: "15 min", label: "Price update interval" },
              { n: "€200+", label: "Average annual saving" },
            ].map((s, i, arr) => (
              <div key={s.label} style={{ textAlign: "center", padding: "12px 8px", borderRight: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.12)" : "none" }}>
                <div style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, color: "#fff", fontFamily: "monospace", letterSpacing: "-1px", marginBottom: 6 }}>{s.n}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          § 7  SUPPLIERS + PLAN CALCULATOR
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ background: C.bg, padding: "88px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <SectionHeader badge="7 suppliers" title="Compare every Belgian electricity supplier" sub="We track Engie, Luminus, Bolt, TotalEnergies, Eneco, Mega, and Octa+ — updated in real time." />

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 36 }}>
            {SUPPLIERS.map(s => (
              <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 10, background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: "10px 18px", boxShadow: C.shadow }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: s.color, flexShrink: 0 }}>{s.abbr}</div>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.body }}>{s.name}</span>
              </div>
            ))}
          </div>

          {/* Plan calculator CTA card */}
          <div onClick={() => onOpenCalculator?.("electricity")} style={{ background: C.white, borderRadius: 20, border: `1px solid ${C.border}`, padding: "28px 32px", boxShadow: C.shadowM, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20, cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.border = `1px solid ${C.teal}55`}
            onMouseLeave={e => e.currentTarget.style.border = `1px solid ${C.border}`}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 6 }}>Is your current supplier the cheapest?</div>
              <div style={{ fontSize: 14, color: C.muted }}>Compare all 7 Belgian suppliers · real annual cost · takes 30 seconds</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#10B981", fontFamily: "monospace" }}>€987 <span style={{ fontSize: 13, color: C.muted, fontFamily: "inherit", fontWeight: 400 }}>vs €1,204</span></div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.teal, marginTop: 4 }}>Calculate my plan →</div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          § 8  GAS + EMAIL CAPTURE
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ background: C.white, padding: "88px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>

            {/* Gas price card */}
            <div style={{ background: C.bg, border: "1px solid rgba(249,115,22,0.2)", borderRadius: 20, padding: "28px", boxShadow: C.shadow }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 28 }}>🔥</span>
                <div>
                  <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>TTF Natural Gas · Today</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#F97316", fontFamily: "monospace", letterSpacing: "-1px" }}>
                    {gasCurrent ? `€${gasCurrent.price?.toFixed(1)}/MWh` : "—"}
                  </div>
                  {gasCurrent?.ttf_cEkWh != null && <div style={{ fontSize: 12, color: C.muted }}>= {gasCurrent.ttf_cEkWh.toFixed(3)} c€/kWh</div>}
                </div>
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}><strong style={{ color: "#F97316" }}>~40%</strong> of your gas bill directly tracks this market price.</div>
              <a href="/calculator/gas" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 12, padding: "9px 18px", fontSize: 13, fontWeight: 700, color: "#F97316", textDecoration: "none" }}>
                Compare gas plans →
              </a>
            </div>

            {/* Email alert capture */}
            <div style={{ background: leadState === "done" ? "rgba(16,185,129,0.06)" : "linear-gradient(135deg,rgba(13,148,136,0.07),rgba(26,86,164,0.04))", border: `1px solid ${leadState === "done" ? "rgba(16,185,129,0.3)" : "rgba(13,148,136,0.2)"}`, borderRadius: 20, padding: "28px", boxShadow: C.shadow }}>
              {leadState === "done" ? (
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: 32 }}>✅</span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#10B981" }}>You're on the list</div>
                    <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>We'll alert you every day at 13:00 when the cheapest window is confirmed.</div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 11, color: C.teal, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Daily alerts</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 6 }}>🔔 Alert me when the cheapest window opens</div>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>Daily at 13:00 · No spam · Unsubscribe anytime</div>
                  <form onSubmit={submitLead} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input type="email" required placeholder="your@email.com" value={leadEmail} onChange={e => setLeadEmail(e.target.value)}
                      style={{ flex: 1, minWidth: 180, padding: "11px 14px", borderRadius: 12, fontSize: 14, background: C.white, border: `1px solid ${C.border}`, color: C.text, outline: "none", fontFamily: "inherit" }}
                      onFocus={e => e.target.style.border = "1px solid rgba(13,148,136,0.5)"}
                      onBlur={e => e.target.style.border = `1px solid ${C.border}`} />
                    <button type="submit" disabled={leadState === "loading"} style={{ padding: "11px 22px", borderRadius: 12, fontSize: 13, fontWeight: 800, background: "linear-gradient(135deg,#10B981,#0D9488)", border: "none", color: "#fff", cursor: "pointer", opacity: leadState === "loading" ? 0.7 : 1 }}>
                      {leadState === "loading" ? "…" : "Notify me →"}
                    </button>
                  </form>
                  {leadState === "error" && <div style={{ fontSize: 12, color: "#EF4444", marginTop: 8 }}>Something went wrong — try again</div>}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          § 9  FLUVIUS TEASER
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ background: C.bg, padding: "88px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ background: C.white, border: "1px solid rgba(251,191,36,0.25)", borderRadius: 24, padding: "40px", boxShadow: C.shadow }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 32, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 20, padding: "4px 14px", fontSize: 11, fontWeight: 800, color: "#92400E", marginBottom: 16, textTransform: "uppercase", letterSpacing: "1px" }}>
                  ⚡ Coming soon
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 900, color: C.text, marginBottom: 10, letterSpacing: "-0.5px" }}>Fluvius capacity tariff integration</h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.75, marginBottom: 20 }}>
                  Since 2023, Belgian households with a smart meter pay a capacity tariff — your monthly grid bill is based on your highest 15-min peak. Charging your EV at the wrong hour raises your entire Fluvius bill by €20–30. We're building full integration to show you the real cost.
                </p>
                <form onSubmit={submitFluvius} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {fluviusState === "done" ? (
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#92400E" }}>✅ You're on the Fluvius waitlist</div>
                  ) : (
                    <>
                      <input type="email" required placeholder="your@email.com" value={fluviusEmail} onChange={e => setFluviusEmail(e.target.value)}
                        style={{ flex: 1, minWidth: 180, padding: "10px 14px", borderRadius: 10, fontSize: 13, background: C.bg, border: "1px solid rgba(251,191,36,0.3)", color: C.text, outline: "none", fontFamily: "inherit" }}
                        onFocus={e => e.target.style.border = "1px solid rgba(251,191,36,0.6)"}
                        onBlur={e => e.target.style.border = "1px solid rgba(251,191,36,0.3)"} />
                      <button type="submit" disabled={fluviusState === "loading"} style={{ padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#f59e0b,#d97706)", border: "none", color: "#1c1917", cursor: "pointer", opacity: fluviusState === "loading" ? 0.7 : 1 }}>
                        {fluviusState === "loading" ? "…" : "Notify me →"}
                      </button>
                    </>
                  )}
                </form>
              </div>
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 22px", minWidth: 180 }}>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>What we'll show</div>
                {["Real cost incl. capacity tariff", "Best charge time for solar owners", "Monthly peak demand tracker", "Fluvius bill simulator"].map(f => (
                  <div key={f} style={{ display: "flex", gap: 8, fontSize: 13, color: C.muted, marginBottom: 8 }}>
                    <span style={{ color: "#f59e0b", flexShrink: 0 }}>→</span> {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          § 10  FAQ
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ background: C.white, padding: "88px 24px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <SectionHeader badge="FAQ" title="Frequently asked questions" />
          {faqs.filter(f => f.q).map((f, i) => (
            <div key={i} onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{ background: openFaq === i ? "rgba(13,148,136,0.04)" : C.white, border: `1px solid ${openFaq === i ? "rgba(13,148,136,0.28)" : C.border}`, borderRadius: 16, overflow: "hidden", cursor: "pointer", marginBottom: 10, transition: "all 0.2s", boxShadow: C.shadow }}>
              <div style={{ padding: "18px 22px", fontSize: 15, fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center", color: openFaq === i ? C.teal : C.text }}>
                {f.q}
                <span style={{ color: C.teal, fontSize: 22, fontWeight: 300, flexShrink: 0, marginLeft: 16, transform: openFaq === i ? "rotate(45deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>+</span>
              </div>
              {openFaq === i && (
                <div style={{ padding: "0 22px 18px", fontSize: 14, color: C.muted, lineHeight: 1.8, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ paddingTop: 14 }}>{f.a}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          § 11  FINAL CTA
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ background: "linear-gradient(135deg,#0D9488,#0F766E)", padding: "88px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 16 }}>Ready to start saving?</div>
          <h2 style={{ fontSize: "clamp(28px,5vw,44px)", fontWeight: 900, color: "#fff", letterSpacing: "-1px", marginBottom: 14, lineHeight: 1.15 }}>
            Join 100+ Belgians who charge smarter
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", marginBottom: 32, lineHeight: 1.65 }}>
            Free forever. No credit card. Set up in 30 seconds.
          </p>
          <button onClick={onGetStarted} style={{ padding: "16px 44px", borderRadius: 50, fontSize: 16, fontWeight: 800, background: "#fff", border: "none", color: C.teal, cursor: "pointer", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", transition: "all 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-3px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
            Get started free →
          </button>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap", marginTop: 24 }}>
            {["🇧🇪 Belgian EPEX data", "🆓 Free forever", "🔒 GDPR compliant"].map(t => (
              <span key={t} style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer style={{ background: C.white, borderTop: `1px solid ${C.border}`, padding: "52px 32px 32px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 32, marginBottom: 40 }}>
            {/* Brand */}
            <div style={{ minWidth: 180 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>🇧🇪</span>
                <span style={{ fontWeight: 900, fontSize: 17, color: C.text }}>SmartPrice.be</span>
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.7 }}>
                Live EPEX electricity prices<br />for Belgium. Free, always.
              </div>
              <a href="mailto:info@smartprice.be" style={{ fontSize: 13, color: C.teal, textDecoration: "none" }}>info@smartprice.be</a>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <a href="https://www.facebook.com/groups/819979377511277" target="_blank" rel="noopener noreferrer" style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(24,119,242,0.08)", border: "1px solid rgba(24,119,242,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#1877F2", textDecoration: "none" }}>f</a>
                <a href="https://www.linkedin.com/company/smartprice-be/" target="_blank" rel="noopener noreferrer" style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(10,102,194,0.08)", border: "1px solid rgba(10,102,194,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#0A66C2", textDecoration: "none" }}>in</a>
              </div>
            </div>
            {/* Links */}
            <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
              {[
                { heading: "Product", links: [
                  { label: "⚡ Electricity Prices", action: onGetStarted },
                  { label: "🔥 Gas Prices", action: onGetStarted },
                  { label: "🔌 Plan Calculator", action: () => onOpenCalculator?.("electricity") },
                  { label: "🚗 EV Charging", action: () => window.location.href = "/ev-charging-belgium" },
                  { label: "🗺️ Charging Stations", action: () => window.location.href = "/ev-charging-stations-belgium" },
                ]},
                { heading: "Platform", links: [
                  { label: "🏢 Business", action: () => window.location.href = "/business" },
                  { label: "🚗 Fleet Audit", action: () => window.location.href = "/fleet-audit" },
                  { label: "🔌 API & HA", action: () => window.location.href = "/api-docs" },
                ]},
                { heading: "Community", links: [
                  { label: "Facebook Group", href: "https://www.facebook.com/groups/819979377511277" },
                  { label: "LinkedIn Page",  href: "https://www.linkedin.com/company/smartprice-be/" },
                  { label: "Privacy Policy", action: () => window.dispatchEvent(new CustomEvent("showPrivacy")) },
                ]},
              ].map(col => (
                <div key={col.heading}>
                  <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 700, marginBottom: 14 }}>{col.heading}</div>
                  {col.links.map(l => l.href ? (
                    <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontSize: 13, color: C.muted, marginBottom: 8, textDecoration: "none" }}
                      onMouseEnter={e => e.currentTarget.style.color = C.teal}
                      onMouseLeave={e => e.currentTarget.style.color = C.muted}>{l.label}</a>
                  ) : (
                    <div key={l.label} onClick={l.action} style={{ fontSize: 13, color: C.muted, marginBottom: 8, cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.color = C.teal}
                      onMouseLeave={e => e.currentTarget.style.color = C.muted}>{l.label}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Share */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
            <span style={{ fontSize: 12, color: C.muted }}>Share SmartPrice:</span>
            {[
              { label: "WhatsApp", icon: "💬", color: "#25D366", href: `https://wa.me/?text=${encodeURIComponent("⚡ SmartPrice.be — tells you exactly when to charge your EV to save money. Live EPEX prices, free. https://smartprice.be")}` },
              { label: "X",        icon: "𝕏",  color: "#1E293B", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent("⚡ SmartPrice.be — live electricity prices for Belgium + EV charge planner. Free. https://smartprice.be")}` },
              { label: "Facebook", icon: "f",  color: "#1877F2", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://smartprice.be")}` },
              { label: "LinkedIn", icon: "in", color: "#0A66C2", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://smartprice.be")}` },
            ].map(s => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                style={{ width: 32, height: 32, borderRadius: 8, background: `${s.color}10`, border: `1px solid ${s.color}28`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: s.color, textDecoration: "none", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = `${s.color}20`; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${s.color}10`; e.currentTarget.style.transform = "translateY(0)"; }}>
                {s.icon}
              </a>
            ))}
          </div>

          <div style={{ fontSize: 12, color: C.light, lineHeight: 1.9 }}>
            Data: Energy-Charts.info · Elia Open Data (CC BY 4.0) · ENTSO-E · Prices refresh every 15 min<br />
            Not financial advice. Always verify tariffs on supplier websites before switching.
          </div>
        </div>
      </footer>

      <style>{`
        * { box-sizing: border-box; }
        input[type=range] { height: 4px; }
        @keyframes dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}
