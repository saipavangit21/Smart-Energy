/**
 * pages/AuthPage.jsx
 * Login + Register — email is optional, only asked when enabling alerts
 * Register: name + password only
 * Login: name OR email + password
 */

import { useState } from "react";
import { useAuth }  from "../context/AuthContext";

const C = {
  teal:  "#0D9488",
  blue:  "#1A56A4",
  white: "#FFFFFF",
  error: "#EF4444",
  green: "#059669",
};

function Input({ label, type = "text", value, onChange, placeholder, autoComplete, hint }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#CBD5E1", marginBottom: 7 }}>
        {label}
      </label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} autoComplete={autoComplete}
        style={{
          width: "100%", padding: "12px 16px", borderRadius: 10, fontSize: 15,
          background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
          color: C.white, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
        }}
        onFocus={e => e.target.style.borderColor = C.teal}
        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
      />
      {hint && <div style={{ fontSize: 11, color: "#475569", marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

export default function AuthPage({ onBack, onSkip, reason }) {
  const { login, register } = useAuth();
  const [mode,      setMode]      = useState("login");
  const [name,      setName]      = useState("");
  const [loginId,   setLoginId]   = useState(""); // email or name for login
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);

  const reset = () => setError("");

  const handleSubmit = async () => {
    reset();

    if (mode === "register") {
      if (!name.trim())        { setError("Please enter your name"); return; }
      if (!password)           { setError("Please enter a password"); return; }
      if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
      if (password !== confirm) { setError("Passwords do not match"); return; }
    } else {
      if (!loginId.trim()) { setError("Please enter your name or email"); return; }
      if (!password)       { setError("Please enter your password"); return; }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        // Detect if loginId is email or name
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginId);
        await login(isEmail ? { email: loginId, password } : { name: loginId, password });
      } else {
        await register({ name, password });
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = m => {
    setMode(m); reset();
    setName(""); setLoginId(""); setPassword(""); setConfirm("");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 20% 20%, #0A1628 0%, #060B14 60%, #0A0F1A 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', system-ui, sans-serif", padding: 20,
    }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: "none", border: "none", color: "#556", cursor: "pointer", fontSize: 13, marginBottom: 16, padding: 0, display: "flex", alignItems: "center", gap: 6 }}>
            ← Back to home
          </button>
        )}

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: reason ? 20 : 36 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🇧🇪</div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: C.white, letterSpacing: "-1px" }}>SmartPrice</h1>
          <div style={{ fontSize: 14, color: "#64748B", marginTop: 6 }}>Belgium Real-Time Electricity Prices</div>
        </div>

        {/* Context banner — shown when user is redirected for a reason */}
        {reason && (
          <div style={{
            background: "rgba(13,148,136,0.12)", border: "1px solid rgba(13,148,136,0.3)",
            borderRadius: 14, padding: "14px 18px", marginBottom: 20,
            display: "flex", alignItems: "flex-start", gap: 12,
          }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{reason.icon || "🔐"}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0", marginBottom: 3 }}>
                {reason.title}
              </div>
              <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6 }}>
                {reason.body}
              </div>
            </div>
          </div>
        )}

        {/* Card */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "32px 36px", boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>

          {/* Tab switcher */}
          <div style={{ display: "flex", background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: 4, marginBottom: 28 }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => switchMode(m)} style={{
                flex: 1, padding: "9px 0", borderRadius: 9, fontSize: 14, fontWeight: 600,
                border: "none", cursor: "pointer", transition: "all 0.2s",
                background: mode === m ? "rgba(255,255,255,0.1)" : "transparent",
                color: mode === m ? C.white : "#64748B",
              }}>
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: C.error }}>
              ⚠️ {error}
            </div>
          )}

          {/* REGISTER: name + password only */}
          {mode === "register" && (<>
            <Input label="Your Name" value={name} onChange={setName}
              placeholder="Jan Janssen" autoComplete="name"
              hint="This is how you'll sign in — no email needed" />
            <Input label="Password" type="password" value={password} onChange={setPassword}
              placeholder="Min. 8 characters" autoComplete="new-password" />
            <Input label="Confirm Password" type="password" value={confirm} onChange={setConfirm}
              placeholder="Repeat password" autoComplete="new-password" />

            {/* Email note */}
            <div style={{ background: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 18, fontSize: 12, color: "#94A3B8", lineHeight: 1.6 }}>
              💡 <strong style={{ color: "#0D9488" }}>Email is optional.</strong> You can add it later in Alerts if you want price notifications.
            </div>
          </>)}

          {/* LOGIN: name or email + password */}
          {mode === "login" && (<>
            <Input label="Name or Email" value={loginId} onChange={setLoginId}
              placeholder="Jan Janssen or jan@example.be" autoComplete="username"
              hint="Sign in with your name or email address" />
            <Input label="Password" type="password" value={password} onChange={setPassword}
              placeholder="Your password" autoComplete="current-password" />
          </>)}

          {/* Submit */}
          <button onClick={handleSubmit} disabled={loading} style={{
            width: "100%", padding: "14px 0", borderRadius: 12, fontSize: 15, fontWeight: 700,
            border: "none", cursor: loading ? "not-allowed" : "pointer",
            background: loading ? "rgba(13,148,136,0.5)" : `linear-gradient(135deg, ${C.teal}, ${C.blue})`,
            color: C.white, marginTop: 4, transition: "all 0.2s",
            boxShadow: loading ? "none" : "0 4px 20px rgba(13,148,136,0.35)",
          }}>
            {loading ? "Please wait…" : mode === "login" ? "Sign In →" : "Create Account →"}
          </button>

          {/* 1st: Skip — most prominent alternative */}
          {onSkip && (
            <button onClick={onSkip} style={{
              width: "100%", padding: "13px 0", borderRadius: 12, fontSize: 14, fontWeight: 700,
              border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)",
              color: "#CBD5E1", cursor: "pointer", marginTop: 16, transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#CBD5E1"; }}>
              👤 Continue as Guest
            </button>
          )}

          {/* Divider */}
          <div style={{ position: "relative", textAlign: "center", margin: "20px 0 16px" }}>
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.08)" }} />
            <span style={{ position: "relative", background: "#0D1626", fontSize: 12, color: "#475569", padding: "0 12px" }}>or sign in with</span>
          </div>

          {/* 2nd: Google */}
          <button onClick={() => window.location.href = "/auth/google"} style={{
            width: "100%", padding: "12px 0", borderRadius: 12, fontSize: 15, fontWeight: 600,
            border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "all 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* 3rd: itsme */}
          <button disabled style={{
            width: "100%", padding: "12px 0", borderRadius: 12, fontSize: 15, fontWeight: 600,
            border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)",
            color: "#334155", cursor: "not-allowed", marginTop: 8,
          }}>
            🔵 itsme — coming soon
          </button>

          <div style={{ fontSize: 11, color: "#334155", textAlign: "center", marginTop: 16 }}>
            🔒 No email required · GDPR compliant · Belgium
          </div>
        </div>
      </div>
    </div>
  );
}