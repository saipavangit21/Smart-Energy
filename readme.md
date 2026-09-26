# SmartPrice.be

**Belgian energy intelligence platform** — live EPEX Spot prices, EV fleet cost optimisation, smart meter integration, and CIR 92-compliant home-charging reimbursements.

Live: **[smartprice.be](https://smartprice.be)** · Business: **[smartprice.be/business](https://smartprice.be/business)** · Fleet Audit: **[smartprice.be/fleet-audit](https://smartprice.be/fleet-audit)** · Session Calc: **[smartprice.be/session-calc](https://smartprice.be/session-calc)**

---

## Products

### 1. SmartPrice Personal (`/`)
Consumer electricity & gas dashboard for Belgian households.

- **Live EPEX Spot prices** — hourly Belgian electricity prices, updated every 15 min
- **5 cheapest hours today/tomorrow** — optimal windows for EV charging, heat pump, dishwasher
- **Animated journey strip** — scroll-triggered slide-up cards showing €3.60 peak → SmartPrice → €0.30 at 3am (EN/NL/FR)
- **Eco strip** — factual grid-impact messaging: cheap hours = peak renewables, negative prices = surplus wind/solar going to waste
- **EV API section** — targets charging app devs, in-car navigation teams, fleet software with "your app shows where, we show when" positioning
- **Price alerts** — email when prices drop below your threshold
- **Weekly digest** — split across Monday/Tuesday 08:00 Brussels (half the recipients each day, stable per-email split — see Known Issues), EPEX stats + cheapest hours
- **TTF gas prices** — real-time via ICE/TTF; compact tile on landing page
- **Negative price banner** — pulsing alert when EPEX < €0/MWh
- **Plan calculator** — compare all Belgian electricity/gas suppliers with personalised annual cost (grid fees + VAT)
- **Tesla Fleet API** — connect your Tesla; personalised charge-now vs wait card
- **Energy mix** — Belgium real-time generation (nuclear/solar/wind/gas), CO₂ intensity, cross-border flows (ENTSO-E)
- **EV stations map** — all Belgian public charge points via OpenStreetMap/Overpass (24h cache)
- **AI assistant** — Claude Haiku energy assistant
- **Trilingual** — EN / NL / FR
- **Public REST API** — free, no auth for price endpoints; used by Home Assistant, Node-RED, and B2B integrations (see [Partner API Access](#partner-api-access--fair-use-monitoring))
- **API Access tokens** — Profile → API Access: generate a revocable, opaque token (separate from your login session) for Home Assistant / device integrations that need the one authenticated Fluvius endpoint

### 2. SmartPrice Business (`/business`)
B2B page targeting Belgian fleet managers.

- **Animated fleet journey strip** — scroll-triggered cards: €42k/yr CREG → 2-min audit → €13k overpayment revealed (EN/NL/FR)
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
- Auth: session cookie (dashboard) **or** `x-api-key` header — a dedicated, revocable API token generated from Profile → API Access (see [Auth](#auth)), not the login JWT. Opaque, SHA-256-hashed at rest, one active token per user; generating a new one revokes the old one.
- Auto-prunes readings older than 7 days per user
- Stores: `power_w`, `solar_w`, `energy_kwh`, `gas_m3`, `device_id`

---

## Tech Stack

| Layer | Technology | Host |
|-------|-----------|------|
| Frontend | React 18 + Vite | Cloudflare Pages (CDN, auto-deploy from `main`) |
| Backend | Node.js 20 + Express | Railway EU West (Amsterdam, auto-deploy from `main`) — served at `api.smartprice.be` |
| Database | PostgreSQL 15 | Supabase (Ireland) |
| Analytics store | PostgreSQL (raw `analytics_events` only) | Neon (Frankfurt) — optional, see [Analytics Storage Split](#analytics-storage-split) |
| Email | Resend (info@smartprice.be) | Resend |
| Auth | JWT access + refresh tokens + Google OAuth + Tesla Fleet API | Self-hosted on Railway |
| AI assistant | Claude Haiku (Anthropic API) | External API |
| Electricity data | Energy-Charts.info (Fraunhofer ISE) / ENTSO-E | External API |
| Gas data | OilPriceAPI (TTF) | External API |
| EV stations | OpenStreetMap Overpass API | External API |

---

## Hosting & Domains

**Frontend**: `smartprice.be` / `www.smartprice.be` — Cloudflare Pages, CNAME'd to `smart-energy.pages.dev`. Migrated Vercel → Netlify → Cloudflare Pages (2026-08); Vercel and Netlify projects have since been decommissioned.

**Backend**: `api.smartprice.be` — Railway custom domain (CNAME + TXT records in Cloudflare, proxied). The frontend calls this domain directly for all `/api/*` and `/auth/*` requests. This matters for auth: `api.smartprice.be` shares its registrable domain with `smartprice.be`, so auth cookies (`sp_access`, `sp_refresh`, `sp_session`) are **first-party**, not third-party — required for login to work reliably in Safari, Firefox, and privacy-focused browsers (Brave, Perplexity Comet, etc.), which block or partition third-party cookies by default. Calling the raw `*.up.railway.app` domain directly (a different registrable domain) causes exactly this class of bug: login appears to succeed but the session doesn't persist, bouncing the user back to a logged-out state on the next request.

A small set of Cloudflare Pages Functions (`frontend/functions/`) still exist for the Tesla `.well-known` path and as a fallback, but are not on the main request path — general API traffic goes directly to `api.smartprice.be`, not through a Pages Function proxy (that was tried and reverted due to the free tier's 100k-requests/day cap).

---

## Analytics Storage Split

`analytics_events` (raw, one row per page view / login / API call) grew unbounded and pushed Supabase over its free-tier 0.5GB storage quota (2026-09). Fixed with three parts, all in `analytics.js`:

1. **Retention + rollup** — an hourly job collapses raw rows older than `RAW_RETENTION_DAYS` (45) into `analytics_daily_rollup` (one row per event/day/method — a few thousand rows/year) and deletes them from the raw table. Rollup totals persist forever; raw row-level detail only survives 45 days. Guarded against overlapping runs (an in-process lock) after an early version double-counted totals when the startup pass and a manual trigger overlapped.
2. **Optional dedicated store** — set `ANALYTICS_DATABASE_URL` (a separate Postgres instance, currently Neon) and all raw event reads/writes route there instead of the main DB, isolating high-volume analytics traffic from the low-volume app data (users, tokens, auth) that actually needs to stay reliable. Falls back to the main DB, unchanged, if the env var is unset.
3. **Admin visibility** — `GET /api/admin/analytics-storage` (row counts + date ranges for both stores) and `POST /api/admin/run-analytics-cleanup` (manually trigger the rollup/prune job instead of waiting up to an hour) — both `x-admin-secret`/`secret`-protected like other admin routes.

Why not CockroachDB Serverless or BigQuery instead: Cockroach's free "Serverless" tier has been folded into a paid "Standard" product (only a time/credit-limited trial remains); BigQuery is a columnar warehouse built for batch analysis, not one-row-at-a-time inserts from a web server. Neon was chosen because it's plain Postgres — zero query rewrites, same `pg` driver, just a second connection string.

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
    │   │   │   ├── AuthPage.jsx            # Login / register / forgot-password
    │   │   │   ├── ResetPasswordPage.jsx   # /reset-password?token=... — set new password
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
    │   └── functions/                      # Cloudflare Pages Functions — Tesla .well-known + fallback proxy only
    │
    └── backend/                        # Node.js + Express API — served at api.smartprice.be
        ├── server.js                   # Main Express app + all inline endpoints
        ├── db.js                       # PostgreSQL pool (Supabase) + password-reset & API token helpers
        ├── analytics.js                # Event tracking, partner call tracking + fair-use alerts,
        │                               #   raw/rollup storage split (optional ANALYTICS_DATABASE_URL),
        │                               #   admin analytics endpoints
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

All endpoints accessible directly via `api.smartprice.be/api/*` and `api.smartprice.be/auth/*` (same-site with `smartprice.be` — see [Hosting & Domains](#hosting--domains)).

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
| POST | `/api/fluvius/push` | Session cookie or `x-api-key` | Push P1 reading (power_w, solar_w, energy_kwh, gas_m3) |
| GET | `/api/fluvius/latest` | Session cookie or `x-api-key` | Latest reading + EPEX price + charge signal |
| GET | `/api/fluvius/history?hours=N` | Session cookie or `x-api-key` | 5-min bucketed readings (max 168h) |

`x-api-key` is the opaque API token from Profile → API Access (see [Auth](#auth)) — **not** the login JWT, which is httpOnly-cookie-only and was never retrievable client-side (an earlier version of these docs incorrectly told users to find a JWT in `localStorage`, which never existed there).

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
    url: https://api.smartprice.be/api/fluvius/push
    method: POST
    headers:
      x-api-key: "YOUR_SMARTPRICE_API_TOKEN"   # from Profile → API Access → Generate API token
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

### Partner API Access & Fair-Use Monitoring

The public price endpoints (`/api/prices/today`, `/api/cheapest`) accept an optional `X-Partner: <name>` header (or `?partner=` query param) — no key required, purely for visibility. It logs a `partner_api_call` analytics event tagged with that name, breaking a partner's traffic out separately in `GET /api/admin/analytics` (`partner_api_calls`).

If a partner's daily call count exceeds `PARTNER_FAIR_USE_THRESHOLD` (30/day — roughly 2.5× a typical agreed 12/day centralized-server polling pattern), one alert email/day goes to `info@smartprice.be`. This is **alert-only, never blocking** — an agreed usage pattern (e.g. a manufacturer's server polling on behalf of many end devices) is never hard-capped or broken automatically; a spike just prompts a human follow-up.

**Case study**: ACIT SA (Belgian storage-heater manufacturer, ThermACEC line) was approved for centralized-server polling (~12 calls/day) in exchange for CC BY 4.0 attribution crediting the upstream data sources (Energy-Charts.info/Fraunhofer ISE, ENTSO-E — both already publish under CC BY 4.0). They send `X-Partner: ACIT` on their requests.

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
| GET | `/api/admin/analytics-storage` | Row counts + date ranges for both the raw events store and the permanent rollup table |
| POST | `/api/admin/run-analytics-cleanup` | Manually trigger the rollup+prune job (vs. waiting up to an hour for the scheduled pass) |
| POST | `/api/admin/send-outreach` | Send B2B outreach or Fluvius waitlist emails |
| POST | `/api/admin/daily-posts` | Generate EPEX posts, email to info@smartprice.be, auto-post to Facebook Page |

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
| POST | `/auth/forgot-password` | Email a 1hr single-use reset link (rate-limited, no user enumeration) |
| POST | `/auth/reset-password` | Consume reset token, set new password, revoke other sessions |
| POST | `/auth/logout` | Invalidate refresh token |
| GET | `/auth/me` | Current user (JWT) |
| PUT | `/auth/preferences` | Update alert thresholds / supplier preferences |
| PUT | `/auth/profile` | Update display name |
| PUT | `/auth/change-password` | Change password |
| DELETE | `/auth/delete-account` | Delete account |
| GET | `/auth/api-token` | API token metadata (label, created_at, last_used_at) — never the raw token |
| POST | `/auth/api-token` | Generate a new API token (replaces any existing one) — raw value returned once |
| DELETE | `/auth/api-token` | Revoke the current API token |
| GET | `/auth/google` | Google OAuth start |
| GET | `/auth/google/callback` | Google OAuth callback |
| GET | `/auth/tesla` | Tesla Fleet API OAuth start |
| GET | `/auth/tesla/callback` | Tesla OAuth callback |

---

## Analytics Events

Tracked in `analytics_events` (raw, see [Analytics Storage Split](#analytics-storage-split) for where this actually lives). Available in admin dashboard.

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
| `partner_api_call` | Any request to `/api/prices/today` or `/api/cheapest` carrying `X-Partner`/`?partner=` — see [Partner API Access](#partner-api-access--fair-use-monitoring) |

Dedup: 1 event per session per hour for page views (prevents polling inflation). Session ID via `sp_session` cookie (30-day). Raw rows older than 45 days are collapsed into `analytics_daily_rollup` and deleted — see [Analytics Storage Split](#analytics-storage-split).

---

## Database Tables

| Table | Description |
|-------|-------------|
| `users` | Registered users — email, hashed password, JWT refresh token, Google/Tesla providers, preferences (JSONB) |
| `analytics_events` | Raw page views, conversions, funnel events — lives on Neon if `ANALYTICS_DATABASE_URL` is set, else the main DB; rows older than 45 days are pruned (see [Analytics Storage Split](#analytics-storage-split)) |
| `analytics_daily_rollup` | Permanent, tiny (day/event/method + total/unique_sessions/logged_in_users) — always on the main DB, survives raw-row pruning indefinitely |
| `email_leads` | Pre-registration email capture (source: landing/fluvius_waitlist/business-audit-form) |
| `b2b_leads` | Fleet audit form submissions — email, company, fleet size, billing method, audit data (JSONB) |
| `newsletter_subscribers` | Active/unsubscribed newsletter list, unsubscribe token |
| `password_reset_tokens` | SHA-256-hashed, single-use, 1hr-expiry forgot-password tokens (raw token never stored) |
| `api_tokens` | SHA-256-hashed, revocable API tokens for device integrations (Home Assistant, etc.) — one active token per user; raw value shown once at creation, never stored |
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

**Preset contacts** (`outreach-send.js`): 23 verified contacts — Belgian leasing companies (Athlon, KBC Autolease, Drivalia, Van Mossel, MHC Mobility, Arval, Alphabet, Ayvens, Financial Fleet Services) + OEM fleet teams (BMW, Volvo, VW, Audi, Toyota, Renault, Tesla, Kia, Hyundai/Astara) + RENTA. Mercedes-Benz removed 2026-07-01 (unsubscribed).

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
ANALYTICS_DATABASE_URL=postgresql://... # Optional — Neon, separates raw analytics_events from app DB
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
FACEBOOK_PAGE_ID=61591589255351
FACEBOOK_PAGE_TOKEN=...                 # Permanent Page Access Token (Graph API, never expires)
TELEGRAM_BOT_TOKEN=...                  # Optional — not active (Belgians don't use Telegram)
TELEGRAM_CHAT_ID=...                    # Optional — not active
```

Also requires a custom domain `api.smartprice.be` added under the service's **Networking → Custom Domain** — see [Hosting & Domains](#hosting--domains). Note the "Target Port" field there must match the port the app actually listens on internally (`PORT` env var, defaults to 3001 in code but Railway may inject a different value) — a wrong port here causes a persistent `502` even when DNS is fully correct.

### Cloudflare Pages (Frontend)

```env
VITE_API_URL=https://api.smartprice.be
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
| `smartprice.be` / `www` | CNAME | `smart-energy.pages.dev` (proxied) |
| `api` | CNAME | Railway-provided target, e.g. `xxxxx.up.railway.app` (proxied) — added via Railway's Networking panel, whose "Authorize" flow can add this automatically |
| `_railway-verify.api` | TXT | Railway-provided verification token — **required alongside the CNAME**, domain won't verify without it |

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

Push to `main` — both Cloudflare Pages and Railway auto-deploy.

```bash
git add <files>
git commit -m "feat: ..."
git push origin main
# Frontend live in ~1-2 min, backend live in ~2-3 min
```

Note: `frontend/dist/` is committed to the repo alongside source — run `npm run build` inside `frontend/` and commit the resulting `dist/` changes together with any source edit that affects the frontend, so the built output stays in sync.

The frontend calls `api.smartprice.be` directly (see [Hosting & Domains](#hosting--domains)) — no build-time proxy config needed for API calls. A few legacy Cloudflare Pages Functions remain under `frontend/functions/` for the Tesla `.well-known` path only.

---

## Uptime Monitoring

`uptime-monitor.js` pings `https://smartprice.be` every 5 min. Requires 2 consecutive failures before alerting. Sends email on down + recovery. 1-hour cooldown between alerts.

For the Railway backend itself, set up an external check at [UptimeRobot](https://uptimerobot.com) → `https://api.smartprice.be/api/health`

---

## Known Issues / Limitations

| Issue | Status |
|-------|--------|
| VREG tariff scraper | Disabled — API requires auth (401). Falls back to seed data in `tariffs.json`. |
| OilPriceAPI TTF | Free tier capped at 200 requests total. Cache extended 1hr → 24hr (2026-08) to keep real usage low (~5/day); requires a paid plan for guaranteed live data. Fallback: €34.50/MWh if the API call fails. |
| ENTSO-E generation data | ~1 hour delay. Error state shows retry button in UI. |
| AI assistant | Returns 503 if `ANTHROPIC_API_KEY` not set; 402 if credits depleted. |
| CREG rate | Must be updated manually each quarter (`FleetAuditPage.jsx` + `SessionCalcPage.jsx`). Q2 2026 = €0.2833/kWh. |
| Fluvius P1 frontend | Backend endpoint live; dashboard tile not yet built. |
| Resend daily cap | Free-tier plan caps sends at 200/day. The Monday digest alone (174 recipients) left almost no headroom for other same-day emails. Fixed 2026-09 by splitting the digest into two stable per-email halves sent Monday/Tuesday — revisit if recipient count grows enough to need a third day, or just upgrade the Resend plan. |
| 16 users with NULL email | Password-signup accounts where email wasn't stored at registration. Bug not yet fixed. |
| Facebook Page Token | Permanent token generated 2026-06. If it expires, follow 3-step refresh: short-lived user token → long-lived → Page token via `/me/accounts`. `FACEBOOK_PAGE_ID` corrected 2026-08 to `61591589255351` — double check the Railway env var actually matches (was found stale in docs). |
| No user-agent tracking | `analytics_events` never captured browser/device — makes bug reports like "works in Chrome, not Firefox" hard to diagnose from data alone. Worth adding if this recurs. |
| ENTSO-E retry storm (fixed 2026-09-11) | A fallback added 2026-09-03 (Energy-Charts → ENTSO-E when day-ahead data lags) had no negative-caching or request coalescing — when ENTSO-E started erroring, every concurrent price request independently retried it, blocking up to 15s each. Fixed via an in-flight-request map (coalesces concurrent callers) + a 10-min failure cache. |
| ENTSO-E fallback mislabeled hours (fixed 2026-09-19) | `fetchENTSOE()` hardcoded hourly (60-min) spacing between data points, but ENTSO-E now publishes Belgian day-ahead prices at 15-min resolution — whenever the fallback fired, hours after the first got stretched ~4x while prices stayed correct. A user (Erik) caught this from a live pull. Fixed by reading `<resolution>` from the XML instead of assuming hourly; verified against the raw feed. |
| Supabase storage quota overage (fixed 2026-09-26) | `analytics_events` grew to ~3.28M rows with no retention policy, pushing Supabase over its free 0.5GB cap. Fixed via retention+rollup (raw rows >45 days collapsed into a permanent tiny summary table, then deleted) plus an optional split to a dedicated Neon instance — see [Analytics Storage Split](#analytics-storage-split). |
| `hello@smartprice.be` still referenced | `PrivacyPolicy.jsx` and its `i18n.js` strings (all 3 languages) still show `hello@smartprice.be` in a few spots — the footer/API-docs email was corrected to `info@smartprice.be` in 2026-09, but this one wasn't caught in the same pass. `hello@` is a real, monitored inbox, so not urgent, but inconsistent. Not yet fixed. |
| Business page revamp — unmerged | A full rewrite (tightened compliance claims, single primary CTA, fixed stale infra references) sits on the `business-page-revamp` branch, live as a Cloudflare Pages preview, awaiting review/approval before merging to `main`. |

---

## Facebook Automation

Daily posts flow (active since July 2026):
1. Cloud agent (CCR) fires daily at **06:00 UTC** → `POST https://api.smartprice.be/api/admin/daily-posts` with `x-admin-secret` header
2. Backend fetches live EPEX from `/api/current` + `/api/cheapest?hours=8`, deduplicates to one entry per hour
3. Builds Dutch post with top 5 cheapest hours + current price label
4. Posts to **Facebook Page ID `61591589255351`** via Graph API (`/{page-id}/feed`)
5. Emails both NL + EN posts to `info@smartprice.be` via Resend with copy-paste formatting

---

## Performance (as of July 2026)

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| `/api/prices/history` (7 days) | ~1,470 ms | ~200 ms | 7× faster |
| Frontend main bundle | 1,072 KB | 251 KB | −76% |
| Vendor chunk (React/Recharts) | bundled | 537 KB (cached) | separate, cached |

History endpoint: changed sequential `await` in for-loop → `Promise.allSettled()` parallel fetch.
Bundle: Vite `manualChunks` splits vendor / page-admin / page-business / page-seo.

---

## Roadmap

- [ ] Merge `business-page-revamp` branch — awaiting review of the Cloudflare Pages preview
- [ ] Fluvius dashboard tile — live power + solar + charge signal on user dashboard
- [ ] Fix 16 NULL-email users — registration bug where email wasn't stored for password-signup accounts
- [ ] Fix remaining `hello@smartprice.be` references in `PrivacyPolicy.jsx`/`i18n.js` → `info@smartprice.be`
- [ ] Profile page visual pass — currently uniform flat cards with little visual hierarchy; discussed 2026-09, not yet designed/built
- [ ] LinkedIn page — content plan exists in `outreach/linkedin_content.md`, page not yet fully set up
- [ ] Fleet card API integration — auto-import Velocity/DKV/UTA invoice sessions
- [ ] Smart Connect — fleet EV throttling based on EPEX peak hours (B2B)
- [ ] CIR 92 export — one-click SD Worx / Securex payroll export per employee
- [ ] P1 reader pairing flow — in-app QR code setup for Fluvius Home Wizard / Homey

---

## License

Private repository. All rights reserved. © 2026 SmartPrice.be

## Contact

info@smartprice.be · [smartprice.be](https://smartprice.be)
