/**
 * GasTab.jsx — Gas dashboard matching electricity tab structure
 * Tabs: Today · Tomorrow · 7 Days · Suppliers · Alerts
 */
import { useState, useEffect } from "react";
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

const GAS_NAV = [
  { id: "today",     icon: "🔥", label: "Today"     },
  { id: "tomorrow",  icon: "⏩", label: "Tomorrow"  },
  { id: "week",      icon: "📅", label: "7 Days"    },
  { id: "suppliers", icon: "🏢", label: "Suppliers" },
  { id: "alerts",    icon: "🔔", label: "Alerts"    },
];

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
        <StatCard label="30-day Low"  value={stats?.min != null ? `€${stats.min}` : "—"} color={C.green}  />
        <StatCard label="30-day Avg"  value={stats?.avg != null ? `€${stats.avg}` : "—"} color={C.yellow} />
        <StatCard label="30-day High" value={stats?.max != null ? `€${stats.max}` : "—"} color={C.orange} />
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
          { pct: "~40%", label: "Energy (TTF-based)",    desc: "The market price shown above — varies daily",             color: C.orange },
          { pct: "~35%", label: "Grid & Distribution",   desc: "Fluxys (transport) + Fluvius/ORES (local distribution)",  color: C.teal   },
          { pct: "~25%", label: "Taxes & Levies",        desc: "Federal contribution + VAT (21%)",                        color: C.muted  },
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
            <StatCard label="30-day Low"  value={stats.min != null ? `€${stats.min}` : "—"} color={C.green}  />
            <StatCard label="30-day Avg"  value={stats.avg != null ? `€${stats.avg}` : "—"} color={C.yellow} />
            <StatCard label="30-day High" value={stats.max != null ? `€${stats.max}` : "—"} color={C.orange} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── 7 DAYS ───────────────────────────────────────────────────
function WeekTab() {
  const [history, setHistory] = useState(null);
  const [days,    setDays]    = useState(7);

  useEffect(() => {
    setHistory(null);
    fetch(`/api/gas/history?days=${days}`).then(r => r.json()).then(d => { if (d.success) setHistory(d); });
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
        <StatCard label="Period Low"  value={stats?.min != null ? `€${stats.min}` : "—"} color={C.green}  sub="€/MWh" />
        <StatCard label="Period Avg"  value={stats?.avg != null ? `€${stats.avg}` : "—"} color={C.yellow} sub="€/MWh" />
        <StatCard label="Period High" value={stats?.max != null ? `€${stats.max}` : "—"} color={C.orange} sub="€/MWh" />
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 8px 8px", marginBottom: 12 }}>
        <div style={{ color: C.muted, fontSize: 12, paddingLeft: 8, marginBottom: 8 }}>TTF Gas — {days} trading days (€/MWh)</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} barSize={data.length > 45 ? 3 : 8}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.muted }} tickFormatter={d => d.slice(5)} interval={Math.max(0, Math.floor(data.length / 6) - 1)} />
            <YAxis tick={{ fontSize: 10, fill: C.muted }} domain={["auto", "auto"]} width={38} />
            <Tooltip content={<Tip />} />
            {stats?.avg && <ReferenceLine y={stats.avg} stroke={C.yellow} strokeDasharray="4 4" label={{ value: "Avg", fill: C.yellow, fontSize: 10, position: "insideTopRight" }} />}
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

function SuppliersTab({ ttfPrice }) {
  const [consumption, setConsumption] = useState(13000);
  const [inputVal,    setInputVal]    = useState("13000");
  const [expanded,    setExpanded]    = useState(null);
  const ttf_cEkWh = ttfPrice ? ttfPrice / 10 : 3.45;

  const list = SUPPLIERS_DATA.map(s => {
    const rate  = s.type === "dynamic" ? ttf_cEkWh + (s.surcharge || 0) : s.tariff;
    const costs = calcCost(rate, s.standing, consumption);
    return { ...s, effectiveRate: parseFloat(rate.toFixed(3)), costs };
  }).sort((a, b) => a.costs.total - b.costs.total);
  if (list.length) list[0].cheapest = true;

  return (
    <div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ color: C.light, fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Your annual gas consumption</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <input type="number" value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onBlur={() => { const v = Math.min(Math.max(parseInt(inputVal) || 13000, 500), 50000); setInputVal(String(v)); setConsumption(v); }}
            style={{ flex: 1, background: "#0A2040", border: `1px solid ${C.border}`, borderRadius: 8, color: C.light, fontSize: 16, padding: "10px 12px", outline: "none" }} />
          <div style={{ color: C.muted, fontSize: 13, whiteSpace: "nowrap" }}>kWh/year</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[5000, 10000, 13000, 20000].map(v => (
            <button key={v} onClick={() => { setConsumption(v); setInputVal(String(v)); }}
              style={{ flex: 1, padding: "6px 0", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${consumption === v ? C.teal : C.border}`, background: consumption === v ? `${C.teal}22` : "transparent", color: consumption === v ? C.teal : C.muted }}>
              {v >= 1000 ? `${v / 1000}k` : v}
            </button>
          ))}
        </div>
        <div style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>🏠 Avg Belgian house: ~13,000 kWh/yr · Flat: ~5,000</div>
      </div>

      {list[0] && (
        <div style={{ background: "linear-gradient(135deg,#0A2040,#0D2A1A)", border: `1px solid ${C.green}44`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ color: C.green, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>🏆 CHEAPEST FOR {consumption.toLocaleString()} kWh/yr</div>
          <div style={{ color: C.light, fontSize: 18, fontWeight: 800 }}>{list[0].name}</div>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <div><div style={{ color: C.muted, fontSize: 11 }}>Annual (all-in)</div><div style={{ color: C.green, fontSize: 22, fontWeight: 800 }}>€{list[0].costs.total}</div></div>
            <div><div style={{ color: C.muted, fontSize: 11 }}>Monthly</div><div style={{ color: C.light, fontSize: 22, fontWeight: 800 }}>€{list[0].costs.monthly}</div></div>
            <div><div style={{ color: C.muted, fontSize: 11 }}>All-in</div><div style={{ color: C.light, fontSize: 15, fontWeight: 700 }}>{list[0].costs.perKwh} c€/kWh</div></div>
          </div>
        </div>
      )}

      {list.map((s, i) => (
        <div key={s.id} onClick={() => setExpanded(expanded === s.id ? null : s.id)}
          style={{ background: C.card, border: `1px solid ${s.cheapest ? C.green : C.border}`, borderRadius: 14, padding: 16, marginBottom: 8, cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: `${s.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{s.logo}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ color: C.light, fontSize: 14, fontWeight: 700 }}>{s.name}</span>
                {s.cheapest && <span style={{ background: `${C.green}22`, color: C.green, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6 }}>CHEAPEST</span>}
                <span style={{ background: `${s.color}22`, color: s.color, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 6 }}>{s.typeLabel}</span>
              </div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{s.effectiveRate.toFixed(2)} c€/kWh · €{s.standing}/yr standing</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: s.cheapest ? C.green : C.light, fontSize: 17, fontWeight: 800 }}>€{s.costs.total}</div>
              <div style={{ color: C.muted, fontSize: 11 }}>€{s.costs.monthly}/mo</div>
            </div>
            <div style={{ color: C.muted }}>{expanded === s.id ? "▲" : "▼"}</div>
          </div>
          {expanded === s.id && (
            <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>{s.note}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                {[["Energy cost", `€${s.costs.energy}`], ["Grid costs", `€${s.costs.grid}`], ["Standing charge", `€${s.costs.standing}`], ["VAT (21%)", `€${s.costs.vat}`]].map(([l, v]) => (
                  <div key={l} style={{ background: "#0A2040", borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ color: C.muted, fontSize: 11 }}>{l}</div>
                    <div style={{ color: C.light, fontSize: 14, fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, background: "#0A2040", borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ color: C.muted, fontSize: 11 }}>All-in tariff</div>
                  <div style={{ color: C.orange, fontSize: 15, fontWeight: 700 }}>{s.costs.perKwh} c€/kWh</div>
                </div>
                <div style={{ flex: 1, background: "#0A2040", borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ color: C.muted, fontSize: 11 }}>Contract</div>
                  <div style={{ color: C.light, fontSize: 14, fontWeight: 600 }}>{s.contract}</div>
                </div>
              </div>
              <a href={s.url} target="_blank" rel="noopener noreferrer"
                style={{ display: "block", background: `${s.color}22`, border: `1px solid ${s.color}55`, color: s.color, borderRadius: 9, padding: "10px 0", textAlign: "center", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                View tariff at {s.name} →
              </a>
              {i > 0 && <div style={{ marginTop: 10, color: C.muted, fontSize: 12, textAlign: "center" }}>€{s.costs.total - list[0].costs.total} more per year than {list[0].name}</div>}
            </div>
          )}
        </div>
      ))}
      <div style={{ color: C.muted, fontSize: 11, textAlign: "center", marginTop: 8, lineHeight: 1.6 }}>
        Includes energy + Fluxys + Fluvius/ORES (avg) + levies + 21% VAT.<br />Estimates only — verify on supplier websites before switching.
      </div>
    </div>
  );
}

// ── ALERTS ───────────────────────────────────────────────────
function AlertsTab({ user, isGuest, onSignIn }) {
  const { updatePreferences } = useAuth();
  const prefs = user?.preferences || {};
  const [threshold,   setThreshold]   = useState(prefs.gasAlertThreshold || 30);
  const [alertActive, setAlertActive] = useState(prefs.gasAlertEnabled   || false);
  const [alertEmail,  setAlertEmail]  = useState(prefs.alertEmail || user?.email || "");
  const [emailSaved,  setEmailSaved]  = useState(!!(prefs.alertEmail || user?.email));
  const [emailError,  setEmailError]  = useState("");
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);

  if (isGuest) return (
    <div style={{ textAlign: "center", padding: "40px 20px" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔥</div>
      <div style={{ color: C.light, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Gas Price Alerts</div>
      <div style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>Sign in to get emailed when TTF drops below your threshold.</div>
      <button onClick={onSignIn} style={{ background: C.orange, color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Sign In / Register</button>
    </div>
  );

  const saveEmail = async () => {
    if (!alertEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alertEmail)) { setEmailError("Enter a valid email"); return; }
    setSaving(true);
    try { await updatePreferences({ alertEmail }); setEmailSaved(true); setEmailError(""); }
    catch (e) { setEmailError(e.message); } finally { setSaving(false); }
  };

  const handleToggle = async () => {
    if (!alertActive && !emailSaved) { await saveEmail(); return; }
    const next = !alertActive;
    setSaving(true);
    try { await updatePreferences({ gasAlertEnabled: next, gasAlertThreshold: threshold }); setAlertActive(next); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    catch (e) { setEmailError(e.message); } finally { setSaving(false); }
  };

  const saveThreshold = async () => {
    setSaving(true);
    try { await updatePreferences({ gasAlertThreshold: threshold }); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div style={{ background: C.card, border: `1px solid ${alertActive ? C.orange : C.border}`, borderRadius: 14, padding: 20, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <div style={{ color: C.light, fontSize: 15, fontWeight: 700 }}>🔥 Gas Price Alerts</div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Email when TTF drops below threshold</div>
          </div>
          <div onClick={handleToggle} style={{ width: 48, height: 26, borderRadius: 13, background: alertActive ? C.orange : "#1E3A5F", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
            <div style={{ position: "absolute", top: 3, left: alertActive ? 24 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
          </div>
        </div>
        <div style={{ color: alertActive ? C.orange : C.muted, fontSize: 13, fontWeight: 600 }}>{alertActive ? "✅ Alerts active" : "⭕ Alerts off"}</div>
        {saved && <div style={{ color: C.green, fontSize: 12, marginTop: 4 }}>✓ Saved</div>}
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ color: C.light, fontSize: 14, fontWeight: 600, marginBottom: 8 }}>📧 Alert email address</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={alertEmail} onChange={e => { setAlertEmail(e.target.value); setEmailSaved(false); setEmailError(""); }} type="email" placeholder="your@email.com"
            style={{ flex: 1, background: "#0A2040", border: `1px solid ${emailError ? C.red : C.border}`, borderRadius: 8, color: C.light, fontSize: 14, padding: "10px 12px", outline: "none" }} />
          <button onClick={saveEmail} disabled={saving || emailSaved}
            style={{ padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: emailSaved ? "default" : "pointer", border: "none", background: emailSaved ? `${C.green}33` : C.teal, color: emailSaved ? C.green : "#fff" }}>
            {emailSaved ? "✓" : saving ? "…" : "Save"}
          </button>
        </div>
        {emailError && <div style={{ color: C.red, fontSize: 12, marginTop: 6 }}>{emailError}</div>}
        {emailSaved && <div style={{ color: C.green, fontSize: 12, marginTop: 6 }}>✓ Email saved</div>}
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
        <div style={{ color: C.light, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>📊 Alert threshold</div>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>Alert me when TTF drops below:</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
          <div style={{ color: pc(threshold), fontSize: 40, fontWeight: 900, fontFamily: "monospace" }}>€{threshold}</div>
          <div style={{ color: C.muted, fontSize: 14 }}>/MWh</div>
          <div style={{ color: C.muted, fontSize: 12 }}>= {(threshold / 10).toFixed(2)} c€/kWh</div>
        </div>
        <input type="range" min={15} max={100} step={1} value={threshold}
          onChange={e => setThreshold(parseInt(e.target.value))}
          style={{ width: "100%", accentColor: C.orange, marginBottom: 8 }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ color: C.green, fontSize: 11 }}>€15 — very cheap</span>
          <span style={{ color: C.yellow, fontSize: 11 }}>€50 — average</span>
          <span style={{ color: C.orange, fontSize: 11 }}>€100 — expensive</span>
        </div>
        <button onClick={saveThreshold} disabled={saving}
          style={{ width: "100%", padding: "12px 0", borderRadius: 9, border: "none", background: C.orange, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save Threshold"}
        </button>
        <div style={{ color: C.muted, fontSize: 11, marginTop: 10, lineHeight: 1.7 }}>
          💡 Good thresholds: €25–30 = historically cheap · €35–40 = below recent avg<br />
          Gas alerts run hourly. Max one email per 6 hours.
        </div>
      </div>
    </div>
  );
}

function Loading() {
  return <div style={{ color: C.muted, textAlign: "center", padding: 40 }}>Loading…</div>;
}

// ── MAIN ─────────────────────────────────────────────────────
export default function GasTab({ user, isGuest, onSignIn, isMobile, mobileTab, setMobileTab }) {
  const [desktopTab, setDesktopTab] = useState("today");
  const [current,    setCurrent]    = useState(null);
  const [history,    setHistory]    = useState(null);

  const validGasTabs = ["today", "tomorrow", "week", "suppliers", "alerts"];
  const activeTab = (isMobile && mobileTab && validGasTabs.includes(mobileTab)) ? mobileTab : desktopTab;
  const setTab = (t) => { setDesktopTab(t); if (isMobile) setMobileTab?.(t); };

  useEffect(() => {
    fetch("/api/gas/current").then(r => r.json()).then(d => { if (d.success) setCurrent(d); }).catch(() => {});
    fetch("/api/gas/history?days=30").then(r => r.json()).then(d => { if (d.success) setHistory(d); }).catch(() => {});
  }, []);

  return (
    <div>
      {/* Desktop sub-nav — matches electricity style */}
      {!isMobile && (
        <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 4, width: "fit-content", flexWrap: "wrap" }}>
          {GAS_NAV.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: "7px 13px", borderRadius: 9, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", transition: "all 0.15s", background: activeTab === t.id ? `${C.orange}33` : "transparent", color: activeTab === t.id ? C.orange : "#667" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === "today"     && <TodayTab     current={current} history={history} />}
      {activeTab === "tomorrow"  && <TomorrowTab  history={history} />}
      {activeTab === "week"      && <WeekTab />}
      {activeTab === "suppliers" && <SuppliersTab ttfPrice={current?.ttf?.price} />}
      {activeTab === "alerts"    && <AlertsTab    user={user} isGuest={isGuest} onSignIn={onSignIn} />}
    </div>
  );
}