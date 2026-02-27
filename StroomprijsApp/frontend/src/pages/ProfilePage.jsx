/**
 * pages/ProfilePage.jsx
 * User profile: preferences, alerts, linked services
 */

import { useState } from "react";
import { useAuth }  from "../context/AuthContext";
import { SUPPLIERS } from "../utils/priceUtils";

const C = {
  navy:  "#0D1B3E", blue: "#1A56A4", teal: "#0D9488",
  white: "#FFFFFF", green: "#059669", red: "#DC2626", amber: "#F59E0B",
  gray:  "#64748B", card: "rgba(255,255,255,0.03)",
};

function Section({ title, children }) {
  return (
    <div style={{
      background: C.card, border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 18, padding: 24, marginBottom: 20,
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.white, marginBottom: 20 }}>{title}</div>
      {children}
    </div>
  );
}

function SaveButton({ onClick, loading, saved }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      marginTop: 20, padding: "10px 28px", borderRadius: 10, fontSize: 14,
      fontWeight: 700, border: "none", cursor: "pointer",
      background: saved ? C.green : C.teal, color: C.white, transition: "all 0.3s",
    }}>
      {loading ? "Saving…" : saved ? "✅ Saved!" : "Save Changes"}
    </button>
  );
}

export default function ProfilePage({ onBack }) {
  const { user, logout, updatePreferences } = useAuth();
  const prefs = user?.preferences || {};

  const [supplier,   setSupplier]   = useState(prefs.supplier || "Bolt Energy");
  const [threshold,  setThreshold]  = useState(prefs.alertThreshold || 80);
  const [alertOn,    setAlertOn]    = useState(prefs.alertsEnabled || false);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updatePreferences({ supplier, alertThreshold: threshold, alertsEnabled: alertOn });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 20% 20%, #0A1628 0%, #060B14 60%, #0A0F1A 100%)",
      fontFamily: "'DM Sans', system-ui, sans-serif",
      color: C.white, padding: "28px 18px",
    }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
          <button onClick={onBack} style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: "8px 14px", color: C.white,
            fontSize: 13, cursor: "pointer", fontWeight: 600,
          }}>← Back</button>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>My Profile</div>
            <div style={{ fontSize: 13, color: C.gray }}>{user?.email}</div>
          </div>
        </div>

        {/* Account info */}
        <Section title="👤 Account">
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 11, color: C.gray, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Name</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{user?.name || "—"}</div>
            </div>
            <div style={{ flex: 2, minWidth: 200 }}>
              <div style={{ fontSize: 11, color: C.gray, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Email</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{user?.email}</div>
            </div>
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{
              padding: "8px 14px", borderRadius: 10, fontSize: 12,
              background: user?.providers?.google ? "rgba(5,150,105,0.1)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${user?.providers?.google ? "rgba(5,150,105,0.3)" : "rgba(255,255,255,0.08)"}`,
              color: user?.providers?.google ? C.green : C.gray,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google · {user?.providers?.google ? "Connected" : "Not connected"}
            </div>
          </div>
        </Section>

        {/* Supplier preference */}
        <Section title="⚡ Electricity Supplier">
          <div style={{ fontSize: 13, color: C.gray, marginBottom: 16 }}>
            Your supplier — prices on the dashboard will include their tariff formula
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {SUPPLIERS.map(s => (
              <button key={s.name} onClick={() => setSupplier(s.name)} style={{
                padding: "8px 16px", borderRadius: 30, fontSize: 13, fontWeight: 600, cursor: "pointer",
                border:      supplier === s.name ? `1px solid ${s.color}` : "1px solid rgba(255,255,255,0.1)",
                background:  supplier === s.name ? `${s.color}22` : "rgba(255,255,255,0.03)",
                color:       supplier === s.name ? s.color : C.gray,
                transition: "all 0.2s",
              }}>{s.name}</button>
            ))}
          </div>
        </Section>

        {/* Price alerts */}
        <Section title="🔔 Price Alerts">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Alert me when price drops below threshold</div>
              <div style={{ fontSize: 12, color: C.gray, marginTop: 3 }}>
                In-app banner now · Push notifications in Phase 2
              </div>
            </div>
            <button onClick={() => setAlertOn(a => !a)} style={{
              padding: "8px 20px", borderRadius: 30, fontWeight: 700, fontSize: 13,
              border: "none", cursor: "pointer",
              background: alertOn ? "rgba(5,150,105,0.2)" : "rgba(255,255,255,0.06)",
              color: alertOn ? C.green : C.gray,
            }}>
              {alertOn ? "🟢 On" : "⚫ Off"}
            </button>
          </div>
          <div style={{ fontSize: 13, color: "#aaa", marginBottom: 10 }}>
            Threshold: <strong style={{ color: C.amber }}>€{threshold}/MWh</strong>
          </div>
          <input type="range" min={-20} max={200} step={5} value={threshold}
            onChange={e => setThreshold(+e.target.value)}
            style={{ width: "100%", accentColor: C.amber, cursor: "pointer" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#445", marginTop: 4 }}>
            <span>€-20 (negative)</span><span>€200 (peak)</span>
          </div>
        </Section>



        {/* Save + logout */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <SaveButton onClick={save} loading={saving} saved={saved} />
          <button onClick={logout} style={{
            padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600,
            border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)",
            color: C.red, cursor: "pointer",
          }}>
            Sign Out
          </button>
        </div>

        {/* Delete account */}
        <Section title="⚠️ Danger Zone">
          <div style={{ fontSize: 13, color: C.gray, marginBottom: 16 }}>
            Permanently delete your account and all associated data. This cannot be undone.
          </div>
          <button
            onClick={async () => {
              if (!window.confirm("Are you sure? This will permanently delete your account and all data. This cannot be undone.")) return;
              try {
                const token = localStorage.getItem("access_token");
                const res = await fetch("/auth/delete-account", {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                  localStorage.clear();
                  window.location.replace("/");
                } else {
                  alert("Failed to delete account. Please try again.");
                }
              } catch (e) {
                alert("Failed to delete account. Please try again.");
              }
            }}
            style={{
              padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600,
              border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.08)",
              color: C.red, cursor: "pointer",
            }}
          >
            🗑️ Delete My Account
          </button>
        </Section>

        {/* Privacy & legal */}
        <div style={{ textAlign: "center", fontSize: 12, color: "#334", paddingBottom: 32 }}>
          <span
            onClick={() => window.dispatchEvent(new CustomEvent("showPrivacy"))}
            style={{ color: "#445", cursor: "pointer", textDecoration: "underline" }}
          >
            Privacy Policy
          </span>
          {" · "}
          <span style={{ color: "#334" }}>GDPR Compliant · Data stored in EU</span>
        </div>

      </div>
    </div>
  );
}