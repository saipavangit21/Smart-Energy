/**
 * context/ThemeContext.jsx
 * Light / Dark theme toggle for SmartPrice.be
 */
import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext({ theme: "dark", toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("sp_theme") || "dark";
  });

  useEffect(() => {
    localStorage.setItem("sp_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    document.body.style.background = theme === "light" ? "#F8FAFC" : "#060B14";
    document.body.style.color = theme === "light" ? "#1E293B" : "#E2E8F0";
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

// Returns the right color based on current theme
export function useColors() {
  const { theme } = useTheme();
  const dark = {
    bg:        "#060B14",
    bg2:       "#0A1220",
    card:      "#0D1626",
    card2:     "#0F1A2E",
    border:    "rgba(255,255,255,0.08)",
    border2:   "rgba(255,255,255,0.12)",
    text:      "#E2E8F0",
    muted:     "#64748B",
    soft:      "#94A3B8",
    teal:      "#0D9488",
    green:     "#00C896",
    yellow:    "#F59E0B",
    red:       "#EF4444",
    orange:    "#F97316",
    blue:      "#3B82F6",
    cyan:      "#06B6D4",
    navBg:     "rgba(6,11,20,0.95)",
    inputBg:   "rgba(255,255,255,0.06)",
    inputBorder: "rgba(255,255,255,0.12)",
    shadow:    "0 8px 32px rgba(0,0,0,0.4)",
  };
  const light = {
    bg:        "#F8FAFC",
    bg2:       "#F1F5F9",
    card:      "#FFFFFF",
    card2:     "#F8FAFC",
    border:    "rgba(0,0,0,0.09)",
    border2:   "rgba(0,0,0,0.14)",
    text:      "#1E293B",
    muted:     "#64748B",
    soft:      "#475569",
    teal:      "#0D9488",
    green:     "#059669",
    yellow:    "#D97706",
    red:       "#DC2626",
    orange:    "#EA580C",
    blue:      "#2563EB",
    cyan:      "#0891B2",
    navBg:     "rgba(248,250,252,0.95)",
    inputBg:   "#FFFFFF",
    inputBorder: "rgba(0,0,0,0.15)",
    shadow:    "0 8px 32px rgba(0,0,0,0.12)",
  };
  return theme === "light" ? light : dark;
}