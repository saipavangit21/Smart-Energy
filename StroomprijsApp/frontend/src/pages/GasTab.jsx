/**
 * GasTab.jsx — Gas dashboard matching electricity tab structure
 * Tabs: Today · Tomorrow · 7 Days · Suppliers · Alerts
 */
import { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, CartesianGrid,
} from "recharts";
import { useAuth } from "../context/AuthContext";

const C = {
  orange: "#F97316", teal: "#0D9488", navy: "#060B14", dark: "#0D1626",
  card: "#0A1628", border: "#1E3A5F", muted: "#64748B", light: "#E2E8F0",
  green: "#10B981", yellow: "#F59E0B", red: "#EF4444", cyan: "#06B6D4",
};

function pc(p) {
  if (p < 25) return C.green;
  if (p < 40) return C.teal;
  if (p < 55) return C.yellow;
  return C.orange;
}

function makeGasNav(TC) {
  return [
    { id: "today",     icon: "🔥", label: TC.today     },
    { id: "tomorrow",  icon: "⏩", label: TC.tomorrow  },
    { id: "week",      icon: "📅", label: TC.history   },
    { id: "suppliers", icon: "🏢", label: TC.suppliers },
    { id: "alerts",    icon: "🔔", label: TC.alerts    },
  ];
}

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].value;
  return (
    <div style={{ background: "#0D1E35", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px" }}>
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ color: pc(p), fontSize: 18, fontWeight: 700 }}>€{p?.toFixed(2)}/MWh</div>
      <div style={{ color: C.muted, fontSize: 11 }}>{(p / 10).toFixed(3)} c€/kWh</div>
    </div>
  );
}

function StatCard({ label, value, color, sub }) {
  return (
    <div style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
      <div style={{ color: C.muted, fontSize: 10, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
      <div style={{ color: color || C.light, fontSize: 20, fontWeight: 800, fontFamily: "monospace" }}>{value}</div>
      {sub && <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── TODAY ────────────────────────────────────────────────────
function TodayTab({ current, history }) {
  const { tSection } = useLanguage();
  const T  = tSection("dashboard");
  const TC = tSection("common");
  const CC = tSection("calculator");
  const AL = tSection("alerts");
  if (!current) return <Loading />;
  const price = current.ttf?.price;
  const color = pc(price || 0);
  const stats = history?.stats;
  const recent = (history?.history || []).slice(-14);
  const trendColor = (stats?.change || 0) > 0 ? C.red : C.green;

  return (
    <div>
      <div style={{ background: `linear-gradient(135deg,${color}18,${color}08)`, border: `1px solid ${color}44`, borderRadius: 20, padding: 24, marginBottom: 16, textAlign: "center" }}>
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>🔥 TTF Natural Gas · Today's Rate</div>
        <div style={{ color, fontSize: 56, fontWeight: 900, fontFamily: "monospace", lineHeight: 1 }}>€{price?.toFixed(2)}</div>
        <div style={{ color: C.muted, fontSize: 14, marginTop: 6 }}>per MWh</div>
        <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>= {current.ttf_cEkWh?.toFixed(3)} c€/kWh <span style={{ color: "#445" }}>(energy only)</span></div>
        {stats?.change != null && (
          <div style={{ color: trendColor, fontSize: 14, fontWeight: 600, marginTop: 10 }}>
            {stats.change > 0 ? "▲" : "▼"} {Math.abs(stats.change)}% vs yesterday
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <StatCard label={T.periodLow || "30-day Low"}  value={stats?.min != null ? `€${stats.min}` : "—"} color={C.green}  />
        <StatCard label={T.periodAvg || "30-day Avg"}  value={stats?.avg != null ? `€${stats.avg}` : "—"} color={C.yellow} />
        <StatCard label={T.periodHigh || "30-day High"} value={stats?.max != null ? `€${stats.max}` : "—"} color={C.orange} />
      </div>

      {recent.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 8px 8px", marginBottom: 16 }}>
          <div style={{ color: C.muted, fontSize: 12, paddingLeft: 8, marginBottom: 8 }}>TTF — Last 14 trading days (€/MWh)</div>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={recent}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.muted }} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: C.muted }} domain={["auto", "auto"]} width={38} />
              <Tooltip content={<Tip />} />
              <Line type="monotone" dataKey="price" stroke={C.orange} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
        <div style={{ color: C.teal, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>💡 What makes up your gas bill?</div>
        {[
          { pct: "~40%", label: T.gasEnergy   || "Energy (TTF-based)",    desc: T.gasEnergyDesc || "Market price — varies daily",             color: C.orange },
          { pct: "~35%", label: T.gasGrid     || "Grid & Distribution",   desc: T.gasGridDesc || "Fluxys + Fluvius/ORES",  color: C.teal   },
          { pct: "~25%", label: T.gasTaxes    || "Taxes & Levies",        desc: "Federal contribution + VAT (21%)",                        color: C.muted  },
        ].map(r => (
          <div key={r.label} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            <div style={{ color: r.color, fontWeight: 800, fontSize: 14, width: 42, flexShrink: 0 }}>{r.pct}</div>
            <div>
              <div style={{ color: C.light, fontSize: 13, fontWeight: 600 }}>{r.label}</div>
              <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{r.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TOMORROW ─────────────────────────────────────────────────
function TomorrowTab({ history }) {
  const { tSection } = useLanguage();
  const T  = tSection("dashboard");
  const TC = tSection("common");
  const CC = tSection("calculator");
  const AL = tSection("alerts");
  const stats  = history?.stats;
  const data   = history?.history || [];
  const latest = data[data.length - 1];
  const prev   = data[data.length - 2];
  const trend  = (latest && prev) ? latest.price - prev.price : 0;
  const proj   = latest ? (latest.price + trend * 0.5) : null;

  return (
    <div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28, marginBottom: 16, textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⏰</div>
        <div style={{ color: C.light, fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Tomorrow's TTF Price</div>
        <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
          TTF natural gas trades as a <strong style={{ color: C.light }}>day-ahead market</strong>.<br />
          The official price is settled each evening for the next day.
        </div>
        {proj && (
          <div style={{ background: "#0A2040", borderRadius: 14, padding: 20, marginBottom: 16 }}>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>PROJECTED RANGE (estimate based on trend)</div>
            <div style={{ color: C.orange, fontSize: 40, fontWeight: 900, fontFamily: "monospace" }}>
              €{(proj - 1.5).toFixed(1)} – €{(proj + 1.5).toFixed(1)}
            </div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>Not a guarantee · market can move significantly</div>
          </div>
        )}
        <div style={{ color: C.muted, fontSize: 13 }}>
          Official settlement price published after <strong style={{ color: C.light }}>18:00 CET</strong> on ICE/EEX.
        </div>
      </div>
      {stats && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
          <div style={{ color: C.teal, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📊 Recent context</div>
          <div style={{ display: "flex", gap: 8 }}>
            <StatCard label={T.periodLow || "30-day Low"}  value={stats.min != null ? `€${stats.min}` : "—"} color={C.green}  />
            <StatCard label={T.periodAvg || "30-day Avg"}  value={stats.avg != null ? `€${stats.avg}` : "—"} color={C.yellow} />
            <StatCard label={T.periodHigh || "30-day High"} value={stats.max != null ? `€${stats.max}` : "—"} color={C.orange} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── 7 DAYS ───────────────────────────────────────────────────
function WeekTab() {
  const { tSection } = useLanguage();
  const TC = tSection("common");
  const T  = tSection("dashboard");
  const [history, setHistory] = useState(null);
  const [days,    setDays]    = useState(7);

  useEffect(() => {
    setHistory(null);
    fetch(`/api/gas/history?days=${days}`).then(r => r.json()).then(d => {
      if (d.success) {
        const prices = (d.history || []).map(h => h.price).filter(p => p != null && !isNaN(p));
        if (prices.length > 0 && (d.stats?.avg == null || d.stats?.min == null)) {
          const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
          const latest = prices[prices.length - 1];
          const prev   = prices[prices.length - 2];
          d.stats = { avg: parseFloat(avg.toFixed(2)), min: parseFloat(Math.min(...prices).toFixed(2)), max: parseFloat(Math.max(...prices).toFixed(2)), latest, change: prev ? parseFloat(((latest - prev) / prev * 100).toFixed(1)) : 0, days };
        }
        setHistory(d);
      }
    });
  }, [days]);

  if (!history) return <Loading />;
  const { stats, history: data } = history;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[7, 14, 30, 90].map(d => (
          <button key={d} onClick={() => setDays(d)}
            style={{ flex: 1, padding: "9px 0", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${days === d ? C.orange : C.border}`, background: days === d ? `${C.orange}22` : C.card, color: days === d ? C.orange : C.muted }}>
            {d}d
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <StatCard label={T.periodLow || "Period Low"}  value={stats?.min != null ? `€${stats.min}` : "—"} color={C.green}  sub="€/MWh" />
        <StatCard label={T.periodAvg || "Period Avg"}  value={stats?.avg != null ? `€${stats.avg}` : "—"} color={C.yellow} sub="€/MWh" />
        <StatCard label={T.periodHigh || "Period High"} value={stats?.max != null ? `€${stats.max}` : "—"} color={C.orange} sub="€/MWh" />
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 8px 8px", marginBottom: 12 }}>
        <div style={{ color: C.muted, fontSize: 12, paddingLeft: 8, marginBottom: 8 }}>TTF Gas — {days} trading days (€/MWh)</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} barSize={data.length > 45 ? 3 : 8}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.muted }} tickFormatter={d => d.slice(5)} interval={Math.max(0, Math.floor(data.length / 6) - 1)} />
            <YAxis tick={{ fontSize: 10, fill: C.muted }} domain={["auto", "auto"]} width={38} />
            <Tooltip content={<Tip />} />
            {stats?.avg && <ReferenceLine y={stats.avg} stroke={C.yellow} strokeDasharray="4 4" label={{ value: TC.avg, fill: C.yellow, fontSize: 10, position: "insideTopRight" }} />}
            <Bar dataKey="price" radius={[3, 3, 0, 0]}>
              {data.map((entry, i) => <Cell key={i} fill={pc(entry.price)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 8 }}>
          {[["<€25", C.green], ["€25–40", C.teal], ["€40–55", C.yellow], [">€55", C.orange]].map(([l, color]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
              <span style={{ color: C.muted, fontSize: 10 }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ color: C.muted, fontSize: 11, textAlign: "center" }}>
        TTF is traded Monday–Friday. Weekends & holidays show no data.
      </div>
    </div>
  );
}

// ── SUPPLIERS ────────────────────────────────────────────────
const SUPPLIERS_DATA = [
  { id: "engie",         name: "Engie",        logo: "🔵", type: "variable", typeLabel: "Variable",    tariff: 8.21, standing: 85.20, color: "#0070F3", note: "Monthly indexed on TTF",             contract: "Monthly",   url: "https://www.engie.be" },
  { id: "luminus",       name: "Luminus",       logo: "🟡", type: "variable", typeLabel: "Variable",    tariff: 8.05, standing: 79.00, color: "#FFB800", note: "EDF Group — Belgium's 2nd largest",  contract: "Monthly",   url: "https://www.luminus.be" },
  { id: "totalenergies", name: "TotalEnergies", logo: "🔴", type: "fixed",    typeLabel: "Fixed 1yr",   tariff: 8.49, standing: 72.00, color: "#E8002D", note: "Price locked for 12 months",         contract: "12 months", url: "https://www.totalenergies.be" },
  { id: "bolt",          name: "Bolt Energy",   logo: "⚡", type: "dynamic",  typeLabel: "Dynamic TTF", tariff: null, standing: 65.00, color: "#00C896", note: "TTF spot + 0.5 c€/kWh markup",      contract: "Monthly",   url: "https://www.bolt.eu/en-be/energy", surcharge: 0.5 },
  { id: "eneco",         name: "Eneco",         logo: "🟢", type: "variable", typeLabel: "Variable",    tariff: 7.92, standing: 90.00, color: "#00A651", note: "Green gas options available",        contract: "Monthly",   url: "https://www.eneco.be" },
  { id: "mega",          name: "Mega",          logo: "🟣", type: "fixed",    typeLabel: "Fixed 1yr",   tariff: 7.13, standing: 95.40, color: "#7C3AED", note: "Lowest rate, higher standing charge", contract: "12 months", url: "https://www.mega.be" },
  { id: "octaplus",      name: "Octa+",         logo: "🟠", type: "variable", typeLabel: "Variable",    tariff: 8.10, standing: 80.00, color: "#F97316", note: "Belgian independent supplier",       contract: "Monthly",   url: "https://www.octaplus.be" },
];

function calcCost(rate, standing, consumption) {
  const e = (rate / 100) * consumption;
  const g = ((2.85 + 0.42 + 0.89) / 100) * consumption;
  const s = standing;
  const sub = e + g + s;
  const vat = sub * 0.21;
  const total = sub + vat;
  return { energy: Math.round(e), grid: Math.round(g), standing: Math.round(s), vat: Math.round(vat), total: Math.round(total), monthly: Math.round(total / 12), perKwh: (total / consumption * 100).toFixed(2) };
}


// ── GAS TABS: Calculator + Compare ───────────────────────────
function makeGasRegions(TC) {
  return [
    { id: "flanders", label: TC.flanders, flag: "🔶" },
    { id: "wallonia", label: TC.wallonia,  flag: "🔷" },
    { id: "brussels", label: TC.brussels,  flag: "🏙️" },
  ];
}
const GAS_TYPE_COLOR = { variable: "#0D9488", fixed: "#06B6D4", dynamic: "#10B981" };
const GAS_TYPE_LABEL = { variable: "Variable", fixed: "Fixed", dynamic: "Dynamic" };

function GasBadge({ children, color }) {
  return <span style={{ background: `${color}22`, color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>{children}</span>;
}

function GasPlanCard({ plan, rank, expanded, setExpanded }) {
  const isOpen = expanded === plan.plan_id;
  return (
    <div onClick={() => setExpanded(isOpen ? null : plan.plan_id)}
      style={{ background: C.card, border: `1px solid ${plan.cheapest ? C.green : C.border}`, borderRadius: 14, padding: 14, marginBottom: 8, cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${plan.supplier_color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
          {plan.supplier_logo}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            <span style={{ color: C.light, fontSize: 13, fontWeight: 700 }}>{plan.supplier_name}</span>
            <span style={{ color: C.muted, fontSize: 12 }}>{plan.plan_name}</span>
            {plan.cheapest && <GasBadge color={C.green}>BEST</GasBadge>}
            <GasBadge color={GAS_TYPE_COLOR[plan.type]}>{GAS_TYPE_LABEL[plan.type]}</GasBadge>
          </div>
          <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
            {plan.energy_rate ? `${(plan.energy_rate*100).toFixed(3)} c€/kWh` : `TTF + ${plan.markup_cEkWh}c€`}
            {" · "}€{plan.standing_charge}/yr standing
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ color: plan.cheapest ? C.green : C.light, fontSize: 17, fontWeight: 800 }}>€{plan.costs.total}</div>
          <div style={{ color: C.muted, fontSize: 11 }}>€{plan.costs.monthly}/mo</div>
          {rank > 0 && <div style={{ color: C.red, fontSize: 10 }}>+€{plan.savings_vs_cheapest}/yr</div>}
        </div>
        <div style={{ color: C.muted }}>{isOpen ? "▲" : "▼"}</div>
      </div>
      {isOpen && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
            {[["Energy",`€${plan.costs.energy}`,C.orange],["Grid",`€${plan.costs.grid}`,C.yellow],["Standing",`€${plan.costs.standing}`,C.muted],["VAT 21%",`€${plan.costs.vat}`,C.muted]].map(([l,v,col]) => (
              <div key={l} style={{ background: "#0A2040", borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ color: C.muted, fontSize: 10 }}>{l}</div>
                <div style={{ color: col, fontSize: 14, fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1, background: "#0A2040", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ color: C.muted, fontSize: 10 }}>All-in tariff</div>
              <div style={{ color: C.orange, fontSize: 14, fontWeight: 700 }}>{plan.costs.perKwh} c€/kWh</div>
            </div>
            <div style={{ flex: 1, background: "#0A2040", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ color: C.muted, fontSize: 10 }}>Contract</div>
              <div style={{ color: C.light, fontSize: 13, fontWeight: 600 }}>{plan.duration}</div>
            </div>
          </div>
          {plan.highlights?.map(h => <div key={h} style={{ color: C.muted, fontSize: 12, marginBottom: 3 }}>✓ {h}</div>)}
          {plan.formula && (
            <div style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
              <div style={{ color: C.muted, fontSize: 10, marginBottom: 2 }}>Pricing formula</div>
              <div style={{ color: C.cyan || "#06B6D4", fontSize: 12, fontFamily: "monospace" }}>{plan.formula}</div>
            </div>
          )}
          <a href={plan.supplier_url} target="_blank" rel="noopener noreferrer"
            style={{ display: "block", background: `${plan.supplier_color}18`, border: `1px solid ${plan.supplier_color}44`, color: plan.supplier_color, borderRadius: 9, padding: "10px 0", textAlign: "center", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            View gas tariff at {plan.supplier_name} →
          </a>
        </div>
      )}
    </div>
  );
}

// ── Gas Appliance Calculator ──────────────────────────────────
function GasApplianceCalc({ ttfPrice }) {
  const { tSection } = useLanguage();
  const CC = tSection("calculator");
  const TC = tSection("common");
  const AL = tSection("alerts");
  const [appliances,  setAppliances]  = useState([]);
  const [selections,  setSelections]  = useState({});
  const [region,      setRegion]      = useState("flanders");
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [fetching,    setFetching]    = useState(true);

  useEffect(() => {
    setFetching(true);
    fetch("/api/suppliers/gas-appliances")
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setAppliances(d.appliances);
          const defs = {};
          d.appliances.forEach(a => { defs[a.id] = { selected: true, uses: a.default_uses_per_week }; });
          setSelections(defs);
        }
      })
      .finally(() => setFetching(false));
  }, []);

  const calculate = async () => {
    setLoading(true);
    try {
      const inputs = Object.entries(selections).filter(([,v])=>v.selected).map(([id,v])=>({ id, uses_per_week: v.uses }));
      const res = await fetch("/api/suppliers/calculate-gas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appliances: inputs, region, ttf_avg: ttfPrice || 35 }),
      });
      const data = await res.json();
      if (data.success) setResult(data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const setSel = (id, patch) => setSelections(s => ({ ...s, [id]: { ...s[id], ...patch } }));

  const [calcExpanded, setCalcExpanded] = useState(null);

  if (result) return (
    <div>
      <button onClick={() => setResult(null)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", marginBottom: 14 }}>← Recalculate</button>
      <div style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ color: C.orange, fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>📊 Your estimated gas consumption</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <div style={{ color: C.muted, fontSize: 11 }}>Annual usage</div>
            <div style={{ color: C.light, fontSize: 28, fontWeight: 900, fontFamily: "monospace" }}>
              {result.consumption.total_kwh.toLocaleString()} <span style={{ fontSize: 13, color: C.muted }}>kWh</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.muted, fontSize: 11 }}>Household type</div>
            <div style={{ color: C.light, fontSize: 13, fontWeight: 600, marginTop: 4 }}>{result.consumption.household_size}</div>
          </div>
        </div>
        {result.consumption.breakdown?.length > 0 && result.consumption.breakdown.slice(0,5).map(b => (
          <div key={b.id} style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
              <span style={{ color: C.light }}>{b.icon} {b.label}</span>
              <span style={{ color: C.muted }}>{b.annual_kwh} kWh ({b.pct}%)</span>
            </div>
            <div style={{ height: 4, background: C.border, borderRadius: 2 }}>
              <div style={{ height: "100%", width: `${b.pct}%`, background: C.orange, borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>
      {result.results[0] && (
        <div style={{ background: "linear-gradient(135deg,#0A2040,#1A0A08)", border: `1px solid ${C.green}44`, borderRadius: 14, padding: 18, marginBottom: 16 }}>
          <div style={{ color: C.green, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>🏆 Cheapest gas plan for your usage</div>
          <div style={{ color: C.light, fontSize: 18, fontWeight: 800 }}>{result.results[0].supplier_name} — {result.results[0].plan_name}</div>
          <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
            <div><div style={{ color: C.muted, fontSize: 11 }}>Annual all-in</div><div style={{ color: C.green, fontSize: 24, fontWeight: 900 }}>€{result.results[0].costs.total}</div></div>
            <div><div style={{ color: C.muted, fontSize: 11 }}>Monthly</div><div style={{ color: C.light, fontSize: 22, fontWeight: 800 }}>€{result.results[0].costs.monthly}</div></div>
          </div>
        </div>
      )}
      <div style={{ color: C.light, fontSize: 14, fontWeight: 700, marginBottom: 10 }}>All {result.results.length} gas plans ranked</div>
      {result.results.map((plan, i) => <GasPlanCard key={plan.plan_id} plan={plan} rank={i} expanded={calcExpanded} setExpanded={setCalcExpanded} />)}
    </div>
  );

  if (fetching) return <div style={{ textAlign: "center", padding: 40, color: C.muted }}>Loading appliances…</div>;

  return (
    <div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ color: C.light, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🏠 Your situation</div>
        <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Region</div>
        <div style={{ display: "flex", gap: 6 }}>
          {GAS_REGIONS.map(r => (
            <button key={r.id} onClick={() => setRegion(r.id)}
              style={{ flex: 1, padding: "8px 4px", borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: "pointer",
                border: `1px solid ${region===r.id?C.orange:C.border}`, background: region===r.id?`${C.orange}22`:"#0A2040",
                color: region===r.id?C.orange:C.muted }}>
              {r.flag} {r.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ color: C.light, fontSize: 14, fontWeight: 700, marginBottom: 10 }}>🔥 Select & adjust your gas appliances</div>

      {appliances.map(a => {
        const sel = selections[a.id] || { selected: true, uses: a.default_uses_per_week };
        return (
          <div key={a.id} style={{ background: C.card, border: `1px solid ${sel.selected ? `$C.orange44` : C.border}`, borderRadius: 12, padding: 12, marginBottom: 8, opacity: sel.selected ? 1 : 0.45, transition: "all 0.15s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div onClick={() => setSel(a.id, { selected: !sel.selected })}
                style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${sel.selected?C.orange:C.border}`, background: sel.selected?`${C.orange}22`:"transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {sel.selected && <span style={{ color: C.orange, fontSize: 13, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{a.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.light, fontSize: 13, fontWeight: 600 }}>{a.label}</div>
                <div style={{ color: C.muted, fontSize: 11 }}>{a.kwh_per_use} kWh/use</div>
              </div>
              {sel.selected && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => { const n = Math.max(0, sel.uses - 1); setSel(a.id, n === 0 ? { uses: 0, selected: false } : { uses: n }); }}
                    style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.border}`, background: "#0A2040", color: C.light, fontSize: 16, cursor: "pointer" }}>−</button>
                  <div style={{ textAlign: "center", minWidth: 36 }}>
                    <div style={{ color: C.light, fontWeight: 700, fontSize: 14 }}>{sel.uses}×</div>
                    <div style={{ color: C.muted, fontSize: 9 }}>per week</div>
                  </div>
                  <button onClick={() => setSel(a.id, { uses: Math.min(21, sel.uses + 1) })}
                    style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.border}`, background: "#0A2040", color: C.light, fontSize: 16, cursor: "pointer" }}>+</button>
                </div>
              )}
            </div>
            {sel.selected && <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`, color: C.muted, fontSize: 11 }}>💡 {a.tip}</div>}
          </div>
        );
      })}

      {ttfPrice && <div style={{ background: `${C.orange}11`, border: `1px solid ${C.orange}33`, borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: C.muted }}>🔥 Current TTF: <strong style={{ color: C.orange }}>€{ttfPrice?.toFixed(2)}/MWh</strong> — used in dynamic plan calculations</div>}

      <button onClick={calculate} disabled={loading}
        style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: `linear-gradient(135deg,$C.orange,#C2410C)`, color: "#fff", fontSize: 15, fontWeight: 800, cursor: loading?"default":"pointer", marginTop: 4, boxShadow: `0 4px 20px ${C.orange}44`, opacity: loading ? 0.7 : 1 }}>
        {loading ? CC.calculating || "Calculating…" : "🔥 " + (CC.calculate || "Find My Best Gas Plan →")}
      </button>
    </div>
  );
}

// ── Manual Gas Compare ────────────────────────────────────────
function GasManualCompare({ ttfPrice }) {
  const [consumption, setConsumption] = useState(13000);
  const [inputVal,    setInputVal]    = useState("13000");
  const [region,      setRegion]      = useState("flanders");
  const [results,     setResults]     = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [expanded,    setExpanded]    = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/suppliers/gas?consumption=${consumption}&region=${region}&ttf=${ttfPrice || 35}`)
      .then(r => r.json())
      .then(d => { if (d.success) setResults(d.results); })
      .finally(() => setLoading(false));
  }, [consumption, region, ttfPrice]);

  return (
    <div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ color: C.light, fontSize: 14, fontWeight: 600, marginBottom: 8 }}>⚙️ Settings</div>
        <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Annual gas consumption</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <input type="number" value={inputVal} onChange={e => setInputVal(e.target.value)}
            onBlur={() => { const v = Math.min(Math.max(parseInt(inputVal)||13000,500),50000); setInputVal(String(v)); setConsumption(v); }}
            style={{ flex: 1, background: "#0A2040", border: `1px solid ${C.border}`, borderRadius: 8, color: C.light, fontSize: 16, padding: "10px 12px", outline: "none" }} />
          <span style={{ color: C.muted, fontSize: 13, whiteSpace: "nowrap" }}>kWh/yr</span>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {[5000,10000,13000,20000].map(v => (
            <button key={v} onClick={() => { setConsumption(v); setInputVal(String(v)); }}
              style={{ flex: 1, padding: "6px 0", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer",
                border: `1px solid ${consumption===v?C.orange:C.border}`, background: consumption===v?`${C.orange}22`:"transparent",
                color: consumption===v?C.orange:C.muted }}>
              {v>=1000?`${v/1000}k`:v}
            </button>
          ))}
        </div>
        <div style={{ color: C.muted, fontSize: 11, marginBottom: 12 }}>🏠 Flat: ~5,000 · Avg house: ~13,000 · Large + heat pump: ~20,000+ kWh/yr</div>
        <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Region</div>
        <div style={{ display: "flex", gap: 6 }}>
          {GAS_REGIONS.map(r => (
            <button key={r.id} onClick={() => setRegion(r.id)}
              style={{ flex: 1, padding: "7px 4px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                border: `1px solid ${region===r.id?C.orange:C.border}`, background: region===r.id?`${C.orange}22`:"#0A2040",
                color: region===r.id?C.orange:C.muted }}>
              {r.flag} {r.label}
            </button>
          ))}
        </div>
      </div>

      {ttfPrice && <div style={{ background: `${C.orange}11`, border: `1px solid ${C.orange}33`, borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: C.muted }}>🔥 TTF: <strong style={{ color: C.orange }}>€{ttfPrice?.toFixed(2)}/MWh</strong></div>}

      {loading ? <div style={{ textAlign: "center", padding: 30, color: C.muted }}>Loading gas plans…</div> : (
        <>
          {results[0] && (
            <div style={{ background: "linear-gradient(135deg,#0A2040,#1A0A08)", border: `1px solid ${C.green}44`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
              <div style={{ color: C.green, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>🏆 CHEAPEST · {consumption.toLocaleString()} kWh/yr</div>
              <div style={{ color: C.light, fontSize: 18, fontWeight: 800 }}>{results[0].supplier_name} — {results[0].plan_name}</div>
              <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
                <div><div style={{ color: C.muted, fontSize: 11 }}>Annual</div><div style={{ color: C.green, fontSize: 24, fontWeight: 900 }}>€{results[0].costs.total}</div></div>
                <div><div style={{ color: C.muted, fontSize: 11 }}>Monthly</div><div style={{ color: C.light, fontSize: 22, fontWeight: 800 }}>€{results[0].costs.monthly}</div></div>
                <div><div style={{ color: C.muted, fontSize: 11 }}>All-in</div><div style={{ color: C.light, fontSize: 15, fontWeight: 700 }}>{results[0].costs.perKwh} c€/kWh</div></div>
              </div>
            </div>
          )}
          {results.map((plan, i) => <GasPlanCard key={plan.plan_id} plan={plan} rank={i} expanded={expanded} setExpanded={setExpanded} />)}
        </>
      )}
      <div style={{ color: C.muted, fontSize: 11, textAlign: "center", marginTop: 8, lineHeight: 1.6 }}>
        Includes energy + Fluxys/ORES grid + levies + 21% VAT.<br />Verify on supplier website before switching.
      </div>
    </div>
  );
}

// ── SuppliersTab — plain supplier list ───────────────────────
function SuppliersTab({ ttfPrice, isMobile }) {
  // Sort by tariff (cheapest first), dynamic last
  const sorted = [...SUPPLIERS_DATA].sort((a, b) => {
    if (a.tariff == null) return 1;
    if (b.tariff == null) return -1;
    return a.tariff - b.tariff;
  });

  return (
    <div>
      <div style={{ fontSize: 11, color: "#445", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12, fontWeight: 700 }}>
        All Belgian Gas Suppliers · c€/kWh
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map((s, i) => {
          const spotRate = ttfPrice != null ? (ttfPrice / 1000 * 100 + (s.surcharge || 0)) : null;
          const displayRate = s.type === "dynamic" ? spotRate : s.tariff;
          return (
            <div key={s.id} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${i === 0 ? s.color + "55" : "rgba(255,255,255,0.06)"}`, borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {i === 0 && <span style={{ fontSize: 14 }}>🏆</span>}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: i === 0 ? s.color : "#C4D4E0" }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: "#445", marginTop: 2 }}>{s.typeLabel} · {s.note}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                {displayRate != null ? (
                  <>
                    <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace", color: i === 0 ? s.color : "#94A3B8" }}>
                      {displayRate.toFixed(2)} c€
                    </div>
                    <div style={{ fontSize: 10, color: "#445" }}>/kWh excl. grid</div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: "#334" }}>—</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: "#334", marginTop: 14, lineHeight: 1.6 }}>
        Energy rate only · standing charge {"{"}€65–95/yr{"}"} not included · verify on supplier website before switching.
      </div>
    </div>
  );
}


function AlertsTab({ user, isGuest, onSignIn }) {
  const { tSection } = useLanguage();
  const TC = tSection("common");
  const AL = tSection("alerts");
  const { updatePreferences } = useAuth();
  const prefs = user?.preferences || {};
  const [threshold,   setThreshold]   = useState(prefs.gasAlertThreshold || 30);
  const [alertActive, setAlertActive] = useState(prefs.gasAlertEnabled   || false);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);

  const accountEmail = prefs.alertEmail || user?.email || "";

  // Guest — show login prompt
  if (isGuest) {
    return (
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>🔔</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.light, marginBottom: 8 }}>{AL.title || "Gas Price Alerts"}</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
          {AL.loginRequired || "Sign in to receive email alerts when gas prices drop below your threshold."}
        </div>
        <button onClick={onSignIn} style={{ padding: "10px 28px", borderRadius: 30, fontWeight: 700, fontSize: 14, background: "linear-gradient(135deg,#0D9488,#1A56A4)", border: "none", color: "#fff", cursor: "pointer" }}>
          {TC.signIn || "Sign in"} →
        </button>
      </div>
    );
  }

  const handleToggle = async () => {
    const next = !alertActive;
    setSaving(true);
    try {
      await updatePreferences({ gasAlertEnabled: next, gasAlertThreshold: threshold });
      setAlertActive(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const saveThreshold = async (val) => {
    setThreshold(val);
    try { await updatePreferences({ gasAlertThreshold: val }); }
    catch (e) { console.error(e); }
  };

  return (
    <div>
      {/* Threshold */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ color: C.light, fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
          {AL.alertWhenBelow || "Alert when below"} <strong style={{ color: C.orange }}>€{threshold}/MWh</strong>
        </div>
        <input type="range" min={10} max={80} step={5} value={threshold}
          onChange={e => saveThreshold(+e.target.value)}
          style={{ width: "100%", accentColor: C.orange, cursor: "pointer" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted, marginTop: 4 }}>
          <span>€10</span><span>€80/MWh</span>
        </div>
      </div>

      {/* Email — read only */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>📧 {AL.emailLabel || "Alert email"}</div>
        <div style={{ color: C.light, fontSize: 14, fontWeight: 600 }}>{accountEmail || "—"}</div>
        <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{AL.emailFromAccount || "Email from your account. Change in Profile."}</div>
      </div>

      {/* Toggle */}
      <div style={{ background: C.card, border: `1px solid ${alertActive ? C.orange : C.border}`, borderRadius: 14, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: C.light, fontSize: 15, fontWeight: 700 }}>🔥 {AL.title || "Gas Price Alerts"}</div>
            <div style={{ color: alertActive ? C.orange : C.muted, fontSize: 12, marginTop: 2 }}>
              {alertActive ? `✅ ${AL.active || "Active"} · ${accountEmail}` : `⭕ ${AL.inactive || "Off"}`}
            </div>
            {saved && <div style={{ color: C.green, fontSize: 11, marginTop: 2 }}>✓ Saved</div>}
          </div>
          <button onClick={handleToggle} disabled={saving} style={{
            padding: "8px 18px", borderRadius: 30, fontWeight: 700, fontSize: 13,
            border: "none", cursor: "pointer",
            background: alertActive ? "rgba(239,68,68,0.2)" : "rgba(249,115,22,0.2)",
            color: alertActive ? C.red : C.orange,
          }}>
            {saving ? "…" : alertActive ? TC.disable : TC.enable}
          </button>
        </div>
      </div>
    </div>
  );

function Loading() {
  return <div style={{ color: C.muted, textAlign: "center", padding: 40 }}>Loading…</div>;
}

// ── MAIN ─────────────────────────────────────────────────────
export default function GasTab({ user, isGuest, onSignIn, isMobile, mobileTab, setMobileTab }) {
  const { tSection } = useLanguage();
  const T  = tSection("dashboard");
  const TC = tSection("common");
  const AL = tSection("alerts");
  const PL = tSection("priceLabels");
  const GAS_NAV = makeGasNav(TC);
  const GAS_REGIONS = makeGasRegions(TC);
  const [desktopTab, setDesktopTab] = useState("today");
  const [current,    setCurrent]    = useState(null);
  const [history,    setHistory]    = useState(null);

  const validGasTabs = ["today", "tomorrow", "week", "suppliers", "alerts"];
  const activeTab = (isMobile && mobileTab && validGasTabs.includes(mobileTab)) ? mobileTab : desktopTab;
  const setTab = (t) => { setDesktopTab(t); if (isMobile) setMobileTab?.(t); };

  useEffect(() => {
    fetch("/api/gas/current").then(r => r.json()).then(d => { if (d.success) setCurrent(d); }).catch(() => {});
    fetch("/api/gas/history?days=30").then(r => r.json()).then(d => {
      if (d.success) {
        // Compute stats client-side if backend returned nulls (fallback mode)
        const prices = (d.history || []).map(h => h.price).filter(p => p != null && !isNaN(p));
        if (prices.length > 0 && (d.stats?.avg == null || d.stats?.min == null)) {
          const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
          const latest = prices[prices.length - 1];
          const prev   = prices[prices.length - 2];
          d.stats = {
            avg:    parseFloat(avg.toFixed(2)),
            min:    parseFloat(Math.min(...prices).toFixed(2)),
            max:    parseFloat(Math.max(...prices).toFixed(2)),
            latest,
            change: prev ? parseFloat(((latest - prev) / prev * 100).toFixed(1)) : 0,
            days:   30,
          };
        }
        setHistory(d);
      }
    }).catch(() => {});
  }, []);

  return (
    <div>
      {/* Desktop sub-nav — matches electricity style */}
      {!isMobile && (
        <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 4, width: "fit-content", flexWrap: "wrap" }}>
          {GAS_NAV.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: "7px 13px", borderRadius: 9, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", transition: "all 0.15s", background: activeTab === t.id ? `$C.orange33` : "transparent", color: activeTab === t.id ? C.orange : "#667" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === "today"     && <TodayTab     current={current} history={history} />}
      {activeTab === "tomorrow"  && <TomorrowTab  history={history} />}
      {activeTab === "week"      && <WeekTab />}
      {activeTab === "suppliers" && <SuppliersTab ttfPrice={current?.price} isMobile={isMobile} />}
      {activeTab === "alerts"    && <AlertsTab    user={user} isGuest={isGuest} onSignIn={onSignIn} />}
    </div>
  );
}