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
function getFullPath() { return window.location.pathname + window.location.search; }

export default function App() {
  const { user, loading } = useAuth();

  const [path,        setPath]        = useState(getPath);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [page,        setPage]        = useState("dashboard");
  const [initialTab,  setInitialTab]  = useState("today");
  const [showAuth,    setShowAuth]    = useState(false);

  // After sign-in, an optional callback lets CalculatorPage reveal pending results
  const [postSignInCb, setPostSignInCb] = useState(null);
  const [statusBanner, setStatusBanner] = useState(null);

  useEffect(() => {
    fetch("/api/status-banner")
      .then(r => r.json())
      .then(d => { if (d.active) setStatusBanner(d); })
      .catch(() => {});
  }, []);

  // Listen to browser back/forward
  useEffect(() => {
    const onPop = () => setPath(getPath());
    window.addEventListener("popstate", onPop);

    // Handle anchor tag clicks for SPA navigation
    const onClick = (e) => {
      const a = e.target.closest("a[href]");
      if (!a) return;
      const href = a.getAttribute("href");
      // Skip external links, mailto, hash, and links with target="_blank"
      if (!href) return;
      if (href.startsWith("http") || href.startsWith("https") || href.startsWith("mailto") || href.startsWith("#")) return;
      if (a.getAttribute("target") === "_blank") return;
      if (a.getAttribute("data-external") === "true") return;
      e.preventDefault();
      window.history.pushState({}, "", href);
      setPath(href.split("?")[0]);
    };
    document.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("click", onClick);
    };
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
    return <EvStationsPage onGetStarted={() => { setShowAuth(true); navigate("/"); }} onOpenCalculator={(t) => navigate(`/calculator/${t}`)} onNavigate={navigate} />;
  if (path === "/ev-charging-belgium")
    return <EvChargingPage onGetStarted={() => navigate("/")} onOpenCalculator={(t) => navigate(`/calculator/${t}`)} />;
  if (showPrivacy)                return <PrivacyPolicy onClose={() => setShowPrivacy(false)} />;

  // ── Loading spinner ──────────────────────────────────────────
  const StatusBanner = () => {
    if (!statusBanner) return null;
    const colors = {
      maintenance: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.4)", text: "#F59E0B", icon: "🔧" },
      incident:    { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.4)",  text: "#EF4444", icon: "⚠️" },
      info:        { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.4)", text: "#3B82F6", icon: "ℹ️" },
      resolved:    { bg: "rgba(0,200,150,0.12)",  border: "rgba(0,200,150,0.4)",  text: "#00C896", icon: "✅" },
    };
    const c = colors[statusBanner.type] || colors.info;
    return (
      <div style={{ background: c.bg, borderBottom: `1px solid ${c.border}`, padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, position: "sticky", top: 0, zIndex: 10000 }}>
        <span style={{ fontSize: 16 }}>{c.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{statusBanner.title}</span>
        {statusBanner.message && <span style={{ fontSize: 12, color: c.text, opacity: 0.8 }}>— {statusBanner.message}</span>}
        {statusBanner.dismissable !== false && (
          <button onClick={() => setStatusBanner(null)} style={{ marginLeft: 12, background: "none", border: "none", color: c.text, cursor: "pointer", fontSize: 16, opacity: 0.7, padding: "0 4px" }}>✕</button>
        )}
      </div>
    );
  };


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
  if (!user) {
    if (showAuth) return (
      <AuthPage
        onBack={() => setShowAuth(false)}
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
    <>
      <StatusBanner />
      <Dashboard
      onGoProfile={() => setPage("profile")}
      initialTab={initialTab}
      onTabConsumed={() => setInitialTab("today")}
      isGuest={false}
      onSignIn={() => setShowAuth(true)}
      onOpenCalculator={(type = "electricity") => navigate(`/calculator/${type}`)}
    />
    </>
  );
}