/**
 * components/SmartAgent.jsx
 * SmartPrice AI Agent — floating chat widget
 * Uses Anthropic API with live EPEX price context
 * Answers questions about electricity prices, EV charging, suppliers, Belgium energy
 */
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "../context/LanguageContext";

const API = "";

const SUGGESTED = {
  en: [
    "What's the current electricity price?",
    "When is the cheapest time to charge my EV today?",
    "Which Belgian supplier is cheapest right now?",
    "How do I save on my energy bill?",
  ],
  nl: [
    "Wat is de huidige stroomprijs?",
    "Wanneer is het goedkoopst om mijn EV te laden?",
    "Welke Belgische leverancier is nu het goedkoopst?",
    "Hoe bespaar ik op mijn energiefactuur?",
  ],
  fr: [
    "Quel est le prix actuel de l'électricité ?",
    "Quand est-il le moins cher de charger mon VE ?",
    "Quel fournisseur belge est le moins cher ?",
    "Comment réduire ma facture d'énergie ?",
  ],
};

const LABELS = {
  en: { title: "SmartPrice Assistant", subtitle: "Ask me anything about Belgian energy", placeholder: "Ask about prices, EV charging, suppliers...", thinking: "Thinking...", poweredBy: "Powered by Claude AI" },
  nl: { title: "SmartPrice Assistent", subtitle: "Stel me alles over Belgische energie", placeholder: "Vraag over prijzen, EV laden, leveranciers...", thinking: "Bezig...", poweredBy: "Aangedreven door Claude AI" },
  fr: { title: "Assistant SmartPrice", subtitle: "Posez-moi des questions sur l'énergie belge", placeholder: "Questions sur les prix, la recharge VE...", thinking: "En cours...", poweredBy: "Propulsé par Claude AI" },
};

export default function SmartAgent() {
  const { lang } = useLanguage();
  const L = LABELS[lang] || LABELS.en;
  const suggestions = SUGGESTED[lang] || SUGGESTED.en;

  const [open,       setOpen]       = useState(false);
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [context,    setContext]    = useState(null);
  const [pulse,      setPulse]      = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Stop pulsing after 6 seconds
  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 6000);
    return () => clearTimeout(t);
  }, []);

  // Fetch live price context once
  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/current`, { credentials: "include" }).then(r => r.json()).catch(() => null),
      fetch(`${API}/api/prices/today`, { credentials: "include" }).then(r => r.json()).catch(() => null),
      fetch(`${API}/api/cheapest?hours=5`, { credentials: "include" }).then(r => r.json()).catch(() => null),
    ]).then(([cur, today, cheap]) => {
      setContext({
        currentPrice: cur?.current?.price_eur_mwh,
        todayStats: today?.stats?.today,
        cheapestHours: cheap?.cheapest_hours?.slice(0, 3),
      });
    });
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  const buildSystemPrompt = () => {
    const price = context?.currentPrice;
    const stats = context?.todayStats;
    const cheap = context?.cheapestHours;
    return [
      "You are SmartPrice.be's energy assistant for Belgium.",
      "You help users understand electricity prices, EV charging, and energy saving tips.",
      "Always answer in the same language the user writes in (NL/FR/EN).",
      "Be concise — 2-4 sentences unless the user asks for detail.",
      price != null
        ? `Current EPEX Spot price: €${price.toFixed(1)}/MWh (€${(price/1000).toFixed(4)}/kWh).`
        : "Current price data is temporarily unavailable.",
      stats
        ? `Today's range: min €${stats.min}/MWh, max €${stats.max}/MWh, avg €${stats.avg}/MWh.`
        : "",
      cheap?.length
        ? `Cheapest upcoming hours: ${cheap.map(h => new Date(h.timestamp).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" }) + " €" + h.price_eur_mwh.toFixed(0)).join(", ")}.`
        : "",
      "Belgium uses EPEX Spot day-ahead prices. Retail = spot + grid + taxes (typically €0.08-0.12/kWh on top).",
      "Do not make up prices. If you don't know, say so.",
    ].filter(Boolean).join(" ");
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          systemPrompt: buildSystemPrompt(),
        }),
      });
      const data = await response.json();
      if (data.unavailable) {
        setUnavailable(true);
        setMessages([...newMessages, { role: "assistant", content: "⚠️ AI assistant is temporarily unavailable. Please try again later." }]);
      } else {
        const reply = data.reply || "Sorry, I couldn't get a response.";
        setMessages([...newMessages, { role: "assistant", content: reply }]);
      }
    } catch (e) {
      setMessages([...newMessages, { role: "assistant", content: "Connection error — please check your internet and try again." }]);
    }
    setLoading(false);
  };

  const C = {
    bg: "#060B14", card: "#0D1626", border: "rgba(255,255,255,0.08)",
    teal: "#0D9488", green: "#00C896", text: "#E2E8F0", muted: "#64748B",
  };

  return (
    <>
      {/* Chat window */}
      {open && (
        <div style={{
          position: "fixed", bottom: 88, right: 16, zIndex: 9998,
          width: 360, maxWidth: "calc(100vw - 32px)",
          background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          display: "flex", flexDirection: "column", maxHeight: 520,
          animation: "agent-slide-in 0.25s ease-out",
        }}>
          {/* Unavailable banner */}
          {unavailable && (
            <div style={{ background: "rgba(245,158,11,0.12)", borderBottom: "1px solid rgba(245,158,11,0.25)", padding: "8px 16px", borderRadius: "20px 20px 0 0", fontSize: 11, color: "#F59E0B", textAlign: "center" }}>
              ⚠️ AI assistant temporarily offline
            </div>
          )}

          {/* Header */}
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: unavailable ? "transparent" : "rgba(13,148,136,0.06)", borderRadius: unavailable ? "0" : "20px 20px 0 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#0D9488,#1A56A4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚡</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{L.title}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{L.subtitle}</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, padding: "4px 10px", color: C.muted, cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Welcome */}
            {messages.length === 0 && (
              <div>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "4px 14px 14px 14px", padding: "10px 14px", maxWidth: "85%" }}>
                  <p style={{ fontSize: 13, color: C.text, margin: 0, lineHeight: 1.6 }}>
                    👋 Hi! I'm your SmartPrice assistant.
                    {context?.currentPrice != null && (
                      <> Current electricity price: <strong style={{ color: "#00C896" }}>€{context.currentPrice.toFixed(1)}/MWh</strong>.</>
                    )}
                    {" "}How can I help?
                  </p>
                </div>
                {/* Suggestions */}
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => sendMessage(s)} style={{
                      textAlign: "left", padding: "8px 12px", borderRadius: 20,
                      background: "rgba(13,148,136,0.06)", border: "1px solid rgba(13,148,136,0.2)",
                      color: C.teal, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(13,148,136,0.12)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(13,148,136,0.06)"; }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message history */}
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "85%", padding: "10px 14px",
                  borderRadius: m.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                  background: m.role === "user" ? "linear-gradient(135deg,#0D9488,#1A56A4)" : C.card,
                  border: m.role === "user" ? "none" : `1px solid ${C.border}`,
                  fontSize: 13, color: C.text, lineHeight: 1.6,
                }}>
                  {m.content}
                </div>
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "4px 14px 14px 14px", padding: "10px 16px", fontSize: 13, color: C.muted }}>
                  <span style={{ animation: "dots 1.4s infinite" }}>●</span>
                  <span style={{ animation: "dots 1.4s 0.2s infinite" }}>●</span>
                  <span style={{ animation: "dots 1.4s 0.4s infinite" }}>●</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
                placeholder={L.placeholder}
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 20,
                  background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`,
                  color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none",
                }}
              />
              <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading} style={{
                width: 38, height: 38, borderRadius: "50%", border: "none",
                background: input.trim() && !loading ? "linear-gradient(135deg,#0D9488,#1A56A4)" : "rgba(255,255,255,0.06)",
                color: "#fff", cursor: input.trim() && !loading ? "pointer" : "default",
                fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s", flexShrink: 0,
              }}>→</button>
            </div>
            <div style={{ fontSize: 10, color: "#334", textAlign: "center", marginTop: 8 }}>{L.poweredBy}</div>
          </div>
        </div>
      )}

      {/* FAB button */}
      <button onClick={() => { setOpen(o => !o); setPulse(false); }} style={{
        position: "fixed", bottom: 24, right: 16, zIndex: 9998,
        width: 56, height: 56, borderRadius: "50%", border: "none",
        background: open ? "#0D1626" : "linear-gradient(135deg,#0D9488,#1A56A4)",
        color: "#fff", cursor: "pointer", fontSize: 24,
        boxShadow: "0 4px 20px rgba(13,148,136,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.2s",
        animation: pulse && !open ? "agent-pulse 2s ease-in-out infinite" : "none",
      }}>
        {open ? "✕" : "⚡"}
      </button>

      <style>{`
        @keyframes agent-slide-in {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes agent-pulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(13,148,136,0.5); }
          50%       { box-shadow: 0 4px 32px rgba(13,148,136,0.9), 0 0 0 8px rgba(13,148,136,0.15); }
        }
        @keyframes dots {
          0%, 80%, 100% { opacity: 0.3; }
          40%           { opacity: 1; }
        }
      `}</style>
    </>
  );
}