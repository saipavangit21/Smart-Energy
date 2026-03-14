/**
 * components/LangSwitcher.jsx
 * Compact EN / NL / FR pill switcher for header
 */

import { useLanguage } from "../context/LanguageContext";
import { SUPPORTED_LANGS, LANG_LABELS } from "../i18n";

export default function LangSwitcher({ style = {} }) {
  const { lang, setLang } = useLanguage();

  return (
    <div style={{
      display: "flex",
      background: "rgba(0,0,0,0.3)",
      borderRadius: 20,
      padding: 2,
      gap: 1,
      ...style,
    }}>
      {SUPPORTED_LANGS.map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          style={{
            padding: "4px 10px",
            borderRadius: 18,
            fontSize: 12,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            transition: "all 0.15s",
            background: lang === l ? "rgba(13,148,136,0.9)" : "transparent",
            color: lang === l ? "#fff" : "#64748B",
            letterSpacing: "0.5px",
          }}
        >
          {LANG_LABELS[l]}
        </button>
      ))}
    </div>
  );
}