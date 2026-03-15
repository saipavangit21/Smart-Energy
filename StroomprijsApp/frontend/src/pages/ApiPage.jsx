/**
 * pages/ApiPage.jsx
 * Public API documentation for Home Assistant / developers
 * Route: /api-docs
 */
import { useState } from "react";
import LangSwitcher from "../components/LangSwitcher";

const API = "https://smartprice.be";

const C = {
  bg: "#060B14", card: "#0D1626", border: "rgba(255,255,255,0.08)",
  teal: "#0D9488", green: "#059669", yellow: "#D97706",
  text: "#E2E8F0", muted: "#64748B", code: "#0A1628",
};

function Code({ children, lang = "json" }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: "relative", marginBottom: 16 }}>
      <pre style={{ background: C.code, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", fontSize: 12, fontFamily: "monospace", color: "#7DD3FC", overflowX: "auto", margin: 0, lineHeight: 1.6 }}>
        {children}
      </pre>
      <button onClick={() => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        style={{ position: "absolute", top: 8, right: 8, background: copied ? C.green : "rgba(255,255,255,0.08)", border: `1px solid ${C.border}`, color: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>
        {copied ? "✓" : "Copy"}
      </button>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: C.teal, marginBottom: 16, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>{title}</h2>
      {children}
    </div>
  );
}

function Endpoint({ method, path, desc, params, response }) {
  const [open, setOpen] = useState(false);
  const methodColor = method === "GET" ? C.green : C.yellow;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 12, overflow: "hidden" }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: "14px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: methodColor, background: `${methodColor}18`, border: `1px solid ${methodColor}44`, borderRadius: 6, padding: "3px 8px", fontFamily: "monospace", flexShrink: 0 }}>{method}</span>
        <span style={{ fontSize: 13, fontFamily: "monospace", color: "#7DD3FC", flex: 1 }}>{path}</span>
        <span style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 14, color: C.muted, marginTop: 14, lineHeight: 1.7 }}>{desc}</p>
          {params && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 16 }}>Parameters</div>
              <Code>{params}</Code>
            </>
          )}
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 16 }}>Example Response</div>
          <Code>{response}</Code>
        </div>
      )}
    </div>
  );
}

export default function ApiPage({ onGetStarted }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${C.border}`, padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(6,11,20,0.9)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 50 }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: C.text }}>
          <span>🇧🇪</span>
          <span style={{ fontSize: 16, fontWeight: 900 }}>SmartPrice</span>
          <span style={{ fontSize: 10, color: C.teal, background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.25)", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>API</span>
        </a>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <LangSwitcher />
          <a href="/" onClick={e => { e.preventDefault(); onGetStarted(); }} style={{ padding: "8px 18px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: `linear-gradient(135deg,${C.teal},#1A56A4)`, color: "#fff", textDecoration: "none" }}>Dashboard</a>
        </div>
      </nav>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 20px" }}>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.25)", borderRadius: 30, padding: "5px 14px", fontSize: 12, color: C.teal, fontWeight: 700, marginBottom: 16 }}>
            🔓 Free · No API key required · CC BY 4.0
          </div>
          <h1 style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 900, letterSpacing: "-1.5px", margin: "0 0 16px", lineHeight: 1.1 }}>
            <span style={{ background: `linear-gradient(135deg,#fff 40%,${C.teal})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              SmartPrice.be API
            </span>
          </h1>
          <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.7, maxWidth: 620, margin: 0 }}>
            Public REST API for Belgian electricity and gas prices. Use it in Home Assistant automations, Node-RED flows, or any application. Free, no authentication required for price data.
          </p>
        </div>

        {/* Base URL */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 20px", marginBottom: 40 }}>
          <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Base URL</div>
          <Code>{API}</Code>
          <div style={{ fontSize: 12, color: C.muted }}>All endpoints return JSON. CORS enabled for all origins.</div>
        </div>

        {/* Home Assistant section */}
        <Section title="🏠 Home Assistant Integration">
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>
            Add SmartPrice live EPEX prices to Home Assistant using the <strong style={{ color: C.text }}>RESTful sensor</strong> integration. No custom component needed.
          </p>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>configuration.yaml</div>
          <Code>{`sensor:
  - platform: rest
    name: "EPEX Spot Belgium"
    resource: ${API}/api/current
    value_template: "{{ value_json.current.price_eur_mwh }}"
    unit_of_measurement: "€/MWh"
    scan_interval: 900  # every 15 minutes
    json_attributes:
      - current

  - platform: rest
    name: "Belgium Cheapest Hours"
    resource: ${API}/api/cheapest?hours=5
    value_template: "{{ value_json.cheapest_hours[0].price_eur_mwh }}"
    unit_of_measurement: "€/MWh"
    scan_interval: 3600  # every hour
    json_attributes:
      - cheapest_hours`}</Code>

          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>Automation example — start EV charging at cheapest hour</div>
          <Code>{`automation:
  - alias: "Start EV charging at cheapest hour"
    trigger:
      - platform: time_pattern
        hours: "*"
        minutes: "0"
    condition:
      - condition: template
        value_template: >
          {{ states('sensor.epex_spot_belgium') | float < 60 }}
    action:
      - service: switch.turn_on
        target:
          entity_id: switch.ev_charger`}</Code>

          <div style={{ background: "rgba(13,148,136,0.06)", border: "1px solid rgba(13,148,136,0.2)", borderRadius: 12, padding: "14px 18px", fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
            💡 <strong style={{ color: C.text }}>Pro tip:</strong> Use the <code style={{ color: C.teal }}>/api/cheapest</code> endpoint to get the next 5 cheapest windows and automate scheduling. Combine with <code style={{ color: C.teal }}>input_boolean</code> helpers to enable/disable smart charging.
          </div>
        </Section>

        {/* Endpoints */}
        <Section title="📡 Endpoints">
          <Endpoint
            method="GET"
            path="/api/current"
            desc="Returns the current hour's EPEX Spot price for Belgium. Updates every 15 minutes."
            response={`{
  "success": true,
  "current": {
    "timestamp": "2026-03-15T14:00:00.000Z",
    "price_eur_mwh": 145.2,
    "price_eur_kwh": 0.000145,
    "source": "Energy-Charts",
    "day": "today",
    "hour": 14,
    "hour_label": "14:00",
    "is_current": true,
    "is_negative": false,
    "price_category": "expensive"
  },
  "timestamp": "2026-03-15T14:32:00.000Z"
}`}
          />

          <Endpoint
            method="GET"
            path="/api/prices/today"
            desc="Returns all 24 hourly prices for today (and tomorrow if available after 13:00 CET). Includes stats."
            response={`{
  "success": true,
  "source": "Energy-Charts",
  "data": [
    {
      "timestamp": "2026-03-15T00:00:00.000Z",
      "price_eur_mwh": 82.4,
      "price_eur_kwh": 0.0000824,
      "day": "today",
      "hour": 0,
      "hour_label": "00:00",
      "is_current": false,
      "is_negative": false,
      "price_category": "cheap"
    }
    // ... 23 more hours
  ],
  "stats": {
    "today": { "min": 18.2, "max": 183.5, "avg": 94.1, "negative_hours": 0 },
    "tomorrow": null
  }
}`}
          />

          <Endpoint
            method="GET"
            path="/api/cheapest?hours=5"
            desc="Returns the N cheapest upcoming hours (today + tomorrow). Perfect for scheduling appliances and EV charging."
            params={`hours  (optional, default: 5, max: 24)
           Number of cheapest hours to return`}
            response={`{
  "success": true,
  "cheapest_hours": [
    {
      "timestamp": "2026-03-15T02:00:00.000Z",
      "price_eur_mwh": 18.2,
      "price_eur_kwh": 0.0000182,
      "hour_label": "02:00",
      "price_category": "very_cheap"
    },
    // ... more hours
  ]
}`}
          />

          <Endpoint
            method="GET"
            path="/api/health"
            desc="Health check endpoint. Returns status of database, EPEX data and authentication service."
            response={`{
  "status": "ok",
  "version": "2.0.0",
  "checks": {
    "database": { "status": "ok" },
    "epex": { "status": "ok", "points": 96, "latest_price": 145.2 },
    "auth": { "status": "ok", "user_count": 11 }
  }
}`}
          />
        </Section>

        {/* Rate limits */}
        <Section title="⚡ Rate Limits & Usage">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Rate limit", value: "60 req/min", icon: "🔄" },
              { label: "Authentication", value: "None required", icon: "🔓" },
              { label: "Price updates", value: "Every 15 min", icon: "🕐" },
              { label: "Data license", value: "CC BY 4.0", icon: "📄" },
            ].map(s => (
              <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>{s.icon}</div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{s.value}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
            For high-volume use or commercial integrations, please contact <a href="mailto:hello@smartprice.be" style={{ color: C.teal }}>hello@smartprice.be</a>. Price data sourced from <a href="https://energy-charts.info" target="_blank" rel="noopener noreferrer" style={{ color: C.teal }}>Energy-Charts.info</a> (Fraunhofer ISE) and Elia Open Data under CC BY 4.0.
          </p>
        </Section>

        {/* Node-RED example */}
        <Section title="🔴 Node-RED / n8n / Other">
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 16 }}>
            Use a simple HTTP Request node pointed at any endpoint. No headers required.
          </p>
          <Code>{`// Node-RED HTTP Request node config:
// Method: GET
// URL: ${API}/api/current
// Return: Parsed JSON object

// Access price in function node:
const price = msg.payload.current.price_eur_mwh;
const category = msg.payload.current.price_category;

if (price < 50) {
  // Send "cheap" notification
  msg.payload = \`🟢 Cheap electricity: €\${price}/MWh\`;
  return [msg, null];
} else {
  msg.payload = null;
  return [null, msg];
}`}</Code>
        </Section>

        <div style={{ textAlign: "center", fontSize: 12, color: C.muted, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
          Questions? <a href="mailto:hello@smartprice.be" style={{ color: C.teal }}>hello@smartprice.be</a>
          {" · "}Data: Energy-Charts.info · Elia Open Data (CC BY 4.0)
          {" · "}<a href="/" style={{ color: C.teal }}>SmartPrice.be</a>
        </div>
      </div>
    </div>
  );
}