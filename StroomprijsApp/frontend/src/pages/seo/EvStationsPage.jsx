/**
 * pages/seo/EvStationsPage.jsx
 * Route: /ev-charging-stations-belgium
 * SEO: "ev charging stations belgium", "laadpalen belgie", "bornes recharge belgique"
 * Map: Leaflet + OpenStreetMap (free)
 * Data: Open Charge Map API (free, no key needed) + SmartPrice EPEX
 */
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "../../context/LanguageContext";
import LangSwitcher from "../../components/LangSwitcher";

const API = import.meta.env.VITE_API_URL || "https://smart-energy-production-aef3.up.railway.app";
// OCM proxied through backend to avoid CORS issues

const C = {
  bg:     "#060B14",
  card:   "#0A1220",
  card2:  "#0D1626",
  border: "rgba(255,255,255,0.07)",
  teal:   "#0D9488",
  green:  "#00C896",
  yellow: "#F59E0B",
  red:    "#EF4444",
  orange: "#F97316",
  blue:   "#3B82F6",
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

function getPriceAdvice(mwh, lang) {
  if (mwh == null) return { en: "Loading...", nl: "Laden...", fr: "Chargement..." }[lang];
  if (mwh < 50)  return { en: "🟢 Great time to charge — prices very low", nl: "🟢 Goed moment om te laden — prijzen zeer laag", fr: "🟢 Moment idéal pour charger — prix très bas" }[lang];
  if (mwh < 90)  return { en: "🟡 Good time to charge — prices below average", nl: "🟡 Goed moment — prijzen onder gemiddelde", fr: "🟡 Bon moment — prix inférieurs à la moyenne" }[lang];
  if (mwh < 130) return { en: "🟠 Average prices — charge if needed", nl: "🟠 Gemiddelde prijzen — laad indien nodig", fr: "🟠 Prix moyens — chargez si nécessaire" }[lang];
  return { en: "🔴 High prices — wait if possible", nl: "🔴 Hoge prijzen — wacht indien mogelijk", fr: "🔴 Prix élevés — attendez si possible" }[lang];
}

const CONNECTOR_TYPES = {
  1: "Type 1 (J1772)", 2: "Type 2", 25: "Type 2 (Tethered)",
  3: "Chademo", 33: "CCS (Type 1)", 1036: "CCS (Type 2)",
  8: "Mennekes", 30: "Tesla", 27: "Tesla Supercharger",
};

const CONTENT = {
  en: {
    title: "EV Charging Stations in Belgium",
    desc: "Find all public EV charging stations in Belgium with live EPEX electricity prices. Know the best time to charge at any station.",
    currentPrice: "Current EPEX Price",
    adviceTitle: "Charging advice right now",
    mapTitle: "Public Charging Stations",
    mapDesc: "Click any station for details",
    filtersTitle: "Filters",
    filterFast: "Fast (>50kW)",
    filterType2: "Type 2",
    filterCCS: "CCS",
    filterFree: "Free",
    stationsFound: "stations found",
    loadingMap: "Loading map...",
    loadingStations: "Loading stations...",
    connectors: "Connectors",
    power: "Power",
    operator: "Operator",
    status: "Status",
    available: "Available",
    unknown: "Unknown",
    faqTitle: "EV Charging in Belgium — FAQ",
    faq: [
      { q: "How many public EV charging stations are in Belgium?", a: "Belgium has over 30,000 public charging points as of 2026, with the highest density in Flanders. The network is expanding rapidly with EU targets requiring stations every 60km on major roads by 2026." },
      { q: "What is the cheapest network to charge an EV in Belgium?", a: "Pricing varies by network and time. Allego, Eneco E-Mobility, and Bolt Charge are among the major operators. However, the cheapest charging is always at home with a dynamic contract — see our EV Charging page for optimal home charging times." },
      { q: "Do I need an RFID card or app to charge in Belgium?", a: "Most Belgian stations accept RFID cards (Charge Card, Plugsurfing, ENGIE Card) and apps. Many newer stations also accept contactless bank card payment. The Plugsurfing and Chargemap apps work across most Belgian networks." },
      { q: "What connector types are used in Belgium?", a: "Type 2 (Mennekes) is the standard AC connector in Belgium. For DC fast charging, CCS (Combined Charging System) is dominant. CHAdeMO is available but being phased out. Tesla Superchargers use CCS in newer installations." },
    ],
    cta: "Compare electricity plans for EV owners →",
    ctaSub: "Find the cheapest supplier for your charging usage",
  },
  nl: {
    title: "EV Laadpalen in België",
    desc: "Vind alle openbare laadpalen in België met live EPEX elektriciteitsprijzen. Weet wanneer het goedkoopst is om te laden.",
    currentPrice: "Huidige EPEX-prijs",
    adviceTitle: "Laadadvies nu",
    mapTitle: "Openbare laadpalen",
    mapDesc: "Klik op een laadpaal voor details",
    filtersTitle: "Filters",
    filterFast: "Snel (>50kW)",
    filterType2: "Type 2",
    filterCCS: "CCS",
    filterFree: "Gratis",
    stationsFound: "laadpalen gevonden",
    loadingMap: "Kaart laden...",
    loadingStations: "Laadpalen laden...",
    connectors: "Aansluitingen",
    power: "Vermogen",
    operator: "Operator",
    status: "Status",
    available: "Beschikbaar",
    unknown: "Onbekend",
    faqTitle: "EV Laden in België — FAQ",
    faq: [
      { q: "Hoeveel openbare laadpalen zijn er in België?", a: "België heeft meer dan 30.000 openbare laadpunten in 2026, met de hoogste dichtheid in Vlaanderen. Het netwerk groeit snel met EU-doelstellingen voor laadpalen elke 60km op hoofdwegen." },
      { q: "Welk netwerk is het goedkoopst om een EV op te laden in België?", a: "Tarieven variëren per netwerk en tijdstip. Allego, Eneco E-Mobility en Bolt Charge zijn grote operators. Het goedkoopste laden is echter altijd thuis met een dynamisch contract — zie onze EV-pagina voor optimale laadtijden." },
      { q: "Heb ik een RFID-kaart of app nodig om te laden in België?", a: "De meeste Belgische laadpalen accepteren RFID-kaarten (Charge Card, Plugsurfing, ENGIE Card) en apps. Veel nieuwere stations accepteren ook contactloos bankkaart betalen." },
      { q: "Welke stekkertypen worden gebruikt in België?", a: "Type 2 (Mennekes) is de standaard AC-aansluiting in België. Voor DC snelladen domineert CCS. CHAdeMO is beschikbaar maar wordt uitgefaseerd. Tesla Superchargers gebruiken CCS bij nieuwere installaties." },
    ],
    cta: "Vergelijk elektriciteitsplannen voor EV-rijders →",
    ctaSub: "Vind de goedkoopste leverancier voor uw laadverbruik",
  },
  fr: {
    title: "Bornes de recharge VE en Belgique",
    desc: "Trouvez toutes les bornes de recharge publiques en Belgique avec les prix EPEX en direct. Sachez quand charger au meilleur prix.",
    currentPrice: "Prix EPEX actuel",
    adviceTitle: "Conseil de charge maintenant",
    mapTitle: "Bornes de recharge publiques",
    mapDesc: "Cliquez sur une borne pour les détails",
    filtersTitle: "Filtres",
    filterFast: "Rapide (>50kW)",
    filterType2: "Type 2",
    filterCCS: "CCS",
    filterFree: "Gratuit",
    stationsFound: "bornes trouvées",
    loadingMap: "Chargement de la carte...",
    loadingStations: "Chargement des bornes...",
    connectors: "Connecteurs",
    power: "Puissance",
    operator: "Opérateur",
    status: "Statut",
    available: "Disponible",
    unknown: "Inconnu",
    faqTitle: "Charge VE en Belgique — FAQ",
    faq: [
      { q: "Combien de bornes de recharge publiques y a-t-il en Belgique ?", a: "La Belgique compte plus de 30 000 points de charge publics en 2026, avec la plus haute densité en Flandre. Le réseau s'étend rapidement avec des objectifs UE pour des bornes tous les 60km sur les grandes routes." },
      { q: "Quel réseau est le moins cher pour charger un VE en Belgique ?", a: "Les tarifs varient selon le réseau et l'heure. Allego, Eneco E-Mobility et Bolt Charge sont parmi les grands opérateurs. Mais le chargement le moins cher reste toujours à domicile avec un contrat dynamique." },
      { q: "Ai-je besoin d'une carte RFID ou d'une app pour charger en Belgique ?", a: "La plupart des bornes belges acceptent les cartes RFID (Charge Card, Plugsurfing, ENGIE Card) et les apps. Beaucoup de nouvelles bornes acceptent aussi le paiement sans contact par carte bancaire." },
      { q: "Quels types de connecteurs sont utilisés en Belgique ?", a: "Le Type 2 (Mennekes) est le connecteur AC standard en Belgique. Pour la recharge rapide DC, le CCS domine. Le CHAdeMO est disponible mais en voie d'abandon. Les Superchargeurs Tesla utilisent le CCS dans les nouvelles installations." },
    ],
    cta: "Comparer les plans électricité pour conducteurs VE →",
    ctaSub: "Trouvez le fournisseur le moins cher pour votre usage de recharge",
  },
};

export default function EvStationsPage({ onGetStarted, onOpenCalculator, onNavigate }) {
  const nav = (path) => {
    // Force full page load to ensure SPA re-renders correctly
    window.location.href = path;
  };
  const { lang } = useLanguage();
  const T = CONTENT[lang] || CONTENT.en;

  const mapRef    = useRef(null);

  // Inject Leaflet CSS fix for map container
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `.leaflet-container { background: #0a1220; } .leaflet-tile { filter: brightness(0.7) saturate(0.8); }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);
  const leafletRef = useRef(null);
  const markersRef = useRef([]);

  const [current,   setCurrent]   = useState(null);
  const [stations,  setStations]  = useState([]);
  const [filtered,  setFiltered]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [mapReady,  setMapReady]  = useState(false);
  const [selected,  setSelected]  = useState(null);
  const [error,     setError]     = useState(null);
  const [filters,   setFilters]   = useState({ fast: false, type2: false, ccs: false });

  // Load EPEX price
  useEffect(() => {
    fetch(`${API}/api/current`).then(r => r.json())
      .then(d => { if (d.success) setCurrent(d.current); })
      .catch(() => {});
  }, []);

  // Load Leaflet dynamically
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load CSS first, then JS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    link.onload = () => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.crossOrigin = "anonymous";
    script.onload = () => {
      const L = window.L;
      const map = L.map(mapRef.current, { center: [50.85, 4.35], zoom: 8, zoomControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);
      leafletRef.current = map;
      setMapReady(true);
    };
      document.head.appendChild(script);
    };
    document.head.appendChild(link);
    return () => { if (leafletRef.current) leafletRef.current.remove(); };
  }, []);

  // Load stations from Open Charge Map
  useEffect(() => {
    fetch(`${API}/api/suppliers/ev-stations?maxresults=500`)
      .then(r => r.json())
      .then(data => {
        const list = data.stations || [];
        if (list.length > 0) {
          setStations(list);
          setFiltered(list);
        } else {
          setError("No stations returned from API");
        }
        setLoading(false);
      })
      .catch(e => {
        console.error("EV stations fetch failed:", e);
        setLoading(false);
        setError("Failed to load stations — " + e.message);
      });
  }, []);

  // Apply filters
  useEffect(() => {
    let result = stations;
    if (filters.fast)  result = result.filter(s => s.Connections?.some(c => c.PowerKW >= 50));
    if (filters.type2) result = result.filter(s => s.Connections?.some(c => [2, 25].includes(c.ConnectionTypeID)));
    if (filters.ccs)   result = result.filter(s => s.Connections?.some(c => [33, 1036].includes(c.ConnectionTypeID)));
    setFiltered(result);
  }, [filters, stations]);

  // Add markers to map
  useEffect(() => {
    if (!mapReady || !leafletRef.current || filtered.length === 0) return;
    const L = window.L;
    const map = leafletRef.current;
    const mwh = current?.price_eur_mwh;
    const priceCol = getPriceColor(mwh);

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Use marker cluster if available, else add directly
    const maxMarkers = 300;
    filtered.slice(0, maxMarkers).forEach(station => {
      const lat = station.AddressInfo?.Latitude;
      const lng = station.AddressInfo?.Longitude;
      if (!lat || !lng) return;

      const maxPower = Math.max(...(station.Connections?.map(c => c.PowerKW || 0) || [0]));
      const isFast = maxPower >= 50;
      const color = isFast ? "#F97316" : priceCol;

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:${isFast ? 14 : 10}px;
          height:${isFast ? 14 : 10}px;
          background:${color};
          border:2px solid rgba(255,255,255,0.8);
          border-radius:50%;
          box-shadow:0 0 6px ${color}88;
        "></div>`,
        iconSize: [isFast ? 14 : 10, isFast ? 14 : 10],
        iconAnchor: [isFast ? 7 : 5, isFast ? 7 : 5],
      });

      const marker = L.marker([lat, lng], { icon });
      marker.on("click", () => setSelected(station));
      marker.addTo(map);
      markersRef.current.push(marker);
    });
  }, [mapReady, filtered, current]);

  const mwh = current?.price_eur_mwh;
  const col = getPriceColor(mwh);

  const toggleFilter = (key) => setFilters(f => ({ ...f, [key]: !f[key] }));

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${C.border}`, padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(6,11,20,0.95)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100 }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: C.text }}>
          <span style={{ fontSize: 20 }}>🇧🇪</span>
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.5px" }}>SmartPrice</span>
          <span style={{ fontSize: 9, color: C.teal, background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.25)", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>● LIVE</span>
        </a>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <a href="/ev-charging-belgium" style={{ fontSize: 12, color: C.muted, textDecoration: "none", padding: "6px 12px", display: "inline-block" }}>⏰ Best times</a>
          <LangSwitcher />
          <a href="/" onClick={e => { e.preventDefault(); onGetStarted && onGetStarted(); }} style={{ padding: "8px 18px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: `linear-gradient(135deg,${C.teal},#1A56A4)`, color: "#fff", textDecoration: "none" }}>Dashboard →</a>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px 80px" }}>

        {/* Hero */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.2)", borderRadius: 30, padding: "5px 14px", fontSize: 12, color: C.green, fontWeight: 700, marginBottom: 14 }}>
            🗺️ {filtered.length > 0 ? `${filtered.length} ${T.stationsFound}` : T.loadingStations}
          </div>
          <h1 style={{ fontSize: "clamp(24px,4vw,44px)", fontWeight: 900, letterSpacing: "-1.5px", margin: "0 0 10px", lineHeight: 1.1 }}>
            <span style={{ background: `linear-gradient(135deg,#fff 30%,${C.green})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {T.title}
            </span>
          </h1>
          <p style={{ fontSize: 15, color: C.muted, margin: 0, lineHeight: 1.7, maxWidth: 600 }}>{T.desc}</p>
        </div>

        {/* Price banner + filters */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, marginBottom: 16, alignItems: "start" }}>

          {/* Current price */}
          <div style={{ background: `linear-gradient(135deg,${col}14,${col}05)`, border: `1px solid ${col}40`, borderRadius: 16, padding: "16px 20px", minWidth: 180 }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontWeight: 700 }}>{T.currentPrice}</div>
            <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "monospace", color: col, lineHeight: 1 }}>
              {mwh != null ? `€${mwh.toFixed(0)}` : "—"}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>/MWh</div>
            <div style={{ fontSize: 12, color: col, marginTop: 8, fontWeight: 600 }}>{getPriceAdvice(mwh, lang)}</div>
          </div>

          {/* Filters */}
          <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 20px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.soft, marginBottom: 10 }}>{T.filtersTitle}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { key: "fast",  label: T.filterFast,  icon: "⚡" },
                { key: "type2", label: T.filterType2,  icon: "🔌" },
                { key: "ccs",   label: T.filterCCS,    icon: "🔋" },
              ].map(f => (
                <button key={f.key} onClick={() => toggleFilter(f.key)} style={{
                  padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${filters[f.key] ? C.green : C.border}`,
                  background: filters[f.key] ? "rgba(0,200,150,0.12)" : "rgba(255,255,255,0.03)",
                  color: filters[f.key] ? C.green : C.muted, transition: "all 0.15s",
                }}>
                  {f.icon} {f.label}
                </button>
              ))}
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.orange }} />
                <span style={{ fontSize: 11, color: C.muted }}>Fast (&gt;50kW)</span>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: col }} />
                <span style={{ fontSize: 11, color: C.muted }}>Standard — {mwh != null ? `€${mwh.toFixed(0)}/MWh now` : "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Map + sidebar */}
        <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 340px" : "1fr", gap: 16, marginBottom: 24 }}>

          {/* Map */}
          <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 20, overflow: "hidden", position: "relative" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>🗺️ {T.mapTitle}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{T.mapDesc}</div>
            </div>
            {!mapReady && (
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 500, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, zIndex: 10, background: C.card2 }}>{T.loadingMap}</div>
            )}
            <div ref={mapRef} id="smartprice-ev-map" style={{ height: 500, width: "100%", minHeight: 500 }} />
          </div>

          {/* Station detail panel */}
          {selected && (
            <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 20, padding: 20, maxHeight: 545, overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3, flex: 1, paddingRight: 8 }}>
                  {selected.AddressInfo?.Title || "Charging Station"}
                </div>
                <button onClick={() => setSelected(null)} style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 10px", color: C.muted, cursor: "pointer", fontSize: 13, flexShrink: 0 }}>✕</button>
              </div>

              <div style={{ fontSize: 12, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
                📍 {selected.AddressInfo?.AddressLine1 && `${selected.AddressInfo.AddressLine1}, `}
                {selected.AddressInfo?.Town && `${selected.AddressInfo.Town}, `}
                {selected.AddressInfo?.Postcode}
              </div>

              {/* Charging advice */}
              <div style={{ background: `${col}10`, border: `1px solid ${col}30`, borderRadius: 12, padding: "10px 14px", marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{T.adviceTitle}</div>
                <div style={{ fontSize: 13, color: col, fontWeight: 700 }}>{getPriceAdvice(mwh, lang)}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                  {mwh != null ? `€${mwh.toFixed(1)}/MWh` : "—"}
                  {" · "}<a href="/ev-charging-belgium" style={{ color: C.teal, textDecoration: "none", fontSize: 11 }}>See all cheap hours →</a>
                </div>
              </div>

              {/* Operator */}
              {selected.OperatorInfo?.Title && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.8 }}>{T.operator}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{selected.OperatorInfo.Title}</div>
                </div>
              )}

              {/* Connections */}
              {selected.Connections?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>{T.connectors}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {selected.Connections.slice(0, 6).map((conn, i) => {
                      const power = conn.PowerKW;
                      const isFast = power >= 50;
                      return (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 12px" }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>
                              {CONNECTOR_TYPES[conn.ConnectionTypeID] || `Type ${conn.ConnectionTypeID}`}
                            </div>
                            {conn.Quantity > 1 && <div style={{ fontSize: 10, color: C.muted }}>×{conn.Quantity}</div>}
                          </div>
                          {power && (
                            <div style={{ fontSize: 13, fontWeight: 800, color: isFast ? C.orange : C.green, fontFamily: "monospace" }}>
                              {power} kW
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Directions */}
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${selected.AddressInfo?.Latitude},${selected.AddressInfo?.Longitude}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: "block", textAlign: "center", padding: "10px 0", borderRadius: 10, background: "rgba(13,148,136,0.15)", border: "1px solid rgba(13,148,136,0.3)", color: C.teal, textDecoration: "none", fontSize: 13, fontWeight: 700, marginTop: 8 }}>
                🗺️ Get directions →
              </a>
            </div>
          )}
        </div>

        {/* CTA */}
        <div style={{ background: "rgba(13,148,136,0.07)", border: "1px solid rgba(13,148,136,0.2)", borderRadius: 20, padding: "24px 28px", marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{T.cta}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{T.ctaSub}</div>
          </div>
          <button onClick={() => nav("/calculator/electricity?ev=1")} style={{ padding: "12px 24px", borderRadius: 30, fontSize: 14, fontWeight: 800, background: `linear-gradient(135deg,${C.teal},#1A56A4)`, border: "none", color: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}>
            {T.cta.split("→")[0]}→
          </button>
        </div>

        {/* FAQ */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 40, marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: C.teal }}>{T.faqTitle}</h2>
          {T.faq.map((f, i) => (
            <div key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
              <div style={{ padding: "16px 0", fontSize: 14, fontWeight: 600 }}>{f.q}</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, paddingBottom: 16 }}>{f.a}</div>
            </div>
          ))}
        </div>

        {/* Schema.org */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org", "@type": "WebPage",
          "name": "EV Charging Stations in Belgium",
          "description": "Find all public EV charging stations in Belgium with live EPEX electricity prices.",
          "url": "https://smartprice.be/ev-charging-stations-belgium",
        })}} />

        <div style={{ textAlign: "center", fontSize: 11, color: C.muted, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
          Station data: <a href="https://openchargemap.org" target="_blank" rel="noopener noreferrer" style={{ color: C.teal }}>Open Charge Map</a> (CC BY-SA 3.0)
          {" · "}Price data: Energy-Charts.info · Elia Open Data (CC BY 4.0)
          {" · "}<a href="/" style={{ color: C.teal }}>SmartPrice.be</a>
        </div>
      </div>
    </div>
  );
}