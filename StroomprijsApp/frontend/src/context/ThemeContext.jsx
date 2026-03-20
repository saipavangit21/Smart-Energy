/**
 * context/ThemeContext.jsx
 * Light / Dark theme toggle — uses CSS variables for instant color switching
 */
import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext({ theme: "dark", toggleTheme: () => {} });

const DARK = {
  "--sp-bg":        "#060B14",
  "--sp-bg2":       "#0A1220",
  "--sp-card":      "#0D1626",
  "--sp-border":    "rgba(255,255,255,0.08)",
  "--sp-text":      "#E2E8F0",
  "--sp-muted":     "#64748B",
  "--sp-soft":      "#94A3B8",
  "--sp-nav-bg":    "rgba(6,11,20,0.95)",
  "--sp-input-bg":  "rgba(255,255,255,0.06)",
  "--sp-shadow":    "0 8px 32px rgba(0,0,0,0.4)",
  "--sp-teal":      "#0D9488",
  "--sp-green":     "#00C896",
};

const LIGHT = {
  "--sp-bg":        "#F8FAFC",
  "--sp-bg2":       "#F1F5F9",
  "--sp-card":      "#FFFFFF",
  "--sp-border":    "rgba(0,0,0,0.09)",
  "--sp-text":      "#1E293B",
  "--sp-muted":     "#64748B",
  "--sp-soft":      "#475569",
  "--sp-nav-bg":    "rgba(248,250,252,0.97)",
  "--sp-input-bg":  "#FFFFFF",
  "--sp-shadow":    "0 8px 32px rgba(0,0,0,0.1)",
  "--sp-teal":      "#0D9488",
  "--sp-green":     "#059669",
};

function applyTheme(theme) {
  const vars = theme === "light" ? LIGHT : DARK;
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.setAttribute("data-theme", theme);
  document.body.style.background = vars["--sp-bg"];
  document.body.style.color = vars["--sp-text"];
  document.body.style.transition = "background 0.3s, color 0.3s";
  const rootEl = document.getElementById("root");
  if (rootEl) {
    rootEl.style.background = vars["--sp-bg"];
    rootEl.style.color = vars["--sp-text"];
  }
  // Force reflow for immediate visual update
  document.body.offsetHeight;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("sp_theme") || "dark";
    applyTheme(saved);
    return saved;
  });

  useEffect(() => {
    localStorage.setItem("sp_theme", theme);
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

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