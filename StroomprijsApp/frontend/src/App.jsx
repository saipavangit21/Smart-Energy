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
}

export default function App() {
  const { user, loading } = useAuth();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [page,        setPage]        = useState("dashboard");
  const [initialTab,  setInitialTab]  = useState("today");
  const [showAuth,    setShowAuth]    = useState(false);
  const [guestMode,   setGuestMode]   = useState(false); // browse without account

  useEffect(() => {
    const handler = () => setShowPrivacy(true);
    window.addEventListener("showPrivacy", handler);
    return () => window.removeEventListener("showPrivacy", handler);
  }, []);

  useEffect(() => {
    if (user) { setPage("dashboard"); setShowAuth(false); setGuestMode(false); }
  }, [user]);

  if (window.location.pathname === "/oauth/callback") return <AuthCallback />;
  if (showPrivacy) return <PrivacyPolicy onClose={() => setShowPrivacy(false)} />;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#060B14", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <div style={{ color: "#334155", fontSize: 14 }}>Loading SmartPrice…</div>
      </div>
    </div>
  );

  // Logged-out flow
  if (!user && !guestMode) {
    if (showAuth) return (
      <AuthPage
        onBack={() => setShowAuth(false)}
        onSkip={() => { setShowAuth(false); setGuestMode(true); }}
      />
    );
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  // Profile page (only for logged-in users)
  if (page === "profile" && user) {
    return <ProfilePage
      onBack={() => setPage("dashboard")}
      onGoAlerts={() => { setInitialTab("alerts"); setPage("dashboard"); }}
    />;
  }

  // Dashboard — works for both logged-in and guest users
  return <Dashboard
    onGoProfile={user ? () => setPage("profile") : () => setShowAuth(true)}
    initialTab={initialTab}
    onTabConsumed={() => setInitialTab("today")}
    isGuest={!user}
    onSignIn={() => { setGuestMode(false); setShowAuth(true); }}
  />;
}