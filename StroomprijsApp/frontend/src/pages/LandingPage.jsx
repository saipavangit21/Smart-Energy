/**
 * LandingPage.jsx — SmartPrice.be
 * v9: Enterprise-scale design — animated hero, scroll animations,
 *     transparent-to-solid nav, animated counters, hover effects
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "../context/LanguageContext";
import LangSwitcher  from "../components/LangSwitcher";
import ThemeSwitcher from "../components/ThemeSwitcher";

const C = {
  bg:        "#F7FEF9",
  card:      "#FFFFFF",
  border:    "rgba(0,0,0,0.08)",
  shadow:    "0 4px 24px rgba(0,0,0,0.08)",
  shadowHover:"0 20px 60px rgba(22,163,74,0.18)",
  primary:   "#16A34A",
  bright:    "#22C55E",
  text:      "#0F1A0F",
  muted:     "#52635A",
  light:     "#9DB3A3",
  green:     "#22C55E",
  highlight: "#DCFCE7",
  border2:   "rgba(22,163,74,0.2)",
  amber:     "#D97706",
  purple:    "#7C3AED",
  red:       "#DC2626",
};

/* ── helpers ─────────────────────────────────────────────────── */
const retailKwh = mwh => (mwh / 1000) + 0.173;
const retailFmt = mwh => retailKwh(mwh).toFixed(3);
const fmtHour   = h   => `${String(h).padStart(2,"0")}:00`;

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

/* ═══════════════════════════════════════════════════════════════ */
export default function LandingPage({ onGetStarted, onOpenCalculator }) {
  const { tSection } = useLanguage();
  const L = tSection("landing");

  useEffect(() => {
    document.title = "SmartPrice.be — Live Belgian Electricity & Gas Prices | Free";
    const desc = document.querySelector("meta[name='description']");
    if (desc) desc.setAttribute("content", "Track live EPEX Spot electricity prices in Belgium, compare all suppliers, find the cheapest hours to charge your EV, and set price alerts. 100% free.");
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
  const [fluviusEmail, setFluviusEmail] = useState("");
  const [fluviusState, setFluviusState] = useState("idle");
  const [copiedCmd,    setCopiedCmd]    = useState(false);
  const [fetchedAt,    setFetchedAt]    = useState(null);
  const [siteStats,    setSiteStats]    = useState(null);
  const [gasCurrent,   setGasCurrent]   = useState(null);
  const toolsRef = useRef(null);

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
    fetch("/api/prices/today").then(r => r.json())
      .then(d => { if (d.data?.length) { setPrices(d.data); setFetchedAt(d.fetched_at || new Date().toISOString()); }}).catch(()=>{});
  }, []);
  useEffect(() => {
    fetch("/api/gas/current").then(r=>r.json()).then(d=>{ if(d.success&&d.ttf) setGasCurrent({price:d.ttf.price,ttf_cEkWh:d.ttf_cEkWh}); }).catch(()=>{});
  }, []);
  useEffect(() => {
    fetch("/api/stats").then(r=>r.json()).then(d=>{ if(d.success) setSiteStats(d); }).catch(()=>{});
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
  async function submitLead(e) {
    e.preventDefault();
    if (!leadEmail||leadState!=="idle") return;
    setLeadState("loading");
    try { const r=await fetch("/api/leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:leadEmail,source:"landing"})}); setLeadState(r.ok?"done":"error"); } catch { setLeadState("error"); }
  }
  async function submitFluvius(e) {
    e.preventDefault();
    if (!fluviusEmail||fluviusState!=="idle") return;
    setFluviusState("loading");
    try { const r=await fetch("/api/leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:fluviusEmail,source:"fluvius_waitlist"})}); setFluviusState(r.ok?"done":"error"); } catch { setFluviusState("error"); }
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
    cheapHour!=null  && `🟢 Best window: ${fmtHour(cheapHour)}–${fmtHour(cheapWindowEnd??cheapHour+1)} · €${cheapMwh!=null?retailFmt(cheapMwh):"—"}/kWh`,
    gasCurrent       && `🔥 Gas TTF: €${gasCurrent.price?.toFixed(1)}/MWh`,
    savingToday!=null&&savingToday>0.5 && `💶 Save €${savingToday.toFixed(2)} per 40 kWh charge today`,
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
        background: scrolled ? "rgba(255,255,255,0.97)" : "transparent",
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
          <a href="/ev-charging-belgium" style={{padding:"7px 16px",borderRadius:20,fontSize:12,fontWeight:700,background:scrolled?"rgba(34,197,94,0.08)":"rgba(255,255,255,0.12)",border:scrolled?"1px solid rgba(34,197,94,0.2)":"1px solid rgba(255,255,255,0.25)",color:scrolled?C.primary:"#fff",textDecoration:"none"}}>🚗 EV</a>
          <a href="/business" style={{padding:"7px 16px",borderRadius:20,fontSize:12,fontWeight:700,background:scrolled?C.highlight:"rgba(255,255,255,0.12)",border:scrolled?`1px solid ${C.border2}`:"1px solid rgba(255,255,255,0.25)",color:scrolled?C.primary:"#fff",textDecoration:"none"}}>🏢 Business</a>
          <button onClick={onGetStarted} style={{padding:"9px 22px",borderRadius:20,fontSize:13,fontWeight:800,background:scrolled?"linear-gradient(135deg,#16A34A,#22C55E)":"rgba(255,255,255,0.2)",color:"#fff",border:scrolled?"none":"1px solid rgba(255,255,255,0.35)",cursor:"pointer",boxShadow:scrolled?"0 4px 16px rgba(22,163,74,0.3)":"none"}}>
            Dashboard →
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
        <div className="sp-animate" style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:30,padding:"6px 20px",marginBottom:28,fontSize:13,fontWeight:700,color:"#fff",backdropFilter:"blur(8px)"}}>
          🇧🇪 Belgium · EPEX Spot · Live now
        </div>

        {/* Headline */}
        <h1 className="sp-animate sp-delay-1" style={{fontSize:"clamp(38px,6.5vw,84px)",fontWeight:900,lineHeight:1.05,margin:"0 auto 24px",maxWidth:860,letterSpacing:"-3px",color:"#fff",textShadow:"0 2px 40px rgba(0,0,0,0.15)"}}>
          Is now a good time<br/>
          <span style={{color:"#FCD34D"}}>to charge your EV?</span>
        </h1>

        {/* Subtitle */}
        <p className="sp-animate sp-delay-2" style={{fontSize:"clamp(16px,2vw,20px)",color:"rgba(255,255,255,0.85)",maxWidth:540,margin:"0 auto 40px",lineHeight:1.7,fontWeight:400}}>
          Live EPEX Spot Belgium — see today's cheapest charging window, compare 7 suppliers, and get daily alerts. Free forever.
        </p>

        {/* Live price display */}
        {currentMwh!=null && (
          <div className="sp-animate sp-delay-3 sp-glass" style={{display:"inline-flex",alignItems:"center",gap:24,borderRadius:20,padding:"20px 32px",marginBottom:40,flexWrap:"wrap",justifyContent:"center"}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",fontWeight:700,textTransform:"uppercase",letterSpacing:"2px",marginBottom:4}}>Right now</div>
              <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                <span style={{fontSize:"clamp(40px,6vw,64px)",fontWeight:900,fontFamily:"monospace",color:currentCol,letterSpacing:"-3px",lineHeight:1}}>{Math.round(currentMwh)}</span>
                <span style={{fontSize:16,color:"rgba(255,255,255,0.5)",fontWeight:600}}>€/MWh</span>
                {currentLbl && <span style={{fontSize:10,fontWeight:800,color:currentCol,background:`${currentCol}25`,border:`1px solid ${currentCol}50`,borderRadius:20,padding:"3px 10px",textTransform:"uppercase",letterSpacing:"1px"}}>{currentLbl}</span>}
              </div>
            </div>
            {cheapHour!=null && (
              <>
                <div style={{width:1,height:48,background:"rgba(255,255,255,0.15)"}} />
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",fontWeight:700,textTransform:"uppercase",letterSpacing:"2px",marginBottom:4}}>
                    {cheapIsNow?"Cheapest — now":"Best window"}
                  </div>
                  <div style={{fontSize:20,fontWeight:800,color:"#fff"}}>{cheapIsNow?"Right now!":` ${fmtHour(cheapHour)} – ${fmtHour(cheapWindowEnd??cheapHour+1)}`}</div>
                  <div style={{fontSize:13,color:"#4ADE80",fontWeight:700}}>€{retailFmt(cheapMwh)}/kWh{savingToday!=null&&savingToday>0.3?` · save €${savingToday.toFixed(2)}`:""}</div>
                </div>
              </>
            )}
            {updatedStr && <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",fontWeight:600}}>↻ {updatedStr}</div>}
          </div>
        )}

        {/* Urgency */}
        {(cheapNow||cheapSoon) && (
          <div className="sp-animate sp-delay-3" style={{display:"inline-block",background:"rgba(34,197,94,0.2)",border:"1px solid rgba(34,197,94,0.5)",borderRadius:12,padding:"8px 22px",fontSize:14,fontWeight:700,color:"#4ADE80",marginBottom:32}}>
            {cheapNow ? "⚡ Cheapest window RIGHT NOW — plug in" : `⚡ Cheapest window in ${minsUntilCheap<60?`${minsUntilCheap} min`:`${Math.floor(minsUntilCheap/60)}h ${minsUntilCheap%60}m`}`}
          </div>
        )}

        {/* Dual-entry portal — B2C + B2B */}
        <div className="sp-animate sp-delay-4" style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap",marginBottom:16}}>
          <button onClick={onGetStarted} className="sp-cta-primary">
            👉 Track My Consumption (Free)
          </button>
          <a href="/business" className="sp-cta-ghost" style={{textDecoration:"none",display:"inline-flex",alignItems:"center",gap:8}}>
            💼 Corporate EV Fleets →
          </a>
        </div>
        <div className="sp-animate sp-delay-4" style={{marginBottom:52}}>
          <button onClick={()=>toolsRef.current?.scrollIntoView({behavior:"smooth"})} style={{background:"none",border:"none",color:"rgba(255,255,255,0.5)",fontSize:13,cursor:"pointer",fontWeight:600,letterSpacing:"0.3px"}}>
            ↓ See live prices
          </button>
        </div>

        {/* Scroll indicator */}
        <div className="sp-scroll-indicator" onClick={()=>toolsRef.current?.scrollIntoView({behavior:"smooth"})}>
          <div className="sp-scroll-chevron" />
        </div>
      </div>

      {/* ── PLATFORM STRIP ────────────────────────────────────────── */}
      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,position:"sticky",top:68,zIndex:100}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"flex",overflow:"auto"}}>
          {[
            {icon:"⚡",label:"Smart Prices",  accent:C.primary,href:null,          active:true},
            {icon:"🏢",label:"Smart Business",accent:"#1E40AF",href:"/business",    active:false},
            {icon:"🚗",label:"Smart Fleet",   accent:C.amber,  href:"/fleet-audit", active:false},
            {icon:"🔌",label:"Smart Connect", accent:C.purple, href:"/api-docs",    active:false},
          ].map(s=>(
            <a key={s.label} href={s.href||"#"} onClick={s.href?undefined:e=>e.preventDefault()}
              style={{display:"flex",alignItems:"center",gap:7,padding:"12px 28px",fontSize:13,fontWeight:700,color:s.active?s.accent:C.muted,textDecoration:"none",borderBottom:`2px solid ${s.active?s.accent:"transparent"}`,whiteSpace:"nowrap",transition:"color 0.2s"}}>
              {s.icon} {s.label}
            </a>
          ))}
        </div>
      </div>

      {/* ── TICKER STRIP ──────────────────────────────────────────── */}
      {tickerItems.length > 0 && (
        <div style={{background:"linear-gradient(90deg,#15803D,#16A34A)",overflow:"hidden",padding:"10px 0",borderBottom:`1px solid rgba(255,255,255,0.1)`}}>
          <div className="sp-ticker-track">
            {[...tickerItems,...tickerItems].map((item,i)=>(
              <span key={i} style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.9)",whiteSpace:"nowrap",padding:"0 40px"}}>
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── STATS BAR ─────────────────────────────────────────────── */}
      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,padding:"28px 32px"}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:32,textAlign:"center"}}>
          {[
            {value:siteStats?.registered_users??100,suffix:"+",label:"Belgian households",accent:C.primary},
            {value:7,suffix:"",label:"suppliers compared",accent:C.amber},
            {value:15,suffix:" min",label:"price update interval",accent:C.purple},
            {value:200,prefix:"€",suffix:"+",label:"avg. annual EV saving",accent:"#10B981"},
          ].map((s,i)=>(
            <div key={i} className="sp-animate" style={{transitionDelay:`${i*0.1}s`}}>
              <div style={{fontSize:32,fontWeight:900,color:s.accent,letterSpacing:"-1px",lineHeight:1}}>
                <AnimatedNumber value={s.value} prefix={s.prefix??""} suffix={s.suffix} />
              </div>
              <div style={{fontSize:12,color:C.muted,marginTop:6,fontWeight:600}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CONTENT WRAPPER ───────────────────────────────────────── */}
      <div ref={toolsRef}>

        {/* ── LIVE PRICE SECTION ──────────────────────────────────── */}
        <div style={{maxWidth:1200,margin:"0 auto",padding:"72px 32px 0"}}>
          <div className="sp-animate" style={{textAlign:"center",marginBottom:48}}>
            <div style={{fontSize:11,fontWeight:800,color:C.primary,textTransform:"uppercase",letterSpacing:3,marginBottom:14}}>Live right now</div>
            <h2 style={{fontSize:"clamp(28px,4vw,46px)",fontWeight:900,color:C.text,marginBottom:12,letterSpacing:"-1px"}}>Today's electricity prices</h2>
            <p style={{fontSize:16,color:C.muted,maxWidth:520,margin:"0 auto",lineHeight:1.8}}>Real-time EPEX Spot Belgium. Cheapest window, peak hours, and your exact cost per charge.</p>
          </div>

          {/* ── AT A GLANCE — structured window table ─────────────── */}
          {prices.length>0&&(cheapHour!=null||peakH!=null) && (
            <div className="sp-animate" style={{background:"#fff",border:`1.5px solid ${C.border2}`,borderRadius:20,padding:"24px 28px",marginBottom:32,boxShadow:"0 4px 20px rgba(22,163,74,0.07)",overflowX:"auto"}}>
              <div style={{fontSize:10,fontWeight:800,color:C.primary,textTransform:"uppercase",letterSpacing:"2px",marginBottom:18}}>Best charging windows — today</div>

              {/* Column headers */}
              <div className="sp-glance-header">
                {["Window","Timing Today","Your Action","Rate"].map(h=>(
                  <div key={h} style={{fontSize:9,fontWeight:800,color:C.light,textTransform:"uppercase",letterSpacing:"1.5px"}}>{h}</div>
                ))}
              </div>

              {/* Row 1 — daytime cheapest (solar peak) */}
              {cheapHour!=null && (
                <div className="sp-glance-row" style={{borderTop:`1px solid ${C.border}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{width:9,height:9,borderRadius:"50%",background:"#22C55E",flexShrink:0,display:"inline-block"}}/>
                    <span style={{fontSize:13,fontWeight:700,color:C.text}}>Best Solar Peak</span>
                  </div>
                  <div style={{fontSize:14,fontWeight:800,color:C.primary}}>{fmtHour(cheapHour)}–{fmtHour(cheapWindowEnd??cheapHour+1)}</div>
                  <div style={{fontSize:13,color:C.muted,lineHeight:1.5}}>Run washing machine / heat pump</div>
                  <div style={{fontSize:13,fontWeight:700,color:C.primary}}>{cheapMwh!=null?`€${retailFmt(cheapMwh)}/kWh`:"low"}</div>
                </div>
              )}

              {/* Row 2 — night window */}
              {nightH!=null && (
                <div className="sp-glance-row" style={{borderTop:`1px solid ${C.border}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{width:9,height:9,borderRadius:"50%",background:"#6366F1",flexShrink:0,display:"inline-block"}}/>
                    <span style={{fontSize:13,fontWeight:700,color:C.text}}>Best Night Window</span>
                  </div>
                  <div style={{fontSize:14,fontWeight:800,color:"#6366F1"}}>{fmtHour(nightH)}–{fmtHour((nightH+3)%24)}</div>
                  <div style={{fontSize:13,color:C.muted,lineHeight:1.5}}>Automated overnight EV charge</div>
                  <div style={{fontSize:13,fontWeight:700,color:"#6366F1"}}>{nightMwh!=null?`€${retailFmt(nightMwh)}/kWh`:"off-peak"}</div>
                </div>
              )}

              {/* Row 3 — peak freeze */}
              {peakH!=null && (
                <div className="sp-glance-row" style={{borderTop:`1px solid ${C.border}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{width:9,height:9,borderRadius:"50%",background:C.red,flexShrink:0,display:"inline-block"}}/>
                    <span style={{fontSize:13,fontWeight:700,color:C.text}}>Peak Price Freeze</span>
                  </div>
                  <div style={{fontSize:14,fontWeight:800,color:C.red}}>{fmtHour(peakH)}–{fmtHour(peakH+2)}</div>
                  <div style={{fontSize:13,color:C.muted,lineHeight:1.5}}>Pause heavy appliances &amp; charging</div>
                  <div style={{fontSize:13,fontWeight:700,color:C.red}}>{peakMwh!=null?`€${retailFmt(peakMwh)}/kWh`:"avoid"}</div>
                </div>
              )}
            </div>
          )}

          {prices.length>0&&cheapHour!=null ? (
            <div className="sp-animate sp-card-enterprise" style={{borderRadius:24,overflow:"hidden",marginBottom:72}}>
              {/* Header */}
              <div style={{background:"linear-gradient(135deg,#15803D,#16A34A,#22C55E)",backgroundSize:"200% 200%",padding:"28px 36px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:20}}>
                <div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",fontWeight:700,textTransform:"uppercase",letterSpacing:"2px",marginBottom:8}}>⚡ EPEX Spot Belgium</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:12}}>
                    <span style={{fontSize:"clamp(48px,6vw,72px)",fontWeight:900,fontFamily:"monospace",color:currentCol,letterSpacing:"-3px",lineHeight:1}}>{Math.round(currentMwh??0)}</span>
                    <div>
                      <div style={{fontSize:18,color:"rgba(255,255,255,0.5)",fontWeight:600}}>€/MWh</div>
                      {currentLbl && <div style={{fontSize:10,fontWeight:800,color:currentCol,background:`${currentCol}22`,border:`1px solid ${currentCol}55`,borderRadius:20,padding:"3px 12px",marginTop:4,display:"inline-block"}}>{currentLbl}</div>}
                    </div>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:6}}>↻ {updatedStr??"…"}</div>
                  <div style={{fontSize:16,color:"rgba(255,255,255,0.7)"}}>= <strong style={{color:currentCol,fontSize:20}}>€{currentMwh!=null?retailFmt(currentMwh):"—"}/kWh</strong></div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:4}}>incl. distribution</div>
                </div>
              </div>

              <div style={{padding:"32px 36px",background:C.card}}>
                {/* Price grid */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,marginBottom:28}}>
                  <div className="sp-metric-card sp-metric-green">
                    <div style={{fontSize:11,fontWeight:800,color:"#16A34A",textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>
                      {cheapIsNow?"⚡ Cheapest — plug in now":"Best window today"}
                    </div>
                    <div style={{fontSize:"clamp(20px,3vw,28px)",fontWeight:900,color:C.text,marginBottom:6}}>{cheapIsNow?"Right now!":` ${fmtHour(cheapHour)} – ${fmtHour(cheapWindowEnd??cheapHour+2)}`}</div>
                    <div style={{fontSize:20,fontWeight:800,color:"#16A34A"}}>€{retailFmt(cheapMwh)}/kWh</div>
                  </div>
                  <div className="sp-metric-card sp-metric-red">
                    <div style={{fontSize:11,fontWeight:800,color:C.red,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>Peak — avoid charging</div>
                    <div style={{fontSize:"clamp(20px,3vw,28px)",fontWeight:900,color:C.text,marginBottom:6}}>{peakH!=null?`${fmtHour(peakH)} – ${fmtHour(peakH+2)}`:"—"}</div>
                    <div style={{fontSize:20,fontWeight:800,color:C.red}}>€{peakMwh!=null?retailFmt(peakMwh):"—"}/kWh</div>
                  </div>
                  {savingToday!=null&&savingToday>0.3&&(
                    <div className="sp-metric-card sp-metric-amber">
                      <div style={{fontSize:11,fontWeight:800,color:C.amber,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>Full charge (40 kWh)</div>
                      <div style={{fontSize:"clamp(20px,3vw,28px)",fontWeight:900,color:C.text,marginBottom:6}}>€{(retailKwh(cheapMwh)*40).toFixed(2)}</div>
                      <div style={{fontSize:16,fontWeight:700,color:C.amber}}>Save €{savingToday.toFixed(2)} vs now</div>
                    </div>
                  )}
                </div>

                {/* 24h bar chart */}
                <div style={{background:C.bg,borderRadius:16,padding:"20px 24px",marginBottom:24}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:12}}>24-hour price schedule</div>
                  <div style={{display:"flex",gap:2,alignItems:"flex-end",height:64}}>
                    {prices.slice(0,24).map((p,i)=>{
                      const maxP = Math.max(...prices.slice(0,24).map(x=>Math.max(x.price_eur_mwh,0)));
                      const barH = maxP>0?Math.max((p.price_eur_mwh/maxP)*100,4):4;
                      const col  = priceColor(p.price_eur_mwh);
                      const pHour = new Date(p.timestamp_utc||p.timestamp).getHours();
                      const hi = p.is_current||pHour===cheapHour;
                      return <div key={i} title={`${String(pHour).padStart(2,"0")}:00 — €${p.price_eur_mwh?.toFixed(0)}/MWh`} style={{flex:1,height:`${barH}%`,borderRadius:"3px 3px 0 0",background:hi?col:`${col}55`,transition:"height 0.5s ease",transitionDelay:`${i*0.02}s`}}/>;
                    })}
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.light,marginTop:6}}>
                    {["00:00","06:00","12:00","18:00","23:00"].map(h=><span key={h}>{h}</span>)}
                  </div>
                </div>

                {/* Solar toggle */}
                <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 18px",background:hasSolar?"rgba(251,191,36,0.06)":C.bg,border:`1px solid ${hasSolar?"rgba(251,191,36,0.3)":C.border}`,borderRadius:14,cursor:"pointer",transition:"all 0.3s",marginBottom:24}}
                  onClick={()=>setHasSolar(s=>!s)}>
                  <div style={{width:40,height:22,borderRadius:11,background:hasSolar?"#f59e0b":"#CBD5E1",position:"relative",transition:"background 0.3s",flexShrink:0}}>
                    <div style={{position:"absolute",top:3,left:hasSolar?20:3,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left 0.3s",boxShadow:"0 1px 4px rgba(0,0,0,0.2)"}}/>
                  </div>
                  <span style={{fontSize:14,fontWeight:600,color:hasSolar?"#92400E":C.muted}}>☀️ I have solar panels — show capacity tariff impact</span>
                </div>

                {hasSolar&&cheapMwh!=null&&(
                  <div style={{background:"rgba(251,191,36,0.06)",border:"1px solid rgba(251,191,36,0.25)",borderRadius:14,padding:"16px 20px",marginBottom:24}}>
                    <div style={{fontSize:14,fontWeight:700,color:"#92400E",marginBottom:6}}>☀️ Fluvius capacity tariff</div>
                    <div style={{fontSize:13,color:"#78350F",lineHeight:1.75}}>
                      Charging at peak ({fmtHour(peakH??19)}) raises your Fluvius bill by ~€20–30/month. Charging at {fmtHour(cheapHour)} avoids this. <strong>Real saving: €{((savingToday??0)+22).toFixed(0)}/month.</strong>
                    </div>
                  </div>
                )}

                <div style={{textAlign:"center",padding:"8px 0"}}>
                  <button onClick={onGetStarted} className="sp-cta-green-solid">
                    {L.mainCta||"Start saving on every charge →"}
                  </button>
                  <div style={{fontSize:12,color:C.light,marginTop:10}}>Free · No account needed · 30 sec to set alerts</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{background:C.card,borderRadius:20,border:`1px solid ${C.border}`,padding:"80px 24px",textAlign:"center",color:C.light,marginBottom:72}}>Loading live prices…</div>
          )}
        </div>

        {/* ── SMART TOOLS ─────────────────────────────────────────── */}
        <div style={{background:"linear-gradient(180deg,#F0FDF4,#F7FEF9)",padding:"80px 32px"}}>
          <div style={{maxWidth:1200,margin:"0 auto"}}>
            <div className="sp-animate" style={{textAlign:"center",marginBottom:56}}>
              <div style={{fontSize:11,fontWeight:800,color:C.primary,textTransform:"uppercase",letterSpacing:3,marginBottom:14}}>Smart tools · Smart services</div>
              <h2 style={{fontSize:"clamp(28px,4vw,46px)",fontWeight:900,color:C.text,letterSpacing:"-1px",marginBottom:12}}>Everything you need to pay less</h2>
              <p style={{fontSize:16,color:C.muted,maxWidth:500,margin:"0 auto",lineHeight:1.8}}>Four tools, one platform, zero cost. SmartPrice does the monitoring — you just plug in at the right time.</p>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:24}}>
              {[
                {icon:"🔋",title:"Smart Planner",   badge:"Live",    badgeCol:C.primary,accent:C.primary, delay:0,
                  desc:"Battery %, charger speed, deadline — we calculate the cheapest window instantly. Real cost, not estimates.",
                  cta:"Try Smart Planner →",onClick:()=>document.getElementById("planner")?.scrollIntoView({behavior:"smooth"})},
                {icon:"🔔",title:"Smart Alerts",    badge:"Free",    badgeCol:"#0EA5E9",accent:"#0EA5E9",  delay:0.1,
                  desc:"Every day at 13:00 CET, we confirm tomorrow's cheapest window and send it to your inbox.",
                  cta:"Set up alerts →",onClick:onGetStarted},
                {icon:"📊",title:"Smart Compare",   badge:"7 plans", badgeCol:C.amber,  accent:C.amber,   delay:0.2,
                  desc:"Compare all 7 Belgian electricity suppliers side by side. See your exact annual cost in 30 seconds.",
                  cta:"Compare suppliers →",onClick:()=>onOpenCalculator?.("electricity")},
                {icon:"🏠",title:"Smart Connect",   badge:"HACS",    badgeCol:C.purple, accent:C.purple,  delay:0.3,
                  desc:"Official Home Assistant integration. 6 sensors, EPEX + gas. Automate your EV charger by price.",
                  cta:"View integration →",onClick:()=>window.location.href="/api-docs"},
              ].map((p,i)=>(
                <div key={p.title} className="sp-animate sp-card-tool" style={{transitionDelay:`${p.delay}s`}} onClick={p.onClick}>
                  <div style={{width:52,height:52,borderRadius:16,background:`${p.accent}12`,border:`1px solid ${p.accent}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,marginBottom:20}}>{p.icon}</div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                    <div style={{fontSize:18,fontWeight:800,color:C.text}}>{p.title}</div>
                    <span style={{fontSize:10,fontWeight:700,color:p.badgeCol,background:`${p.badgeCol}15`,border:`1px solid ${p.badgeCol}25`,borderRadius:20,padding:"2px 10px"}}>{p.badge}</span>
                  </div>
                  <div style={{fontSize:14,color:C.muted,lineHeight:1.75,marginBottom:20,flex:1}}>{p.desc}</div>
                  <div style={{fontSize:13,fontWeight:700,color:p.accent}}>{p.cta}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── EV PLANNER ──────────────────────────────────────────── */}
        <div id="planner" style={{maxWidth:1200,margin:"0 auto",padding:"80px 32px"}}>
          <div style={{background:C.card,borderRadius:28,border:`1px solid ${C.border}`,boxShadow:"0 8px 48px rgba(0,0,0,0.06)",overflow:"hidden"}}>
            <div style={{background:"linear-gradient(135deg,#15803D,#16A34A,#22C55E)",padding:"36px 40px"}}>
              <div style={{fontSize:11,fontWeight:800,color:"rgba(255,255,255,0.6)",textTransform:"uppercase",letterSpacing:3,marginBottom:10}}>Smart Planner</div>
              <h2 style={{fontSize:"clamp(24px,3vw,38px)",fontWeight:900,color:"#fff",marginBottom:8,letterSpacing:"-0.5px"}}>Find your cheapest charging window</h2>
              <p style={{fontSize:15,color:"rgba(255,255,255,0.75)",lineHeight:1.7}}>Set your battery and deadline — optimal window calculated in real time.</p>
            </div>

            <div style={{padding:"40px"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:28,marginBottom:32}}>
                <div>
                  <label style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,display:"block",marginBottom:10}}>
                    Battery now: <strong style={{color:C.primary}}>{battPct}%</strong>
                  </label>
                  <input type="range" min={5} max={90} step={5} value={battPct} onChange={e=>setBattPct(+e.target.value)} style={{width:"100%",accentColor:C.primary,cursor:"pointer",height:6}}/>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.light,marginTop:4}}><span>5%</span><span>90%</span></div>
                </div>
                <div>
                  <label style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,display:"block",marginBottom:10}}>Full by:</label>
                  <select value={needByHour} onChange={e=>setNeedByHour(+e.target.value)}
                    style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:"11px 14px",color:C.text,fontSize:14,fontWeight:700,cursor:"pointer",outline:"none"}}>
                    {Array.from({length:23},(_,i)=>(new Date().getHours()+1+i)%24).map(h=>(
                      <option key={h} value={h}>{String(h).padStart(2,"0")}:00{h>=5&&h<=9?" (morning)":h>=17&&h<=20?" (evening)":""}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,display:"block",marginBottom:10}}>Charger speed:</label>
                  <div style={{display:"flex",gap:8}}>
                    {[3.7,7.4,11,22].map(kw=>(
                      <button key={kw} onClick={()=>setChargerKw(kw)} style={{flex:1,padding:"11px 4px",borderRadius:12,fontSize:12,fontWeight:700,border:`1.5px solid ${chargerKw===kw?C.primary:C.border}`,background:chargerKw===kw?C.highlight:C.bg,color:chargerKw===kw?C.primary:C.muted,cursor:"pointer",transition:"all 0.2s"}}>
                        {kw}kW
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {planResult ? (
                <div style={{background:"linear-gradient(135deg,rgba(22,163,74,0.05),rgba(34,197,94,0.03))",border:`1px solid rgba(22,163,74,0.2)`,borderRadius:20,padding:"28px 32px"}}>
                  <div style={{display:"flex",gap:32,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
                    <div>
                      <div style={{fontSize:11,color:C.primary,textTransform:"uppercase",letterSpacing:"2px",fontWeight:700,marginBottom:8}}>⚡ Optimal window</div>
                      <div style={{fontSize:"clamp(36px,5vw,56px)",fontWeight:900,color:C.primary,fontFamily:"monospace",letterSpacing:"-2px",lineHeight:1,marginBottom:6}}>
                        {fmtHour(planResult.start)} – {fmtHour(planResult.end)}
                      </div>
                      <div style={{fontSize:13,color:C.muted}}>{planResult.hours}h charging · {planResult.needed.toFixed(0)} kWh</div>
                    </div>
                    <div style={{display:"flex",gap:28,flexWrap:"wrap"}}>
                      <div style={{textAlign:"center"}}>
                        <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Cost</div>
                        <div style={{fontSize:"clamp(28px,4vw,40px)",fontWeight:900,color:C.primary,fontFamily:"monospace"}}>€{planResult.cost.toFixed(2)}</div>
                      </div>
                      {planResult.saving>0.1&&<>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>vs charging now</div>
                          <div style={{fontSize:"clamp(28px,4vw,40px)",fontWeight:900,color:C.amber,fontFamily:"monospace"}}>-€{planResult.saving.toFixed(2)}</div>
                        </div>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>per year ×250</div>
                          <div style={{fontSize:"clamp(28px,4vw,40px)",fontWeight:900,color:C.amber,fontFamily:"monospace"}}>-€{(planResult.saving*250).toFixed(0)}</div>
                        </div>
                      </>}
                    </div>
                  </div>
                  <button onClick={onGetStarted} className="sp-cta-green-solid">
                    Get daily alerts for this window →
                  </button>
                  <span style={{fontSize:11,color:C.light,marginLeft:16}}>Free · No credit card</span>
                </div>
              ) : (
                <div style={{background:C.bg,borderRadius:14,padding:"20px",textAlign:"center",fontSize:13,color:C.muted}}>
                  {prices.length?"Adjust inputs above to calculate":"Loading prices…"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── SUPPLIERS + EMAIL/GAS GRID ───────────────────────────── */}
        <div style={{background:"linear-gradient(180deg,#F7FEF9,#F0FDF4)",padding:"0 32px 80px"}}>
          <div style={{maxWidth:1200,margin:"0 auto"}}>

            {/* Suppliers */}
            <div className="sp-animate sp-card-enterprise" style={{borderRadius:24,padding:"32px 40px",marginBottom:32,textAlign:"center"}}>
              <div style={{fontSize:13,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:24}}>7 Belgian suppliers tracked in real time</div>
              <div style={{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap",marginBottom:20}}>
                {SUPPLIERS.map(s=>(
                  <div key={s.name} style={{display:"flex",alignItems:"center",gap:8,transition:"transform 0.2s"}} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>
                    <div style={{width:38,height:38,borderRadius:10,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:s.color,flexShrink:0}}>{s.abbr}</div>
                    <span style={{fontSize:13,fontWeight:700,color:C.text}}>{s.name}</span>
                  </div>
                ))}
              </div>
              <button onClick={()=>onOpenCalculator?.("electricity")} className="sp-cta-outline-green">
                Compare all 7 suppliers →
              </button>
            </div>

            {/* Gas + Email row */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:24,marginBottom:32}}>
              {/* Gas */}
              <div className="sp-animate sp-card-enterprise" style={{borderRadius:24,padding:"32px"}}>
                <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16}}>
                  <div style={{width:52,height:52,borderRadius:16,background:"rgba(249,115,22,0.1)",border:"1px solid rgba(249,115,22,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>🔥</div>
                  <div>
                    <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>TTF Natural Gas · Today</div>
                    <div style={{fontSize:"clamp(28px,4vw,36px)",fontWeight:900,color:"#F97316",fontFamily:"monospace",letterSpacing:"-1.5px",lineHeight:1}}>{gasCurrent?`€${gasCurrent.price?.toFixed(1)}/MWh`:"—"}</div>
                    {gasCurrent?.ttf_cEkWh!=null&&<div style={{fontSize:12,color:C.muted,marginTop:2}}>{gasCurrent.ttf_cEkWh.toFixed(3)} c€/kWh</div>}
                  </div>
                </div>
                <p style={{fontSize:13,color:C.muted,lineHeight:1.75,marginBottom:20}}><strong style={{color:"#F97316"}}>~40%</strong> of your gas bill directly tracks this market price.</p>
                <a href="/calculator/gas" className="sp-cta-outline-amber">Compare gas plans →</a>
              </div>

              {/* Email */}
              <div className="sp-animate sp-card-enterprise" style={{borderRadius:24,padding:"32px",background:leadState==="done"?"rgba(34,197,94,0.04)":C.card}}>
                {leadState==="done"?(
                  <div style={{display:"flex",gap:16,alignItems:"center",height:"100%"}}>
                    <span style={{fontSize:40}}>✅</span>
                    <div><div style={{fontSize:18,fontWeight:800,color:C.primary,marginBottom:6}}>You're on the list!</div><div style={{fontSize:13,color:C.muted,lineHeight:1.65}}>We'll alert you every day at 13:00 when the cheapest window is confirmed.</div></div>
                  </div>
                ):(
                  <>
                    <div style={{fontSize:11,color:C.primary,fontWeight:800,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>🔔 Daily Smart Alerts</div>
                    <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:6}}>Alert me when the cheapest window opens</div>
                    <div style={{fontSize:13,color:C.muted,marginBottom:20}}>Every day at 13:00 · No spam · Unsubscribe anytime</div>
                    <form onSubmit={submitLead} style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                      <input type="email" required placeholder="your@email.com" value={leadEmail} onChange={e=>setLeadEmail(e.target.value)}
                        style={{flex:1,minWidth:160,padding:"12px 16px",borderRadius:24,fontSize:14,background:C.bg,border:`1.5px solid ${C.border}`,color:C.text,outline:"none",fontFamily:"inherit",transition:"border 0.2s"}}
                        onFocus={e=>e.target.style.border=`1.5px solid ${C.primary}`}
                        onBlur={e=>e.target.style.border=`1.5px solid ${C.border}`}/>
                      <button type="submit" disabled={leadState==="loading"} className="sp-cta-green-solid" style={{opacity:leadState==="loading"?0.7:1,fontSize:13,padding:"12px 22px"}}>
                        {leadState==="loading"?"…":"Notify me →"}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>

            {/* Fluvius teaser */}
            <div className="sp-animate sp-card-enterprise" style={{borderRadius:24,padding:"36px 40px",border:"1px solid rgba(251,191,36,0.25)",display:"flex",gap:40,flexWrap:"wrap",alignItems:"flex-start"}}>
              <div style={{flex:"1 1 280px"}}>
                <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.3)",borderRadius:20,padding:"4px 14px",fontSize:11,fontWeight:800,color:"#92400E",marginBottom:16,textTransform:"uppercase",letterSpacing:"1px"}}>⚡ Coming soon</div>
                <h3 style={{fontSize:"clamp(18px,2.5vw,26px)",fontWeight:900,color:C.text,marginBottom:10,letterSpacing:"-0.5px"}}>Fluvius capacity tariff integration</h3>
                <p style={{fontSize:14,color:C.muted,lineHeight:1.8,marginBottom:20}}>Since 2023, Belgian households with a smart meter pay a capacity tariff. Charging at the wrong hour can add €20–30 to your monthly grid bill.</p>
                <form onSubmit={submitFluvius} style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  {fluviusState==="done"?(
                    <div style={{fontSize:14,fontWeight:700,color:"#92400E"}}>✅ You're on the waitlist</div>
                  ):(
                    <>
                      <input type="email" required placeholder="your@email.com" value={fluviusEmail} onChange={e=>setFluviusEmail(e.target.value)}
                        style={{flex:1,minWidth:160,padding:"10px 16px",borderRadius:24,fontSize:13,background:C.bg,border:"1.5px solid rgba(251,191,36,0.35)",color:C.text,outline:"none",fontFamily:"inherit"}}
                        onFocus={e=>e.target.style.border="1.5px solid rgba(251,191,36,0.7)"}
                        onBlur={e=>e.target.style.border="1.5px solid rgba(251,191,36,0.35)"}/>
                      <button type="submit" disabled={fluviusState==="loading"} style={{padding:"10px 20px",borderRadius:24,fontSize:13,fontWeight:700,background:"linear-gradient(135deg,#f59e0b,#d97706)",border:"none",color:"#1c1917",cursor:"pointer",opacity:fluviusState==="loading"?0.7:1}}>
                        {fluviusState==="loading"?"…":"Notify me →"}
                      </button>
                    </>
                  )}
                </form>
              </div>
              <div style={{flex:"0 0 auto",background:C.bg,borderRadius:16,padding:"20px 24px",border:`1px solid ${C.border}`,minWidth:190}}>
                <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:14}}>What we'll show</div>
                {["Real cost incl. capacity tariff","Best charge time for solar owners","Monthly peak demand tracker","Fluvius bill simulator"].map(f=>(
                  <div key={f} style={{display:"flex",gap:8,fontSize:13,color:C.muted,marginBottom:10}}>
                    <span style={{color:C.primary,flexShrink:0}}>→</span>{f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── DEVELOPER / HOME ASSISTANT ──────────────────────────── */}
        <div style={{maxWidth:1200,margin:"0 auto",padding:"0 32px 80px"}}>
          <div className="sp-animate sp-card-enterprise" style={{borderRadius:24,overflow:"hidden"}}>
            {/* Dark code panel */}
            <div style={{background:"linear-gradient(135deg,#0F172A,#1E293B)",padding:"40px",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:40,alignItems:"center"}}>
              <div>
                <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(124,58,237,0.18)",border:"1px solid rgba(124,58,237,0.4)",borderRadius:20,padding:"4px 14px",fontSize:11,fontWeight:800,color:"#A78BFA",marginBottom:18,textTransform:"uppercase",letterSpacing:"1px"}}>🔌 Free Public API</div>
                <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:8}}>Built for developers &amp; Home Assistant</div>
                <h3 style={{fontSize:"clamp(20px,3vw,30px)",fontWeight:900,color:"#fff",marginBottom:10,letterSpacing:"-0.5px",lineHeight:1.2}}>🚀 Open Data for the<br/>Belgian Energy Community</h3>
                <p style={{fontSize:14,color:"rgba(255,255,255,0.55)",lineHeight:1.8,marginBottom:24}}>Zero authentication. Just hit the endpoint. Get live EPEX Spot prices, gas TTF, and hourly schedules as clean JSON — perfect for dashboards, automations, and HACS.</p>
                <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                  <a href="/api-docs" style={{display:"inline-block",padding:"10px 22px",borderRadius:24,fontSize:13,fontWeight:700,background:"rgba(124,58,237,0.15)",border:"1px solid rgba(124,58,237,0.35)",color:"#A78BFA",textDecoration:"none",transition:"background 0.2s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(124,58,237,0.28)"}
                    onMouseLeave={e=>e.currentTarget.style.background="rgba(124,58,237,0.15)"}>
                    View HA integration →
                  </a>
                  <a href="/api-docs" style={{display:"inline-block",padding:"10px 22px",borderRadius:24,fontSize:13,fontWeight:700,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.7)",textDecoration:"none",transition:"background 0.2s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.12)"}
                    onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"}>
                    API docs →
                  </a>
                </div>
              </div>
              {/* Code block */}
              <div style={{background:"rgba(0,0,0,0.35)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:"22px 24px",fontFamily:"'Fira Code','Cascadia Code',monospace",fontSize:12}}>
                <div style={{display:"flex",gap:6,marginBottom:14}}>
                  {["#EF4444","#F59E0B","#22C55E"].map(c=><div key={c} style={{width:10,height:10,borderRadius:"50%",background:c}}/>)}
                </div>
                <div style={{color:"rgba(255,255,255,0.35)",marginBottom:8,fontSize:11,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                  <span>$ curl request</span>
                  <button onClick={()=>{navigator.clipboard?.writeText("curl https://smartprice.be/api/prices/today");setCopiedCmd(true);setTimeout(()=>setCopiedCmd(false),2000);}}
                    style={{background:copiedCmd?"rgba(74,222,128,0.15)":"rgba(255,255,255,0.08)",border:`1px solid ${copiedCmd?"rgba(74,222,128,0.4)":"rgba(255,255,255,0.15)"}`,borderRadius:8,padding:"3px 10px",color:copiedCmd?"#4ADE80":"rgba(255,255,255,0.45)",fontSize:10,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit",flexShrink:0}}>
                    {copiedCmd?"✓ Copied":"Copy"}
                  </button>
                </div>
                <div style={{color:"#4ADE80",marginBottom:16,wordBreak:"break-all",lineHeight:1.7}}>
                  curl https://smartprice.be/api/prices/today
                </div>
                <div style={{color:"rgba(255,255,255,0.25)",marginBottom:6,fontSize:11}}>// response</div>
                <pre style={{color:"rgba(255,255,255,0.65)",margin:0,lineHeight:1.8,fontSize:11,whiteSpace:"pre-wrap",wordBreak:"break-word",overflowX:"auto"}}>{`{
  "data": [
    { "hour": 14,
      "price_eur_mwh": 42.3,
      "is_current": true },
    ...
  ]
}`}</pre>
              </div>
            </div>
            {/* Feature strip */}
            <div style={{background:"rgba(15,23,42,0.96)",borderTop:"1px solid rgba(255,255,255,0.06)",padding:"16px 40px",display:"flex",gap:28,flexWrap:"wrap"}}>
              {["No API key","EPEX Spot Belgium","Gas TTF","15-min updates","HACS integration","Open source"].map(f=>(
                <div key={f} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"rgba(255,255,255,0.4)",fontWeight:600}}>
                  <span style={{color:"#4ADE80",fontWeight:800}}>✓</span>{f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── FAQ ─────────────────────────────────────────────────── */}
        <div style={{maxWidth:800,margin:"0 auto",padding:"0 32px 80px"}}>
          <div className="sp-animate" style={{textAlign:"center",marginBottom:48}}>
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

      {/* ── FINAL CTA ─────────────────────────────────────────────── */}
      <div className="sp-hero" style={{padding:"80px 32px",textAlign:"center",minHeight:"auto"}}>
        <div className="sp-blob sp-blob-1" style={{opacity:0.3}} />
        <div className="sp-animate" style={{position:"relative",zIndex:2}}>
          <div style={{fontSize:40,marginBottom:16}}>⚡</div>
          <h3 style={{fontSize:"clamp(26px,4vw,48px)",fontWeight:900,color:"#fff",marginBottom:12,letterSpacing:"-1px"}}>
            Join {siteStats?.registered_users??"100"}+ Belgians who charge smarter
          </h3>
          <p style={{fontSize:16,color:"rgba(255,255,255,0.75)",marginBottom:36,maxWidth:420,margin:"0 auto 36px",lineHeight:1.7}}>
            Free forever. No credit card. Set up in 30 seconds.
          </p>
          <div style={{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={onGetStarted} className="sp-cta-primary">
              Get started free →
            </button>
            <a href="/business" style={{padding:"14px 28px",borderRadius:30,fontSize:15,fontWeight:700,background:"rgba(255,255,255,0.12)",color:"#fff",textDecoration:"none",border:"1px solid rgba(255,255,255,0.25)"}}>
              SmartPrice for Business →
            </a>
          </div>
        </div>
      </div>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <div style={{borderTop:`1px solid ${C.border}`,background:C.card,padding:"32px",textAlign:"center",fontSize:12,color:C.light}}>
        <div style={{marginBottom:12,display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
          {["Business::/business","Fleet Audit::/fleet-audit","API & HA::/api-docs","EV Charging::/ev-charging-belgium"].map(l=>{
            const[label,href]=l.split("::");
            return <a key={label} href={href} style={{color:C.muted,textDecoration:"none",fontWeight:600,fontSize:13}}>{label}</a>;
          })}
          <a href="mailto:info@smartprice.be" style={{color:C.muted,textDecoration:"none",fontWeight:600,fontSize:13}}>info@smartprice.be</a>
        </div>
        <div style={{marginBottom:12}}>Data: Energy-Charts.info · Elia Open Data (CC BY 4.0) · Updated every 15 min
          <span onClick={()=>window.dispatchEvent(new CustomEvent("showPrivacy"))} style={{marginLeft:10,cursor:"pointer",textDecoration:"underline"}}>Privacy Policy</span>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          {[{label:"WhatsApp",icon:"💬",color:"#25D366",href:`https://wa.me/?text=${encodeURIComponent("⚡ SmartPrice.be — live EPEX prices + cheapest EV charging window for Belgium. Free. https://smartprice.be")}`},{label:"LinkedIn",icon:"in",color:"#0A66C2",href:`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://smartprice.be")}`}].map(s=>(
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" style={{width:32,height:32,borderRadius:8,background:`${s.color}12`,border:`1px solid ${s.color}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:s.color,textDecoration:"none"}}>{s.icon}</a>
          ))}
        </div>
      </div>

      {/* ── GLOBAL STYLES + ANIMATIONS ────────────────────────────── */}
      <style>{`
        * { box-sizing: border-box; }

        /* Animated hero gradient */
        .sp-hero {
          background: linear-gradient(-45deg, #15803D, #16A34A, #22C55E, #166534, #4ADE80, #15803D);
          background-size: 400% 400%;
          animation: sp-gradient 12s ease infinite;
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
          background: rgba(255,255,255,0.06);
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
          background: #fff;
          border: 1px solid rgba(0,0,0,0.08);
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
          transition: box-shadow 0.3s ease, transform 0.3s ease;
        }
        .sp-card-enterprise:hover {
          box-shadow: 0 16px 48px rgba(22,163,74,0.12);
        }

        /* Tool cards (clickable) */
        .sp-card-tool {
          background: #fff;
          border: 1px solid rgba(0,0,0,0.08);
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
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
      `}</style>
    </div>
  );
}
