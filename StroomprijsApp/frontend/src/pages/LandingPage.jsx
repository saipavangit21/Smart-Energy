/**
 * LandingPage.jsx — SmartPrice.be
 * v9: Enterprise-scale design — animated hero, scroll animations,
 *     transparent-to-solid nav, animated counters, hover effects
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useColors, useTheme } from "../context/ThemeContext";
import LangSwitcher  from "../components/LangSwitcher";
import ThemeSwitcher from "../components/ThemeSwitcher";

const API = import.meta.env.VITE_API_URL || "https://smart-energy-production-aef3.up.railway.app";

/* ── helpers ─────────────────────────────────────────────────── */
const retailKwh = mwh => (mwh / 1000) + 0.173;
const fmtHour   = h   => `${String(h).padStart(2,"0")}:00`;

function priceColor(mwh) {
  if (mwh == null) return "#94A3B8";
  if (mwh < 0)   return "#10B981";
  if (mwh < 60)  return "#10B981";
  if (mwh < 110) return "#84CC16";
  if (mwh < 160) return "#F59E0B";
  if (mwh < 220) return "#F97316";
  return "#EF4444";
}
function priceLabel(mwh) {
  if (mwh == null) return null;
  if (mwh < 0)   return "FREE";
  if (mwh < 60)  return "VERY LOW";
  if (mwh < 110) return "LOW";
  if (mwh < 160) return "NORMAL";
  if (mwh < 220) return "HIGH";
  return "VERY HIGH";
}

/* ── animated counter ────────────────────────────────────────── */
function AnimatedNumber({ value, prefix = "", suffix = "", duration = 1800 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const animated = useRef(false);
  useEffect(() => {
    const target = parseFloat(String(value).replace(/[^0-9.]/g, ""));
    if (isNaN(target)) { setDisplay(value); return; }
    const observer = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || animated.current) return;
      animated.current = true;
      const start = performance.now();
      const tick = now => {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setDisplay(Math.round(ease * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, duration]);
  return <span ref={ref}>{prefix}{typeof display === "number" ? display.toLocaleString() : display}{suffix}</span>;
}

/* ── scroll-reveal hook ──────────────────────────────────────── */
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("sp-visible");
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -60px 0px" });
    const els = document.querySelectorAll(".sp-animate");
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  });
}

/* ── Animated journey strip ──────────────────────────────────── */
function JourneyStrip({ C, L }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); obs.disconnect(); }
    }, { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const steps = [
    { emoji: "😰", color: "#EF4444", bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.2)",
      tag: L.journey1Tag||"The problem", title: L.journey1Title||"Peak hour — 18:00",
      body: L.journey1Body||"Belgian electricity hits €0.48/kWh during evening peaks. Charging your EV right now costs €3.60 for a standard 7.5 kWh top-up.",
      stat: L.journey1Stat||"€3.60", statSub: L.journey1StatSub||"at peak price tonight" },
    { emoji: "🔍", color: "#3B82F6", bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.2)",
      tag: L.journey2Tag||"The discovery", title: L.journey2Title||"Finds SmartPrice.be",
      body: L.journey2Body||"Free charge planner shows tonight's cheapest hours. No account, no app — just live EPEX prices and your exact charging window.",
      stat: L.journey2Stat||"03:00", statSub: L.journey2StatSub||"cheapest hour tonight" },
    { emoji: "😮", color: "#10B981", bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.2)",
      tag: L.journey3Tag||"The surprise", title: L.journey3Title||"Price drops to €0.04/kWh",
      body: L.journey3Body||"Same 7.5 kWh charge costs €0.30 instead of €3.60. One small habit change — €200+ saved every year, automatically.",
      stat: L.journey3Stat||"€200+", statSub: L.journey3StatSub||"saved per year" },
  ];
  return (
    <div ref={ref} style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 32px" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: C.primary, textTransform: "uppercase", letterSpacing: 3, marginBottom: 12 }}>{L.journeyLabel||"Why EPEX matters"}</div>
        <h2 style={{ fontSize: "clamp(20px,3vw,32px)", fontWeight: 900, color: C.text, letterSpacing: "-0.5px", margin: "0 0 10px" }}>{L.journeyTitle||"From €3.60 to €0.30 — same charge, smarter hour"}</h2>
        <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>{L.journeySub||"Real EPEX data. Real money saved. No subscription needed."}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        {steps.flatMap((s, i) => {
          const card = (
            <div key={`c${i}`} style={{ flex: "1 1 220px", maxWidth: 300, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 20, padding: "28px 22px", opacity: vis ? 1 : 0, transform: vis ? "translateY(0px)" : "translateY(44px)", transition: "opacity 0.65s ease, transform 0.65s ease", transitionDelay: `${i * 0.42}s` }}>
              <div style={{ fontSize: 42, marginBottom: 14 }}>{s.emoji}</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: s.color, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>{s.tag}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 10, lineHeight: 1.35 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, marginBottom: 20 }}>{s.body}</div>
              <div style={{ fontSize: 30, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.stat}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 5, fontWeight: 600 }}>{s.statSub}</div>
            </div>
          );
          const arrow = i < steps.length - 1 ? (
            <div key={`a${i}`} style={{ fontSize: 26, color: C.muted, padding: "0 10px", flexShrink: 0, opacity: vis ? 1 : 0, transition: "opacity 0.4s ease", transitionDelay: `${i * 0.42 + 0.22}s` }}>→</div>
          ) : null;
          return arrow ? [card, arrow] : [card];
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function LandingPage({ onGetStarted, onOpenCalculator, onNavigate }) {
  const { tSection, lang } = useLanguage();
  const L = tSection("landing");
  const themeC = useColors();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const C = {
    ...themeC,
    primary:    themeC.green,
    bright:     themeC.green,
    light:      themeC.soft,
    highlight:  isDark ? "rgba(16,185,129,0.08)" : "#DCFCE7",
    border2:    isDark ? "rgba(16,185,129,0.22)" : "rgba(22,163,74,0.2)",
    amber:      themeC.yellow,
    purple:     "#7C3AED",
    shadowHover:`0 20px 60px ${themeC.green}30`,
  };
  const locale = lang === "fr" ? "fr-BE" : lang === "nl" ? "nl-BE" : "en-BE";
  const fmtKwh  = mwh => new Intl.NumberFormat(locale, {minimumFractionDigits:3,maximumFractionDigits:3}).format(retailKwh(mwh));
  const fmtNum0 = val => new Intl.NumberFormat(locale, {minimumFractionDigits:0,maximumFractionDigits:0}).format(val);
  const fmtNum1 = val => new Intl.NumberFormat(locale, {minimumFractionDigits:1,maximumFractionDigits:1}).format(val);
  const fmtNum2 = val => new Intl.NumberFormat(locale, {minimumFractionDigits:2,maximumFractionDigits:2}).format(val);
  const fmtNum3 = val => new Intl.NumberFormat(locale, {minimumFractionDigits:3,maximumFractionDigits:3}).format(val);

  useEffect(() => {
    document.title = "SmartPrice.be — Live Belgian Electricity & Gas Prices | Free";
    const desc = document.querySelector("meta[name='description']");
    if (desc) desc.setAttribute("content", "Track live EPEX Spot electricity prices in Belgium, compare all suppliers, find the cheapest hours for EV charging, heat pumps & household appliances, and set price alerts. 100% free.");
  }, []);

  /* state */
  const [prices,       setPrices]       = useState([]);
  const [scrolled,     setScrolled]     = useState(false);
  const [openFaq,      setOpenFaq]      = useState(null);
  const [battPct,      setBattPct]      = useState(20);
  const [needByHour,   setNeedByHour]   = useState(7);
  const [chargerKw,    setChargerKw]    = useState(7.4);
  const [planResult,   setPlanResult]   = useState(null);
  const [hasSolar,     setHasSolar]     = useState(false);
  const [leadEmail,    setLeadEmail]    = useState("");
  const [leadState,    setLeadState]    = useState("idle");
  const [nlEmail,      setNlEmail]      = useState("");
  const [nlState,      setNlState]      = useState("idle");
  const [fluviusEmail, setFluviusEmail] = useState("");
  const [fluviusState, setFluviusState] = useState("idle");
  const [copiedCmd,    setCopiedCmd]    = useState(false);
  const [barTooltip,   setBarTooltip]   = useState(null);
  const [fetchedAt,    setFetchedAt]    = useState(null);
  const [siteStats,    setSiteStats]    = useState(null);
  const [gasCurrent,   setGasCurrent]   = useState(null);
  const toolsRef  = useRef(null);
  const evApiRef  = useRef(null);

  /* scroll reveal */
  useScrollReveal();

  /* nav scroll detection */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* data fetching */
  useEffect(() => {
    fetch(`${API}/api/prices/today`, { credentials: "include" }).then(r => r.json())
      .then(d => { if (d.data?.length) { setPrices(d.data); setFetchedAt(d.fetched_at || new Date().toISOString()); }}).catch(()=>{});
  }, []);
  useEffect(() => {
    fetch(`${API}/api/gas/current`, { credentials: "include" }).then(r=>r.json()).then(d=>{ if(d.success&&d.ttf) setGasCurrent({price:d.ttf.price,ttf_cEkWh:d.ttf_cEkWh}); }).catch(()=>{});
  }, []);
  useEffect(() => {
    fetch(`${API}/api/stats`, { credentials: "include" }).then(r=>r.json()).then(d=>{ if(d.success) setSiteStats(d); }).catch(()=>{});
  }, []);

  /* planner */
  useEffect(() => {
    if (!prices.length) return;
    const needed = ((100 - battPct) / 100) * 60;
    const hoursNeeded = Math.max(1, Math.ceil(needed / chargerKw));
    const nowH = new Date().getHours();
    const upcoming = prices.filter(p => {
      const h = new Date(p.timestamp_utc||p.timestamp).getHours();
      return needByHour > nowH ? (h >= nowH && h < needByHour) : (h >= nowH || h < needByHour);
    }).sort((a,b) => new Date(a.timestamp_utc||a.timestamp)-new Date(b.timestamp_utc||b.timestamp));
    if (upcoming.length < hoursNeeded) { setPlanResult(null); return; }
    let best = null;
    for (let i = 0; i <= upcoming.length - hoursNeeded; i++) {
      const win = upcoming.slice(i, i + hoursNeeded);
      const avg = win.reduce((s,p)=>s+p.price_eur_mwh,0)/hoursNeeded;
      if (!best || avg < best.avg) best = {
        avg, hours: hoursNeeded, needed,
        start: new Date(win[0].timestamp_utc||win[0].timestamp).getHours(),
        end:   new Date(win[hoursNeeded-1].timestamp_utc||win[hoursNeeded-1].timestamp).getHours()+1,
        cost:  (avg/1000+0.173)*needed,
      };
    }
    const nowSlice = prices.filter(p=>{ const h=new Date(p.timestamp_utc||p.timestamp).getHours(); return h>=nowH&&h<nowH+hoursNeeded; });
    const nowAvg = nowSlice.length ? nowSlice.reduce((s,p)=>s+p.price_eur_mwh,0)/nowSlice.length : (prices.find(p=>p.is_current)?.price_eur_mwh??120);
    if (best) best.saving = Math.max(0,(nowAvg/1000+0.173)*needed-best.cost);
    setPlanResult(best);
  }, [prices, battPct, needByHour, chargerKw]);

  /* derived price values */
  const nowH       = new Date().getHours();
  const nowM       = new Date().getMinutes();
  const current    = prices.find(p=>p.is_current)||prices[prices.length-1];
  const currentMwh = current?.price_eur_mwh??null;
  const currentCol = priceColor(currentMwh);
  const currentLbl = priceLabel(currentMwh);
  const upcoming2  = prices.filter(p=>p.hour!=null?(p.hour>=(current?.hour??nowH)&&p.day==="today")||p.day==="tomorrow":false);
  const sorted     = [...upcoming2].sort((a,b)=>a.price_eur_mwh-b.price_eur_mwh);
  const futureOnly = sorted.filter(p=>!p.is_current);
  const cheapEntry = futureOnly[0]||sorted[0];
  const cheapHour  = cheapEntry?.hour??null;
  const cheapMwh   = cheapEntry?.price_eur_mwh??null;
  const cheapIsNow = cheapEntry?.is_current??false;
  let cheapWindowEnd = cheapHour!=null?cheapHour+1:null;
  if (cheapHour!=null&&futureOnly[1]&&Math.abs(futureOnly[1].hour-cheapHour)<=1)
    cheapWindowEnd = Math.max(cheapHour,futureOnly[1].hour)+1;
  const peakEntry  = [...upcoming2].sort((a,b)=>b.price_eur_mwh-a.price_eur_mwh)[0];
  const peakH      = peakEntry?.hour??null;
  const peakMwh    = peakEntry?.price_eur_mwh??null;
  const savingToday = currentMwh!=null&&cheapMwh!=null?Math.max(0,(retailKwh(currentMwh)-retailKwh(cheapMwh))*40):null;
  const minsUntilCheap = cheapHour!=null?(cheapHour-nowH)*60-nowM:null;
  const cheapNow   = minsUntilCheap!=null&&minsUntilCheap<=0;
  const cheapSoon  = minsUntilCheap!=null&&minsUntilCheap>0&&minsUntilCheap<=90;

  /* night window — cheapest hour between 22:00 and 06:00 */
  const nightPrices = prices.filter(p => p.hour!=null && (p.hour>=22||p.hour<6));
  const nightCheap  = [...nightPrices].sort((a,b)=>a.price_eur_mwh-b.price_eur_mwh)[0];
  const nightH      = nightCheap?.hour??null;
  const nightMwh    = nightCheap?.price_eur_mwh??null;

  const updatedMinsAgo = fetchedAt?Math.max(0,Math.floor((Date.now()-new Date(fetchedAt).getTime())/60000)):null;
  const updatedStr = updatedMinsAgo===null?null:updatedMinsAgo===0?"just now":`${updatedMinsAgo} min ago`;

  /* form handlers */
  async function submitNewsletter(e) {
    e.preventDefault();
    if (!nlEmail || nlState !== "idle") return;
    setNlState("loading");
    try {
      const r = await fetch(`${API}/api/newsletter/subscribe`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nlEmail, language: lang }),
      });
      setNlState(r.ok ? "done" : "error");
    } catch { setNlState("error"); }
  }

  async function submitLead(e) {
    e.preventDefault();
    if (!leadEmail||leadState!=="idle") return;
    setLeadState("loading");
    try { const r=await fetch(`${API}/api/leads`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:leadEmail,source:"landing"})}); setLeadState(r.ok?"done":"error"); } catch { setLeadState("error"); }
  }
  async function submitFluvius(e) {
    e.preventDefault();
    if (!fluviusEmail||fluviusState!=="idle") return;
    setFluviusState("loading");
    try { const r=await fetch(`${API}/api/leads`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:fluviusEmail,source:"fluvius_waitlist"})}); setFluviusState(r.ok?"done":"error"); } catch { setFluviusState("error"); }
  }

  const SUPPLIERS = [
    {name:"Engie",abbr:"EN",color:"#fff",bg:"#0066A1"},
    {name:"Luminus",abbr:"LU",color:"#1a1a1a",bg:"#FFB800"},
    {name:"Bolt",abbr:"⚡",color:"#fff",bg:"#1A1A2E"},
    {name:"TotalEnergies",abbr:"TE",color:"#fff",bg:"#EF3340"},
    {name:"Eneco",abbr:"EC",color:"#fff",bg:"#00A651"},
    {name:"Mega",abbr:"MG",color:"#fff",bg:"#7C3AED"},
    {name:"Octa+",abbr:"O+",color:"#fff",bg:"#F97316"},
  ];

  const faqs = [
    {q:L.faq1Q,a:L.faq1A},{q:L.faq2Q,a:L.faq2A},{q:L.faq3Q,a:L.faq3A},{q:L.faq4Q,a:L.faq4A},
  ];

  /* ── TICKER DATA ────────────────────────────────────────────── */
  const tickerItems = [
    currentMwh!=null && `⚡ Live price: ${Math.round(currentMwh)} €/MWh`,
    cheapHour!=null  && `🟢 Best window: ${fmtHour(cheapHour)}–${fmtHour(cheapWindowEnd??cheapHour+1)} · €${cheapMwh!=null?fmtKwh(cheapMwh):"—"}/kWh`,
    gasCurrent       && `🔥 Gas TTF: €${gasCurrent.price!=null?fmtNum1(gasCurrent.price):"—"}/MWh`,
    savingToday!=null&&savingToday>0.5 && `💶 Save €${fmtNum2(savingToday)} per 40 kWh charge today`,
    `🇧🇪 EPEX Spot Belgium · updated every 15 min`,
    siteStats?.registered_users && `👥 ${siteStats.registered_users}+ Belgian households tracking`,
  ].filter(Boolean);

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────── */
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans',system-ui,sans-serif",color:C.text,overflowX:"hidden"}}>

      {/* ── NAV — transparent over hero, solid on scroll ─────────── */}
      <nav style={{
        position:"fixed",top:0,left:0,right:0,zIndex:200,
        background: scrolled ? C.navBg : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? `1px solid ${C.border}` : "none",
        boxShadow: scrolled ? "0 2px 20px rgba(0,0,0,0.08)" : "none",
        transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
        padding:"0 32px",height:68,display:"flex",alignItems:"center",justifyContent:"space-between",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:24}}>🇧🇪</span>
          <span style={{fontSize:18,fontWeight:900,letterSpacing:"-0.5px",color:scrolled?C.text:"#fff"}}>SmartPrice</span>
          <span style={{fontSize:9,color:"#22C55E",background:scrolled?"rgba(34,197,94,0.1)":"rgba(255,255,255,0.15)",border:scrolled?"1px solid rgba(34,197,94,0.3)":"1px solid rgba(255,255,255,0.3)",borderRadius:20,padding:"2px 8px",fontWeight:700,animation:"sp-pulse 2s ease infinite"}}>● LIVE</span>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <ThemeSwitcher />
          <LangSwitcher />
          <a href="/ev-charging-belgium" style={{padding:"7px 16px",borderRadius:20,fontSize:12,fontWeight:700,background:scrolled?"rgba(34,197,94,0.08)":"rgba(255,255,255,0.12)",border:scrolled?"1px solid rgba(34,197,94,0.2)":"1px solid rgba(255,255,255,0.25)",color:scrolled?C.primary:"#fff",textDecoration:"none"}}>{L.navEv||"🚗 EV"}</a>
          <a href="/business" style={{padding:"7px 16px",borderRadius:20,fontSize:12,fontWeight:700,background:scrolled?(isDark?"rgba(30,64,175,0.15)":"#EFF6FF"):"rgba(255,255,255,0.12)",border:scrolled?"1px solid rgba(30,64,175,0.25)":"1px solid rgba(255,255,255,0.25)",color:scrolled?(isDark?"#93C5FD":"#1E40AF"):"#fff",textDecoration:"none"}}>{L.navBusiness||"🏢 Business"}</a>
          <a href="/ev-companies" style={{padding:"7px 16px",borderRadius:20,fontSize:12,fontWeight:700,background:scrolled?"rgba(217,119,6,0.10)":"rgba(255,255,255,0.12)",border:scrolled?"1px solid rgba(217,119,6,0.3)":"1px solid rgba(255,255,255,0.25)",color:scrolled?"#D97706":"#fff",textDecoration:"none"}}>{L.navEvCo||"⚡ EV API"}</a>
          <button onClick={onGetStarted} style={{padding:"9px 22px",borderRadius:20,fontSize:13,fontWeight:800,background:scrolled?"linear-gradient(135deg,#16A34A,#22C55E)":"rgba(255,255,255,0.2)",color:"#fff",border:scrolled?"none":"1px solid rgba(255,255,255,0.35)",cursor:"pointer",boxShadow:scrolled?"0 4px 16px rgba(22,163,74,0.3)":"none"}}>
            {L.navDashboard||"Dashboard →"}
          </button>
        </div>
      </nav>

      {/* ── HERO — full viewport, animated gradient ───────────────── */}
      <div className="sp-hero" style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"120px 24px 80px",position:"relative",overflow:"hidden"}}>

        {/* Decorative floating circles */}
        <div className="sp-blob sp-blob-1" />
        <div className="sp-blob sp-blob-2" />
        <div className="sp-blob sp-blob-3" />

        {/* Badge */}
        <div className="sp-animate sp-hero-badge" style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:30,padding:"6px 20px",marginBottom:28,fontSize:13,fontWeight:700,color:"#fff",backdropFilter:"blur(8px)"}}>
          {L.heroBadgeLive||"🇧🇪 Belgium · Live electricity prices · updated every hour"}
        </div>

        {/* Headline */}
        <h1 className="sp-animate sp-delay-1" style={{fontSize:"clamp(36px,6vw,78px)",fontWeight:900,lineHeight:1.08,margin:"0 auto 24px",maxWidth:860,letterSpacing:"-2.5px",color:"#fff",textShadow:"0 2px 40px rgba(0,0,0,0.15)"}}>
          <span style={{color:"#FCD34D"}}>{L.heroNew||"Belgian electricity prices swing up to 10× within the same day."}</span>
        </h1>

        {/* Tagline */}
        <div className="sp-animate sp-delay-2 sp-hero-tagline" style={{fontSize:"clamp(17px,2.1vw,24px)",fontWeight:700,color:"rgba(255,255,255,0.95)",marginBottom:16,letterSpacing:"-0.3px"}}>
          {L.heroTagline||"SmartPrice shows you the cheapest hour to charge, run your dishwasher, or heat your home."}
        </div>

        {/* Subtitle */}
        <p className="sp-animate sp-delay-2 sp-hero-subtitle" style={{fontSize:"clamp(14px,1.7vw,17px)",color:"rgba(255,255,255,0.65)",maxWidth:500,margin:"0 auto 40px",lineHeight:1.75,fontWeight:400}}>
          {L.heroSubNew||"Free for households, EV drivers, and fleet managers. No account needed."}
        </p>

        {/* Live price display */}
        {currentMwh!=null && (
          <div className="sp-animate sp-delay-3 sp-glass" style={{display:"inline-flex",alignItems:"center",gap:24,borderRadius:20,padding:"20px 32px",marginBottom:40,flexWrap:"wrap",justifyContent:"center"}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",fontWeight:700,textTransform:"uppercase",letterSpacing:"2px",marginBottom:4}}>{L.liveNowLabel||"Right now"}</div>
              <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
                <span style={{fontSize:"clamp(40px,6vw,64px)",fontWeight:900,fontFamily:"monospace",color:currentCol,letterSpacing:"-3px",lineHeight:1}}>{fmtKwh(currentMwh)}</span>
                <span style={{fontSize:16,color:"rgba(255,255,255,0.7)",fontWeight:700}}>€/kWh</span>
                {currentLbl && <span style={{fontSize:10,fontWeight:800,color:currentCol,background:`${currentCol}25`,border:`1px solid ${currentCol}50`,borderRadius:20,padding:"3px 10px",textTransform:"uppercase",letterSpacing:"1px"}}>{currentLbl}</span>}
              </div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginTop:3}}>{Math.round(currentMwh)} €/MWh wholesale</div>
            </div>
            {cheapHour!=null && (
              <>
                <div style={{width:1,height:48,background:"rgba(255,255,255,0.15)"}} />
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",fontWeight:700,textTransform:"uppercase",letterSpacing:"2px",marginBottom:4}}>
                    {cheapIsNow?(L.cheapestNowLabel||"Cheapest — now"):(L.bestWindowLabel||"Best window")}
                  </div>
                  <div style={{fontSize:20,fontWeight:800,color:"#fff"}}>{cheapIsNow?(L.rightNowText||"Right now!"):` ${fmtHour(cheapHour)} – ${fmtHour(cheapWindowEnd??cheapHour+1)}`}</div>
                  <div style={{fontSize:13,color:"#4ADE80",fontWeight:700}}>€{fmtKwh(cheapMwh)}/kWh{savingToday!=null&&savingToday>0.3?` · save €${fmtNum2(savingToday)}`:""}</div>
                </div>
              </>
            )}
            {updatedStr && <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",fontWeight:600}}>↻ {updatedStr}</div>}
          </div>
        )}

        {/* Urgency */}
        {(cheapNow||cheapSoon) && (
          <div className="sp-animate sp-delay-3 sp-hero-urgency" style={{display:"inline-block",background:"rgba(34,197,94,0.2)",border:"1px solid rgba(34,197,94,0.5)",borderRadius:12,padding:"8px 22px",fontSize:14,fontWeight:700,color:"#4ADE80",marginBottom:32}}>
            {cheapNow ? (L.cheapestNowBadge||"⚡ Cheapest window RIGHT NOW — plug in") : (L.cheapestSoonBadge||"⚡ Cheapest window in {x}").replace("{x}", minsUntilCheap<60?`${minsUntilCheap} min`:`${Math.floor(minsUntilCheap/60)}h ${minsUntilCheap%60}m`)}
          </div>
        )}

        {/* Scroll indicator */}
        <div className="sp-scroll-indicator" onClick={()=>document.getElementById("sp-products")?.scrollIntoView({behavior:"smooth"})}>
          <div className="sp-scroll-chevron" />
        </div>
      </div>

      {/* ── PRODUCT PICKER ───────────────────────────────────────── */}
      <div id="sp-products" style={{background:isDark?"#0A1525":"#F0F7FF",borderTop:`1px solid ${isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)"}`,padding:"64px 32px 72px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div className="sp-animate" style={{textAlign:"center",marginBottom:56}}>
            <div style={{fontSize:11,fontWeight:800,color:C.primary,textTransform:"uppercase",letterSpacing:3,marginBottom:14}}>{L.pickerEyebrow||"What are you looking for?"}</div>
            <h2 style={{fontSize:"clamp(24px,3.5vw,38px)",fontWeight:900,color:C.text,letterSpacing:"-0.8px",lineHeight:1.2,margin:0}}>
              {L.pickerTitle||<>SmartPrice is free for everyone — <span style={{color:C.primary}}>pick your use case</span></>}
            </h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:32}}>
            {[
              {
                color:"#16A34A", bg:"rgba(22,163,74,0.12)", iconBg:"linear-gradient(135deg,#15803D,#22C55E)",
                icon:"🏠",
                title: L.pickerHHTitle||"Households",
                desc: L.pickerHHDesc||"Live EPEX prices, cheapest EV charging window, supplier comparison, and daily alerts. No account needed. Free forever.",
                cta: L.pickerHHCta||"Explore →",
                onClick: onGetStarted,
                href: null,
              },
              {
                color:"#2563EB", bg:"rgba(37,99,235,0.10)", iconBg:"linear-gradient(135deg,#1E40AF,#3B82F6)",
                icon:"💼",
                title: L.pickerBizTitle||"Business & Fleets",
                desc: L.pickerBizDesc||"CIR 92-compliant EV reimbursements. Free audit shows exactly what your company overpays on fixed CREG rates vs. real EPEX prices.",
                cta: L.pickerBizCta||"Get free fleet audit →",
                href: "/business",
              },
              {
                color:"#D97706", bg:"rgba(217,119,6,0.10)", iconBg:"linear-gradient(135deg,#B45309,#F59E0B)",
                icon:"⚡",
                title: L.pickerEvTitle||"EV Companies & Apps",
                desc: L.pickerEvDesc||"Add live EPEX price intelligence to any charging app. Your app shows where to charge — we show when. One API call, no key, free.",
                cta: L.pickerEvCta||"View API →",
                onClick: ()=>window.location.href="/ev-companies",
                href: null,
              },
            ].map((p,i)=>(
              <div key={i} className="sp-animate" style={{transitionDelay:`${i*0.1}s`,background:isDark?C.card:"#fff",border:`1px solid ${isDark?C.border:"rgba(0,0,0,0.08)"}`,borderRadius:24,padding:"36px 32px",display:"flex",flexDirection:"column",gap:0,boxShadow:isDark?"none":"0 4px 24px rgba(0,0,0,0.06)",cursor:"pointer",transition:"transform 0.15s,box-shadow 0.15s"}}
                onClick={p.href?()=>window.location.href=p.href:p.onClick}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow=isDark?`0 8px 32px ${p.color}22`:"0 12px 40px rgba(0,0,0,0.12)";}}
                onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow=isDark?"none":"0 4px 24px rgba(0,0,0,0.06)";}}>
                {/* Circle icon */}
                <div style={{width:72,height:72,borderRadius:"50%",background:p.iconBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,marginBottom:24,boxShadow:`0 8px 24px ${p.color}40`}}>
                  {p.icon}
                </div>
                <div style={{fontSize:20,fontWeight:900,color:C.text,marginBottom:14,letterSpacing:"-0.3px"}}>{p.title}</div>
                <div style={{fontSize:14,color:C.muted,lineHeight:1.8,flex:1,marginBottom:24}}>{p.desc}</div>
                <div style={{fontSize:14,fontWeight:700,color:p.color,display:"flex",alignItems:"center",gap:6}}>
                  {p.cta} <span style={{fontSize:16}}>›</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>


      <div className="sp-desktop-extra">
      {/* ── ECO STRIP ────────────────────────────────────────────── */}
      <div style={{background:isDark?"linear-gradient(135deg,rgba(16,185,129,0.18) 0%,rgba(5,150,105,0.12) 100%)":"linear-gradient(135deg,rgba(16,185,129,0.12) 0%,rgba(5,150,105,0.07) 100%)",borderTop:"1px solid rgba(16,185,129,0.25)",borderBottom:"1px solid rgba(16,185,129,0.25)",padding:"28px 32px"}}>
        <div style={{maxWidth:720,margin:"0 auto",textAlign:"center"}}>
          <div style={{fontSize:10,fontWeight:800,color:C.primary,textTransform:"uppercase",letterSpacing:2.5,marginBottom:12}}>{L.ecoLabel||"Grid impact"}</div>
          <p style={{fontSize:14,color:isDark?"rgba(255,255,255,0.72)":"C.muted",lineHeight:1.8,margin:"0 0 18px"}}>{L.ecoLine||"EPEX prices fall when wind and solar flood the Belgian grid. Cheap hours = peak renewables. Negative prices = surplus clean energy going to waste — SmartPrice tells you exactly when to use it."}</p>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
            {[L.ecoPill1||"🌱 Lower grid carbon",L.ecoPill2||"💨 Wind surplus hours",L.ecoPill3||"⚡ Zero renewable waste"].map((p,i)=>(
              <span key={i} style={{fontSize:12,fontWeight:700,color:isDark?"#6EE7B7":"#065F46",background:isDark?"rgba(16,185,129,0.15)":"rgba(16,185,129,0.12)",border:"1px solid rgba(16,185,129,0.3)",borderRadius:20,padding:"5px 14px"}}>{p}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── JOURNEY STRIP ────────────────────────────────────────── */}
      <JourneyStrip C={C} L={L} />

      {/* ── CONTENT WRAPPER ───────────────────────────────────────── */}
      <div ref={toolsRef}>



        {/* ── STATS BAR ─────────────────────────────────────────────── */}
        <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,padding:"16px 32px"}}>
          <div style={{maxWidth:1200,margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:32,textAlign:"center"}}>
            {[
              {value:siteStats?.registered_users??100,suffix:"+",label:L.stat1Label||"Belgian households",accent:C.primary},
              {value:7,suffix:"",label:L.stat2Label||"suppliers compared",accent:C.amber},
              {value:15,suffix:" min",label:L.stat3Label||"price update interval",accent:C.purple},
              {value:200,prefix:"€",suffix:"+",label:L.stat4Label||"avg. annual saving",accent:"#10B981"},
            ].map((s,i)=>(
              <div key={i} className="sp-animate" style={{transitionDelay:`${i*0.1}s`}}>
                <div style={{fontSize:24,fontWeight:900,color:s.accent,letterSpacing:"-1px",lineHeight:1}}>
                  <AnimatedNumber value={s.value} prefix={s.prefix??""} suffix={s.suffix} />
                </div>
                <div style={{fontSize:12,color:C.muted,marginTop:6,fontWeight:600}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SMART TOOLS ─────────────────────────────────────────── */}
        <div style={{background:isDark ? C.bg : "linear-gradient(180deg,#F0FDF4,#F7FEF9)",padding:"56px 32px 40px"}}>
          <div style={{maxWidth:1200,margin:"0 auto"}}>
            <div className="sp-animate" style={{textAlign:"center",marginBottom:56}}>
              <div style={{fontSize:11,fontWeight:800,color:C.primary,textTransform:"uppercase",letterSpacing:3,marginBottom:14}}>{L.toolsLabel||"For Belgian households · Free forever"}</div>
              <h2 style={{fontSize:"clamp(28px,4vw,46px)",fontWeight:900,color:C.text,letterSpacing:"-1px",marginBottom:12}}>{L.toolsTitle||"Four smart tools. Zero cost."}</h2>
              <p style={{fontSize:16,color:C.muted,maxWidth:520,margin:"0 auto",lineHeight:1.8}}>{L.toolsDesc||"Track live prices, plan your EV charge, get daily alerts, and compare all Belgian suppliers — all in one place."}</p>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:24}}>
              {[
                {icon:"🏡",title:L.toolHomeTitle||"Smart Home",    badge:"Free",    badgeCol:C.primary,  accent:C.primary,  delay:0,
                  desc:L.toolHomeDesc||"Live Belgian EPEX electricity and gas prices, updated every 15 minutes. See today's cheapest hours at a glance — free for everyone. Sign in to unlock hourly history, personal alerts, and your savings dashboard.",
                  cta:L.toolHomeCta||"See today's prices →",     onClick:onGetStarted,
                  cta2:L.toolHomeCta2||"Sign in for more →",     onClick2:onGetStarted},
                {icon:"🔋",title:L.toolPlannerTitle||"Smart Planner",badge:"Live",  badgeCol:C.primary,  accent:C.primary,  delay:0.1,
                  desc:L.toolPlannerDesc||"Tell us your battery %, charger speed, and when you need to leave — we find the exact cheapest window on today's EPEX schedule so you never overpay for your EV charge again.",
                  cta:L.toolPlannerCta||"Plan my next charge →",  onClick:onGetStarted},
                {icon:"🔔",title:L.toolAlertsTitle||"Smart Alerts", badge:"Free",   badgeCol:"#0EA5E9",  accent:"#0EA5E9",  delay:0.2,
                  desc:L.toolAlertsDesc||"Every morning at 13:00 CET we check tomorrow's EPEX forecast and send you a heads-up when prices dip below your threshold — so you can time your EV, heat pump, or washing machine.",
                  cta:L.toolAlertsCta||"Set up alerts →",          onClick:onGetStarted},
                {icon:"📊",title:L.toolCompareTitle||"Smart Compare",badge:"7 plans",badgeCol:C.amber,   accent:C.amber,    delay:0.3,
                  desc:L.toolCompareDesc||"Compare all 7 Belgian electricity and gas suppliers side by side. Enter your consumption and see your real annual cost in 30 seconds — before you switch.",
                  cta:L.toolCompareCta||"Compare suppliers →",     onClick:()=>onOpenCalculator?.("electricity")},
              ].map((p,i)=>(
                <div key={p.title} className="sp-animate sp-card-tool" style={{transitionDelay:`${p.delay}s`}} onClick={p.cta2?undefined:p.onClick}>
                  <div style={{width:52,height:52,borderRadius:16,background:`${p.accent}12`,border:`1px solid ${p.accent}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,marginBottom:20}}>{p.icon}</div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                    <div style={{fontSize:18,fontWeight:800,color:C.text}}>{p.title}</div>
                    <span style={{fontSize:10,fontWeight:700,color:p.badgeCol,background:`${p.badgeCol}15`,border:`1px solid ${p.badgeCol}25`,borderRadius:20,padding:"2px 10px"}}>{p.badge}</span>
                  </div>
                  <div style={{fontSize:14,color:C.muted,lineHeight:1.75,marginBottom:20,flex:1}}>{p.desc}</div>
                  {p.cta2 ? (
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      <button onClick={e=>{e.stopPropagation();p.onClick();}} style={{padding:"10px 16px",borderRadius:20,fontSize:13,fontWeight:700,background:`linear-gradient(135deg,${p.accent},#22C55E)`,color:"#fff",border:"none",cursor:"pointer",textAlign:"left"}}>
                        {p.cta}
                      </button>
                      <button onClick={e=>{e.stopPropagation();p.onClick2();}} style={{padding:"9px 16px",borderRadius:20,fontSize:13,fontWeight:700,background:"transparent",color:p.accent,border:`1.5px solid ${p.accent}40`,cursor:"pointer",textAlign:"left"}}>
                        {p.cta2}
                      </button>
                    </div>
                  ) : (
                    <div style={{fontSize:13,fontWeight:700,color:p.accent}}>{p.cta}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>


        {/* ── EV API SECTION ───────────────────────────────────────── */}
        <div ref={evApiRef} style={{background:isDark?"rgba(10,18,40,0.7)":"rgba(239,246,255,0.8)",borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`,padding:"72px 32px 64px"}}>
          <div style={{maxWidth:960,margin:"0 auto"}}>
            <div className="sp-animate" style={{textAlign:"center",marginBottom:52}}>
              <div style={{fontSize:10,fontWeight:800,color:"#3B82F6",textTransform:"uppercase",letterSpacing:2.5,marginBottom:14}}>{L.evApiLabel||"For charging apps · EV platforms · Fleet software"}</div>
              <h2 style={{fontSize:"clamp(22px,3.5vw,38px)",fontWeight:900,color:C.text,letterSpacing:"-0.8px",margin:"0 0 8px"}}>{L.evApiTitle||"Your App Shows Where. We Show When."}</h2>
              <div style={{fontSize:14,color:C.primary,fontWeight:700,marginBottom:0}}>{L.evApiTagline||"One API call. Free forever."}</div>
            </div>

            {/* Side-by-side comparison */}
            <div className="sp-animate" style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:0,marginBottom:36,alignItems:"stretch"}}>
              {/* Left — standard EV app */}
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"20px 0 0 20px",padding:"28px 28px 24px"}}>
                <div style={{fontSize:11,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:20}}>Standard EV app</div>
                {[
                  {icon:"📍",label:"Nearest charger",val:"2 stations nearby"},
                  {icon:"💰",label:"Station price",val:"€0.69/kWh"},
                  {icon:"🗺️",label:"Route",val:"Turn left in 200m"},
                  {icon:"❓",label:"Good time to charge?",val:"—",dim:true},
                  {icon:"❓",label:"Cheapest window tonight",val:"—",dim:true},
                  {icon:"❓",label:"Saving by waiting 2h",val:"—",dim:true},
                ].map((r,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:i<5?`1px solid ${C.border}`:"none"}}>
                    <span style={{fontSize:16,width:22,textAlign:"center",opacity:r.dim?0.3:1}}>{r.icon}</span>
                    <span style={{flex:1,fontSize:13,color:r.dim?C.light:C.muted}}>{r.label}</span>
                    <span style={{fontSize:13,fontWeight:700,color:r.dim?"rgba(100,116,139,0.4)":C.text}}>{r.val}</span>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",width:48,background:isDark?"#0F1E3C":"#DBEAFE",flexShrink:0}}>
                <div style={{fontSize:11,fontWeight:800,color:"#3B82F6",writingMode:"vertical-rl",textTransform:"uppercase",letterSpacing:3}}>+ SmartPrice</div>
              </div>

              {/* Right — SmartPrice adds */}
              <div style={{background:"rgba(37,99,235,0.07)",border:`1px solid rgba(59,130,246,0.25)`,borderLeft:"none",borderRadius:"0 20px 20px 0",padding:"28px 28px 24px"}}>
                <div style={{fontSize:11,fontWeight:800,color:"#3B82F6",textTransform:"uppercase",letterSpacing:2,marginBottom:20}}>+ SmartPrice API adds</div>
                {[
                  {icon:"⚡",label:"Right now",val:"€38/MWh · €0.21/kWh"},
                  {icon:"🕐",label:"Cheapest tonight",val:"14:00–15:00"},
                  {icon:"💶",label:"Rate at best window",val:"€0.04/kWh"},
                  {icon:"✅",label:"Good time to charge?",val:"Yes / Wait 2h",good:true},
                  {icon:"✅",label:"Cheapest window found",val:"14:00–15:00",good:true},
                  {icon:"✅",label:"Save by waiting",val:"€3.20 on 40 kWh",good:true},
                ].map((r,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:i<5?`1px solid rgba(59,130,246,0.12)`:"none"}}>
                    <span style={{fontSize:16,width:22,textAlign:"center"}}>{r.icon}</span>
                    <span style={{flex:1,fontSize:13,color:r.good?"#3B82F6":C.muted}}>{r.label}</span>
                    <span style={{fontSize:13,fontWeight:700,color:r.good?"#22C55E":C.text}}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{background:isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 20px",marginBottom:20,fontFamily:"monospace",fontSize:12,color:C.muted,lineHeight:1.9,textAlign:"center"}}>
              {L.evApiSpec||"GET /api/current · /api/cheapest · /api/prices/today — No key · Belgium · Every 15 min · Free forever"}
            </div>
            <div style={{textAlign:"center"}}>
              <a href="/api-docs" style={{fontSize:14,fontWeight:700,color:"#3B82F6",textDecoration:"none"}}>Full API docs → smartprice.be/api-docs</a>
            </div>
          </div>
        </div>

        {/* ── EMAIL ALERTS BAR ─────────────────────────────────────── */}
        <div style={{maxWidth:1200,margin:"0 auto",padding:"0 32px 48px"}}>
          <div className="sp-animate sp-card-enterprise" style={{borderRadius:20,padding:"28px 32px"}}>
            {leadState==="done" ? (
              <div style={{display:"flex",gap:16,alignItems:"center"}}>
                <span style={{fontSize:32}}>✅</span>
                <div>
                  <div style={{fontSize:16,fontWeight:800,color:C.primary,marginBottom:4}}>{L.alertDoneTitle||"You're on the list!"}</div>
                  <div style={{fontSize:13,color:C.muted}}>{L.alertDoneSub||"Daily alert at 13:00 · No spam · Unsubscribe anytime"}</div>
                </div>
              </div>
            ) : (
              <div style={{display:"flex",gap:20,flexWrap:"wrap",alignItems:"center"}}>
                <div style={{flex:"1 1 240px"}}>
                  <div style={{fontSize:11,color:C.primary,fontWeight:800,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>🔔 {L.alertBarLabel||"Free daily price alerts"}</div>
                  <div style={{fontSize:17,fontWeight:800,color:C.text}}>{L.alertBarTitle||"Get notified when the cheapest window opens"}</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:4}}>{L.alertBarSub||"Every day at 13:00 · No spam · Unsubscribe anytime"}</div>
                </div>
                <form onSubmit={submitLead} style={{display:"flex",gap:10,flexWrap:"wrap",flex:"1 1 320px"}}>
                  <input type="email" required placeholder="your@email.com" value={leadEmail} onChange={e=>setLeadEmail(e.target.value)}
                    style={{flex:1,minWidth:180,padding:"12px 18px",borderRadius:24,fontSize:14,background:C.bg,border:`1.5px solid ${C.border}`,color:C.text,outline:"none",fontFamily:"inherit",transition:"border 0.2s"}}
                    onFocus={e=>e.target.style.border=`1.5px solid ${C.primary}`}
                    onBlur={e=>e.target.style.border=`1.5px solid ${C.border}`}/>
                  <button type="submit" disabled={leadState==="loading"} className="sp-cta-green-solid" style={{opacity:leadState==="loading"?0.7:1,fontSize:13,padding:"12px 24px"}}>
                    {leadState==="loading"?"…":(L.alertBarCta||"Notify me →")}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
        {/* ── FAQ ─────────────────────────────────────────────────── */}
        <div style={{maxWidth:800,margin:"0 auto",padding:"0 32px 56px"}}>
          <div className="sp-animate" style={{textAlign:"center",marginBottom:36}}>
            <div style={{fontSize:11,fontWeight:800,color:C.primary,textTransform:"uppercase",letterSpacing:3,marginBottom:14}}>FAQ</div>
            <h2 style={{fontSize:"clamp(26px,4vw,42px)",fontWeight:900,color:C.text,letterSpacing:"-1px"}}>Frequently asked questions</h2>
          </div>
          {faqs.filter(f=>f.q).map((f,i)=>(
            <div key={i} className="sp-animate" style={{transitionDelay:`${i*0.07}s`}} onClick={()=>setOpenFaq(openFaq===i?null:i)}>
              <div style={{background:openFaq===i?"rgba(22,163,74,0.03)":C.card,border:`1px solid ${openFaq===i?"rgba(22,163,74,0.3)":C.border}`,borderRadius:16,overflow:"hidden",cursor:"pointer",marginBottom:10,transition:"all 0.3s",boxShadow:C.shadow}}>
                <div style={{padding:"18px 24px",fontSize:16,fontWeight:700,display:"flex",justifyContent:"space-between",alignItems:"center",color:openFaq===i?C.primary:C.text}}>
                  {f.q}
                  <span style={{color:C.primary,fontSize:24,fontWeight:300,flexShrink:0,marginLeft:20,transform:openFaq===i?"rotate(45deg)":"none",transition:"transform 0.3s",display:"inline-block"}}>+</span>
                </div>
                {openFaq===i&&<div style={{padding:"0 24px 20px",fontSize:14,color:C.muted,lineHeight:1.85,borderTop:`1px solid rgba(22,163,74,0.1)`}}><div style={{paddingTop:14}}>{f.a}</div></div>}
              </div>
            </div>
          ))}
        </div>


      </div>{/* /content wrapper */}

      {/* ── CTA STRIP ─────────────────────────────────────────────── */}
      <div style={{position:"relative",overflow:"hidden",background:isDark?"linear-gradient(135deg,#0D1F3C 0%,#0F2A1E 100%)":"linear-gradient(135deg,#EFF6FF 0%,#F0FDF4 100%)",borderTop:`1px solid ${isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)"}`,borderBottom:`1px solid ${isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)"}`}}>
        {/* Decorative chevrons */}
        {[220,280,340].map(right=>(
          <div key={right} style={{position:"absolute",top:0,right:right,height:"100%",width:48,borderRight:`2px solid ${isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.05)"}`,transform:"skewX(-18deg)",pointerEvents:"none"}} />
        ))}
        <div style={{maxWidth:1100,margin:"0 auto",padding:"36px 40px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:32,flexWrap:"wrap",position:"relative",zIndex:1}}>
          <div style={{flex:1,minWidth:260}}>
            <div style={{fontSize:"clamp(20px,2.5vw,28px)",fontWeight:900,color:isDark?"#F1F5F9":"#0F172A",letterSpacing:"-0.5px",marginBottom:8,lineHeight:1.2}}>
              {L.ctaStripTitle||"Ready to charge smart?"}
            </div>
            <div style={{fontSize:15,color:isDark?"rgba(255,255,255,0.6)":"#475569",lineHeight:1.6}}>
              {L.ctaStripSub||"See Belgium's cheapest electricity hour — free, no account needed."}
            </div>
          </div>
          <a href="/business" style={{flexShrink:0,display:"inline-block",textDecoration:"none",background:"linear-gradient(135deg,#1E40AF,#2563EB)",color:"#fff",padding:"14px 32px",borderRadius:40,fontWeight:800,fontSize:15,boxShadow:"0 6px 24px rgba(37,99,235,0.35)",whiteSpace:"nowrap",transition:"transform 0.15s,box-shadow 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 10px 32px rgba(37,99,235,0.45)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 6px 24px rgba(37,99,235,0.35)";}}>
            {L.ctaStripBtn||"Free Fleet Audit →"}
          </a>
        </div>
      </div>

      </div>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <div style={{background:isDark?"#0A1220":"#0F172A",borderTop:`1px solid rgba(255,255,255,0.07)`,padding:"56px 32px 32px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          {/* 4-column grid */}
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:48,marginBottom:48,flexWrap:"wrap"}}>
            {/* Col 1 — brand */}
            <div>
              <div style={{fontSize:22,fontWeight:900,color:"#fff",letterSpacing:"-0.5px",marginBottom:10}}>SmartPrice<span style={{color:"#22C55E"}}>.be</span></div>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.5)",lineHeight:1.75,marginBottom:24,maxWidth:240}}>Live EPEX Spot electricity prices for Belgium — free for households, EV drivers, and company fleets.</div>
              <div style={{display:"flex",gap:10}}>
                {[
                  {label:"f",color:"#1877F2",href:"https://www.facebook.com/groups/smartpricebe"},
                  {label:"in",color:"#0A66C2",href:"https://www.linkedin.com/company/smartpricebe"},
                  {label:"💬",color:"#25D366",href:`https://wa.me/?text=${encodeURIComponent("⚡ SmartPrice.be — live EPEX prices + cheapest EV charging window for Belgium. Free. https://smartprice.be")}`},
                ].map(s=>(
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                    style={{width:36,height:36,borderRadius:10,background:`${s.color}18`,border:`1px solid ${s.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:s.color,textDecoration:"none"}}>
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
            {/* Col 2 — Households */}
            <div>
              <div style={{fontSize:11,fontWeight:800,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:2,marginBottom:16}}>Households</div>
              {[["Live electricity prices","/"],["EV Charge Planner","/"],["Price alerts","/"],["Compare suppliers","/calculator/electricity"],["Home Assistant (HACS)","/api-docs"]].map(([l,h])=>(
                <a key={l} href={h} style={{display:"block",color:"rgba(255,255,255,0.6)",textDecoration:"none",fontSize:13,fontWeight:500,marginBottom:10,lineHeight:1.4}}
                  onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.style.color="rgba(255,255,255,0.6)"}>{l}</a>
              ))}
            </div>
            {/* Col 3 — Business */}
            <div>
              <div style={{fontSize:11,fontWeight:800,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:2,marginBottom:16}}>Business</div>
              {[["Fleet Audit (free)","/business"],["Fleet Audit Tool","/fleet-audit"],["CIR 92 compliance","/business"],["EV Reimbursement","/business"],["Contact us","mailto:info@smartprice.be"]].map(([l,h])=>(
                <a key={l} href={h} style={{display:"block",color:"rgba(255,255,255,0.6)",textDecoration:"none",fontSize:13,fontWeight:500,marginBottom:10,lineHeight:1.4}}
                  onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.style.color="rgba(255,255,255,0.6)"}>{l}</a>
              ))}
            </div>
            {/* Col 4 — Company */}
            <div>
              <div style={{fontSize:11,fontWeight:800,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:2,marginBottom:16}}>Company</div>
              {[["About SmartPrice.be","/"],["API for developers","/api-docs"],["EV charging Belgium","/ev-charging-belgium"],["Privacy Policy","#privacy"],["info@smartprice.be","mailto:info@smartprice.be"]].map(([l,h])=>(
                <a key={l} href={h}
                  onClick={l==="Privacy Policy"?e=>{e.preventDefault();window.dispatchEvent(new CustomEvent("showPrivacy"))}:undefined}
                  style={{display:"block",color:"rgba(255,255,255,0.6)",textDecoration:"none",fontSize:13,fontWeight:500,marginBottom:10,lineHeight:1.4}}
                  onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.style.color="rgba(255,255,255,0.6)"}>{l}</a>
              ))}
            </div>
          </div>
          {/* Bottom bar */}
          <div style={{borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:24,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>© 2026 SmartPrice.be · Data: Energy-Charts.info · Elia Open Data (CC BY 4.0) · Updated every 15 min</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>🇧🇪 Built for Belgium</div>
          </div>
        </div>
      </div>

      {/* ── GLOBAL STYLES + ANIMATIONS ────────────────────────────── */}
      <style>{`
        * { box-sizing: border-box; }

        /* Animated hero gradient — Belgian enterprise navy */
        .sp-hero {
          background: linear-gradient(-45deg, #0B0F1A, #0F1E38, #071628, #1E3A8A, #0B1628, #0F1E38);
          background-size: 400% 400%;
          animation: sp-gradient 14s ease infinite;
          position: relative;
        }

        @keyframes sp-gradient {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* Floating blob decorations */
        .sp-blob {
          position: absolute;
          border-radius: 50%;
          background: rgba(59,130,246,0.07);
          pointer-events: none;
        }
        .sp-blob-1 {
          width: 600px; height: 600px;
          top: -200px; right: -100px;
          animation: sp-float1 18s ease-in-out infinite;
        }
        .sp-blob-2 {
          width: 400px; height: 400px;
          bottom: -100px; left: -80px;
          animation: sp-float2 14s ease-in-out infinite;
        }
        .sp-blob-3 {
          width: 280px; height: 280px;
          top: 30%; left: 15%;
          animation: sp-float1 22s ease-in-out infinite reverse;
          opacity: 0.5;
        }
        @keyframes sp-float1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%  { transform: translate(30px,-40px) scale(1.04); }
          66%  { transform: translate(-20px,20px) scale(0.97); }
        }
        @keyframes sp-float2 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%  { transform: translate(20px,-25px) scale(1.06); }
        }

        /* Glass card in hero */
        .sp-glass {
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.25);
          backdrop-filter: blur(16px);
        }

        /* Scroll-reveal animations */
        .sp-animate {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1),
                      transform 0.8s cubic-bezier(0.16,1,0.3,1);
        }
        .sp-animate.sp-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .sp-delay-1 { transition-delay: 0.12s; }
        .sp-delay-2 { transition-delay: 0.24s; }
        .sp-delay-3 { transition-delay: 0.36s; }
        .sp-delay-4 { transition-delay: 0.48s; }

        /* Pulse on LIVE badge */
        @keyframes sp-pulse {
          0%,100% { opacity: 1; }
          50%  { opacity: 0.5; }
        }

        /* Scroll indicator */
        .sp-scroll-indicator {
          position: absolute;
          bottom: 36px;
          left: 50%;
          transform: translateX(-50%);
          cursor: pointer;
          animation: sp-bounce 2.5s ease infinite;
        }
        .sp-scroll-chevron {
          width: 24px; height: 24px;
          border-right: 2.5px solid rgba(255,255,255,0.6);
          border-bottom: 2.5px solid rgba(255,255,255,0.6);
          transform: rotate(45deg);
          margin: auto;
        }
        @keyframes sp-bounce {
          0%,100% { transform: translateX(-50%) translateY(0); }
          50%  { transform: translateX(-50%) translateY(8px); }
        }

        /* Ticker */
        .sp-ticker-track {
          display: flex;
          animation: sp-ticker 30s linear infinite;
          width: max-content;
        }
        @keyframes sp-ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        /* Enterprise card base */
        .sp-card-enterprise {
          background: ${C.card};
          border: 1px solid ${C.border};
          box-shadow: ${C.shadow};
          transition: box-shadow 0.3s ease, transform 0.3s ease;
        }
        .sp-card-enterprise:hover {
          box-shadow: 0 16px 48px rgba(16,185,129,0.12);
        }

        /* Tool cards (clickable) */
        .sp-card-tool {
          background: ${C.card};
          border: 1px solid ${C.border};
          box-shadow: ${C.shadow};
          border-radius: 20px;
          padding: 28px 24px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1),
                      box-shadow 0.3s ease;
        }
        .sp-card-tool:hover {
          transform: translateY(-8px);
          box-shadow: 0 24px 64px rgba(22,163,74,0.16);
        }

        /* Skeleton shimmer */
        @keyframes sp-shimmer {
          0%,100% { opacity: 0.55; }
          50%      { opacity: 1; }
        }
        .sp-shimmer { animation: sp-shimmer 1.5s ease-in-out infinite; }

        /* Metric cards */
        .sp-metric-card {
          border-radius: 18px;
          padding: 22px 24px;
        }
        .sp-metric-green { background: rgba(22,163,74,0.04); border: 1px solid rgba(22,163,74,0.2); }
        .sp-metric-red   { background: rgba(220,38,38,0.03); border: 1px solid rgba(220,38,38,0.15); }
        .sp-metric-amber { background: rgba(217,119,6,0.04);  border: 1px solid rgba(217,119,6,0.2);  }

        /* CTAs */
        .sp-cta-primary {
          display: inline-block;
          padding: 14px 36px;
          border-radius: 30px;
          font-size: 15px;
          font-weight: 800;
          background: #FCD34D;
          color: #15803D;
          border: none;
          cursor: pointer;
          box-shadow: 0 6px 28px rgba(0,0,0,0.2);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .sp-cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 36px rgba(0,0,0,0.25);
        }
        .sp-cta-ghost {
          display: inline-block;
          padding: 14px 28px;
          border-radius: 30px;
          font-size: 14px;
          font-weight: 700;
          background: rgba(255,255,255,0.12);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.3);
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: background 0.2s;
        }
        .sp-cta-ghost:hover { background: rgba(255,255,255,0.2); }
        .sp-cta-green-solid {
          display: inline-block;
          padding: 13px 32px;
          border-radius: 30px;
          font-size: 15px;
          font-weight: 800;
          background: linear-gradient(135deg,#16A34A,#22C55E);
          color: #fff;
          border: none;
          cursor: pointer;
          box-shadow: 0 6px 24px rgba(22,163,74,0.3);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .sp-cta-green-solid:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 32px rgba(22,163,74,0.4);
        }
        .sp-cta-outline-green {
          display: inline-block;
          padding: 10px 24px;
          border-radius: 24px;
          font-size: 14px;
          font-weight: 700;
          background: rgba(22,163,74,0.07);
          border: 1px solid rgba(22,163,74,0.25);
          color: #16A34A;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.2s;
        }
        .sp-cta-outline-green:hover { background: rgba(22,163,74,0.14); }
        .sp-cta-outline-amber {
          display: inline-block;
          padding: 9px 20px;
          border-radius: 24px;
          font-size: 13px;
          font-weight: 700;
          background: rgba(249,115,22,0.08);
          border: 1px solid rgba(249,115,22,0.25);
          color: #F97316;
          text-decoration: none;
          transition: background 0.2s;
        }
        .sp-cta-outline-amber:hover { background: rgba(249,115,22,0.14); }

        input[type=range] { height: 6px; border-radius: 3px; }

        /* At-a-Glance table grid */
        .sp-glance-header {
          display: grid;
          grid-template-columns: 168px 130px 1fr 118px;
          gap: 12px;
          padding: 0 0 10px;
        }
        .sp-glance-row {
          display: grid;
          grid-template-columns: 168px 130px 1fr 118px;
          gap: 12px;
          padding: 13px 0;
          align-items: center;
        }

        /* Mobile — stack each row as a card */
        @media (max-width: 640px) {
          .sp-glance-header { display: none; }
          .sp-glance-row {
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: 14px 0;
          }
          .sp-glance-row > div:first-child { margin-bottom: 2px; }
        }

        /* Prevent horizontal scroll from any fixed-width child */
        @media (max-width: 768px) {
          .sp-card-enterprise { overflow-x: hidden; }
        }

        /* Mobile hero — trim to headline + price, drop the redundant
           decorative badge and urgency callout (already implied by the
           "Cheapest — now" / "Best window" label in the price card) */
        @media (max-width: 640px) {
          .sp-hero { padding: 88px 20px 48px; }
          .sp-hero-badge { display: none; }
          .sp-hero-tagline { font-size: 16px; margin-bottom: 10px; }
          .sp-hero-subtitle { margin-bottom: 24px; }
          .sp-hero-urgency { display: none; }
          .sp-desktop-extra { display: none; }
        }
      `}</style>
    </div>
  );
}
