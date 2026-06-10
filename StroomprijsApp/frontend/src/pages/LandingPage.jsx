/**
 * LandingPage.jsx — SmartPrice.be
 * v6: Grid53/Frank Energie style.
 * Dark navy hero (split layout) → white alternating feature sections → stats → tools → CTA
 */
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "../context/LanguageContext";
import LangSwitcher  from "../components/LangSwitcher";
import ThemeSwitcher from "../components/ThemeSwitcher";

const NAVY  = "#0B1628";
const NAVY2 = "#112240";
const WHITE = "#FFFFFF";
const GREY  = "#F5F7FA";
const TEAL  = "#0D9488";
const BLUE  = "#1E40AF";
const TEXT  = "#0F172A";
const MUTED = "#64748B";
const LIGHT = "#94A3B8";
const BORD  = "#E2E8F0";

function retailKwh(mwh) { return (mwh / 1000) + 0.173; }
function retailFmt(mwh) { return retailKwh(mwh).toFixed(3); }
function priceColor(mwh) {
  if (mwh == null) return LIGHT;
  if (mwh < 0)   return "#10B981";
  if (mwh < 60)  return "#10B981";
  if (mwh < 110) return "#4ADE80";
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
  const [hasSolar,     setHasSolar]     = useState(false);
  const [leadEmail,    setLeadEmail]    = useState("");
  const [leadState,    setLeadState]    = useState("idle");
  const [fluviusEmail, setFluviusEmail] = useState("");
  const [fluviusState, setFluviusState] = useState("idle");
  const [fetchedAt,    setFetchedAt]    = useState(null);
  const [siteStats,    setSiteStats]    = useState(null);
  const [gasCurrent,   setGasCurrent]   = useState(null);
  const toolsRef = useRef(null);

  useEffect(() => { setTimeout(() => setHeroIn(true), 40); }, []);
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
    const nowAvg = nowSlice.length ? nowSlice.reduce((s,p) => s + p.price_eur_mwh,0)/nowSlice.length : (prices.find(p=>p.is_current)?.price_eur_mwh ?? 120);
    if (best) best.saving = Math.max(0, (nowAvg/1000+0.173)*needed - best.cost);
    setPlanResult(best);
  }, [prices, battPct, needByHour, chargerKw]);

  const nowH = new Date().getHours();
  const nowM = new Date().getMinutes();
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
  let cheapWindowEnd = cheapHour != null ? cheapHour + 1 : null;
  if (cheapHour != null && futureOnly[1] && Math.abs(futureOnly[1].hour - cheapHour) <= 1)
    cheapWindowEnd = Math.max(cheapHour, futureOnly[1].hour) + 1;
  const peakEntry  = [...upcoming2].sort((a,b) => b.price_eur_mwh - a.price_eur_mwh)[0];
  const peakH      = peakEntry?.hour ?? null;
  const peakMwh    = peakEntry?.price_eur_mwh ?? null;
  const savingToday = (currentMwh!=null && cheapMwh!=null) ? Math.max(0,(retailKwh(currentMwh)-retailKwh(cheapMwh))*40) : null;
  const minsUntilCheap = cheapHour!=null ? (cheapHour-nowH)*60-nowM : null;
  const cheapNow   = minsUntilCheap!=null && minsUntilCheap<=0;
  const cheapSoon  = minsUntilCheap!=null && minsUntilCheap>0 && minsUntilCheap<=90;
  const updatedMinsAgo = fetchedAt ? Math.max(0, Math.floor((Date.now()-new Date(fetchedAt).getTime())/60000)) : null;
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
    { name:"Engie",         abbr:"EN", color:"#fff",    bg:"#0066A1" },
    { name:"Luminus",       abbr:"LU", color:"#1a1a1a", bg:"#FFB800" },
    { name:"Bolt",          abbr:"⚡", color:"#fff",    bg:"#1A1A2E" },
    { name:"TotalEnergies", abbr:"TE", color:"#fff",    bg:"#EF3340" },
    { name:"Eneco",         abbr:"EC", color:"#fff",    bg:"#00A651" },
    { name:"Mega",          abbr:"MG", color:"#fff",    bg:"#7C3AED" },
    { name:"Octa+",         abbr:"O+", color:"#fff",    bg:"#F97316" },
  ];
  const faqs = [
    { q: L.faq1Q, a: L.faq1A },
    { q: L.faq2Q, a: L.faq2A },
    { q: L.faq3Q, a: L.faq3A },
    { q: L.faq4Q, a: L.faq4A },
  ];

  /* ── Mini bar chart used inside hero card ── */
  const MiniChart = () => {
    if (!prices.length) return <div style={{height:48,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"rgba(255,255,255,0.3)"}}>Loading…</div>;
    const slice = prices.slice(0,24);
    const maxP  = Math.max(...slice.map(x => Math.max(x.price_eur_mwh,0)));
    return (
      <div style={{display:"flex",gap:2,alignItems:"flex-end",height:48}}>
        {slice.map((p,i) => {
          const barH = maxP>0 ? Math.max((p.price_eur_mwh/maxP)*100,4) : 4;
          const col  = priceColor(p.price_eur_mwh);
          const pHour = new Date(p.timestamp_utc||p.timestamp).getHours();
          const hi = p.is_current || pHour===cheapHour;
          return <div key={i} style={{flex:1,height:`${barH}%`,borderRadius:"2px 2px 0 0",background:hi?col:`${col}44`}} title={`${String(pHour).padStart(2,"0")}:00`}/>;
        })}
      </div>
    );
  };

  return (
    <div style={{ minHeight:"100vh", background:WHITE, color:TEXT, fontFamily:"'DM Sans',system-ui,sans-serif", overflowX:"hidden" }}>

      {/* Top accent line */}
      <div style={{ height:3, background:"linear-gradient(90deg,#0D9488,#1E40AF,#7C3AED)", position:"fixed", top:0, left:0, right:0, zIndex:100 }} />

      {/* ══ NAV ════════════════════════════════════════════════════════ */}
      <nav style={{ background:WHITE, borderBottom:`1px solid ${BORD}`, padding:"0 32px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50, boxShadow:"0 1px 12px rgba(0,0,0,0.06)" }}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22}}>🇧🇪</span>
          <span style={{fontSize:19,fontWeight:900,letterSpacing:"-0.8px",color:TEXT}}>SmartPrice</span>
          <span style={{fontSize:9,color:"#10B981",background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.25)",borderRadius:20,padding:"2px 8px",fontWeight:700}}>● LIVE</span>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <ThemeSwitcher />
          <LangSwitcher style={{marginRight:4}} />
          <a href="/ev-charging-belgium" style={{padding:"7px 14px",borderRadius:20,fontSize:12,fontWeight:700,background:"rgba(13,148,136,0.07)",border:"1px solid rgba(13,148,136,0.2)",color:TEAL,textDecoration:"none"}}>🚗 EV</a>
          <a href="/business"            style={{padding:"7px 14px",borderRadius:20,fontSize:12,fontWeight:700,background:"rgba(30,64,175,0.07)",border:"1px solid rgba(30,64,175,0.2)",color:BLUE,textDecoration:"none"}}>🏢 Business</a>
          <button onClick={onGetStarted} style={{padding:"9px 22px",borderRadius:20,fontSize:13,fontWeight:800,background:"linear-gradient(135deg,#10B981,#0D9488)",border:"none",color:"#fff",cursor:"pointer",boxShadow:"0 4px 14px rgba(13,148,136,0.3)"}}>
            Dashboard →
          </button>
        </div>
      </nav>

      {/* ══ PLATFORM STRIP ═════════════════════════════════════════════ */}
      <div style={{background:WHITE,borderBottom:`1px solid ${BORD}`,position:"sticky",top:64,zIndex:40}}>
        <div style={{maxWidth:960,margin:"0 auto",display:"flex",overflow:"auto"}}>
          {[
            {icon:"👤",label:"Households",accent:TEAL, href:null,         active:true},
            {icon:"🏢",label:"Business",  accent:BLUE, href:"/business",  active:false},
            {icon:"🚗",label:"Fleet Audit",accent:"#F59E0B",href:"/fleet-audit",active:false},
            {icon:"🔌",label:"API & HA",  accent:"#7C3AED",href:"/api-docs",  active:false},
          ].map(s=>(
            <a key={s.label} href={s.href||"#"} onClick={s.href?undefined:e=>e.preventDefault()}
              style={{display:"flex",alignItems:"center",gap:6,padding:"11px 22px",fontSize:12,fontWeight:700,color:s.active?s.accent:MUTED,textDecoration:"none",borderBottom:`2px solid ${s.active?s.accent:"transparent"}`,whiteSpace:"nowrap"}}>
              {s.icon} {s.label}
            </a>
          ))}
        </div>
      </div>

      {/* ══ § 1  HERO — dark navy, split layout ═════════════════════════
           Left: headline + CTA + social proof
           Right: live price product card (coded visual)
      ═══════════════════════════════════════════════════════════════════ */}
      <section style={{background:`linear-gradient(160deg,${NAVY} 0%,${NAVY2} 100%)`,padding:"80px 32px 88px"}}>
        <div style={{maxWidth:960,margin:"0 auto",display:"flex",gap:56,alignItems:"center",flexWrap:"wrap",
          opacity:heroIn?1:0,transform:heroIn?"translateY(0)":"translateY(20px)",transition:"all 0.65s ease"}}>

          {/* ── Left col ── */}
          <div style={{flex:"1 1 380px",minWidth:300}}>
            {/* Tag */}
            <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(13,148,136,0.15)",border:"1px solid rgba(13,148,136,0.35)",borderRadius:20,padding:"5px 14px",fontSize:11,fontWeight:700,color:"#4DD9C0",marginBottom:24,textTransform:"uppercase",letterSpacing:"1.5px"}}>
              🇧🇪 Belgium · EPEX Spot · Live now
            </div>

            {/* H1 */}
            <h1 style={{fontSize:"clamp(34px,5vw,56px)",fontWeight:900,color:WHITE,letterSpacing:"-2px",lineHeight:1.1,margin:"0 0 18px"}}>
              Stop overpaying<br/>for every EV charge
            </h1>

            {/* Sub */}
            <p style={{fontSize:17,color:"rgba(255,255,255,0.6)",lineHeight:1.75,margin:"0 0 32px",maxWidth:440}}>
              Live EPEX electricity prices for Belgium, updated every 15 minutes.
              We find your cheapest charging window — completely free.
            </p>

            {/* Social proof stars */}
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:32}}>
              <div style={{display:"flex",gap:2}}>
                {"★★★★★".split("").map((s,i)=><span key={i} style={{fontSize:16,color:"#F59E0B"}}>{s}</span>)}
              </div>
              <span style={{fontSize:13,color:"rgba(255,255,255,0.5)",fontWeight:500}}>
                {siteStats?.registered_users ?? "100"}+ Belgian users · Free forever
              </span>
            </div>

            {/* CTAs */}
            <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:28}}>
              <button onClick={onGetStarted} style={{padding:"14px 32px",borderRadius:50,fontSize:15,fontWeight:800,background:"linear-gradient(135deg,#10B981,#0D9488)",border:"none",color:"#fff",cursor:"pointer",boxShadow:"0 6px 24px rgba(13,148,136,0.45)",transition:"all 0.2s"}}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 10px 32px rgba(13,148,136,0.55)"}}
                onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 6px 24px rgba(13,148,136,0.45)"}}>
                Get started free →
              </button>
              <button onClick={()=>toolsRef.current?.scrollIntoView({behavior:"smooth"})} style={{padding:"14px 28px",borderRadius:50,fontSize:14,fontWeight:700,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.2)",color:"rgba(255,255,255,0.85)",cursor:"pointer",transition:"all 0.2s"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.14)"}
                onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.08)"}>
                See live prices ↓
              </button>
            </div>

            {/* Trust row */}
            <div style={{display:"flex",gap:18,flexWrap:"wrap"}}>
              {["🆓 Free forever","⚡ 15 min updates","🔒 GDPR compliant","🇧🇪 Belgian data"].map(t=>(
                <span key={t} style={{fontSize:12,color:"rgba(255,255,255,0.4)",fontWeight:500}}>{t}</span>
              ))}
            </div>
          </div>

          {/* ── Right col: product card ── */}
          <div style={{flex:"1 1 320px",minWidth:280}}>
            <div style={{background:WHITE,borderRadius:24,boxShadow:"0 32px 80px rgba(0,0,0,0.5)",overflow:"hidden"}}>

              {/* Card header */}
              <div style={{background:"linear-gradient(135deg,#0B1628,#112240)",padding:"20px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:4}}>Belgium · EPEX Spot</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>Updated {updatedStr ?? "…"}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,fontWeight:700,color:"#10B981",background:"rgba(16,185,129,0.12)",border:"1px solid rgba(16,185,129,0.3)",borderRadius:20,padding:"4px 10px"}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:"#10B981",display:"inline-block"}}/>LIVE
                </div>
              </div>

              {/* Big price */}
              <div style={{padding:"24px 22px 16px",borderBottom:`1px solid ${BORD}`}}>
                <div style={{fontSize:11,color:MUTED,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Current electricity price</div>
                <div style={{display:"flex",alignItems:"flex-end",gap:10,marginBottom:6}}>
                  <span style={{fontSize:54,fontWeight:900,fontFamily:"monospace",color:currentMwh!=null?currentCol:LIGHT,letterSpacing:"-3px",lineHeight:1}}>
                    {currentMwh!=null ? Math.round(currentMwh) : "—"}
                  </span>
                  <div style={{paddingBottom:6}}>
                    <div style={{fontSize:15,fontWeight:600,color:MUTED}}>€/MWh</div>
                    <div style={{fontSize:10,fontWeight:800,color:currentCol,textTransform:"uppercase",letterSpacing:"1px"}}>{currentLbl}</div>
                  </div>
                </div>
                <div style={{fontSize:12,color:MUTED}}>= <strong style={{color:currentCol}}>€{currentMwh!=null?retailFmt(currentMwh):"—"}/kWh</strong> at your meter</div>
              </div>

              {/* Cheapest window */}
              {cheapHour!=null && (
                <div style={{padding:"16px 22px",borderBottom:`1px solid ${BORD}`,background:"rgba(22,163,74,0.03)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:10,fontWeight:700,color:"#16A34A",textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>
                        {cheapIsNow ? "⚡ Cheapest now" : "Best window today"}
                      </div>
                      <div style={{fontSize:20,fontWeight:800,color:TEXT,fontFamily:"monospace",letterSpacing:"-0.5px"}}>
                        {cheapIsNow ? "Right now!" : `${fmtHour(cheapHour)} – ${fmtHour(cheapWindowEnd??cheapHour+1)}`}
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:18,fontWeight:800,color:"#16A34A"}}>€{retailFmt(cheapMwh)}/kWh</div>
                      {savingToday!=null && savingToday>0.3 && (
                        <div style={{fontSize:12,color:TEAL,fontWeight:600}}>Save €{savingToday.toFixed(2)} per charge</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Mini bar chart */}
              <div style={{padding:"14px 22px"}}>
                <div style={{fontSize:9,fontWeight:700,color:LIGHT,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Today's 24-hour schedule</div>
                <MiniChart />
                <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:LIGHT,marginTop:4}}>
                  <span>00:00</span><span>12:00</span><span>23:00</span>
                </div>
              </div>

              {/* Card CTA */}
              <div style={{padding:"0 22px 20px"}}>
                <button onClick={onGetStarted} style={{width:"100%",padding:"12px",borderRadius:12,fontSize:14,fontWeight:800,background:"linear-gradient(135deg,#10B981,#0D9488)",border:"none",color:"#fff",cursor:"pointer"}}>
                  Get full access — free →
                </button>
              </div>
            </div>

            {/* Urgency chip under card */}
            {(cheapNow||cheapSoon) && (
              <div style={{marginTop:12,padding:"9px 16px",borderRadius:10,background:"rgba(16,185,129,0.12)",border:"1px solid rgba(16,185,129,0.3)",fontSize:12,fontWeight:700,color:"#4DD9C0",textAlign:"center"}}>
                {cheapNow ? "⚡ Cheapest window RIGHT NOW — plug in now" : `⚡ Cheapest window in ${(minsUntilCheap<60?`${minsUntilCheap} min`:`${Math.floor(minsUntilCheap/60)}h ${minsUntilCheap%60}m`)} — get ready`}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══ § 2  SOCIAL PROOF STRIP ═════════════════════════════════════ */}
      <div style={{background:GREY,borderTop:`1px solid ${BORD}`,borderBottom:`1px solid ${BORD}`,padding:"20px 32px"}}>
        <div style={{maxWidth:960,margin:"0 auto",display:"flex",gap:0,justifyContent:"center",flexWrap:"wrap"}}>
          {[
            {n: siteStats?.registered_users ?? "100+", label:"Belgian users tracking"},
            {n:"7",    label:"Suppliers compared"},
            {n:"15 min",label:"Price refresh interval"},
            {n:"€200+", label:"Average annual saving"},
          ].map((s,i,arr)=>(
            <div key={s.label} style={{textAlign:"center",padding:"8px 36px",borderRight:i<arr.length-1?`1px solid ${BORD}`:"none"}}>
              <div style={{fontSize:24,fontWeight:900,color:TEXT,fontFamily:"monospace",letterSpacing:"-0.5px"}}>{s.n}</div>
              <div style={{fontSize:11,color:MUTED,fontWeight:500,marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ § 3  HOW IT WORKS ══════════════════════════════════════════ */}
      <section style={{background:WHITE,padding:"88px 32px"}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:56}}>
            <div style={{display:"inline-block",fontSize:11,fontWeight:800,color:TEAL,background:"rgba(13,148,136,0.07)",border:`1px solid rgba(13,148,136,0.2)`,borderRadius:20,padding:"4px 14px",textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:14}}>
              How it works
            </div>
            <h2 style={{fontSize:"clamp(26px,4vw,38px)",fontWeight:900,color:TEXT,letterSpacing:"-1px",margin:"0 0 12px"}}>Three steps to cheaper energy</h2>
            <p style={{fontSize:16,color:MUTED,maxWidth:480,margin:"0 auto",lineHeight:1.65}}>SmartPrice does the work. You just plug in at the right time.</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:2}}>
            {[
              {n:"01",icon:"📡",color:TEAL,  title:"We monitor 24/7",    desc:"EPEX Spot Belgium prices fetched and processed every 15 minutes — day and night, including weekends."},
              {n:"02",icon:"🎯",color:BLUE,  title:"We find your window",desc:"Our algorithm calculates the cheapest consecutive hours for your battery level, charger power, and deadline."},
              {n:"03",icon:"💶",color:"#7C3AED",title:"You save money",  desc:"Plug in at the optimal time. Belgian EV drivers save an average of €200+ per year by charging smarter."},
            ].map((s,i)=>(
              <div key={s.n} style={{background:i%2===1?GREY:WHITE,border:`1px solid ${BORD}`,borderRadius:0,padding:"40px 36px",position:"relative",overflow:"hidden"}}>
                <div style={{fontSize:72,fontWeight:900,color:BORD,position:"absolute",top:16,right:20,lineHeight:1,fontFamily:"monospace",userSelect:"none",pointerEvents:"none"}}>{s.n}</div>
                <div style={{width:52,height:52,borderRadius:14,background:`${s.color}12`,border:`1px solid ${s.color}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,marginBottom:20}}>{s.icon}</div>
                <div style={{fontSize:19,fontWeight:800,color:TEXT,marginBottom:10}}>{s.title}</div>
                <div style={{fontSize:14,color:MUTED,lineHeight:1.75}}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ § 4  FEATURE: EV PLANNER (text left, widget right) ═════════ */}
      <section ref={toolsRef} style={{background:GREY,padding:"88px 32px"}}>
        <div style={{maxWidth:960,margin:"0 auto",display:"flex",gap:56,alignItems:"center",flexWrap:"wrap"}}>
          {/* Left */}
          <div style={{flex:"1 1 300px",minWidth:260}}>
            <div style={{display:"inline-block",fontSize:11,fontWeight:800,color:"#00C896",background:"rgba(0,200,150,0.08)",border:"1px solid rgba(0,200,150,0.2)",borderRadius:20,padding:"4px 14px",textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:16}}>
              🔋 EV Charge Planner
            </div>
            <h2 style={{fontSize:"clamp(24px,3.5vw,34px)",fontWeight:900,color:TEXT,letterSpacing:"-1px",marginBottom:14,lineHeight:1.15}}>
              Find your cheapest charging window
            </h2>
            <p style={{fontSize:15,color:MUTED,lineHeight:1.75,marginBottom:24}}>
              Tell us your battery level, charger speed, and when you need the car ready. We calculate the cheapest window and exact cost — in real time.
            </p>
            {planResult && (
              <div style={{display:"flex",gap:20,flexWrap:"wrap",marginBottom:24}}>
                <div>
                  <div style={{fontSize:10,color:MUTED,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>Optimal window</div>
                  <div style={{fontSize:28,fontWeight:900,color:"#10B981",fontFamily:"monospace",letterSpacing:"-1px"}}>{fmtHour(planResult.start)} – {fmtHour(planResult.end)}</div>
                </div>
                {planResult.saving>0.1 && (
                  <div>
                    <div style={{fontSize:10,color:MUTED,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>vs charging now</div>
                    <div style={{fontSize:28,fontWeight:900,color:"#F97316",fontFamily:"monospace",letterSpacing:"-1px"}}>-€{planResult.saving.toFixed(2)}</div>
                  </div>
                )}
              </div>
            )}
            <button onClick={onGetStarted} style={{padding:"13px 28px",borderRadius:50,fontSize:14,fontWeight:800,background:"linear-gradient(135deg,#10B981,#0D9488)",border:"none",color:"#fff",cursor:"pointer",boxShadow:"0 4px 16px rgba(13,148,136,0.3)"}}>
              Get alerts for my window →
            </button>
          </div>
          {/* Right: interactive planner */}
          <div style={{flex:"1 1 340px",minWidth:300}}>
            <div style={{background:WHITE,borderRadius:20,border:`1px solid ${BORD}`,padding:"28px",boxShadow:"0 8px 32px rgba(0,0,0,0.08)"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
                <div>
                  <label style={{fontSize:10,color:MUTED,textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,display:"block",marginBottom:8}}>
                    Battery now: <span style={{color:"#00C896"}}>{battPct}%</span>
                  </label>
                  <input type="range" min={5} max={90} step={5} value={battPct} onChange={e=>setBattPct(+e.target.value)}
                    style={{width:"100%",accentColor:"#00C896",cursor:"pointer"}} />
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:LIGHT,marginTop:3}}>
                    <span>5%</span><span>90%</span>
                  </div>
                </div>
                <div>
                  <label style={{fontSize:10,color:MUTED,textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,display:"block",marginBottom:8}}>Full by:</label>
                  <select value={needByHour} onChange={e=>setNeedByHour(+e.target.value)}
                    style={{width:"100%",background:WHITE,border:`1px solid ${BORD}`,borderRadius:10,padding:"9px 10px",color:TEXT,fontSize:13,fontWeight:700,cursor:"pointer",outline:"none"}}>
                    {Array.from({length:23},(_,i)=>(new Date().getHours()+1+i)%24).map(h=>(
                      <option key={h} value={h}>{String(h).padStart(2,"0")}:00{h>=5&&h<=9?" (morning)":h>=17&&h<=20?" (evening)":""}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{marginBottom:20}}>
                <label style={{fontSize:10,color:MUTED,textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,display:"block",marginBottom:8}}>Charger speed:</label>
                <div style={{display:"flex",gap:6}}>
                  {[3.7,7.4,11,22].map(kw=>(
                    <button key={kw} onClick={()=>setChargerKw(kw)} style={{flex:1,padding:"10px 4px",borderRadius:10,fontSize:12,fontWeight:700,border:`1px solid ${chargerKw===kw?"rgba(0,200,150,0.5)":BORD}`,background:chargerKw===kw?"rgba(0,200,150,0.1)":GREY,color:chargerKw===kw?"#00C896":MUTED,cursor:"pointer"}}>
                      {kw}kW
                    </button>
                  ))}
                </div>
              </div>
              {planResult ? (
                <div style={{background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:14,padding:"16px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                    <div>
                      <div style={{fontSize:10,color:"#10B981",fontWeight:700,textTransform:"uppercase",marginBottom:4}}>⚡ Charge between</div>
                      <div style={{fontSize:22,fontWeight:900,color:"#10B981",fontFamily:"monospace"}}>{fmtHour(planResult.start)} – {fmtHour(planResult.end)}</div>
                      <div style={{fontSize:11,color:MUTED,marginTop:2}}>{planResult.hours}h · {planResult.needed.toFixed(0)} kWh needed</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:22,fontWeight:900,color:"#10B981",fontFamily:"monospace"}}>€{planResult.cost.toFixed(2)}</div>
                      {planResult.saving>0.1 && <div style={{fontSize:12,color:"#F97316",fontWeight:700}}>save €{planResult.saving.toFixed(2)}</div>}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{background:GREY,borderRadius:12,padding:"14px",textAlign:"center",fontSize:13,color:MUTED}}>
                  {prices.length ? "Adjust inputs above to calculate" : "Loading prices…"}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══ § 5  FEATURE: PLAN CALCULATOR (widget left, text right) ════ */}
      <section style={{background:WHITE,padding:"88px 32px"}}>
        <div style={{maxWidth:960,margin:"0 auto",display:"flex",gap:56,alignItems:"center",flexWrap:"wrap"}}>
          {/* Left: calculator card */}
          <div style={{flex:"1 1 340px",minWidth:300,order:0}}>
            <div style={{background:GREY,borderRadius:20,border:`1px solid ${BORD}`,padding:"28px",boxShadow:"0 8px 32px rgba(0,0,0,0.06)"}}>
              <div style={{fontSize:12,color:MUTED,fontWeight:700,marginBottom:16}}>7 Belgian suppliers · real annual cost</div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:20}}>
                {SUPPLIERS.map(s=>(
                  <div key={s.name} style={{display:"flex",alignItems:"center",gap:8,background:WHITE,border:`1px solid ${BORD}`,borderRadius:12,padding:"8px 14px",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                    <div style={{width:28,height:28,borderRadius:8,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,color:s.color,flexShrink:0}}>{s.abbr}</div>
                    <span style={{fontSize:12,fontWeight:700,color:TEXT}}>{s.name}</span>
                  </div>
                ))}
              </div>
              <div style={{background:WHITE,border:"1px solid rgba(16,185,129,0.25)",borderRadius:14,padding:"16px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:11,color:MUTED,marginBottom:4}}>Cheapest plan</div>
                  <div style={{fontSize:24,fontWeight:900,color:"#10B981",fontFamily:"monospace"}}>€987<span style={{fontSize:12,color:MUTED,fontFamily:"inherit",fontWeight:400}}>/yr</span></div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:11,color:MUTED,marginBottom:4}}>Your current plan</div>
                  <div style={{fontSize:20,fontWeight:700,color:"#F97316",fontFamily:"monospace",textDecoration:"line-through",opacity:0.7}}>€1,204</div>
                </div>
              </div>
            </div>
          </div>
          {/* Right: text */}
          <div style={{flex:"1 1 300px",minWidth:260}}>
            <div style={{display:"inline-block",fontSize:11,fontWeight:800,color:TEAL,background:"rgba(13,148,136,0.07)",border:`1px solid rgba(13,148,136,0.2)`,borderRadius:20,padding:"4px 14px",textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:16}}>
              🔌 Plan Calculator
            </div>
            <h2 style={{fontSize:"clamp(24px,3.5vw,34px)",fontWeight:900,color:TEXT,letterSpacing:"-1px",marginBottom:14,lineHeight:1.15}}>
              Is your supplier the cheapest?
            </h2>
            <p style={{fontSize:15,color:MUTED,lineHeight:1.75,marginBottom:24}}>
              We compare all 7 Belgian electricity suppliers side by side — Engie, Luminus, Bolt, TotalEnergies, Eneco, Mega, and Octa+. See your real annual cost in 30 seconds.
            </p>
            <button onClick={()=>onOpenCalculator?.("electricity")} style={{padding:"13px 28px",borderRadius:50,fontSize:14,fontWeight:800,background:"linear-gradient(135deg,#1E40AF,#1E3A8A)",border:"none",color:"#fff",cursor:"pointer",boxShadow:"0 4px 16px rgba(30,64,175,0.3)"}}>
              Compare my plan →
            </button>
          </div>
        </div>
      </section>

      {/* ══ § 6  FEATURE: ALERTS + HA (text left, cards right) ═════════ */}
      <section style={{background:GREY,padding:"88px 32px"}}>
        <div style={{maxWidth:960,margin:"0 auto",display:"flex",gap:56,alignItems:"center",flexWrap:"wrap"}}>
          {/* Left */}
          <div style={{flex:"1 1 300px",minWidth:260}}>
            <div style={{display:"inline-block",fontSize:11,fontWeight:800,color:BLUE,background:"rgba(30,64,175,0.07)",border:`1px solid rgba(30,64,175,0.2)`,borderRadius:20,padding:"4px 14px",textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:16}}>
              🔔 Price Alerts + 🏠 Home Assistant
            </div>
            <h2 style={{fontSize:"clamp(24px,3.5vw,34px)",fontWeight:900,color:TEXT,letterSpacing:"-1px",marginBottom:14,lineHeight:1.15}}>
              Automate your energy. Never miss a cheap window.
            </h2>
            <p style={{fontSize:15,color:MUTED,lineHeight:1.75,marginBottom:24}}>
              Daily email alerts at 13:00 when tomorrow's cheapest window is confirmed. Or connect directly to Home Assistant via our official HACS integration and automate your EV charger.
            </p>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <button onClick={onGetStarted} style={{padding:"13px 24px",borderRadius:50,fontSize:14,fontWeight:800,background:"linear-gradient(135deg,#1E40AF,#1E3A8A)",border:"none",color:"#fff",cursor:"pointer"}}>
                Set up email alerts →
              </button>
              <a href="/api-docs" style={{padding:"13px 24px",borderRadius:50,fontSize:14,fontWeight:700,background:WHITE,border:`1px solid ${BORD}`,color:TEXT,textDecoration:"none",display:"inline-block"}}>
                HA integration →
              </a>
            </div>
          </div>
          {/* Right: two feature cards */}
          <div style={{flex:"1 1 320px",minWidth:280,display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:WHITE,borderRadius:18,border:`1px solid ${BORD}`,padding:"22px 24px",boxShadow:"0 4px 16px rgba(0,0,0,0.05)"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                <div style={{width:40,height:40,borderRadius:12,background:"rgba(30,64,175,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🔔</div>
                <div style={{fontSize:16,fontWeight:800,color:TEXT}}>Daily Price Alerts</div>
              </div>
              <div style={{fontSize:13,color:MUTED,lineHeight:1.7}}>Every day at 13:00 CET we send tomorrow's cheapest window to your inbox. No spam. Unsubscribe anytime.</div>
            </div>
            <div style={{background:WHITE,borderRadius:18,border:`1px solid ${BORD}`,padding:"22px 24px",boxShadow:"0 4px 16px rgba(0,0,0,0.05)"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                <div style={{width:40,height:40,borderRadius:12,background:"rgba(124,58,237,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🏠</div>
                <div style={{fontSize:16,fontWeight:800,color:TEXT}}>Home Assistant</div>
              </div>
              <div style={{fontSize:13,color:MUTED,lineHeight:1.7}}>Official HACS custom integration. 6 sensors including price level, cheapest hour, and gas TTF. Automate anything.</div>
              <div style={{display:"inline-block",marginTop:10,fontSize:11,fontWeight:700,color:"#7C3AED",background:"rgba(124,58,237,0.08)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:10,padding:"3px 10px"}}>Available on HACS</div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ § 7  GAS + EMAIL CAPTURE ════════════════════════════════════ */}
      <section style={{background:WHITE,padding:"88px 32px"}}>
        <div style={{maxWidth:960,margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:24}}>
          {/* Gas */}
          <div style={{background:GREY,border:"1px solid rgba(249,115,22,0.2)",borderRadius:20,padding:"32px",boxShadow:"0 4px 16px rgba(0,0,0,0.04)"}}>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
              <span style={{fontSize:32}}>🔥</span>
              <div>
                <div style={{fontSize:11,color:MUTED,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>TTF Natural Gas · Today</div>
                <div style={{fontSize:32,fontWeight:900,color:"#F97316",fontFamily:"monospace",letterSpacing:"-1px"}}>{gasCurrent?`€${gasCurrent.price?.toFixed(1)}/MWh`:"—"}</div>
                {gasCurrent?.ttf_cEkWh!=null&&<div style={{fontSize:12,color:MUTED}}>= {gasCurrent.ttf_cEkWh.toFixed(3)} c€/kWh</div>}
              </div>
            </div>
            <p style={{fontSize:13,color:MUTED,lineHeight:1.7,marginBottom:18}}><strong style={{color:"#F97316"}}>~40%</strong> of your gas bill directly tracks this market price. Switch when it's low.</p>
            <a href="/calculator/gas" style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(249,115,22,0.08)",border:"1px solid rgba(249,115,22,0.25)",borderRadius:50,padding:"10px 20px",fontSize:13,fontWeight:700,color:"#F97316",textDecoration:"none"}}>
              Compare gas plans →
            </a>
          </div>

          {/* Email */}
          <div style={{background:leadState==="done"?"rgba(16,185,129,0.05)":"linear-gradient(135deg,rgba(13,148,136,0.06),rgba(30,64,175,0.03))",border:`1px solid ${leadState==="done"?"rgba(16,185,129,0.3)":"rgba(13,148,136,0.18)"}`,borderRadius:20,padding:"32px",boxShadow:"0 4px 16px rgba(0,0,0,0.04)"}}>
            {leadState==="done" ? (
              <div style={{display:"flex",gap:14,alignItems:"center"}}>
                <span style={{fontSize:36}}>✅</span>
                <div>
                  <div style={{fontSize:17,fontWeight:800,color:"#10B981",marginBottom:6}}>You're on the list</div>
                  <div style={{fontSize:13,color:MUTED,lineHeight:1.65}}>We'll alert you every day at 13:00 when the cheapest window is confirmed.</div>
                </div>
              </div>
            ) : (
              <>
                <div style={{fontSize:11,color:TEAL,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>Daily alerts</div>
                <div style={{fontSize:20,fontWeight:800,color:TEXT,marginBottom:8}}>🔔 Alert me when the cheapest window opens</div>
                <div style={{fontSize:13,color:MUTED,marginBottom:20}}>Every day at 13:00 CET · No spam · Unsubscribe anytime</div>
                <form onSubmit={submitLead} style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <input type="email" required placeholder="your@email.com" value={leadEmail} onChange={e=>setLeadEmail(e.target.value)}
                    style={{flex:1,minWidth:160,padding:"12px 14px",borderRadius:50,fontSize:14,background:WHITE,border:`1px solid ${BORD}`,color:TEXT,outline:"none",fontFamily:"inherit"}}
                    onFocus={e=>e.target.style.border="1px solid rgba(13,148,136,0.5)"}
                    onBlur={e=>e.target.style.border=`1px solid ${BORD}`}/>
                  <button type="submit" disabled={leadState==="loading"} style={{padding:"12px 22px",borderRadius:50,fontSize:13,fontWeight:800,background:"linear-gradient(135deg,#10B981,#0D9488)",border:"none",color:"#fff",cursor:"pointer",opacity:leadState==="loading"?0.7:1,whiteSpace:"nowrap"}}>
                    {leadState==="loading"?"…":"Notify me →"}
                  </button>
                </form>
                {leadState==="error"&&<div style={{fontSize:12,color:"#EF4444",marginTop:8}}>Something went wrong — try again</div>}
              </>
            )}
          </div>
        </div>
      </section>

      {/* ══ § 8  FLUVIUS TEASER ════════════════════════════════════════ */}
      <section style={{background:GREY,padding:"72px 32px"}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <div style={{background:WHITE,border:"1px solid rgba(251,191,36,0.25)",borderRadius:24,padding:"40px 44px",display:"flex",gap:44,flexWrap:"wrap",alignItems:"flex-start",boxShadow:"0 4px 20px rgba(0,0,0,0.05)"}}>
            <div style={{flex:"1 1 280px",minWidth:240}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.3)",borderRadius:20,padding:"4px 14px",fontSize:11,fontWeight:800,color:"#92400E",marginBottom:16,textTransform:"uppercase",letterSpacing:"1px"}}>
                ⚡ Coming soon
              </div>
              <h3 style={{fontSize:22,fontWeight:900,color:TEXT,marginBottom:10,letterSpacing:"-0.5px"}}>Fluvius capacity tariff integration</h3>
              <p style={{fontSize:14,color:MUTED,lineHeight:1.75,marginBottom:20}}>
                Since 2023, Belgian households with a smart meter pay a capacity tariff. Charging at the wrong hour can add €20–30 to your monthly grid bill. We're building full integration to show the real cost of every decision.
              </p>
              <form onSubmit={submitFluvius} style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {fluviusState==="done" ? (
                  <div style={{fontSize:14,fontWeight:700,color:"#92400E"}}>✅ You're on the Fluvius waitlist</div>
                ) : (
                  <>
                    <input type="email" required placeholder="your@email.com" value={fluviusEmail} onChange={e=>setFluviusEmail(e.target.value)}
                      style={{flex:1,minWidth:160,padding:"10px 14px",borderRadius:50,fontSize:13,background:GREY,border:"1px solid rgba(251,191,36,0.3)",color:TEXT,outline:"none",fontFamily:"inherit"}}
                      onFocus={e=>e.target.style.border="1px solid rgba(251,191,36,0.6)"}
                      onBlur={e=>e.target.style.border="1px solid rgba(251,191,36,0.3)"}/>
                    <button type="submit" disabled={fluviusState==="loading"} style={{padding:"10px 20px",borderRadius:50,fontSize:13,fontWeight:700,background:"linear-gradient(135deg,#f59e0b,#d97706)",border:"none",color:"#1c1917",cursor:"pointer",opacity:fluviusState==="loading"?0.7:1}}>
                      {fluviusState==="loading"?"…":"Notify me →"}
                    </button>
                  </>
                )}
              </form>
            </div>
            <div style={{flex:"0 0 auto",minWidth:180,background:GREY,borderRadius:16,padding:"20px 24px",border:`1px solid ${BORD}`}}>
              <div style={{fontSize:11,color:MUTED,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:14}}>What we'll show</div>
              {["Real cost incl. capacity tariff","Best charge time for solar owners","Monthly peak demand tracker","Fluvius bill simulator"].map(f=>(
                <div key={f} style={{display:"flex",gap:8,fontSize:13,color:MUTED,marginBottom:9}}>
                  <span style={{color:"#f59e0b",flexShrink:0}}>→</span>{f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ § 9  FAQ ════════════════════════════════════════════════════ */}
      <section style={{background:WHITE,padding:"88px 32px"}}>
        <div style={{maxWidth:680,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:48}}>
            <div style={{display:"inline-block",fontSize:11,fontWeight:800,color:TEAL,background:"rgba(13,148,136,0.07)",border:`1px solid rgba(13,148,136,0.2)`,borderRadius:20,padding:"4px 14px",textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:14}}>FAQ</div>
            <h2 style={{fontSize:"clamp(24px,4vw,36px)",fontWeight:900,color:TEXT,letterSpacing:"-1px",margin:0}}>Frequently asked questions</h2>
          </div>
          {faqs.filter(f=>f.q).map((f,i)=>(
            <div key={i} onClick={()=>setOpenFaq(openFaq===i?null:i)}
              style={{background:openFaq===i?"rgba(13,148,136,0.03)":WHITE,border:`1px solid ${openFaq===i?"rgba(13,148,136,0.25)":BORD}`,borderRadius:14,overflow:"hidden",cursor:"pointer",marginBottom:8,transition:"all 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
              <div style={{padding:"18px 22px",fontSize:15,fontWeight:700,display:"flex",justifyContent:"space-between",alignItems:"center",color:openFaq===i?TEAL:TEXT}}>
                {f.q}
                <span style={{color:TEAL,fontSize:22,fontWeight:300,flexShrink:0,marginLeft:16,transform:openFaq===i?"rotate(45deg)":"none",transition:"transform 0.2s",display:"inline-block"}}>+</span>
              </div>
              {openFaq===i&&(
                <div style={{padding:"0 22px 18px",fontSize:14,color:MUTED,lineHeight:1.8,borderTop:`1px solid ${BORD}`}}>
                  <div style={{paddingTop:14}}>{f.a}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ══ § 10  FINAL CTA ═════════════════════════════════════════════ */}
      <section style={{background:`linear-gradient(160deg,${NAVY} 0%,${NAVY2} 100%)`,padding:"88px 32px",textAlign:"center"}}>
        <div style={{maxWidth:560,margin:"0 auto"}}>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",fontWeight:700,textTransform:"uppercase",letterSpacing:"2px",marginBottom:16}}>Ready to start saving?</div>
          <h2 style={{fontSize:"clamp(28px,5vw,46px)",fontWeight:900,color:WHITE,letterSpacing:"-1.5px",marginBottom:14,lineHeight:1.1}}>
            Join {siteStats?.registered_users ?? "100"}+ Belgians<br/>who charge smarter
          </h2>
          <p style={{fontSize:16,color:"rgba(255,255,255,0.55)",marginBottom:36,lineHeight:1.65}}>Free forever. No credit card. Set up in 30 seconds.</p>
          <button onClick={onGetStarted} style={{padding:"16px 48px",borderRadius:50,fontSize:17,fontWeight:900,background:"linear-gradient(135deg,#10B981,#0D9488)",border:"none",color:"#fff",cursor:"pointer",boxShadow:"0 8px 32px rgba(13,148,136,0.5)",transition:"all 0.2s"}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 14px 40px rgba(13,148,136,0.6)"}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 8px 32px rgba(13,148,136,0.5)"}}>
            Get started free →
          </button>
          <div style={{display:"flex",gap:20,justifyContent:"center",flexWrap:"wrap",marginTop:24}}>
            {["🇧🇪 Belgian EPEX data","🆓 Free forever","🔒 GDPR compliant"].map(t=>(
              <span key={t} style={{fontSize:13,color:"rgba(255,255,255,0.35)",fontWeight:500}}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
      <footer style={{background:WHITE,borderTop:`1px solid ${BORD}`,padding:"56px 32px 32px"}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:36,marginBottom:44}}>
            <div style={{minWidth:180}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <span style={{fontSize:18}}>🇧🇪</span>
                <span style={{fontWeight:900,fontSize:17,color:TEXT}}>SmartPrice.be</span>
              </div>
              <p style={{fontSize:13,color:MUTED,lineHeight:1.75,marginBottom:16,maxWidth:200}}>Live EPEX electricity prices for Belgium. Free, always.</p>
              <a href="mailto:info@smartprice.be" style={{fontSize:13,color:TEAL,textDecoration:"none"}}>info@smartprice.be</a>
              <div style={{display:"flex",gap:8,marginTop:14}}>
                <a href="https://www.facebook.com/groups/819979377511277" target="_blank" rel="noopener noreferrer" style={{width:34,height:34,borderRadius:9,background:"rgba(24,119,242,0.08)",border:"1px solid rgba(24,119,242,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#1877F2",textDecoration:"none"}}>f</a>
                <a href="https://www.linkedin.com/company/smartprice-be/" target="_blank" rel="noopener noreferrer" style={{width:34,height:34,borderRadius:9,background:"rgba(10,102,194,0.08)",border:"1px solid rgba(10,102,194,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:"#0A66C2",textDecoration:"none"}}>in</a>
              </div>
            </div>
            <div style={{display:"flex",gap:48,flexWrap:"wrap"}}>
              {[
                {heading:"Product",links:[
                  {label:"⚡ Electricity Prices",action:onGetStarted},
                  {label:"🔥 Gas Prices",action:onGetStarted},
                  {label:"🔌 Plan Calculator",action:()=>onOpenCalculator?.("electricity")},
                  {label:"🚗 EV Charging",action:()=>window.location.href="/ev-charging-belgium"},
                  {label:"🗺️ Charging Stations",action:()=>window.location.href="/ev-charging-stations-belgium"},
                ]},
                {heading:"Platform",links:[
                  {label:"🏢 Business",href:"/business"},
                  {label:"🚗 Fleet Audit",href:"/fleet-audit"},
                  {label:"🔌 API & HA",href:"/api-docs"},
                ]},
                {heading:"Company",links:[
                  {label:"Facebook Group",href:"https://www.facebook.com/groups/819979377511277"},
                  {label:"LinkedIn Page",href:"https://www.linkedin.com/company/smartprice-be/"},
                  {label:"Privacy Policy",action:()=>window.dispatchEvent(new CustomEvent("showPrivacy"))},
                  {label:"GDPR Compliant",action:()=>{}},
                ]},
              ].map(col=>(
                <div key={col.heading}>
                  <div style={{fontSize:10,color:MUTED,textTransform:"uppercase",letterSpacing:"1.2px",fontWeight:700,marginBottom:14}}>{col.heading}</div>
                  {col.links.map(l=>l.href?(
                    <a key={l.label} href={l.href} target={l.href.startsWith("http")?"_blank":"_self"} rel="noopener noreferrer"
                      style={{display:"block",fontSize:13,color:MUTED,marginBottom:8,textDecoration:"none"}}
                      onMouseEnter={e=>e.currentTarget.style.color=TEAL}
                      onMouseLeave={e=>e.currentTarget.style.color=MUTED}>{l.label}</a>
                  ):(
                    <div key={l.label} onClick={l.action} style={{fontSize:13,color:MUTED,marginBottom:8,cursor:"pointer"}}
                      onMouseEnter={e=>e.currentTarget.style.color=TEAL}
                      onMouseLeave={e=>e.currentTarget.style.color=MUTED}>{l.label}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div style={{borderTop:`1px solid ${BORD}`,paddingTop:20,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:20}}>
            <span style={{fontSize:12,color:MUTED}}>Share SmartPrice:</span>
            {[
              {label:"WhatsApp",icon:"💬",color:"#25D366",href:`https://wa.me/?text=${encodeURIComponent("⚡ SmartPrice.be — tells you exactly when to charge your EV to save money. Live EPEX prices, free. https://smartprice.be")}`},
              {label:"Facebook",icon:"f",color:"#1877F2",href:`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://smartprice.be")}`},
              {label:"LinkedIn",icon:"in",color:"#0A66C2",href:`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://smartprice.be")}`},
              {label:"X",icon:"𝕏",color:"#1E293B",href:`https://twitter.com/intent/tweet?text=${encodeURIComponent("⚡ SmartPrice.be — live electricity prices for Belgium + EV charge planner. Free. https://smartprice.be")}`},
            ].map(s=>(
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                style={{width:32,height:32,borderRadius:8,background:`${s.color}10`,border:`1px solid ${s.color}28`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:s.color,textDecoration:"none",transition:"all 0.15s"}}
                onMouseEnter={e=>{e.currentTarget.style.background=`${s.color}20`;e.currentTarget.style.transform="translateY(-2px)"}}
                onMouseLeave={e=>{e.currentTarget.style.background=`${s.color}10`;e.currentTarget.style.transform="translateY(0)"}}>
                {s.icon}
              </a>
            ))}
          </div>
          <div style={{fontSize:12,color:LIGHT,lineHeight:1.9}}>
            Data: Energy-Charts.info · Elia Open Data (CC BY 4.0) · ENTSO-E · Prices refresh every 15 min<br/>
            Not financial advice. Always verify tariffs on supplier websites before switching.
          </div>
        </div>
      </footer>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=range] { height: 4px; }
      `}</style>
    </div>
  );
}
