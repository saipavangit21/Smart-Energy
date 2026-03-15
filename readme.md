# 🇧🇪 SmartPrice.be

**Belgian energy price monitoring platform** — live EPEX Spot electricity prices, TTF gas prices, personalised supplier comparison, and smart EV charging times.

🌐 **[smartprice.be](https://smartprice.be)** · 📡 **[API Docs](https://smartprice.be/api-docs)** · 🚗 **[EV Charging](https://smartprice.be/ev-charging-belgium)**

---

## What It Does

- **Live EPEX Spot prices** — hourly Belgian electricity prices, updated every 15 minutes
- **TTF gas prices** — real-time natural gas prices alongside electricity
- **5 cheapest hours today** — best windows for EV charging, washing machine, dishwasher
- **Plan calculator** — compare all 7 Belgian suppliers with personalised annual cost including grid fees & VAT
- **Price alerts** — email notification when prices drop below your threshold
- **Public API** — free REST API for Home Assistant, Node-RED, and developer integrations
- **Trilingual** — EN / NL / FR

---

## Tech Stack

| Layer | Technology | Host |
|-------|-----------|------|
| Frontend | React + Vite | Vercel (CDN) |
| Backend | Node.js + Express | Railway (EU West, Amsterdam) |
| Database | PostgreSQL | Supabase (Ireland) |
| Email | Resend | Resend |
| Auth | JWT + Google OAuth | Self-hosted on Railway |

---

## Project Structure

```
StroomprijsApp/
├── frontend/                    # React + Vite frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx        # Main electricity/gas dashboard
│   │   │   ├── LandingPage.jsx      # Marketing landing page
│   │   │   ├── CalculatorPage.jsx   # 4-step plan calculator
│   │   │   ├── AuthPage.jsx         # Login / register
│   │   │   ├── ProfilePage.jsx      # User profile & settings
│   │   │   ├── GasTab.jsx           # Gas price dashboard
│   │   │   ├── AdminDashboard.jsx   # Admin analytics (secret-protected)
│   │   │   ├── PrivacyPolicy.jsx    # GDPR privacy policy (EN/NL/FR)
│   │   │   ├── ApiPage.jsx          # API documentation page
│   │   │   └── seo/
│   │   │       ├── EpexBelgiumPage.jsx        # /epex-price-belgium
│   │   │       ├── CheapestHoursPage.jsx      # /cheapest-electricity-hours-belgium
│   │   │       └── EvChargingPage.jsx         # /ev-charging-belgium
│   │   ├── context/
│   │   │   ├── AuthContext.jsx       # JWT auth state
│   │   │   └── LanguageContext.jsx   # EN/NL/FR language state
│   │   ├── components/
│   │   │   └── LangSwitcher.jsx      # Language toggle pill
│   │   ├── utils/
│   │   │   └── priceUtils.js         # Price formatting & supplier data
│   │   ├── i18n.js                   # All EN/NL/FR translations
│   │   ├── App.jsx                   # Route handler (no react-router)
│   │   └── main.jsx                  # Entry point with providers
│   └── vercel.json                   # Proxy /api/* and /auth/* to Railway
│
└── backend/                     # Node.js + Express API
    ├── server.js                # Express app + analytics middleware
    ├── analytics.js             # Event tracking + admin endpoints
    ├── data/
    │   └── tariffs.json         # Supplier tariff seed data
    └── routes/
        ├── suppliers.js         # Tariff calculation + weekly scraper
        └── auth.js              # JWT auth + Google OAuth
```

---

## Routes

### Frontend Routes (SPA, no react-router)

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
| `/api-docs` | API Documentation |

### Backend API (all via smartprice.be/api/*)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/current` | None | Current EPEX price |
| GET | `/api/prices/today` | None | All 24h prices + stats |
| GET | `/api/cheapest?hours=N` | None | N cheapest upcoming hours |
| GET | `/api/health` | None | System health check |
| GET | `/api/suppliers/appliances` | None | Electricity appliance list |
| GET | `/api/suppliers/gas-appliances` | None | Gas appliance list |
| POST | `/api/suppliers/calculate` | JWT | Electricity plan results |
| POST | `/api/suppliers/calculate-gas` | JWT | Gas plan results |
| POST | `/api/suppliers/scrape` | Admin secret | Trigger tariff scrape |
| GET | `/api/admin/analytics?days=N` | Admin secret | Analytics summary |
| GET | `/api/admin/users` | Admin secret | User list |
| POST | `/auth/register` | None | Email registration |
| POST | `/auth/login` | None | Email login |
| GET | `/auth/me` | JWT | Current user |
| PUT | `/auth/preferences` | JWT | Update preferences |
| DELETE | `/auth/delete-account` | JWT | Delete account |
| GET | `/auth/google` | None | Google OAuth start |
| GET | `/auth/google/callback` | None | Google OAuth callback |

---

## Environment Variables

### Railway (Backend)

```env
DATABASE_URL=postgresql://...        # Supabase connection string
JWT_SECRET=your-jwt-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
ADMIN_SECRET=your-admin-secret       # Must match Vercel VITE_ADMIN_SECRET
RESEND_API_KEY=your-resend-key
FRONTEND_URL=https://smartprice.be
```

### Vercel (Frontend)

```env
VITE_API_URL=https://smart-energy-production-aef3.up.railway.app
VITE_ADMIN_SECRET=your-admin-secret  # Must match Railway ADMIN_SECRET exactly
VITE_GOOGLE_CLIENT_ID=your-google-client-id
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

**Frontend** → push to `main` → Vercel auto-deploys (~2 min)

**Backend** → push to `main` → Railway auto-deploys (~3 min)

```bash
git add .
git commit -m "your message"
git push origin main
```

### Vercel Proxy

`frontend/vercel.json` proxies API requests through the smartprice.be domain:

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

The API is free and requires no authentication for price data.

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

Full API documentation: **[smartprice.be/api-docs](https://smartprice.be/api-docs)**

---

## i18n (Translations)

All UI strings are in `frontend/src/i18n.js`. The language system supports EN, NL, FR.

```javascript
// In any component:
import { useLanguage } from '../context/LanguageContext';
const { tSection } = useLanguage();
const TC = tSection('common');      // common strings
const CC = tSection('calculator');  // calculator strings
const L  = tSection('landing');     // landing page strings
```

Translation sections: `common`, `landing`, `dashboard`, `auth`, `alerts`, `calculator`, `priceLabels`, `profile`, `appliances`

---

## Known Issues

| Issue | Status |
|-------|--------|
| VREG tariff scraper | Disabled — API requires authentication (401). Fallback to seed data. |
| CallMePower scraper | Active |
| Direct supplier scrapers | Active (Bolt, Octa+) |

---

## Data Sources

- **Electricity**: [Energy-Charts.info](https://energy-charts.info) (Fraunhofer ISE) · [Elia Open Data](https://opendata.elia.be) (CC BY 4.0) · ENTSO-E
- **Gas**: ICE EEX TTF Natural Gas index
- **Supplier tariffs**: Weekly scrape from supplier websites + manual verification

---

## License

Private repository. All rights reserved. © 2026 SmartPrice.be

---

## Contact

📧 hello@smartprice.be · 🌐 smartprice.be