/**
 * pages/Dashboard.jsx — SmartPrice.be
 * Mobile-first redesign with Fortum-style layout + Graph/Table toggle
 * Bottom navigation on mobile, full header on desktop
 */

import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell,
} from "recharts";
import { useAuth }       from "../context/AuthContext";
import { useLanguage }   from "../context/LanguageContext";
import { useTheme, useColors } from "../context/ThemeContext";
import LangSwitcher      from "../components/LangSwitcher";
import ThemeSwitcher     from "../components/ThemeSwitcher";
import { usePrices, useCheapestHours } from "../hooks/usePrices";
import { SUPPLIERS, getSupplierPrice, getPriceColor, getPriceLabel } from "../utils/priceUtils";
import GasTab from "./GasTab";

function PriceTooltip({ active, payload, label, supplier }) {
  const { tSection } = useLanguage();
  const PL = tSection("priceLabels");
  if (!active || !payload?.length) return null;
  const mwh = payload[0]?.value;
  if (mwh == null) return null;
  const sup = SUPPLIERS.find(s => s.name === supplier);
  const lbl = getPriceLabel(mwh, PL);
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



// ── Energy Type Toggle ────────────────────────────────────────

const C = {
  bg:     "#060B14",
  card:   "#0A1628",
  card2:  "#0D1E35",
  border: "#1E3A5F",
  green:  "#10B981",
  teal:   "#0D9488",
  yellow: "#F59E0B",
  orange: "#F97316",
  red:    "#EF4444",
  muted:  "#64748B",
  light:  "#E2E8F0",
  cyan:   "#06B6D4",
};



// ══════════════════════════════════════════════════════════════════
// SUPPLIER COMPARE + APPLIANCE CALCULATOR
// ══════════════════════════════════════════════════════════════════

const REGIONS_DATA = [
  { id: "flanders", flag: "🔶", noteKey: "gridNote" },
  { id: "wallonia",  flag: "🔷", noteKey: "gridNoteWallonia" },
  { id: "brussels",  flag: "🏙️", noteKey: "gridNoteBrussels" },
];
const TYPE_COLOR = { variable: "#0D9488", fixed: "#06B6D4", dynamic: "#10B981" };
const TYPE_LABEL = { variable: "Variable", fixed: "Fixed", dynamic: "Dynamic" };

function PlanBadge({ children, color }) {
  return <span style={{ background: `${color}22`, color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>{children}</span>;
}

// ── Supplier comparison tab ────────────────────────────────────
function SupplierCompare({ currentMwh, isMobile, energyType }) {
  const { theme } = useTheme();
  const TC_colors = useColors();
  const { tSection } = useLanguage();
  const T  = tSection("dashboard");
  const TC = tSection("common");
  return (
    <div style={{ padding: "8px 0" }}>
      <div style={{ fontSize: 11, color: "#445", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12, fontWeight: 700 }}>
        All Belgian Suppliers · Estimated retail price
      </div>

      {/* Supplier cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {SUPPLIERS.map((s, i) => {
          // currentMwh is MWh → convert to kWh, pass supplier object
          const spotKwh = currentMwh != null ? currentMwh / 1000 : null;
          const retailKwh = spotKwh != null ? getSupplierPrice(spotKwh, s) : null;
          return (
            <div key={s.name} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${i === 0 ? s.color + "55" : "rgba(255,255,255,0.06)"}`, borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {i === 0 && <span style={{ fontSize: 14 }}>🏆</span>}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: i === 0 ? s.color : "#C4D4E0" }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: "#445", marginTop: 2 }}>{T.variableElec}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                {retailKwh != null ? (
                  <>
                    <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace", color: i === 0 ? s.color : "#94A3B8" }}>
                      €{retailKwh.toFixed(4)}
                    </div>
                    <div style={{ fontSize: 10, color: "#445" }}>/kWh incl. VAT</div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: "#334" }}>—</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 10, color: "#334", marginBottom: 20, lineHeight: 1.6 }}>
        Prices are estimates based on current EPEX Spot rate + typical supplier margin. Verify on supplier websites before switching.
      </div>


    </div>
  );
}

function EnergyToggle({ type, onChange, onOpenCalculator, isGuest, isMobile }) {
  const { tSection } = useLanguage();
  const TC = tSection("common");
  const L  = tSection("landing");
  return (
    <div style={{
      display: "flex",
      background: "rgba(0,0,0,0.35)",
      borderRadius: 14,
      padding: 4,
      gap: 4,
      border: "1px solid rgba(255,255,255,0.07)",
      boxShadow: "inset 0 1px 3px rgba(0,0,0,0.4)",
    }}>
      {/* EV button */}
      <button onClick={() => window.location.href = "/ev-charging-belgium"} style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "8px 14px", borderRadius: 10, cursor: "pointer",
        fontSize: 13, fontWeight: 700, letterSpacing: "0.2px",
        transition: "all 0.2s ease",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "transparent", color: "#4A6070",
      }}
        onMouseEnter={e => { e.currentTarget.style.color = "#00C896"; e.currentTarget.style.border = "1px solid rgba(0,200,150,0.35)"; e.currentTarget.style.background = "rgba(0,200,150,0.08)"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "#4A6070"; e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; e.currentTarget.style.background = "transparent"; }}>
        🚗 EV
      </button>
      <button onClick={() => window.location.href = "/ev-charging-stations-belgium"} title="EV Stations Map" style={{ display:"flex", alignItems:"center", padding:"8px 12px", borderRadius:10, cursor:"pointer", fontSize:14, border:"1px solid rgba(255,255,255,0.08)", background:"transparent", color:"#4A6070", transition:"all 0.2s" }} onMouseEnter={e=>{e.currentTarget.style.color="#3B82F6";e.currentTarget.style.background="rgba(59,130,246,0.08)";}} onMouseLeave={e=>{e.currentTarget.style.color="#4A6070";e.currentTarget.style.background="transparent";}}>🗺️</button>


      {/* Electricity button */}
      <button onClick={() => onChange("electricity")} style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: isMobile ? "7px 12px" : "8px 18px", borderRadius: 10, cursor: "pointer",
        fontSize: 13, fontWeight: 700, letterSpacing: "0.2px",
        transition: "all 0.2s ease",
        border: type === "electricity" ? "1px solid rgba(0,230,180,0.45)" : "1px solid transparent",
        background: type === "electricity"
          ? "linear-gradient(135deg, #0A2E2A 0%, #0D3D35 100%)"
          : "transparent",
        color: type === "electricity" ? "#00E5B4" : "#4A6070",
        boxShadow: type === "electricity"
          ? "0 0 16px rgba(0,200,150,0.25), inset 0 1px 0 rgba(0,230,180,0.15)"
          : "none",
      }}>
        <span style={{
          fontSize: 15,
          filter: type === "electricity" ? "drop-shadow(0 0 6px rgba(0,230,180,0.8))" : "none",
          transition: "filter 0.2s",
        }}>⚡</span>
        {!isMobile && <span>{TC.electricity || "Electricity"}</span>}
        {type === "electricity" && (
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#00E5B4",
            boxShadow: "0 0 8px #00E5B4",
            marginLeft: 2,
            animation: "pulse-elec 2s infinite",
          }} />
        )}
      </button>

      {/* Gas button */}
      <button onClick={() => onChange("gas")} style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "8px 18px", borderRadius: 10, cursor: "pointer",
        fontSize: 13, fontWeight: 700, letterSpacing: "0.2px",
        transition: "all 0.2s ease",
        border: type === "gas" ? "1px solid rgba(249,115,22,0.45)" : "1px solid transparent",
        background: type === "gas"
          ? "linear-gradient(135deg, #2E1A08 0%, #3D220A 100%)"
          : "transparent",
        color: type === "gas" ? "#FF8C42" : "#4A6070",
        boxShadow: type === "gas"
          ? "0 0 16px rgba(249,115,22,0.25), inset 0 1px 0 rgba(255,140,66,0.15)"
          : "none",
      }}>
        <span style={{
          fontSize: 15,
          filter: type === "gas" ? "drop-shadow(0 0 6px rgba(255,140,66,0.8))" : "none",
          transition: "filter 0.2s",
        }}>🔥</span>
        {!isMobile && <span>{TC.gas || "Gas"}</span>}
        {type === "gas" && (
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#FF8C42",
            boxShadow: "0 0 8px #FF8C42",
            marginLeft: 2,
            animation: "pulse-gas 2s infinite",
          }} />
        )}
      </button>


      {/* Calculator button — visible to all, guests get sign-in prompt */}
      <button onClick={() => onOpenCalculator && onOpenCalculator(type)} style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "8px 16px", borderRadius: 10, cursor: "pointer",
        fontSize: 13, fontWeight: 700, letterSpacing: "0.2px",
        transition: "all 0.2s ease",
        border: isGuest ? "1px solid rgba(13,148,136,0.3)" : "1px solid rgba(255,255,255,0.08)",
        background: isGuest ? "rgba(13,148,136,0.08)" : "transparent",
        color: isGuest ? "#0D9488" : "#4A6070",
      }}
        onMouseEnter={e => { e.currentTarget.style.color = "#0D9488"; e.currentTarget.style.border = "1px solid rgba(13,148,136,0.35)"; e.currentTarget.style.background = "rgba(13,148,136,0.08)"; }}
        onMouseLeave={e => { e.currentTarget.style.color = isGuest ? "#0D9488" : "#4A6070"; e.currentTarget.style.border = isGuest ? "1px solid rgba(13,148,136,0.3)" : "1px solid rgba(255,255,255,0.08)"; e.currentTarget.style.background = isGuest ? "rgba(13,148,136,0.08)" : "transparent"; }}>
        {isMobile ? "🔌" : `🔌 ${TC.calculator || "Calculator"}${isGuest ? " →" : ""}`}
      </button>

      <style>{`
        @keyframes pulse-elec {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px #00E5B4; }
          50%       { opacity: 0.5; box-shadow: 0 0 3px #00E5B4; }
        }
        @keyframes pulse-gas {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px #FF8C42; }
          50%       { opacity: 0.5; box-shadow: 0 0 3px #FF8C42; }
        }
      `}</style>
    </div>
  );
}

function SharePanel({ currentPrice, userName, onClose, copied, onCopy, refCopied, onCopyRef }) {
  const { tSection } = useLanguage();
  const T = tSection("dashboard");
  const shareText = currentPrice != null
    ? `⚡ Belgian electricity is now €${currentPrice.toFixed(1)}/MWh — track live EPEX prices free at https://smartprice.be`
    : `⚡ SmartPrice.be — Live EPEX electricity prices & cheapest hours for Belgium. Free! https://smartprice.be`;
  const refSlug = userName ? userName.toLowerCase().replace(/\s+/g, "") : null;
  const refUrl  = refSlug ? `https://smartprice.be?ref=${refSlug}` : "https://smartprice.be";
  const refText = `⚡ I use SmartPrice.be to track live electricity prices in Belgium & find the cheapest hours to charge my EV. Free tool — check it out: ${refUrl}`;
  const channels = [
    { label: "WhatsApp", icon: "💬", color: "#25D366", href: `https://wa.me/?text=${encodeURIComponent(shareText)}` },
    { label: "X / Twitter", icon: "𝕏", color: "#fff",  href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}` },
    { label: "Facebook",  icon: "f",  color: "#1877F2", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://smartprice.be")}` },
    { label: "LinkedIn",  icon: "in", color: "#0A66C2", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://smartprice.be")}` },
    { label: "Email",     icon: "✉",  color: "#94A3B8", href: `mailto:?subject=${encodeURIComponent("Live electricity prices — SmartPrice.be")}&body=${encodeURIComponent(shareText)}` },
  ];
  return (
    <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 200, background: "#0A1628", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: "14px", width: 240, boxShadow: "0 12px 40px rgba(0,0,0,0.6)" }}>
      {/* Share header */}
      <div style={{ fontSize: 11, color: "#445566", marginBottom: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>{T.shareTitle || "Share SmartPrice"}</div>
      {channels.map(ch => (
        <a key={ch.label} href={ch.href} target="_blank" rel="noopener noreferrer"
          onClick={onClose}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 9, background: `${ch.color}12`, marginBottom: 5, textDecoration: "none" }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: `${ch.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: ch.color, flexShrink: 0 }}>{ch.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#C4D4E0" }}>{ch.label}</span>
        </a>
      ))}
      <button onClick={onCopy} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 9, background: copied ? "rgba(0,200,150,0.1)" : "rgba(255,255,255,0.04)", border: "none", width: "100%", cursor: "pointer", marginBottom: 10 }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(0,200,150,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#00C896", flexShrink: 0 }}>{copied ? "✓" : "🔗"}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: copied ? "#00C896" : "#C4D4E0" }}>{copied ? (T.copied || "Copied!") : (T.copyLink || "Copy link")}</span>
      </button>
      {/* Refer a friend */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
        <div style={{ fontSize: 11, color: "#445566", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>🎁 {T.referFriend || "Refer a friend"}</div>
        <div style={{ fontSize: 11, color: "#334455", marginBottom: 8, lineHeight: 1.5 }}>
          {T.referDesc || "Share your personal link — helps spread the word and grows SmartPrice."}
        </div>
        <div style={{ background: "rgba(0,200,150,0.06)", border: "1px solid rgba(0,200,150,0.2)", borderRadius: 8, padding: "7px 10px", fontSize: 11, color: "#00C896", fontFamily: "monospace", marginBottom: 8, wordBreak: "break-all" }}>
          {refUrl}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onCopyRef} style={{ flex: 1, padding: "7px 0", borderRadius: 8, background: refCopied ? "rgba(0,200,150,0.2)" : "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.3)", color: "#00C896", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {refCopied ? `✓ ${T.copied || "Copied!"}` : (T.copyLink || "Copy link")}
          </button>
          <a href={`https://wa.me/?text=${encodeURIComponent(refText)}`} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, padding: "7px 0", borderRadius: 8, background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.3)", color: "#25D366", fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            💬 WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ onGoProfile, initialTab, onTabConsumed, isGuest, onSignIn, onOpenCalculator }) {
  // Gate: guests clicking the calculator go to sign-in first
  const { user, updatePreferences, logout, authFetch } = useAuth();
  const { theme } = useTheme();
  const TC_colors = useColors();
  const { tSection } = useLanguage();
  const T  = tSection("dashboard");
  const TC = tSection("common");
  const PL = tSection("priceLabels");  // price label translations
  const NAV_ITEMS = [
    { id: "today",    icon: "📈", label: TC.today },
    { id: "tomorrow", icon: "⏩", label: TC.tomorrow },
    { id: "cheapest", icon: "💚", label: TC.best },
    { id: "compare",  icon: "🏢", label: TC.suppliers },
    { id: "alerts",   icon: "🔔", label: TC.alerts },
  ];
  const REGIONS = REGIONS_DATA.map(r => ({
    ...r,
    label: TC[r.id] || r.id,
    note:  T[r.noteKey] || "",
  }));
  const { prices, stats, loading, error, lastFetched, source, refetch } = usePrices();
  const [calcBanner, setCalcBanner] = useState(false);
  const openCalculator = (type) => {
    if (isGuest) { setCalcBanner(true); return; }
    onOpenCalculator && onOpenCalculator(type);
  };
  // Derive current price from prices array using is_current flag (Brussels-timezone aware)
  // instead of a separate /api/current call which had a UTC vs CEST mismatch
  const current = prices.find(p => p.is_current) || prices.filter(p => p.day === "today").slice(-1)[0] || null;
  const cheapest    = useCheapestHours(5);

  const [supplier,       setSupplier]       = useState(user?.preferences?.supplier || "Bolt Energy");
  const [tab,            setTab]            = useState(initialTab || "today");
  const [showMenu,       setShowMenu]       = useState(false);
  const [showShare,      setShowShare]      = useState(false);
  const [shareCopied,    setShareCopied]    = useState(false);
  const [refCopied,      setRefCopied]      = useState(false);
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

  const dedup = arr => Object.values(arr.reduce((acc, p) => { if (!acc[p.hour_label]) acc[p.hour_label] = p; return acc; }, {})).sort((a, b) => a.hour - b.hour);
  const todayData = dedup(prices.filter(p => p.day === "today"));
  const tomorrowData = dedup(prices.filter(p => p.day === "tomorrow"));
  const chartData = tab === "tomorrow" ? tomorrowData : todayData;
  const mwh = current?.price_eur_mwh ?? null;
  const lbl = mwh != null ? getPriceLabel(mwh, PL) : null;
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
        <div style={{ background: "linear-gradient(135deg, rgba(13,148,136,0.1), rgba(26,86,164,0.08))", borderBottom: "1px solid rgba(13,148,136,0.2)", padding: isMobile ? "8px 14px" : "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>🔔</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0" }}>
                {TC.guestBannerTitle || "Get price alerts & your cheapest plan"}
              </div>
              <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                {TC.guestBannerSub || "Free account · No spam · 30 seconds to sign up"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["🔔 Price alerts", "🔌 Plan calculator", "⚡ Supplier tracking"].map(f => (
                <span key={f} style={{ fontSize: 10, background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.2)", color: "#0D9488", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>{f}</span>
              ))}
            </div>
            <button onClick={onSignIn} style={{ padding: "8px 18px", borderRadius: 20, fontSize: 12, fontWeight: 800, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#0D9488,#1A56A4)", color: "#fff", whiteSpace: "nowrap" }}>
              {TC.signIn || "Sign in"} — Free →
            </button>
          </div>
        </div>
      )}
      {/* ── DESKTOP NAV ── */}
      {!isMobile && (
        <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(6,11,20,0.95)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 22 }}>🇧🇪</span>
              <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.5px" }}>SmartPrice</span>
              <span style={{ fontSize: 9, color: energyType === "gas" ? "#FF8C42" : C.green, background: energyType === "gas" ? "rgba(255,140,66,0.1)" : "rgba(0,200,150,0.1)", border: energyType === "gas" ? "1px solid rgba(255,140,66,0.3)" : `1px solid rgba(0,200,150,0.25)`, borderRadius: 20, padding: "2px 7px", fontWeight: 700 }}>● LIVE</span>
              {lastFetched && <div style={{ fontSize: 10, color: "#334", marginLeft: 8 }}>Updated {lastFetched.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>}
            </div>
            <EnergyToggle type={energyType} onChange={switchType} onOpenCalculator={openCalculator} isGuest={isGuest} isMobile={isMobile} />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ThemeSwitcher />
              <LangSwitcher />
              {/* Share button */}
              <div style={{ position: "relative" }}>
                <button onClick={() => { setShowShare(s => !s); setShowMenu(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 20, background: showShare ? "rgba(13,148,136,0.2)" : "rgba(255,255,255,0.06)", border: `1px solid ${showShare ? C.teal + "66" : C.border}`, cursor: "pointer", color: showShare ? C.teal : "#94A3B8", fontSize: 13, fontWeight: 700, transition: "all 0.15s" }}>
                  📤 <span>Share</span>
                </button>
                {showShare && (
                  <SharePanel
                    currentPrice={prices?.find(p => p.is_current)?.price_eur_mwh}
                    userName={user?.name}
                    onClose={() => setShowShare(false)}
                    copied={shareCopied}
                    refCopied={refCopied}
                    onCopy={() => {
                      const p = prices?.find(p => p.is_current)?.price_eur_mwh;
                      const text = p != null ? `⚡ Belgian electricity is now €${p.toFixed(1)}/MWh — track live EPEX prices free at https://smartprice.be` : "⚡ SmartPrice.be — Live EPEX electricity prices & cheapest hours for Belgium. Free! https://smartprice.be";
                      navigator.clipboard?.writeText(text).then(() => { setShareCopied(true); setTimeout(() => { setShareCopied(false); setShowShare(false); }, 1500); });
                    }}
                    onCopyRef={() => {
                      const slug = user?.name?.toLowerCase().replace(/\s+/g, "") || "";
                      const url = slug ? `https://smartprice.be?ref=${slug}` : "https://smartprice.be";
                      navigator.clipboard?.writeText(url).then(() => { setRefCopied(true); setTimeout(() => setRefCopied(false), 2000); });
                    }}
                  />
                )}
              </div>
              {!isGuest ? (
                <div style={{ position: "relative" }}>
                  <button onClick={() => setShowMenu(m => !m)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", borderRadius: 20, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, cursor: "pointer", color: "#E2E8F0", fontSize: 13, fontWeight: 600 }}>
                    👤 {user?.name || "Account"} ▾
                  </button>
                  {showMenu && <DropMenu onProfile={onGoProfile} onLogout={() => { logout(); setShowMenu(false); }} onPrivacy={() => { window.dispatchEvent(new CustomEvent("showPrivacy")); setShowMenu(false); }} />}
                </div>
              ) : (
                <button onClick={onSignIn} style={{ padding: "8px 18px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: `linear-gradient(135deg,${C.teal},#1A56A4)`, border: "none", color: "#fff", cursor: "pointer" }}>
                  {TC.signIn || "Sign in"} →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE NAV ── */}
      {isMobile && (
        <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(6,11,20,0.95)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>🇧🇪</span>
              <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.5px" }}>SmartPrice</span>
              <span style={{ fontSize: 9, color: energyType === "gas" ? "#FF8C42" : C.green, background: energyType === "gas" ? "rgba(255,140,66,0.1)" : "rgba(0,200,150,0.1)", border: energyType === "gas" ? "1px solid rgba(255,140,66,0.3)" : `1px solid rgba(0,200,150,0.25)`, borderRadius: 20, padding: "2px 7px", fontWeight: 700 }}>● LIVE</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <EnergyToggle type={energyType} onChange={switchType} onOpenCalculator={openCalculator} isGuest={isGuest} isMobile={isMobile} />
              <ThemeSwitcher />
              <LangSwitcher />
              {/* Mobile share button */}
              <div style={{ position: "relative" }}>
                <button onClick={() => { setShowShare(s => !s); setShowMenu(false); }}
                  style={{ width: 32, height: 32, borderRadius: 10, background: showShare ? "rgba(13,148,136,0.2)" : "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  📤
                </button>
                {showShare && (
                  <SharePanel
                    currentPrice={prices?.find(p => p.is_current)?.price_eur_mwh}
                    onClose={() => setShowShare(false)}
                    copied={shareCopied}
                    onCopy={() => {
                      const p = prices?.find(p => p.is_current)?.price_eur_mwh;
                      const text = p != null ? `⚡ Belgian electricity is now €${p.toFixed(1)}/MWh — track live EPEX prices free at https://smartprice.be` : "⚡ SmartPrice.be — Live EPEX electricity prices & cheapest hours for Belgium. Free! https://smartprice.be";
                      navigator.clipboard?.writeText(text).then(() => { setShareCopied(true); setTimeout(() => { setShareCopied(false); setShowShare(false); }, 1500); });
                    }}
                  />
                )}
              </div>
              {!isGuest && (
                <div style={{ position: "relative" }}>
                  <button onClick={() => setShowMenu(m => !m)} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: `1px solid ${C.border}`, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    👤
                  </button>
                  {showMenu && <DropMenu onProfile={onGoProfile} onLogout={() => { logout(); setShowMenu(false); }} onPrivacy={() => { window.dispatchEvent(new CustomEvent("showPrivacy")); setShowMenu(false); }} />}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Calculator sign-in banner (guests only) ── */}
      {calcBanner && (
        <div style={{ background: "rgba(13,148,136,0.1)", borderBottom: "1px solid rgba(13,148,136,0.25)", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>🔌</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0" }}>{T.calcBannerTitle || "Plan Calculator requires an account"}</div>
              <div style={{ fontSize: 12, color: "#64748B" }}>{T.calcBannerSub || "Create a free account in 30 seconds — no credit card needed."}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <button onClick={() => { setCalcBanner(false); onSignIn(); }}
              style={{ padding: "8px 20px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#0D9488,#1A56A4)", border: "none", color: "#fff", cursor: "pointer" }}>
              {T.signInFree || "Sign in free →"}
            </button>
            <button onClick={() => setCalcBanner(false)}
              style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", fontSize: 18, padding: "0 4px", lineHeight: 1 }}>
              ✕
            </button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, padding: isMobile ? "12px 14px" : "20px 24px 20px" }}>
        {/* ── MOBILE: Min/Max cards ── */}
        {energyType === "electricity" && isMobile && stats?.today && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
            {[
              { label: TC.min, value: `€${stats.today.min?.toFixed(0)}`, color: C.green, sub: todayMin?.hour?.hour_label },
              { label: TC.avg, value: `€${stats.today.avg?.toFixed(0)}`, color: C.yellow },
              { label: TC.max, value: `€${stats.today.max?.toFixed(0)}`, color: C.red, sub: todayMax?.hour?.hour_label },
              { label: T.negHrs, value: stats.today.negative_hours || 0, color: C.cyan },
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
        {energyType === "electricity" && !isMobile && !loading && !error && stats?.today && (
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            {[
              { label: T.todayMin, value: `€${stats.today.min?.toFixed(0)}`, color: C.green, sub: todayMin?.hour?.hour_label },
              { label: T.todayAvg, value: `€${stats.today.avg?.toFixed(0)}`, color: C.yellow },
              { label: T.todayMax, value: `€${stats.today.max?.toFixed(0)}`, color: C.red, sub: todayMax?.hour?.hour_label },
              { label: T.negativeHrs, value: stats.today.negative_hours || 0, color: C.cyan },
            ].map(s => (
              <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "12px 16px", flex: 1, minWidth: 100 }}>
                <div style={{ fontSize: 10, color: "#556", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}{s.sub ? ` · ${s.sub}` : ""}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: "monospace" }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Current price hero ── */}
        {energyType === "electricity" && mwh != null && (
          <div style={{ background: `linear-gradient(135deg, ${getPriceColor(mwh)}14, ${getPriceColor(mwh)}05)`, border: `1px solid ${getPriceColor(mwh)}33`, borderRadius: 20, padding: isMobile ? "16px 18px" : "20px 24px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>⚡ Current EPEX Spot</div>
              <div style={{ fontSize: isMobile ? 36 : 48, fontWeight: 900, fontFamily: "monospace", color: getPriceColor(mwh), lineHeight: 1 }}>
                €{mwh.toFixed(1)}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>/MWh · {lbl?.emoji} {lbl?.text}</div>
            </div>
            {retailKwh != null && (
              <div style={{ textAlign: isMobile ? "left" : "right" }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{supplier}</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "monospace", color: getPriceColor(mwh) }}>
                  €{retailKwh.toFixed(4)}
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>/kWh incl. VAT</div>
              </div>
            )}
          </div>
        )}

{energyType === "electricity" && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: "#445", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{T.yourSupplier}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SUPPLIERS.map(s => (
              <button key={s.name} onClick={() => changeSupplier(s.name)} style={{ padding: isMobile ? "6px 11px" : "7px 14px", borderRadius: 30, fontSize: isMobile ? 11 : 12, fontWeight: 600, cursor: "pointer", border: supplier === s.name ? `1px solid ${s.color}` : `1px solid ${C.border}`, background: supplier === s.name ? `${s.color}22` : C.card, color: supplier === s.name ? s.color : "#778", transition: "all 0.15s" }}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* ── SMART ACTION CARD ── */}
        {energyType === "electricity" && mwh != null && cheapest.length > 0 && (() => {
          const nextBest = cheapest[0];
          const nextBestH = new Date(nextBest.timestamp);
          const nextBestHour = nextBestH.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
          const nowIsChap = mwh <= (stats?.today?.avg ?? 120);
          const savingVsNow = mwh - nextBest.price_eur_mwh;
          const isNowBest = savingVsNow <= 5; // within €5/MWh = now IS the best window
          return (
            <div style={{ marginBottom: 16, background: isNowBest ? "linear-gradient(135deg,rgba(16,185,129,0.12),rgba(16,185,129,0.05))" : nowIsChap ? "linear-gradient(135deg,rgba(0,200,150,0.08),rgba(0,200,150,0.03))" : "linear-gradient(135deg,rgba(249,115,22,0.09),rgba(249,115,22,0.03))", border: `1px solid ${isNowBest ? "rgba(16,185,129,0.35)" : nowIsChap ? "rgba(0,200,150,0.25)" : "rgba(249,115,22,0.28)"}`, borderRadius: 18, padding: isMobile ? "14px 16px" : "18px 22px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: isNowBest ? "#10B981" : nowIsChap ? "#00C896" : "#F97316", marginBottom: 6 }}>
                    {isNowBest ? "✅ Best time to act — right now" : nowIsChap ? "🟢 Good time — prices below average" : "⚠️ High prices right now — consider waiting"}
                  </div>
                  <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 800, color: "#E2E8F0", marginBottom: 4 }}>
                    {isNowBest
                      ? `Now is your cheapest upcoming window · €${mwh.toFixed(1)}/MWh`
                      : nowIsChap
                      ? `Prices good · Next best window: ${nextBestHour} (€${nextBest.price_eur_mwh.toFixed(1)}/MWh)`
                      : `Next best window: ${nextBestHour} at €${nextBest.price_eur_mwh.toFixed(1)}/MWh`}
                  </div>
                  {!isNowBest && savingVsNow > 0 && (
                    <div style={{ fontSize: 13, color: "#556B82" }}>
                      Waiting saves <strong style={{ color: "#10B981" }}>€{(savingVsNow / 1000 * 22).toFixed(2)}</strong> per EV charge vs charging now
                    </div>
                  )}
                </div>
                <button onClick={() => setTab("cheapest")} style={{ padding: "9px 18px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#94A3B8", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                  See all windows →
                </button>
              </div>
            </div>
          );
        })()}

        {/* ── Gas dashboard ── */}
        {energyType === "gas" && (
          <GasTab user={user} isGuest={isGuest} onSignIn={onSignIn} isMobile={isMobile} mobileTab={tab} setMobileTab={setTab} />
        )}

        {/* ── DESKTOP Tabs ── */}
        {energyType === "electricity" && !isMobile && (
          <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 4, width: "fit-content", flexWrap: "wrap" }}>
            {[...NAV_ITEMS, { id: "history", icon: "📅", label: TC.history }].map(t => (
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
                    {v === "graph" ? `📊 ${T.graph}` : `📋 ${T.table}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Chart + Table ── */}
        {energyType === "electricity" && (tab === "today" || tab === "tomorrow") && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: isMobile ? "16px 8px 12px" : "20px 8px 12px", marginBottom: 16 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "50px 0", color: "#556" }}>{T.loadingPrices}</div>
            ) : error ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ color: C.red, marginBottom: 12 }}>{error}</div>
                <button onClick={refetch} style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: C.red, borderRadius: 10, padding: "8px 20px", cursor: "pointer" }}>Retry</button>
              </div>
            ) : chartData.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#556" }}>
                {tab === "tomorrow" ? <><div style={{ fontSize: 28, marginBottom: 10 }}>⏰</div><div style={{ fontSize: 14, color: "#778", marginBottom: 6 }}>Tomorrow's prices not yet published</div><div style={{ fontSize: 12, color: "#445" }}>EPEX Spot publishes at <strong style={{ color: C.teal }}>13:00 CET</strong> daily</div></> : TC.noData}
              </div>
            ) : (
              <>
                {/* Desktop graph/table toggle */}
                {!isMobile && (
                  <div style={{ paddingLeft: 14, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", paddingRight: 14 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{tab === "today" ? T.todayHourlyPrices : T.tomorrowHourlyPrices}</div>
                      <div style={{ fontSize: 11, color: "#556", marginTop: 2 }}>{T.epexUpdated} {lastFetched && lastFetched.toLocaleTimeString("en-GB")}</div>
                    </div>
                    <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 3, gap: 2 }}>
                      {["graph", "table"].map(v => (
                        <button key={v} onClick={() => setViewMode(v)} style={{ padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", background: viewMode === v ? "rgba(255,255,255,0.1)" : "transparent", color: viewMode === v ? "#fff" : "#556" }}>
                          {v === "graph" ? `📊 ${T.graph}` : `📋 ${T.table}`}
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
                      <YAxis tick={{ fill: "#445", fontSize: isMobile ? 9 : 11 }} tickLine={false} axisLine={false} tickFormatter={v => `€${v}`} domain={[dataMin => Math.floor(dataMin * 0.9), dataMax => Math.ceil(dataMax * 1.05)]} width={40} />
                      <Tooltip content={<PriceTooltip supplier={supplier} />} />
                      <ReferenceLine y={0} stroke="rgba(0,229,255,0.25)" strokeDasharray="4 4" />
                      <ReferenceLine y={alertThreshold} stroke={C.yellow} strokeDasharray="4 4" label={{ value: "⚠ Alert", fill: C.yellow, fontSize: 9, position: "insideTopRight" }} />
                      {tab === "today" && current && (
                        <ReferenceLine x={`${String(current.hour ?? new Date().getHours()).padStart(2, "0")}:00`} stroke="rgba(255,255,255,0.2)" strokeWidth={2} label={{ value: TC.now, fill: "#fff", fontSize: 9, position: "top" }} />
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
                          {[ TC.hour, "€/MWh", `${supplier} €/kWh`, TC.status].map(h => (
                            <th key={h} style={{ padding: "8px 10px", textAlign: h === TC.hour ? "left" : "right", color: "#445", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {chartData.map((row, i) => {
                          const rowMwh = row.price_eur_mwh;
                          const rowLbl = getPriceLabel(rowMwh, PL);
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
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{T.sevenDayTitle || "7-Day Average Prices"}</div>
                    <div style={{ fontSize: 11, color: "#556", marginTop: 2 }}>{T.sevenDaySub || "Tap a day for hourly detail"}</div>
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
                        <YAxis tick={{fill:"#445",fontSize:9}} tickLine={false} axisLine={false} tickFormatter={v=>`€${v}`} domain={[dataMin => Math.floor(dataMin * 0.9), dataMax => Math.ceil(dataMax * 1.05)]} width={36} />
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
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 3 }}>{T.cheapestHours}</div>
              <div style={{ fontSize: 12, color: "#556" }}>{T.cheapestSub}</div>
            </div>
            {cheapest.length === 0 ? <div style={{ color:"#556", textAlign:"center", padding:"30px 0" }}>Loading…</div>
            : cheapest.map((h, i) => {
              const ts = new Date(h.timestamp);
              const lbl_ = getPriceLabel(h.price_eur_mwh, PL);
              const col = getPriceColor(h.price_eur_mwh);
              const evSaving = mwh != null ? ((mwh - h.price_eur_mwh) / 1000 * 22).toFixed(2) : null;
              const isFirst = i === 0;
              return (
                <div key={i} style={{ marginBottom: 10, background: isFirst ? `linear-gradient(135deg,${col}14,${col}05)` : "rgba(255,255,255,0.02)", border: `1px solid ${isFirst ? col + "44" : "rgba(255,255,255,0.07)"}`, borderRadius: 18, padding: isMobile ? "16px" : "18px 22px", transition: "all 0.2s" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      {/* Rank badge */}
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: isFirst ? `${col}22` : "rgba(255,255,255,0.05)", border: `1px solid ${isFirst ? col + "55" : "rgba(255,255,255,0.1)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isFirst ? 16 : 14, fontWeight: 900, color: isFirst ? col : "#445566", flexShrink: 0 }}>
                        {isFirst ? "✓" : i + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: isMobile ? 17 : 20, letterSpacing: "-0.5px", color: isFirst ? col : "#DDE8F0" }}>
                          {ts.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})} – {new Date(ts.getTime()+3600000).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}
                        </div>
                        <div style={{ fontSize: 11, color: "#445566", marginTop: 2 }}>
                          {ts.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})} · {lbl_.emoji} {lbl_.text}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ color: col, fontWeight: 900, fontSize: isMobile ? 22 : 26, fontFamily: "monospace", lineHeight: 1 }}>€{h.price_eur_mwh.toFixed(1)}</div>
                      <div style={{ fontSize: 10, color: "#445566", marginTop: 2 }}>/MWh</div>
                      {evSaving != null && parseFloat(evSaving) > 0.01 && (
                        <div style={{ fontSize: 11, color: "#10B981", fontWeight: 700, marginTop: 3 }}>saves €{evSaving}/charge</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {stats?.today && (
              <div style={{ marginTop: 4, padding: "12px 16px", background: "rgba(0,130,255,0.06)", border: "1px solid rgba(0,130,255,0.14)", borderRadius: 14, fontSize: 12, color: "#778" }}>
                {T.savingsTip} <strong style={{color:C.green}}>€{(((stats.today.max-stats.today.min)/1000)*2).toFixed(3)}</strong> today
              </div>
            )}
          </div>
        )}

        {/* ── Compare ── */}
        {energyType === "electricity" && tab === "compare" && (
          <SupplierCompare currentMwh={mwh} isMobile={isMobile} energyType={energyType} />
        )}

        {/* ── Alerts ── */}
        {energyType === "electricity" && tab === "alerts" && (
          <AlertsTab
            alertActive={alertActive} alertThreshold={alertThreshold}
            saveAlertThreshold={saveAlertThreshold} toggleAlert={toggleAlert}
            isGuest={isGuest} onSignIn={() => setShowAuth(true)}
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
            [...NAV_ITEMS, { id:"history", icon:"📅", label:TC.history }].map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, background:"transparent", border:"none", cursor:"pointer", padding:"6px 0", color: tab===t.id ? C.green : "#445" }}>
                <span style={{ fontSize:18 }}>{t.icon}</span>
                <span style={{ fontSize:9, fontWeight:600, letterSpacing:"0.3px" }}>{t.label}</span>
                {tab===t.id && <div style={{ width:16, height:2, background:C.green, borderRadius:2 }} />}
              </button>
            ))
          ) : (
            [{id:"today",icon:"🔥",label:TC.today},{id:"tomorrow",icon:"⏩",label:TC.tomorrow},{id:"week",icon:"📅",label:"7 Days"},{id:"suppliers",icon:"🏢",label:TC.suppliers},{id:"alerts",icon:"🔔",label:TC.alerts}].map(t => (
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

function AlertsTab({ alertActive, alertThreshold, saveAlertThreshold, toggleAlert, user, updatePreferences, C, isMobile, isGuest, onSignIn }) {
  const { tSection } = useLanguage();
  const T  = tSection("alerts");
  const TC = tSection("common");
  const AL = T;

  // Always use account email - read only if logged in
  const accountEmail = user?.preferences?.alertEmail || user?.email || "";
  const [threshold, setThreshold] = useState(alertThreshold || 80);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Guest — show login prompt
  if (isGuest) {
    return (
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: isMobile ? 16 : 24, textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>🔔</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{AL.title || "Price Alerts"}</div>
        <div style={{ fontSize: 13, color: "#556", marginBottom: 20 }}>
          {AL.loginRequired || "Sign in to receive email alerts when prices drop below your threshold."}
        </div>
        <button onClick={onSignIn} style={{ padding: "10px 28px", borderRadius: 30, fontWeight: 700, fontSize: 14, background: "linear-gradient(135deg,#0D9488,#1A56A4)", border: "none", color: "#fff", cursor: "pointer" }}>
          {TC.signIn || "Sign in"} →
        </button>
      </div>
    );
  }

  const handleToggle = async () => {
    setSaving(true);
    try { await toggleAlert(); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: isMobile ? 16 : 24 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{`🔔 ${AL.title}`}</div>
      <div style={{ fontSize: 12, color: "#556", marginBottom: 20 }}>{AL.subtitle}</div>

      {/* Threshold slider */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: "#aaa", marginBottom: 10 }}>
          {T.alertWhenBelow} <strong style={{ color: C.yellow }}>€{alertThreshold}/MWh</strong>
        </div>
        <input type="range" min={-20} max={200} step={5} value={alertThreshold}
          onChange={e => saveAlertThreshold(+e.target.value)}
          style={{ width: "100%", accentColor: C.yellow, cursor: "pointer" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#445", marginTop: 4 }}>
          <span>-2 cent</span><span>20 cent/kWh</span>
        </div>
      </div>

      {/* Email — read only, from account */}
      <div style={{ marginBottom: 20, padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, borderRadius: 10 }}>
        <div style={{ fontSize: 11, color: "#556", marginBottom: 4 }}>📧 {AL.emailLabel || "Alert email"}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#E2E8F0" }}>{accountEmail || "—"}</div>
        <div style={{ fontSize: 11, color: "#445", marginTop: 4 }}>{AL.emailFromAccount || "Email from your account"}</div>
      </div>

      {/* Enable/disable toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: alertActive ? "rgba(0,200,150,0.08)" : C.card, border: `1px solid ${alertActive ? "rgba(0,200,150,0.3)" : C.border}`, borderRadius: 14 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Alert {alertActive ? "🟢 Active" : "⚫ Inactive"}</div>
          <div style={{ fontSize: 11, color: "#445", marginTop: 2 }}>
            {alertActive ? `Monitoring · ${accountEmail}` : (AL.enableToReceive || "Enable to receive alerts")}
          </div>
          {saved && <div style={{ fontSize: 11, color: C.green, marginTop: 2 }}>✓ Saved</div>}
        </div>
        <button onClick={handleToggle} disabled={saving} style={{
          padding: "8px 18px", borderRadius: 30, fontWeight: 700, fontSize: 13,
          border: "none", cursor: "pointer",
          background: alertActive ? "rgba(239,68,68,0.2)" : "rgba(0,200,150,0.2)",
          color: alertActive ? C.red : C.green,
        }}>
          {saving ? "…" : alertActive ? TC.disable : TC.enable}
        </button>
      </div>
    </div>
  );
}

function DropMenu({ onProfile, onLogout, onPrivacy }) {
  const { tSection } = useLanguage();
  const TC = tSection("common");
  const L  = tSection("landing");
  return (
    <div style={{ position:"absolute", right:0, top:"calc(100% + 8px)", zIndex:100, background:"#0D1626", border:"1px solid rgba(255,255,255,0.1)", borderRadius:14, padding:8, minWidth:180, boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
      <MenuBtn icon="👤" label={TC.myProfile} onClick={onProfile} />
      <MenuBtn icon="🚗" label={L.footerEvLink || "EV Charging"} onClick={() => window.location.href = "/ev-charging-belgium"} />
      <MenuBtn icon="🗺️" label={L.stationsLink || "Charging Stations"} onClick={() => window.location.href = "/ev-charging-stations-belgium"} />
      <MenuBtn icon="📡" label="API Docs" onClick={() => window.location.href = "/api-docs"} />
      <MenuBtn icon="🔒" label={TC.privacyPolicy} onClick={onPrivacy} />
      <div style={{ height:1, background:"rgba(255,255,255,0.07)", margin:"6px 0" }} />
      <MenuBtn icon="🚪" label={TC.signOut} onClick={onLogout} danger />
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