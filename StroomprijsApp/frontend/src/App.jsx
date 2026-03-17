/**
 * App.jsx — SmartPrice.be
 *
 * Routes (no react-router, plain pathname):
 *   /                                    → LandingPage (logged-out) or Dashboard (logged-in / guest)
 *   /calculator/electricity              → CalculatorPage
 *   /calculator/gas                      → CalculatorPage
 *   /oauth/callback                      → AuthCallback
 *   /privacy                             → PrivacyPolicy
 *   /admin                               → AdminDashboard
 *   /epex-price-belgium                  → EpexBelgiumPage (SEO)
 *   /belpex-price-today                  → EpexBelgiumPage (SEO alias)
 *   /cheapest-electricity-hours-belgium  → CheapestHoursPage (SEO)
 *   /api-docs                            → ApiPage (Home Assistant / developers)
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth }       from "./context/AuthContext";
import AuthPage          from "./pages/AuthPage";
import ProfilePage       from "./pages/ProfilePage";
import Dashboard         from "./pages/Dashboard";
import AuthCallback      from "./pages/AuthCallback";
import PrivacyPolicy     from "./pages/PrivacyPolicy";
import LandingPage       from "./pages/LandingPage";
import CalculatorPage    from "./pages/CalculatorPage";
import AdminDashboard    from "./pages/AdminDashboard";
import EpexBelgiumPage   from "./pages/seo/EpexBelgiumPage";
import CheapestHoursPage from "./pages/seo/CheapestHoursPage";
import EvChargingPage    from "./pages/seo/EvChargingPage";
import EvStationsPage   from "./pages/seo/EvStationsPage";
import ApiPage           from "./pages/ApiPage";

function getPath() { return window.location.pathname.replace(/\/$/, "") || "/"; }

export default function App() {
  const { user, loading } = useAuth();

  const [path,        setPath]        = useState(getPath);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [page,        setPage]        = useState("dashboard");
  const [initialTab,  setInitialTab]  = useState("today");
  const [showAuth,    setShowAuth]    = useState(false);
  const [guestMode,   setGuestMode]   = useState(false);

  // After sign-in, an optional callback lets CalculatorPage reveal pending results
  const [postSignInCb, setPostSignInCb] = useState(null);

  // Listen to browser back/forward
  useEffect(() => {
    const onPop = () => setPath(getPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Privacy event from footer links
  useEffect(() => {
    const handler = () => setShowPrivacy(true);
    window.addEventListener("showPrivacy", handler);
    return () => window.removeEventListener("showPrivacy", handler);
  }, []);

  // After sign-in: clear auth UI and fire any pending callback
  useEffect(() => {
    if (user) {
      setShowAuth(false);
      setGuestMode(false);
      if (postSignInCb) { postSignInCb(); setPostSignInCb(null); }
    }
  }, [user]);

  const navigate = useCallback((to) => {
    window.history.pushState({}, "", to);
    setPath(to);
  }, []);

  // ── Hard-coded path matches ──────────────────────────────────
  if (path === "/oauth/callback") return <AuthCallback />;
  if (path === "/privacy")        return <PrivacyPolicy onClose={() => navigate("/")} />;
  if (path === "/admin")          return <AdminDashboard />;

  // SEO pages
  if (path === "/epex-price-belgium" || path === "/belpex-price-today")
    return <EpexBelgiumPage onGetStarted={() => navigate("/")} onOpenCalculator={(t) => navigate(`/calculator/${t}`)} />;
  if (path === "/cheapest-electricity-hours-belgium")
    return <CheapestHoursPage onGetStarted={() => navigate("/")} onOpenCalculator={(t) => navigate(`/calculator/${t}`)} />;
  if (path === "/api-docs")
    return <ApiPage onGetStarted={() => { setShowAuth(true); navigate("/"); }} />;
  if (path === "/ev-charging-stations-belgium")
    return <EvStationsPage onGetStarted={() => { setShowAuth(true); navigate("/"); }} onOpenCalculator={(t) => navigate(`/calculator/${t}`)} />;
  if (path === "/ev-charging-belgium")
    return <EvChargingPage onGetStarted={() => navigate("/")} onOpenCalculator={(t) => navigate(`/calculator/${t}`)} />;
  if (showPrivacy)                return <PrivacyPolicy onClose={() => setShowPrivacy(false)} />;

  // ── Loading spinner ──────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#060B14", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <div style={{ color: "#334155", fontSize: 14 }}>Loading SmartPrice…</div>
      </div>
    </div>
  );

  // ── /calculator/electricity  or  /calculator/gas ─────────────
  // PUBLIC — no login required to use the calculator.
  // Sign-in is prompted only when the user taps "Find My Best Plan".
  if (path === "/calculator/electricity" || path === "/calculator/gas") {
    const energyType = path.endsWith("/gas") ? "gas" : "electricity";

    if (showAuth) return (
      <AuthPage
        onBack={() => setShowAuth(false)}
        onSkip={() => { setShowAuth(false); setGuestMode(true); }}
        reason={{
          icon: energyType === "gas" ? "🔥" : "⚡",
          title: "Sign in to see your results",
          body: "Your personalised plan comparison is ready. Create a free account in 30 seconds — no credit card needed.",
        }}
      />
    );

    return (
      <CalculatorPage
        isGuest={!user}
        onBack={() => navigate("/")}
        onSignIn={() => setShowAuth(true)}
      />
    );
  }

  // ── Logged-out main flow ─────────────────────────────────────
  if (!user && !guestMode) {
    if (showAuth) return (
      <AuthPage
        onBack={() => setShowAuth(false)}
        onSkip={() => { setShowAuth(false); setGuestMode(true); }}
      />
    );
    return (
      <LandingPage
        onGetStarted={() => setShowAuth(true)}
        onOpenCalculator={(type = "electricity") => navigate(`/calculator/${type}`)}
      />
    );
  }

  // ── Profile page ─────────────────────────────────────────────
  if (page === "profile" && user) {
    return (
      <ProfilePage
        onBack={() => setPage("dashboard")}
        onGoAlerts={() => { setInitialTab("alerts"); setPage("dashboard"); }}
      />
    );
  }

  // ── Main dashboard ───────────────────────────────────────────
  return (
    <Dashboard
      onGoProfile={user ? () => setPage("profile") : () => { setGuestMode(false); setShowAuth(true); }}
      initialTab={initialTab}
      onTabConsumed={() => setInitialTab("today")}
      isGuest={!user}
      onSignIn={() => { setGuestMode(false); setShowAuth(true); }}
      onOpenCalculator={(type = "electricity") => navigate(`/calculator/${type}`)}
    />
  );
}