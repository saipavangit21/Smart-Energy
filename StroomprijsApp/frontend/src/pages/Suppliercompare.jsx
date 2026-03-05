/**
 * SupplierCompare.jsx
 * 
 * Full supplier comparison with appliance-based consumption calculator
 * Tabs: Calculator · Compare · Plans
 */
import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

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

const REGIONS = [
  { id: "flanders",  label: "Flanders",       flag: "🔶", note: "Fluvius · Capacity tariff" },
  { id: "wallonia",  label: "Wallonia",        flag: "🔷", note: "ORES/RESA · kWh tariff" },
  { id: "brussels",  label: "Brussels",        flag: "🏙️", note: "Sibelga · kWh tariff" },
];

const TYPE_COLORS = {
  variable: C.teal,
  fixed:    C.cyan,
  dynamic:  C.green,
};

const TYPE_LABELS = {
  variable: "Variable",
  fixed:    "Fixed",
  dynamic:  "Dynamic",
};

function Badge({ children, color }) {
  return (
    <span style={{ background: `${color}22`, color, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function Card({ children, style = {}, highlight = false }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${highlight ? C.green : C.border}`, borderRadius: 16, padding: 16, ...style }}>
      {children}
    </div>
  );
}

// ── APPLIANCE CALCULATOR TAB ─────────────────────────────────
function CalculatorTab({ onConsumptionChange, region, setRegion, currentMwh }) {
  const [appliances, setAppliances]   = useState([]);
  const [selections, setSelections]   = useState({});
  const [result,     setResult]       = useState(null);
  const [loading,    setLoading]      = useState(false);
  const [greenOnly,  setGreenOnly]    = useState(false);
  const [step,       setStep]         = useState("appliances"); // appliances | results

  useEffect(() => {
    fetch("/api/suppliers/appliances")
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setAppliances(d.appliances);
          // Pre-select all with defaults
          const defaults = {};
          d.appliances.forEach(a => { defaults[a.id] = { selected: true, uses: a.default_uses_per_week }; });
          setSelections(defaults);
        }
      });
  }, []);

  const calculate = useCallback(async () => {
    setLoading(true);
    try {
      const inputs = Object.entries(selections)
        .filter(([, v]) => v.selected)
        .map(([id, v]) => ({ id, uses_per_week: v.uses }));

      const res = await fetch("/api/suppliers/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appliances: inputs,
          region,
          epex_avg: currentMwh || 100,
          green_only: greenOnly,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
        onConsumptionChange(data.consumption.total_kwh, data.consumption.peak_kw, data.results);
        setStep("results");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selections, region, greenOnly, currentMwh, onConsumptionChange]);

  if (step === "results" && result) {
    return <ResultsView result={result} onBack={() => setStep("appliances")} region={region} />;
  }

  return (
    <div>
      {/* Region + Options */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ color: C.light, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🏠 Your situation</div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Region</div>
          <div style={{ display: "flex", gap: 6 }}>
            {REGIONS.map(r => (
              <button key={r.id} onClick={() => setRegion(r.id)}
                style={{ flex: 1, padding: "8px 4px", borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${region === r.id ? C.teal : C.border}`, background: region === r.id ? `${C.teal}22` : C.card2, color: region === r.id ? C.teal : C.muted, textAlign: "center" }}>
                <div>{r.flag}</div>
                <div>{r.label}</div>
                <div style={{ fontSize: 9, marginTop: 2, opacity: 0.7 }}>{r.note}</div>
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: C.light, fontSize: 13, fontWeight: 600 }}>🌿 Green energy only</div>
            <div style={{ color: C.muted, fontSize: 11 }}>Filter to 100% renewable plans</div>
          </div>
          <div onClick={() => setGreenOnly(g => !g)}
            style={{ width: 44, height: 24, borderRadius: 12, background: greenOnly ? C.green : "#1E3A5F", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
            <div style={{ position: "absolute", top: 2, left: greenOnly ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
          </div>
        </div>
      </Card>

      {/* Appliance list */}
      <div style={{ color: C.light, fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
        🔌 Your appliances — adjust weekly usage
      </div>

      {appliances.map(a => {
        const sel = selections[a.id] || { selected: true, uses: a.default_uses_per_week };
        return (
          <Card key={a.id} style={{ marginBottom: 8, opacity: sel.selected ? 1 : 0.4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Checkbox */}
              <div onClick={() => setSelections(s => ({ ...s, [a.id]: { ...sel, selected: !sel.selected } }))}
                style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${sel.selected ? C.teal : C.border}`, background: sel.selected ? `${C.teal}22` : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {sel.selected && <span style={{ color: C.teal, fontSize: 14 }}>✓</span>}
              </div>

              {/* Icon + Name */}
              <div style={{ fontSize: 22, flexShrink: 0 }}>{a.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.light, fontSize: 13, fontWeight: 600 }}>{a.label}</div>
                <div style={{ color: C.muted, fontSize: 11 }}>
                  {a.kwh_per_use} kWh/use · peak {a.peak_kw} kW
                </div>
              </div>

              {/* Uses per week */}
              {sel.selected && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setSelections(s => ({ ...s, [a.id]: { ...sel, uses: Math.max(1, sel.uses - 1) } }))}
                    style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.border}`, background: C.card2, color: C.light, fontSize: 16, cursor: "pointer", lineHeight: 1 }}>−</button>
                  <div style={{ textAlign: "center", minWidth: 36 }}>
                    <div style={{ color: C.light, fontWeight: 700, fontSize: 14 }}>{sel.uses}×</div>
                    <div style={{ color: C.muted, fontSize: 9 }}>per week</div>
                  </div>
                  <button onClick={() => setSelections(s => ({ ...s, [a.id]: { ...sel, uses: Math.min(21, sel.uses + 1) } }))}
                    style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.border}`, background: C.card2, color: C.light, fontSize: 16, cursor: "pointer", lineHeight: 1 }}>+</button>
                </div>
              )}
            </div>

            {/* Tip */}
            {sel.selected && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`, color: C.muted, fontSize: 11 }}>
                💡 {a.tip}
              </div>
            )}
          </Card>
        );
      })}

      {/* Calculate button */}
      <button onClick={calculate} disabled={loading}
        style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${C.teal}, #1A56A4)`, color: "#fff", fontSize: 15, fontWeight: 800, cursor: loading ? "default" : "pointer", marginTop: 8, boxShadow: `0 4px 20px ${C.teal}44` }}>
        {loading ? "Calculating…" : "⚡ Find My Best Plan →"}
      </button>
    </div>
  );
}

// ── RESULTS VIEW ─────────────────────────────────────────────
function ResultsView({ result, onBack, region }) {
  const { consumption, results } = result;
  const [expanded, setExpanded] = useState(null);

  const regionLabel = REGIONS.find(r => r.id === region)?.label || region;
  const cheapest = results[0];

  return (
    <div>
      {/* Back */}
      <button onClick={onBack} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", marginBottom: 14 }}>
        ← Recalculate
      </button>

      {/* Consumption summary */}
      <div style={{ background: `linear-gradient(135deg, ${C.teal}18, ${C.teal}08)`, border: `1px solid ${C.teal}44`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ color: C.teal, fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>
          📊 Your estimated consumption · {regionLabel}
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: C.muted, fontSize: 11 }}>Annual usage</div>
            <div style={{ color: C.light, fontSize: 28, fontWeight: 900, fontFamily: "monospace" }}>
              {consumption.total_kwh.toLocaleString()} <span style={{ fontSize: 13, color: C.muted }}>kWh</span>
            </div>
          </div>
          <div>
            <div style={{ color: C.muted, fontSize: 11 }}>Peak load</div>
            <div style={{ color: C.yellow, fontSize: 28, fontWeight: 900, fontFamily: "monospace" }}>
              {consumption.peak_kw} <span style={{ fontSize: 13, color: C.muted }}>kW</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ color: C.muted, fontSize: 11 }}>Household type</div>
            <div style={{ color: C.light, fontSize: 13, fontWeight: 600, marginTop: 4 }}>
              {consumption.household_size}
            </div>
          </div>
        </div>

        {/* Appliance breakdown mini chart */}
        {consumption.breakdown.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {consumption.breakdown.slice(0, 5).map(b => (
              <div key={b.id} style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                  <span style={{ color: C.light }}>{b.icon} {b.label}</span>
                  <span style={{ color: C.muted }}>{b.annual_kwh} kWh ({b.pct}%)</span>
                </div>
                <div style={{ height: 4, background: C.border, borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${b.pct}%`, background: C.teal, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Best plan banner */}
      {cheapest && (
        <div style={{ background: "linear-gradient(135deg, #0A2E20, #0A2040)", border: `1px solid ${C.green}55`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ color: C.green, fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>
            🏆 Cheapest plan for your usage
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: C.light, fontSize: 20, fontWeight: 800 }}>
                {cheapest.supplier_name} — {cheapest.plan_name}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                <Badge color={TYPE_COLORS[cheapest.type]}>{TYPE_LABELS[cheapest.type]}</Badge>
                {cheapest.green && <Badge color={C.green}>🌿 Green</Badge>}
                <Badge color={C.muted}>{cheapest.duration}</Badge>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: C.green, fontSize: 32, fontWeight: 900 }}>€{cheapest.costs.total}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>€{cheapest.costs.monthly}/month</div>
            </div>
          </div>
        </div>
      )}

      {/* All plans */}
      <div style={{ color: C.light, fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
        All {results.length} plans ranked
      </div>

      {results.map((plan, i) => (
        <div key={plan.plan_id} onClick={() => setExpanded(expanded === plan.plan_id ? null : plan.plan_id)}
          style={{ background: C.card, border: `1px solid ${plan.cheapest ? C.green : C.border}`, borderRadius: 14, padding: 16, marginBottom: 8, cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `${plan.supplier_color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
              {plan.supplier_logo}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ color: C.light, fontSize: 14, fontWeight: 700 }}>{plan.supplier_name}</span>
                <span style={{ color: C.muted, fontSize: 12 }}>{plan.plan_name}</span>
                {plan.cheapest && <Badge color={C.green}>BEST</Badge>}
                <Badge color={TYPE_COLORS[plan.type]}>{TYPE_LABELS[plan.type]}</Badge>
                {plan.green && <span style={{ color: C.green, fontSize: 12 }}>🌿</span>}
              </div>
              <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
                {plan.energy_rate ? `${(plan.energy_rate * 100).toFixed(2)} c€/kWh` : `Dynamic + ${plan.markup_cEkWh}c€`}
                {" · "}€{plan.standing_charge}/yr standing
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ color: plan.cheapest ? C.green : C.light, fontSize: 18, fontWeight: 800 }}>€{plan.costs.total}</div>
              <div style={{ color: C.muted, fontSize: 11 }}>€{plan.costs.monthly}/mo</div>
              {i > 0 && <div style={{ color: C.red, fontSize: 10 }}>+€{plan.savings_vs_cheapest}/yr</div>}
            </div>
            <div style={{ color: C.muted, fontSize: 12 }}>{expanded === plan.plan_id ? "▲" : "▼"}</div>
          </div>

          {expanded === plan.plan_id && (
            <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
              {/* Cost breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                {[
                  { label: "Energy cost",     value: `€${plan.costs.energy}`, color: C.orange },
                  { label: "Grid / network",  value: `€${plan.costs.grid}`,   color: C.yellow },
                  { label: "Standing charge", value: `€${plan.costs.standing}`, color: C.muted },
                  { label: "VAT (6%)",        value: `€${plan.costs.vat}`,    color: C.muted },
                ].map(row => (
                  <div key={row.label} style={{ background: C.card2, borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ color: C.muted, fontSize: 11 }}>{row.label}</div>
                    <div style={{ color: row.color, fontSize: 15, fontWeight: 700 }}>{row.value}</div>
                  </div>
                ))}
              </div>

              {/* All-in tariff + contract */}
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, background: C.card2, borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ color: C.muted, fontSize: 11 }}>All-in tariff</div>
                  <div style={{ color: C.light, fontSize: 15, fontWeight: 700 }}>{plan.costs.perKwh} c€/kWh</div>
                </div>
                <div style={{ flex: 1, background: C.card2, borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ color: C.muted, fontSize: 11 }}>Contract</div>
                  <div style={{ color: C.light, fontSize: 14, fontWeight: 600 }}>{plan.duration}</div>
                </div>
              </div>

              {/* Highlights */}
              {plan.highlights?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  {plan.highlights.map(h => (
                    <div key={h} style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>✓ {h}</div>
                  ))}
                </div>
              )}

              {/* Formula if dynamic/variable */}
              {plan.formula && (
                <div style={{ background: "#0A2040", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
                  <div style={{ color: C.muted, fontSize: 11, marginBottom: 2 }}>Pricing formula</div>
                  <div style={{ color: C.cyan, fontSize: 12, fontFamily: "monospace" }}>{plan.formula}</div>
                </div>
              )}

              <a href={`https://${plan.supplier_url?.replace(/https?:\/\//,"")}`} target="_blank" rel="noopener noreferrer"
                style={{ display: "block", background: `${plan.supplier_color}22`, border: `1px solid ${plan.supplier_color}55`, color: plan.supplier_color, borderRadius: 9, padding: "10px 0", textAlign: "center", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                View plan at {plan.supplier_name} →
              </a>
            </div>
          )}
        </div>
      ))}

      <div style={{ color: C.muted, fontSize: 11, textAlign: "center", marginTop: 8, lineHeight: 1.7 }}>
        Calculations include energy + grid (Fluvius/ORES) + levies + 6% VAT.<br />
        Tariff data: supplier cards + VREG · Updated weekly · Verify on supplier website.
      </div>
    </div>
  );
}

// ── COMPARE TAB (manual kWh input) ───────────────────────────
function CompareTab({ currentMwh }) {
  const [consumption, setConsumption] = useState(3500);
  const [inputVal,    setInputVal]    = useState("3500");
  const [region,      setRegion]      = useState("flanders");
  const [greenOnly,   setGreenOnly]   = useState(false);
  const [results,     setResults]     = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [expanded,    setExpanded]    = useState(null);
  const [meta,        setMeta]        = useState(null);

  useEffect(() => {
    fetch("/api/suppliers/meta").then(r => r.json()).then(d => { if (d.success) setMeta(d.meta); });
  }, []);

  useEffect(() => {
    if (!consumption || !region) return;
    setLoading(true);
    fetch(`/api/suppliers/electricity?consumption=${consumption}&region=${region}&green=${greenOnly}&epex=${currentMwh || 100}`)
      .then(r => r.json())
      .then(d => { if (d.success) setResults(d.results); })
      .finally(() => setLoading(false));
  }, [consumption, region, greenOnly, currentMwh]);

  const cheapest = results[0];

  return (
    <div>
      {/* Controls */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ color: C.light, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>⚙️ Comparison settings</div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Annual consumption</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input type="number" value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onBlur={() => { const v = Math.min(Math.max(parseInt(inputVal) || 3500, 500), 50000); setInputVal(String(v)); setConsumption(v); }}
              style={{ flex: 1, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.light, fontSize: 16, padding: "10px 12px", outline: "none" }} />
            <span style={{ color: C.muted, fontSize: 13 }}>kWh/yr</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[2000, 3500, 5000, 8000].map(v => (
              <button key={v} onClick={() => { setConsumption(v); setInputVal(String(v)); }}
                style={{ flex: 1, padding: "6px 0", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${consumption === v ? C.teal : C.border}`, background: consumption === v ? `${C.teal}22` : "transparent", color: consumption === v ? C.teal : C.muted }}>
                {v >= 1000 ? `${v/1000}k` : v}
              </button>
            ))}
          </div>
          <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>🏠 Avg: 3,500 kWh/yr · With EV: 7,000–9,000 · With heat pump: 10,000+</div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Region</div>
          <div style={{ display: "flex", gap: 6 }}>
            {REGIONS.map(r => (
              <button key={r.id} onClick={() => setRegion(r.id)}
                style={{ flex: 1, padding: "7px 4px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${region === r.id ? C.teal : C.border}`, background: region === r.id ? `${C.teal}22` : C.card2, color: region === r.id ? C.teal : C.muted }}>
                {r.flag} {r.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: C.light, fontSize: 13, fontWeight: 600 }}>🌿 Green plans only</span>
          <div onClick={() => setGreenOnly(g => !g)}
            style={{ width: 44, height: 24, borderRadius: 12, background: greenOnly ? C.green : "#1E3A5F", cursor: "pointer", position: "relative" }}>
            <div style={{ position: "absolute", top: 2, left: greenOnly ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
          </div>
        </div>
      </Card>

      {/* Data freshness */}
      {meta && (
        <div style={{ color: C.muted, fontSize: 11, marginBottom: 12, textAlign: "right" }}>
          Tariff data: {meta.updated} · Next refresh: {meta.next_scrape}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 30, color: C.muted }}>Loading plans…</div>
      ) : (
        <>
          {/* Savings bar chart */}
          {results.length > 0 && (
            <Card style={{ marginBottom: 14 }}>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>Annual cost comparison · {consumption.toLocaleString()} kWh/yr</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={results.slice(0, 8).map(r => ({ name: `${r.supplier_name}\n${r.plan_name}`, total: r.costs.total, color: r.supplier_color }))} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: C.muted }} tickFormatter={v => `€${v}`} domain={["auto", "auto"]} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: C.muted }} width={90} tickFormatter={v => v.split("\n")[0]} />
                  <Tooltip formatter={v => [`€${v}`, "Annual"]} contentStyle={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8 }} labelStyle={{ color: C.light, fontSize: 11 }} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {results.slice(0, 8).map((r, i) => <Cell key={i} fill={i === 0 ? C.green : r.supplier_color} opacity={i === 0 ? 1 : 0.6} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Plan list */}
          {results.map((plan, i) => (
            <div key={plan.plan_id} onClick={() => setExpanded(expanded === plan.plan_id ? null : plan.plan_id)}
              style={{ background: C.card, border: `1px solid ${plan.cheapest ? C.green : C.border}`, borderRadius: 14, padding: 14, marginBottom: 8, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${plan.supplier_color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                  {plan.supplier_logo}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                    <span style={{ color: C.light, fontSize: 13, fontWeight: 700 }}>{plan.supplier_name}</span>
                    <span style={{ color: C.muted, fontSize: 12 }}>{plan.plan_name}</span>
                    {plan.cheapest && <Badge color={C.green}>CHEAPEST</Badge>}
                    <Badge color={TYPE_COLORS[plan.type]}>{TYPE_LABELS[plan.type]}</Badge>
                    {plan.green && <span style={{ color: C.green, fontSize: 11 }}>🌿</span>}
                    {!plan.data_fresh && <Badge color={C.yellow}>⚠ Check date</Badge>}
                  </div>
                  <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
                    {plan.energy_rate ? `${(plan.energy_rate * 100).toFixed(3)} c€/kWh` : `EPEX + ${plan.markup_cEkWh}c€/kWh`}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ color: plan.cheapest ? C.green : C.light, fontSize: 17, fontWeight: 800 }}>€{plan.costs.total}</div>
                  <div style={{ color: C.muted, fontSize: 11 }}>€{plan.costs.monthly}/mo</div>
                  {i > 0 && <div style={{ color: "#EF4444", fontSize: 10 }}>+€{plan.savings_vs_cheapest}</div>}
                </div>
                <div style={{ color: C.muted }}>{expanded === plan.plan_id ? "▲" : "▼"}</div>
              </div>

              {expanded === plan.plan_id && (
                <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                    {[
                      { l: "Energy",  v: `€${plan.costs.energy}`,   c: C.orange },
                      { l: "Grid",    v: `€${plan.costs.grid}`,     c: C.yellow },
                      { l: "Standing",v: `€${plan.costs.standing}`, c: C.muted  },
                      { l: "VAT 6%",  v: `€${plan.costs.vat}`,     c: C.muted  },
                    ].map(row => (
                      <div key={row.l} style={{ background: C.card2, borderRadius: 8, padding: "8px 10px" }}>
                        <div style={{ color: C.muted, fontSize: 10 }}>{row.l}</div>
                        <div style={{ color: row.c, fontSize: 14, fontWeight: 700 }}>{row.v}</div>
                      </div>
                    ))}
                  </div>
                  {plan.highlights?.map(h => <div key={h} style={{ color: C.muted, fontSize: 12, marginBottom: 3 }}>✓ {h}</div>)}
                  {plan.formula && (
                    <div style={{ background: "#0A2040", borderRadius: 8, padding: "6px 10px", margin: "8px 0", color: C.cyan, fontSize: 12, fontFamily: "monospace" }}>
                      {plan.formula}
                    </div>
                  )}
                  <a href={plan.supplier_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: "block", background: `${plan.supplier_color}22`, border: `1px solid ${plan.supplier_color}55`, color: plan.supplier_color, borderRadius: 9, padding: "9px 0", textAlign: "center", fontSize: 13, fontWeight: 700, textDecoration: "none", marginTop: 10 }}>
                    Go to {plan.supplier_name} →
                  </a>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      <div style={{ color: C.muted, fontSize: 11, textAlign: "center", marginTop: 8, lineHeight: 1.6 }}>
        Energy + Fluvius/ORES grid costs + levies + 6% VAT included.<br />
        Always verify on the supplier's website before switching.
      </div>
    </div>
  );
}

// ── MAIN EXPORT ───────────────────────────────────────────────
const TABS = [
  { id: "calculator", label: "🔌 Calculator", desc: "Enter appliances → get consumption estimate" },
  { id: "compare",    label: "📊 Compare",    desc: "Enter kWh manually → rank all plans" },
];

export default function SupplierCompare({ currentMwh, isMobile }) {
  const [tab,         setTab]         = useState("calculator");
  const [region,      setRegion]      = useState("flanders");
  const [consumption, setConsumption] = useState(null);
  const [peak,        setPeak]        = useState(null);

  const handleConsumptionChange = (kwh, pkW) => {
    setConsumption(kwh);
    setPeak(pkW);
  };

  return (
    <div>
      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: "10px 8px", borderRadius: 9, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", transition: "all 0.15s", background: tab === t.id ? "rgba(255,255,255,0.1)" : "transparent", color: tab === t.id ? "#fff" : "#667", textAlign: "center" }}>
            <div>{t.label}</div>
            {!isMobile && <div style={{ fontSize: 10, color: tab === t.id ? "#889" : "#445", marginTop: 2 }}>{t.desc}</div>}
          </button>
        ))}
      </div>

      {tab === "calculator" && (
        <CalculatorTab
          onConsumptionChange={handleConsumptionChange}
          region={region}
          setRegion={setRegion}
          currentMwh={currentMwh}
        />
      )}
      {tab === "compare" && (
        <CompareTab currentMwh={currentMwh} />
      )}
    </div>
  );
}