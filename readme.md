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
│   │   ├── auth.js            ← Cookie-based login/register/refresh/exchange
│   │   └── google.js          ← Google OAuth flow
│   ├── middleware/
│   │   └── auth.js            ← requireAuth middleware (cookie + Bearer fallback)
│   └── .env.example
└── frontend/
    ├── public/
    │   ├── manifest.json      ← PWA manifest
    │   └── icons/             ← PWA icons (192 + 512px)
    ├── src/
    │   ├── App.jsx            ← Routing + auth flow + guest mode
    │   ├── pages/
    │   │   ├── LandingPage.jsx    ← Public homepage
    │   │   ├── Dashboard.jsx      ← Main app (prices, alerts, history)
    │   │   ├── AuthPage.jsx       ← Login / Register / Continue as Guest
    │   │   ├── AuthCallback.jsx   ← OAuth token exchange → httpOnly cookies
    │   │   └── PrivacyPolicy.jsx  ← GDPR privacy policy
    │   ├── context/
    │   │   └── AuthContext.jsx    ← Cookie-based auth state + silent refresh
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

Vite proxies `/api/*` and `/auth/*` to the backend automatically.

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
NODE_ENV=production                    # required for secure cookies
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
| `GET /api/user/dashboard` | ✅ Cookie | Prices + user preferences |
| `POST /auth/register` | — | Name + password register (email optional) |
| `POST /auth/login` | — | Login by name or email + password |
| `POST /auth/refresh` | — | Rotate access + refresh cookies |
| `POST /auth/exchange` | — | Exchange OAuth URL tokens → httpOnly cookies |
| `POST /auth/logout` | — | Clear cookies + invalidate refresh token |
| `GET /auth/me` | ✅ Cookie | Current user + preferences |
| `PUT /auth/preferences` | ✅ Cookie | Save supplier, alert settings, alert email |
| `PUT /auth/profile` | ✅ Cookie | Update name / email |
| `PUT /auth/change-password` | ✅ Cookie | Change password |
| `GET /auth/google` | — | Start Google OAuth |
| `GET /auth/google/callback` | — | Google OAuth callback → sets cookies |
| `DELETE /auth/delete-account` | ✅ Cookie | GDPR account deletion |

---

## 🗄 Database Schema (Supabase PostgreSQL)

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE,                -- nullable: email not required at signup
  name          TEXT NOT NULL,
  password_hash TEXT,                       -- null for Google OAuth users
  preferences   JSONB DEFAULT '{}',        -- supplier, alertEnabled, alertThreshold, alertEmail, lastAlertSent
  providers     JSONB DEFAULT '{}',        -- { google: true, googleId: "...", itsme: false }
  fluvius       JSONB DEFAULT '{}',        -- reserved for Phase 4 smart meter data
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Allow null emails but enforce uniqueness when present
CREATE UNIQUE INDEX users_email_unique ON users (email) WHERE email IS NOT NULL;

CREATE TABLE refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔐 Security Model

SmartPrice uses **httpOnly cookies** for token storage — tokens are never accessible to JavaScript.

| Feature | Implementation |
|---|---|
| Passwords | bcrypt (cost 12) — never stored in plain text |
| Access token | httpOnly cookie · 15 min expiry · `secure` + `sameSite: none` in production |
| Refresh token | httpOnly cookie · 7 day expiry · stored hashed in DB |
| Token rotation | Refresh rotates both tokens on every use |
| XSS protection | httpOnly cookies cannot be read by injected scripts |
| CSRF protection | `sameSite: none` + CORS credentials whitelist |
| Google OAuth | Tokens passed via URL only during callback, immediately exchanged for cookies via `/auth/exchange` |
| Email optional | No PII collected unless user enables alerts |

### GDPR Status
- ✅ Data stored in EU (Railway EU West + Supabase EU)
- ✅ Privacy policy live at smartprice.be
- ✅ Delete account endpoint (full data removal)
- ✅ Email only collected when user explicitly enables alerts
- ✅ Passwords never stored — only bcrypt hash
- ⚠️ Sign Supabase DPA at supabase.com/dpa (recommended)

### Required Railway environment variable
```
NODE_ENV=production
```
Without this, cookies won't have `secure: true` and cross-origin auth will fail.

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

## 👤 Authentication Flow

### Email/Password (name-based, email optional)
```
Register: name + password → POST /auth/register → cookies set
Login:    name or email + password → POST /auth/login → cookies set
Session:  GET /auth/me (cookie sent automatically) → user object
Refresh:  POST /auth/refresh (sp_refresh cookie) → new cookies
Logout:   POST /auth/logout → cookies cleared + DB token deleted
```

### Google OAuth (cross-origin safe)
```
1. User clicks "Continue with Google"
2. GET /auth/google → redirect to Google consent screen
3. Google → GET /auth/google/callback (backend)
4. Backend creates/finds user, generates JWT tokens
5. Redirect to /oauth/callback?access_token=...&refresh_token=...
6. AuthCallback.jsx POSTs to POST /auth/exchange
7. Backend verifies tokens, sets httpOnly cookies, clears URL
8. Redirect to / → AuthContext picks up session via /auth/me
```

### Guest Mode
Users can browse prices without an account via "Continue as Guest".
Alerts and preferences require sign-in. Guest banner shown in dashboard.

---

## 🔔 Email Alerts

Powered by **Resend** from `alerts@smartprice.be`:
- Checks prices at the top of every hour
- Emails users whose alert threshold is exceeded
- Alert email stored in `preferences.alertEmail` (separate from login email)
- Blocks duplicate alert emails already used by other accounts
- Skips re-alerting within the same hour (`lastAlertSent` in preferences)

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
A     @    76.76.21.21
CNAME www  cname.vercel-dns.com
```

### CORS (server.js)
```
https://smartprice.be
https://www.smartprice.be
https://smart-energy-six.vercel.app
*.vercel.app                           ← all Vercel preview deployments
http://localhost:5173
http://localhost:4173
```

### Key npm dependencies (backend)
```
express · cors · cookie-parser · bcryptjs · jsonwebtoken
pg · express-rate-limit · node-cache · axios · resend
```

---

## ✅ What's Live (March 2026)

- [x] Real-time EPEX Spot price chart (hourly, deduplicated)
- [x] Today / Tomorrow / History / Best Hours / Suppliers / Alerts tabs
- [x] Graph + Table toggle on price chart
- [x] Email + Google OAuth login
- [x] **Name-only registration — email optional**
- [x] **Guest mode — browse without account**
- [x] **httpOnly cookie auth — XSS safe, tokens never in localStorage**
- [x] Price alerts by email (Resend, `alerts@smartprice.be`)
- [x] Alert email separate from login — added only when enabling alerts
- [x] Duplicate alert email detection (checks both email column + preferences)
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