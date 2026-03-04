/**
 * AuthCallback.jsx — Google OAuth callback handler
 * Backend now sets httpOnly cookies directly on the OAuth redirect
 * This page just redirects home — cookies are already set
 */
import { useEffect, useRef } from "react";

export default function AuthCallback() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    // Cookies are set by the backend on the /auth/google/callback redirect
    // Just go home — AuthContext will pick up the session via /auth/me
    setTimeout(() => { window.location.href = "/"; }, 200);
  }, []);

  return (
    <div style={{
      minHeight: "100vh", background: "#060B14",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <div style={{ color: "#0D9488", fontSize: 16, fontWeight: 600 }}>Signing you in…</div>
      </div>
    </div>
  );
}