/**
 * AuthCallback.jsx — handles Google OAuth redirect
 */
import { useEffect, useState } from "react";

export default function AuthCallback() {
  const [status, setStatus] = useState("Signing you in…");

  useEffect(() => {
    const params       = new URLSearchParams(window.location.search);
    const accessToken  = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const authError    = params.get("auth_error");

    if (authError) {
      setStatus("Login cancelled. Redirecting…");
      setTimeout(() => window.location.replace("/"), 2000);
      return;
    }

    if (accessToken && refreshToken) {
      // Store tokens directly
      localStorage.setItem("access_token",  accessToken);
      localStorage.setItem("refresh_token", refreshToken);
      // Redirect to home — AuthContext will pick up tokens on load
      window.location.replace("/");
    } else {
      setStatus("Something went wrong. Redirecting…");
      setTimeout(() => window.location.replace("/"), 2000);
    }
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#060B14",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 16, color: "white",
      fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{
        width: 48, height: 48,
        border: "3px solid rgba(255,255,255,0.1)",
        borderTopColor: "#0D9488",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ fontSize: 18, opacity: 0.8 }}>{status}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}