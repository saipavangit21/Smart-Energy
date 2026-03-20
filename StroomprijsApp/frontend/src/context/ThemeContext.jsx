/**
 * context/ThemeContext.jsx
 * Light / Dark theme toggle using CSS class injection
 */
import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext({ theme: "dark", toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("sp_theme") || "dark"; } catch { return "dark"; }
  });

  useEffect(() => {
    try { localStorage.setItem("sp_theme", theme); } catch {}
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);

    if (theme === "light") {
      document.body.style.cssText = "background:#F8FAFC!important;color:#1E293B!important;";
      const el = document.getElementById("root");
      if (el) el.style.cssText = "background:#F8FAFC!important;color:#1E293B!important;";
    } else {
      document.body.style.cssText = "background:#060B14;color:#E2E8F0;";
      const el = document.getElementById("root");
      if (el) el.style.cssText = "";
    }
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() { return useContext(ThemeContext); }

export function useColors() {
  const { theme } = useTheme();
  return theme === "light" ? {
    bg: "#F8FAFC", bg2: "#F1F5F9", card: "#FFFFFF",
    border: "rgba(0,0,0,0.09)", text: "#1E293B", muted: "#64748B",
    soft: "#475569", teal: "#0D9488", green: "#059669",
    yellow: "#D97706", red: "#DC2626", orange: "#EA580C",
    blue: "#2563EB", cyan: "#0891B2",
    navBg: "rgba(248,250,252,0.97)",
    inputBg: "#FFFFFF", shadow: "0 8px 32px rgba(0,0,0,0.1)",
  } : {
    bg: "#060B14", bg2: "#0A1220", card: "#0D1626",
    border: "rgba(255,255,255,0.08)", text: "#E2E8F0", muted: "#64748B",
    soft: "#94A3B8", teal: "#0D9488", green: "#00C896",
    yellow: "#F59E0B", red: "#EF4444", orange: "#F97316",
    blue: "#3B82F6", cyan: "#06B6D4",
    navBg: "rgba(6,11,20,0.95)",
    inputBg: "rgba(255,255,255,0.06)", shadow: "0 8px 32px rgba(0,0,0,0.4)",
  };
}