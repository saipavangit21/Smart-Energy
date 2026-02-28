/**
 * pages/Dashboard.jsx — StrooomSlim v2
 * Mobile-first responsive layout
 */

import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell,
} from "recharts";
import { useAuth }       from "../context/AuthContext";
import { usePrices, useCurrentPrice, useCheapestHours } from "../hooks/usePrices";
import { SUPPLIERS, getSupplierPrice, getPriceColor, getPriceLabel } from "../utils/priceUtils";

// ── Mobile detection hook ─────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

// ── Tooltip ──────────────────────────────────────────────────
function PriceTooltip({ active, payload, label, supplier }) {
  if (!active || !payload?.length) return null;
  const mwh = payload[0]?.value;
  if (mwh == null) return null;
  const sup = SUPPLIERS.find(s => s.name === supplier);
  const lbl = getPriceLabel(mwh);
  const col = getPriceColor(mwh);
  return (
    <div style={{
      background: "rgba(6,11,20,0.98)", border: `1px solid ${col}55`,
      borderRadius: 14, padding: "12px 16px", fontSize: 13,
    }}>
      <div style={{ color: "#556", fontSize: 11, marginBottom: 3 }}>{label}</div>
      <div style={{ color: col, fontSize: 22, fontWeight: 800, fontFamily: "monospace" }}>
        €{mwh.toFixed(1)}<span style={{ fontSize: 11, color: "#556" }}>/MWh</span>
      </div>
      {sup && <div style={{ color: "#aaa", fontSize: 11, marginTop: 2 }}>{sup.name}: €{getSupplierPrice(mwh / 1000, sup).toFixed(4)}/kWh</div>}
      <div style={{ color: col, fontSize: 11, fontWeight: 600, marginTop: 4 }}>{lbl.emoji} {lbl.tip}</div>
    </div>
  );
}

export default function Dashboard({ onGoProfile }) {
  const isMobile = useIsMobile();
  const { user, updatePreferences, logout } = useAuth();
  const { prices, stats, loading, error, lastFetched, source, refetch } = usePrices();
  const { current } = useCurrentPrice();
  const cheapest    = useCheapestHours(5);

  const [supplier,       setSupplier]       = useState(user?.preferences?.supplier || "Bolt Energy");
  const [tab,            setTab]            = useState("today");
  const [showMenu,       setShowMenu]       = useState(false);
  const [alertThreshold, setAlertThreshold] = useState(user?.preferences?.alertThreshold || 80);
  const [alertActive,    setAlertActive]    = useState(user?.preferences?.alertsEnabled || false);
  const [notification,   setNotification]   = useState(null);
  const [history,        setHistory]        = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedDay,    setSelectedDay]    = useState(null);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const changeSupplier = async (s) => {
    setSupplier(s);
    try { await updatePreferences({ supplier: s }); } catch {}
  };
  const toggleAlert = async () => {
    const next = !alertActive;
    setAlertActive(next);
    try { await updatePreferences({ alertsEnabled: next, alertThreshold }); } catch {}
  };
  const saveAlertThreshold = async (v) => {
    setAlertThreshold(v);
    try { await updatePreferences({ alertThreshold: v }); } catch {}
  };

  useEffect(() => {
    if (!current || !alertActive) return;
    if (current.price_eur_mwh < alertThreshold) {
      setNotification(`⚡ €${current.price_eur_mwh.toFixed(0)}/MWh — below your €${alertThreshold} threshold!`);
      setTimeout(() => setNotification(null), 6000);
    }
  }, [current, alertThreshold, alertActive]);

  useEffect(() => {
    if (tab !== "history" || history.length > 0) return;
    setHistoryLoading(true);
    fetch("/api/prices/history?days=7")
      .then(r => r.json())
      .then(d => { if (d.success) setHistory(d.days); })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [tab]);

  const todayData = prices.filter(p => p.day === "today");
  const tomorrowData = prices.filter(p => p.day === "tomorrow");
  const chartData = tab === "tomorrow" ? tomorrowData : todayData;
  const mwh = current?.price_eur_mwh ?? null;
  const lbl = mwh != null ? getPriceLabel(mwh) : null;
  const sup = SUPPLIERS.find(s => s.name === supplier);
  const retailKwh = mwh != null && sup ? getSupplierPrice(mwh / 1000, sup) : null;

  const tabs = [
    { id: "today",    label: isMobile ? "📈" : "📈 Today",      title: "Today" },
    { id: "tomorrow", label: isMobile ? "⏩" : "⏩ Tomorrow",    title: "Tomorrow" },
    { id: "cheapest", label: isMobile ? "💚" : "💚 Best Hours", title: "Best Hours" },
    { id: "compare",  label: isMobile ? "🏢" : "🏢 Suppliers",  title: "Suppliers" },
    { id: "alerts",   label: isMobile ? "🔔" : "🔔 Alerts",     title: "Alerts" },
    { id: "history",  label: isMobile ? "📅" : "📅 History",    title: "History" },
  ];

  const cardStyle = {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: isMobile ? 16 : 20,
    padding: isMobile ? 16 : 24,
    marginBottom: 14,
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 20% 20%, #0A1628 0%, #060B14 60%, #0A0F1A 100%)",
      color: "#E8EDF5", fontFamily: "'DM Sans', system-ui, sans-serif",
      paddingBottom: isMobile ? 80 : 0,
    }}>

      {/* Notification */}
      {notification && (
        <div style={{
          position: "fixed", top: isMobile ? "auto" : 20, bottom: isMobile ? 90 : "auto",
          left: isMobile ? 16 : "auto", right: isMobile ? 16 : 20,
          zIndex: 999, background: "linear-gradient(135deg,#00C896,#009970)",
          borderRadius: 14, padding: "14px 18px",
          boxShadow: "0 8px 32px rgba(0,200,150,0.4)",
          fontSize: 13, fontWeight: 600, color: "#fff",
        }}>{notification}</div>
      )}

      {/* ── TOP HEADER ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(6,11,20,0.92)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: isMobile ? "12px 16px" : "14px 24px",
      }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: isMobile ? 22 : 26 }}>🇧🇪</span>
            <div>
              <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 900, letterSpacing: "-0.5px", lineHeight: 1 }}>StrooomSlim</div>
              {!isMobile && <div style={{ fontSize: 11, color: "#556" }}>{source || "Energy-Charts / Elia"} · Belgium</div>}
            </div>
            <span style={{ fontSize: 10, color: "#00C896", background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.25)", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>● LIVE</span>
          </div>

          {/* Right: price + menu */}
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12 }}>

            {/* Current price pill */}
            {mwh != null && (
              <div style={{
                background: `${getPriceColor(mwh)}15`,
                border: `1px solid ${getPriceColor(mwh)}44`,
                borderRadius: 12, padding: isMobile ? "6px 10px" : "8px 14px",
                textAlign: "right",
              }}>
                <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, fontFamily: "monospace", color: getPriceColor(mwh), lineHeight: 1 }}>
                  €{mwh.toFixed(isMobile ? 0 : 1)}
                </div>
                {!isMobile && <div style={{ fontSize: 10, color: "#556" }}>/MWh now</div>}
                {isMobile && retailKwh && <div style={{ fontSize: 9, color: "#556" }}>€{retailKwh.toFixed(3)}/kWh</div>}
              </div>
            )}

            {/* Avatar menu */}
            <div ref={menuRef} style={{ position: "relative" }}>
              <button onClick={() => setShowMenu(m => !m)} style={{
                width: isMobile ? 38 : 44, height: isMobile ? 38 : 44,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#0D9488,#1A56A4)",
                border: "2px solid rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: isMobile ? 15 : 17, fontWeight: 800, color: "#fff",
                cursor: "pointer",
              }}>
                {(user?.name || user?.email || "?")[0].toUpperCase()}
              </button>

              {showMenu && (
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 200,
                  background: "#0D1626", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 16, padding: 8, minWidth: 190,
                  boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
                }}>
                  <div style={{ padding: "8px 12px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{user?.name || "My Account"}</div>
                    <div style={{ fontSize: 11, color: "#445" }}>{user?.email}</div>
                  </div>
                  {[
                    { label: "👤 My Profile",    action: () => { setShowMenu(false); onGoProfile(); } },
                    { label: "🔒 Privacy Policy", action: () => { setShowMenu(false); window.dispatchEvent(new CustomEvent("showPrivacy")); } },
                  ].map(item => (
                    <button key={item.label} onClick={item.action} style={{
                      width: "100%", padding: "9px 12px", borderRadius: 10, textAlign: "left",
                      background: "transparent", border: "none", color: "#E8EDF5",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >{item.label}</button>
                  ))}
                  <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "6px 0" }} />
                  <button onClick={() => { setShowMenu(false); logout(); }} style={{
                    width: "100%", padding: "9px 12px", borderRadius: 10, textAlign: "left",
                    background: "transparent", border: "none", color: "#EF4444",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >🚪 Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 18px" }}>

        {/* Mobile: current price card */}
        {isMobile && mwh != null && (
          <div style={{
            ...cardStyle,
            background: `linear-gradient(135deg, ${getPriceColor(mwh)}15, rgba(255,255,255,0.02))`,
            border: `1px solid ${getPriceColor(mwh)}33`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 11, color: "#556", marginBottom: 2 }}>NOW · EPEX Spot</div>
              <div style={{ fontSize: 38, fontWeight: 900, fontFamily: "monospace", color: getPriceColor(mwh), lineHeight: 1 }}>
                €{mwh.toFixed(1)}
              </div>
              <div style={{ fontSize: 11, color: "#667", marginTop: 2 }}>/MWh · {lbl?.emoji} {lbl?.text}</div>
              {retailKwh && <div style={{ fontSize: 11, color: "#556", marginTop: 2 }}>{supplier}: €{retailKwh.toFixed(4)}/kWh</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#556", marginBottom: 8 }}>Today</div>
              {stats?.today && (<>
                <div style={{ fontSize: 12, color: "#00C896" }}>▼ €{stats.today.min?.toFixed(0)}</div>
                <div style={{ fontSize: 12, color: "#F59E0B" }}>~ €{stats.today.avg?.toFixed(0)}</div>
                <div style={{ fontSize: 12, color: "#EF4444" }}>▲ €{stats.today.max?.toFixed(0)}</div>
              </>)}
            </div>
          </div>
        )}

        {/* Desktop: stats row */}
        {!isMobile && !loading && !error && stats?.today && (
          <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
            {[
              { label: "Min", value: `€${stats.today.min?.toFixed(0)}`, color: "#00C896" },
              { label: "Avg", value: `€${stats.today.avg?.toFixed(0)}`, color: "#F59E0B" },
              { label: "Max", value: `€${stats.today.max?.toFixed(0)}`, color: "#EF4444" },
              { label: "Negative hrs", value: stats.today.negative_hours || 0, color: "#00E5FF" },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "12px 16px" }}>
                <div style={{ fontSize: 10, color: "#556", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: "monospace" }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Supplier selector */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: "#445", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Your Supplier {user?.preferences?.supplier === supplier ? "· ✅ saved" : ""}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SUPPLIERS.map(s => (
              <button key={s.name} onClick={() => changeSupplier(s.name)} style={{
                padding: isMobile ? "6px 11px" : "7px 14px",
                borderRadius: 30, fontSize: isMobile ? 11 : 12, fontWeight: 600, cursor: "pointer",
                border:     supplier === s.name ? `1px solid ${s.color}` : "1px solid rgba(255,255,255,0.1)",
                background: supplier === s.name ? `${s.color}22` : "rgba(255,255,255,0.03)",
                color:      supplier === s.name ? s.color : "#667",
                transition: "all 0.2s",
              }}>{s.name}</button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", gap: isMobile ? 2 : 4, marginBottom: 16,
          background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 4,
          overflowX: "auto", WebkitOverflowScrolling: "touch",
        }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} title={t.title} style={{
              padding: isMobile ? "8px 12px" : "7px 13px",
              borderRadius: 9, fontSize: isMobile ? 16 : 12, fontWeight: 600,
              border: "none", cursor: "pointer", transition: "all 0.2s",
              background: tab === t.id ? "rgba(255,255,255,0.12)" : "transparent",
              color: tab === t.id ? "#fff" : "#556",
              flexShrink: 0,
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── Chart (today/tomorrow) ── */}
        {(tab === "today" || tab === "tomorrow") && (
          <div style={cardStyle}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "50px 0", color: "#556" }}>⚡ Fetching Belgian prices…</div>
            ) : error ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ color: "#EF4444", marginBottom: 12 }}>{error}</div>
                <button onClick={refetch} style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444", borderRadius: 10, padding: "8px 20px", cursor: "pointer" }}>Retry</button>
              </div>
            ) : chartData.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#556" }}>
                {tab === "tomorrow" ? (
                  <div>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>⏰</div>
                    <div style={{ fontSize: 14, color: "#778", marginBottom: 6 }}>Tomorrow's prices aren't published yet</div>
                    <div style={{ fontSize: 12, color: "#445" }}>EPEX Spot publishes at <strong style={{ color: "#0D9488" }}>13:00 CET</strong> daily</div>
                  </div>
                ) : "No data"}
              </div>
            ) : (
              <>
                <div style={{ paddingLeft: isMobile ? 4 : 14, marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{tab === "today" ? "Today's" : "Tomorrow's"} Prices · Belgium</div>
                  <div style={{ fontSize: 11, color: "#556", marginTop: 2 }}>
                    EPEX Spot · {lastFetched && `Updated ${lastFetched.toLocaleTimeString("nl-BE")}`}
                    {tab === "tomorrow" && <span style={{ marginLeft: 6, color: "#F59E0B", fontSize: 10 }}>⚠ Preliminary until 13:00</span>}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={isMobile ? 200 : 280}>
                  <AreaChart data={chartData.map(p => ({ ...p, price: p.price_eur_mwh }))} margin={{ top: 10, right: isMobile ? 4 : 20, left: isMobile ? -16 : 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#00C896" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00C896" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="hour_label" tick={{ fill: "#445", fontSize: isMobile ? 9 : 11 }} tickLine={false} interval={isMobile ? Math.floor(chartData.length / 6) : Math.max(0, Math.floor(chartData.length / 8) - 1)} />
                    <YAxis tick={{ fill: "#445", fontSize: isMobile ? 9 : 11 }} tickLine={false} axisLine={false} tickFormatter={v => `€${v}`} domain={["auto", "auto"]} width={isMobile ? 38 : 48} />
                    <Tooltip content={<PriceTooltip supplier={supplier} />} />
                    <ReferenceLine y={0} stroke="rgba(0,229,255,0.25)" strokeDasharray="4 4" />
                    <ReferenceLine y={alertThreshold} stroke="#F59E0B" strokeDasharray="4 4"
                      label={{ value: "⚠", fill: "#F59E0B", fontSize: 11, position: "insideTopRight" }} />
                    {tab === "today" && current && (
                      <ReferenceLine x={`${String(current.hour ?? new Date().getHours()).padStart(2, "0")}:00`}
                        stroke="rgba(255,255,255,0.2)" strokeWidth={2}
                        label={{ value: "NOW", fill: "#aaa", fontSize: 10, position: "top" }} />
                    )}
                    <Area type="monotone" dataKey="price" stroke="#00C896" strokeWidth={2.5} fill="url(#grad)"
                      dot={props => props.payload?.is_current
                        ? <circle key={props.key} cx={props.cx} cy={props.cy} r={6} fill={getPriceColor(props.payload.price_eur_mwh)} stroke="#fff" strokeWidth={2} />
                        : <g key={props.key} />}
                      activeDot={{ r: 5, fill: "#00C896" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        )}

        {/* ── Cheapest ── */}
        {tab === "cheapest" && (
          <div style={cardStyle}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>💚 5 Cheapest Upcoming Hours</div>
            <div style={{ fontSize: 12, color: "#556", marginBottom: 16 }}>Best times for EV charging, washing machine, dishwasher</div>
            {cheapest.length === 0
              ? <div style={{ color: "#556", textAlign: "center", padding: "30px 0" }}>Loading…</div>
              : cheapest.map((h, i) => {
                  const ts = new Date(h.timestamp);
                  const lbl_ = getPriceLabel(h.price_eur_mwh);
                  return (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: isMobile ? "12px 12px" : "14px 16px", marginBottom: 8,
                      background: "rgba(0,200,150,0.04)", border: "1px solid rgba(0,200,150,0.15)", borderRadius: 14,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: "50%",
                          background: `rgba(0,200,150,${0.25 - i * 0.04})`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, fontWeight: 900, color: "#00C896",
                        }}>{i + 1}</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: isMobile ? 15 : 16 }}>
                            {ts.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <div style={{ fontSize: 11, color: "#556" }}>
                            {ts.toLocaleDateString("nl-BE", { weekday: "short", day: "numeric", month: "short" })}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: getPriceColor(h.price_eur_mwh), fontWeight: 800, fontSize: isMobile ? 16 : 18, fontFamily: "monospace" }}>
                          €{h.price_eur_mwh.toFixed(1)}/MWh
                        </div>
                        <div style={{ fontSize: 11, color: "#667" }}>{lbl_.emoji} {lbl_.text}</div>
                      </div>
                    </div>
                  );
                })
            }
            {stats?.today && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(0,130,255,0.05)", border: "1px solid rgba(0,130,255,0.15)", borderRadius: 12, fontSize: 12, color: "#778" }}>
                💡 Running a 2kW appliance at cheapest vs peak saves <strong style={{ color: "#00C896" }}>€{(((stats.today.max - stats.today.min) / 1000) * 2).toFixed(3)}</strong> today
              </div>
            )}
          </div>
        )}

        {/* ── Compare ── */}
        {tab === "compare" && mwh != null && (
          <div style={cardStyle}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🏢 Supplier Comparison</div>
            <div style={{ fontSize: 12, color: "#556", marginBottom: 16 }}>At current spot €{mwh.toFixed(1)}/MWh</div>
            <ResponsiveContainer width="100%" height={isMobile ? 160 : 200}>
              <BarChart data={SUPPLIERS.map(s => ({ name: s.name, price: getSupplierPrice(mwh / 1000, s), color: s.color }))} margin={{ top: 0, right: 8, left: isMobile ? -20 : 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#667", fontSize: isMobile ? 9 : 11 }} tickLine={false} />
                <YAxis tick={{ fill: "#445", fontSize: isMobile ? 9 : 10 }} tickLine={false} axisLine={false} tickFormatter={v => `€${v.toFixed(2)}`} domain={["auto", "auto"]} width={isMobile ? 36 : 44} />
                <Tooltip formatter={v => [`€${v.toFixed(4)}/kWh`, "Retail"]} contentStyle={{ background: "rgba(8,12,22,0.97)", border: "1px solid #334", borderRadius: 10 }} labelStyle={{ color: "#fff" }} />
                <Bar dataKey="price" radius={[6, 6, 0, 0]}>
                  {SUPPLIERS.map((s, i) => <Cell key={i} fill={s.color} opacity={supplier === s.name ? 1 : 0.45} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ marginTop: 14 }}>
              {[...SUPPLIERS].sort((a, b) => getSupplierPrice(mwh / 1000, a) - getSupplierPrice(mwh / 1000, b)).map((s, i) => (
                <div key={s.name} onClick={() => changeSupplier(s.name)} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: isMobile ? "9px 12px" : "10px 14px", marginBottom: 6,
                  cursor: "pointer", borderRadius: 12,
                  background: supplier === s.name ? `${s.color}12` : "rgba(255,255,255,0.02)",
                  border: `1px solid ${supplier === s.name ? s.color + "44" : "rgba(255,255,255,0.06)"}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</span>
                    {i === 0 && <span style={{ fontSize: 10, color: "#00C896", background: "rgba(0,200,150,0.1)", padding: "2px 6px", borderRadius: 6 }}>Cheapest</span>}
                  </div>
                  <span style={{ fontFamily: "monospace", color: s.color, fontWeight: 700, fontSize: 13 }}>€{getSupplierPrice(mwh / 1000, s).toFixed(4)}/kWh</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Alerts ── */}
        {tab === "alerts" && (
          <div style={cardStyle}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🔔 Price Alerts</div>
            <div style={{ fontSize: 12, color: "#556", marginBottom: 20 }}>Email alert when price drops below threshold</div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 10 }}>
                Alert threshold: <strong style={{ color: "#F59E0B" }}>€{alertThreshold}/MWh</strong>
              </div>
              <input type="range" min={-20} max={200} step={5} value={alertThreshold}
                onChange={e => saveAlertThreshold(+e.target.value)}
                style={{ width: "100%", accentColor: "#F59E0B", cursor: "pointer", height: 20 }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#445", marginTop: 4 }}>
                <span>€-20</span><span>€200/MWh</span>
              </div>
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 16px",
              background: alertActive ? "rgba(0,200,150,0.08)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${alertActive ? "rgba(0,200,150,0.3)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 14,
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Email alerts {alertActive ? "🟢 On" : "⚫ Off"}</div>
                <div style={{ fontSize: 12, color: "#556", marginTop: 2 }}>Sent to {user?.email}</div>
              </div>
              <button onClick={toggleAlert} style={{
                padding: "9px 20px", borderRadius: 30, fontWeight: 700, fontSize: 13,
                border: "none", cursor: "pointer",
                background: alertActive ? "rgba(239,68,68,0.2)" : "rgba(0,200,150,0.2)",
                color: alertActive ? "#EF4444" : "#00C896",
              }}>
                {alertActive ? "Disable" : "Enable"}
              </button>
            </div>
          </div>
        )}

        {/* ── History ── */}
        {tab === "history" && (
          <div style={{ marginBottom: 14 }}>
            {historyLoading ? (
              <div style={{ textAlign: "center", padding: "50px 0", color: "#556" }}>⚡ Loading 7-day history…</div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 0", color: "#556" }}>No history data available</div>
            ) : (
              <>
                <div style={cardStyle}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>7-Day Average Prices</div>
                  <div style={{ fontSize: 11, color: "#556", marginBottom: 14 }}>Tap a bar to see hourly detail</div>
                  <ResponsiveContainer width="100%" height={isMobile ? 160 : 200}>
                    <BarChart data={history} margin={{ top: 0, right: 8, left: isMobile ? -20 : 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="label" tick={{ fill: "#445", fontSize: isMobile ? 9 : 11 }} tickLine={false} />
                      <YAxis tick={{ fill: "#445", fontSize: isMobile ? 9 : 11 }} tickLine={false} axisLine={false} tickFormatter={v => `€${v}`} width={isMobile ? 36 : 44} />
                      <Tooltip content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0]?.payload;
                        return (
                          <div style={{ background: "rgba(8,12,22,0.97)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 14px" }}>
                            <div style={{ color: "#aaa", fontSize: 11 }}>{label}</div>
                            <div style={{ color: "#00C896", fontSize: 16, fontWeight: 800 }}>Avg €{d?.avg}/MWh</div>
                            <div style={{ color: "#556", fontSize: 11 }}>Min €{d?.min} · Max €{d?.max}</div>
                          </div>
                        );
                      }} />
                      <Bar dataKey="avg" radius={[6, 6, 0, 0]} cursor="pointer" onClick={d => setSelectedDay(selectedDay?.date === d.date ? null : d)}>
                        {history.map((d, i) => (
                          <Cell key={i} fill={selectedDay?.date === d.date ? "#0D9488" : d.avg < 80 ? "#00C896" : d.avg < 130 ? "#F59E0B" : "#EF4444"} opacity={selectedDay && selectedDay.date !== d.date ? 0.4 : 1} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {selectedDay && (
                  <div style={{ ...cardStyle, border: "1px solid rgba(13,148,136,0.3)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>Hourly · {selectedDay.label}</div>
                        <div style={{ fontSize: 11, color: "#556" }}>Min €{selectedDay.min} · Avg €{selectedDay.avg} · Max €{selectedDay.max}</div>
                      </div>
                      <button onClick={() => setSelectedDay(null)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#778", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>✕</button>
                    </div>
                    <ResponsiveContainer width="100%" height={isMobile ? 160 : 200}>
                      <AreaChart data={selectedDay.prices.map(p => ({ ...p, price: p.price_eur_mwh }))} margin={{ top: 10, right: 8, left: isMobile ? -16 : 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradH" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#0D9488" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#0D9488" stopOpacity={0}   />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="hour_label" tick={{ fill: "#445", fontSize: isMobile ? 9 : 11 }} tickLine={false} interval={isMobile ? Math.floor(selectedDay.prices.length / 6) : Math.max(0, Math.floor(selectedDay.prices.length / 8) - 1)} />
                        <YAxis tick={{ fill: "#445", fontSize: isMobile ? 9 : 11 }} tickLine={false} axisLine={false} tickFormatter={v => `€${v}`} domain={["auto", "auto"]} width={isMobile ? 36 : 48} />
                        <Tooltip content={<PriceTooltip supplier={supplier} />} />
                        <Area type="monotone" dataKey="price" stroke="#0D9488" strokeWidth={2} fill="url(#gradH)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Footer */}
        {!isMobile && (
          <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontSize: 11, color: "#2a3344" }}>
            <span>Data: Energy-Charts.info · Elia Open Data (CC BY 4.0) · ENTSO-E</span>
            <span>Prices refresh every 15 min · Not financial advice</span>
          </div>
        )}
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      {isMobile && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
          background: "rgba(6,11,20,0.97)", backdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex", justifyContent: "space-around", padding: "8px 0 12px",
        }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              background: "transparent", border: "none", cursor: "pointer",
              padding: "4px 8px", borderRadius: 10,
              color: tab === t.id ? "#00C896" : "#445",
              transition: "color 0.2s",
            }}>
              <span style={{ fontSize: 20 }}>{t.label}</span>
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.3px" }}>{t.title}</span>
            </button>
          ))}
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        button { font-family: inherit; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        @media (max-width: 640px) {
          input[type="range"] { height: 24px; }
        }
      `}</style>
    </div>
  );
}