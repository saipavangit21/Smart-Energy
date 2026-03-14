/**
 * pages/AdminDashboard.jsx
 * Admin dashboard — analytics + goal tracker + registered user list
 */

import { useState, useEffect } from "react";

const API   = import.meta.env.VITE_API_URL  || "https://smart-energy-production-aef3.up.railway.app";
const SECRET = import.meta.env.VITE_ADMIN_SECRET || "";

const C = {
  bg:      "#060B14",
  card:    "#0D1626",
  border:  "rgba(255,255,255,0.08)",
  teal:    "#0D9488",
  green:   "#059669",
  yellow:  "#D97706",
  red:     "#DC2626",
  blue:    "#1A56A4",
  text:    "#E2E8F0",
  muted:   "#64748B",
};

// ── Goals config ─────────────────────────────────────────────────────────────
const GOALS = [
  {
    id: "users_10",    label: "First 10 users",          target: 10,   metric: "users",      reward: "Validate the idea",           supplier: null,
  },
  {
    id: "users_50",    label: "50 registered users",     target: 50,   metric: "users",      reward: "Ready to email Bolt & Mega",   supplier: "Bolt · Mega",
  },
  {
    id: "users_100",   label: "100 registered users",    target: 100,  metric: "users",      reward: "Email all suppliers",          supplier: "All 7",
  },
  {
    id: "calc_50",     label: "50 calculator runs",      target: 50,   metric: "calculator", reward: "Show conversion data to suppliers", supplier: "All 7",
  },
  {
    id: "visitors_500",label: "500 monthly visitors",    target: 500,  metric: "pageviews",  reward: "Serious outreach with numbers", supplier: "All 7",
  },
  {
    id: "users_500",   label: "500 registered users",    target: 500,  metric: "users",      reward: "Negotiate revenue share deals", supplier: "All 7",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt   = v => (v == null ? "—" : Number(v).toLocaleString());
const pct   = (v, t) => Math.min(100, Math.round((v / t) * 100));
const since = d => {
  const diff = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "yesterday";
  return `${diff}d ago`;
};

function headers() {
  return { "Content-Type": "application/json", "x-admin-secret": SECRET };
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 20px", flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || C.text }}>{fmt(value)}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function GoalBar({ goal, current }) {
  const val  = current[goal.metric] || 0;
  const done = val >= goal.target;
  const p    = pct(val, goal.target);

  return (
    <div style={{ background: C.card, border: `1px solid ${done ? C.teal : C.border}`, borderRadius: 14, padding: "16px 20px", marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: done ? C.teal : C.text }}>{goal.label}</span>
            {done && <span style={{ fontSize: 11, background: C.teal, color: "#fff", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>✓ DONE</span>}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>🎯 {goal.reward}</div>
          {goal.supplier && <div style={{ fontSize: 11, color: C.yellow, marginTop: 2 }}>📧 Unlock supplier outreach: {goal.supplier}</div>}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: done ? C.teal : C.text }}>{fmt(val)}</div>
          <div style={{ fontSize: 11, color: C.muted }}>of {fmt(goal.target)}</div>
        </div>
      </div>
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 99, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${p}%`, height: "100%", background: done ? C.teal : `linear-gradient(90deg, ${C.blue}, ${C.teal})`, borderRadius: 99, transition: "width 0.6s ease" }} />
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 6, textAlign: "right" }}>{p}% · {done ? "Goal reached!" : `${fmt(goal.target - val)} to go`}</div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [input,     setInput]     = useState("");
  const [authed,    setAuthed]    = useState(!!SECRET);
  const [error,     setError]     = useState("");
  const [tab,       setTab]       = useState("goals");   // goals | analytics | users
  const [period,    setPeriod]    = useState(30);
  const [analytics, setAnalytics] = useState(null);
  const [users,     setUsers]     = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [copied,    setCopied]    = useState("");
  const [userSearch, setUserSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [aRes, uRes] = await Promise.all([
        fetch(`${API}/api/admin/analytics?days=${period}`, { headers: headers() }),
        fetch(`${API}/api/admin/users`,                    { headers: headers() }),
      ]);
      const [aData, uData] = await Promise.all([aRes.json(), uRes.json()]);
      if (!aData.success) throw new Error(aData.error);
      setAnalytics(aData);
      if (uData.success) setUsers(uData.users);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (authed) load(); }, [authed, period]);

  const tryAuth = () => {
    if (input.trim()) { setAuthed(true); } else { setError("Enter the admin secret"); }
  };

  // ── Derived metrics for goal tracker ────────────────────────────────────────
  const totalUsers   = Number(analytics?.total_registered_users?.total || 0);
  const calcRuns     = analytics?.summary?.find(e => e.event === "calculator_start")?.total || 0;
  const calcGasRuns  = analytics?.summary?.find(e => e.event === "calculator_start_gas")?.total || 0;
  const pageViews    = analytics?.summary?.find(e => e.event === "page_view")?.total || 0;

  const goalMetrics = {
    users:      totalUsers,
    calculator: Number(calcRuns) + Number(calcGasRuns),
    pageviews:  Number(pageViews),
  };

  // ── Next unlocked supplier ───────────────────────────────────────────────────
  const nextGoal = GOALS.find(g => goalMetrics[g.metric] < g.target);

  // ── Copy emails helper ───────────────────────────────────────────────────────
  const copyEmails = () => {
    const emails = (users || []).filter(u => u.email).map(u => u.email).join(", ");
    if (!emails) return;
    navigator.clipboard.writeText(emails);
    setCopied("emails");
    setTimeout(() => setCopied(""), 2000);
  };

  const filteredUsers = (users || []).filter(u => {
    const q = userSearch.toLowerCase();
    return !q || (u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
  });

  // ── Password gate ─────────────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "40px 44px", width: "100%", maxWidth: 400 }}>
        <div style={{ fontSize: 32, textAlign: "center", marginBottom: 8 }}>🔐</div>
        <h2 style={{ color: C.text, textAlign: "center", margin: "0 0 24px", fontSize: 22 }}>Admin Dashboard</h2>
        <input
          type="password" placeholder="Admin secret"
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && tryAuth()}
          style={{ width: "100%", padding: "12px 16px", borderRadius: 10, fontSize: 15, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, color: C.text, outline: "none", boxSizing: "border-box", marginBottom: 12 }}
        />
        {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>{error}</div>}
        <button onClick={tryAuth} style={{ width: "100%", padding: "12px", borderRadius: 10, background: C.teal, color: "#fff", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer" }}>
          Enter
        </button>
      </div>
    </div>
  );

  // ── Main dashboard ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif", color: C.text }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🇧🇪</span>
          <span style={{ fontWeight: 800, fontSize: 18 }}>SmartPrice</span>
          <span style={{ fontSize: 13, color: C.muted, background: "rgba(255,255,255,0.06)", padding: "3px 10px", borderRadius: 20 }}>Admin</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={period} onChange={e => setPeriod(Number(e.target.value))}
            style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "6px 10px", fontSize: 13, cursor: "pointer" }}
          >
            {[7, 14, 30, 90].map(d => <option key={d} value={d}>Last {d}d</option>)}
          </select>
          <button onClick={load} style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>
            {loading ? "↻" : "↻ Refresh"}
          </button>
          <a href="/" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "6px 12px", fontSize: 13, textDecoration: "none" }}>← Site</a>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px" }}>

        {error && <div style={{ background: "rgba(220,38,38,0.1)", border: `1px solid ${C.red}`, borderRadius: 10, padding: "10px 16px", marginBottom: 20, fontSize: 13, color: C.red }}>⚠️ {error}</div>}

        {/* Stat cards */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
          <StatCard label="Registered Users" value={totalUsers} sub={`${fmt(analytics?.total_registered_users?.google_users)} Google · ${fmt(analytics?.total_registered_users?.email_users)} email`} color={C.teal} />
          <StatCard label="Calculator Runs" value={Number(calcRuns) + Number(calcGasRuns)} sub={`⚡ ${fmt(calcRuns)} elec · 🔥 ${fmt(calcGasRuns)} gas`} color={C.yellow} />
          <StatCard label="Page Views" value={pageViews} sub={`last ${period} days`} color={C.blue} />
          <StatCard label="Users with Email" value={(users || []).filter(u => u.email).length} sub="can receive alerts" color={C.green} />
        </div>

        {/* Next goal banner */}
        {nextGoal && (
          <div style={{ background: "rgba(13,148,136,0.08)", border: `1px solid rgba(13,148,136,0.25)`, borderRadius: 14, padding: "14px 20px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: C.teal, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Next Milestone</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{nextGoal.label} — {nextGoal.reward}</div>
              {nextGoal.supplier && <div style={{ fontSize: 12, color: C.yellow, marginTop: 2 }}>📧 Unlocks outreach to: {nextGoal.supplier}</div>}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.teal }}>
              {fmt(goalMetrics[nextGoal.metric])} / {fmt(nextGoal.target)}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: 4, marginBottom: 24, width: "fit-content" }}>
          {[
            { id: "goals",     label: "🎯 Goals" },
            { id: "analytics", label: "📊 Analytics" },
            { id: "users",     label: `👥 Users (${users?.length || 0})` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "8px 18px", borderRadius: 9, fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", transition: "all 0.2s",
              background: tab === t.id ? "rgba(255,255,255,0.1)" : "transparent",
              color: tab === t.id ? C.text : C.muted,
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── GOALS TAB ── */}
        {tab === "goals" && (
          <div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
              Hit each milestone to unlock supplier outreach. Don't email suppliers before you have real numbers.
            </div>
            {GOALS.map(g => <GoalBar key={g.id} goal={g} current={goalMetrics} />)}
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {tab === "analytics" && (
          <div>
            {/* Event breakdown */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Event Breakdown</div>
              {(analytics?.summary || []).length === 0
                ? <div style={{ color: C.muted, fontSize: 13 }}>No events yet in this period.</div>
                : (analytics?.summary || []).map(e => {
                  const max = Math.max(...(analytics?.summary || []).map(x => Number(x.total)));
                  const w   = Math.round((Number(e.total) / max) * 100);
                  return (
                    <div key={e.event} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: C.text }}>{e.event}</span>
                        <span style={{ color: C.muted }}>{fmt(e.total)} total · {fmt(e.unique_sessions)} sessions</span>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 99, height: 6 }}>
                        <div style={{ width: `${w}%`, height: "100%", background: C.teal, borderRadius: 99 }} />
                      </div>
                    </div>
                  );
                })
              }
            </div>

            {/* Calculator funnel */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 24px" }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Calculator Funnel</div>
              {(analytics?.calculator_funnel || []).length === 0
                ? <div style={{ color: C.muted, fontSize: 13 }}>No calculator data yet. Run the calculator to start tracking.</div>
                : (analytics?.calculator_funnel || []).map((e, i) => (
                  <div key={e.event} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < (analytics.calculator_funnel.length - 1) ? `1px solid ${C.border}` : "none" }}>
                    <span style={{ fontSize: 13, color: C.muted }}>Step {i + 1}: {e.event}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{fmt(e.unique_sessions)} users</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {tab === "users" && (
          <div>
            {/* Actions bar */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
              <input
                placeholder="Search name or email..."
                value={userSearch} onChange={e => setUserSearch(e.target.value)}
                style={{ flex: 1, minWidth: 200, padding: "9px 14px", borderRadius: 10, fontSize: 14, background: C.card, border: `1px solid ${C.border}`, color: C.text, outline: "none" }}
              />
              <button onClick={copyEmails} style={{ padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", background: copied === "emails" ? C.green : C.teal, color: "#fff", transition: "background 0.2s" }}>
                {copied === "emails" ? "✓ Copied!" : `📋 Copy ${(users || []).filter(u => u.email).length} emails`}
              </button>
            </div>

            {/* User table */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
              {/* Table header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 80px 80px 90px", padding: "10px 20px", background: "rgba(255,255,255,0.04)", borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>
                <span>Name</span><span>Email</span><span>Auth</span><span>Joined</span><span style={{ textAlign: "right" }}>Actions</span>
              </div>

              {filteredUsers.length === 0
                ? <div style={{ padding: "32px 20px", textAlign: "center", color: C.muted, fontSize: 14 }}>No users found.</div>
                : filteredUsers.map((u, i) => (
                  <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 80px 80px 90px", padding: "12px 20px", borderBottom: i < filteredUsers.length - 1 ? `1px solid ${C.border}` : "none", alignItems: "center", fontSize: 13 }}>
                    {/* Name */}
                    <span style={{ fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name || "—"}</span>

                    {/* Email */}
                    <span style={{ color: u.email ? C.muted : "rgba(255,255,255,0.2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: u.email ? "monospace" : "inherit", fontSize: u.email ? 12 : 13 }}>
                      {u.email || "no email"}
                    </span>

                    {/* Auth method */}
                    <span>
                      {u.google    && <span style={{ fontSize: 11, background: "rgba(26,86,164,0.3)", color: "#7EB3FF", borderRadius: 6, padding: "2px 7px", marginRight: 3 }}>G</span>}
                      {u.email_auth && <span style={{ fontSize: 11, background: "rgba(13,148,136,0.3)", color: C.teal,   borderRadius: 6, padding: "2px 7px" }}>✉</span>}
                    </span>

                    {/* Joined */}
                    <span style={{ color: C.muted, fontSize: 12 }}>{since(u.created_at)}</span>

                    {/* Copy email */}
                    <div style={{ textAlign: "right" }}>
                      {u.email && (
                        <button
                          onClick={() => { navigator.clipboard.writeText(u.email); setCopied(u.id); setTimeout(() => setCopied(""), 1500); }}
                          style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: copied === u.id ? C.green : "transparent", color: copied === u.id ? "#fff" : C.muted, cursor: "pointer", transition: "all 0.2s" }}
                        >
                          {copied === u.id ? "✓" : "Copy"}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              }
            </div>

            <div style={{ fontSize: 12, color: C.muted, marginTop: 12, textAlign: "center" }}>
              {(users || []).filter(u => u.email).length} of {users?.length || 0} users have email · {(users || []).filter(u => u.google).length} Google · {(users || []).filter(u => u.email_auth).length} email auth
            </div>
          </div>
        )}

      </div>
    </div>
  );
}