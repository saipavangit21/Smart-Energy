/**
 * AuthCallback.jsx — Google OAuth callback
 * Reads tokens from URL, POSTs to /auth/exchange to get httpOnly cookies
 * Tokens are immediately cleared from URL so they're never in browser history
 */
import { useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "";

export default function AuthCallback() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const params       = new URLSearchParams(window.location.search);
    const accessToken  = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    // Clear tokens from URL immediately (history.replaceState keeps page, removes tokens)
    window.history.replaceState({}, document.title, "/oauth/callback");

    if (accessToken && refreshToken) {
      // Exchange URL tokens for httpOnly cookies
      fetch(`${API}/auth/exchange`, {
        method:      "POST",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({ accessToken, refreshToken }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            window.location.href = "/";
          } else {
            console.error("Exchange failed:", data.error);
            window.location.href = "/?auth_error=exchange_failed";
          }
        })
        .catch(err => {
          console.error("Exchange error:", err);
          window.location.href = "/?auth_error=network";
        });
    } else {
      window.location.href = "/";
    }
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
        <div style={{ color: "#334155", fontSize: 12, marginTop: 8 }}>Setting up secure session</div>
      </div>
    </div>
  );
}