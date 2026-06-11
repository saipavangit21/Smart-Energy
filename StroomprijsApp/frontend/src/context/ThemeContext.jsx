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
      document.body.style.cssText = "background:#FFFBF0!important;color:#1A1200!important;";
      const el = document.getElementById("root");
      if (el) el.style.cssText = "background:#FFFBF0!important;color:#1A1200!important;";
    } else {
      document.body.style.cssText = "background:#07090D;color:#F0E8D0;";
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
    bg: "#FFFBF0", bg2: "#FEF3D0", card: "#FFFFFF",
    border: "rgba(0,0,0,0.09)", text: "#1A1200", muted: "#6B5C3E",
    soft: "#5C4A2A", teal: "#C07A00", green: "#059669",
    yellow: "#C07A00", red: "#D91E37", orange: "#EA580C",
    blue: "#2563EB", cyan: "#0891B2",
    navBg: "rgba(255,251,240,0.97)",
    inputBg: "#FFFFFF", shadow: "0 8px 32px rgba(0,0,0,0.1)",
  } : {
    bg: "#07090D", bg2: "#0F0C05", card: "#100E06",
    border: "rgba(255,210,100,0.1)", text: "#F0E8D0", muted: "#8A7A5A",
    soft: "#B8A07A", teal: "#F5A623", green: "#00C896",
    yellow: "#F5A623", red: "#EF233C", orange: "#F97316",
    blue: "#3B82F6", cyan: "#06B6D4",
    navBg: "rgba(7,9,13,0.97)",
    inputBg: "rgba(245,166,35,0.06)", shadow: "0 8px 32px rgba(0,0,0,0.5)",
  };
}