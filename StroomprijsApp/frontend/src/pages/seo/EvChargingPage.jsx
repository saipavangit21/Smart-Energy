/**
 * pages/seo/EvChargingPage.jsx
 * Route: /ev-charging-belgium
 * SEO target: "cheap EV charging Belgium", "best time to charge EV Belgium"
 * Live EPEX + best windows + battery cost calculator + home charger tips
 */
import { useState, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext";
import LangSwitcher from "../../components/LangSwitcher";

const API = import.meta.env.VITE_API_URL || "https://smart-energy-production-aef3.up.railway.app";

const C = {
  bg:     "#060B14",
  card:   "#0A1220",
  card2:  "#0D1626",
  border: "rgba(255,255,255,0.07)",
  teal:   "#0D9488",
  green:  "#00C896",
  yellow: "#F59E0B",
  red:    "#EF4444",
  blue:   "#3B82F6",
  cyan:   "#06B6D4",
  text:   "#E2E8F0",
  muted:  "#64748B",
  soft:   "#94A3B8",
};

function getPriceColor(mwh) {
  if (mwh == null) return C.muted;
  if (mwh < 0)   return "#00E5FF";
  if (mwh < 50)  return "#00C896";
  if (mwh < 90)  return "#84CC16";
  if (mwh < 130) return "#F59E0B";
  if (mwh < 160) return "#F97316";
  return "#EF4444";
}

function getPriceTier(mwh) {
  if (mwh == null) return { label: "â€”", emoji: "â³" };
  if (mwh < 0)   return { label: "Negative!", emoji: "ðŸ¤‘" };
  if (mwh < 50)  return { label: "Very cheap", emoji: "ðŸ’š" };
  if (mwh < 90)  return { label: "Cheap", emoji: "ðŸŸ¡" };
  if (mwh < 130) return { label: "Moderate", emoji: "ðŸŸ " };
  if (mwh < 160) return { label: "Expensive", emoji: "ðŸ”´" };
  return { label: "Peak!", emoji: "â›”" };
}

// Common EV models in Belgium
const EV_MODELS = [
  { name: "Tesla Model 3 SR",    kwh: 57.5,  charger: 11 },
  { name: "Tesla Model 3 LR",    kwh: 75,    charger: 11 },
  { name: "VW ID.4",             kwh: 77,    charger: 11 },
  { name: "Peugeot e-208",       kwh: 50,    charger: 11 },
  { name: "Renault Zoe",         kwh: 52,    charger: 22 },
  { name: "Hyundai Ioniq 5",     kwh: 72.6,  charger: 11 },
  { name: "Kia EV6",             kwh: 77.4,  charger: 11 },
  { name: "BMW i4",              kwh: 80.7,  charger: 11 },
  { name: "Volvo EX40",          kwh: 69,    charger: 11 },
  { name: "Custom",              kwh: 60,    charger: 11 },
];

const CONTENT = {
  en: {
    title: "Best Time to Charge Your EV in Belgium",
    subtitle: "Save â‚¬300â€“600/year by charging at the cheapest EPEX Spot hours",
    nowLabel: "Current Price",
    windowsTitle: "Best Upcoming Charging Windows",
    windowsDesc: "Cheapest hours from now based on live EPEX Spot prices",
    calcTitle: "EV Charging Cost Calculator",
    calcDesc: "See exactly what a full charge costs at different hours",
    modelLabel: "Your EV",
    batteryLabel: "Battery size (kWh)",
    socLabel: "Current charge level (%)",
    targetLabel: "Target charge level (%)",
    chargerLabel: "Home charger (kW)",
    cheapLabel: "At cheapest hour",
    peakLabel: "At peak hour",
    avgLabel: "At today's average",
    savingLabel: "Saving vs peak",
    durationLabel: "Charging time",
    tipsTitle: "Smart Charging Tips for Belgium",
    tip1Title: "Dynamic contract = max savings",
    tip1: "Bolt Energy Dynamic, Eneco and others offer hourly EPEX-linked contracts. Your kWh price changes every hour â€” schedule charging at 02:00-05:00 for typical savings of 60-80% vs peak.",
    tip2Title: "Use off-peak scheduling",
    tip2: "Most EV apps (Tesla, MyRenault, etc.) let you set a departure time. The car calculates backwards and starts charging at the right moment to be ready when you need it.",
    tip3Title: "Flanders capacity tariff",
    tip3: "In Flanders, the grid charge depends on your peak 15-min consumption per month. Avoid running EV + heat pump + oven simultaneously. One high peak sets your tariff for the whole month.",
    tip4Title: "Negative prices = free charging",
    tip4: "Belgium regularly sees negative EPEX prices (typically 00:00-06:00 on sunny/windy weekends). With a dynamic contract you get paid to consume electricity during these hours.",
    faqTitle: "FAQ â€” EV Charging in Belgium",
    faq: [
      { q: "When is electricity cheapest to charge an EV in Belgium?", a: "Typically between midnight and 06:00, and around noon when solar generation peaks. Avoid 07:00-09:00 and 17:00-21:00 when prices spike. Use this page to check today's specific cheapest hours." },
      { q: "Which Belgian electricity supplier is cheapest for EV charging?", a: "Bolt Energy Dynamic is typically the best for EV drivers â€” it tracks hourly EPEX prices directly with the lowest markup (0.3 câ‚¬/kWh). Combined with smart overnight scheduling, it offers the lowest annual cost for high-consumption EV users." },
      { q: "Does the Flemish capacity tariff affect EV charging?", a: "Yes â€” in Flanders, your monthly grid charge is based on your highest 15-minute peak consumption. Never charge your EV at full speed while running the heat pump or oven. Spread consumption to stay under 2.5 kW average peak." },
      { q: "Can I use smartprice.be with Home Assistant to automate EV charging?", a: "Yes â€” use our free API (smartprice.be/api-docs) with a RESTful sensor to check the current EPEX price, then trigger your EV charger switch when the price drops below your threshold." },
    ],
    cta: "Compare dynamic EV-friendly plans â†’",
    ctaSub: "See which plan saves the most based on your real usage",
  },
  nl: {
    title: "Beste tijd om uw EV op te laden in BelgiÃ«",
    subtitle: "Bespaar â‚¬300â€“600/jaar door te laden op de goedkoopste EPEX Spot-uren",
    nowLabel: "Huidige prijs",
    windowsTitle: "Beste komende laadvensters",
    windowsDesc: "Goedkoopste uren vanaf nu op basis van live EPEX Spot-prijzen",
    calcTitle: "EV Laadkostenberekening",
    calcDesc: "Bereken exact wat een volle lading kost op verschillende uren",
    modelLabel: "Uw EV",
    batteryLabel: "Batterijcapaciteit (kWh)",
    socLabel: "Huidig laadniveau (%)",
    targetLabel: "Doellaadniveau (%)",
    chargerLabel: "Thuislader (kW)",
    cheapLabel: "Op goedkoopste uur",
    peakLabel: "Op piekniveau",
    avgLabel: "Op daggemiddelde",
    savingLabel: "Besparing vs piek",
    durationLabel: "Laadduur",
    tipsTitle: "Slim laden tips voor BelgiÃ«",
    tip1Title: "Dynamisch contract = maximale besparing",
    tip1: "Bolt Energy Dynamic, Eneco en anderen bieden uurlijkse EPEX-gekoppelde contracten. Uw kWh-prijs verandert elk uur â€” plan laden op 02:00-05:00 voor typische besparingen van 60-80% vs piekuren.",
    tip2Title: "Gebruik gepland laden",
    tip2: "De meeste EV-apps (Tesla, MyRenault, etc.) laten u een vertrektijd instellen. De auto berekent terug en start op het juiste moment om klaar te zijn wanneer u het nodig heeft.",
    tip3Title: "Vlaams capaciteitstarief",
    tip3: "In Vlaanderen hangt de netwerkkost af van uw piekvermogen per 15 minuten per maand. Vermijd gelijktijdig laden van EV + warmtepomp + oven. Ã‰Ã©n hoge piek bepaalt uw tarief voor de hele maand.",
    tip4Title: "Negatieve prijzen = gratis laden",
    tip4: "BelgiÃ« heeft regelmatig negatieve EPEX-prijzen (typisch 00:00-06:00 op zonnige/winderige weekenden). Met een dynamisch contract wordt u betaald om stroom te verbruiken tijdens deze uren.",
    faqTitle: "FAQ â€” EV laden in BelgiÃ«",
    faq: [
      { q: "Wanneer is elektriciteit het goedkoopst om een EV op te laden in BelgiÃ«?", a: "Typisch tussen middernacht en 06:00, en rond het middaguur wanneer zonne-energie piekt. Vermijd 07:00-09:00 en 17:00-21:00 wanneer de prijzen stijgen. Gebruik deze pagina om de specifieke goedkoopste uren van vandaag te controleren." },
      { q: "Welke Belgische leverancier is het goedkoopst voor EV-laden?", a: "Bolt Energy Dynamic is typisch het beste voor EV-rijders â€” het volgt uurlijkse EPEX-prijzen direct met de laagste opslag (0,3 câ‚¬/kWh). Gecombineerd met slim nachtladen biedt het de laagste jaarkosten voor EV-gebruikers met hoog verbruik." },
      { q: "BeÃ¯nvloedt het Vlaamse capaciteitstarief het EV-laden?", a: "Ja â€” in Vlaanderen is uw maandelijkse netwerkkost gebaseerd op uw hoogste 15-minuten piekverbruik. Laad uw EV nooit op vol vermogen terwijl u de warmtepomp of oven gebruikt. Spreid verbruik om onder 2,5 kW gemiddeld piekvermogen te blijven." },
      { q: "Kan ik smartprice.be gebruiken met Home Assistant om EV-laden te automatiseren?", a: "Ja â€” gebruik onze gratis API (smartprice.be/api-docs) met een RESTful sensor om de huidige EPEX-prijs te controleren en uw EV-lader te activeren wanneer de prijs onder uw drempel daalt." },
    ],
    cta: "Vergelijk dynamische EV-vriendelijke plannen â†’",
    ctaSub: "Zie welk plan het meest bespaart op basis van uw echt verbruik",
  },
  fr: {
    title: "Meilleur moment pour charger son VE en Belgique",
    subtitle: "Ã‰conomisez 300â€“600â‚¬/an en chargeant aux heures EPEX Spot les moins chÃ¨res",
    nowLabel: "Prix actuel",
    windowsTitle: "Meilleures plages de charge Ã  venir",
    windowsDesc: "Prochaines heures les moins chÃ¨res selon les prix EPEX Spot en direct",
    calcTitle: "Calculateur de coÃ»t de charge VE",
    calcDesc: "Calculez exactement ce que coÃ»te une charge complÃ¨te selon l'heure",
    modelLabel: "Votre VE",
    batteryLabel: "CapacitÃ© batterie (kWh)",
    socLabel: "Niveau de charge actuel (%)",
    targetLabel: "Niveau de charge cible (%)",
    chargerLabel: "Chargeur domicile (kW)",
    cheapLabel: "Ã€ l'heure la moins chÃ¨re",
    peakLabel: "Ã€ l'heure de pointe",
    avgLabel: "Ã€ la moyenne du jour",
    savingLabel: "Ã‰conomie vs pointe",
    durationLabel: "DurÃ©e de charge",
    tipsTitle: "Conseils de charge intelligente en Belgique",
    tip1Title: "Contrat dynamique = Ã©conomies maximales",
    tip1: "Bolt Energy Dynamic, Eneco et d'autres proposent des contrats indexÃ©s sur l'EPEX horaire. Votre prix au kWh change chaque heure â€” programmez la charge Ã  02h-05h pour des Ã©conomies typiques de 60-80% vs les heures de pointe.",
    tip2Title: "Utilisez la charge programmÃ©e",
    tip2: "La plupart des apps VE (Tesla, MyRenault, etc.) vous permettent de dÃ©finir une heure de dÃ©part. La voiture calcule en arriÃ¨re et commence Ã  charger au bon moment pour Ãªtre prÃªte quand vous en avez besoin.",
    tip3Title: "Tarif capacitaire en Flandre",
    tip3: "En Flandre, le coÃ»t rÃ©seau dÃ©pend de votre pic de consommation par tranche de 15 minutes par mois. Ã‰vitez de charger le VE Ã  pleine puissance en mÃªme temps que la pompe Ã  chaleur ou le four. Un seul pic Ã©levÃ© fixe votre tarif pour tout le mois.",
    tip4Title: "Prix nÃ©gatifs = charge gratuite",
    tip4: "La Belgique connaÃ®t rÃ©guliÃ¨rement des prix EPEX nÃ©gatifs (typiquement 00h-06h les week-ends ensoleillÃ©s/venteux). Avec un contrat dynamique, vous Ãªtes payÃ© pour consommer de l'Ã©lectricitÃ© pendant ces heures.",
    faqTitle: "FAQ â€” Charge VE en Belgique",
    faq: [
      { q: "Quand l'Ã©lectricitÃ© est-elle la moins chÃ¨re pour charger un VE en Belgique ?", a: "Typiquement entre minuit et 06h, et vers midi quand la production solaire est Ã  son pic. Ã‰vitez 07h-09h et 17h-21h quand les prix grimpent. Utilisez cette page pour vÃ©rifier les heures les moins chÃ¨res du jour." },
      { q: "Quel fournisseur belge est le moins cher pour la charge VE ?", a: "Bolt Energy Dynamic est gÃ©nÃ©ralement le meilleur pour les conducteurs de VE â€” il suit les prix EPEX horaires avec la marge la plus basse (0,3 câ‚¬/kWh). CombinÃ© Ã  une charge nocturne intelligente, il offre le coÃ»t annuel le plus bas pour les gros consommateurs." },
      { q: "Le tarif capacitaire flamand affecte-t-il la charge VE ?", a: "Oui â€” en Flandre, votre coÃ»t rÃ©seau mensuel est basÃ© sur votre pic de consommation le plus Ã©levÃ© sur 15 minutes. Ne chargez jamais votre VE Ã  pleine puissance avec la pompe Ã  chaleur ou le four. Ã‰talez la consommation pour rester sous 2,5 kW de pic moyen." },
      { q: "Puis-je utiliser smartprice.be avec Home Assistant pour automatiser la charge VE ?", a: "Oui â€” utilisez notre API gratuite (smartprice.be/api-docs) avec un capteur RESTful pour vÃ©rifier le prix EPEX actuel et dÃ©clencher votre chargeur VE quand le prix passe sous votre seuil." },
    ],
    cta: "Comparer les plans dynamiques pour VE â†’",
    ctaSub: "Voyez quel plan Ã©conomise le plus selon votre consommation rÃ©elle",
  },
};

export default function EvChargingPage({ onGetStarted, onOpenCalculator }) {
  const { lang } = useLanguage();
  const T = CONTENT[lang] || CONTENT.en;

  useEffect(() => {
    document.title = "EV Charging Belgium â€” Best Hours & Cheapest Times | SmartPrice.be";
    const desc = document.querySelector("meta[name='description']");
    if (desc) desc.setAttribute("content", "When is the cheapest time to charge your electric car in Belgium? Live EPEX prices, EV charge planner, and map of all public charging stations. Free.");
    const canonical = document.getElementById('canonical-tag');
    if (canonical) canonical.setAttribute("href", "https://smartprice.be/ev-charging-belgium");
    return () => { document.title = "SmartPrice.be â€” Belgium Real-Time Electricity & Gas Prices"; };
  }, []);

  const [current,  setCurrent]  = useState(null);
  const [cheapest, setCheapest] = useState([]);
  const [stats,    setStats]    = useState(null);
  const [prices,   setPrices]   = useState([]);
  const [loading,  setLoading]  = useState(true);

  // Calculator state
  const [selectedModel, setSelectedModel] = useState(0);
  const [batteryKwh,    setBatteryKwh]    = useState(EV_MODELS[0].kwh);
  const [socCurrent,    setSocCurrent]    = useState(20);
  const [socTarget,     setSocTarget]     = useState(80);
  const [chargerKw,     setChargerKw]     = useState(EV_MODELS[0].charger);
  const [openFaq,       setOpenFaq]       = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/current`).then(r => r.json()),
      fetch(`${API}/api/cheapest?hours=8`).then(r => r.json()),
      fetch(`${API}/api/prices/today`).then(r => r.json()),
    ]).then(([cur, cheap, prices]) => {
      if (cur.success)    setCurrent(cur.current);
      if (cheap.success)  setCheapest(cheap.cheapest_hours || []);
      if (prices.success) {
        setStats(prices.stats?.today);
        setPrices((prices.data || []).filter(p => p.day === "today"));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Calculator derived values
  const kwhNeeded = batteryKwh * (socTarget - socCurrent) / 100;
  const chargeMins = Math.round((kwhNeeded / chargerKw) * 60);
  const cheapPrice = cheapest[0]?.price_eur_mwh;
  const costCheap  = cheapPrice ? (kwhNeeded * cheapPrice / 1000) : null;
  const costPeak   = stats?.max  ? (kwhNeeded * stats.max  / 1000) : null;
  const costAvg    = stats?.avg  ? (kwhNeeded * stats.avg  / 1000) : null;
  const saving     = costPeak && costCheap ? (costPeak - costCheap) : null;

  const mwh = current?.price_eur_mwh;
  const col = getPriceColor(mwh);
  const tier = getPriceTier(mwh);

  const handleModelChange = (i) => {
    setSelectedModel(i);
    if (EV_MODELS[i].name !== "Custom") {
      setBatteryKwh(EV_MODELS[i].kwh);
      setChargerKw(EV_MODELS[i].charger);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${C.border}`, padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(6,11,20,0.95)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 50 }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: C.text }}>
          <span style={{ fontSize: 20 }}>ðŸ‡§ðŸ‡ª</span>
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.5px" }}>SmartPrice</span>
          <span style={{ fontSize: 9, color: C.teal, background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.25)", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>â— LIVE</span>
        </a>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <LangSwitcher />
          <a href="/" onClick={e => { e.preventDefault(); window.history.length > 1 ? window.history.back() : onGetStarted(); }} style={{ padding: "8px 18px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: `linear-gradient(135deg,${C.teal},#1A56A4)`, color: "#fff", textDecoration: "none" }}>{window.history.length > 1 ? "â† Back" : "Dashboard â†’"}</a>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 20px 80px" }}>

        {/* Hero */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.2)", borderRadius: 30, padding: "5px 14px", fontSize: 12, color: C.green, fontWeight: 700, marginBottom: 16 }}>
            ðŸš— EV Charging Â· Belgium
          </div>
          <h1 style={{ fontSize: "clamp(28px,5vw,52px)", fontWeight: 900, letterSpacing: "-2px", margin: "0 0 14px", lineHeight: 1.05 }}>
            <span style={{ background: `linear-gradient(135deg, #fff 30%, ${C.green})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {T.title}
            </span>
          </h1>
          <p style={{ fontSize: 17, color: C.soft, margin: 0, lineHeight: 1.6 }}>{T.subtitle}</p>

          {/* EV Stations banner */}
          <div style={{ marginTop: 20, display: "inline-flex", alignItems: "center", gap: 12, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 14, padding: "12px 18px", cursor: "pointer" }}
            onClick={() => window.location.href = "/ev-charging-stations-belgium"}>
            <span style={{ fontSize: 22 }}>ðŸ—ºï¸</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#93C5FD" }}>Find charging stations near you</div>
              <div style={{ fontSize: 11, color: C.muted }}>Interactive map Â· 500+ Belgian stations Â· Open now</div>
            </div>
            <span style={{ fontSize: 13, color: "#93C5FD", fontWeight: 700, marginLeft: 8 }}>View map â†’</span>
          </div>
        </div>

        {/* Current price + windows â€” 2 col */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 20 }}>

          {/* Current price */}
          <div style={{ background: `linear-gradient(135deg, ${col}12, ${col}05)`, border: `1px solid ${col}40`, borderRadius: 20, padding: "24px 20px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10, fontWeight: 700 }}>{T.nowLabel}</div>
            {loading ? (
              <div style={{ fontSize: 40, color: C.muted, fontWeight: 900 }}>â€”</div>
            ) : mwh != null ? (
              <>
                <div style={{ fontSize: "clamp(36px,6vw,56px)", fontWeight: 900, fontFamily: "monospace", color: col, lineHeight: 1 }}>â‚¬{mwh.toFixed(1)}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>/MWh</div>
                <div style={{ fontSize: 14, color: col, marginTop: 10, fontWeight: 700 }}>{tier.emoji} {tier.label}</div>
                {current?.hour_label && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>@ {current.hour_label}</div>}
              </>
            ) : <div style={{ color: C.muted }}>â€”</div>}
          </div>

          {/* Best windows */}
          <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 20, padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>âš¡ {T.windowsTitle}</div>
              <a href="/ev-charging-stations-belgium" style={{ fontSize: 11, color: C.teal, background: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.2)", borderRadius: 20, padding: "4px 12px", textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap" }}>ðŸ—ºï¸ Find stations â†’</a>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>{T.windowsDesc}</div>
            {loading ? (
              <div style={{ color: C.muted, fontSize: 13 }}>Loadingâ€¦</div>
            ) : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {cheapest.slice(0, 6).map((h, i) => {
                  const ts  = new Date(h.timestamp);
                  const col2 = getPriceColor(h.price_eur_mwh);
                  const isNow = new Date() >= new Date(h.timestamp) && new Date() < new Date(new Date(h.timestamp).getTime() + 3600000);
                  return (
                    <div key={i} style={{ background: `${col2}10`, border: `1px solid ${col2}${isNow ? "80" : "25"}`, borderRadius: 12, padding: "10px 14px", minWidth: 90, position: "relative" }}>
                      {isNow && <div style={{ position: "absolute", top: -7, left: "50%", transform: "translateX(-50%)", fontSize: 8, background: col2, color: "#fff", borderRadius: 20, padding: "2px 6px", fontWeight: 800, whiteSpace: "nowrap" }}>NOW</div>}
                      <div style={{ fontSize: 10, color: C.muted }}>{ts.toLocaleDateString("en-GB", { weekday: "short" })}</div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{ts.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: col2, fontFamily: "monospace" }}>â‚¬{h.price_eur_mwh.toFixed(0)}</div>
                      <div style={{ fontSize: 9, color: C.muted }}>/MWh</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Calculator */}
        <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 20, padding: "28px 28px", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>ðŸ”‹ {T.calcTitle}</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>{T.calcDesc}</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>

            {/* Model selector */}
            <div>
              <label style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>{T.modelLabel}</label>
              <select value={selectedModel} onChange={e => handleModelChange(Number(e.target.value))} style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", color: C.text, fontSize: 13 }}>
                {EV_MODELS.map((m, i) => <option key={i} value={i}>{m.name}</option>)}
              </select>
            </div>

            {/* Battery size */}
            <div>
              <label style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>{T.batteryLabel}</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="range" min="20" max="120" step="0.5" value={batteryKwh} onChange={e => setBatteryKwh(Number(e.target.value))} style={{ flex: 1 }} />
                <span style={{ fontSize: 14, fontWeight: 700, minWidth: 50, textAlign: "right", fontFamily: "monospace" }}>{batteryKwh} kWh</span>
              </div>
            </div>

            {/* Current SOC */}
            <div>
              <label style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>{T.socLabel}</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="range" min="0" max="90" step="5" value={socCurrent} onChange={e => setSocCurrent(Number(e.target.value))} style={{ flex: 1 }} />
                <span style={{ fontSize: 14, fontWeight: 700, minWidth: 40, textAlign: "right", fontFamily: "monospace" }}>{socCurrent}%</span>
              </div>
            </div>

            {/* Target SOC */}
            <div>
              <label style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>{T.targetLabel}</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="range" min="50" max="100" step="5" value={socTarget} onChange={e => setSocTarget(Number(e.target.value))} style={{ flex: 1 }} />
                <span style={{ fontSize: 14, fontWeight: 700, minWidth: 40, textAlign: "right", fontFamily: "monospace" }}>{socTarget}%</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div style={{ background: C.card, borderRadius: 14, padding: "20px 24px" }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
              Charging <strong style={{ color: C.text }}>{kwhNeeded.toFixed(1)} kWh</strong> ({socCurrent}% â†’ {socTarget}%) Â· {chargerKw} kW charger Â· ~{chargeMins >= 60 ? `${Math.floor(chargeMins/60)}h${chargeMins%60 > 0 ? `${chargeMins%60}m` : ""}` : `${chargeMins}m`}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginTop: 16 }}>
              {[
                { label: T.cheapLabel, cost: costCheap, color: C.green,  price: cheapest[0]?.price_eur_mwh },
                { label: T.avgLabel,   cost: costAvg,   color: C.yellow, price: stats?.avg },
                { label: T.peakLabel,  cost: costPeak,  color: C.red,    price: stats?.max },
              ].map(s => (
                <div key={s.label} style={{ background: `${s.color}08`, border: `1px solid ${s.color}25`, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: s.color, fontFamily: "monospace" }}>
                    {s.cost != null ? `â‚¬${s.cost.toFixed(2)}` : "â€”"}
                  </div>
                  {s.price != null && <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>@â‚¬{s.price.toFixed(0)}/MWh</div>}
                </div>
              ))}
            </div>
            {saving != null && saving > 0.1 && (
              <div style={{ marginTop: 14, padding: "10px 16px", background: "rgba(0,200,150,0.06)", border: "1px solid rgba(0,200,150,0.2)", borderRadius: 10, fontSize: 13, color: C.green, fontWeight: 700, textAlign: "center" }}>
                ðŸ’š {T.savingLabel}: â‚¬{saving.toFixed(2)} per charge Â· ~â‚¬{(saving * 150).toFixed(0)}/year (150 charges)
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div style={{ background: "rgba(13,148,136,0.07)", border: "1px solid rgba(13,148,136,0.2)", borderRadius: 20, padding: "28px 32px", marginBottom: 20, textAlign: "center" }}>
          <button onClick={() => { window.location.href = "/calculator/electricity?ev=1"; }} style={{ padding: "14px 36px", borderRadius: 50, fontSize: 16, fontWeight: 800, background: `linear-gradient(135deg,${C.teal},#1A56A4)`, border: "none", color: "#fff", cursor: "pointer", marginBottom: 8 }}>
            {T.cta}
          </button>
          <div style={{ fontSize: 12, color: C.muted }}>{T.ctaSub}</div>
        </div>

        {/* Tips */}
        <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 20, padding: "28px 28px", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>ðŸ’¡ {T.tipsTitle}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
            {[
              { title: T.tip1Title, body: T.tip1, icon: "âš¡", color: C.teal },
              { title: T.tip2Title, body: T.tip2, icon: "ðŸ“…", color: C.blue },
              { title: T.tip3Title, body: T.tip3, icon: "ðŸ“", color: C.yellow },
              { title: T.tip4Title, body: T.tip4, icon: "ðŸ¤‘", color: C.green },
            ].map((tip, i) => (
              <div key={i} style={{ background: `${tip.color}06`, border: `1px solid ${tip.color}20`, borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>{tip.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: tip.color, marginBottom: 8 }}>{tip.title}</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>{tip.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: C.teal }}>{T.faqTitle}</h2>
          {T.faq.map((f, i) => (
            <div key={i} style={{ borderBottom: `1px solid ${C.border}`, marginBottom: 0 }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: "100%", textAlign: "left", padding: "16px 0", background: "none", border: "none", color: C.text, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, fontWeight: 600 }}>
                {f.q}
                <span style={{ color: C.muted, marginLeft: 12, flexShrink: 0 }}>{openFaq === i ? "â–²" : "â–¼"}</span>
              </button>
              {openFaq === i && (
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, paddingBottom: 16 }}>{f.a}</div>
              )}
            </div>
          ))}
        </div>

        {/* Schema.org */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org", "@type": "WebPage",
          "name": "Best Time to Charge Your EV in Belgium",
          "description": "Live EPEX Spot prices and best charging windows for EV owners in Belgium. Free calculator.",
          "url": "https://smartprice.be/ev-charging-belgium",
          "publisher": { "@type": "Organization", "name": "SmartPrice.be", "url": "https://smartprice.be" },
        })}} />

        <div style={{ textAlign: "center", fontSize: 11, color: C.muted, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
          Data: Energy-Charts.info Â· Elia Open Data (CC BY 4.0) Â· ENTSO-E Â· Not financial advice
          {" Â· "}<a href="/" style={{ color: C.teal }}>SmartPrice.be</a>
          {" Â· "}<a href="/api-docs" style={{ color: C.teal }}>API</a>
        </div>

      </div>
    </div>
  );
}
