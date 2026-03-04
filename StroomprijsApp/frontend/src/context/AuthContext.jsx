/**
 * context/AuthContext.jsx
 * Tokens stored in httpOnly cookies (set by backend) — never in localStorage
 * XSS safe: JS cannot read sp_access or sp_refresh cookies
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);
const API = "/auth";

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

  // ── Authenticated fetch — cookies sent automatically ────────
  const authFetch = useCallback(async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      credentials: "include", // sends httpOnly cookies automatically
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });

    // Access token expired → try silent refresh
    if (res.status === 401) {
      const body = await safeJson(res) || {};
      if (body.code === "TOKEN_EXPIRED") {
        const refreshed = await tryRefresh();
        if (refreshed) {
          return fetch(url, {
            ...options,
            credentials: "include",
            headers: { "Content-Type": "application/json", ...(options.headers || {}) },
          });
        }
      }
      setUser(null);
    }
    return res;
  }, []);

  // ── Silent token refresh ────────────────────────────────────
  const tryRefresh = useCallback(async () => {
    try {
      const res = await fetch(`${API}/refresh`, {
        method: "POST",
        credentials: "include", // sends sp_refresh cookie
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) return false;
      const json = await res.json();
      if (json.success && json.user) setUser(json.user);
      return json.success;
    } catch {
      return false;
    }
  }, []);

  // ── Restore session on page load ────────────────────────────
  useEffect(() => {
    const restore = async () => {
      try {
        const res  = await fetch(`${API}/me`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        const json = await safeJson(res);
        if (json?.success) {
          setUser(json.user);
        } else {
          // Try refresh if /me fails
          await tryRefresh();
        }
      } catch {
        // No session — that's fine
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, [tryRefresh]);

  // ── Register ────────────────────────────────────────────────
  const register = async ({ name, email, password }) => {
    let res;
    try {
      res = await fetch(`${API}/register`, {
        method:      "POST",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({ name, email, password }),
      });
    } catch {
      throw new Error("Cannot reach server. Is the backend running?");
    }
    const json = await safeJson(res);
    if (!json) throw new Error(`Server error (${res.status})`);
    if (!json.success) throw new Error(json.error || "Registration failed");
    setUser(json.user);
    return json.user;
  };

  // ── Login ───────────────────────────────────────────────────
  const login = async ({ email, name, password }) => {
    let res;
    try {
      res = await fetch(`${API}/login`, {
        method:      "POST",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({ email, name, password }),
      });
    } catch {
      throw new Error("Cannot reach server. Is the backend running?");
    }
    const json = await safeJson(res);
    if (!json) throw new Error(`Server error (${res.status})`);
    if (!json.success) throw new Error(json.error || "Login failed");
    setUser(json.user);
    return json.user;
  };

  // ── Google OAuth callback ───────────────────────────────────
  // After Google redirect, backend sets cookies — just fetch /me
  const handleOAuthCallback = async () => {
    const res  = await fetch(`${API}/me`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    const data = await safeJson(res);
    if (data?.success) setUser(data.user);
    else throw new Error("Failed to get user after OAuth");
  };

  // ── Logout ──────────────────────────────────────────────────
  const logout = async () => {
    try {
      await fetch(`${API}/logout`, {
        method:      "POST",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
      });
    } catch {}
    setUser(null);
  };

  // ── Update preferences ──────────────────────────────────────
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
    <AuthContext.Provider value={{ user, loading, login, logout, register, updatePreferences, authFetch, handleOAuthCallback }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}