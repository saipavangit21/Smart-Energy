/**
 * pages/ResetPasswordPage.jsx
 * Landing page for the /auth/forgot-password email link: /reset-password?token=...
 */
import { useState } from "react";
import { useColors, useTheme } from "../context/ThemeContext";

const API = import.meta.env.VITE_API_URL || "https://api.smartprice.be";

export default function ResetPasswordPage({ onDone }) {
  const C       = useColors();
  const { theme } = useTheme();
  const isDark  = theme === "dark";

  const params  = new URLSearchParams(window.location.search);
  const token   = params.get("token");

  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);

  const bg = isDark
    ? "radial-gradient(ellipse at 20% 10%, #0F1E38 0%, #060B14 55%, #0B0F1A 100%)"
    : "linear-gradient(135deg, #F0FDF4 0%, #F8FAFC 60%, #EFF6FF 100%)";
  const cardBg     = isDark ? "#0D1626" : C.card;
  const cardBorder = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)";

  const submit = async () => {
    setError("");
    if (!password || password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirm)              { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/reset-password`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, newPassword: password }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error || "Something went wrong"); return; }
      setDone(true);
    } catch {
      setError("Cannot reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', system-ui, sans-serif", padding: "20px 16px",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⚡</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: C.text, letterSpacing: "-1px" }}>SmartPrice</h1>
        </div>

        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 22, padding: "32px 36px" }}>
          {!token ? (
            <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>
              This reset link is missing its token. Please use the link from your email, or request a new one.
              <div style={{ marginTop: 20 }}>
                <a href="/" style={{ color: C.green, fontWeight: 700, textDecoration: "none" }}>← Back to SmartPrice</a>
              </div>
            </div>
          ) : done ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 8 }}>Password reset</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 20 }}>
                You're all set — sign in with your new password.
              </div>
              <a href="/" style={{
                display: "inline-block", padding: "12px 28px", borderRadius: 50,
                background: "linear-gradient(135deg, #059669, #0D9488)", color: "#fff",
                fontWeight: 700, fontSize: 14, textDecoration: "none",
              }}>
                Go to sign in →
              </a>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 18 }}>Choose a new password</div>

              {error && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.28)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#EF4444" }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  New password
                </label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters" autoComplete="new-password"
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 12, fontSize: 14, background: C.inputBg, border: `1.5px solid ${C.border}`, color: C.text, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Confirm password
                </label>
                <input
                  type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password" autoComplete="new-password"
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 12, fontSize: 14, background: C.inputBg, border: `1.5px solid ${C.border}`, color: C.text, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                />
              </div>

              <button
                onClick={submit} disabled={loading}
                style={{
                  width: "100%", padding: "13px 0", borderRadius: 12, fontSize: 15, fontWeight: 700,
                  border: "none", cursor: loading ? "not-allowed" : "pointer",
                  background: loading ? "rgba(5,150,105,0.5)" : "linear-gradient(135deg, #059669, #0D9488)",
                  color: "#fff",
                }}
              >
                {loading ? "Please wait…" : "Reset password →"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}