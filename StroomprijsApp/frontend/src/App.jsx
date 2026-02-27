/**
 * App.jsx — StrooomSlim v2 with Authentication
 * Routes:
 *   Not logged in → AuthPage (login/register)
 *   Logged in    → Dashboard (prices) or ProfilePage
 */
import { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import Dashboard from "./pages/Dashboard";
import AuthCallback from "./pages/AuthCallback";
import PrivacyPolicy from "./pages/PrivacyPolicy";

export default function App() {
  const { user, loading } = useAuth();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [page, setPage] = useState("dashboard"); // "dashboard" | "profile"

  // Handle OAuth callback with cross-browser compatibility
  useEffect(() => {
    if (window.location.pathname === "/oauth/callback") {
      try {
        const params = new URLSearchParams(window.location.search);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        
        if (accessToken && refreshToken) {
          // Use try-catch for localStorage in case of privacy mode
          try {
            localStorage.setItem("access_token", accessToken);
            localStorage.setItem("refresh_token", refreshToken);
          } catch (e) {
            console.error("Failed to save tokens:", e);
          }
          
          // Use history.replaceState for better browser compatibility
          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, "/");
            // Force reload to pick up new tokens
            window.location.reload();
          } else {
            // Fallback for older browsers
            window.location.replace("/");
          }
        }
      } catch (error) {
        console.error("OAuth callback error:", error);
      }
    }
  }, []);

  useEffect(() => {
    const handler = () => setShowPrivacy(true);
    window.addEventListener("showPrivacy", handler);
    return () => window.removeEventListener("showPrivacy", handler);
  }, []);

  // Loading splash while checking stored session
  // Show privacy policy modal on top of everything
  if (showPrivacy) {
    return <PrivacyPolicy onClose={() => setShowPrivacy(false)} />;
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
          <div style={{ color: "#334155", fontSize: 14 }}>Loading StrooomSlim…</div>
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
