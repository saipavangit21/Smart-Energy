/**
 * AuthCallback.jsx — handles redirect back from Google OAuth
 * URL: /auth/callback?access_token=xxx&refresh_token=xxx
 */
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function AuthCallback() {
  const { handleOAuthCallback } = useAuth();
  const [status, setStatus] = useState("Signing you in…");

  useEffect(() => {
    const params      = new URLSearchParams(window.location.search);
    const accessToken  = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const authError    = params.get("auth_error");

    if (authError) {
      setStatus("Login cancelled. Redirecting…");
      setTimeout(() => window.location.href = "/", 2000);
      return;
    }

    if (accessToken && refreshToken) {
      handleOAuthCallback(accessToken, refreshToken)
        .then(() => { window.location.href = "/"; })
        .catch(() => {
          setStatus("Login failed. Redirecting…");
          setTimeout(() => window.location.href = "/", 2000);
        });
    } else {
      setStatus("Invalid callback. Redirecting…");
      setTimeout(() => window.location.href = "/", 2000);
    }
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0D1B3E 0%, #1A56A4 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 16, color: "white",
      fontFamily: "DM Sans, sans-serif",
    }}>
      <div style={{
        width: 48, height: 48,
        border: "3px solid rgba(255,255,255,0.2)",
        borderTopColor: "#0D9488",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ fontSize: 18, opacity: 0.9 }}>{status}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}