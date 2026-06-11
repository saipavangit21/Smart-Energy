/**
 * LandingPage.jsx — SmartPrice.be
 * v8: green energy palette — forest green hero · emerald accents · white cards on #F0F7F2
 */
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "../context/LanguageContext";
import LangSwitcher  from "../components/LangSwitcher";
import ThemeSwitcher from "../components/ThemeSwitcher";

// Green energy palette
const C = {
  bg:        "#F0F7F2",
  card:      "#FFFFFF",
  border:    "rgba(0,0,0,0.08)",
  shadow:    "0 2px 16px rgba(0,0,0,0.07)",
  blue:      "#166534",   // forest green — replaces blue as primary brand colour
  teal:      "#059669",   // emerald — replaces teal as secondary accent
  text:      "#1E293B",
  muted:     "#64748B",
  light:     "#94A3B8",
  green:     "#16A34A",   // bright green for positive indicators
  highlight: "#F0FDF4",   // very light green card background
  blueBorder:"rgba(22,101,52,0.18)",
  amber:     "#D97706",
  purple:    "#7C3AED",
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
  if (mwh == null) return null;
  if (mwh < 0)   return "FREE";
  if (mwh < 60)  return "VERY LOW";
  if (mwh < 110) return "LOW";
  if (mwh < 160) return "NORMAL";
  if (mwh < 220) return "HIGH";
  return "VERY HIGH";
}
function fmtHour(h) { return `${String(h).padStart(2,"0")}:00`; }

export default function LandingPage({ onGetStarted, onOpenCalculator }) {
  const { tSection } = useLanguage();
  const L = tSection("landing");

  useEffect(() => {
    document.title = "SmartPrice.be — Live Belgian Electricity & Gas Prices | Free";
    const desc = document.querySelector("meta[name='description']");
    if (desc) desc.setAttribute("content", "Track live EPEX Spot electricity prices in Belgium, compare all suppliers, find the cheapest hours to charge your EV, and set price alerts. 100% free.");
    const canonical = document.getElementById('canonical-tag');
    if (canonical) canonical.setAttribute("href", "https://smartprice.be/");
  }, []);

  const [prices,       setPrices]       = useState([]);
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
  const [fetchedAt,    setFetchedAt]    = useState(null);
  const [siteStats,    setSiteStats]    = useState(null);
  const [gasCurrent,   setGasCurrent]   = useState(null);
  const toolsRef = useRef(null);

  useEffect(() => {
    fetch("/api/prices/today").then(r => r.json())
      .then(d => { if (d.data?.length) { setPrices(d.data); setFetchedAt(d.fetched_at || new Date().toISOString()); } }).catch(() => {});
  }, []);
  useEffect(() => {
    fetch("/api/gas/current").then(r => r.json())
      .then(d => { if (d.success && d.ttf) setGasCurrent({ price: d.ttf.price, ttf_cEkWh: d.ttf_cEkWh }); }).catch(() => {});
  }, []);
  useEffect(() => {
    fetch("/api/stats").then(r => r.json())
      .then(d => { if (d.success) setSiteStats(d); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!prices.length) return;
    const needed = ((100 - battPct) / 100) * 60;
    const hoursNeeded = Math.max(1, Math.ceil(needed / chargerKw));
    const nowH = new Date().getHours();
    const upcoming = prices.filter(p => {
      const h = new Date(p.timestamp_utc || p.timestamp).getHours();
      return needByHour > nowH ? (h >= nowH && h < needByHour) : (h >= nowH || h < needByHour);
    }).sort((a,b) => new Date(a.timestamp_utc||a.timestamp) - new Date(b.timestamp_utc||b.timestamp));
    if (upcoming.length < hoursNeeded) { setPlanResult(null); return; }
    let best = null;
    for (let i = 0; i <= upcoming.length - hoursNeeded; i++) {
      const win = upcoming.slice(i, i + hoursNeeded);
      const avg = win.reduce((s,p) => s + p.price_eur_mwh, 0) / hoursNeeded;
      if (!best || avg < best.avg) best = {
        avg, hours: hoursNeeded, needed,
        start: new Date(win[0].timestamp_utc||win[0].timestamp).getHours(),
        end:   new Date(win[hoursNeeded-1].timestamp_utc||win[hoursNeeded-1].timestamp).getHours() + 1,
        cost:  (avg/1000 + 0.173) * needed,
      };
    }
    const nowSlice = prices.filter(p => { const h = new Date(p.timestamp_utc||p.timestamp).getHours(); return h >= nowH && h < nowH + hoursNeeded; });
    const nowAvg = nowSlice.length ? nowSlice.reduce((s,p) => s+p.price_eur_mwh,0)/nowSlice.length : (prices.find(p=>p.is_current)?.price_eur_mwh ?? 120);
    if (best) best.saving = Math.max(0, (nowAvg/1000+0.173)*needed - best.cost);
    setPlanResult(best);
  }, [prices, battPct, needByHour, chargerKw]);

  const nowH       = new Date().getHours();
  const nowM       = new Date().getMinutes();
  const current    = prices.find(p => p.is_current) || prices[prices.length-1];
  const currentMwh = current?.price_eur_mwh ?? null;
  const currentCol = priceColor(currentMwh);
  const currentLbl = priceLabel(currentMwh);
  const upcoming2  = prices.filter(p => p.hour != null ? (p.hour >= (current?.hour ?? nowH) && p.day==="today") || p.day==="tomorrow" : false);
  const sorted     = [...upcoming2].sort((a,b) => a.price_eur_mwh - b.price_eur_mwh);
  const futureOnly = sorted.filter(p => !p.is_current);
  const cheapEntry = futureOnly[0] || sorted[0];
  const cheapHour  = cheapEntry?.hour ?? null;
  const cheapMwh   = cheapEntry?.price_eur_mwh ?? null;
  const cheapIsNow = cheapEntry?.is_current ?? false;
  let   cheapWindowEnd = cheapHour != null ? cheapHour + 1 : null;
  if (cheapHour != null && futureOnly[1] && Math.abs(futureOnly[1].hour - cheapHour) <= 1)
    cheapWindowEnd = Math.max(cheapHour, futureOnly[1].hour) + 1;
  const peakEntry  = [...upcoming2].sort((a,b) => b.price_eur_mwh - a.price_eur_mwh)[0];
  const peakH      = peakEntry?.hour ?? null;
  const peakMwh    = peakEntry?.price_eur_mwh ?? null;
  const savingToday = (currentMwh!=null && cheapMwh!=null) ? Math.max(0,(retailKwh(currentMwh)-retailKwh(cheapMwh))*40) : null;
  const minsUntilCheap = cheapHour!=null ? (cheapHour-nowH)*60-nowM : null;
  const cheapNow   = minsUntilCheap!=null && minsUntilCheap<=0;
  const cheapSoon  = minsUntilCheap!=null && minsUntilCheap>0 && minsUntilCheap<=90;
  const updatedMinsAgo = fetchedAt ? Math.max(0,Math.floor((Date.now()-new Date(fetchedAt).getTime())/60000)) : null;
  const updatedStr = updatedMinsAgo===null ? null : updatedMinsAgo===0 ? "just now" : `${updatedMinsAgo} min ago`;

  async function submitLead(e) {
    e.preventDefault();
    if (!leadEmail || leadState !== "idle") return;
    setLeadState("loading");
    try { const r = await fetch("/api/leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:leadEmail,source:"landing"})}); setLeadState(r.ok?"done":"error"); } catch { setLeadState("error"); }
  }
  async function submitFluvius(e) {
    e.preventDefault();
    if (!fluviusEmail || fluviusState !== "idle") return;
    setFluviusState("loading");
    try { const r = await fetch("/api/leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:fluviusEmail,source:"fluvius_waitlist"})}); setFluviusState(r.ok?"done":"error"); } catch { setFluviusState("error"); }
  }

  const SUPPLIERS = [
    {name:"Engie",         abbr:"EN", color:"#fff",    bg:"#0066A1"},
    {name:"Luminus",       abbr:"LU", color:"#1a1a1a", bg:"#FFB800"},
    {name:"Bolt",          abbr:"⚡", color:"#fff",    bg:"#1A1A2E"},
    {name:"TotalEnergies", abbr:"TE", color:"#fff",    bg:"#EF3340"},
    {name:"Eneco",         abbr:"EC", color:"#fff",    bg:"#00A651"},
    {name:"Mega",          abbr:"MG", color:"#fff",    bg:"#7C3AED"},
    {name:"Octa+",         abbr:"O+", color:"#fff",    bg:"#F97316"},
  ];

  const faqs = [
    {q: L.faq1Q, a: L.faq1A},
    {q: L.faq2Q, a: L.faq2A},
    {q: L.faq3Q, a: L.faq3A},
    {q: L.faq4Q, a: L.faq4A},
  ];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'DM Sans',system-ui,sans-serif", color:C.text }}>

      {/* ── NAV — identical structure to BusinessPage ─────────────────── */}
      <nav style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"0 24px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100, boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22}}>🇧🇪</span>
          <span style={{fontSize:17,fontWeight:900,letterSpacing:"-0.5px",color:C.text}}>SmartPrice</span>
          <span style={{fontSize:9,color:"#10B981",background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.25)",borderRadius:20,padding:"2px 8px",fontWeight:700}}>● LIVE</span>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <ThemeSwitcher />
          <LangSwitcher style={{marginRight:4}} />
          <a href="/ev-charging-belgium" style={{padding:"7px 14px",borderRadius:20,fontSize:12,fontWeight:700,background:"rgba(5,150,105,0.07)",border:"1px solid rgba(5,150,105,0.2)",color:C.teal,textDecoration:"none"}}>🚗 EV</a>
          <a href="/business"            style={{padding:"7px 14px",borderRadius:20,fontSize:12,fontWeight:700,background:C.highlight,border:`1px solid ${C.blueBorder}`,color:C.blue,textDecoration:"none"}}>🏢 Business</a>
          <button onClick={onGetStarted} style={{padding:"8px 20px",borderRadius:20,fontSize:13,fontWeight:700,background:C.teal,color:"#fff",border:"none",cursor:"pointer"}}>
            Dashboard →
          </button>
        </div>
      </nav>

      {/* ── PLATFORM STRIP ────────────────────────────────────────────── */}
      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,position:"sticky",top:60,zIndex:40}}>
        <div style={{maxWidth:960,margin:"0 auto",display:"flex",overflow:"auto"}}>
          {[
            {icon:"⚡",label:"Smart Prices",  accent:C.teal,  href:null,           active:true},
            {icon:"🏢",label:"Smart Business",accent:C.blue,  href:"/business",    active:false},
            {icon:"🚗",label:"Smart Fleet",   accent:C.amber, href:"/fleet-audit", active:false},
            {icon:"🔌",label:"Smart Connect", accent:C.purple,href:"/api-docs",    active:false},
          ].map(s=>(
            <a key={s.label} href={s.href||"#"} onClick={s.href?undefined:e=>e.preventDefault()}
              style={{display:"flex",alignItems:"center",gap:6,padding:"10px 22px",fontSize:12,fontWeight:700,color:s.active?s.accent:C.muted,textDecoration:"none",borderBottom:`2px solid ${s.active?s.accent:"transparent"}`,whiteSpace:"nowrap"}}>
              {s.icon} {s.label}
            </a>
          ))}
        </div>
      </div>

      {/* ── HERO — forest green gradient ───────────────────────────────── */}
      <div style={{ background:"linear-gradient(135deg, #14532D 0%, #166534 60%, #15803D 100%)", color:"#fff", padding:"72px 24px 64px", textAlign:"center" }}>
        {/* Badge */}
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:30,padding:"6px 18px",marginBottom:24,fontSize:13,fontWeight:700}}>
          🇧🇪 Belgium · EPEX Spot · Live
        </div>

        {/* H1 */}
        <h1 style={{fontSize:"clamp(28px,5vw,52px)",fontWeight:900,lineHeight:1.1,margin:"0 auto 20px",maxWidth:700,letterSpacing:"-1.5px"}}>
          {L.headline || "Stop overpaying for every EV charge"}
        </h1>

        {/* Subtitle */}
        <p style={{fontSize:18,opacity:0.85,maxWidth:560,margin:"0 auto 28px",lineHeight:1.7}}>
          Live EPEX electricity prices for Belgium — we find the cheapest charging window, compare 7 suppliers, and alert you. <strong>Free, always.</strong>
        </p>

        {/* Live price chip — the key product proof right in the hero */}
        {currentMwh != null && (
          <div style={{display:"inline-flex",alignItems:"center",gap:12,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:16,padding:"12px 22px",marginBottom:32,flexWrap:"wrap",justifyContent:"center"}}>
            <div style={{display:"flex",alignItems:"baseline",gap:6}}>
              <span style={{fontSize:36,fontWeight:900,fontFamily:"monospace",color:currentCol,letterSpacing:"-2px"}}>{Math.round(currentMwh)}</span>
              <span style={{fontSize:14,opacity:0.7,fontWeight:600}}>€/MWh</span>
              {currentLbl && <span style={{fontSize:10,fontWeight:800,color:currentCol,background:`${currentCol}25`,border:`1px solid ${currentCol}50`,borderRadius:20,padding:"2px 8px",textTransform:"uppercase",letterSpacing:"1px"}}>{currentLbl}</span>}
            </div>
            {cheapHour != null && (
              <>
                <div style={{width:1,height:36,background:"rgba(255,255,255,0.2)"}} />
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:10,opacity:0.6,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:3}}>Best window today</div>
                  <div style={{fontSize:16,fontWeight:800}}>{cheapIsNow ? "Right now!" : `${fmtHour(cheapHour)} – ${fmtHour(cheapWindowEnd??cheapHour+1)}`}</div>
                  <div style={{fontSize:12,color:"#4ADE80",fontWeight:600}}>€{retailFmt(cheapMwh)}/kWh{savingToday!=null&&savingToday>0.3?` · save €${savingToday.toFixed(2)}`:""}</div>
                </div>
              </>
            )}
            {updatedStr && <div style={{fontSize:10,opacity:0.45,fontWeight:600}}>Updated {updatedStr}</div>}
          </div>
        )}

        {/* Urgency badge */}
        {(cheapNow||cheapSoon) && (
          <div style={{display:"inline-block",background:"rgba(16,185,129,0.2)",border:"1px solid rgba(16,185,129,0.4)",borderRadius:10,padding:"7px 18px",fontSize:13,fontWeight:700,color:"#4ADE80",marginBottom:24}}>
            {cheapNow ? "⚡ Cheapest window RIGHT NOW — plug in now" : `⚡ Cheapest window in ${minsUntilCheap<60?`${minsUntilCheap} min`:`${Math.floor(minsUntilCheap/60)}h ${minsUntilCheap%60}m`}`}
          </div>
        )}

        {/* CTAs — same yellow primary as BusinessPage */}
        <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={onGetStarted} style={{display:"inline-block",padding:"14px 32px",borderRadius:30,fontSize:15,fontWeight:800,background:"#FCD34D",color:"#14532D",border:"none",cursor:"pointer",boxShadow:"0 6px 24px rgba(0,0,0,0.2)"}}>
            Get started free →
          </button>
          <button onClick={()=>toolsRef.current?.scrollIntoView({behavior:"smooth"})} style={{display:"inline-block",padding:"14px 28px",borderRadius:30,fontSize:14,fontWeight:700,background:"rgba(255,255,255,0.12)",color:"#fff",border:"1px solid rgba(255,255,255,0.25)",cursor:"pointer"}}>
            See live prices ↓
          </button>
        </div>
      </div>

      {/* ── STATS BAR — identical structure to BusinessPage ───────────── */}
      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,padding:"20px 24px"}}>
        <div style={{maxWidth:860,margin:"0 auto",display:"flex",justifyContent:"space-around",flexWrap:"wrap",gap:24,textAlign:"center"}}>
          {[
            {n: siteStats?.registered_users ?? "100+", label:"Belgian users tracking", accent:C.blue},
            {n:"7",     label:"suppliers compared in real time", accent:C.amber},
            {n:"15 min",label:"EPEX price update interval",       accent:C.teal},
            {n:"€200+", label:"average annual saving per EV",     accent:C.green},
          ].map(s=>(
            <div key={s.label}>
              <div style={{fontSize:22,fontWeight:900,color:s.accent}}>{s.n}</div>
              <div style={{fontSize:12,color:C.muted,marginTop:3,maxWidth:140}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CONTENT ───────────────────────────────────────────────────── */}
      <div ref={toolsRef} style={{maxWidth:860,margin:"0 auto",padding:"52px 20px 80px"}}>

        {/* ── LIVE PRICE CARD ─────────────────────────────────────────── */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:11,fontWeight:800,color:C.blue,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>Live right now</div>
          <h2 style={{fontSize:28,fontWeight:900,color:C.text,marginBottom:8}}>Today's electricity prices</h2>
          <p style={{fontSize:15,color:C.muted,maxWidth:500,margin:"0 auto",lineHeight:1.8}}>Real-time EPEX Spot Belgium. See the cheapest window, compare peak vs cheap, and plan your charge.</p>
        </div>

        <div style={{background:C.card,borderRadius:20,border:`1px solid ${C.border}`,boxShadow:C.shadow,overflow:"hidden",marginBottom:48}}>
          {prices.length > 0 && cheapHour != null ? (
            <>
              {/* Card header bar */}
              <div style={{background:"linear-gradient(135deg,#14532D,#166534)",padding:"18px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                <div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>⚡ Electricity · EPEX Spot Belgium</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                    <span style={{fontSize:40,fontWeight:900,fontFamily:"monospace",color:currentCol,letterSpacing:"-2px"}}>{Math.round(currentMwh??0)}</span>
                    <span style={{fontSize:16,color:"rgba(255,255,255,0.6)",fontWeight:600}}>€/MWh</span>
                    {currentLbl && <span style={{fontSize:10,fontWeight:800,color:currentCol,background:`${currentCol}22`,border:`1px solid ${currentCol}55`,borderRadius:20,padding:"3px 10px"}}>{currentLbl}</span>}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.45)",marginBottom:4}}>Updated {updatedStr ?? "…"}</div>
                  <div style={{fontSize:13,color:"rgba(255,255,255,0.7)"}}>= <strong style={{color:currentCol}}>€{currentMwh!=null?retailFmt(currentMwh):"—"}/kWh</strong> at your meter</div>
                </div>
              </div>

              <div style={{padding:"24px"}}>
                {/* Price grid — same card pattern as BusinessPage problem/solution grid */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14,marginBottom:20}}>
                  <div style={{background:"rgba(5,150,105,0.04)",border:"1px solid rgba(5,150,105,0.18)",borderRadius:16,padding:"20px 22px"}}>
                    <div style={{fontSize:11,fontWeight:800,color:C.green,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>
                      {cheapIsNow ? "⚡ Cheapest — plug in now" : "Best window today"}
                    </div>
                    <div style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:6}}>
                      {cheapIsNow ? "Right now!" : `${fmtHour(cheapHour)} – ${fmtHour(cheapWindowEnd??cheapHour+2)}`}
                    </div>
                    <div style={{fontSize:18,fontWeight:700,color:C.green}}>€{retailFmt(cheapMwh)}/kWh</div>
                  </div>
                  <div style={{background:"rgba(220,38,38,0.03)",border:"1px solid rgba(220,38,38,0.14)",borderRadius:16,padding:"20px 22px"}}>
                    <div style={{fontSize:11,fontWeight:800,color:"#DC2626",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Most expensive today</div>
                    <div style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:6}}>
                      {peakH!=null ? `${fmtHour(peakH)} – ${fmtHour(peakH+2)}` : "—"}
                    </div>
                    <div style={{fontSize:18,fontWeight:700,color:"#DC2626"}}>€{peakMwh!=null?retailFmt(peakMwh):"—"}/kWh</div>
                  </div>
                  {savingToday!=null && savingToday>0.3 && (
                    <div style={{background:"rgba(5,150,105,0.04)",border:"1px solid rgba(5,150,105,0.18)",borderRadius:16,padding:"20px 22px"}}>
                      <div style={{fontSize:11,fontWeight:800,color:C.teal,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Full charge (40 kWh)</div>
                      <div style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:6}}>€{(retailKwh(cheapMwh)*40).toFixed(2)}</div>
                      <div style={{fontSize:14,fontWeight:700,color:C.teal}}>Save €{savingToday.toFixed(2)} vs charging now</div>
                    </div>
                  )}
                </div>

                {/* 24h bar chart */}
                <div style={{background:"#F8FAFC",borderRadius:14,padding:"16px 18px",marginBottom:20}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>Today's 24-hour price schedule</div>
                  <div style={{display:"flex",gap:2,alignItems:"flex-end",height:56}}>
                    {prices.slice(0,24).map((p,i)=>{
                      const maxP = Math.max(...prices.slice(0,24).map(x=>Math.max(x.price_eur_mwh,0)));
                      const barH = maxP>0 ? Math.max((p.price_eur_mwh/maxP)*100,4) : 4;
                      const col  = priceColor(p.price_eur_mwh);
                      const pHour = new Date(p.timestamp_utc||p.timestamp).getHours();
                      const hi = p.is_current || pHour===cheapHour;
                      return <div key={i} style={{flex:1,height:`${barH}%`,borderRadius:"2px 2px 0 0",background:hi?col:`${col}55`}} title={`${String(pHour).padStart(2,"0")}:00 — €${p.price_eur_mwh?.toFixed(0)}/MWh`}/>;
                    })}
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.light,marginTop:6}}>
                    {["00:00","06:00","12:00","18:00","23:00"].map(h=><span key={h}>{h}</span>)}
                  </div>
                </div>

                {/* Solar toggle */}
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:hasSolar?"rgba(251,191,36,0.06)":"#F8FAFC",border:`1px solid ${hasSolar?"rgba(251,191,36,0.3)":C.border}`,borderRadius:12,cursor:"pointer",transition:"all 0.2s",marginBottom:20}}
                  onClick={()=>setHasSolar(s=>!s)}>
                  <div style={{width:36,height:20,borderRadius:10,background:hasSolar?"#f59e0b":"#CBD5E1",position:"relative",transition:"background 0.2s",flexShrink:0}}>
                    <div style={{position:"absolute",top:2,left:hasSolar?18:2,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
                  </div>
                  <span style={{fontSize:13,fontWeight:600,color:hasSolar?"#92400E":C.muted}}>☀️ I have solar panels — show capacity tariff impact</span>
                </div>

                {hasSolar && cheapMwh!=null && (
                  <div style={{background:"rgba(251,191,36,0.06)",border:"1px solid rgba(251,191,36,0.25)",borderRadius:12,padding:"14px 18px",marginBottom:20}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#92400E",marginBottom:6}}>☀️ Capacity tariff (Fluvius) impact</div>
                    <div style={{fontSize:13,color:"#78350F",lineHeight:1.7}}>
                      Charging at peak ({fmtHour(peakH??19)}) raises your monthly Fluvius bill by ~€20–30. Charging at {fmtHour(cheapHour)} avoids this. <strong>Real saving: €{((savingToday??0)+22).toFixed(0)}/month.</strong>
                    </div>
                  </div>
                )}

                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:15,fontWeight:700,color:C.blue,marginBottom:16}}>
                    👉 {(L.chargeBeforeCta||"Charge before {x} to save money").replace("{x}",fmtHour(cheapWindowEnd??cheapHour+2))}
                  </div>
                  <button onClick={onGetStarted} style={{padding:"13px 36px",borderRadius:30,fontSize:15,fontWeight:800,background:"linear-gradient(135deg,#16A34A,#059669)",border:"none",color:"#fff",cursor:"pointer",boxShadow:"0 4px 20px rgba(5,150,105,0.3)"}}>
                    {L.mainCta||"Start saving on every charge →"}
                  </button>
                  <div style={{fontSize:12,color:C.light,marginTop:10}}>Free · No account needed · 30 sec to set alerts</div>
                </div>
              </div>
            </>
          ) : (
            <div style={{padding:"60px 24px",textAlign:"center",color:C.light}}>Loading live prices…</div>
          )}
        </div>

        {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:11,fontWeight:800,color:C.blue,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>How it works</div>
          <h2 style={{fontSize:28,fontWeight:900,color:C.text,marginBottom:8}}>Three steps to cheaper energy</h2>
          <p style={{fontSize:15,color:C.muted,maxWidth:480,margin:"0 auto",lineHeight:1.8}}>SmartPrice does the monitoring. You just plug in at the right time.</p>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,marginBottom:52}}>
          {[
            {n:"01",icon:"📡",accent:C.blue,  title:"We monitor 24/7",    desc:"EPEX Spot Belgium prices fetched every 15 minutes — day and night, including weekends and holidays."},
            {n:"02",icon:"🎯",accent:C.teal,  title:"We find your window",desc:"Our algorithm calculates the cheapest consecutive hours for your battery level, charger speed, and deadline."},
            {n:"03",icon:"💶",accent:C.green, title:"You save money",      desc:"Plug in at the optimal time. Belgian EV drivers save an average of €200+ per year by charging smarter."},
          ].map(s=>(
            <div key={s.n} style={{background:C.card,borderRadius:18,border:`1px solid ${C.border}`,boxShadow:C.shadow,padding:"28px 24px",position:"relative",overflow:"hidden"}}>
              <div style={{fontSize:64,fontWeight:900,color:"rgba(0,0,0,0.04)",position:"absolute",top:10,right:16,lineHeight:1,fontFamily:"monospace",userSelect:"none"}}>{s.n}</div>
              <div style={{width:48,height:48,borderRadius:14,background:`${s.accent}10`,border:`1px solid ${s.accent}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,marginBottom:16}}>{s.icon}</div>
              <div style={{fontSize:17,fontWeight:800,color:C.text,marginBottom:8}}>{s.title}</div>
              <div style={{fontSize:14,color:C.muted,lineHeight:1.75}}>{s.desc}</div>
            </div>
          ))}
        </div>

        {/* ── FEATURES — same card style as BusinessPage products ─────── */}
        <div style={{fontSize:11,fontWeight:800,color:C.blue,textTransform:"uppercase",letterSpacing:2,marginBottom:20,textAlign:"center"}}>Smart tools · Smart services</div>
        <div style={{display:"flex",flexDirection:"column",gap:16,marginBottom:52}}>
          {[
            {icon:"🔋",title:"Smart Planner",    badge:"Live now",    badgeColor:C.green,  accent:C.teal,  cta:"Try Smart Planner →",   onClick:()=>document.getElementById("planner")?.scrollIntoView({behavior:"smooth"}),
              desc:"Enter your battery %, charger speed, and when you need the car ready. We instantly find the cheapest window and calculate your exact cost."},
            {icon:"🔔",title:"Smart Alerts",     badge:"Free",        badgeColor:C.teal,   accent:C.blue,  cta:"Set up Smart Alerts →", onClick:onGetStarted,
              desc:"Every day at 13:00 CET we confirm tomorrow's cheapest window and send it to your inbox. No spam. Unsubscribe anytime."},
            {icon:"📊",title:"Smart Compare",    badge:"7 suppliers", badgeColor:C.blue,   accent:C.blue,  cta:"Open Smart Compare →",  onClick:()=>onOpenCalculator?.("electricity"),
              desc:"Compare all 7 Belgian electricity suppliers side by side — Engie, Luminus, Bolt, TotalEnergies, Eneco, Mega, and Octa+. See your real annual cost in 30 seconds."},
            {icon:"🏠",title:"Smart Connect",    badge:"HACS",        badgeColor:C.purple, accent:C.purple,cta:"Explore Smart Connect →",onClick:()=>window.location.href="/api-docs",
              desc:"Official HACS custom component. 6 sensors including price level, cheapest hour, and gas TTF. Automate your EV charger and appliances based on live EPEX prices."},
          ].map(p=>(
            <div key={p.title} style={{background:C.card,borderRadius:18,border:`1px solid ${C.border}`,boxShadow:C.shadow,padding:"24px 28px",display:"flex",alignItems:"flex-start",gap:20}}>
              <div style={{fontSize:32,flexShrink:0}}>{p.icon}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,flexWrap:"wrap"}}>
                  <div style={{fontSize:16,fontWeight:800,color:C.text}}>{p.title}</div>
                  <span style={{fontSize:11,fontWeight:700,color:p.badgeColor,background:`${p.badgeColor}18`,border:`1px solid ${p.badgeColor}30`,borderRadius:20,padding:"2px 10px"}}>{p.badge}</span>
                </div>
                <div style={{fontSize:14,color:C.muted,lineHeight:1.7,marginBottom:14}}>{p.desc}</div>
                <button onClick={p.onClick} style={{display:"inline-block",padding:"8px 20px",borderRadius:20,fontSize:13,fontWeight:700,background:`${p.accent}12`,border:`1px solid ${p.accent}28`,color:p.accent,cursor:"pointer"}}>{p.cta}</button>
              </div>
            </div>
          ))}
        </div>

        {/* ── EV PLANNER INTERACTIVE ─────────────────────────────────── */}
        <div id="planner" style={{background:C.card,borderRadius:20,border:`1px solid ${C.border}`,boxShadow:C.shadow,padding:"32px 28px",marginBottom:48}}>
          <div style={{fontSize:11,fontWeight:800,color:C.teal,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>Smart Planner</div>
          <h3 style={{fontSize:22,fontWeight:900,color:C.text,marginBottom:8}}>Find your cheapest charging window</h3>
          <p style={{fontSize:14,color:C.muted,marginBottom:24,lineHeight:1.7}}>Set your battery level and deadline — we calculate the optimal window in real time.</p>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:20,marginBottom:24}}>
            <div>
              <label style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,display:"block",marginBottom:8}}>
                Battery now: <span style={{color:C.teal}}>{battPct}%</span>
              </label>
              <input type="range" min={5} max={90} step={5} value={battPct} onChange={e=>setBattPct(+e.target.value)}
                style={{width:"100%",accentColor:C.teal,cursor:"pointer"}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.light,marginTop:3}}><span>5%</span><span>90%</span></div>
            </div>
            <div>
              <label style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,display:"block",marginBottom:8}}>Full by:</label>
              <select value={needByHour} onChange={e=>setNeedByHour(+e.target.value)}
                style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontWeight:700,cursor:"pointer",outline:"none"}}>
                {Array.from({length:23},(_,i)=>(new Date().getHours()+1+i)%24).map(h=>(
                  <option key={h} value={h}>{String(h).padStart(2,"0")}:00{h>=5&&h<=9?" (morning)":h>=17&&h<=20?" (evening)":""}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,display:"block",marginBottom:8}}>Charger speed:</label>
              <div style={{display:"flex",gap:6}}>
                {[3.7,7.4,11,22].map(kw=>(
                  <button key={kw} onClick={()=>setChargerKw(kw)} style={{flex:1,padding:"9px 4px",borderRadius:10,fontSize:11,fontWeight:700,border:`1px solid ${chargerKw===kw?"rgba(5,150,105,0.5)":C.border}`,background:chargerKw===kw?"rgba(5,150,105,0.1)":C.bg,color:chargerKw===kw?C.teal:C.muted,cursor:"pointer"}}>
                    {kw}kW
                  </button>
                ))}
              </div>
            </div>
          </div>

          {planResult ? (
            <div style={{background:"rgba(5,150,105,0.05)",border:"1px solid rgba(5,150,105,0.2)",borderRadius:16,padding:"22px 24px"}}>
              <div style={{display:"flex",gap:24,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <div>
                  <div style={{fontSize:10,color:C.green,textTransform:"uppercase",letterSpacing:"1.5px",fontWeight:700,marginBottom:6}}>⚡ Optimal window</div>
                  <div style={{fontSize:"clamp(28px,5vw,42px)",fontWeight:900,color:C.green,fontFamily:"monospace",letterSpacing:"-1.5px",lineHeight:1,marginBottom:4}}>
                    {fmtHour(planResult.start)} – {fmtHour(planResult.end)}
                  </div>
                  <div style={{fontSize:12,color:C.muted}}>{planResult.hours}h · {planResult.needed.toFixed(0)} kWh needed</div>
                </div>
                <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>Cost</div>
                    <div style={{fontSize:30,fontWeight:900,color:C.green,fontFamily:"monospace"}}>€{planResult.cost.toFixed(2)}</div>
                  </div>
                  {planResult.saving>0.1 && <>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>vs now</div>
                      <div style={{fontSize:30,fontWeight:900,color:C.amber,fontFamily:"monospace"}}>-€{planResult.saving.toFixed(2)}</div>
                    </div>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>Per year ×250</div>
                      <div style={{fontSize:30,fontWeight:900,color:C.amber,fontFamily:"monospace"}}>-€{(planResult.saving*250).toFixed(0)}</div>
                    </div>
                  </>}
                </div>
              </div>
              <button onClick={onGetStarted} style={{padding:"12px 28px",borderRadius:30,fontSize:14,fontWeight:800,background:"linear-gradient(135deg,#16A34A,#059669)",border:"none",color:"#fff",cursor:"pointer"}}>
                Get alerts for this window →
              </button>
              <span style={{fontSize:11,color:C.light,marginLeft:12}}>Free · No credit card</span>
            </div>
          ) : (
            <div style={{background:C.bg,borderRadius:12,padding:"16px",textAlign:"center",fontSize:13,color:C.muted}}>
              {prices.length ? "Adjust the inputs above to calculate your window" : "Loading prices…"}
            </div>
          )}
        </div>

        {/* ── SUPPLIERS ───────────────────────────────────────────────── */}
        <div style={{background:C.card,borderRadius:20,border:`1px solid ${C.border}`,boxShadow:C.shadow,padding:"28px 32px",marginBottom:40,textAlign:"center"}}>
          <div style={{fontSize:13,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:20}}>7 Belgian suppliers tracked in real time</div>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:16}}>
            {SUPPLIERS.map(s=>(
              <div key={s.name} style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:36,height:36,borderRadius:10,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:s.color,flexShrink:0}}>{s.abbr}</div>
                <span style={{fontSize:13,fontWeight:700,color:C.text}}>{s.name}</span>
              </div>
            ))}
          </div>
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14,marginTop:4}}>
            <button onClick={()=>onOpenCalculator?.("electricity")} style={{padding:"9px 22px",borderRadius:20,fontSize:13,fontWeight:700,background:C.highlight,border:`1px solid ${C.blueBorder}`,color:C.blue,cursor:"pointer"}}>
              Compare all 7 suppliers →
            </button>
          </div>
        </div>

        {/* ── GAS + EMAIL ─────────────────────────────────────────────── */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:20,marginBottom:48}}>
          {/* Gas */}
          <div style={{background:C.card,border:"1px solid rgba(249,115,22,0.2)",borderRadius:18,padding:"28px",boxShadow:C.shadow}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <span style={{fontSize:28}}>🔥</span>
              <div>
                <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>TTF Natural Gas · Today</div>
                <div style={{fontSize:30,fontWeight:900,color:"#F97316",fontFamily:"monospace",letterSpacing:"-1px"}}>{gasCurrent?`€${gasCurrent.price?.toFixed(1)}/MWh`:"—"}</div>
                {gasCurrent?.ttf_cEkWh!=null&&<div style={{fontSize:12,color:C.muted}}>= {gasCurrent.ttf_cEkWh.toFixed(3)} c€/kWh</div>}
              </div>
            </div>
            <p style={{fontSize:13,color:C.muted,lineHeight:1.7,marginBottom:16}}><strong style={{color:"#F97316"}}>~40%</strong> of your gas bill directly tracks this market price.</p>
            <a href="/calculator/gas" style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(249,115,22,0.08)",border:"1px solid rgba(249,115,22,0.25)",borderRadius:20,padding:"8px 18px",fontSize:13,fontWeight:700,color:"#F97316",textDecoration:"none"}}>
              Compare gas plans →
            </a>
          </div>

          {/* Email alert */}
          <div style={{background:leadState==="done"?"rgba(5,150,105,0.05)":"linear-gradient(135deg,rgba(5,150,105,0.06),rgba(22,101,52,0.03))",border:`1px solid ${leadState==="done"?"rgba(5,150,105,0.25)":"rgba(5,150,105,0.18)"}`,borderRadius:18,padding:"28px",boxShadow:C.shadow}}>
            {leadState==="done" ? (
              <div style={{display:"flex",gap:14,alignItems:"center"}}>
                <span style={{fontSize:32}}>✅</span>
                <div>
                  <div style={{fontSize:16,fontWeight:800,color:C.green,marginBottom:4}}>You're on the list!</div>
                  <div style={{fontSize:13,color:C.muted,lineHeight:1.65}}>We'll alert you every day at 13:00 when the cheapest window is confirmed.</div>
                </div>
              </div>
            ) : (
              <>
                <div style={{fontSize:11,color:C.teal,fontWeight:800,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>Daily alerts</div>
                <div style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:6}}>🔔 Alert me when the cheapest window opens</div>
                <div style={{fontSize:13,color:C.muted,marginBottom:18}}>Every day at 13:00 · No spam · Unsubscribe anytime</div>
                <form onSubmit={submitLead} style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <input type="email" required placeholder="your@email.com" value={leadEmail} onChange={e=>setLeadEmail(e.target.value)}
                    style={{flex:1,minWidth:160,padding:"10px 14px",borderRadius:20,fontSize:14,background:C.card,border:`1px solid ${C.border}`,color:C.text,outline:"none",fontFamily:"inherit"}}
                    onFocus={e=>e.target.style.border="1px solid rgba(5,150,105,0.5)"}
                    onBlur={e=>e.target.style.border=`1px solid ${C.border}`}/>
                  <button type="submit" disabled={leadState==="loading"} style={{padding:"10px 20px",borderRadius:20,fontSize:13,fontWeight:800,background:"linear-gradient(135deg,#16A34A,#059669)",border:"none",color:"#fff",cursor:"pointer",opacity:leadState==="loading"?0.7:1,whiteSpace:"nowrap"}}>
                    {leadState==="loading"?"…":"Notify me →"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        {/* ── FLUVIUS TEASER ──────────────────────────────────────────── */}
        <div style={{background:C.card,border:"1px solid rgba(251,191,36,0.22)",borderRadius:20,boxShadow:C.shadow,padding:"32px 28px",marginBottom:48,display:"flex",gap:36,flexWrap:"wrap",alignItems:"flex-start"}}>
          <div style={{flex:"1 1 260px",minWidth:220}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.3)",borderRadius:20,padding:"4px 12px",fontSize:11,fontWeight:800,color:"#92400E",marginBottom:14,textTransform:"uppercase",letterSpacing:"1px"}}>
              ⚡ Coming soon
            </div>
            <h3 style={{fontSize:20,fontWeight:900,color:C.text,marginBottom:8}}>Fluvius capacity tariff integration</h3>
            <p style={{fontSize:14,color:C.muted,lineHeight:1.75,marginBottom:18}}>
              Since 2023, Belgian households with a smart meter pay a capacity tariff. Charging at the wrong hour can add €20–30 to your monthly grid bill. We're building full integration to show the real cost of every decision.
            </p>
            <form onSubmit={submitFluvius} style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {fluviusState==="done" ? (
                <div style={{fontSize:14,fontWeight:700,color:"#92400E"}}>✅ You're on the waitlist</div>
              ) : (
                <>
                  <input type="email" required placeholder="your@email.com" value={fluviusEmail} onChange={e=>setFluviusEmail(e.target.value)}
                    style={{flex:1,minWidth:160,padding:"9px 14px",borderRadius:20,fontSize:13,background:C.bg,border:"1px solid rgba(251,191,36,0.3)",color:C.text,outline:"none",fontFamily:"inherit"}}
                    onFocus={e=>e.target.style.border="1px solid rgba(251,191,36,0.6)"}
                    onBlur={e=>e.target.style.border="1px solid rgba(251,191,36,0.3)"}/>
                  <button type="submit" disabled={fluviusState==="loading"} style={{padding:"9px 18px",borderRadius:20,fontSize:13,fontWeight:700,background:"linear-gradient(135deg,#f59e0b,#d97706)",border:"none",color:"#1c1917",cursor:"pointer",opacity:fluviusState==="loading"?0.7:1}}>
                    {fluviusState==="loading"?"…":"Notify me →"}
                  </button>
                </>
              )}
            </form>
          </div>
          <div style={{flex:"0 0 auto",minWidth:170,background:C.bg,borderRadius:14,padding:"18px 20px",border:`1px solid ${C.border}`}}>
            <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:12}}>What we'll show</div>
            {["Real cost incl. capacity tariff","Best charge time for solar owners","Monthly peak demand tracker","Fluvius bill simulator"].map(f=>(
              <div key={f} style={{display:"flex",gap:7,fontSize:13,color:C.muted,marginBottom:8}}>
                <span style={{color:"#f59e0b",flexShrink:0}}>→</span>{f}
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ─────────────────────────────────────────────────────── */}
        <div style={{fontSize:11,fontWeight:800,color:C.blue,textTransform:"uppercase",letterSpacing:2,marginBottom:20,textAlign:"center"}}>FAQ</div>
        <h2 style={{fontSize:26,fontWeight:900,color:C.text,marginBottom:28,textAlign:"center"}}>Frequently asked questions</h2>
        {faqs.filter(f=>f.q).map((f,i)=>(
          <div key={i} onClick={()=>setOpenFaq(openFaq===i?null:i)}
            style={{background:openFaq===i?"rgba(5,150,105,0.03)":C.card,border:`1px solid ${openFaq===i?"rgba(5,150,105,0.25)":C.border}`,borderRadius:14,overflow:"hidden",cursor:"pointer",marginBottom:8,transition:"all 0.2s",boxShadow:C.shadow}}>
            <div style={{padding:"17px 22px",fontSize:15,fontWeight:700,display:"flex",justifyContent:"space-between",alignItems:"center",color:openFaq===i?C.teal:C.text}}>
              {f.q}
              <span style={{color:C.teal,fontSize:22,fontWeight:300,flexShrink:0,marginLeft:16,transform:openFaq===i?"rotate(45deg)":"none",transition:"transform 0.2s",display:"inline-block"}}>+</span>
            </div>
            {openFaq===i&&(
              <div style={{padding:"0 22px 18px",fontSize:14,color:C.muted,lineHeight:1.8,borderTop:`1px solid ${C.border}`}}>
                <div style={{paddingTop:13}}>{f.a}</div>
              </div>
            )}
          </div>
        ))}

      </div>

      {/* ── FINAL CTA — same blue gradient as BusinessPage contact ─────── */}
      <div style={{background:"linear-gradient(135deg, #14532D, #166534)",padding:"52px 24px",textAlign:"center",color:"#fff"}}>
        <div style={{fontSize:24,marginBottom:12}}>⚡</div>
        <h3 style={{fontSize:26,fontWeight:900,marginBottom:8,letterSpacing:"-0.5px"}}>
          Join {siteStats?.registered_users ?? "100"}+ Belgians who charge smarter
        </h3>
        <p style={{fontSize:15,opacity:0.8,marginBottom:28,maxWidth:440,margin:"0 auto 28px",lineHeight:1.7}}>
          Free forever. No credit card. Set up in 30 seconds.
        </p>
        <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={onGetStarted} style={{padding:"13px 32px",borderRadius:30,fontSize:15,fontWeight:800,background:"#FCD34D",color:"#14532D",border:"none",cursor:"pointer",boxShadow:"0 6px 24px rgba(0,0,0,0.2)"}}>
            Get started free →
          </button>
          <a href="/business" style={{padding:"13px 24px",borderRadius:30,fontSize:14,fontWeight:700,background:"rgba(255,255,255,0.12)",color:"#fff",textDecoration:"none",border:"1px solid rgba(255,255,255,0.25)"}}>
            SmartPrice for Business →
          </a>
        </div>
      </div>

      {/* ── FOOTER — same as BusinessPage ─────────────────────────────── */}
      <div style={{borderTop:`1px solid ${C.border}`,background:C.card,padding:"28px 24px",textAlign:"center",fontSize:12,color:C.light}}>
        <div style={{marginBottom:10}}>
          SmartPrice.be ·{" "}
          <a href="/business"    style={{color:C.muted,textDecoration:"none"}}>Business</a> ·{" "}
          <a href="/fleet-audit" style={{color:C.muted,textDecoration:"none"}}>Fleet Audit</a> ·{" "}
          <a href="/api-docs"    style={{color:C.muted,textDecoration:"none"}}>API & HA</a> ·{" "}
          <a href="/ev-charging-belgium" style={{color:C.muted,textDecoration:"none"}}>EV Charging</a> ·{" "}
          <a href="mailto:info@smartprice.be" style={{color:C.muted,textDecoration:"none"}}>info@smartprice.be</a>
        </div>
        <div>
          Data: Energy-Charts.info · Elia Open Data (CC BY 4.0) · ENTSO-E · Prices refresh every 15 min
          <span onClick={()=>window.dispatchEvent(new CustomEvent("showPrivacy"))} style={{marginLeft:12,cursor:"pointer",textDecoration:"underline"}}>Privacy Policy</span>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:14,flexWrap:"wrap"}}>
          {[
            {label:"WhatsApp",icon:"💬",color:"#25D366",href:`https://wa.me/?text=${encodeURIComponent("⚡ SmartPrice.be — tells you exactly when to charge your EV to save money. Live EPEX prices, free. https://smartprice.be")}`},
            {label:"Facebook",icon:"f",color:"#1877F2",href:`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://smartprice.be")}`},
            {label:"LinkedIn",icon:"in",color:"#0A66C2",href:`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://smartprice.be")}`},
          ].map(s=>(
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
              style={{width:30,height:30,borderRadius:8,background:`${s.color}10`,border:`1px solid ${s.color}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:s.color,textDecoration:"none"}}>
              {s.icon}
            </a>
          ))}
        </div>
      </div>

      <style>{`* { box-sizing: border-box; } input[type=range] { height: 4px; }`}</style>
    </div>
  );
}
