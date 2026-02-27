/**
 * context/AuthContext.jsx
 * Global authentication state — wraps the entire app
 * Provides: user, login, logout, register, updatePreferences
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);
const API = "/auth";

// Token helpers
const storage = {
  getAccess:    ()    => localStorage.getItem("access_token"),
  getRefresh:   ()    => localStorage.getItem("refresh_token"),
  setAccess:    (t)   => localStorage.setItem("access_token", t),
  setRefresh:   (t)   => localStorage.setItem("refresh_token", t),
  clear:        ()    => { localStorage.removeItem("access_token"); localStorage.removeItem("refresh_token"); },
};

// Safe JSON parse
async function safeJson(res) {
  try {
    const text = await res.text();
    if (!text || text.trim() === "") return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Try to refresh token ───────────────────────────────────
  const tryRefresh = useCallback(async () => {
    const refreshToken = storage.getRefresh();
    if (!refreshToken) return false;
    try {
      const res  = await fetch(`${API}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const json = await res.json();
      storage.setAccess(json.accessToken);
      storage.setRefresh(json.refreshToken);
      return true;
    } catch {
      return false;
    }
  }, []);

  // ── Authenticated fetch (auto-attaches JWT) ────────────────
  const authFetch = useCallback(async (url, options = {}) => {
    let token = storage.getAccess();
    const res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}), Authorization: `Bearer ${token}` },
    });

    // Token expired → try refresh
    if (res.status === 401) {
      const body = await safeJson(res) || {};
      if (body.code === "TOKEN_EXPIRED") {
        const refreshed = await tryRefresh();
        if (refreshed) {
          token = storage.getAccess();
          return fetch(url, {
            ...options,
            headers: { "Content-Type": "application/json", ...(options.headers || {}), Authorization: `Bearer ${token}` },
          });
        }
      }
      setUser(null);
      storage.clear();
    }
    return res;
  }, [tryRefresh]);

  // ── Restore session on page load ───────────────────────────
  useEffect(() => {
    const restore = async () => {
      const token = storage.getAccess();
      console.log("🔍 Checking for stored token:", token ? "✅ Found" : "❌ Not found");
      
      if (!token) { 
        setLoading(false);
        return;
      }

      try {
        // Use simple fetch, NOT authFetch (avoids circular dependency)
        const res = await fetch(`${API}/me`, {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        
        const json = await res.json();
        console.log("📦 /auth/me response:", json);
        
        if (json.success) {
          setUser(json.user);
          console.log("✅ User restored:", json.user.email);
        } else {
          console.warn("⚠️ /auth/me failed:", json.error);
          storage.clear();
        }
      } catch (err) {
        console.error("❌ Restore error:", err.message);
        storage.clear();
      } finally {
        setLoading(false);
      }
    };
    
    restore();
  }, []);

  // ── Register ───────────────────────────────────────────────
  const register = async ({ name, email, password }) => {
    let res;
    try {
      res = await fetch(`${API}/register`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, email, password }),
      });
    } catch (e) {
      throw new Error("Cannot reach server. Is the backend running?");
    }
    const json = await safeJson(res);
    if (!json) throw new Error(`Server returned empty response (status ${res.status}).`);
    if (!json.success) throw new Error(json.error || "Registration failed");
    storage.setAccess(json.accessToken);
    storage.setRefresh(json.refreshToken);
    setUser(json.user);
    return json.user;
  };

  // ── Login ──────────────────────────────────────────────────
  const login = async ({ email, password }) => {
    let res;
    try {
      res = await fetch(`${API}/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      });
    } catch (e) {
      throw new Error("Cannot reach server. Is the backend running?");
    }
    const json = await safeJson(res);
    if (!json) throw new Error(`Server returned empty response (status ${res.status}).`);
    if (!json.success) throw new Error(json.error || "Login failed");
    storage.setAccess(json.accessToken);
    storage.setRefresh(json.refreshToken);
    setUser(json.user);
    return json.user;
  };

  // ── Logout ─────────────────────────────────────────────────
  const logout = async () => {
    try {
      await fetch(`${API}/logout`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ refreshToken: storage.getRefresh() }),
      });
    } catch {}
    setUser(null);
    storage.clear();
  };

  // ── Update preferences ─────────────────────────────────────
  const updatePreferences = async (prefs) => {
    const res  = await authFetch(`${API}/preferences`, {
      method: "PUT",
      body:   JSON.stringify(prefs),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    setUser(prev => ({ ...prev, preferences: json.preferences }));
    return json.preferences;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, updatePreferences, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
