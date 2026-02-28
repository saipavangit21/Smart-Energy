/**
 * AuthCallback.jsx — OAuth callback handler
 * Works across all browsers by rendering a page first, then saving tokens
 */
import { useEffect, useRef } from "react";

export default function AuthCallback() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const params       = new URLSearchParams(window.location.search);
    const accessToken  = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken && refreshToken) {
      // Write tokens synchronously
      try {
        localStorage.setItem("access_token",  accessToken);
        localStorage.setItem("refresh_token", refreshToken);
      } catch (e) {
        console.error("localStorage failed:", e);
      }
      // Small delay ensures storage is flushed before navigation
      setTimeout(() => { window.location.href = "/"; }, 100);
    } else {
      // No tokens — go back to login
      setTimeout(() => { window.location.href = "/"; }, 500);
    }
  }, []);

  return (
    <div style={{
      minHeight: "100vh", background: "#060B14",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 16, color: "white",
      fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{
        width: 48, height: 48,
        border: "3px solid rgba(255,255,255,0.1)",
        borderTopColor: "#0D9488", borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ fontSize: 16, opacity: 0.7 }}>Signing you in…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}