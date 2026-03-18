/**
 * components/ThemeSwitcher.jsx
 * Light/dark toggle button — sits next to LangSwitcher
 */
import { useTheme } from "../context/ThemeContext";

export default function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: 20, cursor: "pointer",
        fontSize: 12, fontWeight: 700,
        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
        border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.12)",
        color: isDark ? "#94A3B8" : "#475569",
        transition: "all 0.2s",
      }}
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}