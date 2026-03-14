/**
 * context/LanguageContext.jsx
 * Provides language switching across the whole app.
 * Persists selection to localStorage.
 */

import { createContext, useContext, useState, useCallback } from "react";
import { translations, SUPPORTED_LANGS, DEFAULT_LANG } from "../i18n";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem("sp_lang");
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
    // Auto-detect browser language
    const browser = navigator.language?.slice(0, 2).toLowerCase();
    if (browser === "nl") return "nl";
    if (browser === "fr") return "fr";
    return DEFAULT_LANG;
  });

  const setLang = useCallback((l) => {
    if (SUPPORTED_LANGS.includes(l)) {
      setLangState(l);
      localStorage.setItem("sp_lang", l);
    }
  }, []);

  // t("common.signIn") or t("dashboard.live")
  const t = useCallback((key) => {
    const [section, field] = key.split(".");
    return translations[section]?.[lang]?.[field]
      ?? translations[section]?.["en"]?.[field]
      ?? key;
  }, [lang]);

  // tSection("dashboard") → full object for that section+lang
  const tSection = useCallback((section) => {
    return translations[section]?.[lang] ?? translations[section]?.["en"] ?? {};
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tSection }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}