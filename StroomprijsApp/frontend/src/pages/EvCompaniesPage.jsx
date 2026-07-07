/**
 * EvCompaniesPage — /ev-companies
 * SmartPrice for EV Companies, charging apps & platforms
 */
import { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import LangSwitcher from "../components/LangSwitcher";

const C = {
  bg: "#F8FAFC", card: "#FFFFFF", border: "rgba(0,0,0,0.08)",
  shadow: "0 4px 24px rgba(0,0,0,0.07)", text: "#0F172A",
  muted: "#475569", light: "#94A3B8",
  primary: "#0891B2", bright: "#06B6D4",
};

export default function EvCompaniesPage({ onNavigate }) {
  const { L } = useLanguage();
  const [contactOpen, setContactOpen] = useState(false);
  const [form, setForm]               = useState({ name:"", company:"", email:"", message:"" });
  const [formState, setFormState]     = useState("idle");

  useEffect(() => { window.scrollTo(0, 0); }, []);

  async function submitContact(e) {
    e.preventDefault();
    setFormState("loading");
    try {
      await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: "ev-companies" }),
      });
      setFormState("done");
    } catch { setFormState("error"); }
  }

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", background: C.bg, minHeight: "100vh", color: C.text }}>

      {/* ── CONTACT MODAL ─────────────────────────────────────── */}
      {contactOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}
          onClick={e=>{ if(e.target===e.currentTarget) setContactOpen(false); }}>
          <div style={{ background:"#fff", borderRadius:24, padding:"40px 36px", maxWidth:480, width:"100%", boxShadow:"0 24px 64px rgba(0,0,0,0.2)" }}>
            {formState==="done" ? (
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
                <div style={{ fontSize:20, fontWeight:900, color:C.text, marginBottom:8 }}>Message sent!</div>
                <div style={{ fontSize:14, color:C.muted }}>We'll get back to you within 1–2 business days.</div>
                <button onClick={()=>setContactOpen(false)} style={{ marginTop:24, padding:"12px 32px", borderRadius:24, background:C.primary, color:"#fff", border:"none", fontWeight:700, cursor:"pointer" }}>Close</button>
              </div>
            ) : (
              <>
                <div style={{ fontSize:20, fontWeight:900, color:C.text, marginBottom:4 }}>Partner with SmartPrice.be</div>
                <div style={{ fontSize:13, color:C.muted, marginBottom:28 }}>API integration, white-label data, or custom feeds — tell us what you need.</div>
                <form onSubmit={submitContact} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  {[["Name","name","text"],["Company","company","text"],["Email","email","email"]].map(([ph,key,type])=>(
                    <input key={key} type={type} placeholder={ph} required value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                      style={{ padding:"12px 16px", borderRadius:12, border:"1.5px solid rgba(0,0,0,0.12)", fontSize:14, fontFamily:"inherit", outline:"none" }}/>
                  ))}
                  <textarea placeholder="What are you building?" rows={3} value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))}
                    style={{ padding:"12px 16px", borderRadius:12, border:"1.5px solid rgba(0,0,0,0.12)", fontSize:14, fontFamily:"inherit", outline:"none", resize:"vertical" }}/>
                  <button type="submit" disabled={formState==="loading"}
                    style={{ padding:"14px", borderRadius:30, fontSize:15, fontWeight:800, background:`linear-gradient(135deg,#0D7490,#06B6D4)`, color:"#fff", border:"none", cursor:"pointer", opacity:formState==="loading"?0.7:1 }}>
                    {formState==="loading"?"…":"Send message →"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── NAV ───────────────────────────────────────────────── */}
      <nav style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"0 32px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100, boxShadow:"0 1px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }} onClick={()=>onNavigate?.("/")}>
          <span style={{ fontSize:22 }}>🇧🇪</span>
          <span style={{ fontWeight:900, fontSize:17, color:C.text, letterSpacing:"-0.3px" }}>SmartPrice</span>
          <span style={{ fontSize:11, color:"#0891B2", fontWeight:800, background:"#ECFEFF", padding:"3px 12px", borderRadius:20, border:"1px solid rgba(8,145,178,0.25)" }}>EV Companies</span>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <LangSwitcher />
          <a href="/api-docs" style={{ padding:"9px 18px", borderRadius:20, fontSize:13, fontWeight:700, background:"rgba(8,145,178,0.08)", border:"1px solid rgba(8,145,178,0.25)", color:C.primary, textDecoration:"none", whiteSpace:"nowrap" }}>📡 API Docs</a>
          <a href="/business" style={{ padding:"9px 18px", borderRadius:20, fontSize:13, fontWeight:700, background:"rgba(37,99,235,0.07)", border:"1px solid rgba(37,99,235,0.2)", color:"#2563EB", textDecoration:"none", whiteSpace:"nowrap" }}>💼 Business</a>
          <button onClick={()=>setContactOpen(true)} style={{ padding:"9px 20px", borderRadius:20, fontSize:13, fontWeight:700, background:"linear-gradient(135deg,#0D7490,#06B6D4)", color:"#fff", border:"none", cursor:"pointer", boxShadow:"0 4px 16px rgba(8,145,178,0.3)", whiteSpace:"nowrap" }}>
            Contact us
          </button>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <div style={{ background:"linear-gradient(135deg,#0F172A 0%,#0C4A6E 55%,#0891B2 100%)", color:"#fff", padding:"80px 32px 72px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%", background:"rgba(6,182,212,0.12)", top:-200, right:-100, pointerEvents:"none" }}/>
        <div style={{ position:"absolute", width:300, height:300, borderRadius:"50%", background:"rgba(14,165,233,0.08)", bottom:-100, left:-50, pointerEvents:"none" }}/>
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)", borderRadius:30, padding:"6px 20px", marginBottom:28, fontSize:13, fontWeight:700, backdropFilter:"blur(8px)" }}>
            ⚡ SmartPrice for EV Companies & Apps — Belgium
          </div>
          <h1 style={{ fontSize:"clamp(28px,5vw,54px)", fontWeight:900, lineHeight:1.1, margin:"0 auto 24px", maxWidth:720, letterSpacing:"-2px" }}>
            Your App Shows Where.<br/><span style={{ color:"#67E8F9" }}>We Show When.</span>
          </h1>
          <p style={{ fontSize:"clamp(15px,2vw,19px)", opacity:0.85, maxWidth:540, margin:"0 auto 40px", lineHeight:1.75 }}>
            Add live Belgian EPEX price intelligence to any charging app, navigation system, or fleet platform. One API call. No key. Free forever.
          </p>
          <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
            <a href="/api-docs" style={{ padding:"15px 36px", borderRadius:30, fontSize:15, fontWeight:800, background:"#fff", color:"#0C4A6E", textDecoration:"none", boxShadow:"0 6px 28px rgba(0,0,0,0.25)" }}>
              View API docs →
            </a>
            <button onClick={()=>setContactOpen(true)} style={{ padding:"15px 28px", borderRadius:30, fontSize:14, fontWeight:700, background:"rgba(255,255,255,0.12)", color:"#fff", border:"1px solid rgba(255,255,255,0.28)", cursor:"pointer", backdropFilter:"blur(8px)" }}>
              Partner with us
            </button>
          </div>
        </div>
      </div>

      {/* ── STATS BAR ─────────────────────────────────────────── */}
      <div style={{ background:"linear-gradient(180deg,#0C4A6E 0%,#0F172A 100%)", padding:"24px 32px" }}>
        <div style={{ maxWidth:960, margin:"0 auto", display:"flex", justifyContent:"space-around", flexWrap:"wrap", gap:24, textAlign:"center" }}>
          {[
            { n:"Free",       label:"No API key required — ever",               accent:"#22D3EE" },
            { n:"15 min",     label:"EPEX price update interval",                accent:"#67E8F9" },
            { n:"3 endpoints",label:"/current · /cheapest · /prices/today",      accent:"#A5F3FC" },
            { n:"🇧🇪",         label:"Belgium EPEX Spot — Elia Open Data",        accent:"#BAE6FD" },
          ].map(s=>(
            <div key={s.label}>
              <div style={{ fontSize:22, fontWeight:900, color:s.accent, letterSpacing:"-0.5px" }}>{s.n}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginTop:4, maxWidth:160, lineHeight:1.5 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Dark-to-light bridge */}
      <div style={{ height:60, background:"linear-gradient(180deg,#0F172A 0%,#F0F7FF 100%)" }}/>

      {/* ── PRODUCT PICKER ────────────────────────────────────── */}
      <div style={{ background:"#F0F7FF", borderBottom:"1px solid rgba(0,0,0,0.07)", padding:"64px 32px 72px" }}>
        <div style={{ maxWidth:1000, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <h2 style={{ fontSize:"clamp(24px,3.5vw,38px)", fontWeight:900, color:C.text, letterSpacing:"-0.6px", lineHeight:1.2 }}>
              Choose how to <span style={{ color:C.primary }}>integrate</span>
            </h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:28 }}>
            {[
              {
                iconBg:"linear-gradient(135deg,#0D7490,#06B6D4)", icon:"📡", color:"#0891B2",
                title:"Live EPEX Price API",
                desc:"GET /api/current · /api/cheapest · /api/prices/today — returns live Belgian EPEX prices, cheapest window, and 24-hour schedule. No API key, no auth.",
                cta:"View API docs →", href:"/api-docs",
              },
              {
                iconBg:"linear-gradient(135deg,#15803D,#22C55E)", icon:"⚡", color:"#16A34A",
                title:"Charge Timing Feed",
                desc:"One endpoint that tells your app: is right now cheap, how long until the cheapest window, and how much a driver saves by waiting. Ready to embed in any UI.",
                cta:"See the comparison →", href:null, scroll:true,
              },
              {
                iconBg:"linear-gradient(135deg,#7C3AED,#8B5CF6)", icon:"🤝", color:"#7C3AED",
                title:"Partner Integration",
                desc:"White-label data feed, custom update intervals, or co-branded fleet dashboards. We work with charging networks, OEMs, and fleet software providers.",
                cta:"Contact us →", href:null, modal:true,
              },
            ].map((p,i)=>(
              <div key={i}
                style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:24, padding:"36px 28px", display:"flex", flexDirection:"column", boxShadow:C.shadow, cursor:"pointer", transition:"transform 0.15s,box-shadow 0.15s" }}
                onClick={p.modal?()=>setContactOpen(true):p.href?()=>window.location.href=p.href:()=>document.getElementById("ev-compare")?.scrollIntoView({behavior:"smooth"})}
                onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow="0 12px 36px rgba(0,0,0,0.11)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=C.shadow; }}>
                <div style={{ width:68, height:68, borderRadius:"50%", background:p.iconBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, marginBottom:22, boxShadow:`0 8px 20px ${p.color}30` }}>
                  {p.icon}
                </div>
                <div style={{ fontSize:19, fontWeight:900, color:C.text, marginBottom:12, letterSpacing:"-0.3px" }}>{p.title}</div>
                <div style={{ fontSize:14, color:C.muted, lineHeight:1.8, flex:1, marginBottom:22 }}>{p.desc}</div>
                <div style={{ fontSize:14, fontWeight:700, color:p.color, display:"flex", alignItems:"center", gap:4 }}>
                  {p.cta} <span style={{ fontSize:16 }}>›</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── COMPARISON PANEL ──────────────────────────────────── */}
      <div id="ev-compare" style={{ background:"rgba(240,247,255,0.5)", borderBottom:"1px solid rgba(0,0,0,0.07)", padding:"72px 32px 64px" }}>
        <div style={{ maxWidth:920, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <div style={{ fontSize:10, fontWeight:800, color:C.primary, textTransform:"uppercase", letterSpacing:2.5, marginBottom:12 }}>What you get</div>
            <h2 style={{ fontSize:"clamp(22px,3.5vw,36px)", fontWeight:900, color:C.text, letterSpacing:"-0.8px", marginBottom:8 }}>Your App Shows Where. We Show When.</h2>
            <div style={{ fontSize:14, color:C.primary, fontWeight:700 }}>One API call adds the layer no EV app has yet.</div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:0, alignItems:"stretch", borderRadius:20, overflow:"hidden", boxShadow:"0 8px 32px rgba(0,0,0,0.08)" }}>
            {/* Left */}
            <div style={{ background:C.card, border:"1px solid rgba(0,0,0,0.08)", borderRight:"none", padding:"28px 28px 24px" }}>
              <div style={{ fontSize:11, fontWeight:800, color:C.light, textTransform:"uppercase", letterSpacing:2, marginBottom:20 }}>Standard EV app</div>
              {[
                {icon:"📍",label:"Nearest charger",val:"2 stations nearby"},
                {icon:"💰",label:"Station price",val:"€0.69/kWh"},
                {icon:"🗺️",label:"Route",val:"Turn left in 200m"},
                {icon:"❓",label:"Good time to charge?",val:"—",dim:true},
                {icon:"❓",label:"Cheapest window tonight",val:"—",dim:true},
                {icon:"❓",label:"Saving by waiting 2h",val:"—",dim:true},
              ].map((r,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:i<5?`1px solid rgba(0,0,0,0.06)`:"none" }}>
                  <span style={{ fontSize:16, width:22, textAlign:"center", opacity:r.dim?0.3:1 }}>{r.icon}</span>
                  <span style={{ flex:1, fontSize:13, color:r.dim?C.light:C.muted }}>{r.label}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:r.dim?"rgba(148,163,184,0.5)":C.text }}>{r.val}</span>
                </div>
              ))}
            </div>
            {/* Divider */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", width:48, background:"#DBEAFE", flexShrink:0 }}>
              <div style={{ fontSize:11, fontWeight:800, color:"#2563EB", writingMode:"vertical-rl", textTransform:"uppercase", letterSpacing:3 }}>+ SmartPrice</div>
            </div>
            {/* Right */}
            <div style={{ background:"rgba(8,145,178,0.05)", border:"1px solid rgba(8,145,178,0.2)", borderLeft:"none", padding:"28px 28px 24px" }}>
              <div style={{ fontSize:11, fontWeight:800, color:C.primary, textTransform:"uppercase", letterSpacing:2, marginBottom:20 }}>+ SmartPrice API adds</div>
              {[
                {icon:"⚡",label:"Right now",val:"€38/MWh · €0.21/kWh"},
                {icon:"🕐",label:"Cheapest tonight",val:"14:00–15:00"},
                {icon:"💶",label:"Rate at best window",val:"€0.04/kWh"},
                {icon:"✅",label:"Good time to charge?",val:"Yes / Wait 2h",good:true},
                {icon:"✅",label:"Cheapest window found",val:"14:00–15:00",good:true},
                {icon:"✅",label:"Save by waiting",val:"€3.20 on 40 kWh",good:true},
              ].map((r,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:i<5?`1px solid rgba(8,145,178,0.1)`:"none" }}>
                  <span style={{ fontSize:16, width:22, textAlign:"center" }}>{r.icon}</span>
                  <span style={{ flex:1, fontSize:13, color:r.good?C.primary:C.muted }}>{r.label}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:r.good?"#16A34A":C.text }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── API QUICK START ────────────────────────────────────── */}
      <div style={{ maxWidth:800, margin:"0 auto", padding:"64px 32px 80px" }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <h2 style={{ fontSize:"clamp(20px,3vw,32px)", fontWeight:900, color:C.text, letterSpacing:"-0.5px", marginBottom:8 }}>Ready in 30 seconds</h2>
          <div style={{ fontSize:14, color:C.muted }}>No registration. No API key. Just call the endpoint.</div>
        </div>
        {[
          { label:"Current EPEX price", endpoint:"GET /api/current", sample:'{ "price_eur_mwh": 38, "price_eur_kwh": 0.211, "level": "very_low", "updated": "2026-07-07T13:00:00Z" }' },
          { label:"Cheapest window today", endpoint:"GET /api/cheapest", sample:'{ "hour": 14, "price_eur_mwh": 17.2, "price_eur_kwh": 0.172, "window_end": 15 }' },
          { label:"Full 24-hour schedule", endpoint:"GET /api/prices/today", sample:'[ { "hour": 0, "price_eur_mwh": 45 }, { "hour": 1, ... } ]' },
        ].map((e,i)=>(
          <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:"20px 24px", marginBottom:16, boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize:11, fontWeight:800, color:C.primary, textTransform:"uppercase", letterSpacing:1.5, marginBottom:8 }}>{e.label}</div>
            <div style={{ fontFamily:"monospace", fontSize:13, color:"#0891B2", fontWeight:700, marginBottom:8 }}>{e.endpoint}</div>
            <div style={{ fontFamily:"monospace", fontSize:12, color:C.muted, background:"rgba(0,0,0,0.02)", borderRadius:8, padding:"10px 14px", lineHeight:1.7 }}>{e.sample}</div>
          </div>
        ))}
        <div style={{ textAlign:"center", marginTop:32, display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
          <a href="/api-docs" style={{ padding:"14px 32px", borderRadius:30, fontSize:14, fontWeight:800, background:"linear-gradient(135deg,#0D7490,#06B6D4)", color:"#fff", textDecoration:"none", boxShadow:"0 6px 20px rgba(8,145,178,0.3)" }}>Full API docs →</a>
          <button onClick={()=>setContactOpen(true)} style={{ padding:"14px 28px", borderRadius:30, fontSize:14, fontWeight:700, background:C.card, color:C.primary, border:`1.5px solid ${C.primary}`, cursor:"pointer" }}>Talk to us about integration</button>
        </div>
      </div>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <div style={{ background:"#0F172A", borderTop:"1px solid rgba(255,255,255,0.07)", padding:"32px", textAlign:"center" }}>
        <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginBottom:12 }}>
          <a href="/" style={{ color:"rgba(255,255,255,0.6)", textDecoration:"none", marginRight:20 }}>← Back to SmartPrice.be</a>
          <a href="/business" style={{ color:"rgba(255,255,255,0.6)", textDecoration:"none", marginRight:20 }}>Business</a>
          <a href="/api-docs" style={{ color:"rgba(255,255,255,0.6)", textDecoration:"none" }}>API Docs</a>
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.25)" }}>Data: Energy-Charts.info · Elia Open Data (CC BY 4.0) · 🇧🇪 Built for Belgium</div>
      </div>

    </div>
  );
}
