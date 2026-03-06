/**
 * CalculatorPage.jsx — SmartPrice.be
 * Standalone page at /calculator and /calculator?type=gas
 *
 * - Anyone can fill in appliances + see their consumption estimate
 * - Hitting "Find My Best Plan" gates on sign-in if guest
 * - After sign-in, results are shown immediately
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

// ── Design tokens (self-contained, no dependency on Dashboard) ─
const C = {
  bg:     "#060B14",
  card:   "rgba(255,255,255,0.03)",
  card2:  "#0A1628",
  border: "rgba(255,255,255,0.08)",
  teal:   "#0D9488",
  green:  "#10B981",
  orange: "#F97316",
  yellow: "#F59E0B",
  red:    "#EF4444",
  cyan:   "#06B6D4",
  muted:  "#64748B",
  light:  "#E2E8F0",
};

const REGIONS = [
  { id: "flanders", label: "Flanders", flag: "🔶", note: "Fluvius · Capacity tariff" },
  { id: "wallonia", label: "Wallonia",  flag: "🔷", note: "ORES/RESA · kWh"          },
  { id: "brussels", label: "Brussels",  flag: "🏙️", note: "Sibelga · kWh"            },
];

const TYPE_COLOR = { variable: C.teal, fixed: C.cyan, dynamic: C.green };
const TYPE_LABEL = { variable: "Variable", fixed: "Fixed", dynamic: "Dynamic" };

// ── Small shared components ────────────────────────────────────
function Badge({ children, color }) {
  return (
    <span style={{ background: `${color}22`, color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)}
      style={{ width: 44, height: 24, borderRadius: 12, background: value ? C.green : "#1E3A5F", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 2, left: value ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
    </div>
  );
}

// ── Sign-in Gate Modal ─────────────────────────────────────────
function SignInGate({ onSignIn, onClose, energyType }) {
  const accent = energyType === "gas" ? C.orange : C.teal;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#0D1626", border: `1px solid ${accent}44`, borderRadius: 24, padding: 32, maxWidth: 380, width: "100%", textAlign: "center", boxShadow: `0 24px 80px ${accent}22` }}>

        <div style={{ fontSize: 48, marginBottom: 12 }}>{energyType === "gas" ? "🔥" : "⚡"}</div>
        <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 900, color: C.light }}>
          Your results are ready!
        </h2>
        <p style={{ color: C.muted, fontSize: 14, margin: "0 0 24px", lineHeight: 1.6 }}>
          Sign in or create a free account to see your personalised plan rankings, save your preferences, and get price alerts.
        </p>

        <button onClick={onSignIn}
          style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${accent}, ${energyType === "gas" ? "#C2410C" : "#1A56A4"})`, color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", marginBottom: 10, boxShadow: `0 4px 20px ${accent}44` }}>
          Sign In / Create Account →
        </button>

        <button onClick={onClose}
          style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          ← Go back & edit
        </button>

        <p style={{ color: "#334155", fontSize: 11, marginTop: 16 }}>
          Free forever · No credit card · Unsubscribe anytime
        </p>
      </div>
    </div>
  );
}

// ── Plan Card ──────────────────────────────────────────────────
function PlanCard({ plan, rank, expanded, setExpanded }) {
  const isOpen = expanded === plan.plan_id;
  const isGas  = plan.plan_id?.includes("gas");
  const accent = isGas ? C.orange : C.teal;

  return (
    <div onClick={() => setExpanded(isOpen ? null : plan.plan_id)}
      style={{ background: C.card, border: `1px solid ${plan.cheapest ? C.green : C.border}`, borderRadius: 14, padding: 14, marginBottom: 8, cursor: "pointer", transition: "border-color 0.15s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${plan.supplier_color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
          {plan.supplier_logo}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            <span style={{ color: C.light, fontSize: 13, fontWeight: 700 }}>{plan.supplier_name}</span>
            <span style={{ color: C.muted, fontSize: 12 }}>{plan.plan_name}</span>
            {plan.cheapest && <Badge color={C.green}>🏆 BEST</Badge>}
            <Badge color={TYPE_COLOR[plan.type]}>{TYPE_LABEL[plan.type]}</Badge>
            {plan.green && <span style={{ color: C.green, fontSize: 11 }}>🌿</span>}
          </div>
          <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
            {plan.energy_rate ? `${(plan.energy_rate * 100).toFixed(3)} c€/kWh` : `Spot + ${plan.markup_cEkWh}c€/kWh`}
            {" · "}€{plan.standing_charge}/yr standing
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ color: plan.cheapest ? C.green : C.light, fontSize: 17, fontWeight: 800 }}>€{plan.costs.total}</div>
          <div style={{ color: C.muted, fontSize: 11 }}>€{plan.costs.monthly}/mo</div>
          {rank > 0 && <div style={{ color: C.red, fontSize: 10 }}>+€{plan.savings_vs_cheapest}/yr</div>}
        </div>
        <div style={{ color: C.muted, fontSize: 12, flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</div>
      </div>

      {isOpen && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
            {[
              ["Energy",  `€${plan.costs.energy}`,   C.orange],
              ["Grid",    `€${plan.costs.grid}`,     C.yellow],
              ["Standing",`€${plan.costs.standing}`, C.muted],
              ["VAT",     `€${plan.costs.vat}`,      C.muted],
            ].map(([l, v, col]) => (
              <div key={l} style={{ background: C.card2, borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ color: C.muted, fontSize: 10 }}>{l}</div>
                <div style={{ color: col, fontSize: 14, fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1, background: C.card2, borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ color: C.muted, fontSize: 10 }}>All-in tariff</div>
              <div style={{ color: accent, fontSize: 14, fontWeight: 700 }}>{plan.costs.perKwh} c€/kWh</div>
            </div>
            <div style={{ flex: 1, background: C.card2, borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ color: C.muted, fontSize: 10 }}>Contract</div>
              <div style={{ color: C.light, fontSize: 13, fontWeight: 600 }}>{plan.duration}</div>
            </div>
          </div>
          {plan.highlights?.map(h => (
            <div key={h} style={{ color: C.muted, fontSize: 12, marginBottom: 3 }}>✓ {h}</div>
          ))}
          {plan.formula && (
            <div style={{ background: "rgba(6,182,212,0.07)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
              <div style={{ color: C.muted, fontSize: 10, marginBottom: 2 }}>Pricing formula</div>
              <div style={{ color: C.cyan, fontSize: 12, fontFamily: "monospace" }}>{plan.formula}</div>
            </div>
          )}
          <a href={plan.supplier_url} target="_blank" rel="noopener noreferrer"
            style={{ display: "block", background: `${plan.supplier_color}18`, border: `1px solid ${plan.supplier_color}44`, color: plan.supplier_color, borderRadius: 9, padding: "10px 0", textAlign: "center", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            View at {plan.supplier_name} →
          </a>
        </div>
      )}
    </div>
  );
}

// ── Results View ───────────────────────────────────────────────
function ResultsView({ result, onBack, energyType }) {
  const [expanded, setExpanded] = useState(null);
  const { consumption, results } = result;
  const isGas   = energyType === "gas";
  const accent  = isGas ? C.orange : C.teal;
  const cheapest = results[0];

  return (
    <div>
      <button onClick={onBack}
        style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: "7px 16px", fontSize: 12, cursor: "pointer", marginBottom: 16 }}>
        ← Recalculate
      </button>

      {/* Consumption summary */}
      <div style={{ background: `${accent}10`, border: `1px solid ${accent}33`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ color: accent, fontSize: 12, fontWeight: 700, marginBottom: 10, textTransform: "uppercase" }}>
          📊 Your estimated {isGas ? "gas" : "electricity"} consumption
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: consumption.breakdown?.length ? 14 : 0 }}>
          <div>
            <div style={{ color: C.muted, fontSize: 11 }}>Annual usage</div>
            <div style={{ color: C.light, fontSize: 30, fontWeight: 900, fontFamily: "monospace" }}>
              {consumption.total_kwh?.toLocaleString()} <span style={{ fontSize: 13, color: C.muted }}>kWh</span>
            </div>
          </div>
          {!isGas && consumption.peak_kw && (
            <div>
              <div style={{ color: C.muted, fontSize: 11 }}>Peak load</div>
              <div style={{ color: C.yellow, fontSize: 30, fontWeight: 900, fontFamily: "monospace" }}>
                {consumption.peak_kw} <span style={{ fontSize: 13, color: C.muted }}>kW</span>
              </div>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ color: C.muted, fontSize: 11 }}>Household type</div>
            <div style={{ color: C.light, fontSize: 13, fontWeight: 600, marginTop: 4 }}>
              {consumption.household_size || consumption.household}
            </div>
          </div>
        </div>

        {consumption.breakdown?.slice(0, 5).map(b => (
          <div key={b.id} style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
              <span style={{ color: C.light }}>{b.icon} {b.label}</span>
              <span style={{ color: C.muted }}>{b.annual_kwh} kWh ({b.pct}%)</span>
            </div>
            <div style={{ height: 4, background: C.border, borderRadius: 2 }}>
              <div style={{ height: "100%", width: `${b.pct}%`, background: accent, borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Cheapest banner */}
      {cheapest && (
        <div style={{ background: "linear-gradient(135deg,#0A2E20,#0A1A30)", border: `1px solid ${C.green}44`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ color: C.green, fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>
            🏆 Cheapest plan for your usage
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ color: C.light, fontSize: 20, fontWeight: 800 }}>
                {cheapest.supplier_name} — {cheapest.plan_name}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                <Badge color={TYPE_COLOR[cheapest.type]}>{TYPE_LABEL[cheapest.type]}</Badge>
                {cheapest.green && <Badge color={C.green}>🌿 Green</Badge>}
                <Badge color={C.muted}>{cheapest.duration}</Badge>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: C.green, fontSize: 34, fontWeight: 900 }}>€{cheapest.costs.total}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>€{cheapest.costs.monthly}/month</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ color: C.light, fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
        All {results.length} plans ranked
      </div>
      {results.map((plan, i) => (
        <PlanCard key={plan.plan_id} plan={plan} rank={i} expanded={expanded} setExpanded={setExpanded} />
      ))}

      <div style={{ color: C.muted, fontSize: 11, textAlign: "center", marginTop: 12, lineHeight: 1.7 }}>
        {isGas
          ? "Includes energy + Fluxys/ORES grid + levies + 21% VAT."
          : "Includes energy + Fluvius/ORES grid + levies + 6% VAT."
        }<br />
        Tariff data scraped weekly · Always verify on supplier website before switching.
      </div>
    </div>
  );
}

// ── Electricity Appliance Calculator ──────────────────────────
function ElecCalculator({ isGuest, onRequestSignIn }) {
  const [appliances,  setAppliances]  = useState([]);
  const [selections,  setSelections]  = useState({});
  const [region,      setRegion]      = useState("flanders");
  const [greenOnly,   setGreenOnly]   = useState(false);
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [fetching,    setFetching]    = useState(true);
  const [showGate,    setShowGate]    = useState(false);
  const [pendingCalc, setPendingCalc] = useState(null); // store result while gate is shown

  useEffect(() => {
    fetch("/api/suppliers/appliances")
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

  const calculate = useCallback(async () => {
    setLoading(true);
    try {
      const inputs = Object.entries(selections)
        .filter(([, v]) => v.selected)
        .map(([id, v]) => ({ id, uses_per_week: v.uses }));
      const res = await fetch("/api/suppliers/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appliances: inputs, region, epex_avg: 100, green_only: greenOnly }),
      });
      const data = await res.json();
      if (data.success) {
        if (isGuest) {
          setPendingCalc(data); // store result
          setShowGate(true);    // show sign-in gate
        } else {
          setResult(data);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [selections, region, greenOnly, isGuest]);

  // Called after successful sign-in — reveal the pending result
  const handleSignedIn = useCallback(() => {
    setShowGate(false);
    if (pendingCalc) setResult(pendingCalc);
  }, [pendingCalc]);

  const setSel = (id, patch) => setSelections(s => ({ ...s, [id]: { ...s[id], ...patch } }));

  if (result) return <ResultsView result={result} onBack={() => setResult(null)} energyType="electricity" />;

  if (fetching) return <div style={{ textAlign: "center", padding: 50, color: C.muted }}>Loading appliances…</div>;

  return (
    <div>
      {showGate && (
        <SignInGate
          energyType="electricity"
          onSignIn={() => { setShowGate(false); onRequestSignIn(handleSignedIn); }}
          onClose={() => setShowGate(false)}
        />
      )}

      {/* Region + filters */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ color: C.light, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🏠 Your situation</div>

        <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Region</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {REGIONS.map(r => (
            <button key={r.id} onClick={() => setRegion(r.id)}
              style={{ flex: 1, padding: "8px 4px", borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: "pointer",
                border: `1px solid ${region === r.id ? C.teal : C.border}`,
                background: region === r.id ? `${C.teal}18` : C.card,
                color: region === r.id ? C.teal : C.muted, textAlign: "center" }}>
              <div>{r.flag}</div>
              <div>{r.label}</div>
              <div style={{ fontSize: 9, opacity: 0.65, marginTop: 2 }}>{r.note}</div>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: C.light, fontSize: 13, fontWeight: 600 }}>🌿 Green energy only</div>
            <div style={{ color: C.muted, fontSize: 11 }}>Filter to 100% renewable plans</div>
          </div>
          <Toggle value={greenOnly} onChange={setGreenOnly} />
        </div>
      </div>

      <div style={{ color: C.light, fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
        ⚡ Select & adjust your appliances
      </div>

      {appliances.map(a => {
        const sel = selections[a.id] || { selected: true, uses: a.default_uses_per_week };
        return (
          <div key={a.id} style={{ background: C.card, border: `1px solid ${sel.selected ? `${C.teal}33` : C.border}`, borderRadius: 12, padding: 12, marginBottom: 8, opacity: sel.selected ? 1 : 0.4, transition: "all 0.15s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div onClick={() => setSel(a.id, { selected: !sel.selected })}
                style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${sel.selected ? C.teal : C.border}`, background: sel.selected ? `${C.teal}22` : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {sel.selected && <span style={{ color: C.teal, fontSize: 13, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{a.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.light, fontSize: 13, fontWeight: 600 }}>{a.label}</div>
                <div style={{ color: C.muted, fontSize: 11 }}>{a.kwh_per_use} kWh/use · peak {a.peak_kw} kW</div>
              </div>
              {sel.selected && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setSel(a.id, { uses: Math.max(1, sel.uses - 1) })}
                    style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.border}`, background: C.card2, color: C.light, fontSize: 16, cursor: "pointer", lineHeight: 1 }}>−</button>
                  <div style={{ textAlign: "center", minWidth: 36 }}>
                    <div style={{ color: C.light, fontWeight: 700, fontSize: 14 }}>{sel.uses}×</div>
                    <div style={{ color: C.muted, fontSize: 9 }}>per week</div>
                  </div>
                  <button onClick={() => setSel(a.id, { uses: Math.min(21, sel.uses + 1) })}
                    style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.border}`, background: C.card2, color: C.light, fontSize: 16, cursor: "pointer", lineHeight: 1 }}>+</button>
                </div>
              )}
            </div>
            {sel.selected && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`, color: C.muted, fontSize: 11 }}>
                💡 {a.tip}
              </div>
            )}
          </div>
        );
      })}

      {isGuest && (
        <div style={{ background: `${C.teal}0A`, border: `1px solid ${C.teal}22`, borderRadius: 10, padding: "10px 14px", marginTop: 10, marginBottom: 4, fontSize: 12, color: C.muted, textAlign: "center" }}>
          🔒 Results require a free account — takes 30 seconds
        </div>
      )}

      <button onClick={calculate} disabled={loading}
        style={{ width: "100%", padding: "15px 0", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${C.teal}, #1A56A4)`, color: "#fff", fontSize: 15, fontWeight: 800, cursor: loading ? "default" : "pointer", marginTop: 10, boxShadow: `0 4px 20px ${C.teal}44`, opacity: loading ? 0.7 : 1 }}>
        {loading ? "Calculating…" : isGuest ? "🔒 Find My Best Plan →" : "⚡ Find My Best Plan →"}
      </button>
    </div>
  );
}

// ── Gas Appliance Calculator ───────────────────────────────────
function GasCalculator({ isGuest, onRequestSignIn }) {
  const [appliances,  setAppliances]  = useState([]);
  const [selections,  setSelections]  = useState({});
  const [region,      setRegion]      = useState("flanders");
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [fetching,    setFetching]    = useState(true);
  const [showGate,    setShowGate]    = useState(false);
  const [pendingCalc, setPendingCalc] = useState(null);

  useEffect(() => {
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

  const calculate = useCallback(async () => {
    setLoading(true);
    try {
      const inputs = Object.entries(selections)
        .filter(([, v]) => v.selected)
        .map(([id, v]) => ({ id, uses_per_week: v.uses }));
      const res = await fetch("/api/suppliers/calculate-gas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appliances: inputs, region, ttf_avg: 35 }),
      });
      const data = await res.json();
      if (data.success) {
        if (isGuest) {
          setPendingCalc(data);
          setShowGate(true);
        } else {
          setResult(data);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [selections, region, isGuest]);

  const handleSignedIn = useCallback(() => {
    setShowGate(false);
    if (pendingCalc) setResult(pendingCalc);
  }, [pendingCalc]);

  const setSel = (id, patch) => setSelections(s => ({ ...s, [id]: { ...s[id], ...patch } }));

  if (result) return <ResultsView result={result} onBack={() => setResult(null)} energyType="gas" />;
  if (fetching) return <div style={{ textAlign: "center", padding: 50, color: C.muted }}>Loading appliances…</div>;

  return (
    <div>
      {showGate && (
        <SignInGate
          energyType="gas"
          onSignIn={() => { setShowGate(false); onRequestSignIn(handleSignedIn); }}
          onClose={() => setShowGate(false)}
        />
      )}

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ color: C.light, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🏠 Your situation</div>
        <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Region</div>
        <div style={{ display: "flex", gap: 6 }}>
          {REGIONS.map(r => (
            <button key={r.id} onClick={() => setRegion(r.id)}
              style={{ flex: 1, padding: "8px 4px", borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: "pointer",
                border: `1px solid ${region === r.id ? C.orange : C.border}`,
                background: region === r.id ? `${C.orange}18` : C.card,
                color: region === r.id ? C.orange : C.muted, textAlign: "center" }}>
              <div>{r.flag}</div>
              <div>{r.label}</div>
              <div style={{ fontSize: 9, opacity: 0.65, marginTop: 2 }}>{r.note}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ color: C.light, fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
        🔥 Select & adjust your gas appliances
      </div>

      {appliances.map(a => {
        const sel = selections[a.id] || { selected: true, uses: a.default_uses_per_week };
        return (
          <div key={a.id} style={{ background: C.card, border: `1px solid ${sel.selected ? `${C.orange}33` : C.border}`, borderRadius: 12, padding: 12, marginBottom: 8, opacity: sel.selected ? 1 : 0.4, transition: "all 0.15s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div onClick={() => setSel(a.id, { selected: !sel.selected })}
                style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${sel.selected ? C.orange : C.border}`, background: sel.selected ? `${C.orange}22` : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {sel.selected && <span style={{ color: C.orange, fontSize: 13, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{a.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.light, fontSize: 13, fontWeight: 600 }}>{a.label}</div>
                <div style={{ color: C.muted, fontSize: 11 }}>{a.kwh_per_use} kWh/use</div>
              </div>
              {sel.selected && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setSel(a.id, { uses: Math.max(1, sel.uses - 1) })}
                    style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.border}`, background: C.card2, color: C.light, fontSize: 16, cursor: "pointer", lineHeight: 1 }}>−</button>
                  <div style={{ textAlign: "center", minWidth: 36 }}>
                    <div style={{ color: C.light, fontWeight: 700, fontSize: 14 }}>{sel.uses}×</div>
                    <div style={{ color: C.muted, fontSize: 9 }}>per week</div>
                  </div>
                  <button onClick={() => setSel(a.id, { uses: Math.min(21, sel.uses + 1) })}
                    style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.border}`, background: C.card2, color: C.light, fontSize: 16, cursor: "pointer", lineHeight: 1 }}>+</button>
                </div>
              )}
            </div>
            {sel.selected && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`, color: C.muted, fontSize: 11 }}>
                💡 {a.tip}
              </div>
            )}
          </div>
        );
      })}

      {isGuest && (
        <div style={{ background: `${C.orange}0A`, border: `1px solid ${C.orange}22`, borderRadius: 10, padding: "10px 14px", marginTop: 10, marginBottom: 4, fontSize: 12, color: C.muted, textAlign: "center" }}>
          🔒 Results require a free account — takes 30 seconds
        </div>
      )}

      <button onClick={calculate} disabled={loading}
        style={{ width: "100%", padding: "15px 0", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${C.orange}, #C2410C)`, color: "#fff", fontSize: 15, fontWeight: 800, cursor: loading ? "default" : "pointer", marginTop: 10, boxShadow: `0 4px 20px ${C.orange}44`, opacity: loading ? 0.7 : 1 }}>
        {loading ? "Calculating…" : isGuest ? "🔒 Find My Best Gas Plan →" : "🔥 Find My Best Gas Plan →"}
      </button>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function CalculatorPage({ energyType = "electricity", isGuest, onRequestSignIn, onSwitchType, onBack }) {
  const isMobile = window.innerWidth < 768;
  const switchType = (type) => { if (onSwitchType) onSwitchType(type); };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.light, fontFamily: "'DM Sans', system-ui, sans-serif", paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(6,11,20,0.96)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={onBack}
              style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>
              ← Back
            </button>
            <span style={{ fontSize: 18 }}>🇧🇪</span>
            <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.5px" }}>SmartPrice</span>
            <span style={{ fontSize: 10, color: C.muted, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>Calculator</span>
          </div>
          {!isGuest && (
            <span style={{ fontSize: 11, color: C.green, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 20, padding: "3px 10px", fontWeight: 700 }}>✓ Signed in</span>
          )}
        </div>

        {/* Energy type toggle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 16px 12px" }}>
          <div style={{ display: "flex", background: "rgba(0,0,0,0.3)", borderRadius: 14, padding: 4, gap: 4, border: `1px solid ${C.border}` }}>
            <button onClick={() => switchType("electricity")}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700,
                border: energyType === "electricity" ? "1px solid rgba(0,230,180,0.4)" : "1px solid transparent",
                background: energyType === "electricity" ? "linear-gradient(135deg,#0A2E2A,#0D3D35)" : "transparent",
                color: energyType === "electricity" ? "#00E5B4" : C.muted,
                boxShadow: energyType === "electricity" ? "0 0 16px rgba(0,200,150,0.2)" : "none" }}>
              <span style={{ filter: energyType === "electricity" ? "drop-shadow(0 0 5px rgba(0,230,180,0.8))" : "none" }}>⚡</span>
              Electricity
            </button>
            <button onClick={() => switchType("gas")}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700,
                border: energyType === "gas" ? "1px solid rgba(249,115,22,0.4)" : "1px solid transparent",
                background: energyType === "gas" ? "linear-gradient(135deg,#2E1A08,#3D220A)" : "transparent",
                color: energyType === "gas" ? "#FF8C42" : C.muted,
                boxShadow: energyType === "gas" ? "0 0 16px rgba(249,115,22,0.2)" : "none" }}>
              <span style={{ filter: energyType === "gas" ? "drop-shadow(0 0 5px rgba(255,140,66,0.8))" : "none" }}>🔥</span>
              Gas
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px" }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: "0 0 6px", fontSize: isMobile ? 22 : 26, fontWeight: 900, letterSpacing: "-0.5px" }}>
            {energyType === "gas" ? "🔥 Gas Plan Calculator" : "⚡ Electricity Plan Calculator"}
          </h1>
          <p style={{ margin: 0, color: C.muted, fontSize: 14, lineHeight: 1.6 }}>
            {energyType === "gas"
              ? "Tell us what gas appliances you use → we estimate your consumption → rank all 7 Belgian suppliers for you."
              : "Tell us what appliances you use → we estimate your consumption → rank all 7 Belgian suppliers for you."
            }
          </p>
        </div>

        {energyType === "electricity"
          ? <ElecCalculator isGuest={isGuest} onRequestSignIn={onRequestSignIn} />
          : <GasCalculator  isGuest={isGuest} onRequestSignIn={onRequestSignIn} />
        }
      </div>
    </div>
  );
}