/**
 * pages/Dashboard.jsx — SmartPrice.be
 * Mobile-first redesign with Fortum-style layout + Graph/Table toggle
 * Bottom navigation on mobile, full header on desktop
 */

import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell,
} from "recharts";
import { useAuth }       from "../context/AuthContext";
import { usePrices, useCurrentPrice, useCheapestHours } from "../hooks/usePrices";
import { SUPPLIERS, getSupplierPrice, getPriceColor, getPriceLabel } from "../utils/priceUtils";
import GasTab from "./GasTab";

function PriceTooltip({ active, payload, label, supplier }) {
  if (!active || !payload?.length) return null;
  const mwh = payload[0]?.value;
  if (mwh == null) return null;
  const sup = SUPPLIERS.find(s => s.name === supplier);
  const lbl = getPriceLabel(mwh);
  const col = getPriceColor(mwh);
  return (
    <div style={{ background: "rgba(8,12,22,0.97)", border: `1px solid ${col}44`, borderRadius: 14, padding: "12px 16px" }}>
      <div style={{ color: "#667", fontSize: 11, marginBottom: 3 }}>{label}</div>
      <div style={{ color: col, fontSize: 22, fontWeight: 800, fontFamily: "monospace" }}>€{mwh.toFixed(1)}<span style={{ fontSize: 11, color: "#667" }}>/MWh</span></div>
      {sup && <div style={{ color: "#aaa", fontSize: 11, marginTop: 2 }}>{sup.name}: €{getSupplierPrice(mwh/1000, sup).toFixed(4)}/kWh</div>}
      <div style={{ color: col, fontSize: 11, fontWeight: 600, marginTop: 4 }}>{lbl.emoji} {lbl.text}</div>
    </div>
  );
}

const NAV_ITEMS = [
  { id: "today",    icon: "📈", label: "Today" },
  { id: "tomorrow", icon: "⏩", label: "Tomorrow" },
  { id: "cheapest", icon: "💚", label: "Best" },
  { id: "compare",  icon: "🏢", label: "Suppliers" },
  { id: "alerts",   icon: "🔔", label: "Alerts" },
];


// ── Energy Type Toggle ────────────────────────────────────────
function EnergyToggle({ type, onChange }) {
  const active = { border: "none", fontWeight: 700, fontSize: 13, padding: "7px 18px", borderRadius: 8, cursor: "pointer", transition: "all 0.15s" };
  const inactive = { border: "none", fontWeight: 600, fontSize: 13, padding: "7px 18px", borderRadius: 8, cursor: "pointer", transition: "all 0.15s", background: "transparent", color: "#556" };
  return (
    <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 3, gap: 2 }}>
      <button onClick={() => onChange("electricity")}
        style={{ ...( type === "electricity" ? { ...active, background: "#0D9488", color: "#fff" } : inactive ) }}>
        ⚡ Electricity
      </button>
      <button onClick={() => onChange("gas")}
        style={{ ...( type === "gas" ? { ...active, background: "#F97316", color: "#fff" } : inactive ) }}>
        🔥 Gas
      </button>
    </div>
  );
}

export default function Dashboard({ onGoProfile, initialTab, onTabConsumed, isGuest, onSignIn }) {
  const { user, updatePreferences, logout, authFetch } = useAuth();
  const { prices, stats, loading, error, lastFetched, source, refetch } = usePrices();
  const { current } = useCurrentPrice();
  const cheapest    = useCheapestHours(5);

  const [supplier,       setSupplier]       = useState(user?.preferences?.supplier || "Bolt Energy");
  const [tab,            setTab]            = useState(initialTab || "today");
  const [showMenu,       setShowMenu]       = useState(false);
  const [history,        setHistory]        = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedDay,    setSelectedDay]    = useState(null);
  const [alertThreshold, setAlertThreshold] = useState(user?.preferences?.alertThreshold || 80);
  const [alertActive,    setAlertActive]    = useState(user?.preferences?.alertEnabled || false);
  const [notification,   setNotification]   = useState(null);
  const [viewMode,       setViewMode]       = useState("graph"); // "graph" | "table"
  const [isMobile,       setIsMobile]       = useState(window.innerWidth < 768);

  // ── Energy type toggle + URL sync ─────────────────────────
  const getInitialType = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("type") === "gas" ? "gas" : "electricity";
  };
  const [energyType, setEnergyType] = useState(getInitialType);

  const switchType = (type) => {
    setEnergyType(type);
    const url = new URL(window.location.href);
    url.searchParams.set("type", type);
    window.history.pushState({}, "", url.toString());
  };

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    authFetch("/auth/me").then(r => r.json()).then(d => {
      if (d.success) {
        const p = d.user.preferences || {};
        if (p.supplier)                    setSupplier(p.supplier);
        if (p.alertThreshold !== undefined) setAlertThreshold(p.alertThreshold);
        if (p.alertEnabled   !== undefined) setAlertActive(p.alertEnabled);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialTab) { setTab(initialTab); onTabConsumed?.(); }
  }, [initialTab]);

  useEffect(() => {
    if (tab !== "history") return;
    if (history.length > 0) return;
    setHistoryLoading(true);
    fetch("/api/prices/history?days=7").then(r => r.json()).then(d => { if (d.success) setHistory(d.days); }).catch(() => {}).finally(() => setHistoryLoading(false));
  }, [tab]);

  useEffect(() => {
    if (!current || !alertActive) return;
    if (current.price_eur_mwh < alertThreshold) {
      setNotification(`⚡ €${current.price_eur_mwh.toFixed(0)}/MWh — below your €${alertThreshold} threshold`);
      setTimeout(() => setNotification(null), 6000);
    }
  }, [current, alertThreshold, alertActive]);

  const changeSupplier     = async s => { setSupplier(s); try { await updatePreferences({ supplier: s }); } catch {} };
  const toggleAlert        = async () => { const next = !alertActive; setAlertActive(next); try { await updatePreferences({ alertEnabled: next, alertThreshold }); } catch {} };
  const saveAlertThreshold = async v => { setAlertThreshold(v); try { await updatePreferences({ alertThreshold: v }); } catch {} };

  const todayData = prices.filter(p => p.day === "today");
  const tomorrowData = prices.filter(p => p.day === "tomorrow");
  const chartData = tab === "tomorrow" ? tomorrowData : todayData;
  const mwh = current?.price_eur_mwh ?? null;
  const lbl = mwh != null ? getPriceLabel(mwh) : null;
  const sup = SUPPLIERS.find(s => s.name === supplier);
  const retailKwh = mwh != null && sup ? getSupplierPrice(mwh / 1000, sup) : null;

  // Find min/max for today
  const todayMin = stats?.today ? { price: stats.today.min, hour: todayData.find(p => p.price_eur_mwh === stats.today.min) } : null;
  const todayMax = stats?.today ? { price: stats.today.max, hour: todayData.find(p => p.price_eur_mwh === stats.today.max) } : null;

  const C = { bg: "#060B14", card: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.08)", teal: "#0D9488", green: "#00C896", yellow: "#F59E0B", red: "#EF4444", cyan: "#00E5FF" };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: "#E8EDF5", fontFamily: "'DM Sans', system-ui, sans-serif", paddingBottom: isMobile ? 80 : 0 }}>

      {/* Notification */}
      {notification && (
        <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: "linear-gradient(135deg,#00C896,#009970)", borderRadius: 30, padding: "12px 20px", maxWidth: 340, width: "90%", boxShadow: "0 8px 32px rgba(0,200,150,0.4)", fontSize: 13, fontWeight: 600, color: "#fff", textAlign: "center" }}>
          {notification}
        </div>
      )}

      {/* Guest banner */}
      {isGuest && (
        <div style={{ background: "rgba(13,148,136,0.12)", borderBottom: "1px solid rgba(13,148,136,0.25)", padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#94A3B8" }}>👀 Browsing as guest — <strong style={{ color: "#0D9488" }}>sign in</strong> to save preferences & get price alerts</span>
          <button onClick={onSignIn} style={{ padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", background: "rgba(13,148,136,0.3)", color: "#0D9488" }}>
            Sign In →
          </button>
        </div>
      )}
      {isMobile && (
        <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(6,11,20,0.95)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🇧🇪</span>
            <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.5px" }}>SmartPrice</span>
            <span style={{ fontSize: 9, color: C.green, background: "rgba(0,200,150,0.1)", border: `1px solid rgba(0,200,150,0.25)`, borderRadius: 20, padding: "2px 7px", fontWeight: 700 }}>● LIVE</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {mwh != null && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 18, fontWeight: 900, fontFamily: "monospace", color: getPriceColor(mwh), lineHeight: 1 }}>€{mwh.toFixed(0)}</div>
                <div style={{ fontSize: 9, color: "#556" }}>NOW /MWh</div>
              </div>
            )}
            <button onClick={() => setShowMenu(m => !m)} style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#0D9488,#1A56A4)", border: "none", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
              {(user?.name || user?.email || "?")[0].toUpperCase()}
            </button>
          </div>
          </div>
          {/* Energy toggle row */}
          <div style={{ display: "flex", justifyContent: "center", padding: "8px 16px 10px" }}>
            <EnergyToggle type={energyType} onChange={switchType} />
          </div>
        </div>
      )}

      {/* ── DESKTOP HEADER ── */}
      {!isMobile && (
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 18px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 28 }}>🇧🇪</span>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: "-1px" }}>SmartPrice</h1>
              <span style={{ fontSize: 11, color: C.green, background: "rgba(0,200,150,0.1)", border: `1px solid rgba(0,200,150,0.25)`, borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>● LIVE</span>
              <span style={{ fontSize: 12, color: "#445" }}>{source || "Energy-Charts"} · Belgium</span>
            </div>
            <EnergyToggle type={energyType} onChange={switchType} />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {mwh != null && (
                <div style={{ background: C.card, border: `1px solid ${getPriceColor(mwh)}44`, borderRadius: 16, padding: "10px 18px", textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "#556", marginBottom: 1 }}>NOW · EPEX Spot</div>
                  <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "monospace", color: getPriceColor(mwh), lineHeight: 1 }}>€{mwh.toFixed(1)}<span style={{ fontSize: 12, color: "#556", fontWeight: 400 }}>/MWh</span></div>
                  <div style={{ fontSize: 11, color: "#778" }}>{lbl?.emoji} {lbl?.text}{retailKwh ? ` · ${supplier}: €${retailKwh.toFixed(4)}/kWh` : ""}</div>
                </div>
              )}
              <div style={{ position: "relative" }}>
                {isGuest ? (
                  <button onClick={onSignIn} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(13,148,136,0.15)", border: "1px solid rgba(13,148,136,0.3)", borderRadius: 12, padding: "9px 18px", cursor: "pointer", color: "#0D9488", fontWeight: 700, fontSize: 13 }}>
                    Sign In →
                  </button>
                ) : (
                  <>
                    <button onClick={() => setShowMenu(m => !m)} style={{ display: "flex", alignItems: "center", gap: 8, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "9px 14px", cursor: "pointer", color: "#E8EDF5" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#0D9488,#1A56A4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff" }}>
                        {(user?.name || user?.email || "?")[0].toUpperCase()}
                      </div>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{user?.name || "Account"}</div>
                        <div style={{ fontSize: 10, color: "#556" }}>▾ Menu</div>
                      </div>
                    </button>
                    {showMenu && <DropMenu onProfile={() => { setShowMenu(false); onGoProfile(); }} onLogout={() => { setShowMenu(false); logout(); }} onPrivacy={() => { setShowMenu(false); window.dispatchEvent(new CustomEvent("showPrivacy")); }} />}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile dropdown menu */}
      {isMobile && showMenu && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)" }} onClick={() => setShowMenu(false)}>
          <div style={{ position: "absolute", top: 60, right: 16, background: "#0D1626", border: `1px solid ${C.border}`, borderRadius: 16, padding: 8, minWidth: 200 }} onClick={e => e.stopPropagation()}>
            {isGuest ? (
              <>
                <div style={{ padding: "10px 14px", fontSize: 12, color: "#445" }}>Browsing as guest</div>
                <div style={{ height: 1, background: C.border, margin: "4px 0" }} />
                <MenuBtn icon="🔒" label="Privacy Policy" onClick={() => { setShowMenu(false); window.dispatchEvent(new CustomEvent("showPrivacy")); }} />
                <div style={{ height: 1, background: C.border, margin: "4px 0" }} />
                <MenuBtn icon="👤" label="Sign In / Register" onClick={() => { setShowMenu(false); onSignIn(); }} />
              </>
            ) : (
              <>
                <div style={{ padding: "10px 14px", fontSize: 12, color: "#445" }}>{user?.email || user?.name}</div>
                <div style={{ height: 1, background: C.border, margin: "4px 0" }} />
                <MenuBtn icon="👤" label="My Profile" onClick={() => { setShowMenu(false); onGoProfile(); }} />
                <MenuBtn icon="🔒" label="Privacy Policy" onClick={() => { setShowMenu(false); window.dispatchEvent(new CustomEvent("showPrivacy")); }} />
                <div style={{ height: 1, background: C.border, margin: "4px 0" }} />
                <MenuBtn icon="🚪" label="Sign Out" onClick={() => { setShowMenu(false); logout(); }} danger />
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: isMobile ? "16px 14px" : "0 18px 24px" }}>

        {/* ── MOBILE: Big current price card ── */}
        {isMobile && mwh != null && (
          <div style={{ background: `linear-gradient(135deg, ${getPriceColor(mwh)}18, ${getPriceColor(mwh)}08)`, border: `1px solid ${getPriceColor(mwh)}33`, borderRadius: 20, padding: "20px 20px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, color: "#556", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Right Now · EPEX Spot</div>
              <div style={{ fontSize: 44, fontWeight: 900, fontFamily: "monospace", color: getPriceColor(mwh), lineHeight: 1 }}>€{mwh.toFixed(1)}</div>
              <div style={{ fontSize: 12, color: "#667", marginTop: 4 }}>per MWh · {lbl?.emoji} {lbl?.text}</div>
              {retailKwh && <div style={{ fontSize: 12, color: "#556", marginTop: 2 }}>{supplier}: €{retailKwh.toFixed(4)}/kWh</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#445", marginBottom: 8 }}>{new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
              {lastFetched && <div style={{ fontSize: 10, color: "#334" }}>Updated {lastFetched.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>}
            </div>
          </div>
        )}

        {/* ── MOBILE: Min/Max cards ── */}
        {isMobile && stats?.today && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
            {[
              { label: "Min", value: `€${stats.today.min?.toFixed(0)}`, color: C.green, sub: todayMin?.hour?.hour_label },
              { label: "Avg", value: `€${stats.today.avg?.toFixed(0)}`, color: C.yellow },
              { label: "Max", value: `€${stats.today.max?.toFixed(0)}`, color: C.red, sub: todayMax?.hour?.hour_label },
              { label: "Neg hrs", value: stats.today.negative_hours || 0, color: C.cyan },
            ].map(s => (
              <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "#445", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: "monospace" }}>{s.value}</div>
                {s.sub && <div style={{ fontSize: 9, color: "#334", marginTop: 2 }}>{s.sub}</div>}
              </div>
            ))}
          </div>
        )}

        {/* ── DESKTOP: Stats row ── */}
        {!isMobile && !loading && !error && stats?.today && (
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            {[
              { label: "Today Min", value: `€${stats.today.min?.toFixed(0)}`, color: C.green, sub: todayMin?.hour?.hour_label },
              { label: "Today Avg", value: `€${stats.today.avg?.toFixed(0)}`, color: C.yellow },
              { label: "Today Max", value: `€${stats.today.max?.toFixed(0)}`, color: C.red, sub: todayMax?.hour?.hour_label },
              { label: "Negative Hrs", value: stats.today.negative_hours || 0, color: C.cyan },
            ].map(s => (
              <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "12px 16px", flex: 1, minWidth: 100 }}>
                <div style={{ fontSize: 10, color: "#556", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}{s.sub ? ` · ${s.sub}` : ""}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: "monospace" }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

{energyType === "electricity" && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: "#445", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Your Supplier</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SUPPLIERS.map(s => (
              <button key={s.name} onClick={() => changeSupplier(s.name)} style={{ padding: isMobile ? "6px 11px" : "7px 14px", borderRadius: 30, fontSize: isMobile ? 11 : 12, fontWeight: 600, cursor: "pointer", border: supplier === s.name ? `1px solid ${s.color}` : `1px solid ${C.border}`, background: supplier === s.name ? `${s.color}22` : C.card, color: supplier === s.name ? s.color : "#778", transition: "all 0.15s" }}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* ── Gas dashboard ── */}
        {energyType === "gas" && (
          <GasTab user={user} isGuest={isGuest} onSignIn={onSignIn} mobileTab={tab} setMobileTab={setTab} />
        )}

        {/* ── DESKTOP Tabs ── */}
        {energyType === "electricity" && !isMobile && (
          <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 4, width: "fit-content", flexWrap: "wrap" }}>
            {[...NAV_ITEMS, { id: "history", icon: "📅", label: "History" }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "7px 13px", borderRadius: 9, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", transition: "all 0.15s", background: tab === t.id ? "rgba(255,255,255,0.1)" : "transparent", color: tab === t.id ? "#fff" : "#667" }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Electricity content ── */}
        {/* ── MOBILE Tab header for current tab ── */}
        {energyType === "electricity" && isMobile && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              {tab === "today" && "📈 Today's Prices"}
              {tab === "tomorrow" && "⏩ Tomorrow's Prices"}
              {tab === "cheapest" && "💚 Best Hours"}
              {tab === "compare" && "🏢 Suppliers"}
              {tab === "alerts" && "🔔 Alerts"}
          {tab === "history" && "📅 History"}
            </div>
            {energyType === "electricity" && (tab === "today" || tab === "tomorrow") && (
              <div style={{ display: "flex", background: C.card, borderRadius: 8, padding: 3, gap: 2 }}>
                {["graph", "table"].map(v => (
                  <button key={v} onClick={() => setViewMode(v)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", background: viewMode === v ? "rgba(255,255,255,0.12)" : "transparent", color: viewMode === v ? "#fff" : "#556" }}>
                    {v === "graph" ? "📊 Graph" : "📋 Table"}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Chart + Table ── */}
        {(tab === "today" || tab === "tomorrow") && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: isMobile ? "16px 8px 12px" : "20px 8px 12px", marginBottom: 16 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "50px 0", color: "#556" }}>⚡ Loading prices…</div>
            ) : error ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ color: C.red, marginBottom: 12 }}>{error}</div>
                <button onClick={refetch} style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: C.red, borderRadius: 10, padding: "8px 20px", cursor: "pointer" }}>Retry</button>
              </div>
            ) : chartData.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#556" }}>
                {tab === "tomorrow" ? <><div style={{ fontSize: 28, marginBottom: 10 }}>⏰</div><div style={{ fontSize: 14, color: "#778", marginBottom: 6 }}>Tomorrow's prices not yet published</div><div style={{ fontSize: 12, color: "#445" }}>EPEX Spot publishes at <strong style={{ color: C.teal }}>13:00 CET</strong> daily</div></> : "No data"}
              </div>
            ) : (
              <>
                {/* Desktop graph/table toggle */}
                {!isMobile && (
                  <div style={{ paddingLeft: 14, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", paddingRight: 14 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{tab === "today" ? "Today's" : "Tomorrow's"} Hourly Prices · Belgium</div>
                      <div style={{ fontSize: 11, color: "#556", marginTop: 2 }}>EPEX Spot · {lastFetched && `Updated ${lastFetched.toLocaleTimeString("en-GB")}`}</div>
                    </div>
                    <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 3, gap: 2 }}>
                      {["graph", "table"].map(v => (
                        <button key={v} onClick={() => setViewMode(v)} style={{ padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", background: viewMode === v ? "rgba(255,255,255,0.1)" : "transparent", color: viewMode === v ? "#fff" : "#556" }}>
                          {v === "graph" ? "📊 Graph" : "📋 Table"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {viewMode === "graph" ? (
                  <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                    <AreaChart data={chartData.map(p => ({ ...p, price: p.price_eur_mwh }))} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00C896" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#00C896" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="hour_label" tick={{ fill: "#445", fontSize: isMobile ? 9 : 11 }} tickLine={false} interval={isMobile ? 3 : Math.max(0, Math.floor(chartData.length / 8) - 1)} />
                      <YAxis tick={{ fill: "#445", fontSize: isMobile ? 9 : 11 }} tickLine={false} axisLine={false} tickFormatter={v => `€${v}`} domain={["auto", "auto"]} width={40} />
                      <Tooltip content={<PriceTooltip supplier={supplier} />} />
                      <ReferenceLine y={0} stroke="rgba(0,229,255,0.25)" strokeDasharray="4 4" />
                      <ReferenceLine y={alertThreshold} stroke={C.yellow} strokeDasharray="4 4" label={{ value: "⚠ Alert", fill: C.yellow, fontSize: 9, position: "insideTopRight" }} />
                      {tab === "today" && current && (
                        <ReferenceLine x={`${String(current.hour ?? new Date().getHours()).padStart(2, "0")}:00`} stroke="rgba(255,255,255,0.2)" strokeWidth={2} label={{ value: "NOW", fill: "#fff", fontSize: 9, position: "top" }} />
                      )}
                      <Area type="monotone" dataKey="price" stroke="#00C896" strokeWidth={2} fill="url(#grad)"
                        dot={props => props.payload?.is_current
                          ? <circle key={props.key} cx={props.cx} cy={props.cy} r={6} fill={getPriceColor(props.payload.price_eur_mwh)} stroke="#fff" strokeWidth={2} />
                          : <g key={props.key} />}
                        activeDot={{ r: 5, fill: "#00C896" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  /* TABLE VIEW */
                  <div style={{ overflowY: "auto", maxHeight: isMobile ? 380 : 440, padding: "0 8px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: isMobile ? 12 : 13 }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                          {["Hour", "€/MWh", `${supplier} €/kWh`, "Status"].map(h => (
                            <th key={h} style={{ padding: "8px 10px", textAlign: h === "Hour" ? "left" : "right", color: "#445", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Deduplicate to one row per hour */}
                        {Object.values(chartData.reduce((acc, row) => {
                          const key = row.hour_label;
                          if (!acc[key]) acc[key] = row;
                          return acc;
                        }, {})).map((row, i) => {
                          const rowMwh = row.price_eur_mwh;
                          const rowLbl = getPriceLabel(rowMwh);
                          const rowCol = getPriceColor(rowMwh);
                          const isNow = row.is_current;
                          return (
                            <tr key={i} style={{ borderBottom: `1px solid rgba(255,255,255,0.03)`, background: isNow ? `${rowCol}10` : "transparent" }}>
                              <td style={{ padding: "9px 10px", color: isNow ? "#fff" : "#778", fontWeight: isNow ? 700 : 400 }}>
                                {row.hour_label} {isNow && <span style={{ fontSize: 9, color: C.green, background: "rgba(0,200,150,0.15)", borderRadius: 4, padding: "1px 5px", marginLeft: 4 }}>NOW</span>}
                              </td>
                              <td style={{ padding: "9px 10px", textAlign: "right", color: rowCol, fontWeight: 700, fontFamily: "monospace" }}>€{rowMwh.toFixed(1)}</td>
                              <td style={{ padding: "9px 10px", textAlign: "right", color: "#778", fontFamily: "monospace" }}>{sup ? `€${getSupplierPrice(rowMwh/1000, sup).toFixed(4)}` : "—"}</td>
                              <td style={{ padding: "9px 10px", textAlign: "right", fontSize: isMobile ? 10 : 11 }}>{rowLbl.emoji} {rowLbl.text}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── History ── */}
          {energyType === "electricity" && tab === "history" && (
          <div style={{ marginBottom: 16 }}>
            {historyLoading ? <div style={{ textAlign:"center", padding:"60px 0", color:"#556" }}>⚡ Loading history…</div>
            : history.length === 0 ? <div style={{ textAlign:"center", padding:"60px 0", color:"#556" }}>No history data</div>
            : (
              <>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "16px 8px 12px", marginBottom: 12 }}>
                  <div style={{ paddingLeft: 14, marginBottom: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>7-Day Average Prices</div>
                    <div style={{ fontSize: 11, color: "#556", marginTop: 2 }}>Tap a day for hourly detail</div>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={history} margin={{ top:0, right:16, left:0, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="label" tick={{ fill:"#445", fontSize:10 }} tickLine={false} />
                      <YAxis tick={{ fill:"#445", fontSize:10 }} tickLine={false} axisLine={false} tickFormatter={v=>`€${v}`} width={36} />
                      <Tooltip content={({active,payload,label})=>{
                        if(!active||!payload?.length) return null;
                        const d = payload[0]?.payload;
                        return <div style={{ background:"rgba(8,12,22,0.97)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"10px 14px" }}><div style={{ color:"#aaa", fontSize:11, marginBottom:3 }}>{label}</div><div style={{ color:C.green, fontSize:16, fontWeight:800 }}>Avg €{d?.avg}/MWh</div><div style={{ color:"#556", fontSize:11, marginTop:3 }}>Min €{d?.min} · Max €{d?.max}</div></div>;
                      }} />
                      <Bar dataKey="avg" radius={[5,5,0,0]} cursor="pointer" onClick={d => setSelectedDay(selectedDay?.date===d.date?null:d)}>
                        {history.map((d,i)=><Cell key={i} fill={selectedDay?.date===d.date?C.teal:d.avg<80?C.green:d.avg<130?C.yellow:C.red} opacity={selectedDay&&selectedDay.date!==d.date?0.35:1} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {selectedDay && (
                  <div style={{ background: C.card, border: `1px solid rgba(13,148,136,0.3)`, borderRadius: 20, padding: "16px 8px 12px" }}>
                    <div style={{ paddingLeft:14, marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center", paddingRight:14 }}>
                      <div><div style={{ fontSize:14, fontWeight:700 }}>{selectedDay.label}</div><div style={{ fontSize:10, color:"#556", marginTop:2 }}>Min €{selectedDay.min} · Avg €{selectedDay.avg} · Max €{selectedDay.max}</div></div>
                      <button onClick={()=>setSelectedDay(null)} style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border}`, color:"#778", borderRadius:8, padding:"4px 10px", cursor:"pointer", fontSize:11 }}>✕</button>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={selectedDay.prices.map(p=>({...p,price:p.price_eur_mwh}))} margin={{top:8,right:16,left:0,bottom:0}}>
                        <defs><linearGradient id="gradH" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.teal} stopOpacity={0.25}/><stop offset="95%" stopColor={C.teal} stopOpacity={0}/></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="hour_label" tick={{fill:"#445",fontSize:9}} tickLine={false} interval={3} />
                        <YAxis tick={{fill:"#445",fontSize:9}} tickLine={false} axisLine={false} tickFormatter={v=>`€${v}`} domain={["auto","auto"]} width={36} />
                        <Tooltip content={<PriceTooltip supplier={supplier} />} />
                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
                        <Area type="monotone" dataKey="price" stroke={C.teal} strokeWidth={2} fill="url(#gradH)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Best Hours ── */}
        {energyType === "electricity" && tab === "cheapest" && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: isMobile ? 16 : 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>💚 5 Cheapest Upcoming Hours</div>
            <div style={{ fontSize: 12, color: "#556", marginBottom: 16 }}>Best windows for EV charging, washing machine, dishwasher</div>
            {cheapest.length === 0 ? <div style={{ color:"#556", textAlign:"center", padding:"30px 0" }}>Loading…</div>
            : cheapest.map((h, i) => {
              const ts = new Date(h.timestamp);
              const lbl_ = getPriceLabel(h.price_eur_mwh);
              return (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px", marginBottom:8, background:"rgba(0,200,150,0.04)", border:"1px solid rgba(0,200,150,0.12)", borderRadius:14 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:30, height:30, borderRadius:"50%", background:`rgba(0,200,150,${0.25-i*0.04})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900, color:C.green }}>{i+1}</div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:15 }}>{ts.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})} – {new Date(ts.getTime()+3600000).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</div>
                      <div style={{ fontSize:10, color:"#445" }}>{ts.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ color:getPriceColor(h.price_eur_mwh), fontWeight:800, fontSize:16, fontFamily:"monospace" }}>€{h.price_eur_mwh.toFixed(1)}</div>
                    <div style={{ fontSize:10, color:"#556" }}>{lbl_.emoji} {lbl_.text}</div>
                  </div>
                </div>
              );
            })}
            {stats?.today && (
              <div style={{ marginTop:12, padding:"10px 14px", background:"rgba(0,130,255,0.05)", border:"1px solid rgba(0,130,255,0.12)", borderRadius:12, fontSize:12, color:"#778" }}>
                💡 Running a 2kW appliance at cheapest vs peak saves <strong style={{color:C.green}}>€{(((stats.today.max-stats.today.min)/1000)*2).toFixed(3)}</strong> today
              </div>
            )}
          </div>
        )}

        {/* ── Compare ── */}
        {energyType === "electricity" && tab === "compare" && mwh != null && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: isMobile ? 16 : 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🏢 Supplier Comparison</div>
            <div style={{ fontSize: 12, color: "#556", marginBottom: 16 }}>At current spot €{mwh.toFixed(1)}/MWh</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={SUPPLIERS.map(s => ({ name: s.name, price: getSupplierPrice(mwh/1000, s), color: s.color }))} margin={{ top:0, right:12, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill:"#778", fontSize:10 }} tickLine={false} />
                <YAxis tick={{ fill:"#445", fontSize:9 }} tickLine={false} axisLine={false} tickFormatter={v=>`€${v.toFixed(3)}`} domain={["auto","auto"]} width={42} />
                <Tooltip formatter={v=>[`€${v.toFixed(4)}/kWh`,"Retail"]} contentStyle={{ background:"rgba(8,12,22,0.97)", border:`1px solid ${C.border}`, borderRadius:10 }} labelStyle={{ color:"#fff" }} />
                <Bar dataKey="price" radius={[5,5,0,0]}>
                  {SUPPLIERS.map((s,i)=><Cell key={i} fill={s.color} opacity={supplier===s.name?1:0.4} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ marginTop:14 }}>
              {[...SUPPLIERS].sort((a,b)=>getSupplierPrice(mwh/1000,a)-getSupplierPrice(mwh/1000,b)).map((s,i)=>(
                <div key={s.name} onClick={()=>changeSupplier(s.name)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 12px", marginBottom:5, cursor:"pointer", borderRadius:10, background:supplier===s.name?`${s.color}12`:C.card, border:`1px solid ${supplier===s.name?s.color+"44":C.border}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:s.color }} />
                    <span style={{ fontWeight:600, fontSize:13 }}>{s.name}</span>
                    {i===0&&<span style={{ fontSize:9, color:C.green, background:"rgba(0,200,150,0.1)", padding:"2px 6px", borderRadius:6 }}>Cheapest</span>}
                  </div>
                  <span style={{ fontFamily:"monospace", color:s.color, fontWeight:700, fontSize:13 }}>€{getSupplierPrice(mwh/1000,s).toFixed(4)}/kWh</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Alerts ── */}
        {energyType === "electricity" && tab === "alerts" && (
          <AlertsTab
            alertActive={alertActive} alertThreshold={alertThreshold}
            saveAlertThreshold={saveAlertThreshold} toggleAlert={toggleAlert}
            user={user} updatePreferences={updatePreferences}
            C={C} isMobile={isMobile}
          />
        )}

        {/* Footer */}
        {energyType === "electricity" && !isMobile && (
          <div style={{ marginTop:20, display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:8, fontSize:11, color:"#334" }}>
            <span>Data: Energy-Charts.info · Elia Open Data (CC BY 4.0) · ENTSO-E</span>
            <span>Prices refresh every 15 min · Not financial advice</span>
          </div>
        )}
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      {isMobile && (
        <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:50, background:"rgba(6,11,20,0.97)", backdropFilter:"blur(20px)", borderTop:`1px solid ${C.border}`, display:"flex", padding:"8px 0 12px" }}>
          {energyType === "electricity" ? (
            [...NAV_ITEMS, { id:"history", icon:"📅", label:"History" }].map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, background:"transparent", border:"none", cursor:"pointer", padding:"6px 0", color: tab===t.id ? C.green : "#445" }}>
                <span style={{ fontSize:18 }}>{t.icon}</span>
                <span style={{ fontSize:9, fontWeight:600, letterSpacing:"0.3px" }}>{t.label}</span>
                {tab===t.id && <div style={{ width:16, height:2, background:C.green, borderRadius:2 }} />}
              </button>
            ))
          ) : (
            [{id:"today",icon:"🔥",label:"TTF"},{id:"suppliers",icon:"🏢",label:"Suppliers"},{id:"history",icon:"📅",label:"History"},{id:"alerts",icon:"🔔",label:"Alerts"},{id:"combined",icon:"⚡🔥",label:"Combined"}].map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, background:"transparent", border:"none", cursor:"pointer", padding:"6px 0", color: tab===t.id ? "#F97316" : "#445" }}>
                <span style={{ fontSize:18 }}>{t.icon}</span>
                <span style={{ fontSize:9, fontWeight:600, letterSpacing:"0.3px" }}>{t.label}</span>
                {tab===t.id && <div style={{ width:16, height:2, background:"#F97316", borderRadius:2 }} />}
              </button>
            ))
          )}
        </div>
      )}

      <style>{`* { box-sizing: border-box; } button { font-family: inherit; } ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }`}</style>
    </div>
  );
}

function AlertsTab({ alertActive, alertThreshold, saveAlertThreshold, toggleAlert, user, updatePreferences, C, isMobile }) {
  const existingEmail = user?.preferences?.alertEmail || user?.email || "";
  const [alertEmail, setAlertEmail] = useState(existingEmail);
  const [emailSaved, setEmailSaved] = useState(existingEmail.length > 0);
  const [saving,     setSaving]     = useState(false);
  const [emailError, setEmailError] = useState("");

  const isValidEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const saveEmail = async () => {
    if (!isValidEmail(alertEmail)) { setEmailError("Please enter a valid email"); return; }
    setEmailError("");
    setSaving(true);
    try {
      const res = await updatePreferences({ alertEmail });
      if (res?.error) { setEmailError(res.error); }
      else { setEmailSaved(true); }
    } catch (err) {
      setEmailError(err.message || "Failed to save email");
    }
    setSaving(false);
  };

  const handleToggle = async () => {
    if (!alertActive) {
      if (!isValidEmail(alertEmail)) { setEmailError("Please enter a valid email first"); return; }
      if (!emailSaved) {
        setSaving(true);
        try {
          const res = await updatePreferences({ alertEmail });
          if (res?.error) { setEmailError(res.error); setSaving(false); return; }
          setEmailSaved(true);
        } catch (err) {
          setEmailError(err.message || "Failed to save email");
          setSaving(false);
          return;
        }
        setSaving(false);
      }
    }
    await toggleAlert();
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: isMobile ? 16 : 24 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🔔 Price Alerts</div>
      <div style={{ fontSize: 12, color: "#556", marginBottom: 20 }}>Get emailed when electricity drops below your threshold</div>

      {/* Threshold slider */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: "#aaa", marginBottom: 10 }}>
          Alert when below: <strong style={{ color: C.yellow }}>€{alertThreshold}/MWh</strong>
        </div>
        <input type="range" min={-20} max={200} step={5} value={alertThreshold}
          onChange={e => saveAlertThreshold(+e.target.value)}
          style={{ width: "100%", accentColor: C.yellow, cursor: "pointer" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#445", marginTop: 4 }}>
          <span>€-20</span><span>€200/MWh</span>
        </div>
      </div>

      {/* Email input — only shown here */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: "#778", marginBottom: 8 }}>
          📧 Alert email <span style={{ color: "#445" }}>(required to receive notifications)</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="email" value={alertEmail} onChange={e => { setAlertEmail(e.target.value); setEmailSaved(false); setEmailError(""); }}
            placeholder="your@email.be"
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 10, fontSize: 14,
              background: "rgba(255,255,255,0.06)", border: `1px solid ${emailError ? C.red : emailSaved ? C.green : "rgba(255,255,255,0.12)"}`,
              color: "#fff", outline: "none", fontFamily: "inherit",
            }}
          />
          <button onClick={saveEmail} disabled={saving || emailSaved} style={{
            padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700,
            border: "none", cursor: emailSaved ? "default" : "pointer",
            background: emailSaved ? "rgba(0,200,150,0.2)" : "rgba(13,148,136,0.3)",
            color: emailSaved ? C.green : "#0D9488", whiteSpace: "nowrap",
          }}>
            {emailSaved ? "✓ Saved" : saving ? "…" : "Save"}
          </button>
        </div>
        {emailError && <div style={{ fontSize: 11, color: C.red, marginTop: 6 }}>⚠ {emailError}</div>}
        {emailSaved && <div style={{ fontSize: 11, color: C.green, marginTop: 6 }}>✓ Alerts will be sent to {alertEmail}</div>}
      </div>

      {/* Enable/disable toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: alertActive ? "rgba(0,200,150,0.08)" : C.card, border: `1px solid ${alertActive ? "rgba(0,200,150,0.3)" : C.border}`, borderRadius: 14 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Alert {alertActive ? "🟢 Active" : "⚫ Inactive"}</div>
          <div style={{ fontSize: 11, color: "#445", marginTop: 2 }}>
            {alertActive ? `Monitoring prices · email: ${alertEmail}` : "Enable to start receiving alerts"}
          </div>
        </div>
        <button onClick={handleToggle} style={{
          padding: "8px 18px", borderRadius: 30, fontWeight: 700, fontSize: 13,
          border: "none", cursor: "pointer",
          background: alertActive ? "rgba(239,68,68,0.2)" : "rgba(0,200,150,0.2)",
          color: alertActive ? C.red : C.green,
        }}>
          {alertActive ? "Disable" : "Enable"}
        </button>
      </div>
    </div>
  );
}

function DropMenu({ onProfile, onLogout, onPrivacy }) {
  return (
    <div style={{ position:"absolute", right:0, top:"calc(100% + 8px)", zIndex:100, background:"#0D1626", border:"1px solid rgba(255,255,255,0.1)", borderRadius:14, padding:8, minWidth:180, boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
      <MenuBtn icon="👤" label="My Profile" onClick={onProfile} />
      <MenuBtn icon="🔒" label="Privacy Policy" onClick={onPrivacy} />
      <div style={{ height:1, background:"rgba(255,255,255,0.07)", margin:"6px 0" }} />
      <MenuBtn icon="🚪" label="Sign Out" onClick={onLogout} danger />
    </div>
  );
}

function MenuBtn({ icon, label, onClick, danger }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{ width:"100%", padding:"9px 14px", borderRadius:10, textAlign:"left", background:hover?(danger?"rgba(239,68,68,0.08)":"rgba(255,255,255,0.06)"):"transparent", border:"none", color:danger?"#EF4444":"#E8EDF5", fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", gap:8, alignItems:"center" }}>
      {icon} {label}
    </button>
  );
}