/**
 * pages/seo/CheapestHoursPage.jsx
 * SEO landing: /cheapest-electricity-hours-belgium
 * Targets EV drivers, smart home users
 */
import { useState, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext";
import LangSwitcher from "../../components/LangSwitcher";

const API = import.meta.env.VITE_API_URL || "https://smart-energy-production-aef3.up.railway.app";

const C = {
  bg: "#060B14", card: "#0D1626", border: "rgba(255,255,255,0.08)",
  teal: "#0D9488", green: "#059669", yellow: "#D97706", red: "#DC2626",
  text: "#E2E8F0", muted: "#64748B",
};

function getPriceColor(mwh) {
  if (mwh < 0)   return "#00E5FF";
  if (mwh < 50)  return "#00C896";
  if (mwh < 90)  return "#84CC16";
  if (mwh < 130) return "#F59E0B";
  if (mwh < 160) return "#F97316";
  return "#EF4444";
}

const APPLIANCES = [
  { icon: "🚗", name: { en: "EV Charging (7.4kW)", nl: "EV laden (7,4kW)", fr: "Charge VE (7,4kW)" }, kw: 7.4 },
  { icon: "👕", name: { en: "Washing Machine", nl: "Wasmachine", fr: "Lave-linge" }, kw: 2.0 },
  { icon: "🍽️", name: { en: "Dishwasher", nl: "Vaatwasser", fr: "Lave-vaisselle" }, kw: 1.8 },
  { icon: "🌀", name: { en: "Tumble Dryer", nl: "Droogkast", fr: "Sèche-linge" }, kw: 2.5 },
  { icon: "🌡️", name: { en: "Heat Pump", nl: "Warmtepomp", fr: "Pompe à chaleur" }, kw: 3.5 },
];

const CONTENT = {
  en: {
    title: "Cheapest Electricity Hours Belgium — Today",
    desc: "Find the cheapest hours to run your EV, washing machine, dishwasher or heat pump in Belgium. Based on live EPEX Spot prices. Updated every hour.",
    upcomingTitle: "Best Hours to Run Appliances",
    upcomingDesc: "Upcoming cheapest windows based on live EPEX Spot prices",
    savingsTitle: "How Much Can You Save?",
    savingsDesc: "Running high-consumption appliances at the cheapest vs most expensive hours:",
    perCycle: "per cycle",
    perYear: "per year",
    faqTitle: "When are electricity prices cheapest in Belgium?",
    faq1: "In Belgium, electricity prices on the EPEX Spot market are typically cheapest between midnight and 6am, and around midday when solar generation peaks. Prices spike in the morning (7-9am) and evening (17-21h) when demand is highest.",
    faq2: "If you have a dynamic electricity contract (Bolt Energy Dynamic, for example), your cost per kWh follows these hourly EPEX prices directly. Running a washing machine at 2am instead of 7pm can save 30-50% on that cycle.",
    faq3: "EV drivers save the most — charging a 60kWh battery at the cheapest hour vs the peak hour can save €5-12 per charge depending on the day's price spread.",
    cta: "Compare dynamic electricity plans →",
    ctaSub: "See if a dynamic plan saves you money based on your usage",
  },
  nl: {
    title: "Goedkoopste elektriciteitsprijzen België — Vandaag",
    desc: "Vind de goedkoopste uren om uw EV, wasmachine, vaatwasser of warmtepomp te gebruiken in België. Op basis van live EPEX Spot-prijzen. Elk uur bijgewerkt.",
    upcomingTitle: "Beste uren om toestellen te gebruiken",
    upcomingDesc: "Komende goedkoopste vensters op basis van live EPEX Spot-prijzen",
    savingsTitle: "Hoeveel kunt u besparen?",
    savingsDesc: "Toestellen gebruiken op het goedkoopste vs duurste uur:",
    perCycle: "per cyclus",
    perYear: "per jaar",
    faqTitle: "Wanneer zijn de elektriciteitsprijzen het goedkoopst in België?",
    faq1: "In België zijn de elektriciteitsprijzen op de EPEX Spot-markt doorgaans het goedkoopst tussen middernacht en 6 uur 's ochtends, en rond het middaguur wanneer de zonne-energie piekt. Prijzen stijgen in de ochtend (7-9u) en avond (17-21u) wanneer de vraag het hoogst is.",
    faq2: "Als u een dynamisch elektriciteitscontract heeft (zoals Bolt Energy Dynamic), volgen uw kosten per kWh deze uurprijzen direct. Een wasmachine draaien om 2 uur 's nachts in plaats van 19 uur kan 30-50% besparen op die cyclus.",
    faq3: "EV-rijders besparen het meest — een accu van 60kWh opladen op het goedkoopste uur vs het pieknuur kan €5-12 per laadbeurt besparen, afhankelijk van de prijsspreiding van die dag.",
    cta: "Vergelijk dynamische elektriciteitsplannen →",
    ctaSub: "Bekijk of een dynamisch plan u geld bespaart op basis van uw verbruik",
  },
  fr: {
    title: "Heures les moins chères en Belgique — Aujourd'hui",
    desc: "Trouvez les heures les moins chères pour charger votre VE, lancer votre lave-linge, lave-vaisselle ou pompe à chaleur en Belgique. Basé sur les prix EPEX Spot en direct. Mis à jour toutes les heures.",
    upcomingTitle: "Meilleures heures pour faire tourner les appareils",
    upcomingDesc: "Prochaines plages les moins chères selon les prix EPEX Spot en direct",
    savingsTitle: "Combien pouvez-vous économiser ?",
    savingsDesc: "Faire tourner des appareils à forte consommation à l'heure la moins chère vs la plus chère :",
    perCycle: "par cycle",
    perYear: "par an",
    faqTitle: "Quand l'électricité est-elle la moins chère en Belgique ?",
    faq1: "En Belgique, les prix de l'électricité sur le marché EPEX Spot sont généralement les plus bas entre minuit et 6h du matin, et vers midi lorsque la production solaire est à son pic. Les prix grimpent le matin (7h-9h) et le soir (17h-21h) quand la demande est la plus forte.",
    faq2: "Si vous avez un contrat d'électricité dynamique (comme Bolt Energy Dynamic), votre coût par kWh suit directement ces prix horaires. Faire tourner un lave-linge à 2h du matin plutôt qu'à 19h peut économiser 30 à 50% sur ce cycle.",
    faq3: "Les conducteurs de VE économisent le plus — charger une batterie de 60kWh à l'heure la moins chère vs l'heure de pointe peut économiser 5 à 12€ par charge selon l'écart de prix de la journée.",
    cta: "Comparer les plans d'électricité dynamiques →",
    ctaSub: "Voir si un plan dynamique vous fait économiser selon votre consommation",
  },
};

export default function CheapestHoursPage({ onGetStarted, onOpenCalculator }) {
  const { lang } = useLanguage();
  const T = CONTENT[lang] || CONTENT.en;

  const [cheapest, setCheapest]   = useState([]);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/cheapest?hours=8`).then(r => r.json()),
      fetch(`${API}/api/prices/today`).then(r => r.json()),
    ]).then(([cheap, prices]) => {
      if (cheap.success) setCheapest(cheap.cheapest_hours || []);
      if (prices.success) setStats(prices.stats?.today);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const spread = stats ? (stats.max - stats.min) / 1000 : null; // €/kWh spread

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${C.border}`, padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(6,11,20,0.9)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 50 }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: C.text }}>
          <span>🇧🇪</span>
          <span style={{ fontSize: 16, fontWeight: 900 }}>SmartPrice</span>
          <span style={{ fontSize: 9, color: C.teal, background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.25)", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>● LIVE</span>
        </a>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <LangSwitcher />
          <a href="/" onClick={e => { e.preventDefault(); onGetStarted(); }} style={{ padding: "8px 18px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: `linear-gradient(135deg,${C.teal},#1A56A4)`, color: "#fff", textDecoration: "none" }}>Dashboard →</a>
        </div>
      </nav>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 20px" }}>

        <h1 style={{ fontSize: "clamp(26px,5vw,48px)", fontWeight: 900, letterSpacing: "-1.5px", margin: "0 0 12px", lineHeight: 1.1 }}>
          <span style={{ background: `linear-gradient(135deg,#fff 30%,${C.green})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {T.title}
          </span>
        </h1>
        <p style={{ fontSize: 16, color: C.muted, margin: "0 0 40px", lineHeight: 1.7 }}>{T.desc}</p>

        {/* Cheapest hours grid */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "24px", marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>💚 {T.upcomingTitle}</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>{T.upcomingDesc}</div>
          {loading ? (
            <div style={{ color: C.muted, textAlign: "center", padding: 40 }}>Loading…</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
              {cheapest.slice(0, 8).map((h, i) => {
                const ts = new Date(h.timestamp);
                const col2 = getPriceColor(h.price_eur_mwh);
                const isNow = new Date(h.timestamp) <= new Date() && new Date() < new Date(new Date(h.timestamp).getTime() + 3600000);
                return (
                  <div key={i} style={{ background: `${col2}10`, border: `1px solid ${col2}${isNow ? "88" : "30"}`, borderRadius: 14, padding: "14px 16px", position: "relative" }}>
                    {isNow && <span style={{ position: "absolute", top: -8, right: 10, fontSize: 9, background: col2, color: "#fff", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>NOW</span>}
                    <div style={{ fontSize: 12, color: C.muted }}>{ts.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, margin: "4px 0" }}>{ts.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: col2, fontFamily: "monospace" }}>€{h.price_eur_mwh.toFixed(1)}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>/MWh</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>#{i + 1} cheapest</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Savings calculator */}
        {spread && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "24px", marginBottom: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>💰 {T.savingsTitle}</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>{T.savingsDesc}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {APPLIANCES.map(a => {
                const savingPerCycle = (spread * a.kw).toFixed(2);
                const savingPerYear = ((spread * a.kw) * 100).toFixed(0); // ~100 cycles/yr est
                return (
                  <div key={a.icon} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(255,255,255,0.02)", borderRadius: 12, border: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{a.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{a.name[lang] || a.name.en}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{a.kw} kW peak</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: C.green, fontFamily: "monospace" }}>€{savingPerCycle} <span style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}>{T.perCycle}</span></div>
                      <div style={{ fontSize: 11, color: C.muted }}>~€{savingPerYear} {T.perYear}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ background: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.25)", borderRadius: 20, padding: "28px 32px", marginBottom: 40, textAlign: "center" }}>
          <button onClick={() => onOpenCalculator && onOpenCalculator("electricity")} style={{ padding: "14px 32px", borderRadius: 50, fontSize: 16, fontWeight: 800, background: `linear-gradient(135deg,${C.teal},#1A56A4)`, border: "none", color: "#fff", cursor: "pointer", marginBottom: 8 }}>
            {T.cta}
          </button>
          <div style={{ fontSize: 12, color: C.muted }}>{T.ctaSub}</div>
        </div>

        {/* FAQ */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 40 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20, color: C.teal }}>{T.faqTitle}</h2>
          {[T.faq1, T.faq2, T.faq3].map((p, i) => (
            <p key={i} style={{ fontSize: 15, color: C.muted, lineHeight: 1.8, marginBottom: 20 }}>{p}</p>
          ))}
        </div>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org", "@type": "WebPage",
          "name": "Cheapest Electricity Hours Belgium",
          "description": "Find the cheapest hours to run your EV, washing machine, dishwasher or heat pump in Belgium.",
          "url": "https://smartprice.be/cheapest-electricity-hours-belgium",
        })}} />

        <div style={{ textAlign: "center", fontSize: 11, color: C.muted, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
          Data: Energy-Charts.info · Elia Open Data (CC BY 4.0) · Prices refresh every 15 min · Not financial advice
          {" · "}<a href="/" style={{ color: C.teal }}>SmartPrice.be</a>
        </div>
      </div>
    </div>
  );
}