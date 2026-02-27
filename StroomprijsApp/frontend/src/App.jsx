import { useState, useEffect } from "react";
import { useAuth }  from "./context/AuthContext";
import AuthPage     from "./pages/AuthPage";
import ProfilePage  from "./pages/ProfilePage";
import Dashboard    from "./pages/Dashboard";

export default function App() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState("dashboard");

  // Reset to dashboard whenever user logs in
  useEffect(() => {
    if (user) setPage("dashboard");
  }, [user]);

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

  if (!user) return <AuthPage />;

  if (page === "profile") {
    return <ProfilePage onBack={() => setPage("dashboard")} />;
  }

  return <Dashboard onGoProfile={() => setPage("profile")} />;
}