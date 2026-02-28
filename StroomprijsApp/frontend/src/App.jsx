/**
 * App.jsx — StrooomSlim v2
 */
import { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import Dashboard from "./pages/Dashboard";
import PrivacyPolicy from "./pages/PrivacyPolicy";

// ⚡ MUST be outside the component — runs before useAuth()
// Saves OAuth tokens to localStorage before AuthContext initializes
if (window.location.pathname === "/oauth/callback") {
  try {
    const p = new URLSearchParams(window.location.search);
    const at = p.get("access_token");
    const rt = p.get("refresh_token");
    if (at && rt) {
      localStorage.setItem("access_token",  at);
      localStorage.setItem("refresh_token", rt);
    }
  } catch (e) {}
  window.location.replace("/");
}

export default function App() {
  const { user, loading } = useAuth();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [page, setPage] = useState("dashboard");

  useEffect(() => {
    const handler = () => setShowPrivacy(true);
    window.addEventListener("showPrivacy", handler);
    return () => window.removeEventListener("showPrivacy", handler);
  }, []);

  useEffect(() => { if (user) setPage("dashboard"); }, [user]);

  if (showPrivacy) return <PrivacyPolicy onClose={() => setShowPrivacy(false)} />;

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#060B14", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans', system-ui, sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>⚡</div>
        <div style={{ color:"#334155", fontSize:14 }}>Loading StrooomSlim…</div>
      </div>
    </div>
  );

  if (!user) return <AuthPage />;
  if (page === "profile") return <ProfilePage onBack={() => setPage("dashboard")} />;
  return <Dashboard onGoProfile={() => setPage("profile")} />;
}