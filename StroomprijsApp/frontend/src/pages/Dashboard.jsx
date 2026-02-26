/**
 * pages/Dashboard.jsx
 * Main price dashboard — same as before but now user-aware
 * Shows user name, their supplier preference, saved alerts
 */

import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell,
} from "recharts";
import { useAuth }       from "../context/AuthContext";
import { usePrices, useCurrentPrice, useCheapestHours } from "../hooks/usePrices";
import { SUPPLIERS, getSupplierPrice, getPriceColor, getPriceLabel } from "../utils/priceUtils";

// ── Tooltip ──────────────────────────────────────────────────
function PriceTooltip({ active, payload, label, supplier }) {
  if (!active || !payload?.length) return null;
  const mwh  = payload[0]?.value;
  if (mwh == null) return null;
  const sup  = SUPPLIERS.find(s => s.name === supplier);
  const lbl  = getPriceLabel(mwh);
  const col  = getPriceColor(mwh);
  return (
    <div style={{
      background: "rgba(8,12,22,0.97)", border: `1px solid ${col}44`,
      borderRadius: 14, padding: "14px 18px",
    }}>
      <div style={{ color: "#667", fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ color: col, fontSize: 24, fontWeight: 800, fontFamily: "monospace" }}>
        €{mwh.toFixed(1)}<span style={{ fontSize: 12, color: "#667" }}> /MWh</span>
      </div>
      {sup && (
        <div style={{ color: "#aaa", fontSize: 12, marginTop: 3 }}>
          {sup.name}: <span style={{ color: "#fff" }}>€{getSupplierPrice(mwh / 1000, sup).toFixed(4)}/kWh</span>
        </div>
      )}
      <div style={{ color: col, fontSize: 12, fontWeight: 600, marginTop: 6 }}>
        {lbl.emoji} {lbl.text} — {lbl.tip}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 14, padding: "14px 16px", flex: 1, minWidth: 110,
    }}>
      <div style={{ fontSize: 10, color: "#556", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: color || "#fff", fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}

export default function Dashboard({ onGoProfile }) {
  const { user, updatePreferences } = useAuth();
  const { prices, stats, loading, error, lastFetched, source, refetch } = usePrices();
  const { current }  = useCurrentPrice();
  const cheapest     = useCheapestHours(5);

  // Use saved supplier from user preferences
  const [supplier,       setSupplier]       = useState(user?.preferences?.supplier || "Bolt Energy");
  const [tab,            setTab]            = useState("today");
  const [alertThreshold, setAlertThreshold] = useState(user?.preferences?.alertThreshold || 80);
  const [alertActive,    setAlertActive]    = useState(user?.preferences?.alertEnabled || false);
  const [notification,   setNotification]   = useState(null);

  // Auto-save supplier change to backend
  const changeSupplier = async (s) => {
    setSupplier(s);
    try { await updatePreferences({ supplier: s }); } catch {}
  };

  const toggleAlert = async () => {
    const next = !alertActive;
    setAlertActive(next);
    try { await updatePreferences({ alertEnabled: next, alertThreshold }); } catch {}
  };

  const saveAlertThreshold = async (v) => {
    setAlertThreshold(v);
    try { await updatePreferences({ alertThreshold: v }); } catch {}
  };

  // Alert trigger
  useEffect(() => {
    if (!current || !alertActive) return;
    if (current.price_eur_mwh < alertThreshold) {
      setNotification(`⚡ Price alert! Now €${current.price_eur_mwh.toFixed(0)}/MWh — below your €${alertThreshold}/MWh threshold`);
      setTimeout(() => setNotification(null), 6000);
    }
  }, [current, alertThreshold, alertActive]);

  const todayData    = prices.filter(p => p.day === "today");
  const tomorrowData = prices.filter(p => p.day === "tomorrow");
  const chartData    = tab === "tomorrow" ? tomorrowData : todayData;
  const mwh          = current?.price_eur_mwh ?? null;
  const lbl          = mwh != null ? getPriceLabel(mwh) : null;
  const sup          = SUPPLIERS.find(s => s.name === supplier);
  const retailKwh    = mwh != null && sup ? getSupplierPrice(mwh / 1000, sup) : null;

  const tabs = [
    { id: "today",    label: "📈 Today" },
    { id: "tomorrow", label: "⏩ Tomorrow" },
    { id: "cheapest", label: "💚 Best Hours" },
    { id: "compare",  label: "🏢 Suppliers" },
    { id: "alerts",   label: "🔔 Alerts" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 20% 20%, #0A1628 0%, #060B14 60%, #0A0F1A 100%)",
      color: "#E8EDF5", fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      {/* Notification banner */}
      {notification && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 999,
          background: "linear-gradient(135deg,#00C896,#009970)",
          borderRadius: 14, padding: "14px 20px", maxWidth: 340,
          boxShadow: "0 8px 32px rgba(0,200,150,0.4)",
          fontSize: 14, fontWeight: 600, color: "#fff",
        }}>{notification}</div>
      )}

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 18px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 28 }}>🇧🇪</span>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: "-1px" }}>StroomSlim</h1>
              <span style={{ fontSize: 11, color: "#00C896", background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.25)", borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>● LIVE</span>
            </div>
            <div style={{ fontSize: 13, color: "#556" }}>
              {source || "Energy-Charts / Elia Open Data"} · Belgium
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {/* Live price */}
            <div style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${mwh != null ? getPriceColor(mwh) + "44" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 18, padding: "12px 20px", textAlign: "right",
            }}>
              {loading ? <div style={{ color: "#556", fontSize: 13 }}>Loading…</div> :
               error   ? <div style={{ color: "#EF4444", fontSize: 12 }}>⚠️ {error}</div> :
               mwh != null ? (<>
                <div style={{ fontSize: 11, color: "#556", marginBottom: 2 }}>NOW · EPEX Spot</div>
                <div style={{ fontSize: 30, fontWeight: 900, fontFamily: "monospace", color: getPriceColor(mwh) }}>
                  €{mwh.toFixed(1)}<span style={{ fontSize: 13, color: "#667", fontWeight: 400 }}> /MWh</span>
                </div>
                <div style={{ fontSize: 12, color: "#888" }}>{lbl?.emoji} {lbl?.text}</div>
                {retailKwh && <div style={{ fontSize: 11, color: "#667", marginTop: 2 }}>{supplier}: €{retailKwh.toFixed(4)}/kWh</div>}
               </>) : null}
            </div>

            {/* User menu */}
            <button onClick={onGoProfile} style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 14, padding: "10px 16px", cursor: "pointer", color: "#E8EDF5",
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "linear-gradient(135deg,#0D9488,#1A56A4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, fontWeight: 800, color: "#fff",
              }}>
                {(user?.name || user?.email || "?")[0].toUpperCase()}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name || "My Account"}</div>
                <div style={{ fontSize: 11, color: "#556" }}>View profile →</div>
              </div>
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        {!loading && !error && stats?.today && (
          <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
            <Stat label="Today Min" value={`€${stats.today.min?.toFixed(0)}`} color="#00C896" />
            <Stat label="Today Avg" value={`€${stats.today.avg?.toFixed(0)}`} color="#F59E0B" />
            <Stat label="Today Max" value={`€${stats.today.max?.toFixed(0)}`} color="#EF4444" />
            <Stat label="Negative Hrs" value={stats.today.negative_hours || 0} color="#00E5FF" />
          </div>
        )}

        {/* ── Supplier selector ── */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: "#556", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Your Supplier {user?.preferences?.supplier === supplier ? "· ✅ saved" : "· saving…"}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {SUPPLIERS.map(s => (
              <button key={s.name} onClick={() => changeSupplier(s.name)} style={{
                padding: "7px 14px", borderRadius: 30, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border:     supplier === s.name ? `1px solid ${s.color}` : "1px solid rgba(255,255,255,0.1)",
                background: supplier === s.name ? `${s.color}22` : "rgba(255,255,255,0.03)",
                color:      supplier === s.name ? s.color : "#778", transition: "all 0.2s",
              }}>{s.name}</button>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: "flex", gap: 4, marginBottom: 18, background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 4, width: "fit-content", flexWrap: "wrap" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "7px 13px", borderRadius: 9, fontSize: 12, fontWeight: 600,
              border: "none", cursor: "pointer", transition: "all 0.2s",
              background: tab === t.id ? "rgba(255,255,255,0.1)" : "transparent",
              color: tab === t.id ? "#fff" : "#667",
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── Chart ── */}
        {(tab === "today" || tab === "tomorrow") && (
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "20px 8px 12px", marginBottom: 20 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "50px 0", color: "#556" }}>⚡ Fetching real Belgian prices…</div>
            ) : error ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ color: "#EF4444", marginBottom: 12 }}>{error}</div>
                <button onClick={refetch} style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444", borderRadius: 10, padding: "8px 20px", cursor: "pointer" }}>Retry</button>
              </div>
            ) : chartData.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 0", color: "#556" }}>
                {tab === "tomorrow" ? "Tomorrow's prices publish at 13:00 CET" : "No data"}
              </div>
            ) : (
              <>
                <div style={{ paddingLeft: 14, marginBottom: 14 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{tab === "today" ? "Today's" : "Tomorrow's"} Hourly Prices · Belgium</div>
                  <div style={{ fontSize: 11, color: "#556", marginTop: 2 }}>EPEX Spot · {lastFetched && `Updated ${lastFetched.toLocaleTimeString("nl-BE")}`}</div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData.map(p => ({ ...p, price: p.price_eur_mwh }))} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00C896" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00C896" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="hour_label" tick={{ fill: "#556", fontSize: 11 }} tickLine={false} interval={2} />
                    <YAxis tick={{ fill: "#556", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `€${v}`} domain={["auto", "auto"]} />
                    <Tooltip content={<PriceTooltip supplier={supplier} />} />
                    <ReferenceLine y={0} stroke="rgba(0,229,255,0.3)" strokeDasharray="4 4" />
                    <ReferenceLine y={alertThreshold} stroke="#F59E0B" strokeDasharray="4 4"
                      label={{ value: "⚠ Alert", fill: "#F59E0B", fontSize: 10, position: "insideTopRight" }} />
                    {tab === "today" && current && (
                      <ReferenceLine x={`${String(current.hour ?? new Date().getHours()).padStart(2, "0")}:00`}
                        stroke="rgba(255,255,255,0.25)" strokeWidth={2}
                        label={{ value: "NOW", fill: "#fff", fontSize: 11, position: "top" }} />
                    )}
                    <Area type="monotone" dataKey="price" stroke="#00C896" strokeWidth={2.5} fill="url(#grad)"
                      dot={props => props.payload?.is_current
                        ? <circle key={props.key} cx={props.cx} cy={props.cy} r={7} fill={getPriceColor(props.payload.price_eur_mwh)} stroke="#fff" strokeWidth={2} />
                        : <g key={props.key} />}
                      activeDot={{ r: 6, fill: "#00C896" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        )}

        {/* ── Cheapest ── */}
        {tab === "cheapest" && (
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>💚 5 Cheapest Upcoming Hours</div>
            <div style={{ fontSize: 13, color: "#556", marginBottom: 20 }}>Run your EV, washing machine, dishwasher in these windows</div>
            {cheapest.length === 0
              ? <div style={{ color: "#556", textAlign: "center", padding: "40px 0" }}>Loading…</div>
              : cheapest.map((h, i) => {
                const ts = new Date(h.timestamp);
                const lbl_ = getPriceLabel(h.price_eur_mwh);
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", marginBottom: 8, background: "rgba(0,200,150,0.04)", border: "1px solid rgba(0,200,150,0.15)", borderRadius: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: `rgba(0,200,150,${0.25 - i * 0.04})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#00C896" }}>{i + 1}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{ts.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}</div>
                        <div style={{ fontSize: 11, color: "#556" }}>{ts.toLocaleDateString("nl-BE", { weekday: "short", day: "numeric", month: "short" })}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: getPriceColor(h.price_eur_mwh), fontWeight: 800, fontSize: 18, fontFamily: "monospace" }}>€{h.price_eur_mwh.toFixed(1)}/MWh</div>
                      <div style={{ fontSize: 11, color: "#667" }}>{lbl_.emoji} {lbl_.text}</div>
                    </div>
                  </div>
                );
              })
            }
            {stats?.today && (
              <div style={{ marginTop: 14, padding: "12px 16px", background: "rgba(0,130,255,0.05)", border: "1px solid rgba(0,130,255,0.15)", borderRadius: 12, fontSize: 13, color: "#778" }}>
                💡 Running a 2 kW appliance at cheapest vs peak saves{" "}
                <strong style={{ color: "#00C896" }}>€{(((stats.today.max - stats.today.min) / 1000) * 2).toFixed(3)}</strong> today
              </div>
            )}
          </div>
        )}

        {/* ── Compare ── */}
        {tab === "compare" && mwh != null && (
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🏢 Supplier Comparison</div>
            <div style={{ fontSize: 13, color: "#556", marginBottom: 20 }}>At current spot €{mwh.toFixed(1)}/MWh</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={SUPPLIERS.map(s => ({ name: s.name, price: getSupplierPrice(mwh / 1000, s), color: s.color }))} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#778", fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: "#556", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `€${v.toFixed(3)}`} domain={["auto", "auto"]} />
                <Tooltip formatter={v => [`€${v.toFixed(4)}/kWh`, "Retail"]} contentStyle={{ background: "rgba(8,12,22,0.97)", border: "1px solid #334", borderRadius: 10 }} labelStyle={{ color: "#fff" }} />
                <Bar dataKey="price" radius={[6, 6, 0, 0]}>
                  {SUPPLIERS.map((s, i) => <Cell key={i} fill={s.color} opacity={supplier === s.name ? 1 : 0.45} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ marginTop: 16 }}>
              {[...SUPPLIERS].sort((a, b) => getSupplierPrice(mwh / 1000, a) - getSupplierPrice(mwh / 1000, b)).map((s, i) => (
                <div key={s.name} onClick={() => changeSupplier(s.name)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", marginBottom: 6, cursor: "pointer", borderRadius: 12, background: supplier === s.name ? `${s.color}12` : "rgba(255,255,255,0.02)", border: `1px solid ${supplier === s.name ? s.color + "44" : "rgba(255,255,255,0.06)"}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 9, height: 9, borderRadius: "50%", background: s.color }} />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</span>
                    {i === 0 && <span style={{ fontSize: 10, color: "#00C896", background: "rgba(0,200,150,0.1)", padding: "2px 7px", borderRadius: 8 }}>Cheapest</span>}
                  </div>
                  <span style={{ fontFamily: "monospace", color: s.color, fontWeight: 700, fontSize: 13 }}>€{getSupplierPrice(mwh / 1000, s).toFixed(4)}/kWh</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Alerts ── */}
        {tab === "alerts" && (
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🔔 Price Alerts</div>
            <div style={{ fontSize: 13, color: "#556", marginBottom: 22 }}>Preferences saved to your account automatically</div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 10 }}>
                Alert when price below: <strong style={{ color: "#F59E0B" }}>€{alertThreshold}/MWh</strong>
              </div>
              <input type="range" min={-20} max={200} step={5} value={alertThreshold}
                onChange={e => saveAlertThreshold(+e.target.value)}
                style={{ width: "100%", accentColor: "#F59E0B", cursor: "pointer" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#445", marginTop: 4 }}>
                <span>€-20</span><span>€200/MWh</span>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: alertActive ? "rgba(0,200,150,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${alertActive ? "rgba(0,200,150,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: 14 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Alert {alertActive ? "🟢 Active" : "⚫ Inactive"}</div>
                <div style={{ fontSize: 12, color: "#667", marginTop: 2 }}>Saved to your account</div>
              </div>
              <button onClick={toggleAlert} style={{ padding: "8px 20px", borderRadius: 30, fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", background: alertActive ? "rgba(239,68,68,0.2)" : "rgba(0,200,150,0.2)", color: alertActive ? "#EF4444" : "#00C896" }}>
                {alertActive ? "Disable" : "Enable"}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontSize: 11, color: "#334" }}>
          <span>Data: Energy-Charts.info · Elia Open Data (CC BY 4.0) · ENTSO-E</span>
          <span>Prices refresh every 15 min · Not financial advice</span>
        </div>
      </div>
      <style>{`* { box-sizing: border-box; } a { text-decoration: none; } button { font-family: inherit; }`}</style>
    </div>
  );
}
