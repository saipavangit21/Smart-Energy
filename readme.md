# SmartPrice.be

**Belgian energy intelligence platform** — live EPEX Spot prices, EV fleet cost optimisation, smart meter integration, and CIR 92-compliant home-charging reimbursements.

Live: **[smartprice.be](https://smartprice.be)** · Business: **[smartprice.be/business](https://smartprice.be/business)** · Fleet Audit: **[smartprice.be/fleet-audit](https://smartprice.be/fleet-audit)** · Session Calc: **[smartprice.be/session-calc](https://smartprice.be/session-calc)**

---

## Products

### 1. SmartPrice Personal (`/`)
Consumer electricity & gas dashboard for Belgian households.

- **Live EPEX Spot prices** — hourly Belgian electricity prices, updated every 15 min
- **5 cheapest hours today/tomorrow** — optimal windows for EV charging, heat pump, dishwasher
- **Price alerts** — email when prices drop below your threshold
- **Weekly digest** — every Monday 08:00 Brussels, EPEX stats + cheapest hours
- **TTF gas prices** — real-time via ICE/TTF; compact tile on landing page
- **Negative price banner** — pulsing alert when EPEX < €0/MWh
- **Plan calculator** — compare all Belgian electricity/gas suppliers with personalised annual cost (grid fees + VAT)
- **Tesla Fleet API** — connect your Tesla; personalised charge-now vs wait card
- **Energy mix** — Belgium real-time generation (nuclear/solar/wind/gas), CO₂ intensity, cross-border flows (ENTSO-E)
- **EV stations map** — all Belgian public charge points via OpenStreetMap/Overpass (24h cache)
- **AI assistant** — Claude Haiku energy assistant
- **Trilingual** — EN / NL / FR
- **Public REST API** — free, no auth for price endpoints; used by Home Assistant, Node-RED

### 2. SmartPrice Business (`/business`)
B2B page targeting Belgian fleet managers.

- Dual-model pitch: **fleet energy cards** (Velocity, DKV, UTA) + **home-charging reimbursements**
- CREG vs EPEX explainer — why the quarterly flat rate costs fleets money
- Fleet ecosystem section: fleet card providers + social secretariaten (SD Worx, Securex, Partena, Group S, Acerta, Liantis)
- Audit modal: captures fleet size, current billing method, company email → stored as B2B lead
- Tool cards linking to fleet audit, session calculator, API docs
- Modal CREG/EPEX mini-explainer (€0.2833/kWh Q2 2026 vs real-time €0.05–0.45/kWh)
- Trilingual (EN/NL/FR)

### 3. Fleet Audit (`/fleet-audit`)
Free fleet-wide cost comparison tool.

- Input: fleet size, current reimbursement method, optional company/email for PDF
- **4 billing methods**: CREG reference tariff · Fleet energy cards (Velocity/DKV/UTA) · Fixed rate · Not sure
- Fleet card mode uses `PUBLIC_NETWORK_RATE = €0.45/kWh` baseline vs live EPEX
- CREG mode uses `CREG_RATE_KWH = €0.2833/kWh` Q2 2026 baseline
- Live EPEX rate fetched from `/api/prices/history?days=30` (30-day average)
- Results: annual overpayment, per-car/month saving, savings %
- Glossary box: CREG / EPEX Spot / Fleet energy cards explained
- PDF report generation (downloadable, gated by email capture)
- "Want per-session breakdown?" nudge → `/session-calc` with correct mode
- B2B lead stored in `b2b_leads` table on form submit

### 4. Session Calculator (`/session-calc`)
Per-session EPEX reimbursement calculator. Two modes via URL param:

**`/session-calc?mode=reimburse`** — Home charging reimbursement
- Enter: date + hour + kWh per session
- Calculates EPEX all-in price at that exact hour: `Math.max(0.04, (mwh/1000) * 1.21 + 0.13)`
- Shows: reimbursement per session, total across sessions
- CIR 92 compliant — uses actual market price at charge time
- CSV export

**`/session-calc?mode=fleet`** — Fleet card invoice checker
- Enter: date + hour + kWh + card amount charged
- Shows: EPEX rate at that hour, card charged, overpayment
- Identifies exactly which sessions on the Velocity/DKV/UTA invoice were overpriced
- Summary: total kWh, total card charged, total overpayment, overpayment %
- CSV export

EPEX data source: `/api/prices/history?days=90` — builds a `{ date → { hour → price } }` lookup map.

### 5. Fluvius P1 Integration (`/api/fluvius/*`) — Beta
Smart meter data ingestion via P1 port reader.

- `POST /api/fluvius/push` — receive readings from P1 reader or Home Assistant automation
- `GET /api/fluvius/latest` — latest reading + current EPEX price + charge signal
- `GET /api/fluvius/history?hours=N` — bucketed 5-min readings (max 168h)
- Charge signal: `charge_now` if all-in EPEX price ≤ €0.12/kWh, else `wait`
- Auth: Bearer JWT or `x-api-key` header (for HA automations)
- Auto-prunes readings older than 7 days per user
- Stores: `power_w`, `solar_w`, `energy_kwh`, `gas_m3`, `device_id`

---

## Tech Stack

| Layer | Technology | Host |
|-------|-----------|------|
| Frontend | React 18 + Vite | Vercel (CDN, auto-deploy from `main`) |
| Backend | Node.js 20 + Express | Railway EU West (Amsterdam, auto-deploy from `main`) |
| Database | PostgreSQL 15 | Supabase (Ireland) |
| Email | Resend (info@smartprice.be) | Resend |
| Auth | JWT access + refresh tokens + Google OAuth + Tesla Fleet API | Self-hosted on Railway |
| AI assistant | Claude Haiku (Anthropic API) | External API |
| Electricity data | Energy-Charts.info (Fraunhofer ISE) / ENTSO-E | External API |
| Gas data | OilPriceAPI (TTF) | External API |
| EV stations | OpenStreetMap Overpass API | External API |

---

## Project Structure

```
Smart Energy/
├── readme.md                           # This file
├── project.md                          # Investor/product notes
├── modifications.md                    # Change log (pre-git)
├── outreach/                           # B2B outreach materials
│   ├── drafted_emails_fleet_owners.md
│   ├── drafted_emails_renta_members.md
│   ├── drafted_emails_suppliers.md
│   ├── drafted_emails_widget.md
│   ├── facebook_posts.md
│   └── renta_members_outreach.csv
│
└── StroomprijsApp/
    ├── frontend/                       # React + Vite SPA
    │   ├── src/
    │   │   ├── pages/
    │   │   │   ├── LandingPage.jsx         # Consumer landing — EV planner, gas tile, negative price banner
    │   │   │   ├── Dashboard.jsx           # Main dashboard — ⚡ Electricity / 🔥 Gas / 🔋 EV tabs
    │   │   │   ├── BusinessPage.jsx        # B2B fleet page — dual model (fleet cards + reimbursement)
    │   │   │   ├── FleetAuditPage.jsx      # Fleet cost audit tool — CREG vs EPEX vs fleet card rates
    │   │   │   ├── SessionCalcPage.jsx     # Per-session calculator — reimburse + fleet card invoice modes
    │   │   │   ├── CalculatorPage.jsx      # 4-step plan calculator
    │   │   │   ├── AdminDashboard.jsx      # Admin — analytics, users, B2B leads, newsletter stats
    │   │   │   ├── AuthPage.jsx            # Login / register
    │   │   │   ├── AuthCallback.jsx        # Google OAuth callback
    │   │   │   ├── ProfilePage.jsx         # User profile, alerts, energy mix, tools
    │   │   │   ├── GasTab.jsx              # Gas price dashboard
    │   │   │   ├── SupplierCompare.jsx     # Side-by-side supplier comparison
    │   │   │   ├── ApiPage.jsx             # Public API documentation
    │   │   │   ├── PrivacyPolicy.jsx       # GDPR privacy policy (EN/NL/FR)
    │   │   │   └── seo/
    │   │   │       ├── EpexBelgiumPage.jsx         # /epex-price-belgium
    │   │   │       ├── CheapestHoursPage.jsx       # /cheapest-electricity-hours-belgium
    │   │   │       ├── EvChargingPage.jsx          # /ev-charging-belgium
    │   │   │       └── EvStationsPage.jsx          # /ev-charging-stations-belgium
    │   │   ├── components/
    │   │   │   ├── EnergyMixSection.jsx    # Generation mix, CO₂, cross-border flows
    │   │   │   ├── SmartAgent.jsx          # Claude Haiku AI assistant widget
    │   │   │   └── LangSwitcher.jsx        # EN/NL/FR toggle
    │   │   ├── context/
    │   │   │   ├── AuthContext.jsx         # JWT auth state
    │   │   │   └── LanguageContext.jsx     # Language state
    │   │   ├── hooks/
    │   │   │   └── usePrices.js            # EPEX price data hook
    │   │   ├── i18n.js                     # All EN/NL/FR strings (sections: common, landing, dashboard,
    │   │   │                               #   auth, alerts, calculator, business, priceLabels, profile…)
    │   │   ├── App.jsx                     # Route handler (no react-router — plain pathname matching)
    │   │   └── main.jsx                    # Entry point + providers
    │   └── vercel.json                     # Proxy /api/* and /auth/* → Railway
    │
    └── backend/                        # Node.js + Express API
        ├── server.js                   # Main Express app + all inline endpoints
        ├── db.js                       # PostgreSQL pool (Supabase)
        ├── analytics.js                # Event tracking middleware + admin analytics endpoint
        ├── email-alerts.js             # Hourly price alert checker + weekly digest sender
        ├── uptime-monitor.js           # Pings smartprice.be every 5 min, alerts on down/recovery
        ├── middleware/
        │   └── auth.js                 # requireAuth JWT middleware
        ├── data/
        │   └── tariffs.json            # Supplier tariff seed data
        └── routes/
            ├── auth.js                 # JWT auth + Google OAuth
            ├── google.js               # Google OAuth handler
            ├── tesla.js                # Tesla Fleet API OAuth + vehicle data
            ├── gas.js                  # TTF gas prices + Belgian supplier comparison
            ├── suppliers.js            # Electricity tariff calc + weekly scraper + EV stations (OSM)
            ├── fluvius.js              # P1 smart meter data ingestion + charge signal
            ├── outreach-send.js        # Admin: send B2B outreach / Fluvius waitlist emails
            └── daily-posts.js          # Admin: generate daily social media posts
```

---

## Frontend Routes

| Path | Page | Auth |
|------|------|------|
| `/` | Landing (logged out) or Dashboard (logged in) | Optional |
| `/calculator/electricity` | Plan Calculator | Optional |
| `/calculator/gas` | Plan Calculator — gas tab | Optional |
| `/business` | B2B Fleet Page | None |
| `/fleet-audit` | Fleet Cost Audit Tool | None |
| `/session-calc?mode=reimburse` | Per-Session Reimbursement Calculator | None |
| `/session-calc?mode=fleet` | Fleet Card Invoice Checker | None |
| `/api-docs` | API Documentation | None |
| `/epex-price-belgium` | SEO — Live EPEX price | None |
| `/belpex-price-today` | SEO — BELPEX alias | None |
| `/cheapest-electricity-hours-belgium` | SEO — Cheapest hours | None |
| `/ev-charging-belgium` | SEO — EV charging guide | None |
| `/ev-charging-stations-belgium` | EV stations map | None |
| `/oauth/callback` | Google OAuth callback | None |
| `/privacy` | Privacy Policy | None |
| `/admin` | Admin Dashboard | Admin secret |

**Routing**: No react-router. `App.jsx` uses `window.location.pathname` matching. Query params read via `new URLSearchParams(window.location.search)`.

---

## Backend API

All endpoints accessible via `smartprice.be/api/*` (proxied by Vercel → Railway).

### Electricity Prices

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/current` | None | Current EPEX price (€/MWh + all-in €/kWh) |
| GET | `/api/prices/today` | None | All 24h prices + stats |
| GET | `/api/prices/tomorrow` | None | Tomorrow's prices (available after ~13:00) |
| GET | `/api/prices/history?days=N` | None | Historical EPEX prices (max 90 days) |
| GET | `/api/cheapest?hours=N` | None | N cheapest upcoming hours |
| GET | `/api/health` | None | System health check |
| GET | `/api/status-banner` | None | Site-wide status/maintenance banner |
| GET | `/api/generation/today` | None | Belgium generation mix (ENTSO-E A75) |
| GET | `/api/flows/today` | None | Cross-border physical flows (ENTSO-E A11) |
| GET | `/api/user/dashboard` | JWT | Personalised dashboard (prices + user prefs + Tesla) |

**EPEX all-in consumer price formula:**
```js
Math.max(0.04, (price_eur_mwh / 1000) * 1.21 + 0.13)
// VAT 21% + €0.13/kWh grid/taxes
```

### Gas

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/gas/current` | None | Current TTF price (€/MWh + c€/kWh) |
| GET | `/api/gas/history?days=30` | None | TTF price history (max 90 days) |
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

### Fluvius P1 Smart Meter

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/fluvius/push` | JWT or `x-api-key` | Push P1 reading (power_w, solar_w, energy_kwh, gas_m3) |
| GET | `/api/fluvius/latest` | JWT or `x-api-key` | Latest reading + EPEX price + charge signal |
| GET | `/api/fluvius/history?hours=N` | JWT or `x-api-key` | 5-min bucketed readings (max 168h) |

**Push body:**
```json
{
  "power_w": 1234,
  "solar_w": 456,
  "energy_kwh": 12345.678,
  "gas_m3": 1234.567,
  "device_id": "p1-reader-1"
}
```

**Latest response:**
```json
{
  "reading": { "power_w": 1234, "solar_w": 456, "energy_kwh": 12345.678, "gas_m3": 1234.567, "recorded_at": "..." },
  "epex": { "price_eur_kwh": 0.087, "charge_signal": "charge_now", "charge_threshold_eur_kwh": 0.12 }
}
```

**Home Assistant automation example:**
```yaml
# configuration.yaml
rest_command:
  push_p1_to_smartprice:
    url: https://smartprice.be/api/fluvius/push
    method: POST
    headers:
      x-api-key: "YOUR_JWT_TOKEN"
      Content-Type: application/json
    payload: >
      {
        "power_w": {{ states('sensor.power_consumption') | int }},
        "solar_w": {{ states('sensor.solar_power') | int }},
        "energy_kwh": {{ states('sensor.energy_today') | float }},
        "gas_m3": {{ states('sensor.gas_total') | float }}
      }

automation:
  - alias: "Push P1 to SmartPrice every 10s"
    trigger:
      platform: time_pattern
      seconds: "/10"
    action:
      service: rest_command.push_p1_to_smartprice
```

### Leads & Newsletter

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/leads` | None | Capture email lead (source: landing / fluvius_waitlist / etc.) |
| GET | `/api/newsletter/subscribe?email=...&source=...` | None | Subscribe to weekly digest |
| GET | `/api/newsletter/unsubscribe?token=...` | None | One-click unsubscribe |

### Analytics (internal)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/business-ping` | None | Track business page view (fires on BusinessPage mount) |

### AI Assistant

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/agent/chat` | None | Claude Haiku energy assistant |

Body: `{ messages: [{role, content}] }` · Returns 503 if `ANTHROPIC_API_KEY` not set.

### Tesla Vehicle

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/tesla/vehicle` | JWT | Battery level, charging state, range |
| DELETE | `/api/tesla/disconnect` | JWT | Remove stored Tesla tokens |

### Admin

All admin endpoints require `x-admin-secret` header matching `ADMIN_SECRET` env var.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/analytics?days=N` | Analytics summary (events, sessions, funnel) |
| GET | `/api/admin/users` | All registered users |
| GET | `/api/admin/leads` | All email leads |
| GET | `/api/admin/newsletter-stats` | Newsletter subscriber count + active/unsubscribed |
| POST | `/api/admin/send-outreach` | Send B2B outreach or Fluvius waitlist emails |
| GET | `/api/admin/daily-posts` | Generate daily social media content |

**`/api/admin/send-outreach` body options:**

```json
// Send to all preset fleet/leasing contacts (initial outreach)
{ "preset": "all", "dryRun": false }

// Send follow-up to preset contacts
{ "preset": "all", "followUp": true }

// Send Fluvius waitlist status update
{ "preset": "fluvius_waitlist" }

// Send to specific contacts
{
  "contacts": [
    { "to": "name@company.be", "name": "Jan", "company": "Acme", "lang": "nl" }
  ]
}
```

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Email + password registration |
| POST | `/auth/login` | Email login → access + refresh tokens |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Invalidate refresh token |
| GET | `/auth/me` | Current user (JWT) |
| PUT | `/auth/preferences` | Update alert thresholds / supplier preferences |
| PUT | `/auth/profile` | Update display name |
| PUT | `/auth/change-password` | Change password |
| DELETE | `/auth/delete-account` | Delete account |
| GET | `/auth/google` | Google OAuth start |
| GET | `/auth/google/callback` | Google OAuth callback |
| GET | `/auth/tesla` | Tesla Fleet API OAuth start |
| GET | `/auth/tesla/callback` | Tesla OAuth callback |

---

## Analytics Events

Tracked in `analytics_events` table. Available in admin dashboard.

| Event | Trigger |
|-------|---------|
| `page_view` | Every request to the main app |
| `business_page_view` | BusinessPage mount → `/api/business-ping` |
| `ev_page_view` | EV stations / EV charging pages |
| `seo_page_view` | SEO pages (EPEX, cheapest hours) |
| `calculator_start` | Electricity calculator step 1 |
| `calculator_start_gas` | Gas calculator step 1 |
| `login_attempt_email` | POST `/auth/login` |
| `login_attempt_google` | GET `/auth/google` |
| `register_email` | POST `/auth/register` |

Dedup: 1 event per session per hour for page views (prevents polling inflation). Session ID via `sp_session` cookie (30-day).

---

## Database Tables

| Table | Description |
|-------|-------------|
| `users` | Registered users — email, hashed password, JWT refresh token, Google/Tesla providers, preferences (JSONB) |
| `analytics_events` | Page views, conversions, funnel events |
| `email_leads` | Pre-registration email capture (source: landing/fluvius_waitlist/business-audit-form) |
| `b2b_leads` | Fleet audit form submissions — email, company, fleet size, billing method, audit data (JSONB) |
| `newsletter_subscribers` | Active/unsubscribed newsletter list, unsubscribe token |
| `fleet_audit_reports` | PDF audit reports generated (email, company, fleet size, audit data, created_at) |
| `fluvius_readings` | P1 smart meter data — power_w, solar_w, energy_kwh, gas_m3 per user (7-day rolling window) |

---

## Fleet Rate Constants

```js
// FleetAuditPage.jsx + FleetAuditPage.jsx
CREG_RATE_KWH       = 0.2833   // Q2 2026 CREG reference tariff (updated quarterly)
PUBLIC_NETWORK_RATE = 0.45     // Belgian public network average (Velocity/DKV/UTA)
AVG_KWH_PER_CAR     = 200      // Average monthly kWh per fleet EV

// SessionCalcPage.jsx
GRID_COST = 0.13               // €/kWh grid costs + taxes
VAT       = 1.21               // Belgian VAT 21%
// All-in price: Math.max(0.04, (mwh/1000) * VAT + GRID_COST)
```

---

## Outreach System

**Preset contacts** (`outreach-send.js`): 24 verified contacts — Belgian leasing companies (Athlon, KBC Autolease, Drivalia, Van Mossel, MHC Mobility, Arval, Alphabet, Ayvens, Financial Fleet Services) + OEM fleet teams (BMW, Volvo, VW, Audi, Toyota, Renault, Tesla, Mercedes, Kia, Hyundai/Astara) + RENTA.

**Templates**:
- Initial outreach (EN/NL/FR) — CIR 92 compliance pitch
- Follow-up (EN/NL/FR) — "Did this reach the right person?"
- Fluvius waitlist update (NL) — P1 integration status + "use SmartPrice now"

**Campaign tags** (Resend):
- `fleet_outreach_jun2026`
- `fleet_followup_jun2026`
- `fluvius_waitlist_update_jun2026`

---

## Environment Variables

### Railway (Backend)

```env
DATABASE_URL=postgresql://...           # Supabase connection string
JWT_SECRET=...
JWT_REFRESH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ADMIN_SECRET=...                        # Header: x-admin-secret
RESEND_API_KEY=...                      # Resend (domain: smartprice.be)
ANTHROPIC_API_KEY=...                   # Claude Haiku (optional)
FRONTEND_URL=https://smartprice.be
FRONTEND_URL_PROD=https://smartprice.be
ENTSOE_API_KEY=...                      # ENTSO-E transparency platform
OIL_PRICE_API_KEY=...                   # OilPriceAPI for TTF gas (fallback: €34.50/MWh)
TESLA_CLIENT_ID=...
TESLA_CLIENT_SECRET=...
ALERT_ADMIN_EMAIL=info@smartprice.be
```

### Vercel (Frontend)

```env
VITE_API_URL=https://smart-energy-production-aef3.up.railway.app
VITE_ADMIN_SECRET=...
VITE_GOOGLE_CLIENT_ID=...
```

---

## DNS (Cloudflare)

SPF records must be **single merged records** per subdomain (RFC 7208).

| Name | Type | Content |
|------|------|---------|
| `smartprice.be` | TXT | `v=spf1 a mx include:spf.cloudemail.be include:_spf.mx.cloudflare.net -all` |
| `send` | TXT | `v=spf1 include:amazonses.com ~all` |

---

## Local Development

```bash
git clone https://github.com/saipavangit21/Smart-Energy.git
cd "Smart Energy/StroomprijsApp"

# Backend (port 3001)
cd backend && npm install
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, etc.
node server.js

# Frontend (port 5173)
cd ../frontend && npm install
# vite.config.js proxies /api/* and /auth/* to localhost:3001
npm run dev
```

---

## Deployment

Push to `main` — both Vercel and Railway auto-deploy.

```bash
git add <files>
git commit -m "feat: ..."
git push origin main
# Frontend live in ~2 min, backend live in ~3 min
```

**Vercel proxy** (`frontend/vercel.json`):
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

## Uptime Monitoring

`uptime-monitor.js` pings `https://smartprice.be` every 5 min. Requires 2 consecutive failures before alerting. Sends email on down + recovery. 1-hour cooldown between alerts.

For the Railway backend itself, set up an external check at [UptimeRobot](https://uptimerobot.com) → `https://smart-energy-production-aef3.up.railway.app/api/health`

---

## Known Issues / Limitations

| Issue | Status |
|-------|--------|
| VREG tariff scraper | Disabled — API requires auth (401). Falls back to seed data in `tariffs.json`. |
| OilPriceAPI TTF | Requires paid plan for live data. Fallback: €34.50/MWh on free tier. |
| ENTSO-E generation data | ~1 hour delay. Error state shows retry button in UI. |
| AI assistant | Returns 503 if `ANTHROPIC_API_KEY` not set; 402 if credits depleted. |
| CREG rate | Must be updated manually each quarter (`FleetAuditPage.jsx` + `SessionCalcPage.jsx`). Q2 2026 = €0.2833/kWh. |
| Fluvius P1 frontend | Backend endpoint live; dashboard tile not yet built. |

---

## Roadmap

- [ ] Fluvius dashboard tile — live power + solar + charge signal on user dashboard
- [ ] Fleet card API integration — auto-import Velocity/DKV/UTA invoice sessions
- [ ] Smart Connect — fleet EV throttling based on EPEX peak hours (B2B)
- [ ] CIR 92 export — one-click SD Worx / Securex payroll export per employee
- [ ] P1 reader pairing flow — in-app QR code setup for Fluvius Home Wizard / Homey

---

## License

Private repository. All rights reserved. © 2026 SmartPrice.be

## Contact

info@smartprice.be · [smartprice.be](https://smartprice.be)
