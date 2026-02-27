/**
 * App.jsx — StrooomSlim v2 with Authentication
 * Routes:
 *   Not logged in → AuthPage (login/register)
 *   Logged in     → Dashboard (prices) or ProfilePage
 * 
 * OAuth Flow:
 *   1. User clicks "Continue with Google"
 *   2. Redirects to backend /auth/google
 *   3. Backend handles OAuth with Google
 *   4. Backend redirects to /oauth/callback?access_token=...&refresh_token=...
 *   5. This component stores tokens and redirects to home
 *   6. AuthContext restores session from localStorage
 */

import { useState, useEffect } from "react";
import { useAuth }  from "./context/AuthContext";
import AuthPage     from "./pages/AuthPage";
import ProfilePage  from "./pages/ProfilePage";
import Dashboard    from "./pages/Dashboard";
import PrivacyPolicy from "./pages/PrivacyPolicy";


export default function App() {
  const { user, loading } = useAuth();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);


  // ── Handle OAuth callback with proper async flow ──────────────────
  // This replaces the synchronous module-level code that was causing race conditions
  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Only process if we're on the callback route
      if (window.location.pathname !== "/oauth/callback") {
        return;
      }

      // Prevent multiple executions if useEffect runs twice
      if (isProcessingCallback) {
        console.log("⏳ OAuth callback already processing, skipping duplicate");
        return;
      }

      console.log("🔄 Processing OAuth callback...");
      setIsProcessingCallback(true);

      const params = new URLSearchParams(window.location.search);
      const accessToken  = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const authError    = params.get("auth_error");

      // Handle OAuth errors (user cancelled, network error, etc.)
      if (authError) {
        console.error("❌ OAuth error:", authError);
        setIsProcessingCallback(false);
        window.location.replace("/"); // Redirect back to login
        return;
      }

      // Validate that we have both tokens
      if (!accessToken || !refreshToken) {
        console.error("❌ OAuth callback missing tokens");
        console.error(`   Access Token: ${accessToken ? "✓" : "✗"}`);
        console.error(`   Refresh Token: ${refreshToken ? "✓" : "✗"}`);
        setIsProcessingCallback(false);
        window.location.replace("/?auth_error=missing_tokens");
        return;
      }

      // Store tokens in localStorage
      console.log("✅ OAuth tokens received, storing in localStorage...");
      localStorage.setItem("access_token",  accessToken);
      localStorage.setItem("refresh_token", refreshToken);

      // Verify tokens were actually stored (paranoid check)
      const storedAccess = localStorage.getItem("access_token");
      const storedRefresh = localStorage.getItem("refresh_token");

      if (!storedAccess || !storedRefresh) {
        console.error("❌ Failed to store tokens in localStorage");
        setIsProcessingCallback(false);
        window.location.replace("/?auth_error=storage_failed");
        return;
      }

      console.log("✅ Tokens stored successfully");
      
      // Give localStorage a moment to fully sync before redirecting
      // This prevents a race condition where AuthContext checks for tokens
      // before they're fully written
      await new Promise(resolve => setTimeout(resolve, 150));

      console.log("✅ Redirecting to home (AuthContext will restore session)");
      window.location.replace("/");
    };

    handleOAuthCallback();
  }, [isProcessingCallback]);


  // ── Privacy policy modal (shown on top of everything) ──────────────
  useEffect(() => {
    const handler = () => setShowPrivacy(true);
    window.addEventListener("showPrivacy", handler);
    return () => window.removeEventListener("showPrivacy", handler);
  }, []);


  const [page, setPage] = useState("dashboard"); // "dashboard" | "profile"


  // Show privacy policy modal
  if (showPrivacy) {
    return <PrivacyPolicy onClose={() => setShowPrivacy(false)} />;
  }


  // Show loading splash while:
  // 1. AuthContext is checking if user has stored session
  // 2. OAuth callback is processing tokens
  if (loading || isProcessingCallback) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#060B14",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
          <div style={{ color: "#334155", fontSize: 14 }}>
            {isProcessingCallback ? "Signing you in…" : "Loading StrooomSlim…"}
          </div>
        </div>
      </div>
    );
  }


  // Not logged in → show authentication page
  if (!user) {
    return <AuthPage />;
  }


  // Show profile page if requested
  if (page === "profile") {
    return <ProfilePage onBack={() => setPage("dashboard")} />;
  }


  // Main dashboard (default page for logged-in users)
  return <Dashboard onGoProfile={() => setPage("profile")} />;
}
