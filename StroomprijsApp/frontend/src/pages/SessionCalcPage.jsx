/**
 * SessionCalcPage — /session-calc
 * Two tools in one:
 *   1. Reimbursement Calculator — enter date/hour/kWh → exact EPEX-based reimbursement
 *   2. Fleet Card Invoice Checker — enter session from Velocity/DKV/UTA invoice → see overpayment vs EPEX
 * No registration required. Fetches live EPEX Spot Belgium price history.
 */
import { useState, useEffect } from "react";

const GRID_COST = 0.13;  // Belgian distribution + taxes €/kWh (approximation)
const VAT       = 1.21;  // 21% VAT on Belgian electricity

const C = {
  bg:"#F8FAFC", card:"#FFFFFF",
  border:"rgba(0,0,0,0.08)", shadow:"0 2px 16px rgba(0,0,0,0.07)",
  primary:"#16A34A", bright:"#22C55E",
  text:"#0F172A", muted:"#475569", light:"#94A3B8",
  highlight:"#DCFCE7", border2:"rgba(22,163,74,0.2)",
  red:"#DC2626", amber:"#D97706",
};

function fmtE(n)  { return `€${n.toLocaleString("nl-BE",{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function fmtR(n)  { return `€${n.toLocaleString("nl-BE",{minimumFractionDigits:4,maximumFractionDigits:4})}`; }
function padH(h)  { return String(h).padStart(2,"0"); }

export default function SessionCalcPage({ onNavigate }) {
  const initMode = new URLSearchParams(window.location.search).get("mode") === "fleet" ? "fleet" : "reimburse";
  const [mode, setMode]           = useState(initMode);
  const [priceMap, setPriceMap]   = useState({});
  const [loading, setLoading]     = useState(true);

  const today = new Date().toISOString().split("T")[0];
  const [date, setDate]           = useState(today);
  const [hour, setHour]           = useState(new Date().getHours());
  const [kwh, setKwh]             = useState("");
  const [cardAmount, setCardAmount] = useState("");
  const [sessions, setSessions]   = useState([]);
  const [addError, setAddError]   = useState("");

  // Load 90-day EPEX price history on mount
  useEffect(() => {
    document.title = "EPEX Session Calculator — SmartPrice Business";
    fetch("/api/prices/history?days=90")
      .then(r => r.json())
      .then(d => {
        const map = {};
        (d?.days || []).forEach(day => {
          if (!day.date) return;
          map[day.date] = {};
          (day.prices || day.hourly || []).forEach(h => {
            const hr  = h.hour ?? h.position ?? 0;
            const mwh = h.price_eur_mwh ?? h.price ?? 0;
            if (mwh > 0) {
              // All-in consumer price: spot + VAT + grid/taxes
              map[day.date][hr] = Math.max(0.04, (mwh / 1000) * VAT + GRID_COST);
            }
          });
        });
        setPriceMap(map);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function addSession(e) {
    e.preventDefault();
    const kwhN = parseFloat(kwh);
    if (!kwh || kwhN <= 0) { setAddError("Enter a valid kWh amount."); return; }
    const dayPrices = priceMap[date];
    const epexRate  = dayPrices?.[parseInt(hour)];
    if (!epexRate) {
      setAddError(`No EPEX data for ${date} at ${padH(hour)}:00. Only the last 90 days are available.`);
      return;
    }
    const reimb  = kwhN * epexRate;
    const cardN  = parseFloat(cardAmount) || null;
    const over   = cardN != null ? cardN - reimb : null;
    setSessions(p => [...p, { date, hour: +hour, kwh: kwhN, epexRate, reimb, cardN, over }]);
    setKwh(""); setCardAmount(""); setAddError("");
  }

  function removeSession(i) { setSessions(p => p.filter((_,j) => j !== i)); }

  function exportCSV() {
    const header = mode === "fleet"
      ? "Date,Hour,kWh,EPEX rate (€/kWh),EPEX cost (€),Card charged (€),Overpayment (€)"
      : "Date,Hour,kWh,EPEX rate (€/kWh),Reimbursement (€)";
    const rows = sessions.map(s =>
      mode === "fleet"
        ? `${s.date},${padH(s.hour)}:00,${s.kwh},${s.epexRate.toFixed(4)},${s.reimb.toFixed(2)},${s.cardN ?? ""},${s.over != null ? s.over.toFixed(2) : ""}`
        : `${s.date},${padH(s.hour)}:00,${s.kwh},${s.epexRate.toFixed(4)},${s.reimb.toFixed(2)}`
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `smartprice-sessions-${today}.csv`;
    a.click();
  }

  const totKwh  = sessions.reduce((s,r) => s + r.kwh,   0);
  const totReim = sessions.reduce((s,r) => s + r.reimb,  0);
  const totCard = sessions.reduce((s,r) => s + (r.cardN || 0), 0);
  const totOver = sessions.reduce((s,r) => s + (r.over  || 0), 0);
  const hasCard = sessions.some(r => r.cardN != null);

  const inp = { width:"100%", padding:"10px 12px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:14, color:C.text, background:C.bg, outline:"none", fontFamily:"inherit" };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'DM Sans',system-ui,sans-serif", color:C.text }}>

      {/* Nav */}
      <nav style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"0 24px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100, boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }} onClick={() => onNavigate?.("/business")}>
          <span style={{ fontSize:20 }}>⚡</span>
          <span style={{ fontWeight:800, fontSize:16, color:C.primary }}>SmartPrice</span>
          <span style={{ fontSize:12, color:"#1E40AF", fontWeight:800, background:"#EFF6FF", padding:"2px 10px", borderRadius:20, border:"1px solid rgba(30,64,175,0.2)" }}>Business</span>
        </div>
        <a href="mailto:info@smartprice.be" style={{ fontSize:13, color:C.muted, textDecoration:"none" }}>info@smartprice.be</a>
      </nav>

      <div style={{ maxWidth:860, margin:"0 auto", padding:"40px 20px 80px" }}>

        {/* Hero */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:C.highlight, border:`1px solid ${C.border2}`, borderRadius:30, padding:"5px 16px", marginBottom:14, fontSize:12, color:C.primary, fontWeight:700 }}>
            ⚡ Live EPEX Spot Belgium · 90-day history
          </div>
          <h1 style={{ fontSize:"clamp(24px,4vw,36px)", fontWeight:900, letterSpacing:"-0.8px", marginBottom:10 }}>
            EPEX Session Calculator
          </h1>
          <p style={{ fontSize:15, color:C.muted, maxWidth:560, margin:"0 auto", lineHeight:1.75 }}>
            Look up the real EPEX electricity price for any past charging session — calculate exact CIR 92-compliant reimbursements or audit your fleet card invoice vs. market rates.
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{ display:"flex", gap:0, background:C.card, border:`1px solid ${C.border}`, borderRadius:16, overflow:"hidden", marginBottom:28, maxWidth:500, margin:"0 auto 28px" }}>
          {[
            { id:"reimburse", icon:"💶", label:"Reimbursement Calculator", sub:"Home charging · CIR 92" },
            { id:"fleet",     icon:"💳", label:"Fleet Card Invoice Check",  sub:"Velocity · DKV · UTA" },
          ].map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              style={{ flex:1, padding:"14px 8px", border:"none", cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s",
                background: mode === m.id ? C.primary : "transparent",
                color:      mode === m.id ? "#fff"    : C.muted }}>
              <div style={{ fontSize:18, marginBottom:4 }}>{m.icon}</div>
              <div style={{ fontSize:13, fontWeight:800 }}>{m.label}</div>
              <div style={{ fontSize:10, fontWeight:500, opacity:0.75, marginTop:2 }}>{m.sub}</div>
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign:"center", padding:"20px", color:C.muted, fontSize:13 }}>
            Loading 90 days of EPEX price data…
          </div>
        )}

        {/* Context banner per mode */}
        {!loading && (
          <div style={{ background: mode==="fleet" ? "rgba(220,38,38,0.04)" : "rgba(22,163,74,0.04)",
            border: `1px solid ${mode==="fleet" ? "rgba(220,38,38,0.15)" : C.border2}`,
            borderRadius:12, padding:"12px 18px", marginBottom:20, fontSize:13, color:C.muted, lineHeight:1.65 }}>
            {mode === "reimburse"
              ? <><strong style={{color:C.text}}>How to use:</strong> Enter the date, time, and kWh for a charging session. SmartPrice looks up the real EPEX Spot price at that exact hour and calculates the exact CIR 92-compliant reimbursement amount.</>
              : <><strong style={{color:C.text}}>How to use:</strong> Take a session from your Velocity, DKV, or UTA invoice (date, time, kWh, amount charged). SmartPrice shows the EPEX market price at that hour so you can see exactly how much the network overcharged vs. real market rates.</>
            }
          </div>
        )}

        {/* Add session form */}
        {!loading && (
          <div style={{ background:C.card, borderRadius:20, border:`1px solid ${C.border}`, boxShadow:C.shadow, padding:"26px 28px", marginBottom:22 }}>
            <div style={{ fontSize:11, fontWeight:800, color:C.primary, textTransform:"uppercase", letterSpacing:2, marginBottom:18 }}>
              Add a session
            </div>
            <form onSubmit={addSession}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:14, marginBottom:14 }}>

                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:5 }}>Date *</label>
                  <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} style={inp} />
                </div>

                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:5 }}>Hour *</label>
                  <select value={hour} onChange={e => setHour(e.target.value)} style={{ ...inp, cursor:"pointer" }}>
                    {Array.from({length:24},(_,i) => (
                      <option key={i} value={i}>{padH(i)}:00 – {padH(i+1)}:00</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:5 }}>kWh charged *</label>
                  <input type="number" min="0.1" step="0.1" value={kwh} onChange={e => setKwh(e.target.value)} placeholder="e.g. 45.0" style={inp} />
                </div>

                {mode === "fleet" && (
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:5 }}>Card charged (€) *</label>
                    <div style={{ position:"relative" }}>
                      <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:C.muted, fontWeight:700, fontSize:14 }}>€</span>
                      <input type="number" min="0" step="0.01" value={cardAmount} onChange={e => setCardAmount(e.target.value)} placeholder="e.g. 22.50"
                        style={{ ...inp, paddingLeft:26 }} />
                    </div>
                  </div>
                )}
              </div>

              {addError && (
                <div style={{ fontSize:12, color:C.red, marginBottom:10, fontWeight:600 }}>{addError}</div>
              )}

              <button type="submit"
                style={{ padding:"11px 28px", borderRadius:30, fontSize:14, fontWeight:800, background:`linear-gradient(135deg,${C.primary},${C.bright})`, color:"#fff", border:"none", cursor:"pointer", boxShadow:"0 4px 16px rgba(22,163,74,0.25)", fontFamily:"inherit" }}>
                + Add session
              </button>
            </form>
          </div>
        )}

        {/* Sessions table */}
        {sessions.length > 0 && (
          <div style={{ background:C.card, borderRadius:20, border:`1px solid ${C.border}`, boxShadow:C.shadow, overflow:"hidden", marginBottom:20 }}>
            <div style={{ padding:"18px 24px 0", fontSize:11, fontWeight:800, color:C.muted, textTransform:"uppercase", letterSpacing:2 }}>
              {sessions.length} session{sessions.length!==1?"s":""}
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:C.bg }}>
                    {[
                      "Date", "Time", "kWh",
                      "EPEX rate (all-in)",
                      mode==="reimburse" ? "Reimbursement" : "EPEX cost",
                      ...(mode==="fleet" ? ["Card charged","Overpayment"] : []),
                      ""
                    ].map(h => (
                      <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontWeight:700, color:C.muted, fontSize:11, textTransform:"uppercase", letterSpacing:1, borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s,i) => (
                    <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
                      <td style={{ padding:"12px 16px", fontWeight:600 }}>{s.date}</td>
                      <td style={{ padding:"12px 16px", color:C.muted }}>{padH(s.hour)}:00</td>
                      <td style={{ padding:"12px 16px" }}>{s.kwh.toFixed(1)} kWh</td>
                      <td style={{ padding:"12px 16px", color:C.primary, fontWeight:700, whiteSpace:"nowrap" }}>{fmtR(s.epexRate)}/kWh</td>
                      <td style={{ padding:"12px 16px", fontWeight:800, color:C.primary }}>{fmtE(s.reimb)}</td>
                      {mode==="fleet" && (
                        <td style={{ padding:"12px 16px", color:C.muted }}>{s.cardN != null ? fmtE(s.cardN) : "—"}</td>
                      )}
                      {mode==="fleet" && (
                        <td style={{ padding:"12px 16px", fontWeight:800, color: s.over > 0 ? C.red : C.primary }}>
                          {s.over != null ? (s.over > 0 ? "+" : "") + fmtE(s.over) : "—"}
                        </td>
                      )}
                      <td style={{ padding:"12px 16px" }}>
                        <button onClick={() => removeSession(i)}
                          style={{ background:"none", border:"none", color:C.light, cursor:"pointer", fontSize:18, lineHeight:1, padding:0 }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary + export */}
            <div style={{ background:`linear-gradient(135deg,rgba(22,163,74,0.05),rgba(34,197,94,0.02))`, borderTop:`1px solid ${C.border}`, padding:"20px 24px", display:"flex", flexWrap:"wrap", gap:24, alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", gap:28, flexWrap:"wrap" }}>
                <div>
                  <div style={{ fontSize:10, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:1.2 }}>Total kWh</div>
                  <div style={{ fontSize:22, fontWeight:900, color:C.text }}>{totKwh.toFixed(1)}</div>
                </div>
                <div>
                  <div style={{ fontSize:10, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:1.2 }}>
                    {mode==="reimburse" ? "Total reimbursement" : "Total EPEX cost"}
                  </div>
                  <div style={{ fontSize:22, fontWeight:900, color:C.primary }}>{fmtE(totReim)}</div>
                </div>
                {mode==="fleet" && hasCard && totCard > 0 && (
                  <>
                    <div>
                      <div style={{ fontSize:10, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:1.2 }}>Total card charged</div>
                      <div style={{ fontSize:22, fontWeight:900, color:C.muted }}>{fmtE(totCard)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:10, color:C.red, fontWeight:700, textTransform:"uppercase", letterSpacing:1.2 }}>Total overpayment</div>
                      <div style={{ fontSize:22, fontWeight:900, color:C.red }}>{fmtE(totOver)}</div>
                    </div>
                  </>
                )}
              </div>
              <button onClick={exportCSV}
                style={{ padding:"10px 22px", borderRadius:20, fontSize:13, fontWeight:700, background:C.highlight, border:`1px solid ${C.border2}`, color:C.primary, cursor:"pointer" }}>
                Export CSV →
              </button>
            </div>
          </div>
        )}

        {sessions.length === 0 && !loading && (
          <div style={{ textAlign:"center", padding:"32px", color:C.light, fontSize:13, background:C.card, borderRadius:16, border:`1px solid ${C.border}` }}>
            Add your first session above to see the EPEX price breakdown.
          </div>
        )}

        {/* How it works */}
        <div style={{ background:C.card, borderRadius:16, border:`1px solid ${C.border}`, padding:"22px 28px", marginTop:20 }}>
          <div style={{ fontSize:11, fontWeight:800, color:C.muted, textTransform:"uppercase", letterSpacing:2, marginBottom:14 }}>How the prices are calculated</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, fontSize:13, color:C.muted, lineHeight:1.75 }}>
            <div>
              <strong style={{color:C.text}}>EPEX Spot Belgium</strong><br/>
              Real-time hourly electricity prices from the European Power Exchange. The actual wholesale market price Belgian grid operators pay — updated every hour.
            </div>
            <div>
              <strong style={{color:C.text}}>All-in consumer price</strong><br/>
              EPEX spot × 1.21 VAT + €0.13/kWh grid & taxes = the actual consumer price at that exact hour. This is what CIR 92 (art. 31) reimbursement should be based on.
            </div>
            <div>
              <strong style={{color:C.text}}>Fleet card overpayment</strong><br/>
              Velocity, DKV, and UTA charge fixed network tariffs regardless of what the market price is at that hour. The difference is your direct overpayment per session.
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ marginTop:28, background:`linear-gradient(135deg,#15803D,#16A34A)`, borderRadius:20, padding:"28px 32px", color:"#fff", textAlign:"center" }}>
          <div style={{ fontSize:20, fontWeight:900, marginBottom:8 }}>Want this automated for your entire fleet?</div>
          <p style={{ fontSize:14, opacity:0.85, marginBottom:20, maxWidth:480, margin:"0 auto 20px", lineHeight:1.7 }}>
            SmartPrice Business can generate monthly reimbursement reports for all your drivers and analyse your fleet card invoices automatically — no manual entry required.
          </p>
          <button onClick={() => onNavigate?.("/business?lead=fleet")}
            style={{ padding:"12px 32px", borderRadius:30, fontSize:14, fontWeight:800, background:"#FCD34D", color:"#15803D", border:"none", cursor:"pointer", boxShadow:"0 4px 20px rgba(0,0,0,0.2)" }}>
            Talk to SmartPrice Business →
          </button>
        </div>

      </div>

      <div style={{ borderTop:`1px solid ${C.border}`, background:C.card, padding:"20px 24px", textAlign:"center", fontSize:12, color:C.light }}>
        SmartPrice.be Business · <a href="mailto:info@smartprice.be" style={{color:C.muted}}>info@smartprice.be</a> · GDPR compliant · EU hosted
      </div>
    </div>
  );
}
