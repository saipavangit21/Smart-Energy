/**
 * EnergyMixSection — Belgium generation mix + cross-border flows
 * Uses ENTSO-E A75 (generation) and A11 (flows) via backend endpoints.
 */
import { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";

const API = import.meta.env.VITE_API_URL || "https://smart-energy-production-aef3.up.railway.app";

const GEN_SOURCES = [
  { key: "Nuclear",       color: "#A78BFA", label: "Nuclear" },
  { key: "Wind Onshore",  color: "#10B981", label: "Wind ↑" },
  { key: "Wind Offshore", color: "#06B6D4", label: "Wind ⛵" },
  { key: "Solar",         color: "#FCD34D", label: "Solar" },
  { key: "Hydro ROR",     color: "#60A5FA", label: "Hydro" },
  { key: "Hydro Pump",    color: "#3B82F6", label: "Hydro Pump" },
  { key: "Biomass",       color: "#84CC16", label: "Biomass" },
  { key: "Fossil Gas",    color: "#94A3B8", label: "Gas" },
  { key: "Coal",          color: "#6B7280", label: "Coal" },
  { key: "Lignite",       color: "#57534E", label: "Lignite" },
  { key: "Waste",         color: "#9CA3AF", label: "Waste" },
  { key: "Other RE",      color: "#34D399", label: "Other RE" },
  { key: "Other",         color: "#475569", label: "Other" },
];

const FLOW_COLORS = { FR: "#3B82F6", NL: "#F97316", GB: "#EF4444", LU: "#8B5CF6" };

const cardStyle = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: "14px 18px",
};

export default function EnergyMixSection({ isMobile }) {
  const [genData,    setGenData]    = useState([]);
  const [flowData,   setFlowData]   = useState({ hourly: [], borders: [] });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [activeView, setActiveView] = useState("generation");

  const load = () => {
    setLoading(true); setError(null);
    Promise.all([
      fetch(`${API}/api/generation/today`, { credentials: "include" }).then(r => r.json()),
      fetch(`${API}/api/flows/today`, { credentials: "include" }).then(r => r.json()),
    ]).then(([gen, flows]) => {
      if (gen.success) setGenData(gen.data || []);
      else { console.error("[EnergyMix] generation error:", gen.error); setError(gen.error || "Failed to load generation data"); }
      if (flows.success) setFlowData({ hourly: flows.hourly || [], borders: flows.borders || [] });
      else console.warn("[EnergyMix] flows error:", flows.error);
    }).catch(e => { console.error("[EnergyMix] fetch error:", e); setError(e.message); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const latest    = genData[genData.length - 1] || null;
  const renewPct  = latest?.renewable_pct ?? null;
  const co2       = latest?.co2_g_kwh ?? null;
  const totalMW   = latest?.total_mw ?? null;
  const activeSources = GEN_SOURCES.filter(s => genData.some(h => (h[s.key] || 0) > 0));

  if (loading) return (
    <div style={{ textAlign: "center", padding: "40px 0", color: "#556" }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>🌿</div>
      <div style={{ fontSize: 13 }}>Loading generation data…</div>
    </div>
  );

  if (error) return (
    <div style={{ textAlign: "center", padding: "30px 0" }}>
      <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 6 }}>{error}</div>
      <div style={{ fontSize: 11, color: "#445", marginBottom: 12 }}>ENTSO-E generation data may not yet be published for today</div>
      <button onClick={load} style={{ padding: "7px 18px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "rgba(13,148,136,0.12)", border: "1px solid rgba(13,148,136,0.3)", color: "#0D9488", cursor: "pointer" }}>Retry</button>
    </div>
  );

  return (
    <div>
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#10B981" }}>{renewPct != null ? `${renewPct}%` : "—"}</div>
          <div style={{ fontSize: 10, color: "#556", marginTop: 2 }}>Renewable</div>
        </div>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: co2 != null && co2 < 150 ? "#10B981" : co2 != null && co2 < 300 ? "#F59E0B" : "#EF4444" }}>
            {co2 != null ? co2 : "—"}
          </div>
          <div style={{ fontSize: 10, color: "#556", marginTop: 2 }}>gCO₂/kWh</div>
        </div>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#06B6D4" }}>{totalMW != null ? `${(totalMW / 1000).toFixed(1)}` : "—"}</div>
          <div style={{ fontSize: 10, color: "#556", marginTop: 2 }}>GW output</div>
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 3, gap: 2, marginBottom: 16, width: "fit-content" }}>
        {[["generation", "⚡ Generation"], ["flows", "↔ Cross-border"]].map(([v, lbl]) => (
          <button key={v} onClick={() => setActiveView(v)} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", transition: "all 0.15s", background: activeView === v ? "rgba(255,255,255,0.1)" : "transparent", color: activeView === v ? "#fff" : "#667" }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Generation stacked area */}
      {activeView === "generation" && genData.length > 0 && (
        <>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: isMobile ? "14px 4px 10px" : "18px 8px 10px", marginBottom: 14 }}>
            <div style={{ paddingLeft: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Generation by Source</div>
              <div style={{ fontSize: 10, color: "#556", marginTop: 2 }}>MW · Today · Belgium · ENTSO-E</div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={genData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="hour_label" tick={{ fill: "#445", fontSize: 9 }} tickLine={false} interval={isMobile ? 3 : 2} />
                <YAxis tick={{ fill: "#445", fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}GW`} width={34} />
                <Tooltip
                  contentStyle={{ background: "rgba(8,12,22,0.97)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 14px" }}
                  labelStyle={{ color: "#667", fontSize: 11, marginBottom: 6 }}
                  formatter={(v, name) => [`${Math.round(v).toLocaleString()} MW`, name]}
                />
                {activeSources.map(s => (
                  <Area key={s.key} type="monotone" dataKey={s.key} stackId="1" stroke={s.color} fill={s.color} fillOpacity={0.75} strokeWidth={0} name={s.label} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 10px", padding: "8px 12px 0" }}>
              {activeSources.map(s => (
                <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 9, height: 9, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: "#778" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CO₂ trend */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: isMobile ? "14px 4px 10px" : "18px 8px 10px", marginBottom: 14 }}>
            <div style={{ paddingLeft: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>CO₂ Intensity</div>
              <div style={{ fontSize: 10, color: "#556", marginTop: 2 }}>gCO₂/kWh · estimated from generation mix</div>
            </div>
            <ResponsiveContainer width="100%" height={110}>
              <AreaChart data={genData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="hour_label" tick={{ fill: "#445", fontSize: 9 }} tickLine={false} interval={isMobile ? 3 : 2} />
                <YAxis tick={{ fill: "#445", fontSize: 9 }} tickLine={false} axisLine={false} width={28} />
                <Tooltip
                  contentStyle={{ background: "rgba(8,12,22,0.97)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 14px" }}
                  labelStyle={{ color: "#667", fontSize: 11 }}
                  formatter={v => [`${v} gCO₂/kWh`, "CO₂"]}
                />
                <Area type="monotone" dataKey="co2_g_kwh" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {activeView === "generation" && genData.length === 0 && (
        <div style={{ textAlign: "center", padding: "30px 0", color: "#556", fontSize: 13 }}>
          No generation data yet — ENTSO-E publishes after the hour
        </div>
      )}

      {/* Cross-border flows */}
      {activeView === "flows" && flowData.hourly.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: isMobile ? "14px 4px 10px" : "18px 8px 10px", marginBottom: 14 }}>
          <div style={{ paddingLeft: 12, marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Cross-border Physical Flows</div>
            <div style={{ fontSize: 10, color: "#556", marginTop: 2 }}>MW · positive = Belgium exports · ENTSO-E A11</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={flowData.hourly} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="hour_label" tick={{ fill: "#445", fontSize: 9 }} tickLine={false} interval={isMobile ? 3 : 2} />
              <YAxis tick={{ fill: "#445", fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${v > 0 ? "+" : ""}${Math.round(v / 1000 * 10) / 10}GW`} width={42} />
              <Tooltip
                contentStyle={{ background: "rgba(8,12,22,0.97)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 14px" }}
                labelStyle={{ color: "#667", fontSize: 11, marginBottom: 6 }}
                formatter={(v, name) => [`${v > 0 ? "+" : ""}${Math.round(v).toLocaleString()} MW`, name]}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
              {flowData.borders.map(b => (
                <Bar key={b} dataKey={b} stackId="net" fill={FLOW_COLORS[b] || "#667"} name={b} />
              ))}
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 10px", padding: "8px 12px 0", alignItems: "center" }}>
            {flowData.borders.map(b => (
              <div key={b} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 9, height: 9, borderRadius: 2, background: FLOW_COLORS[b] || "#667", flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: "#778" }}>{b}</span>
              </div>
            ))}
            <span style={{ fontSize: 10, color: "#445", marginLeft: "auto" }}>+ export / − import</span>
          </div>
        </div>
      )}

      {activeView === "flows" && flowData.hourly.length === 0 && (
        <div style={{ textAlign: "center", padding: "30px 0", color: "#556" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>↔</div>
          <div style={{ fontSize: 13 }}>Cross-border flow data unavailable</div>
          <div style={{ fontSize: 11, marginTop: 4, color: "#445" }}>ENTSO-E A11 data may not yet be published for today</div>
        </div>
      )}

      <div style={{ fontSize: 10, color: "#334", marginTop: 4 }}>
        Source: ENTSO-E Transparency Platform · ~1h delay · CO₂ via lifecycle factors
      </div>
    </div>
  );
}
