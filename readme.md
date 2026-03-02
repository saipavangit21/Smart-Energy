# ⚡ SmartPrice.be — Belgium Real-Time Electricity Prices

> Real-time EPEX Spot prices for Belgium. Built for dynamic contract holders who want to know the cheapest hours to run appliances, charge EVs, and save money.

🌐 **Live at:** [smartprice.be](https://smartprice.be)

Built with: **React + Vite** (frontend) · **Node.js/Express** (backend) · **PostgreSQL/Supabase** (database) · **Railway** (backend hosting) · **Vercel** (frontend hosting)

---

## 🗂 Project Structure

```
smartprice/
├── backend/
│   ├── server.js              ← Express API + CORS + price cron
│   ├── email-alerts.js        ← Hourly alert checker (Resend)
│   ├── db.js                  ← Supabase PostgreSQL pool
│   ├── routes/
│   │   ├── auth.js            ← JWT login/register/refresh
│   │   └── google.js          ← Google OAuth flow
│   ├── middleware/
│   │   └── auth.js            ← requireAuth middleware
│   └── .env.example
└── frontend/
    ├── public/
    │   ├── manifest.json      ← PWA manifest
    │   └── icons/             ← PWA icons (192 + 512px)
    ├── src/
    │   ├── App.jsx            ← Routing + auth flow
    │   ├── pages/
    │   │   ├── LandingPage.jsx    ← Public homepage
    │   │   ├── Dashboard.jsx      ← Main app (prices, alerts, history)
    │   │   ├── AuthPage.jsx       ← Login / Register
    │   │   └── PrivacyPolicy.jsx  ← GDPR privacy policy
    │   ├── context/
    │   │   └── AuthContext.jsx    ← JWT auth state + refresh
    │   ├── hooks/
    │   │   └── usePrices.js       ← Data fetching hooks
    │   └── utils/
    │       └── priceUtils.js      ← Price colours, labels, supplier formulas
    ├── index.html             ← PWA meta tags + SEO
    └── vite.config.js
```

---

## 🚀 Quick Start

### Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev                   # http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

Vite proxies `/api/*` to the backend automatically.

---

## 🔑 Environment Variables

### Backend `.env`
```env
# Database
DATABASE_URL=postgresql://...          # Supabase connection string

# Auth
JWT_SECRET=your_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://your-backend.railway.app/auth/google/callback

# Email alerts (Resend)
RESEND_API_KEY=re_...
FROM_EMAIL=alerts@smartprice.be

# App
FRONTEND_URL=https://smartprice.be
BACKEND_URL=https://your-backend.railway.app
NODE_ENV=production
PORT=3000
```

---

## 📡 API Endpoints

| Endpoint | Auth | Description |
|---|---|---|
| `GET /api/health` | — | Server health check |
| `GET /api/prices/today` | — | Today + tomorrow hourly EPEX prices |
| `GET /api/current` | — | Current hour price |
| `GET /api/cheapest?hours=5` | — | N cheapest upcoming hours |
| `GET /api/prices/history?days=7` | — | 7-day historical averages |
| `GET /api/user/dashboard` | ✅ JWT | Prices + user preferences |
| `POST /auth/register` | — | Email/password register |
| `POST /auth/login` | — | Email/password login |
| `POST /auth/refresh` | — | Refresh JWT token |
| `GET /auth/me` | ✅ JWT | Current user + preferences |
| `PATCH /auth/preferences` | ✅ JWT | Save supplier, alert settings |
| `GET /auth/google` | — | Start Google OAuth |
| `GET /auth/google/callback` | — | Google OAuth callback |
| `DELETE /auth/delete-account` | ✅ JWT | GDPR account deletion |

---

## 🗄 Database Schema (Supabase PostgreSQL)

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  password    TEXT,                          -- null for Google OAuth users
  google_id   TEXT UNIQUE,
  preferences JSONB DEFAULT '{}',           -- supplier, alertEnabled, alertThreshold, lastAlertSent
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📊 Data Sources

| Source | Auth needed | Coverage | License |
|---|---|---|---|
| **Energy-Charts** (Fraunhofer ISE) | ❌ None | EPEX Spot BE hourly | Free, attribution required |
| **Elia Open Data** | ❌ None | Belgium grid, day-ahead | CC BY 4.0 |
| **ENTSO-E** | ✅ Free token | EU-wide day-ahead | Free with registration |

### Data flow
```
Browser → React Frontend
            ↓ /api/prices/today
         Node.js Backend (Railway)
            ↓ picks fastest source with auto-fallback
    ┌──────────────────────────────────┐
    │ 1. Energy-Charts (primary)       │
    │ 2. Elia Open Data (fallback)     │
    │ 3. ENTSO-E (backup, needs key)   │
    └──────────────────────────────────┘
            ↓ cached 15 min (NodeCache)
         JSON → Recharts renders graph
```

**Attribution required in UI:**
```
Data: Energy-Charts.info · Elia Open Data (CC BY 4.0) · ENTSO-E
Not financial advice
```

---

## 🔔 Email Alerts

Powered by **Resend** from `alerts@smartprice.be`:
- Checks prices at the top of every hour
- Emails users whose alert threshold is exceeded
- Skips re-alerting within the same hour (`lastAlertSent` in preferences)
- Fully branded SmartPrice.be email template

---

## 📱 PWA (Progressive Web App)

SmartPrice is installable as a native-like app:
- `manifest.json` with `display: standalone`
- 192×192 and 512×512 icons
- Theme colour: `#0D9488` (teal)
- Android Chrome shows "Add to Home Screen" automatically

---

## 🏗 Production Deployment

| Layer | Service | Notes |
|---|---|---|
| Frontend | Vercel | Auto-deploy from `main` branch |
| Backend | Railway (EU West) | Auto-deploy, env vars in dashboard |
| Database | Supabase (PostgreSQL) | Free tier, EU region |
| Email | Resend | `smartprice.be` domain verified |
| Domain | Nomeo.be | DNS → Vercel A record + CNAME |
| Auth | Google OAuth 2.0 | Consent screen pending Google review |

### DNS Records (Nomeo → Vercel)
```
A     @    76.76.21.21  (or Vercel's assigned IP)
CNAME www  cname.vercel-dns.com
```

### CORS allowed origins (server.js)
```
https://smartprice.be
https://www.smartprice.be
https://smart-energy-six.vercel.app   ← keep during transition
http://localhost:5173
http://localhost:4173
```

---

## ✅ What's Live (March 2026)

- [x] Real-time EPEX Spot price chart (hourly + 15-min data deduplicated)
- [x] Today / Tomorrow / History / Best Hours / Suppliers / Alerts tabs
- [x] Graph + Table toggle on price chart
- [x] Email + Google OAuth login
- [x] Price alerts by email (Resend, `alerts@smartprice.be`)
- [x] Supplier comparison (Bolt, Engie, TotalEnergies, EDF Luminus, Lampiris)
- [x] 7-day history with clickable daily breakdown
- [x] Mobile-first UI with bottom navigation
- [x] PWA — installable on Android/iOS
- [x] GDPR: Privacy policy + delete account
- [x] Public landing page (logged-out visitors)
- [x] Full rebrand: StroomSlim → SmartPrice.be

---

## 🗺 Roadmap

### Phase 2 — Real Bill Calculator (next)
- Postcode input → Fluvius/ORES/RESA network costs per region
- Show total estimated bill = EPEX spot + grid tariff + taxes
- Unique value vs Mijnenergie.be (they don't cover dynamic contracts)

### Phase 3 — Affiliate Monetisation
- "Switch to supplier" referral links (€30–80 commission per switch)
- Bolt Energy, Engie, TotalEnergies affiliate programmes
- No CREG registration needed for referral model

### Phase 4 — Expansion
- Gas price tracking
- Web push notifications (no app store needed)
- French language toggle (NL/FR)
- itsme auth + Fluvius smart meter sync (EAN-based personal consumption)

### Phase 5 — Full Comparator (Mijnenergie-style)
- Fixed vs dynamic contract comparison
- CREG registration as official energy comparator
- Multi-country: Netherlands, France

---

## 🇧🇪 CREG Compliance

Current status: **No registration needed** — SmartPrice displays public price data and is not a regulated energy advisor or broker.

If adding supplier switching (Phase 5), CREG registration is recommended:
- Free registration: [creg.be](https://www.creg.be)
- Makes SmartPrice an officially recognised comparator
- Required to be listed on government energy portals

---

## 🔐 itsme Integration (Phase 4)

For Belgian digital identity login + Fluvius smart meter access:
1. Apply at: [itsme-id.com/business](https://www.itsme-id.com/business)
2. Protocol: OpenID Connect (OIDC)
3. Timeline: ~8–12 weeks for partnership agreement
4. Enables: personal consumption data via EAN code

---

## 📜 License & Attribution

- **Code**: Private / proprietary
- **Data**: See sources above — all require attribution
- **Contact**: hello@smartprice.be