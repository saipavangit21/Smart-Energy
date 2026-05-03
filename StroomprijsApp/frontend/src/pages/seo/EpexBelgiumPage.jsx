/**
 * pages/seo/EpexBelgiumPage.jsx
 * SEO landing: /epex-price-belgium  /belpex-price-today
 * Live EPEX price + chart + supplier prices + CTA
 */
import { useState, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext";
import LangSwitcher from "../../components/LangSwitcher";

const API = import.meta.env.VITE_API_URL || "https://smart-energy-production-aef3.up.railway.app";

const C = {
  bg:     "#060B14",
  card:   "#0D1626",
  border: "rgba(255,255,255,0.08)",
  teal:   "#0D9488",
  green:  "#059669",
  yellow: "#D97706",
  red:    "#DC2626",
  text:   "#E2E8F0",
  muted:  "#64748B",
};

function getPriceColor(mwh) {
  if (mwh < 0)   return "#00E5FF";
  if (mwh < 50)  return "#00C896";
  if (mwh < 90)  return "#84CC16";
  if (mwh < 130) return "#F59E0B";
  if (mwh < 160) return "#F97316";
  return "#EF4444";
}

function getPriceLabel(mwh) {
  if (mwh < 0)   return { emoji: "🤑", text: "Negative price" };
  if (mwh < 50)  return { emoji: "💚", text: "Very cheap" };
  if (mwh < 90)  return { emoji: "🟡", text: "Cheap" };
  if (mwh < 130) return { emoji: "🟠", text: "Moderate" };
  if (mwh < 160) return { emoji: "🔴", text: "Expensive" };
  return           { emoji: "⛔", text: "Peak price" };
}

const CONTENT = {
  en: {
    title: "EPEX Spot Belgium — Live Electricity Price",
    desc: "Real-time EPEX Spot day-ahead electricity price for Belgium. Updated every hour. Free.",
    currentLabel: "Current EPEX Spot Price",
    updated: "Updated",
    todayLabel: "Today's Range",
    min: "Min", avg: "Avg", max: "Max",
    cheapestTitle: "5 Cheapest Hours Today",
    cheapestDesc: "Best windows for EV charging, washing machine, dishwasher",
    faqTitle: "What is EPEX Spot Belgium?",
    faq1: "EPEX Spot is the European Power Exchange where electricity is traded on the wholesale day-ahead market. Belgian electricity prices (also called BELPEX) are set here each day for the following 24 hours.",
    faq2: "If you have a dynamic energy contract in Belgium, your cost per kWh changes every hour following these EPEX prices. SmartPrice.be tracks these prices in real-time so you know the cheapest hours to run your appliances.",
    faq3: "The price shown is the wholesale market price in €/MWh (€ per megawatt-hour). Your retail tariff from a supplier like Engie, Luminus or Bolt Energy will be higher due to grid costs, taxes and the supplier markup.",
    cta: "Compare all 7 Belgian supplier plans →",
    ctaSub: "Free plan comparison for your usage profile",
    metaDesc: "Live EPEX Spot electricity price for Belgium today. Updated hourly. Free comparison of all 7 Belgian energy suppliers.",
  },
  nl: {
    title: "EPEX Spot België — Live elektriciteitsprijs",
    desc: "Realtime EPEX Spot day-ahead elektriciteitsprijs voor België. Elk uur bijgewerkt. Gratis.",
    currentLabel: "Huidige EPEX Spot-prijs",
    updated: "Bijgewerkt",
    todayLabel: "Range vandaag",
    min: "Min", avg: "Gem", max: "Max",
    cheapestTitle: "5 goedkoopste uren vandaag",
    cheapestDesc: "Beste momenten voor EV-laden, wasmachine, vaatwasser",
    faqTitle: "Wat is EPEX Spot België?",
    faq1: "EPEX Spot is de Europese energiebeurs waar elektriciteit wordt verhandeld op de day-ahead groothandelsmarkt. De Belgische elektriciteitsprijzen (ook wel BELPEX genoemd) worden hier elke dag vastgesteld voor de volgende 24 uur.",
    faq2: "Als u een dynamisch energiecontract heeft in België, verandert uw kosten per kWh elk uur op basis van deze EPEX-prijzen. SmartPrice.be volgt deze prijzen in realtime zodat u weet wanneer u het goedkoopst uw toestellen kunt gebruiken.",
    faq3: "De getoonde prijs is de groothandelsprijs in €/MWh. Uw retailtarief bij een leverancier zoals Engie, Luminus of Bolt Energy is hoger door netkosten, belastingen en de leveranciersopslag.",
    cta: "Vergelijk alle 7 Belgische tarieven →",
    ctaSub: "Gratis tariefvergelijking voor uw verbruiksprofiel",
  },
  fr: {
    title: "EPEX Spot Belgique — Prix de l'électricité en direct",
    desc: "Prix EPEX Spot day-ahead en temps réel pour la Belgique. Mis à jour chaque heure. Gratuit.",
    currentLabel: "Prix EPEX Spot actuel",
    updated: "Mis à jour",
    todayLabel: "Plage d'aujourd'hui",
    min: "Min", avg: "Moy", max: "Max",
    cheapestTitle: "5 heures les moins chères aujourd'hui",
    cheapestDesc: "Meilleures plages pour recharger un VE, lave-linge, lave-vaisselle",
    faqTitle: "Qu'est-ce qu'EPEX Spot Belgique ?",
    faq1: "EPEX Spot est la bourse européenne de l'énergie où l'électricité est échangée sur le marché de gros day-ahead. Les prix de l'électricité belge (également appelés BELPEX) sont fixés chaque jour pour les 24 heures suivantes.",
    faq2: "Si vous avez un contrat d'énergie dynamique en Belgique, votre coût par kWh change chaque heure en suivant ces prix EPEX. SmartPrice.be suit ces prix en temps réel pour que vous sachiez quand faire tourner vos appareils.",
    faq3: "Le prix affiché est le prix de gros en €/MWh. Votre tarif de détail chez un fournisseur comme Engie, Luminus ou Bolt Energy sera plus élevé en raison des frais de réseau, des taxes et de la marge du fournisseur.",
    cta: "Comparer les 7 fournisseurs belges →",
    ctaSub: "Comparaison gratuite pour votre profil de consommation",
  },
};

export default function EpexBelgiumPage({ onGetStarted, onOpenCalculator }) {
  const { lang } = useLanguage();
  const T = CONTENT[lang] || CONTENT.en;

  useEffect(() => {
    document.title = "EPEX Spot Belgium — Live Electricity Price Today | SmartPrice.be";
    const desc = document.querySelector("meta[name='description']");
    if (desc) desc.setAttribute("content", "Live EPEX Spot electricity price for Belgium, updated every 15 minutes. See today's hourly chart, cheapest hours, and compare all Belgian suppliers.");
    const canonical = document.querySelector("link[rel='canonical']");
    if (canonical) canonical.setAttribute("href", "https://smartprice.be/epex-price-belgium");
    return () => { document.title = "SmartPrice.be — Belgium Real-Time Electricity & Gas Prices"; };
  }, []);

  const [prices, setPrices]   = useState([]);
  const [stats, setStats]     = useState(null);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cheapest, setCheapest] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/prices/today`).then(r => r.json()),
      fetch(`${API}/api/cheapest?hours=5`).then(r => r.json()),
    ]).then(([priceData, cheapData]) => {
      if (priceData.success) {
        const todayPrices = (priceData.data || []).filter(p => p.day === "today");
        setPrices(todayPrices);
        setStats(priceData.stats?.today);
        setCurrent(todayPrices.find(p => p.is_current) || todayPrices[todayPrices.length - 1]);
      }
      if (cheapData.success) setCheapest(cheapData.cheapest_hours || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const mwh = current?.price_eur_mwh;
  const col = mwh != null ? getPriceColor(mwh) : C.teal;
  const lbl = mwh != null ? getPriceLabel(mwh) : null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${C.border}`, padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(6,11,20,0.9)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 50 }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: C.text }}>
          <span style={{ fontSize: 20 }}>🇧🇪</span>
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.5px" }}>SmartPrice</span>
          <span style={{ fontSize: 9, color: C.teal, background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.25)", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>● LIVE</span>
        </a>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <LangSwitcher />
          <a href="/" onClick={e => { e.preventDefault(); onGetStarted(); }} style={{ padding: "8px 18px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: `linear-gradient(135deg,${C.teal},#1A56A4)`, color: "#fff", textDecoration: "none", cursor: "pointer" }}>Dashboard →</a>
        </div>
      </nav>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 20px" }}>

        {/* H1 */}
        <h1 style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 900, letterSpacing: "-1.5px", margin: "0 0 12px", lineHeight: 1.1 }}>
          <span style={{ background: `linear-gradient(135deg, #fff 30%, ${C.teal})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {T.title}
          </span>
        </h1>
        <p style={{ fontSize: 16, color: C.muted, margin: "0 0 40px", lineHeight: 1.7 }}>{T.desc}</p>

        {/* Current price hero */}
        <div style={{ background: `linear-gradient(135deg, ${col}14, ${col}06)`, border: `1px solid ${col}44`, borderRadius: 24, padding: "32px 36px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8, fontWeight: 700 }}>{T.currentLabel}</div>
            {loading ? (
              <div style={{ fontSize: 56, fontWeight: 900, color: C.muted }}>—</div>
            ) : mwh != null ? (
              <>
                <div style={{ fontSize: "clamp(48px,8vw,72px)", fontWeight: 900, fontFamily: "monospace", color: col, lineHeight: 1 }}>
                  €{mwh.toFixed(1)}
                </div>
                <div style={{ fontSize: 16, color: col, marginTop: 6 }}>{lbl?.emoji} {lbl?.text} · /MWh</div>
              </>
            ) : (
              <div style={{ fontSize: 32, color: C.muted }}>—</div>
            )}
            {current && (
              <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{T.updated} {new Date(current.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
            )}
          </div>
          {stats && (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { label: T.min, value: stats.min?.toFixed(1), color: C.green },
                { label: T.avg, value: stats.avg?.toFixed(1), color: C.yellow },
                { label: T.max, value: stats.max?.toFixed(1), color: C.red },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: "monospace" }}>€{s.value}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>/MWh</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hourly bar chart */}
        {prices.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "20px 24px", marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: C.muted }}>{T.todayLabel} · Belgium EPEX Spot</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 80, overflow: "hidden" }}>
              {prices.filter((_, i) => i % 1 === 0).map((p, i) => {
                const maxP = Math.max(...prices.map(x => x.price_eur_mwh));
                const h = Math.max(4, (p.price_eur_mwh / maxP) * 80);
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <div title={`${p.hour_label} — €${p.price_eur_mwh?.toFixed(1)}/MWh`} style={{ width: "100%", height: h, background: p.is_current ? "#fff" : getPriceColor(p.price_eur_mwh), borderRadius: "3px 3px 0 0", opacity: p.is_current ? 1 : 0.7 }} />
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.muted, marginTop: 6 }}>
              <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
            </div>
          </div>
        )}

        {/* Cheapest hours */}
        {cheapest.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "20px 24px", marginBottom: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>💚 {T.cheapestTitle}</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>{T.cheapestDesc}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {cheapest.slice(0, 5).map((h, i) => {
                const ts = new Date(h.timestamp);
                const col2 = getPriceColor(h.price_eur_mwh);
                return (
                  <div key={i} style={{ flex: 1, minWidth: 100, background: `${col2}10`, border: `1px solid ${col2}30`, borderRadius: 14, padding: "12px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>#{i + 1}</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{ts.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: col2, fontFamily: "monospace", marginTop: 4 }}>€{h.price_eur_mwh.toFixed(1)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ background: `linear-gradient(135deg, rgba(13,148,136,0.12), rgba(26,86,164,0.08))`, border: `1px solid rgba(13,148,136,0.3)`, borderRadius: 20, padding: "28px 32px", marginBottom: 40, textAlign: "center" }}>
          <button onClick={() => onOpenCalculator && onOpenCalculator("electricity")} style={{ padding: "14px 32px", borderRadius: 50, fontSize: 16, fontWeight: 800, background: `linear-gradient(135deg,${C.teal},#1A56A4)`, border: "none", color: "#fff", cursor: "pointer", marginBottom: 8 }}>
            {T.cta}
          </button>
          <div style={{ fontSize: 12, color: C.muted }}>{T.ctaSub}</div>
        </div>

        {/* FAQ / SEO content */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24, color: C.teal }}>{T.faqTitle}</h2>
          {[T.faq1, T.faq2, T.faq3].map((p, i) => (
            <p key={i} style={{ fontSize: 15, color: C.muted, lineHeight: 1.8, marginBottom: 20 }}>{p}</p>
          ))}
        </div>

        {/* Schema.org structured data for SEO */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "EPEX Spot Belgium — Live Electricity Price",
          "description": "Real-time EPEX Spot day-ahead electricity price for Belgium. Updated every hour.",
          "url": "https://smartprice.be/epex-price-belgium",
          "publisher": { "@type": "Organization", "name": "SmartPrice.be", "url": "https://smartprice.be" },
        })}} />

        <div style={{ textAlign: "center", fontSize: 11, color: C.muted, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
          Data: Energy-Charts.info · Elia Open Data (CC BY 4.0) · Prices refresh every 15 min · Not financial advice
          {" · "}<a href="/" style={{ color: C.teal }}>SmartPrice.be</a>
        </div>
      </div>
    </div>
  );
}