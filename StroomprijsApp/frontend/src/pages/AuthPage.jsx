/**
 * pages/AuthPage.jsx
 * Login + Register — theme-aware, fully translated
 */

import { useState } from "react";
import { useAuth }      from "../context/AuthContext";
import { useLanguage }  from "../context/LanguageContext";
import { useColors, useTheme } from "../context/ThemeContext";
import LangSwitcher     from "../components/LangSwitcher";

function Input({ label, type = "text", value, onChange, placeholder, autoComplete, hint, C }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} autoComplete={autoComplete}
        style={{
          width: "100%", padding: "12px 16px", borderRadius: 12, fontSize: 14,
          background: C.inputBg, border: `1.5px solid ${C.border}`,
          color: C.text, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
          fontFamily: "inherit",
        }}
        onFocus={e => e.target.style.borderColor = C.green}
        onBlur={e => e.target.style.borderColor = C.border}
      />
      {hint && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

export default function AuthPage({ onBack, reason }) {
  const { login, register }   = useAuth();
  const { tSection }          = useLanguage();
  const C                     = useColors();
  const { theme }             = useTheme();
  const isDark                = theme === "dark";
  const A                     = tSection("auth");

  const [mode,     setMode]     = useState("login");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const reset = () => setError("");

  const isValidEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSubmit = async () => {
    reset();
    if (mode === "register") {
      if (!name.trim())         { setError(A.errName || "Please enter your name"); return; }
      if (!email.trim())        { setError(A.errEmail || "Please enter your email"); return; }
      if (!isValidEmail(email)) { setError(A.errInvalidEmail || "Enter a valid email address"); return; }
      if (!password)            { setError(A.errPassword || "Please enter a password"); return; }
      if (password.length < 8)  { setError(A.errPasswordLength || "Password must be at least 8 characters"); return; }
      if (password !== confirm)  { setError(A.errPasswordMatch || "Passwords do not match"); return; }
    } else {
      if (!email.trim())        { setError(A.errEmail || "Please enter your email"); return; }
      if (!isValidEmail(email)) { setError(A.errInvalidEmail || "Enter a valid email address"); return; }
      if (!password)            { setError(A.errEnterPassword || "Please enter your password"); return; }
    }
    setLoading(true);
    try {
      if (mode === "login") {
        await login({ email: email.trim().toLowerCase(), password });
      } else {
        await register({ name: name.trim(), email: email.trim().toLowerCase(), password });
      }
    } catch (err) {
      setError(err.message || A.errGeneric || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = m => { setMode(m); reset(); setName(""); setEmail(""); setPassword(""); setConfirm(""); };

  const bg = isDark
    ? "radial-gradient(ellipse at 20% 10%, #0F1E38 0%, #060B14 55%, #0B0F1A 100%)"
    : "linear-gradient(135deg, #F0FDF4 0%, #F8FAFC 60%, #EFF6FF 100%)";

  const cardBg   = isDark ? "#0D1626" : C.card;
  const cardBorder = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)";
  const cardShadow = isDark ? "0 32px 80px rgba(0,0,0,0.55)" : "0 20px 60px rgba(0,0,0,0.1)";

  const valueProps = [
    { icon: "🔔", text: A.valueProp1 || "Daily cheapest-window alerts" },
    { icon: "📊", text: A.valueProp2 || "7 Belgian suppliers compared" },
    { icon: "⚡", text: A.valueProp3 || "Live EPEX prices + dashboard" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', system-ui, sans-serif", padding: "20px 16px",
    }}>
      <div style={{ width: "100%", maxWidth: 460 }}>

        {/* Back + lang row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <button
            onClick={onBack || (() => window.location.href = "/")}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              border: `1px solid ${C.border}`,
              borderRadius: 20, padding: "8px 16px",
              color: C.text, cursor: "pointer",
              fontSize: 13, fontWeight: 700,
            }}
          >
            ← {A.backHome || "Back to home"}
          </button>
          <LangSwitcher />
        </div>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🇧🇪</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: C.text, letterSpacing: "-1px" }}>SmartPrice</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 5 }}>{A.subtitle || "Belgium Real-Time Electricity Prices"}</div>
        </div>

        {/* Value props strip */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
          {valueProps.map(v => (
            <div key={v.text} style={{ display: "flex", alignItems: "center", gap: 6, background: isDark ? "rgba(16,185,129,0.07)" : "rgba(5,150,105,0.07)", border: `1px solid ${isDark ? "rgba(16,185,129,0.18)" : "rgba(5,150,105,0.18)"}`, borderRadius: 20, padding: "5px 12px" }}>
              <span style={{ fontSize: 13 }}>{v.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.green }}>{v.text}</span>
            </div>
          ))}
        </div>

        {/* Context banner */}
        {reason && (
          <div style={{ background: isDark ? "rgba(16,185,129,0.1)" : "rgba(5,150,105,0.07)", border: `1px solid ${isDark ? "rgba(16,185,129,0.28)" : "rgba(5,150,105,0.2)"}`, borderRadius: 14, padding: "14px 18px", marginBottom: 18, display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{reason.icon || "🔐"}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 3 }}>{reason.title}</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{reason.body}</div>
            </div>
          </div>
        )}

        {/* Card */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 22, padding: "32px 36px", boxShadow: cardShadow }}>

          {/* Tab switcher */}
          <div style={{ display: "flex", background: isDark ? "rgba(0,0,0,0.3)" : C.bg, borderRadius: 12, padding: 4, marginBottom: 26, border: `1px solid ${C.border}` }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => switchMode(m)} style={{
                flex: 1, padding: "9px 0", borderRadius: 9, fontSize: 13, fontWeight: 700,
                border: "none", cursor: "pointer", transition: "all 0.2s",
                background: mode === m ? (isDark ? "rgba(16,185,129,0.15)" : C.card) : "transparent",
                color: mode === m ? C.green : C.muted,
                boxShadow: mode === m ? (isDark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 1px 4px rgba(0,0,0,0.08)") : "none",
              }}>
                {m === "login" ? (A.signInTab || "Sign In") : (A.registerTab || "Create Account")}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.28)", borderRadius: 10, padding: "10px 14px", marginBottom: 18, fontSize: 13, color: "#EF4444", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ flexShrink: 0 }}>⚠️</span> {error}
            </div>
          )}

          {/* REGISTER */}
          {mode === "register" && (<>
            <Input C={C} label={A.yourName || "Your Name"} value={name} onChange={setName}
              placeholder={A.namePlaceholder || "Jan Janssen"} autoComplete="name" />
            <Input C={C} label={A.emailLabel || "Email"} type="email" value={email} onChange={setEmail}
              placeholder={A.emailPlaceholder || "jan@example.be"} autoComplete="email"
              hint={A.emailHint || "Used to log in and receive price alerts"} />
            <Input C={C} label={A.password || "Password"} type="password" value={password} onChange={setPassword}
              placeholder={A.passwordHint || "Min. 8 characters"} autoComplete="new-password" />
            <Input C={C} label={A.confirmPassword || "Confirm Password"} type="password" value={confirm} onChange={setConfirm}
              placeholder={A.confirmPlaceholder || "Repeat your password"} autoComplete="new-password" />
          </>)}

          {/* LOGIN */}
          {mode === "login" && (<>
            <Input C={C} label={A.emailLabel || "Email"} type="email" value={email} onChange={setEmail}
              placeholder={A.emailPlaceholder || "jan@example.be"} autoComplete="email" />
            <Input C={C} label={A.password || "Password"} type="password" value={password} onChange={setPassword}
              placeholder={A.passwordLoginHint || "Your password"} autoComplete="current-password" />
          </>)}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%", padding: "13px 0", borderRadius: 12, fontSize: 15, fontWeight: 700,
              border: "none", cursor: loading ? "not-allowed" : "pointer",
              background: loading
                ? (isDark ? "rgba(16,185,129,0.4)" : "rgba(5,150,105,0.5)")
                : "linear-gradient(135deg, #059669, #0D9488)",
              color: "#fff", marginTop: 6, transition: "all 0.2s",
              boxShadow: loading ? "none" : "0 4px 20px rgba(5,150,105,0.4)",
              letterSpacing: "0.2px",
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = "0 6px 28px rgba(5,150,105,0.55)"; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.boxShadow = "0 4px 20px rgba(5,150,105,0.4)"; }}
          >
            {loading
              ? (A.pleaseWait || "Please wait…")
              : mode === "login"
                ? (A.signInBtn || "Sign In →")
                : (A.registerBtn || "Create Account →")}
          </button>

          {/* Divider */}
          <div style={{ position: "relative", textAlign: "center", margin: "20px 0 16px" }}>
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: C.border }} />
            <span style={{ position: "relative", background: cardBg, fontSize: 11, fontWeight: 600, color: C.muted, padding: "0 14px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {A.orSignInWith || "or continue with"}
            </span>
          </div>

          {/* Google */}
          <button
            onClick={() => window.location.href = "/auth/google"}
            style={{
              width: "100%", padding: "12px 0", borderRadius: 12, fontSize: 14, fontWeight: 600,
              border: `1.5px solid ${C.border}`,
              background: isDark ? "rgba(255,255,255,0.04)" : C.bg,
              color: C.text,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.09)" : "#F1F5F9"; e.currentTarget.style.borderColor = C.green; }}
            onMouseLeave={e => { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.04)" : C.bg; e.currentTarget.style.borderColor = C.border; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {A.continueGoogle || "Continue with Google"}
          </button>

          <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 16 }}>
            {A.gdprText || "🔒 GDPR compliant · Data stays in Belgium"}
          </div>
        </div>
      </div>
    </div>
  );
}
