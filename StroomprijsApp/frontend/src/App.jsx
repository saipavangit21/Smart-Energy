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
import SmartAgent        from "./components/SmartAgent";

function getPath() { return window.location.pathname.replace(/\/$/, "") || "/"; }
function getFullPath() { return window.location.pathname + window.location.search; }

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
  const [statusBanner, setStatusBanner] = useState(null);

  useEffect(() => {
    fetch("/api/status-banner")
      .then(r => r.json())
      .then(d => { if (d.active) setStatusBanner(d); })
      .catch(() => {});
  }, []);
  const [promos, setPromos] = useState([
    { supplier: "Bolt",          text: "Geen uitstapvergoeding · Maandelijks opzegbaar", url: "https://www.boltenergie.be/nl/aanbiedingen" },
    { supplier: "Engie",         text: "Gecombineerde korting stroom + gas",             url: "https://www.engie.be/nl/thuis/stroom-gas/aanbiedingen" },
    { supplier: "Luminus",       text: "Vaste prijs 24 maanden beschikbaar",             url: "https://www.luminus.be/nl/prive/elektriciteit-gas/tarieven" },
    { supplier: "TotalEnergies", text: "5% korting bij gecombineerd contract",           url: "https://www.totalenergies.be/nl/particulieren/aanbiedingen" },
    { supplier: "Eneco",         text: "100% windenergie · Nederlandse moedermaatschappij", url: "https://www.eneco.be/nl/energie/stroom-en-gas/tarieven/" },
    { supplier: "Mega",          text: "Variabel tarief zonder uitstapkosten",           url: "https://www.mega.be/nl/energie/tariefkaarten" },
    { supplier: "Octaplus",      text: "Belgisch bedrijf · Lokale klantenservice",       url: "https://www.octaplus.be/nl/elektriciteit-aardgas/tarieven" },
  ]);

  useEffect(() => {
    fetch("/api/suppliers/promotions").then(r => r.json()).then(d => {
      if (d.success) {
        const all = Object.entries(d.promotions || {}).flatMap(([s, d2]) =>
          (d2.promos || []).slice(0, 1).map(p => ({
            supplier: s.charAt(0).toUpperCase() + s.slice(1),
            text: p,
            url: d2.url || null,
          }))
        ).filter(p => p.text && p.url); // only show promos with a real URL
        if (all.length > 0) setPromos(all);
      }
    }).catch(() => {});
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
    return <EvStationsPage onGetStarted={() => { setShowAuth(true); navigate("/"); }} onOpenCalculator={(t) => navigate(`/calculator/${t}`)} onNavigate={navigate} />;
  if (path === "/ev-charging-belgium")
    return <EvChargingPage onGetStarted={() => navigate("/")} onOpenCalculator={(t) => navigate(`/calculator/${t}`)} />;
  if (showPrivacy)                return <PrivacyPolicy onClose={() => setShowPrivacy(false)} />;

  // ── Loading spinner ──────────────────────────────────────────
  const [showPromos, setShowPromos] = useState(false);

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

  const PromoTicker = () => (
    <div style={{ position: "fixed", bottom: 80, right: 16, zIndex: 9999 }}>
      {showPromos && (
        <div style={{ background: "#0D1626", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 14, padding: "14px 16px", marginBottom: 8, maxWidth: 300, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
          <div style={{ fontSize: 11, color: "#F59E0B", fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>🎁 Current Deals</div>
          {promos.slice(0, 7).map((p, i) => (
            <div key={i}
              onClick={() => { setShowPromos(false); navigate("/calculator/electricity"); }}
              style={{ display: "block", fontSize: 12, color: "#CBD5E1", marginBottom: 6, lineHeight: 1.4, cursor: "pointer", padding: "6px 8px", borderRadius: 6, transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <strong style={{ color: "#FCD34D" }}>{p.supplier}</strong>: {p.text}
              <span style={{ color: "#0D9488", marginLeft: 6, fontSize: 10 }}>→</span>
            </div>
          ))}
          <div style={{ fontSize: 10, color: "#475569", marginTop: 10, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Overstappen is gratis · Free to switch</span>
            <button onClick={() => { setShowPromos(false); navigate("/calculator/electricity"); }} style={{ background: "linear-gradient(135deg,#0D9488,#1A56A4)", border: "none", color: "#fff", borderRadius: 20, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              🔌 Compare all plans →
            </button>
          </div>
        </div>
      )}
      <button onClick={() => setShowPromos(s => !s)} style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 16px", borderRadius: 30, cursor: "pointer",
        background: "linear-gradient(135deg, #92400E, #D97706)",
        border: "none", color: "#FEF3C7", fontSize: 13, fontWeight: 700,
        boxShadow: "0 4px 20px rgba(245,158,11,0.4)",
        animation: "promo-flash 2.5s ease-in-out infinite",
      }}>
        🎁 Deals {showPromos ? "✕" : "→"}
      </button>
      <style>{`
        @keyframes promo-flash {
          0%, 100% { box-shadow: 0 4px 20px rgba(245,158,11,0.4); }
          50% { box-shadow: 0 4px 28px rgba(245,158,11,0.8), 0 0 0 4px rgba(245,158,11,0.15); }
        }
      `}</style>
    </div>
  );

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
    <>
      <StatusBanner />
      <PromoTicker />
      <SmartAgent />
      <Dashboard
      onGoProfile={user ? () => setPage("profile") : () => { setGuestMode(false); setShowAuth(true); }}
      initialTab={initialTab}
      onTabConsumed={() => setInitialTab("today")}
      isGuest={!user}
      onSignIn={() => { setGuestMode(false); setShowAuth(true); }}
      onOpenCalculator={(type = "electricity") => navigate(`/calculator/${type}`)}
    />
    </>
  );
}