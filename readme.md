# SmartPrice.be

**Belgian energy price monitoring platform** — live EPEX Spot electricity prices, TTF gas prices, personalised supplier comparison, smart EV charging times, and energy mix insights.

Live: **[smartprice.be](https://smartprice.be)** · API Docs: **[smartprice.be/api-docs](https://smartprice.be/api-docs)** · EV Stations: **[smartprice.be/ev-charging-stations-belgium](https://smartprice.be/ev-charging-stations-belgium)**

---

## What It Does

- **Live EPEX Spot prices** — hourly Belgian electricity prices, updated every 15 minutes
- **TTF gas prices** — real-time natural gas prices via ICE/TTF index
- **5 cheapest hours today** — optimal windows for EV charging, washing machine, dishwasher
- **Plan calculator** — compare all Belgian electricity and gas suppliers with personalised annual cost including grid fees and VAT
- **Price alerts** — email notification when prices drop below your threshold
- **Energy mix** — Belgium's real-time generation by source (nuclear, solar, wind, gas…), CO₂ intensity, and cross-border flows via ENTSO-E
- **EV stations map** — all public charging stations in Belgium with live price context and share button
- **Uptime monitoring** — backend pings the frontend every 5 minutes and emails an alert on failure/recovery
- **Public API** — free REST API for Home Assistant, Node-RED, and developer integrations
- **Trilingual** — EN / NL / FR

---

## Tech Stack

| Layer | Technology | Host |
|-------|-----------|------|
| Frontend | React + Vite | Vercel (CDN) |
| Backend | Node.js + Express | Railway (EU West, Amsterdam) |
| Database | PostgreSQL | Supabase (Ireland) |
| Email | Resend (hello@smartprice.be) | Resend |
| Auth | JWT + Google OAuth | Self-hosted on Railway |
| Electricity data | Energy-Charts.info / ENTSO-E | External API |
| Gas data | OilPriceAPI (TTF) | External API |

---

## Project Structure

```
Smart Energy/
├── readme.md
├── project.md
├── outreach/
│   ├── email_templates.md          # EN/NL/FR outreach email templates
│   └── ev_outreach_contacts.csv    # 20 Belgian auto industry contacts
│
└── StroomprijsApp/
    ├── frontend/                   # React + Vite frontend
    │   ├── src/
    │   │   ├── pages/
    │   │   │   ├── Dashboard.jsx           # Electricity price dashboard (tabs: prices, calculator, gas)
    │   │   │   ├── LandingPage.jsx         # Marketing landing page
    │   │   │   ├── CalculatorPage.jsx      # 4-step plan calculator
    │   │   │   ├── AuthPage.jsx            # Login / register
    │   │   │   ├── ProfilePage.jsx         # User profile, settings, energy mix, tools
    │   │   │   ├── GasTab.jsx              # Gas price dashboard (TTF + supplier comparison)
    │   │   │   ├── AdminDashboard.jsx      # Admin analytics (secret-protected)
    │   │   │   ├── PrivacyPolicy.jsx       # GDPR privacy policy (EN/NL/FR)
    │   │   │   ├── ApiPage.jsx             # API documentation page
    │   │   │   └── seo/
    │   │   │       ├── EpexBelgiumPage.jsx         # /epex-price-belgium
    │   │   │       ├── CheapestHoursPage.jsx       # /cheapest-electricity-hours-belgium
    │   │   │       ├── EvChargingPage.jsx          # /ev-charging-belgium
    │   │   │       └── EvStationsPage.jsx          # /ev-charging-stations-belgium (map + share)
    │   │   ├── components/
    │   │   │   ├── EnergyMixSection.jsx    # Generation mix, CO₂, cross-border flows (ENTSO-E)
    │   │   │   └── LangSwitcher.jsx        # EN/NL/FR toggle pill
    │   │   ├── context/
    │   │   │   ├── AuthContext.jsx         # JWT auth state
    │   │   │   └── LanguageContext.jsx     # Language state
    │   │   ├── utils/
    │   │   │   └── priceUtils.js           # Price formatting & supplier data
    │   │   ├── i18n.js                     # All EN/NL/FR translations
    │   │   ├── App.jsx                     # Route handler
    │   │   └── main.jsx                    # Entry point with providers
    │   └── vercel.json                     # Proxy /api/* and /auth/* to Railway
    │
    └── backend/                    # Node.js + Express API
        ├── server.js               # Express app, ENTSO-E endpoints, admin endpoints
        ├── db.js                   # PostgreSQL pool (Supabase)
        ├── analytics.js            # Event tracking + admin endpoints
        ├── email-alerts.js         # Hourly price alert checker + email sender (Resend)
        ├── uptime-monitor.js       # Pings smartprice.be every 5 min, alerts on down/recovery
        ├── data/
        │   └── tariffs.json        # Supplier tariff seed data
        └── routes/
            ├── auth.js             # JWT auth + Google OAuth
            ├── gas.js              # TTF gas prices + Belgian supplier comparison
            ├── suppliers.js        # Electricity tariff calculation + weekly scraper
            └── google.js           # Google OAuth handler
```

---

## Frontend Routes

| Path | Page |
|------|------|
| `/` | Landing (logged out) or Dashboard (logged in) |
| `/calculator/electricity` | Plan Calculator |
| `/calculator/gas` | Plan Calculator (gas tab) |
| `/oauth/callback` | Google OAuth callback |
| `/privacy` | Privacy Policy |
| `/admin` | Admin Dashboard (secret-protected) |
| `/epex-price-belgium` | SEO — Live EPEX price page |
| `/belpex-price-today` | SEO — BELPEX alias |
| `/cheapest-electricity-hours-belgium` | SEO — Cheapest hours |
| `/ev-charging-belgium` | SEO — EV charging guide |
| `/ev-charging-stations-belgium` | EV stations map (OpenChargeMap + share button) |
| `/api-docs` | API Documentation |

---

## Backend API

All endpoints accessible via `smartprice.be/api/*` (proxied by Vercel).

### Electricity

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/current` | None | Current EPEX price |
| GET | `/api/prices/today` | None | All 24h prices + stats |
| GET | `/api/cheapest?hours=N` | None | N cheapest upcoming hours |
| GET | `/api/health` | None | System health check |
| GET | `/api/generation/today` | None | Belgium generation mix (ENTSO-E A75) |
| GET | `/api/flows/today` | None | Cross-border physical flows (ENTSO-E A11) |

### Gas

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/gas/current` | None | Current TTF price (€/MWh + c€/kWh) |
| GET | `/api/gas/history?days=30` | None | TTF price history (up to 90 days) |
| GET | `/api/gas/suppliers?consumption=13000` | None | Belgian gas supplier comparison |
| GET | `/api/gas/combined?elec=3500&gas=13000` | None | Best electricity + gas combos |

### Suppliers / Calculator

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/suppliers/appliances` | None | Electricity appliance list |
| GET | `/api/suppliers/gas-appliances` | None | Gas appliance list |
| POST | `/api/suppliers/calculate` | JWT | Electricity plan results |
| POST | `/api/suppliers/calculate-gas` | JWT | Gas plan results |
| POST | `/api/suppliers/scrape` | Admin secret | Trigger tariff scrape |

### Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/analytics?days=N` | Admin secret | Analytics summary |
| GET | `/api/admin/users` | Admin secret | User list |
| POST | `/api/admin/send-template` | Admin secret | Send one-off email via Resend |

#### `/api/admin/send-template` body

```json
{
  "secret": "ADMIN_SECRET",
  "to": "recipient@email.com",
  "subject": "Subject line",
  "html": "<p>Email body HTML</p>"
}
```

Or with a Resend template UUID:

```json
{
  "secret": "ADMIN_SECRET",
  "to": "recipient@email.com",
  "template_id": "resend-template-uuid",
  "data": { "name": "Koen" }
}
```

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | None | Email registration |
| POST | `/auth/login` | None | Email or name login |
| GET | `/auth/me` | JWT | Current user |
| PUT | `/auth/preferences` | JWT | Update preferences |
| DELETE | `/auth/delete-account` | JWT | Delete account |
| GET | `/auth/google` | None | Google OAuth start |
| GET | `/auth/google/callback` | None | Google OAuth callback |
| POST | `/auth/refresh` | None | Refresh access token |

---

## Environment Variables

### Railway (Backend)

```env
DATABASE_URL=postgresql://...           # Supabase connection string
JWT_SECRET=...
JWT_REFRESH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ADMIN_SECRET=...                        # Must match Vercel VITE_ADMIN_SECRET
RESEND_API_KEY=...                      # Resend API key (domain: smartprice.be)
FRONTEND_URL=https://smartprice.be
FRONTEND_URL_PROD=https://smartprice.be # Used by uptime monitor
ENTSOE_API_KEY=...                      # ENTSO-E transparency platform token
OIL_PRICE_API_KEY=...                   # OilPriceAPI key for TTF gas prices (optional — falls back to €34.50/MWh)
ALERT_ADMIN_EMAIL=hello@smartprice.be   # Email to receive uptime alerts
```

### Vercel (Frontend)

```env
VITE_API_URL=https://smart-energy-production-aef3.up.railway.app
VITE_ADMIN_SECRET=...                   # Must match Railway ADMIN_SECRET
VITE_GOOGLE_CLIENT_ID=...
```

---

## Uptime Monitoring

The backend runs a built-in uptime monitor (`uptime-monitor.js`):

- Pings `https://smartprice.be` every **5 minutes**
- Requires **2 consecutive failures** before sending an alert (avoids false positives)
- Sends a `SmartPrice.be is DOWN` email to `ALERT_ADMIN_EMAIL` via Resend
- Sends a recovery email when the site comes back up
- 1-hour cooldown between alerts to prevent spam

For monitoring the **backend itself** (Railway can't self-monitor when crashed), set up a free external check at [UptimeRobot](https://uptimerobot.com) pointing at:

```
https://smart-energy-production-aef3.up.railway.app/api/health
```

---

## Local Development

```bash
# Clone
git clone https://github.com/saipavangit21/Smart-Energy.git
cd "Smart Energy/StroomprijsApp"

# Backend
cd backend
npm install
cp .env.example .env   # fill in your env vars
node server.js         # runs on :3001

# Frontend
cd ../frontend
npm install
cp .env.example .env.local  # set VITE_API_URL=http://localhost:3001
npm run dev            # runs on :5173
```

---

## Deployment

Push to `main` — both Vercel and Railway auto-deploy.

```bash
git add .
git commit -m "your message"
git push origin main
```

- **Frontend** → Vercel auto-deploys in ~2 min
- **Backend** → Railway auto-deploys in ~3 min

### Vercel Proxy

`frontend/vercel.json` routes all API traffic through the smartprice.be domain to avoid CORS:

```json
{
  "rewrites": [
    { "source": "/api/:path*",  "destination": "https://smart-energy-production-aef3.up.railway.app/api/:path*" },
    { "source": "/auth/:path*", "destination": "https://smart-energy-production-aef3.up.railway.app/auth/:path*" },
    { "source": "/(.*)",        "destination": "/index.html" }
  ]
}
```

---

## Public API

No authentication required for price data endpoints.

```yaml
# Home Assistant configuration.yaml
sensor:
  - platform: rest
    name: "EPEX Spot Belgium"
    resource: https://smartprice.be/api/current
    value_template: "{{ value_json.current.price_eur_mwh }}"
    unit_of_measurement: "€/MWh"
    scan_interval: 900

  - platform: rest
    name: "Belgium Cheapest Hours"
    resource: https://smartprice.be/api/cheapest?hours=5
    value_template: "{{ value_json.cheapest_hours[0].price_eur_mwh }}"
    unit_of_measurement: "€/MWh"
    scan_interval: 3600
```

Full docs: **[smartprice.be/api-docs](https://smartprice.be/api-docs)**

---

## i18n

All UI strings are in `frontend/src/i18n.js`. Supported languages: EN, NL, FR.

```javascript
import { useLanguage } from '../context/LanguageContext';
const { tSection } = useLanguage();
const TC = tSection('common');
const DC = tSection('dashboard');
```

Translation sections: `common`, `landing`, `dashboard`, `auth`, `alerts`, `calculator`, `priceLabels`, `profile`, `appliances`

---

## Data Sources

| Data | Source | Update frequency |
|------|--------|-----------------|
| Electricity spot prices | [Energy-Charts.info](https://energy-charts.info) (Fraunhofer ISE) | Every 15 min |
| Generation mix / flows | [ENTSO-E Transparency Platform](https://transparency.entsoe.eu) | Hourly |
| Gas TTF prices | [OilPriceAPI](https://oilpriceapi.com) | Daily (fallback: €34.50/MWh) |
| Supplier tariffs | Supplier websites + VREG/CWaPE | Weekly scrape |
| EV stations | [OpenChargeMap API](https://openchargemap.org) | Real-time |

---

## Known Issues

| Issue | Status |
|-------|--------|
| VREG tariff scraper | Disabled — API requires authentication (401). Fallback to seed data. |
| OilPriceAPI TTF | Requires paid plan for live data. Fallback price €34.50/MWh used on free tier. |
| ENTSO-E generation data | ~1 hour delay. Error state shows retry button in UI. |

---

## License

Private repository. All rights reserved. © 2026 SmartPrice.be

---

## Contact

hello@smartprice.be · smartprice.be
