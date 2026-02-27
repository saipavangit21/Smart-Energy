/**
 * App.jsx — StroomSlim v2 with Authentication
 * Routes:
 *   Not logged in → AuthPage (login/register)
 *   Logged in     → Dashboard (prices) or ProfilePage
 */

import { useState } from "react";
import { useAuth }  from "./context/AuthContext";
import AuthPage     from "./pages/AuthPage";
import ProfilePage  from "./pages/ProfilePage";
import Dashboard    from "./pages/Dashboard";

export default function App() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState("dashboard"); // "dashboard" | "profile"

  // Loading splash while checking stored session
  // Handle Google OAuth callback
  if (window.location.pathname === "/auth/callback") {
    return <AuthCallback />;
  }

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#060B14",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
          <div style={{ color: "#334155", fontSize: 14 }}>Loading StroomSlim…</div>
        </div>
      </div>
    );
  }

  // Not logged in → show auth page
  if (!user) return <AuthPage />;

  // Profile page
  if (page === "profile") {
    return <ProfilePage onBack={() => setPage("dashboard")} />;
  }

  // Main dashboard
  return <Dashboard onGoProfile={() => setPage("profile")} />;
}