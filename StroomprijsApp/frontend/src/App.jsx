/**
 * App.jsx — StrooomSlim v2
 */
import { useState, useEffect } from "react";
import { useAuth }    from "./context/AuthContext";
import AuthPage       from "./pages/AuthPage";
import ProfilePage    from "./pages/ProfilePage";
import Dashboard      from "./pages/Dashboard";
import AuthCallback   from "./pages/AuthCallback";
import PrivacyPolicy  from "./pages/PrivacyPolicy";

// Save tokens if present — but do NOT redirect here.
// Let AuthCallback component handle the redirect with proper delay.
if (window.location.pathname === "/oauth/callback") {
  try {
    const p  = new URLSearchParams(window.location.search);
    const at = p.get("access_token");
    const rt = p.get("refresh_token");
    if (at && rt) {
      localStorage.setItem("access_token",  at);
      localStorage.setItem("refresh_token", rt);
    }
  } catch (e) {
    console.error("OAuth token save failed:", e);
  }
  // NO window.location.replace here — AuthCallback handles the redirect
}

export default function App() {
  const { user, loading } = useAuth();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [page,        setPage]        = useState("dashboard");
  const [initialTab,  setInitialTab]  = useState("today");

  useEffect(() => {
    const handler = () => setShowPrivacy(true);
    window.addEventListener("showPrivacy", handler);
    return () => window.removeEventListener("showPrivacy", handler);
  }, []);

  useEffect(() => {
    if (user) setPage("dashboard");
  }, [user]);

  // Always render AuthCallback on this route — handles redirect with delay
  if (window.location.pathname === "/oauth/callback") {
    return <AuthCallback />;
  }

  if (showPrivacy) return <PrivacyPolicy onClose={() => setShowPrivacy(false)} />;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#060B14", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <div style={{ color: "#334155", fontSize: 14 }}>Loading StrooomSlim…</div>
      </div>
    </div>
  );

  if (!user) return <AuthPage />;

  if (page === "profile") {
    return <ProfilePage
      onBack={() => setPage("dashboard")}
      onGoAlerts={() => { setInitialTab("alerts"); setPage("dashboard"); }}
    />;
  }

  return <Dashboard
    onGoProfile={() => setPage("profile")}
    initialTab={initialTab}
    onTabConsumed={() => setInitialTab("today")}
  />;
}