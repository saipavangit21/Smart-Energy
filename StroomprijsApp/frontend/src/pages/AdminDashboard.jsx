import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "";
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || "";

// ── Palette ──────────────────────────────────────────────────
const C = {
  bg:      "#060B14",
  card:    "#0D1626",
  border:  "#1E2D3D",
  teal:    "#0D9488",
  green:   "#00C896",
  orange:  "#F97316",
  purple:  "#A78BFA",
  yellow:  "#F59E0B",
  red:     "#EF4444",
  light:   "#E2E8F0",
  muted:   "#4A6070",
  dim:     "#1E2D3D",
};

// ── Helpers ───────────────────────────────────────────────────
function fmt(n) { return Number(n).toLocaleString(); }
function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }

// ── Components ────────────────────────────────────────────────
function StatCard({ label, value, sub, color = C.teal, icon }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: "22px 24px",
      borderLeft: `3px solid ${color}`,
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ fontSize: 11, color: C.muted, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "1.5px", display: "flex",
        alignItems: "center", gap: 6 }}>
        {icon && <span>{icon}</span>}{label}
      </div>
      <div style={{ fontSize: 36, fontWeight: 900, color, fontFamily: "monospace",
        letterSpacing: "-1px" }}>
        {value ?? "—"}
      </div>
      {sub && <div style={{ fontSize: 12, color: C.muted }}>{sub}</div>}
    </div>
  );
}

function EventRow({ event, total, unique_sessions, logged_in_users }) {
  const eventColors = {
    guest_session:          C.muted,
    page_view:              C.teal,
    calculator_start:       C.yellow,
    calculator_start_gas:   C.orange,
    login_attempt_email:    C.green,
    login_attempt_google:   C.purple,
    register_email:         C.green,
  };
  const color = eventColors[event] || C.light;
  const maxVal = parseInt(total);

  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${C.dim}` }}>
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%",
            background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: C.light, fontWeight: 600 }}>
            {event.replace(/_/g, " ")}
          </span>
        </div>
        <div style={{ display: "flex", gap: 20, fontSize: 12, color: C.muted }}>
          <span><span style={{ color: C.light, fontWeight: 700 }}>{fmt(total)}</span> total</span>
          <span><span style={{ color, fontWeight: 700 }}>{fmt(unique_sessions)}</span> unique</span>
          {parseInt(logged_in_users) > 0 &&
            <span><span style={{ color: C.green, fontWeight: 700 }}>{fmt(logged_in_users)}</span> logged in</span>}
        </div>
      </div>
      <div style={{ height: 4, background: C.dim, borderRadius: 2 }}>
        <div style={{ height: "100%", width: `${Math.min(pct(maxVal, 50), 100)}%`,
          background: color, borderRadius: 2,
          transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
    </div>
  );
}

function DailyChart({ data }) {
  if (!data?.length) return (
    <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontSize: 13 }}>
      No daily data yet
    </div>
  );

  // Group by day
  const byDay = {};
  data.forEach(({ day, event, count }) => {
    const d = day.split("T")[0];
    if (!byDay[d]) byDay[d] = {};
    byDay[d][event] = (byDay[d][event] || 0) + parseInt(count);
  });

  const days = Object.keys(byDay).sort().slice(-7);
  const maxTotal = Math.max(...days.map(d => Object.values(byDay[d]).reduce((a,b) => a+b, 0)));

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120, padding: "0 4px" }}>
      {days.map(day => {
        const total = Object.values(byDay[day]).reduce((a,b) => a+b, 0);
        const h = maxTotal > 0 ? Math.max((total / maxTotal) * 100, 4) : 4;
        const label = new Date(day).toLocaleDateString("en-GB", { month: "short", day: "numeric" });
        return (
          <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", gap: 4 }}>
            <div style={{ fontSize: 10, color: C.muted }}>{total}</div>
            <div style={{ width: "100%", height: `${h}%`, background:
              `linear-gradient(180deg, ${C.teal}, ${C.teal}88)`,
              borderRadius: "4px 4px 0 0", minHeight: 4 }} />
            <div style={{ fontSize: 9, color: C.muted, textAlign: "center" }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}

function FunnelBar({ label, value, max, color }) {
  const w = max > 0 ? pct(parseInt(value), max) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between",
        marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: C.light }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{fmt(value)}</span>
      </div>
      <div style={{ height: 6, background: C.dim, borderRadius: 3 }}>
        <div style={{ height: "100%", width: `${w}%`, background: color,
          borderRadius: 3, transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────
export default function AdminDashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [days,    setDays]    = useState(7);
  const [secret,  setSecret]  = useState(ADMIN_SECRET);
  const [authed,  setAuthed]  = useState(!!ADMIN_SECRET);
  const [input,   setInput]   = useState("");

  const fetch_ = useCallback(async (d = days, s = secret) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/analytics?days=${d}`,
        { headers: { "x-admin-secret": s } }
      );
      if (res.status === 401) { setError("Invalid admin secret"); setLoading(false); return; }
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setData(json);
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [days, secret]);

  useEffect(() => { if (authed) fetch_(days, secret); }, [authed, days]);

  // ── Login gate ──────────────────────────────────────────────
  if (!authed) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 20, padding: "40px 36px", width: 360, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: C.light, marginBottom: 6 }}>
          Admin Access
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
          SmartPrice Analytics Dashboard
        </div>
        <input
          type="password"
          placeholder="Admin secret..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { setSecret(input); setAuthed(true); }}}
          style={{ width: "100%", padding: "12px 16px", borderRadius: 10, fontSize: 14,
            background: C.bg, border: `1px solid ${C.border}`, color: C.light,
            outline: "none", boxSizing: "border-box", marginBottom: 12 }}
        />
        <button onClick={() => { setSecret(input); setAuthed(true); }}
          style={{ width: "100%", padding: "12px", borderRadius: 10, fontSize: 14,
            fontWeight: 700, background: C.teal, border: "none",
            color: "#fff", cursor: "pointer" }}>
          Enter Dashboard →
        </button>
      </div>
    </div>
  );

  const users    = data?.total_registered_users;
  const summary  = data?.summary || [];
  const funnel   = data?.calculator_funnel || [];
  const daily    = data?.daily_breakdown || [];
  const gvl      = data?.guest_vs_loggedin || [];

  const totalEvents   = summary.reduce((a, r) => a + parseInt(r.total), 0);
  const guestSessions = gvl.find(r => r.method === "guest")?.sessions || 0;
  const loggedSessions= gvl.find(r => r.method === "logged_in")?.sessions || 0;
  const calcStarts    = funnel.find(r => r.event === "calculator_start")?.total || 0;
  const calcGas       = funnel.find(r => r.event === "calculator_start_gas")?.total || 0;
  const registrations = funnel.find(r => r.event === "register_email")?.total || 0;
  const funnelMax     = Math.max(parseInt(calcStarts||0), parseInt(calcGas||0),
                          parseInt(registrations||0), 1);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.light,
      fontFamily: "'DM Sans', system-ui, sans-serif", paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "16px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "rgba(6,11,20,0.95)", backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>🇧🇪</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.5px" }}>
              SmartPrice
            </div>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "1.5px" }}>
              Admin Analytics
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {[1, 7, 30, 90].map(d => (
            <button key={d} onClick={() => { setDays(d); fetch_(d, secret); }}
              style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12,
                fontWeight: 700, cursor: "pointer", border: "none",
                background: days === d ? C.teal : C.card,
                color: days === d ? "#fff" : C.muted }}>
              {d}d
            </button>
          ))}
          <button onClick={() => fetch_(days, secret)}
            style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12,
              fontWeight: 700, cursor: "pointer",
              background: "transparent", border: `1px solid ${C.border}`, color: C.muted }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 12, padding: "12px 18px", color: "#F87171", fontSize: 13, marginBottom: 24 }}>
            ⚠ {error}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.muted, fontSize: 14 }}>
            Loading analytics...
          </div>
        )}

        {!loading && data && (<>

          {/* Top stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16, marginBottom: 28 }}>
            <StatCard icon="👥" label="Total Users" value={fmt(users?.total)}
              sub={`${fmt(users?.google_users)} Google · ${fmt(users?.email_users)} email`}
              color={C.green} />
            <StatCard icon="📊" label="Total Events" value={fmt(totalEvents)}
              sub={`Last ${days} days`} color={C.teal} />
            <StatCard icon="👀" label="Guest Sessions" value={fmt(guestSessions)}
              sub="Browsing without login" color={C.muted} />
            <StatCard icon="🔐" label="Logged-in Sessions" value={fmt(loggedSessions)}
              sub="Authenticated users" color={C.purple} />
          </div>

          {/* Middle row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>

            {/* Events breakdown */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 16, padding: "24px" }}>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 16 }}>
                Event Breakdown
              </div>
              {summary.length === 0 ? (
                <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: "20px 0" }}>
                  No events recorded yet
                </div>
              ) : (
                summary.map(row => <EventRow key={row.event} {...row} />)
              )}
            </div>

            {/* Calculator funnel */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 16, padding: "24px" }}>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 20 }}>
                Conversion Funnel
              </div>
              <FunnelBar label="Electricity calculator starts" value={calcStarts || 0}
                max={funnelMax} color={C.yellow} />
              <FunnelBar label="Gas calculator starts" value={calcGas || 0}
                max={funnelMax} color={C.orange} />
              <FunnelBar label="Email registrations" value={registrations || 0}
                max={funnelMax} color={C.green} />

              <div style={{ marginTop: 20, padding: "14px 16px",
                background: "rgba(255,255,255,0.02)", borderRadius: 10,
                border: `1px solid ${C.dim}` }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                  Auth methods (last {days}d)
                </div>
                {data.auth_methods?.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.muted }}>No auth events yet</div>
                ) : (
                  data.auth_methods?.map(r => (
                    <div key={r.method} style={{ display: "flex", justifyContent: "space-between",
                      fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: C.light }}>{r.method}</span>
                      <span style={{ color: C.teal, fontWeight: 700 }}>{r.attempts} attempts</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Daily chart */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 16, padding: "24px", marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 20 }}>
              Daily Activity (last {days} days)
            </div>
            <DailyChart data={daily} />
          </div>

          {/* User breakdown */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 16, padding: "24px" }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 16 }}>
              Registered Users Breakdown
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {[
                { label: "Total", value: users?.total, color: C.light },
                { label: "Google OAuth", value: users?.google_users, color: C.purple },
                { label: "Email", value: users?.email_users, color: C.teal },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign: "center", padding: "20px 0",
                  background: "rgba(255,255,255,0.02)", borderRadius: 12,
                  border: `1px solid ${C.dim}` }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color,
                    fontFamily: "monospace" }}>{fmt(value)}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: C.muted }}>
            Generated {new Date(data.generated_at).toLocaleString("en-GB")} ·
            Period: last {data.period_days} days
          </div>
        </>)}
      </div>
    </div>
  );
}