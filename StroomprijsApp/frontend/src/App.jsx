/**
 * App.jsx — SmartPrice.be
 */
import { useState, useEffect } from "react";
import { useAuth }    from "./context/AuthContext";
import AuthPage       from "./pages/AuthPage";
import ProfilePage    from "./pages/ProfilePage";
import Dashboard      from "./pages/Dashboard";
import AuthCallback   from "./pages/AuthCallback";
import PrivacyPolicy  from "./pages/PrivacyPolicy";
import LandingPage    from "./pages/LandingPage";

// OAuth tokens are now set as httpOnly cookies by the backend
// No localStorage handling needed here

export default function App() {
  const { user, loading } = useAuth();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [page,        setPage]        = useState("dashboard");
  const [initialTab,  setInitialTab]  = useState("today");
  const [showAuth,    setShowAuth]    = useState(false);
  const [guestMode,   setGuestMode]   = useState(false); // ← key fix

  useEffect(() => {
    const handler = () => setShowPrivacy(true);
    window.addEventListener("showPrivacy", handler);
    return () => window.removeEventListener("showPrivacy", handler);
  }, []);

  useEffect(() => {
    if (user) { setPage("dashboard"); setShowAuth(false); setGuestMode(false); }
  }, [user]);

  if (window.location.pathname === "/oauth/callback") return <AuthCallback />;
  if (window.location.pathname === "/privacy") return <PrivacyPolicy onClose={() => window.location.href = "/"} />;
  if (showPrivacy) return <PrivacyPolicy onClose={() => setShowPrivacy(false)} />;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#060B14", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <div style={{ color: "#334155", fontSize: 14 }}>Loading SmartPrice…</div>
      </div>
    </div>
  );

  // Logged-out — guestMode bypasses this entire block
  if (!user && !guestMode) {
    if (showAuth) return (
      <AuthPage
        onBack={() => setShowAuth(false)}
        onSkip={() => { setShowAuth(false); setGuestMode(true); }}
      />
    );
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  if (page === "profile" && user) {
    return <ProfilePage
      onBack={() => setPage("dashboard")}
      onGoAlerts={() => { setInitialTab("alerts"); setPage("dashboard"); }}
    />;
  }

  return <Dashboard
    onGoProfile={user ? () => setPage("profile") : () => { setGuestMode(false); setShowAuth(true); }}
    initialTab={initialTab}
    onTabConsumed={() => setInitialTab("today")}
    isGuest={!user}
    onSignIn={() => { setGuestMode(false); setShowAuth(true); }}
  />;
}