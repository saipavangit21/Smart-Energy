/**
 * GasTab.jsx — Full gas feature
 * Tabs: Today (TTF) · Suppliers · History · Alerts · Combined Bill
 */
import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import { useAuth } from "../context/AuthContext";

const API = "";

const C = {
  teal:   "#0D9488",
  orange: "#F97316",
  navy:   "#060B14",
  dark:   "#0D1626",
  card:   "#0A1628",
  border: "#1E3A5F",
  muted:  "#64748B",
  light:  "#E2E8F0",
  green:  "#10B981",
  yellow: "#F59E0B",
  red:    "#EF4444",
  purple: "#6366F1",
};

function priceColor(p) {
  if (p < 25) return C.green;
  if (p < 40) return C.teal;
  if (p < 55) return C.yellow;
  return C.orange;
}

// ── Stat card ────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 16px", flex: 1, minWidth: 80 }}>
      <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ color: color || C.light, fontSize: 20, fontWeight: 800 }}>{value}</div>
      {sub && <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Custom tooltip ───────────────────────────────────────────
function GasTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].value;
  return (
    <div style={{ background: "#0D1E35", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px" }}>
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ color: priceColor(p), fontSize: 18, fontWeight: 700 }}>€{p?.toFixed(2)}/MWh</div>
      <div style={{ color: C.muted, fontSize: 11 }}>{(p / 10).toFixed(3)} c€/kWh</div>
    </div>
  );
}

// ── TODAY TAB ────────────────────────────────────────────────
function TodayTab({ current, history }) {
  if (!current) return <div style={{ color: C.muted, textAlign: "center", padding: 40 }}>Loading gas prices…</div>;

  const ttf = current.ttf;
  const recentHistory = history?.history?.slice(-14) || [];
  const stats = history?.stats;
  const color = priceColor(ttf?.price || 0);
  const trend = stats?.change > 0 ? `▲ ${Math.abs(stats.change)}%` : `▼ ${Math.abs(stats.change)}%`;
  const trendColor = stats?.change > 0 ? C.red : C.green;

  return (
    <div style={{ padding: "0 0 24px" }}>
      {/* Hero price */}
      <div style={{ background: `linear-gradient(135deg, #0A1628, #0D2040)`, border: `1px solid ${color}44`, borderRadius: 16, padding: 24, marginBottom: 16, textAlign: "center" }}>
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>🔥 TTF Natural Gas · Today</div>
        <div style={{ color, fontSize: 56, fontWeight: 900, fontFamily: "monospace", lineHeight: 1 }}>
          €{ttf?.price?.toFixed(2)}
        </div>
        <div style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>per MWh</div>
        <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>= {current.ttf_cEkWh?.toFixed(3)} c€/kWh (energy only)</div>
        {stats?.change !== 0 && (
          <div style={{ color: trendColor, fontSize: 14, fontWeight: 600, marginTop: 8 }}>
            {trend} vs yesterday
          </div>
        )}
      </div>

      {/* Stats row */}
      {stats && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <StatCard label="30-day Low"  value={stats.min != null ? `€${stats.min}` : "—"}    color={C.green}  />
          <StatCard label="30-day Avg"  value={stats.avg != null ? `€${stats.avg}` : "—"}    color={C.yellow} />
          <StatCard label="30-day High" value={stats.max != null ? `€${stats.max}` : "—"}    color={C.orange} />
        </div>
      )}

      {/* Mini chart */}
      {recentHistory.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 8px 8px" }}>
          <div style={{ color: C.muted, fontSize: 12, paddingLeft: 8, marginBottom: 8 }}>TTF — Last 14 trading days</div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={recentHistory}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.muted }} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: C.muted }} domain={["auto", "auto"]} width={35} />
              <Tooltip content={<GasTooltip />} />
              <Line type="monotone" dataKey="price" stroke={C.orange} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* What affects gas prices */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginTop: 16 }}>
        <div style={{ color: C.teal, fontSize: 13, fontWeight: 700, marginBottom: 10 }}>💡 What affects your gas bill?</div>
        {[
          { label: "Energy (TTF-based)", pct: "~40%", desc: "The TTF market price shown above" },
          { label: "Grid & Distribution", pct: "~35%", desc: "Fluxys + Fluvius/ORES — fixed by region" },
          { label: "Taxes & Levies",      pct: "~25%", desc: "Federal + VAT (21%)" },
        ].map(row => (
          <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ color: C.orange, fontWeight: 700, fontSize: 13, width: 38 }}>{row.pct}</div>
            <div>
              <div style={{ color: C.light, fontSize: 13, fontWeight: 600 }}>{row.label}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>{row.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SUPPLIERS TAB ────────────────────────────────────────────
function SuppliersTab({ ttf_cEkWh }) {
  const [consumption, setConsumption] = useState(13000);
  const [inputVal,    setInputVal]    = useState("13000");
  const [suppliers,   setSuppliers]   = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [expanded,    setExpanded]    = useState(null);

  const load = useCallback(async (c) => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/gas/suppliers?consumption=${c}`);
      const d = await r.json();
      if (d.success) setSuppliers(d.suppliers);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(consumption); }, [consumption]);

  const cheapest = suppliers[0];

  return (
    <div style={{ padding: "0 0 24px" }}>
      {/* Consumption input */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ color: C.light, fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Your annual gas consumption</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="number"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onBlur={() => {
              const v = Math.min(Math.max(parseInt(inputVal) || 13000, 1000), 50000);
              setInputVal(String(v));
              setConsumption(v);
            }}
            style={{ flex: 1, background: "#0A2040", border: `1px solid ${C.border}`, borderRadius: 8, color: C.light, fontSize: 16, padding: "10px 12px", outline: "none" }}
          />
          <div style={{ color: C.muted, fontSize: 13 }}>kWh/year</div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {[5000, 10000, 13000, 20000].map(v => (
            <button key={v} onClick={() => { setConsumption(v); setInputVal(String(v)); }}
              style={{ flex: 1, padding: "6px 4px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${consumption === v ? C.teal : C.border}`, background: consumption === v ? `${C.teal}22` : "transparent", color: consumption === v ? C.teal : C.muted }}>
              {v >= 1000 ? `${v/1000}k` : v}
            </button>
          ))}
        </div>
        <div style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>
          🏠 Avg Belgian house: 13,000 kWh/yr · Flat: ~5,000 · Large house: ~20,000+
        </div>
      </div>

      {loading && <div style={{ color: C.muted, textAlign: "center", padding: 20 }}>Calculating…</div>}

      {!loading && cheapest && (
        <div style={{ background: `linear-gradient(135deg, #0A2040, #0D2A1A)`, border: `1px solid ${C.green}44`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ color: C.green, fontSize: 12, fontWeight: 700, marginBottom: 4 }}>🏆 CHEAPEST FOR {consumption.toLocaleString()} kWh/year</div>
          <div style={{ color: C.light, fontSize: 18, fontWeight: 800 }}>{cheapest.name}</div>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <div><div style={{ color: C.muted, fontSize: 11 }}>Annual total</div><div style={{ color: C.green, fontSize: 20, fontWeight: 700 }}>€{cheapest.costs.total}</div></div>
            <div><div style={{ color: C.muted, fontSize: 11 }}>Monthly</div><div style={{ color: C.light, fontSize: 20, fontWeight: 700 }}>€{cheapest.costs.monthly}</div></div>
            <div><div style={{ color: C.muted, fontSize: 11 }}>All-in tariff</div><div style={{ color: C.light, fontSize: 16, fontWeight: 700 }}>{cheapest.costs.perKwh} c€/kWh</div></div>
          </div>
        </div>
      )}

      {/* Supplier cards */}
      {!loading && suppliers.map((s, i) => (
        <div key={s.id} onClick={() => setExpanded(expanded === s.id ? null : s.id)}
          style={{ background: C.card, border: `1px solid ${s.cheapest ? C.green : C.border}`, borderRadius: 12, padding: 16, marginBottom: 8, cursor: "pointer", transition: "border-color 0.15s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: `${s.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{s.logo}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ color: C.light, fontSize: 14, fontWeight: 700 }}>{s.name}</div>
                {s.cheapest && <span style={{ background: `${C.green}22`, color: C.green, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6 }}>CHEAPEST</span>}
                <span style={{ background: `${s.color}22`, color: s.color, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 6 }}>{s.typeLabel}</span>
              </div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{s.tariff?.toFixed(2)} c€/kWh · €{s.standing}/yr standing</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: s.cheapest ? C.green : C.light, fontSize: 17, fontWeight: 800 }}>€{s.costs.total}</div>
              <div style={{ color: C.muted, fontSize: 11 }}>€{s.costs.monthly}/mo</div>
            </div>
            <div style={{ color: C.muted, fontSize: 14 }}>{expanded === s.id ? "▲" : "▼"}</div>
          </div>

          {expanded === s.id && (
            <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>{s.note}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                {[
                  { label: "Energy cost",    value: `€${s.costs.energyCost}` },
                  { label: "Grid costs",     value: `€${s.costs.gridCost}` },
                  { label: "Standing charge",value: `€${s.costs.standingCost}` },
                  { label: "VAT (21%)",      value: `€${s.costs.vat}` },
                ].map(row => (
                  <div key={row.label} style={{ background: "#0A2040", borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ color: C.muted, fontSize: 11 }}>{row.label}</div>
                    <div style={{ color: C.light, fontSize: 14, fontWeight: 600 }}>{row.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
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
                style={{ display: "block", marginTop: 10, background: `${s.color}22`, border: `1px solid ${s.color}44`, color: s.color, borderRadius: 8, padding: "9px 0", textAlign: "center", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                View tariff on {s.name} →
              </a>
              {i > 0 && (
                <div style={{ marginTop: 10, color: C.muted, fontSize: 12, textAlign: "center" }}>
                  €{s.costs.total - suppliers[0].costs.total} more per year than {suppliers[0].name}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <div style={{ color: C.muted, fontSize: 11, textAlign: "center", marginTop: 8 }}>
        Tariffs include energy + Fluxys + Fluvius/ORES (average) + federal levies + 21% VAT.<br />
        Prices are estimates. Always verify on supplier website before switching.
      </div>
    </div>
  );
}

// ── HISTORY TAB ──────────────────────────────────────────────
function HistoryTab() {
  const [history, setHistory] = useState(null);
  const [days,    setDays]    = useState(30);

  useEffect(() => {
    fetch(`${API}/api/gas/history?days=${days}`)
      .then(r => r.json())
      .then(d => { if (d.success) setHistory(d); });
  }, [days]);

  if (!history) return <div style={{ color: C.muted, textAlign: "center", padding: 40 }}>Loading history…</div>;

  const { stats, history: data } = history;

  return (
    <div style={{ padding: "0 0 24px" }}>
      {/* Period selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[14, 30, 60, 90].map(d => (
          <button key={d} onClick={() => setDays(d)}
            style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${days === d ? C.orange : C.border}`, background: days === d ? `${C.orange}22` : C.card, color: days === d ? C.orange : C.muted }}>
            {d}d
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <StatCard label="Period Low"  value={stats.min != null ? `€${stats.min}` : "—"}    color={C.green}  sub="€/MWh" />
        <StatCard label="Period Avg"  value={stats.avg != null ? `€${stats.avg}` : "—"}    color={C.yellow} sub="€/MWh" />
        <StatCard label="Period High" value={stats.max != null ? `€${stats.max}` : "—"}    color={C.orange} sub="€/MWh" />
      </div>

      {/* Chart */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 8px 8px" }}>
        <div style={{ color: C.muted, fontSize: 12, paddingLeft: 8, marginBottom: 8 }}>TTF Gas Price — {days} Days (€/MWh)</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} barSize={data.length > 45 ? 3 : 7}>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.muted }} tickFormatter={d => d.slice(5)} interval={Math.floor(data.length / 6)} />
            <YAxis tick={{ fontSize: 10, fill: C.muted }} domain={["auto", "auto"]} width={38} />
            <Tooltip content={<GasTooltip />} />
            <ReferenceLine y={stats.avg} stroke={C.yellow} strokeDasharray="4 4" />
            <Bar dataKey="price">
              {data.map((entry, i) => (
                <Cell key={i} fill={priceColor(entry.price)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 8 }}>
          {[["< €25", C.green], ["€25–40", C.teal], ["€40–55", C.yellow], ["> €55", C.orange]].map(([label, color]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
              <span style={{ color: C.muted, fontSize: 10 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ color: C.muted, fontSize: 11, textAlign: "center", marginTop: 12 }}>
        TTF (Title Transfer Facility) is the European gas benchmark traded in Amsterdam.
        Belgian dynamic contracts follow TTF price closely.
      </div>
    </div>
  );
}

// ── ALERTS TAB ────────────────────────────────────────────────
function GasAlertsTab({ user, isGuest, onSignIn }) {
  const { updatePreferences } = useAuth();
  const prefs = user?.preferences || {};

  const [threshold,   setThreshold]   = useState(prefs.gasAlertThreshold || 30);
  const [alertActive, setAlertActive] = useState(prefs.gasAlertEnabled   || false);
  const [alertEmail,  setAlertEmail]  = useState(prefs.alertEmail        || user?.email || "");
  const [emailSaved,  setEmailSaved]  = useState(!!(prefs.alertEmail || user?.email));
  const [emailError,  setEmailError]  = useState("");
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);

  if (isGuest) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔥</div>
        <div style={{ color: C.light, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Gas price alerts</div>
        <div style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>Sign in to get emailed when TTF gas prices drop below your threshold.</div>
        <button onClick={onSignIn} style={{ background: C.teal, color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          Sign In / Register
        </button>
      </div>
    );
  }

  const saveEmail = async () => {
    if (!alertEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alertEmail)) {
      setEmailError("Enter a valid email address"); return;
    }
    setSaving(true);
    try {
      await updatePreferences({ alertEmail });
      setEmailSaved(true);
      setEmailError("");
    } catch (err) {
      setEmailError(err.message || "Failed to save email");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!alertActive && !emailSaved) {
      await saveEmail();
      if (emailError) return;
    }
    const newState = !alertActive;
    setSaving(true);
    try {
      await updatePreferences({ gasAlertEnabled: newState, gasAlertThreshold: threshold });
      setAlertActive(newState);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setEmailError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveThreshold = async () => {
    setSaving(true);
    try {
      await updatePreferences({ gasAlertThreshold: threshold });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "0 0 24px" }}>
      {/* Toggle */}
      <div style={{ background: C.card, border: `1px solid ${alertActive ? C.orange : C.border}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ color: C.light, fontSize: 15, fontWeight: 700 }}>🔥 Gas Price Alerts</div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Email when TTF drops below your threshold</div>
          </div>
          <div onClick={handleToggle}
            style={{ width: 48, height: 26, borderRadius: 13, background: alertActive ? C.orange : "#1E3A5F", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
            <div style={{ position: "absolute", top: 3, left: alertActive ? 24 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
          </div>
        </div>
        <div style={{ color: alertActive ? C.orange : C.muted, fontSize: 13, fontWeight: 600 }}>
          {alertActive ? "✅ Alerts active" : "⭕ Alerts off"}
        </div>
        {saved && <div style={{ color: C.green, fontSize: 12, marginTop: 4 }}>✓ Saved</div>}
      </div>

      {/* Email */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <div style={{ color: C.light, fontSize: 14, fontWeight: 600, marginBottom: 10 }}>📧 Alert email</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={alertEmail} onChange={e => { setAlertEmail(e.target.value); setEmailSaved(false); setEmailError(""); }}
            placeholder="your@email.com" type="email"
            style={{ flex: 1, background: "#0A2040", border: `1px solid ${emailError ? C.red : C.border}`, borderRadius: 8, color: C.light, fontSize: 14, padding: "10px 12px", outline: "none" }} />
          <button onClick={saveEmail} disabled={saving || emailSaved}
            style={{ padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: emailSaved ? "default" : "pointer", border: "none", background: emailSaved ? `${C.green}33` : C.teal, color: emailSaved ? C.green : "#fff" }}>
            {emailSaved ? "✓" : saving ? "…" : "Save"}
          </button>
        </div>
        {emailError && <div style={{ color: C.red, fontSize: 12, marginTop: 6 }}>{emailError}</div>}
        {emailSaved && <div style={{ color: C.green, fontSize: 12, marginTop: 6 }}>✓ Email saved</div>}
      </div>

      {/* Threshold */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <div style={{ color: C.light, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>📊 Alert threshold</div>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>Alert me when TTF drops below:</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ color: priceColor(threshold), fontSize: 32, fontWeight: 900, fontFamily: "monospace" }}>€{threshold}</div>
          <div style={{ color: C.muted, fontSize: 13 }}>per MWh</div>
          <div style={{ color: C.muted, fontSize: 12 }}>= {(threshold / 10).toFixed(2)} c€/kWh</div>
        </div>
        <input type="range" min={15} max={100} step={1} value={threshold}
          onChange={e => setThreshold(parseInt(e.target.value))}
          style={{ width: "100%", accentColor: C.orange, marginBottom: 8 }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: C.green,  fontSize: 11 }}>€15 — very cheap</span>
          <span style={{ color: C.yellow, fontSize: 11 }}>€50 — average</span>
          <span style={{ color: C.orange, fontSize: 11 }}>€100 — expensive</span>
        </div>
        <button onClick={handleSaveThreshold} disabled={saving}
          style={{ marginTop: 12, width: "100%", padding: "11px 0", borderRadius: 9, border: "none", background: C.orange, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save Threshold"}
        </button>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
        <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.7 }}>
          💡 <strong style={{ color: C.light }}>Good thresholds:</strong><br />
          — €25–30: historically very cheap (occurs ~20% of time)<br />
          — €35–40: below recent average<br />
          — Current average: ~€34–50/MWh depending on season<br />
          Gas alerts check every hour. You won't be emailed more than once per 6 hours.
        </div>
      </div>
    </div>
  );
}

// ── COMBINED BILL TAB ────────────────────────────────────────
function CombinedTab() {
  const [elec,      setElec]      = useState(3500);
  const [gas,       setGas]       = useState(13000);
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);

  const calculate = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/gas/combined?elec=${elec}&gas=${gas}`);
      const d = await r.json();
      if (d.success) setResult(d);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { calculate(); }, []);

  return (
    <div style={{ padding: "0 0 24px" }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ color: C.light, fontSize: 14, fontWeight: 600, marginBottom: 12 }}>⚡🔥 Your annual consumption</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          {[
            { label: "⚡ Electricity (kWh/year)", val: elec, set: setElec, placeholder: "3500" },
            { label: "🔥 Gas (kWh/year)",          val: gas,  set: setGas,  placeholder: "13000" },
          ].map(row => (
            <div key={row.label}>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>{row.label}</div>
              <input type="number" value={row.val}
                onChange={e => row.set(parseInt(e.target.value) || 0)}
                placeholder={row.placeholder}
                style={{ width: "100%", background: "#0A2040", border: `1px solid ${C.border}`, borderRadius: 8, color: C.light, fontSize: 15, padding: "10px 12px", outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}
        </div>
        <button onClick={calculate} disabled={loading}
          style={{ width: "100%", padding: "12px 0", borderRadius: 9, border: "none", background: `linear-gradient(135deg, ${C.teal}, ${C.orange})`, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          {loading ? "Calculating…" : "Find Best Combination"}
        </button>
      </div>

      {result && (
        <>
          {/* Winner */}
          {result.top5[0] && (
            <div style={{ background: "linear-gradient(135deg, #0A2040, #1A0A20)", border: `1px solid ${C.green}44`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <div style={{ color: C.green, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>🏆 BEST COMBINATION</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                <span style={{ background: `${C.teal}22`, color: C.teal, padding: "4px 10px", borderRadius: 7, fontSize: 13, fontWeight: 700 }}>⚡ {result.top5[0].elecSupplier}</span>
                <span style={{ color: C.muted, fontSize: 16 }}>+</span>
                <span style={{ background: `${C.orange}22`, color: C.orange, padding: "4px 10px", borderRadius: 7, fontSize: 13, fontWeight: 700 }}>🔥 {result.top5[0].gasSupplier}</span>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <div><div style={{ color: C.muted, fontSize: 11 }}>Annual total</div><div style={{ color: C.green, fontSize: 24, fontWeight: 800 }}>€{result.top5[0].combined}</div></div>
                <div><div style={{ color: C.muted, fontSize: 11 }}>Monthly</div><div style={{ color: C.light, fontSize: 24, fontWeight: 800 }}>€{result.top5[0].monthly}</div></div>
              </div>
            </div>
          )}

          {/* Top 5 table */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ color: C.light, fontSize: 13, fontWeight: 700 }}>Top 5 cheapest combinations</div>
            </div>
            {result.top5.map((combo, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: i < 4 ? `1px solid ${C.border}` : "none", background: i === 0 ? `${C.green}08` : "transparent" }}>
                <div style={{ color: C.muted, fontSize: 13, fontWeight: 700, width: 24 }}>#{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ color: C.teal, fontSize: 12, fontWeight: 600 }}>⚡ {combo.elecSupplier}</span>
                    <span style={{ color: C.muted, fontSize: 12 }}>+</span>
                    <span style={{ color: C.orange, fontSize: 12, fontWeight: 600 }}>🔥 {combo.gasSupplier}</span>
                    {combo.sameSupplier && <span style={{ background: `${C.purple}22`, color: C.purple, fontSize: 10, padding: "1px 6px", borderRadius: 5, fontWeight: 600 }}>BUNDLE</span>}
                  </div>
                  <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>€{combo.monthly}/month</div>
                </div>
                <div style={{ color: i === 0 ? C.green : C.light, fontSize: 16, fontWeight: 700 }}>€{combo.combined}</div>
              </div>
            ))}
          </div>

          {/* Best same supplier */}
          {result.bestSameSupplier && (
            <div style={{ background: C.card, border: `1px solid ${C.purple}44`, borderRadius: 12, padding: 16 }}>
              <div style={{ color: C.purple, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>💜 BEST SINGLE-SUPPLIER BUNDLE</div>
              <div style={{ color: C.light, fontSize: 15, fontWeight: 700 }}>
                {result.bestSameSupplier.elecSupplier} — electricity + gas
              </div>
              <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
                €{result.bestSameSupplier.combined}/year · €{result.bestSameSupplier.monthly}/month
              </div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
                May qualify for bundle discount — check directly with supplier
              </div>
            </div>
          )}
        </>
      )}

      <div style={{ color: C.muted, fontSize: 11, textAlign: "center", marginTop: 12 }}>
        Calculations are estimates based on published tariffs and average Belgian grid costs.<br />
        Always verify on supplier websites before switching contracts.
      </div>
    </div>
  );
}

// ── MAIN GAS TAB ─────────────────────────────────────────────
export default function GasTab({ user, isGuest, onSignIn, mobileTab, setMobileTab }) {
  const [_subTab, _setSubTab] = useState("today");
  // On mobile, parent controls the tab via bottom nav
  const subTab    = mobileTab && ["today","suppliers","history","alerts","combined"].includes(mobileTab) ? mobileTab : _subTab;
  const setSubTab = (t) => { _setSubTab(t); setMobileTab?.(t); };
  const [current,  setCurrent]  = useState(null);
  const [history,  setHistory]  = useState(null);

  useEffect(() => {
    fetch(`${API}/api/gas/current`).then(r => r.json()).then(d => { if (d.success) setCurrent(d); });
    fetch(`${API}/api/gas/history?days=30`).then(r => r.json()).then(d => { if (d.success) setHistory(d); });
  }, []);

  const SUB_TABS = [
    { id: "today",    label: "Today",    icon: "🔥" },
    { id: "suppliers",label: "Suppliers",icon: "🏢" },
    { id: "history",  label: "History",  icon: "📅" },
    { id: "alerts",   label: "Alerts",   icon: "🔔" },
    { id: "combined", label: "Combined", icon: "⚡🔥" },
  ];

  return (
    <div>
      {/* Sub-tab bar — hidden on mobile (bottom nav handles it), shown on desktop */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", paddingBottom: 2 }}>
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            style={{ flex: "0 0 auto", padding: "7px 13px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${subTab === t.id ? C.orange : C.border}`, background: subTab === t.id ? `${C.orange}22` : C.card, color: subTab === t.id ? C.orange : C.muted, transition: "all 0.15s", whiteSpace: "nowrap" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {subTab === "today"     && <TodayTab     current={current} history={history} />}
      {subTab === "suppliers" && <SuppliersTab ttf_cEkWh={current?.ttf_cEkWh} />}
      {subTab === "history"   && <HistoryTab   />}
      {subTab === "alerts"    && <GasAlertsTab user={user} isGuest={isGuest} onSignIn={onSignIn} />}
      {subTab === "combined"  && <CombinedTab  />}
    </div>
  );
}