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

const API = import.meta.env.VITE_API_URL || "";

export default function EvStationsPage({ onGetStarted, onOpenCalculator, onNavigate }) {
  // All consts kept inside component to prevent Vite/Rollup TDZ bundle errors
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
  const getPriceColor = (mwh) => {
    if (mwh == null) return C.muted;
    if (mwh < 0)   return "#00E5FF";
    if (mwh < 50)  return "#00C896";
    if (mwh < 90)  return "#84CC16";
    if (mwh < 130) return "#F59E0B";
    if (mwh < 160) return "#F97316";
    return "#EF4444";
  };
  const getPriceAdvice = (mwh, l) => {
    if (mwh == null) return { en: "Loading...", nl: "Laden...", fr: "Chargement..." }[l];
    if (mwh < 50)  return { en: "🟢 Great time to charge — prices very low", nl: "🟢 Goed moment om te laden — prijzen zeer laag", fr: "🟢 Moment idéal pour charger — prix très bas" }[l];
    if (mwh < 90)  return { en: "🟡 Good time to charge — prices below average", nl: "🟡 Goed moment — prijzen onder gemiddelde", fr: "🟡 Bon moment — prix inférieurs à la moyenne" }[l];
    if (mwh < 130) return { en: "🟠 Average prices — charge if needed", nl: "🟠 Gemiddelde prijzen — laad indien nodig", fr: "🟠 Prix moyens — chargez si nécessaire" }[l];
    return { en: "🔴 High prices — wait if possible", nl: "🔴 Hoge prijzen — wacht indien mogelijk", fr: "🔴 Prix élevés — attendez si possible" }[l];
  };
  const CONNECTOR_TYPES = {
    1: "Type 1 (J1772)", 2: "Type 2", 25: "Type 2 (Tethered)",
    3: "Chademo", 33: "CCS (Type 1)", 1036: "CCS (Type 2)",
    8: "Mennekes", 30: "Tesla", 27: "Tesla Supercharger",
  };

  const nav = (path) => {
    // Force full page load to ensure SPA re-renders correctly
    window.location.href = path;
  };
  const { lang, tSection } = useLanguage();
  const TD = tSection("dashboard");
  // Keep CONTENT inside component to avoid Vite/Rollup TDZ bundle errors
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
      loadingStations: "Fetching live station data from OpenStreetMap…",
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
  const T = CONTENT[lang] || CONTENT.en;

  // Declare all state + refs FIRST — before any useEffect that references them
  // (avoids TDZ when esbuild renames const declarations in production bundle)
  const mapRef    = useRef(null);
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
  const [nearMe,    setNearMe]    = useState(false);
  const [cheapHours, setCheapHours] = useState([]);
  const [userPos,   setUserPos]   = useState(null);
  const [locating,  setLocating]  = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [alertEmail,  setAlertEmail]  = useState("");
  const [alertState,  setAlertState]  = useState("idle"); // idle | loading | done | error

  useEffect(() => {
    document.title = "EV Charging Stations Belgium — All Public Chargers Map | SmartPrice.be";
    const desc = document.querySelector("meta[name='description']");
    if (desc) desc.setAttribute("content", "Map of all public EV charging stations in Belgium with live EPEX electricity prices. Find the nearest fast charger and the cheapest time to charge.");
    const canonical = document.getElementById('canonical-tag');
    if (canonical) canonical.setAttribute("href", "https://smartprice.be/ev-charging-stations-belgium");
    return () => { document.title = "SmartPrice.be — Belgium Real-Time Electricity & Gas Prices"; };
  }, []);

  // Inject Leaflet CSS fix for map container
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `.leaflet-container { background: #0a1220; } .leaflet-tile { filter: brightness(0.7) saturate(0.8); }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // Close share panel on outside click
  useEffect(() => {
    if (!shareOpen) return;
    const close = (e) => { if (!e.target.closest("[data-share-panel]")) setShareOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [shareOpen]);

  const findNearMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserPos({ lat, lng });
        setLocating(false);
        setNearMe(true);
        // Re-fetch stations near user
        fetch(`/api/suppliers/ev-stations?maxresults=100&lat=${lat}&lng=${lng}&distance=20`)
          .then(r => r.json())
          .then(data => {
            if (data.stations?.length > 0) {
              setStations(data.stations);
              setFiltered(data.stations);
            }
          })
          .catch(() => {});
        // Pan map to user location
        if (leafletRef.current && window.L) {
          leafletRef.current.setView([lat, lng], 12);
          window.L.marker([lat, lng], {
            icon: window.L.divIcon({
              className: "",
              html: `<div style="width:16px;height:16px;background:#3B82F6;border:3px solid #fff;border-radius:50%;box-shadow:0 0 10px #3B82F688"></div>`,
              iconSize: [16,16], iconAnchor: [8,8],
            })
          }).addTo(leafletRef.current);
        }
      },
      () => { setLocating(false); alert("Location access denied"); }
    );
  };

  // Load EPEX price + cheapest upcoming hours
  useEffect(() => {
    fetch(`${API}/api/current`, { credentials: "include" }).then(r => r.json())
      .then(d => { if (d.success) setCurrent(d.current); })
      .catch(() => {});
    fetch(`${API}/api/cheapest?hours=5`, { credentials: "include" }).then(r => r.json())
      .then(d => { if (d.cheapest_hours?.length) setCheapHours(d.cheapest_hours.slice(0, 3)); })
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
    fetch(`${API}/api/suppliers/ev-stations?maxresults=200`)
      .then(r => r.json())
      .then(data => {
        const list = data.stations || [];
        setStations(list);
        setFiltered(list);
        if (!data.success && list.length === 0) {
          setError("Station data temporarily unavailable — try again later");
        }
      })
      .catch(e => {
        console.warn("EV stations fetch failed:", e.message);
        setError("Station data temporarily unavailable");
      })
      .finally(() => setLoading(false));
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
      const isUltra = maxPower >= 150;
      const color = isUltra ? "#EF4444" : isFast ? "#F97316" : priceCol;
      const size = isUltra ? 18 : isFast ? 15 : 12;

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:${size}px;
          height:${size}px;
          background:${color};
          border:2.5px solid #ffffff;
          border-radius:50%;
          box-shadow:0 0 8px ${color}, 0 2px 4px rgba(0,0,0,0.4);
          cursor:pointer;
        "></div>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2],
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
          <a href="/ev-charging-belgium" onClick={(e) => { e.preventDefault(); window.location.href = "/ev-charging-belgium"; }} style={{ fontSize: 12, color: C.muted, textDecoration: "none", padding: "6px 12px", display: "inline-block", cursor: "pointer" }}>⏰ Best times</a>
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
              <button onClick={findNearMe} disabled={locating} style={{
                padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: `1px solid ${nearMe ? C.blue : C.border}`,
                background: nearMe ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.03)",
                color: nearMe ? C.blue : C.muted, transition: "all 0.15s",
              }}>
                {locating ? "📍 Locating…" : nearMe ? "📍 Near me ✓" : "📍 Near me"}
              </button>
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
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#EF4444", border: "2px solid #fff" }} />
                <span style={{ fontSize: 11, color: C.muted }}>Ultra (&gt;150kW)</span>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: C.orange, border: "2px solid #fff" }} />
                <span style={{ fontSize: 11, color: C.muted }}>Fast (&gt;50kW)</span>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: col, border: "2px solid #fff" }} />
                <span style={{ fontSize: 11, color: C.muted }}>Standard</span>
              </div>
            </div>
          </div>
        </div>

        {/* Best hours to charge today */}
        {cheapHours.length > 0 && (
          <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px 22px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.green }}>
                🔋 {lang === "nl" ? "Goedkoopste laadmomenten vandaag" : lang === "fr" ? "Meilleures heures de recharge aujourd'hui" : "Best hours to charge today"}
              </div>
              <a href="/ev-charging-belgium" onClick={e => { e.preventDefault(); window.location.href = "/ev-charging-belgium"; }}
                style={{ fontSize: 12, color: C.teal, textDecoration: "none", fontWeight: 600 }}>
                {lang === "nl" ? "Volledig overzicht →" : lang === "fr" ? "Voir tout →" : "Full planner →"}
              </a>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {cheapHours.map((h, i) => {
                const hMwh = h.price_eur_mwh ?? h.price;
                const hCol = getPriceColor(hMwh);
                const label = i === 0
                  ? (lang === "nl" ? "Goedkoopst" : lang === "fr" ? "Moins cher" : "Cheapest")
                  : i === 1
                  ? (lang === "nl" ? "2e keuze" : lang === "fr" ? "2e choix" : "2nd best")
                  : (lang === "nl" ? "3e keuze" : lang === "fr" ? "3e choix" : "3rd best");
                return (
                  <div key={i} style={{ flex: "1 1 100px", background: i === 0 ? `${hCol}12` : "rgba(255,255,255,0.03)", border: `1px solid ${i === 0 ? hCol + "40" : C.border}`, borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: hCol }}>
                      {h.hour != null ? `${String(h.hour).padStart(2,"0")}:00` : "—"}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: hCol, marginTop: 2 }}>
                      €{hMwh != null ? hMwh.toFixed(0) : "—"}<span style={{ fontSize: 10, fontWeight: 400, color: C.muted }}>/MWh</span>
                    </div>
                    {hMwh != null && <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>~€{((hMwh/1000)*30*1.21).toFixed(2)}/30kWh</div>}
                  </div>
                );
              })}
              {/* CTA card */}
              <div style={{ flex: "1 1 120px", background: "rgba(13,148,136,0.07)", border: "1px solid rgba(13,148,136,0.25)", borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 8, cursor: "pointer" }}
                onClick={() => window.location.href = "/?register=1"}>
                <div style={{ fontSize: 11, color: C.teal, fontWeight: 700, textAlign: "center" }}>
                  🔔 {lang === "nl" ? "Krijg een melding als de prijs daalt" : lang === "fr" ? "Alerte quand le prix baisse" : "Get alerted when price drops"}
                </div>
                <div style={{ fontSize: 11, background: `linear-gradient(135deg,${C.teal},#1A56A4)`, color: "#fff", padding: "5px 12px", borderRadius: 20, fontWeight: 700 }}>
                  {lang === "nl" ? "Gratis aanmelden →" : lang === "fr" ? "S'inscrire →" : "Sign up free →"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Email capture — get alerted when prices drop */}
        {alertState !== "done" && (
          <div style={{ background: "rgba(0,200,150,0.07)", border: "1px solid rgba(0,200,150,0.25)", borderRadius: 16, padding: "16px 22px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.green, marginBottom: 2 }}>
                  🔔 {lang === "nl" ? "Ontvang een melding als de prijs daalt" : lang === "fr" ? "Soyez alerté quand le prix baisse" : "Get alerted when electricity prices drop"}
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>
                  {lang === "nl" ? "Gratis · Geen wachtwoord nodig" : lang === "fr" ? "Gratuit · Sans mot de passe" : "Free · No password needed"}
                </div>
              </div>
              <form onSubmit={async e => {
                e.preventDefault();
                if (!alertEmail || alertState === "loading") return;
                setAlertState("loading");
                try {
                  const r = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: alertEmail, source: "ev-stations" }) });
                  setAlertState(r.ok ? "done" : "error");
                } catch { setAlertState("error"); }
              }} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="email" required
                  value={alertEmail}
                  onChange={e => setAlertEmail(e.target.value)}
                  placeholder={lang === "nl" ? "uw@email.be" : lang === "fr" ? "votre@email.be" : "your@email.be"}
                  style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid rgba(0,200,150,0.35)", background: "rgba(0,0,0,0.3)", color: "#E2E8F0", fontSize: 13, outline: "none", minWidth: 180 }}
                />
                <button type="submit" disabled={alertState === "loading"} style={{ padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, background: `linear-gradient(135deg,${C.teal},#1A56A4)`, border: "none", color: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}>
                  {alertState === "loading" ? "…" : lang === "nl" ? "Aanmelden →" : lang === "fr" ? "M'inscrire →" : "Notify me →"}
                </button>
              </form>
              {alertState === "error" && <div style={{ fontSize: 11, color: "#EF4444" }}>Something went wrong — try again</div>}
            </div>
          </div>
        )}
        {alertState === "done" && (
          <div style={{ background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.3)", borderRadius: 16, padding: "14px 22px", marginBottom: 16, fontSize: 13, color: C.green, fontWeight: 700 }}>
            ✅ {lang === "nl" ? "Ingeschreven! U ontvangt een melding wanneer de prijs daalt." : lang === "fr" ? "Inscrit ! Vous serez alerté quand le prix baisse." : "You're in! We'll alert you when prices drop."}
          </div>
        )}

        {/* Supplier CTA — above the map so users see it before scrolling */}
        <div style={{ background: "linear-gradient(135deg,rgba(13,148,136,0.1),rgba(26,86,164,0.08))", border: "1px solid rgba(13,148,136,0.25)", borderRadius: 16, padding: "16px 22px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#E2E8F0", marginBottom: 3 }}>
              {lang === "nl" ? "💡 Op welk tarief laadt u thuis?" : lang === "fr" ? "💡 Quel est votre tarif à la maison ?" : "💡 What tariff are you charging at home?"}
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>
              {lang === "nl" ? "Vergelijk alle Belgische leveranciers en vind het goedkoopste plan voor EV-rijders" : lang === "fr" ? "Comparez tous les fournisseurs belges et trouvez le plan le moins cher pour les conducteurs VE" : "Compare all Belgian suppliers and find the cheapest plan for EV drivers"}
            </div>
          </div>
          <button onClick={() => window.location.href = "/calculator/electricity?ev=1"} style={{ padding: "10px 22px", borderRadius: 30, fontSize: 13, fontWeight: 800, background: `linear-gradient(135deg,${C.teal},#1A56A4)`, border: "none", color: "#fff", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
            {lang === "nl" ? "Vergelijk plannen →" : lang === "fr" ? "Comparer les plans →" : "Compare plans →"}
          </button>
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
          {selected && (() => {
            const maxPower = Math.max(...(selected.Connections?.map(c => c.PowerKW || 0) || [22]));
            const chargeKwh = 30; // typical 30 kWh charge
            const costNow = mwh != null ? ((mwh / 1000) * chargeKwh * 1.21).toFixed(2) : null; // incl 21% VAT
            const chargeTime = maxPower > 0 ? (chargeKwh / maxPower * 60).toFixed(0) : null;
            return (
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

              {/* Price + cost estimate */}
              <div style={{ background: `${col}10`, border: `1px solid ${col}30`, borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>⚡ CURRENT EPEX PRICE</div>
                    <div style={{ fontSize: 24, fontWeight: 900, fontFamily: "monospace", color: col }}>
                      €{mwh != null ? mwh.toFixed(1) : "—"}
                    </div>
                    <div style={{ fontSize: 10, color: C.muted }}>/MWh</div>
                  </div>
                  {costNow && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>30 kWh CHARGE COSTS</div>
                      <div style={{ fontSize: 24, fontWeight: 900, fontFamily: "monospace", color: col }}>
                        €{costNow}
                      </div>
                      <div style={{ fontSize: 10, color: C.muted }}>incl. VAT</div>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 12, color: col, fontWeight: 700 }}>{getPriceAdvice(mwh, lang)}</div>
                {chargeTime && maxPower > 0 && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                    ⏱ ~{chargeTime < 60 ? `${chargeTime} min` : `${(chargeTime/60).toFixed(1)}h`} at {maxPower}kW
                  </div>
                )}
                {cheapHours.length > 0 && cheapHours[0].hour != null && (
                  <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(0,200,150,0.07)", borderRadius: 8, fontSize: 11, color: C.green, fontWeight: 600 }}>
                    💡 {lang === "nl" ? `Goedkoopste thuislaadtijd vandaag: ${String(cheapHours[0].hour).padStart(2,"0")}:00 (€${cheapHours[0].price_eur_mwh?.toFixed(0) ?? cheapHours[0].price?.toFixed(0)}/MWh)` : lang === "fr" ? `Meilleure heure de recharge: ${String(cheapHours[0].hour).padStart(2,"0")}:00` : `Cheapest home charging today: ${String(cheapHours[0].hour).padStart(2,"0")}:00 (€${cheapHours[0].price_eur_mwh?.toFixed(0) ?? cheapHours[0].price?.toFixed(0)}/MWh)`}
                    {" "}<a href="/ev-charging-belgium" onClick={e => { e.preventDefault(); window.location.href = "/ev-charging-belgium"; }} style={{ color: C.teal, textDecoration: "none" }}>Full planner →</a>
                  </div>
                )}
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
                      const connCost = power && mwh != null ? ((mwh / 1000) * chargeKwh * 1.21).toFixed(2) : null;
                      return (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 12px" }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>
                              {CONNECTOR_TYPES[conn.ConnectionTypeID] || `Type ${conn.ConnectionTypeID}`}
                            </div>
                            {conn.Quantity > 1 && <div style={{ fontSize: 10, color: C.muted }}>×{conn.Quantity}</div>}
                          </div>
                          <div style={{ textAlign: "right" }}>
                            {power && (
                              <div style={{ fontSize: 13, fontWeight: 800, color: isFast ? C.orange : C.green, fontFamily: "monospace" }}>
                                {power} kW
                              </div>
                            )}
                            {connCost && <div style={{ fontSize: 10, color: C.muted }}>~€{connCost}/30kWh</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions row */}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${selected.AddressInfo?.Latitude},${selected.AddressInfo?.Longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, display: "block", textAlign: "center", padding: "10px 0", borderRadius: 10, background: "rgba(13,148,136,0.15)", border: "1px solid rgba(13,148,136,0.3)", color: C.teal, textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
                  🗺️ Directions
                </a>
                <div data-share-panel style={{ position: "relative" }}>
                  <button
                    onClick={() => setShareOpen(o => !o)}
                    style={{ padding: "10px 14px", borderRadius: 10, background: shareOpen ? "rgba(59,130,246,0.22)" : "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", color: C.blue, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                    📤 Share price
                  </button>

                  {shareOpen && (() => {
                    const name  = selected.AddressInfo?.Title || "EV station";
                    const addr  = [selected.AddressInfo?.AddressLine1, selected.AddressInfo?.Town].filter(Boolean).join(", ");
                    const price = mwh != null ? `€${mwh.toFixed(1)}/MWh` : "";
                    const cost  = costNow ? ` · 30kWh ~€${costNow}` : "";
                    const shareText = `⚡ ${name}${addr ? ` — ${addr}` : ""}\nCurrent EPEX price: ${price}${cost}\n🔗 smartprice.be/ev-charging-stations-belgium`;
                    const encodedText = encodeURIComponent(shareText);
                    const pageUrl = encodeURIComponent("https://smartprice.be/ev-charging-stations-belgium");

                    const channels = [
                      {
                        label: "WhatsApp", icon: "💬", color: "#25D366", bg: "rgba(37,211,102,0.1)",
                        href: `https://wa.me/?text=${encodedText}`,
                      },
                      {
                        label: "X / Twitter", icon: "𝕏", color: "#fff", bg: "rgba(255,255,255,0.08)",
                        href: `https://twitter.com/intent/tweet?text=${encodedText}`,
                      },
                      {
                        label: "Facebook", icon: "f", color: "#1877F2", bg: "rgba(24,119,242,0.1)",
                        href: `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}&quote=${encodedText}`,
                      },
                      {
                        label: "Email", icon: "✉", color: "#94A3B8", bg: "rgba(148,163,184,0.1)",
                        href: `mailto:?subject=${encodeURIComponent(`EV charging price at ${name}`)}&body=${encodedText}`,
                      },
                    ];

                    return (
                      <div style={{ position: "absolute", bottom: "calc(100% + 8px)", right: 0, zIndex: 200, background: "#0A1628", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "12px", width: 210, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
                        <div style={{ fontSize: 11, color: "#445566", marginBottom: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>{TD.shareThisPrice || "Share this price"}</div>
                        {channels.map(ch => (
                          <a key={ch.label} href={ch.href} target="_blank" rel="noopener noreferrer"
                            onClick={() => setShareOpen(false)}
                            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 9, background: ch.bg, marginBottom: 6, textDecoration: "none", transition: "opacity 0.15s" }}
                            onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
                            onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                            <span style={{ width: 26, height: 26, borderRadius: 7, background: ch.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: ch.color, flexShrink: 0 }}>{ch.icon}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#C4D4E0" }}>{ch.label}</span>
                          </a>
                        ))}
                        <button
                          onClick={() => {
                            navigator.clipboard?.writeText(shareText).then(() => {
                              setCopied(true);
                              setTimeout(() => { setCopied(false); setShareOpen(false); }, 1500);
                            });
                          }}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 9, background: copied ? "rgba(0,200,150,0.1)" : "rgba(255,255,255,0.04)", border: "none", width: "100%", cursor: "pointer", marginTop: 2 }}>
                          <span style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(0,200,150,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#00C896", flexShrink: 0 }}>{copied ? "✓" : "🔗"}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: copied ? "#00C896" : "#C4D4E0" }}>{copied ? (TD.copied || "Copied!") : (TD.copyLink || "Copy link")}</span>
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
            );
          })()}
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