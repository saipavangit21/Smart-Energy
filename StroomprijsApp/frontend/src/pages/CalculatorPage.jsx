/**
 * CalculatorPage.jsx â€” SmartPrice.be
 * 4-step energy plan wizard
 * Step 1: Energy types   â†’ Step 2: Appliances â†’ Step 3: Usage & situation â†’ Step 4: Your details â†’ Results
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import LangSwitcher from "../components/LangSwitcher";

// â”€â”€â”€ Design tokens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const C = {
  bg:     "#060B14",
  panel:  "#0A1628",
  card:   "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.08)",
  teal:   "#0D9488",
  green:  "#10B981",
  orange: "#F97316",
  yellow: "#F59E0B",
  red:    "#EF4444",
  cyan:   "#06B6D4",
  purple: "#8B5CF6",
  muted:  "#64748B",
  soft:   "#94A3B8",
  light:  "#E2E8F0",
};

const REGIONS_DATA = [
  { id: "flanders", flag: "ðŸ”¶", note: "Fluvius Â· capacity tariff" },
  { id: "wallonia",  flag: "ðŸ”·", note: "ORES/RESA Â· kWh tariff"  },
  { id: "brussels",  flag: "ðŸ™ï¸", note: "Sibelga Â· kWh tariff"   },
];

// â”€â”€â”€ Supplier brand tiles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SUPPLIER_BRANDS = {
  "bolt energy": { abbr: "âš¡", color: "#fff",     bg: "#1A1A2E", border: "#00C896" },
  "bolt":        { abbr: "âš¡", color: "#fff",     bg: "#1A1A2E", border: "#00C896" },
  "engie":       { abbr: "EN", color: "#fff",     bg: "#0066A1" },
  "luminus":     { abbr: "LU", color: "#1a1a1a",  bg: "#FFB800" },
  "totalenergies":{ abbr: "TE", color: "#fff",    bg: "#EF3340" },
  "total":       { abbr: "TE", color: "#fff",     bg: "#EF3340" },
  "eneco":       { abbr: "EC", color: "#fff",     bg: "#00A651" },
  "mega":        { abbr: "MG", color: "#fff",     bg: "#7C3AED" },
  "octa+":       { abbr: "O+", color: "#fff",     bg: "#F97316" },
  "octa":        { abbr: "O+", color: "#fff",     bg: "#F97316" },
  "lampiris":    { abbr: "LP", color: "#fff",     bg: "#22C55E" },
};

function SupplierTile({ name = "", size = 40 }) {
  const key = name.toLowerCase().trim();
  const brand = SUPPLIER_BRANDS[key]
    || Object.entries(SUPPLIER_BRANDS).find(([k]) => key.includes(k))?.[1]
    || { abbr: name.slice(0, 2).toUpperCase(), color: "#fff", bg: "#1E3A5F" };
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.25),
      background: brand.bg, flexShrink: 0,
      border: brand.border ? `1.5px solid ${brand.border}` : "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: brand.abbr.length > 2 ? size * 0.32 : size * 0.3,
      fontWeight: 900, color: brand.color, letterSpacing: "-0.5px",
    }}>
      {brand.abbr}
    </div>
  );
}

// â”€â”€â”€ Tiny shared components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const Badge = ({ children, color }) => (
  <span style={{ background: color + "22", color, fontSize: 10, fontWeight: 700,
    padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap", letterSpacing: "0.3px" }}>
    {children}
  </span>
);

const Toggle = ({ value, onChange }) => (
  <div onClick={() => onChange(!value)} style={{
    width: 44, height: 24, borderRadius: 12, flexShrink: 0,
    background: value ? C.green : "rgba(255,255,255,0.08)",
    cursor: "pointer", position: "relative", transition: "background 0.25s",
  }}>
    <div style={{ position: "absolute", top: 2, left: value ? 22 : 2,
      width: 20, height: 20, borderRadius: "50%", background: "#fff",
      transition: "left 0.25s", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }} />
  </div>
);

const Btn = ({ onClick, disabled, children, variant = "primary", style: s = {} }) => {
  const base = {
    padding: "14px 0", borderRadius: 12, border: "none",
    fontSize: 15, fontWeight: 800, cursor: disabled ? "default" : "pointer",
    transition: "all 0.2s", width: "100%", ...s,
  };
  if (variant === "primary") return (
    <button onClick={onClick} disabled={disabled} style={{
      ...base,
      background: disabled ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#0D9488,#1A56A4)",
      color: disabled ? C.muted : "#fff",
      boxShadow: disabled ? "none" : "0 4px 24px rgba(13,148,136,0.35)",
    }}>{children}</button>
  );
  return (
    <button onClick={onClick} style={{
      ...base, background: "transparent",
      border: `1px solid ${C.border}`, color: C.muted, fontSize: 14,
    }}>{children}</button>
  );
};

// â”€â”€â”€ Step progress indicator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// STEP_META moved inside StepBar component

function StepBar({ step }) {
  const { tSection } = useLanguage();
  const CC = tSection("calculator");
  const STEP_META = [
    { label: CC.step1 || "Energy",     icon: "âš¡" },
    { label: CC.step2 || "Appliances", icon: "ðŸ " },
    { label: CC.step3 || "Usage",      icon: "ðŸ“Š" },
    { label: CC.step4 || "Details",    icon: "ðŸ‘¤" },
  ];
  return (
    <div style={{ padding: "12px 0 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
        {STEP_META.map((s, i) => {
          const done   = i < step;
          const active = i === step;
          const last   = i === STEP_META.length - 1;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, minWidth: 56 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: done ? 13 : 14, fontWeight: 800, transition: "all 0.3s",
                  background: done  ? C.green
                             : active ? "linear-gradient(135deg,#0D9488,#1A56A4)"
                             : "rgba(255,255,255,0.05)",
                  border: `2px solid ${done ? C.green : active ? C.teal : "rgba(255,255,255,0.08)"}`,
                  color: done || active ? "#fff" : C.muted,
                  boxShadow: active ? `0 0 18px ${C.teal}55` : "none",
                }}>
                  {done ? "âœ“" : s.icon}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: done ? C.green : active ? C.light : C.muted, whiteSpace: "nowrap" }}>
                  {s.label}
                </div>
              </div>
              {!last && (
                <div style={{ width: 40, height: 2, marginBottom: 20,
                  background: done ? C.green : "rgba(255,255,255,0.07)",
                  transition: "background 0.4s" }} />
              )}
            </div>
          );
        })}
      </div>
      {/* thin progress fill */}
      <div style={{ height: 2, background: "rgba(255,255,255,0.05)", borderRadius: 2, margin: "4px 0 0" }}>
        <div style={{ height: "100%", borderRadius: 2, transition: "width 0.5s ease",
          width: `${(step / 3) * 100}%`,
          background: "linear-gradient(90deg,#0D9488,#10B981)" }} />
      </div>
    </div>
  );
}

// â”€â”€â”€ STEP 1 Â· Energy types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ENERGY_OPTIONS moved inside Step1

function Step1({ data, onChange, onNext }) {
  const { tSection } = useLanguage();
  const CC = tSection("calculator");
  const TC = tSection("common");
  const ENERGY_OPTIONS = [
    { id: "electricity", icon: "âš¡", label: CC.energyElecLabel  || "Electricity",  color: C.teal,   desc: CC.energyElecDesc  || "EPEX Spot dynamic, variable or fixed plans" },
    { id: "gas",         icon: "ðŸ”¥", label: CC.energyGasLabel   || "Natural Gas",  color: C.orange, desc: CC.energyGasDesc   || "TTF-linked or fixed gas supplier plans" },
    { id: "solar",       icon: "â˜€ï¸", label: CC.energySolarLabel || "Solar Panels", color: C.yellow, desc: CC.energySolarDesc || "I have solar â€” factor in self-consumption" },
    { id: "ev",          icon: "ðŸš—", label: CC.energyEvLabel    || "Electric Car", color: C.cyan,   desc: CC.energyEvDesc    || "EV charging shapes my peak demand" },
    { id: "heatpump",    icon: "ðŸŒ¡ï¸", label: CC.energyHpLabel   || "Heat Pump",    color: C.purple, desc: CC.energyHpDesc    || "Heat pump for heating and/or cooling" },
  ];
  const sel = data.energyTypes || [];
  const toggle = (id) => onChange({ energyTypes: sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id] });
  const canGo  = sel.includes("electricity") || sel.includes("gas");

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: C.teal, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>{CC.step1}</div>
        <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px", lineHeight: 1.2 }}>{CC.step1Title || "What energy does your home use?"}</h2>
        <p style={{ margin: 0, color: C.muted, fontSize: 14, lineHeight: 1.6 }}>{CC.step1Sub || "Select everything that applies."}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 24 }}>
        {ENERGY_OPTIONS.map(opt => {
          const on = sel.includes(opt.id);
          return (
            <div key={opt.id} onClick={() => toggle(opt.id)} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
              borderRadius: 14, cursor: "pointer",
              border: `1px solid ${on ? opt.color + "55" : C.border}`,
              background: on ? opt.color + "0D" : C.card,
              transition: "all 0.18s",
            }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, flexShrink: 0,
                background: on ? opt.color + "22" : "rgba(255,255,255,0.04)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              }}>{opt.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: on ? opt.color : C.light, marginBottom: 2 }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{opt.desc}</div>
              </div>
              <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, transition: "all 0.18s",
                border: `2px solid ${on ? opt.color : "rgba(255,255,255,0.15)"}`,
                background: on ? opt.color : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {on && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>âœ“</span>}
              </div>
            </div>
          );
        })}
      </div>

      {sel.length > 0 && !canGo && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#F87171", marginBottom: 16 }}>
          {CC.selectEnergyWarning || "âš  Please select at least Electricity or Gas to get plan quotes."}
        </div>
      )}

      <Btn onClick={onNext} disabled={!canGo}>{CC.continueBtn || "Continue â†’"}</Btn>
    </div>
  );
}

// â”€â”€â”€ STEP 2 Â· Appliances â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Step2({ data, onChange, onNext, onBack }) {
  const { tSection } = useLanguage();
  const CC = tSection("calculator");
  const TC = tSection("common");
  const AP = tSection("appliances");
  const trApp = (a) => ({ ...a, label: AP[a.id]?.label || a.label, tip: AP[a.id]?.tip || a.tip });
  const [elecList, setElecList] = useState([]);
  const [gasList,  setGasList]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  const hasElec  = (data.energyTypes || []).includes("electricity");
  const hasGas   = (data.energyTypes || []).includes("gas");
  const hasEV    = (data.energyTypes || []).includes("ev");
  const hasHP    = (data.energyTypes || []).includes("heatpump");
  const hasSolar = (data.energyTypes || []).includes("solar");

  // Fetch appliance lists once
  useEffect(() => {
    const p = [];
    if (hasElec) p.push(fetch("/api/suppliers/appliances").then(r => r.json()).then(d => { if (d.success) setElecList(d.appliances); }));
    if (hasGas)  p.push(fetch("/api/suppliers/gas-appliances").then(r => r.json()).then(d => { if (d.success) setGasList(d.appliances); }));
    Promise.all(p).finally(() => setLoading(false));
  }, []);

  // Default-initialise selections once list arrives
  useEffect(() => {
    if (!elecList.length || data.elecSel) return;
    const defs = {};
    elecList.forEach(a => {
      defs[a.id] = {
        selected: !((a.id.startsWith("ev") && !hasEV) || (a.id === "heat_pump" && !hasHP) || (a.id === "pool_pump")),
        uses: a.default_uses_per_week,
      };
    });
    onChange({ elecSel: defs });
  }, [elecList]);

  useEffect(() => {
    if (!gasList.length || data.gasSel) return;
    const defs = {};
    gasList.forEach(a => { defs[a.id] = { selected: true, uses: a.default_uses_per_week }; });
    onChange({ gasSel: defs });
  }, [gasList]);

  const setElec = (id, patch) => onChange({ elecSel: { ...data.elecSel, [id]: { ...(data.elecSel||{})[id], ...patch } } });
  const setGas  = (id, patch) => onChange({ gasSel:  { ...data.gasSel,  [id]: { ...(data.gasSel ||{})[id], ...patch } } });

  const selectedElec = Object.values(data.elecSel || {}).filter(v => v.selected).length;
  const selectedGas  = Object.values(data.gasSel  || {}).filter(v => v.selected).length;

  if (loading) return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{ fontSize: 28, marginBottom: 12, animation: "spin 1.5s linear infinite" }}>âš¡</div>
      <div style={{ color: C.muted, fontSize: 14 }}>Loading appliancesâ€¦</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const AppRow = ({ a, sel, onSet, accent }) => (
    <div style={{
      background: sel.selected ? C.card : "rgba(255,255,255,0.01)",
      border: `1px solid ${sel.selected ? accent + "30" : C.border}`,
      borderRadius: 12, padding: "10px 12px", marginBottom: 7,
      opacity: sel.selected ? 1 : 0.45, transition: "all 0.15s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* checkbox */}
        <div onClick={() => onSet(a.id, { selected: !sel.selected })} style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: "pointer",
          border: `2px solid ${sel.selected ? accent : C.border}`,
          background: sel.selected ? accent + "20" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
        }}>
          {sel.selected && <span style={{ color: accent, fontSize: 12, lineHeight: 1, fontWeight: 800 }}>âœ“</span>}
        </div>
        <span style={{ fontSize: 20, flexShrink: 0 }}>{a.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: C.light, fontSize: 13, fontWeight: 600 }}>{a.label}</div>
          <div style={{ color: C.muted, fontSize: 11 }}>{a.kwh_per_use} {CC.kwhPerUse || "kWh/use"}{a.peak_kw ? ` Â· ${CC.peak || "peak"} ${a.peak_kw} kW` : ""}</div>
        </div>
        {/* counter */}
        {sel.selected && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <button onClick={() => { const n = Math.max(0, sel.uses - 1); onSet(a.id, n === 0 ? { uses: 0, selected: false } : { uses: n }); }} style={{
              width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.border}`,
              background: "rgba(255,255,255,0.05)", color: sel.uses <= 1 ? "#334" : C.light,
              fontSize: 16, cursor: "pointer", lineHeight: 1, flexShrink: 0,
            }}>âˆ’</button>
            <div style={{ textAlign: "center", minWidth: 38 }}>
              <div style={{ color: C.light, fontWeight: 800, fontSize: 14 }}>{sel.uses}Ã—</div>
              <div style={{ color: C.muted, fontSize: 9, lineHeight: 1 }}>{CC.perWeek || "per week"}</div>
            </div>
            <button onClick={() => onSet(a.id, { uses: Math.min(21, sel.uses + 1) })} style={{
              width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.border}`,
              background: "rgba(255,255,255,0.05)", color: C.light,
              fontSize: 16, cursor: "pointer", lineHeight: 1, flexShrink: 0,
            }}>+</button>
          </div>
        )}
      </div>
      {sel.selected && a.tip && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`, color: C.muted, fontSize: 11, lineHeight: 1.5 }}>
          ðŸ’¡ {a.tip}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: C.teal, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>{CC.step2}</div>
        <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px", lineHeight: 1.2 }}>{CC.step2Title || "Which appliances do you use?"}</h2>
        <p style={{ margin: 0, color: C.muted, fontSize: 14, lineHeight: 1.6 }}>{CC.step2Sub || "Tap to toggle."}</p>
      </div>

      {hasSolar && (
        <div style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.22)",
          borderRadius: 12, padding: "11px 14px", marginBottom: 16, fontSize: 12, color: C.yellow, lineHeight: 1.6 }}>
          â˜€ï¸ <strong>Solar detected</strong> â€” we'll factor in self-consumption and net metering in step 3.
        </div>
      )}

      {hasElec && elecList.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.teal }}>{CC.elecAppliances || "âš¡ Electricity appliances"}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{`${selectedElec} ${CC.selected || "selected"}`}</div>
          </div>
          {elecList.map(a => (
            <AppRow key={a.id} a={trApp(a)} sel={(data.elecSel||{})[a.id] || { selected: false, uses: a.default_uses_per_week }} onSet={setElec} accent={C.teal} />
          ))}
        </div>
      )}

      {hasGas && gasList.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.orange }}>{CC.gasAppliances   || "ðŸ”¥ Gas appliances"}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{`${selectedGas} ${CC.selected || "selected"}`}</div>
          </div>
          {gasList.map(a => (
            <AppRow key={a.id} a={trApp(a)} sel={(data.gasSel||{})[a.id] || { selected: false, uses: a.default_uses_per_week }} onSet={setGas} accent={C.orange} />
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={onBack} variant="ghost" style={{ flex: 1 }}>{CC.back}</Btn>
        <div style={{ flex: 3 }}><Btn onClick={onNext}>Continue â€” Usage & Situation â†’</Btn></div>
      </div>
    </div>
  );
}

// â”€â”€â”€ STEP 3 Â· Usage & situation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const HOUSEHOLD = [
  { id: "1",   label: "1 person",    icon: "ðŸ‘¤", sub: "Studio / flat" },
  { id: "2",   label: "2 people",    icon: "ðŸ‘¥", sub: "Couple" },
  { id: "3-4", label: "3â€“4 people",  icon: "ðŸ‘¨â€ðŸ‘©â€ðŸ‘§", sub: "Family home" },
  { id: "5+",  label: "5+ people",   icon: "ðŸ‘¨â€ðŸ‘©â€ðŸ‘§â€ðŸ‘¦", sub: "Large family" },
];
const CONTRACT_TYPES = [
  { id: "cheapest", icon: "ðŸ’¸", label: "Just the cheapest", sub: "Show all types, ranked by price" },
  { id: "variable", icon: "ðŸ“ˆ", label: "Variable rate",     sub: "Moves monthly with the market" },
  { id: "fixed",    icon: "ðŸ”’", label: "Fixed rate",        sub: "Locked price for 1â€“3 years" },
  { id: "dynamic",  icon: "âš¡", label: "Dynamic (EPEX)",    sub: "Hourly spot prices â€” best with SmartPrice" },
];

function Step3({ data, onChange, onNext, onBack }) {
  const { tSection } = useLanguage();
  const CC = tSection("calculator");
  const TC = tSection("common");
  const REGIONS = REGIONS_DATA.map(r => ({ ...r, label: TC[r.id] || r.id }));
  const HOUSEHOLD_SIZES = [
    { id: "1",   label: CC.household1Label  || "1 person",   icon: "ðŸ‘¤", sub: CC.household1Sub  || "Studio / flat" },
    { id: "2",   label: CC.household2Label  || "2 people",   icon: "ðŸ‘¥", sub: CC.household2Sub  || "Couple" },
    { id: "3-4", label: CC.household34Label || "3â€“4 people", icon: "ðŸ‘¨â€ðŸ‘©â€ðŸ‘§", sub: CC.household34Sub || "Family home" },
    { id: "5+",  label: CC.household5Label  || "5+ people",  icon: "ðŸ‘¨â€ðŸ‘©â€ðŸ‘§â€ðŸ‘¦", sub: CC.household5Sub  || "Large family" },
  ];
  const CONTRACT_TYPES = [
    { id: "cheapest", icon: "ðŸ’¸", label: CC.contractCheapestLabel || "Just the cheapest", sub: CC.contractCheapestSub || "Show all types, ranked by price" },
    { id: "variable", icon: "ðŸ“ˆ", label: CC.contractVariableLabel || "Variable rate",     sub: CC.contractVariableSub || "Moves monthly with the market" },
    { id: "fixed",    icon: "ðŸ”’", label: CC.contractFixedLabel    || "Fixed rate",        sub: CC.contractFixedSub    || "Locked price for 1â€“3 years" },
    { id: "dynamic",  icon: "âš¡", label: CC.contractDynamicLabel  || "Dynamic (EPEX)",    sub: CC.contractDynamicSub  || "Hourly spot prices â€” best with SmartPrice" },
  ];
  const set = (k, v) => onChange({ [k]: v });
  const hasSolar = (data.energyTypes || []).includes("solar");
  const canGo = data.region && data.householdSize && data.contractPref;

  const PickRow = ({ item, field, accent = C.teal }) => {
    const on = data[field] === item.id;
    return (
      <button onClick={() => set(field, item.id)} style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
        borderRadius: 12, cursor: "pointer", textAlign: "left", width: "100%",
        border: `1px solid ${on ? accent + "55" : C.border}`,
        background: on ? accent + "0E" : C.card,
        marginBottom: 8, transition: "all 0.15s",
      }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: on ? accent : C.light }}>{item.label}</div>
          {item.sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{item.sub}</div>}
          {item.note && <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{item.note}</div>}
        </div>
        <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
          border: `2px solid ${on ? accent : C.border}`, background: on ? accent : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
        }}>
          {on && <span style={{ color: "#fff", fontSize: 10, lineHeight: 1 }}>âœ“</span>}
        </div>
      </button>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: C.teal, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>{CC.step3}</div>
        <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px", lineHeight: 1.2 }}>{CC.step3Title || "Your usage & situation"}</h2>
        <p style={{ margin: 0, color: C.muted, fontSize: 14, lineHeight: 1.6 }}>{CC.step3Sub || "This lets us calculate regional grid costs."}</p>
      </div>

      {/* Region */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.soft, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.8px" }}>{CC.yourRegion || "ðŸ“ Your region"}</div>
        <div style={{ display: "flex", gap: 8 }}>
          {REGIONS.map(r => {
            const on = data.region === r.id;
            return (
              <button key={r.id} onClick={() => set("region", r.id)} style={{
                flex: 1, padding: "12px 6px", borderRadius: 12, cursor: "pointer", textAlign: "center",
                border: `1px solid ${on ? C.teal + "55" : C.border}`,
                background: on ? C.teal + "0E" : C.card, transition: "all 0.15s",
              }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{r.flag}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: on ? C.teal : C.light }}>{r.label}</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{r.note}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Household */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.soft, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.8px" }}>{CC.householdSize || "ðŸ  Household size"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {HOUSEHOLD.map(h => {
            const on = data.householdSize === h.id;
            return (
              <button key={h.id} onClick={() => set("householdSize", h.id)} style={{
                padding: "12px 14px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                border: `1px solid ${on ? C.teal + "55" : C.border}`,
                background: on ? C.teal + "0E" : C.card, transition: "all 0.15s",
              }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{h.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: on ? C.teal : C.light }}>{h.label}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{h.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contract type */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.soft, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.8px" }}>ðŸ“‹ Contract preference</div>
        {CONTRACT_TYPES.map(c => <PickRow key={c.id} item={c} field="contractPref" />)}
      </div>

      {/* Solar detail */}
      {hasSolar && (
        <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.yellow, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.8px" }}>â˜€ï¸ Solar details</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[["solarKwp", "System size (kWp)", "e.g. 6"], ["solarYield", "Annual yield (kWh)", "e.g. 5000"]].map(([key, label, ph]) => (
              <div key={key}>
                <div style={{ color: C.muted, fontSize: 11, marginBottom: 5 }}>{label}</div>
                <input type="number" placeholder={ph} value={data[key] || ""} onChange={e => set(key, e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
                    background: C.panel, color: C.light, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Green toggle */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 16px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.light }}>ðŸŒ¿ Green energy only</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Only show 100% renewable electricity plans</div>
          </div>
          <Toggle value={data.greenOnly || false} onChange={v => set("greenOnly", v)} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={onBack} variant="ghost" style={{ flex: 1 }}>{CC.back}</Btn>
        <div style={{ flex: 3 }}><Btn onClick={onNext} disabled={!canGo}>Continue â€” Your Details â†’</Btn></div>
      </div>
    </div>
  );
}

// â”€â”€â”€ STEP 4 Â· Personal details â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€â”€ Field â€” defined OUTSIDE Step4 so it never remounts on re-render â”€
function Field({ label, required, fieldKey, type = "text", placeholder, hint, prefix, value, onChange }) {
  return (
    <div>
      <div style={{ color: C.muted, fontSize: 11, marginBottom: 5 }}>
        {label} {required && <span style={{ color: C.red }}>*</span>}
      </div>
      <div style={{ position: "relative" }}>
        {prefix && (
          <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
            color: C.muted, fontSize: 14, pointerEvents: "none" }}>{prefix}</span>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(fieldKey, e.target.value)}
          style={{ width: "100%", padding: prefix ? "11px 14px 11px 28px" : "11px 14px",
            borderRadius: 10, border: `1px solid $C.border`, background: C.panel,
            color: C.light, fontSize: 14, outline: "none", boxSizing: "border-box" }}
          onFocus={e => e.target.style.borderColor = C.teal}
          onBlur={e => e.target.style.borderColor = C.border}
        />
      </div>
      {hint && <div style={{ color: C.muted, fontSize: 11, marginTop: 4, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}

function Step4({ data, onChange, onSubmit, onBack, loading, isGuest }) {
  const { tSection } = useLanguage();
  const CC = tSection("calculator");
  const TC = tSection("common");
  const { user } = useAuth();
  const set = useCallback((k, v) => onChange({ [k]: v }), [onChange]);
  const canGo = isGuest ? (data.firstName?.trim() && data.email?.trim()) : true;

  // Auto-fill from logged-in user on first render
  useEffect(() => {
    if (!user) return;
    const patch = {};
    if (!data.firstName && user.name)  patch.firstName = user.name.split(" ")[0];
    if (!data.lastName  && user.name && user.name.includes(" "))
      patch.lastName = user.name.split(" ").slice(1).join(" ");
    if (!data.email && user.email) patch.email = user.email;
    if (Object.keys(patch).length) onChange(patch);
  }, [user]);

  // Summary of what they picked
  const chips = [
    ...(data.energyTypes || []).map(t => ({ label: (CC.energyTypeLabels || {})[t] || { electricity: "âš¡ Electricity", gas: "ðŸ”¥ Gas", solar: "â˜€ï¸ Solar", ev: "ðŸš— EV", heatpump: "ðŸŒ¡ï¸ Heat Pump" }[t] || t, color: C.teal })),
    data.region      && { label: "ðŸ“ " + ((CC.regionLabels || {})[data.region] || data.region.charAt(0).toUpperCase() + data.region.slice(1)), color: C.muted },
    data.householdSize && { label: "ðŸ  " + data.householdSize + " " + (data.householdSize === "1" ? (CC.householdSuffix || "person") : (CC.householdSuffixPlural || "persons")), color: C.muted },
    data.contractPref  && { label: "ðŸ“‹ " + data.contractPref,  color: C.muted },
    data.greenOnly     && { label: "ðŸŒ¿ Green",                  color: C.green },
  ].filter(Boolean);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: C.teal, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>{CC.step4}</div>
        <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px", lineHeight: 1.2 }}>
          {isGuest ? TC.register || "Create your free account" : CC.calculate || "Ready to calculate!"}
        </h2>
        <p style={{ margin: 0, color: C.muted, fontSize: 14, lineHeight: 1.6 }}>
          {isGuest ? CC.signInSub || "Free account â€” no spam, ever." : CC.signInSub2 || "We already have your details â€” just hit Calculate."}
        </p>
      </div>

      {/* Summary chip row */}
      <div style={{ background: C.teal + "0A", border: `1px solid ${C.teal}25`, borderRadius: 14, padding: "13px 16px", marginBottom: 22 }}>
        <div style={{ fontSize: 10, color: C.teal, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 9 }}>{CC.yourProfile || "Your profile"}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {chips.map((ch, i) => (
            <span key={i} style={{ fontSize: 11, background: ch.color + "18", border: `1px solid ${ch.color}30`,
              color: ch.color, borderRadius: 20, padding: "3px 10px", fontWeight: 600 }}>{ch.label}</span>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field fieldKey="firstName" label={TC.firstName || "First name"} required={isGuest} placeholder="Jan"
            value={data.firstName || ""} onChange={set} />
          <Field fieldKey="lastName" label={TC.lastName || "Last name"} placeholder="Janssen"
            value={data.lastName || ""} onChange={set} />
        </div>
        <Field fieldKey="email" type="email" label={TC.email || "Email address"} required={isGuest}
          placeholder="jan@example.be" hint={CC.emailHint || "We'll send your plan comparison here."}
          value={data.email || ""} onChange={set} />
        <Field fieldKey="postcode" label={TC.postcode || "Postcode"} placeholder="e.g. 2000"
          hint={CC.postcodeHint || "Optional â€” improves accuracy."}
          value={data.postcode || ""} onChange={set} />
        <Field fieldKey="currentBill" type="number" label={TC.currentBill || "Current monthly bill"}
          prefix="â‚¬" placeholder="e.g. 180" hint={CC.currentBillHint || "Optional â€” we'll calculate your potential savings."}
          value={data.currentBill || ""} onChange={set} />
      </div>

      <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`,
        borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontSize: 11, color: C.muted, lineHeight: 1.7 }}>
        {CC.gdprNote || "ðŸ”’ Your data is stored securely in the EU (GDPR compliant)."}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={onBack} variant="ghost" style={{ flex: 1 }}>{CC.back}</Btn>
        <div style={{ flex: 3 }}>
          <Btn onClick={onSubmit} disabled={loading || !canGo}>
            {loading ? `âš¡ ${CC.calculating}` : `ðŸ” ${CC.calculate} â†’`}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Plan card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PlanCard({ plan, rank, expanded, setExpanded, savings }) {

  const { tSection } = useLanguage();
  const CC = tSection("calculator");
  const TC = tSection("common");
  const isOpen = expanded === plan.plan_id;
  const isGas  = plan.plan_id?.includes("gas");
  const accent = isGas ? C.orange : (plan.type === "dynamic" ? C.green : plan.type === "fixed" ? C.cyan : C.teal);
  const savingsAmt = savings != null ? savings - plan.costs.total : null;

  return (
    <div onClick={() => setExpanded(isOpen ? null : plan.plan_id)} style={{
      background: plan.cheapest ? "linear-gradient(135deg,rgba(16,185,129,0.06),rgba(13,148,136,0.04))" : C.card,
      border: `1px solid ${plan.cheapest ? C.green + "55" : C.border}`,
      borderRadius: 14, padding: 14, marginBottom: 9, cursor: "pointer",
      transition: "border-color 0.15s",
    }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <SupplierTile name={plan.supplier_name} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginBottom: 3 }}>
            {plan.cheapest && <Badge color={C.green}>{CC.bestDeal    || "ðŸ† BEST DEAL"}</Badge>}
            <span style={{ fontSize: 13, fontWeight: 700, color: C.light }}>{plan.supplier_name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: C.muted }}>{plan.plan_name}</span>
            <Badge color={accent}>{plan.type?.charAt(0).toUpperCase() + plan.type?.slice(1)}</Badge>
            {plan.green && <Badge color={C.green}>ðŸŒ¿ Green</Badge>}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: plan.cheapest ? C.green : C.light, fontFamily: "monospace" }}>
            â‚¬{plan.costs.total}
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>â‚¬{plan.costs.monthly}/mo</div>
          {savingsAmt != null && savingsAmt > 0 && (
            <div style={{ fontSize: 10, color: C.green, fontWeight: 700 }}>save â‚¬{Math.round(savingsAmt)}/yr</div>
          )}
          {savingsAmt != null && savingsAmt < 0 && (
            <div style={{ fontSize: 10, color: C.red }}>+â‚¬{Math.round(Math.abs(savingsAmt))}/yr vs current</div>
          )}
        </div>
        <span style={{ color: C.muted, fontSize: 11, marginLeft: 2 }}>{isOpen ? "â–²" : "â–¼"}</span>
      </div>

      {/* Expanded breakdown */}
      {isOpen && (
        <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
          {/* Cost grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 10 }}>
            {[[CC.step1 || CC.energyCost || "Energy", plan.costs.energy, C.orange], [CC.gridCost   || "Grid", plan.costs.grid, C.yellow],
              [CC.standing   || "Standing", plan.costs.standing, C.muted], ["VAT", plan.costs.vat, C.muted]].map(([l, v, col]) => (
              <div key={l} style={{ background: C.panel, borderRadius: 9, padding: "9px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: col, fontFamily: "monospace" }}>â‚¬{v}</div>
              </div>
            ))}
          </div>
          {/* Per kWh + duration */}
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1, background: C.panel, borderRadius: 9, padding: "9px 12px" }}>
              <div style={{ fontSize: 10, color: C.muted }}>All-in tariff</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: accent, fontFamily: "monospace" }}>{plan.costs.perKwh} câ‚¬/kWh</div>
            </div>
            <div style={{ flex: 1, background: C.panel, borderRadius: 9, padding: "9px 12px" }}>
              <div style={{ fontSize: 10, color: C.muted }}>Contract</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.light }}>{plan.duration || "Rolling"}</div>
            </div>
          </div>
          {/* Formula if dynamic */}
          {plan.formula && (
            <div style={{ background: "rgba(6,182,212,0.07)", border: "1px solid rgba(6,182,212,0.18)",
              borderRadius: 9, padding: "9px 12px", marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>Pricing formula</div>
              <div style={{ fontSize: 12, color: C.cyan, fontFamily: "monospace" }}>{plan.formula}</div>
            </div>
          )}
          {/* Highlights */}
          {plan.highlights?.map(h => (
            <div key={h} style={{ fontSize: 12, color: C.muted, marginBottom: 3 }}>âœ“ {h}</div>
          ))}
          {/* CTA */}
          <a href={plan.supplier_url || "#"} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ display: "block", marginTop: 10, background: accent + "18", border: `1px solid ${accent}44`,
              color: accent, borderRadius: 10, padding: "11px 0", textAlign: "center",
              fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            Visit {plan.supplier_name} â†’
          </a>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Results page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Results({ results, data, onRestart, isGuest, onSignIn }) {
  const { tSection } = useLanguage();
  const CC = tSection("calculator");
  const TC = tSection("common");
  const AP = tSection("appliances");
  const [expanded, setExpanded] = useState(null);
  const hasElec = results.electricity?.success;
  const hasGas  = results.gas?.success;
  const annualBill = (data.currentBill && parseFloat(data.currentBill) > 0)
    ? parseFloat(data.currentBill) * 12
    : null;

  const ConsumptionCard = ({ cons, isGas }) => {
    const accent = isGas ? C.orange : C.teal;
    return (
      <div style={{ background: accent + "08", border: `1px solid ${accent}22`, borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: cons.breakdown?.length ? 12 : 0 }}>
          <div>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 3 }}>{CC.annualUsage || "Annual usage"}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: C.light, fontFamily: "monospace", lineHeight: 1 }}>
              {cons.total_kwh?.toLocaleString()} <span style={{ fontSize: 12, color: C.muted }}>kWh</span>
            </div>
          </div>
          {!isGas && cons.peak_kw && (
            <div>
              <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 3 }}>{CC.peakLoad    || "Peak load"}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: C.yellow, fontFamily: "monospace", lineHeight: 1 }}>
                {cons.peak_kw} <span style={{ fontSize: 12, color: C.muted }}>kW</span>
              </div>
            </div>
          )}
        </div>
        {cons.breakdown?.slice(0, 5).map(b => (
          <div key={b.id} style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
              <span style={{ color: C.light }}>{b.icon} {AP[b.id]?.label || b.label}</span>
              <span style={{ color: C.muted }}>{b.annual_kwh} kWh Â· {b.pct}%</span>
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
              <div style={{ height: "100%", width: `${Math.min(100, b.pct)}%`, background: accent, borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Hero result banner */}
      <div style={{ background: "linear-gradient(135deg,rgba(16,185,129,0.1),rgba(13,148,136,0.08))",
        border: `1px solid ${C.green}44`, borderRadius: 18, padding: "20px 22px", marginBottom: 22 }}>
        <div style={{ fontSize: 10, color: C.green, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>
          {`ðŸŽ‰ ${CC.resultsTitle || "Your personalised plan comparison"}`}
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, color: C.light, marginBottom: annualBill ? 8 : 0 }}>
          {data.firstName ? `${(CC.hiUser || "Hi {name}! ").replace("{name}", data.firstName)}` : ""}{CC.resultsSub || "Here are the best plans for your profile."}
        </div>
        {annualBill && hasElec && results.electricity.results?.[0] && (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: C.muted }}>Current spend</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.light, fontFamily: "monospace" }}>â‚¬{Math.round(annualBill)}/yr</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.muted }}>Best plan found</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.green, fontFamily: "monospace" }}>â‚¬{results.electricity.results[0].costs.total}/yr</div>
            </div>
            {annualBill > results.electricity.results[0].costs.total && (
              <div>
                <div style={{ fontSize: 10, color: C.muted }}>Potential saving</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.green, fontFamily: "monospace" }}>
                  â‚¬{Math.round(annualBill - results.electricity.results[0].costs.total)}/yr
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sign-in nudge â€” shown only to guests, after they've seen value */}
      {isGuest && (
        <div style={{ background: "linear-gradient(135deg,rgba(13,148,136,0.08),rgba(26,86,164,0.06))",
          border: "1px solid rgba(13,148,136,0.25)", borderRadius: 14, padding: "16px 18px", marginBottom: 20,
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0", marginBottom: 3 }}>
              ðŸ’¾ Save your results & get alerts
            </div>
            <div style={{ fontSize: 12, color: "#556B82", lineHeight: 1.5 }}>
              Sign in free to save this comparison, get emailed when prices drop, and revisit anytime.
            </div>
          </div>
          <button onClick={onSignIn} style={{ padding: "10px 22px", borderRadius: 20, fontSize: 13, fontWeight: 700,
            background: "linear-gradient(135deg,#0D9488,#1A56A4)", border: "none", color: "#fff", cursor: "pointer",
            whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(13,148,136,0.35)" }}>
            Sign In Free â†’
          </button>
        </div>
      )}

      {/* Electricity section */}
      {hasElec && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, marginTop: 4 }}>
            <span style={{ fontSize: 18 }}>âš¡</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.teal }}>{CC.electricityPlans || "Electricity Plans"}</span>
            <span style={{ fontSize: 11, color: C.muted }}>Â· {`${results.electricity.results?.length} ${CC.plansFound || "plans found"}`}</span>
          </div>
          <ConsumptionCard cons={results.electricity.consumption} isGas={false} />
          {results.electricity.results?.map((plan, i) => (
            <PlanCard key={plan.plan_id} plan={plan} rank={i} expanded={expanded}
              setExpanded={setExpanded} savings={annualBill} />
          ))}
        </>
      )}

      {/* Gas section */}
      {hasGas && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, marginTop: 20 }}>
            <span style={{ fontSize: 18 }}>ðŸ”¥</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.orange }}>{CC.gasPlans || "Gas Plans"}</span>
            <span style={{ fontSize: 11, color: C.muted }}>Â· {`${results.gas.results?.length} ${CC.plansFound || "plans found"}`}</span>
          </div>
          <ConsumptionCard cons={results.gas.consumption} isGas={true} />
          {results.gas.results?.map((plan, i) => (
            <PlanCard key={plan.plan_id} plan={plan} rank={i} expanded={expanded}
              setExpanded={setExpanded} savings={null} />
          ))}
        </>
      )}

      <div style={{ textAlign: "center", margin: "20px 0", fontSize: 11, color: C.muted, lineHeight: 1.8 }}>
        {CC.costDisclaimer || "Annual cost includes energy + grid + levies + VAT."}<br/>
        {CC.tariffsNote || "Tariffs scraped weekly Â· Always verify on supplier website before switching."}
      </div>

      <Btn onClick={onRestart} variant="ghost">{`â†º ${CC.restartBtn || "Start a new calculation"}`}</Btn>
    </div>
  );
}

// â”€â”€â”€ Main wizard shell â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CALC_CACHE_KEY = "sp_calc_state";

export default function CalculatorPage({ isGuest, onBack, onSignIn }) {
  const { tSection } = useLanguage();
  const CC = tSection("calculator");
  const TC = tSection("common");
  const REGIONS = REGIONS_DATA.map(r => ({ ...r, label: TC[r.id] || r.id }));

  useEffect(() => {
    document.title = "Electricity & Gas Plan Calculator Belgium | SmartPrice.be";
    const desc = document.querySelector("meta[name='description']");
    if (desc) desc.setAttribute("content", "Compare all Belgian electricity and gas suppliers with your real annual cost including grid fees and VAT. Free 4-step calculator for households.");
    const canonical = document.getElementById('canonical-tag');
    if (canonical) canonical.setAttribute("href", "https://smartprice.be/calculator/electricity");
    return () => { document.title = "SmartPrice.be â€” Belgium Real-Time Electricity & Gas Prices"; };
  }, []);

  // Restore from sessionStorage on first mount (survives auth redirect)
  const [step, setStep] = useState(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem(CALC_CACHE_KEY));
      return (s?.step != null && s.step < 4) ? s.step : 0;
    } catch { return 0; }
  });
  const [data, setData] = useState(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem(CALC_CACHE_KEY));
      return s?.data ?? {};
    } catch { return {}; }
  });

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const topRef = useRef(null);

  // Persist step + data whenever they change
  useEffect(() => {
    try { sessionStorage.setItem(CALC_CACHE_KEY, JSON.stringify({ step, data })); } catch {}
  }, [step, data]);

  const update = useCallback((patch) => setData(d => ({ ...d, ...patch })), []);

  const go = (s) => { setStep(s); topRef.current?.scrollIntoView({ behavior: "smooth" }); };

  const submit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const hasElec = (data.energyTypes || []).includes("electricity");
      const hasGas  = (data.energyTypes || []).includes("gas");
      const typeFilter = data.contractPref === "cheapest" ? "all" : (data.contractPref || "all");

      const [elecRes, gasRes] = await Promise.all([
        hasElec ? fetch("/api/suppliers/calculate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appliances: Object.entries(data.elecSel || {})
              .filter(([, v]) => v.selected)
              .map(([id, v]) => ({ id, uses_per_week: v.uses })),
            region: data.region,
            epex_avg: 100,
            green_only: data.greenOnly || false,
          }),
        }).then(r => r.json()) : null,
        hasGas ? fetch("/api/suppliers/calculate-gas", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appliances: Object.entries(data.gasSel || {})
              .filter(([, v]) => v.selected)
              .map(([id, v]) => ({ id, uses_per_week: v.uses })),
            region: data.region,
            ttf_avg: 35,
          }),
        }).then(r => r.json()) : null,
      ]);

      const filterByType = (res) => {
        if (!res?.success) return res;
        if (typeFilter === "all") return res;
        return { ...res, results: (res.results || []).filter(p => p.type === typeFilter) };
      };

      setResults({ electricity: filterByType(elecRes), gas: filterByType(gasRes) });
      go(4);
    } catch (e) {
      setError(CC.errGeneric || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [data]);

  const restart = () => {
    setStep(0); setData({}); setResults(null); setError(null);
    try { sessionStorage.removeItem(CALC_CACHE_KEY); } catch {}
  };

  // On mount: if user just returned from auth (step=3, now logged in) â†’ auto-submit
  useEffect(() => {
    if (!isGuest && step === 3) submit();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={topRef} style={{ minHeight: "100vh", background: C.bg, color: C.light,
      fontFamily: "'DM Sans', system-ui, sans-serif", paddingBottom: 80 }}>

      {/* â”€â”€ Sticky nav â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ position: "sticky", top: 0, zIndex: 100,
        background: "rgba(6,11,20,0.97)", backdropFilter: "blur(24px)",
        borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 580, margin: "0 auto", padding: "10px 16px",
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {step > 0 && step < 4 && (
              <button onClick={() => go(step - 1)} style={{
                background: "transparent", border: `1px solid ${C.border}`,
                color: C.muted, borderRadius: 8, padding: "5px 12px", fontSize: 12, cursor: "pointer",
              }}>â†</button>
            )}
            <span style={{ fontSize: 18 }}>ðŸ‡§ðŸ‡ª</span>
            <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: "-0.5px" }}>SmartPrice</span>
            <span style={{ fontSize: 9, color: C.muted, background: "rgba(255,255,255,0.05)",
              border: `1px solid ${C.border}`, borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>
              CALCULATOR
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LangSwitcher />
            {!isGuest && (
              <span style={{ fontSize: 11, color: C.green, background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.25)", borderRadius: 20, padding: "3px 10px", fontWeight: 700 }}>
                âœ“ Signed in
              </span>
            )}
            <button onClick={onBack} style={{ background: "transparent", border: `1px solid ${C.border}`,
              color: C.muted, borderRadius: 8, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>
              Exit
            </button>
          </div>
        </div>
        {step < 4 && (
          <div style={{ maxWidth: 580, margin: "0 auto", padding: "0 16px" }}>
            <StepBar step={step} />
          </div>
        )}
      </div>

      {/* â”€â”€ Main content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ maxWidth: 580, margin: "0 auto", padding: "28px 16px" }}>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.09)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 12, padding: "12px 16px", marginBottom: 18, color: "#F87171", fontSize: 13, lineHeight: 1.6 }}>
            âš  {error}
          </div>
        )}

        {step === 0 && <Step1 data={data} onChange={update} onNext={() => go(1)} />}
        {step === 1 && <Step2 data={data} onChange={update} onNext={() => go(2)} onBack={() => go(0)} />}
        {step === 2 && <Step3 data={data} onChange={update} onNext={() => isGuest ? go(3) : go(3)} onBack={() => go(1)} />}
        {step === 3 && isGuest && (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>ðŸ”</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.light, marginBottom: 10 }}>
              Sign in to see your results
            </div>
            <div style={{ fontSize: 14, color: C.muted, maxWidth: 360, margin: "0 auto 28px", lineHeight: 1.7 }}>
              Your plan comparison is ready. Create a free account to unlock it â€” no credit card, takes 30 seconds.
            </div>
            <button onClick={onSignIn} style={{
              padding: "14px 36px", borderRadius: 50, fontSize: 15, fontWeight: 800,
              background: "linear-gradient(135deg,#0D9488,#1A56A4)", border: "none",
              color: "#fff", cursor: "pointer", boxShadow: "0 8px 32px rgba(13,148,136,0.4)",
              marginBottom: 16, display: "block", width: "100%", maxWidth: 320, margin: "0 auto 16px",
            }}>
              Sign In Free â€” See My Results â†’
            </button>
            <button onClick={() => go(2)} style={{
              background: "transparent", border: "none", color: C.muted,
              fontSize: 13, cursor: "pointer", textDecoration: "underline",
            }}>
              â† Go back
            </button>
          </div>
        )}
        {step === 3 && !isGuest && <Step4 data={data} onChange={update} onSubmit={submit} onBack={() => go(2)} loading={loading} isGuest={false} />}
        {step === 4 && results && !isGuest && <Results results={results} data={data} onRestart={restart} isGuest={false} onSignIn={onSignIn} />}
        {step === 4 && results && isGuest && (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>ðŸ”</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.light, marginBottom: 10 }}>
              Sign in to see your results
            </div>
            <div style={{ fontSize: 14, color: C.muted, maxWidth: 360, margin: "0 auto 28px", lineHeight: 1.7 }}>
              Your plan comparison is ready. Create a free account to unlock it â€” no credit card, takes 30 seconds.
            </div>
            <button onClick={onSignIn} style={{
              padding: "14px 36px", borderRadius: 50, fontSize: 15, fontWeight: 800,
              background: "linear-gradient(135deg,#0D9488,#1A56A4)", border: "none",
              color: "#fff", cursor: "pointer", boxShadow: "0 8px 32px rgba(13,148,136,0.4)",
              display: "block", width: "100%", maxWidth: 320, margin: "0 auto 16px",
            }}>
              Sign In Free â€” See My Results â†’
            </button>
            <button onClick={restart} style={{
              background: "transparent", border: "none", color: C.muted,
              fontSize: 13, cursor: "pointer", textDecoration: "underline",
            }}>
              â†º Start over
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
