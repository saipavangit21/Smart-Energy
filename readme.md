# 🇧🇪 SmartPrice.be

> **Free Belgian energy price tracker** — real-time EPEX Spot electricity & TTF gas prices, plan calculator for all 7 suppliers, and email price alerts.

🌐 **Live:** [smartprice.be](https://smartprice.be)  
⚡ **Electricity Calculator:** [smartprice.be/calculator/electricity](https://smartprice.be/calculator/electricity)  
🔥 **Gas Calculator:** [smartprice.be/calculator/gas](https://smartprice.be/calculator/gas)

**Stack:** React 18 + Vite 5 · Node.js 20 + Express 4 · PostgreSQL (Supabase) · Railway (backend) · Vercel (frontend)

---

## 📁 Project Structure

```
StroomprijsApp/
├── backend/
│   ├── server.js                  ← Express entry, CORS, weekly scrape cron
│   ├── db.js                      ← Supabase PostgreSQL pool
│   ├── email-alerts.js            ← Hourly price alert checker (Resend)
│   └── routes/
│       ├── auth.js                ← Register, login, Google OAuth, /me
│       ├── prices.js              ← EPEX Spot electricity prices
│       ├── gas.js                 ← TTF gas prices + 7-day history
│       ├── suppliers.js           ← Tariffs, scraper, appliance calculators
│       └── alerts.js              ← User alert CRUD + email dispatch
│
└── frontend/
    ├── vercel.json                ← API proxy + SPA fallback
    ├── vite.config.js
    └── src/
        ├── App.jsx                ← Pathname routing (no react-router)
        ├── context/
        │   └── AuthContext.jsx    ← httpOnly cookie auth state
        ├── hooks/
        │   └── usePrices.js       ← Price data fetching hooks
        └── pages/
            ├── LandingPage.jsx    ← Public homepage with calculator CTAs
            ├── Dashboard.jsx      ← Electricity dashboard (all tabs)
            ├── GasTab.jsx         ← Gas dashboard (TTF + gas suppliers)
            ├── CalculatorPage.jsx ← Standalone /calculator/electricity|gas
            ├── AuthPage.jsx       ← Login / Register / Guest
            ├── AuthCallback.jsx   ← Google OAuth token → httpOnly cookie
            ├── ProfilePage.jsx    ← User preferences
            └── PrivacyPolicy.jsx  ← GDPR privacy page
```

---

## 🚀 Quick Start

### 1. Clone

```bash
git clone https://github.com/saipavangit21/Smart-Energy
cd "Smart-Energy/StroomprijsApp"
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env        # fill in your values — see env vars below
npm run dev                 # → http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                 # → http://localhost:5173
```

> Vite proxies `/api/*` and `/auth/*` to the backend automatically in development.

---

## 🔑 Environment Variables

### `backend/.env`

```env
# Database
DATABASE_URL=postgresql://...           # Supabase connection string

# Auth
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://your-backend.railway.app/auth/google/callback

# Email alerts
RESEND_API_KEY=re_...
FROM_EMAIL=alerts@smartprice.be

# Gas prices (TTF) — falls back to mock data if missing
OIL_PRICE_API_KEY=...

# App
FRONTEND_URL=https://smartprice.be
BACKEND_URL=https://your-backend.railway.app
NODE_ENV=production                     # Required for secure cookies
PORT=3000
```

---

## 🌐 Application Routes

| URL | Visibility | Description |
|-----|-----------|-------------|
| `/` | Public | Landing page (logged-out) · Dashboard (logged-in / guest) |
| `/calculator/electricity` | **Public** | Electricity plan calculator — no login required |
| `/calculator/gas` | **Public** | Gas plan calculator — no login required |
| `/oauth/callback` | Internal | Google OAuth redirect handler |
| `/privacy` | Public | GDPR privacy policy |

> The calculator is accessible to everyone. Sign-in is prompted **only** when tapping "Find My Best Plan" — the calculation runs first and results appear immediately after login (no data lost).

---

## 📡 API Reference

### Price Endpoints

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /api/prices/today` | — | Today's hourly EPEX Spot prices (Belgium) |
| `GET /api/prices/tomorrow` | — | Tomorrow's day-ahead prices (available ~13:00 CET) |
| `GET /api/prices/history?days=7` | — | 7-day historical daily averages |
| `GET /api/current` | — | Current hour price |
| `GET /api/cheapest?hours=5` | — | N cheapest upcoming hours |
| `GET /api/gas/ttf` | — | Current TTF gas price (€/MWh) |
| `GET /api/gas/history?days=7` | — | TTF 7-day history (mock fallback if no API key) |

### Supplier & Calculator Endpoints

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /api/suppliers/appliances` | — | 12 electricity appliances |
| `GET /api/suppliers/gas-appliances` | — | 5 gas appliances |
| `GET /api/suppliers/electricity` | — | Ranked electricity plans for given consumption |
| `GET /api/suppliers/gas` | — | Ranked gas plans for given consumption |
| `POST /api/suppliers/calculate` | — | Appliances → consumption → ranked electricity plans |
| `POST /api/suppliers/calculate-gas` | — | Appliances → consumption → ranked gas plans |
| `GET /api/suppliers/meta` | — | Tariff freshness, supplier/plan counts |

#### `POST /api/suppliers/calculate` — Request body

```json
{
  "appliances": [{ "id": "washing_machine", "uses_per_week": 5 }],
  "region": "flanders",
  "epex_avg": 95,
  "green_only": false
}
```

#### `POST /api/suppliers/calculate-gas` — Request body

```json
{
  "appliances": [{ "id": "central_heating", "uses_per_week": 7 }],
  "region": "flanders",
  "ttf_avg": 35
}
```

### Auth Endpoints

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /auth/register` | — | Email + password registration |
| `POST /auth/login` | — | Login → sets httpOnly cookies |
| `POST /auth/refresh` | Cookie | Rotate access + refresh tokens |
| `POST /auth/logout` | Cookie | Clear cookies + invalidate DB token |
| `GET /auth/me` | Cookie | Current user + preferences |
| `PUT /auth/preferences` | Cookie | Save supplier, alert settings |
| `PUT /auth/profile` | Cookie | Update name / email |
| `PUT /auth/change-password` | Cookie | Change password |
| `DELETE /auth/delete-account` | Cookie | GDPR full account deletion |
| `GET /auth/google` | — | Start Google OAuth flow |
| `GET /auth/google/callback` | — | Google OAuth callback → sets cookies |

---

## ⚡ Cost Calculation Engine

### Electricity — Flanders (capacity tariff)

```
total = (peak_kW × €53.90/kW/month × 12)
      + (distribution €0.0289 + transport €0.0112 + levies €0.0185) × kWh/yr
      + standing_charge
      + 6% VAT on all components
```

`peak_kW` = highest `peak_kw` value among the user's selected appliances.

### Electricity — Wallonia / Brussels (kWh tariff)

```
total = (distribution + transport + levies + excise) × kWh/yr
      + standing_charge
      + 6% VAT
```

### Dynamic electricity plans

```
energy_cost = ((epex_avg_€/MWh ÷ 1000) + markup_c€/kWh ÷ 100) × kWh/yr
```

### Gas — all regions

```
total = (Fluxys €0.0058 + Fluvius/ORES €0.0128 + levies €0.0045 + excise €0.0028) × kWh/yr
      + standing_charge
      + 21% VAT on all components
```

### Consumption from appliances

```
electricity_kWh = Σ(kwh_per_use × uses_per_week × 52) + 600   ← 600 kWh baseline
peak_kW         = max(selected appliances' peak_kw values)

gas_kWh         = Σ(kwh_per_use × uses_per_week × 52) + 500   ← 500 kWh pilot lights
```

---

## 🏢 Suppliers Covered

All **7 Belgian suppliers** for both electricity and gas:

| Supplier | Electricity | Gas | Plan Types |
|----------|-------------|-----|------------|
| Engie | ✅ 3 plans | ✅ 3 plans | Variable · Fixed · Dynamic |
| Luminus | ✅ 3 plans | ✅ 2 plans | Variable · Fixed |
| Bolt Energy | ✅ 3 plans | ✅ 2 plans | Variable · Dynamic |
| TotalEnergies | ✅ 3 plans | ✅ 2 plans | Variable · Fixed |
| Eneco | ✅ 3 plans | ✅ 2 plans | Variable · Dynamic |
| Mega | ✅ 2 plans | ✅ 2 plans | Variable · Fixed |
| Octa+ | ✅ 3 plans | ✅ 2 plans | Variable · Fixed · Dynamic |

Variable plan rates are scraped weekly from **callmepower.be**. Fixed/dynamic plans use embedded Q1 2026 seed data updated each quarter.

---

## 🔌 Appliance Reference

### Electricity (12 appliances)

| Appliance | kWh/use | Peak kW | Default/week |
|-----------|---------|---------|--------------|
| Washing Machine | 0.9 | 2.2 | 5× |
| Tumble Dryer | 2.5 | 2.5 | 3× |
| Dishwasher | 1.2 | 2.0 | 5× |
| EV Charging (7.4 kW) | 35.0 | 7.4 | 3× |
| EV Fast Charge (22 kW) | 50.0 | 22.0 | 1× |
| Heat Pump | 12.0 | 3.5 | 7× |
| Fridge/Freezer | 1.2 | 0.15 | 7× |
| Oven/Hob | 1.8 | 3.0 | 5× |
| Lighting | 0.5 | 0.4 | 7× |
| TV/Electronics | 0.3 | 0.5 | 7× |
| PC/Office | 0.6 | 0.3 | 5× |
| Pool Pump | 3.0 | 1.5 | 4× |

### Gas (5 appliances)

| Appliance | kWh/use | Default/week |
|-----------|---------|--------------|
| Central Heating | 45.0 | 7× |
| Hot Water Boiler | 8.0 | 7× |
| Gas Hob | 0.6 | 7× |
| Gas Dryer | 1.2 | 3× |
| Gas Fireplace | 3.5 | 3× |

---

## 🗄 Database Schema

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE,
  name          TEXT,
  password_hash TEXT,                    -- null for Google OAuth users
  preferences   JSONB DEFAULT '{}',     -- supplier, alertEnabled, alertThreshold, alertEmail
  providers     JSONB DEFAULT '{}',     -- { google: true, googleId: "..." }
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Enforce unique email only when present
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

## 🔐 Security

| Feature | Implementation |
|---------|---------------|
| Passwords | bcrypt cost 12 — never stored plaintext |
| Access token | httpOnly cookie · 15 min · `secure` + `sameSite: none` in prod |
| Refresh token | httpOnly cookie · 7 days · stored hashed in DB |
| Token rotation | Both tokens rotate on every refresh call |
| XSS protection | httpOnly cookies unreadable by JavaScript |
| Google OAuth | Tokens URL-only during callback, immediately exchanged for cookies |

### GDPR Status

- ✅ Data stored in EU (Railway EU West + Supabase EU)
- ✅ Privacy policy at `/privacy`
- ✅ `DELETE /auth/delete-account` full data removal
- ✅ Email only collected when alerts are explicitly enabled
- ✅ No ads, no data selling

---

## 📊 Data Sources

| Source | Auth | Coverage | License |
|--------|------|----------|---------|
| Energy-Charts.info | None | EPEX Spot Belgium hourly | Free, attribution required |
| Elia Open Data | None | Belgium grid day-ahead | CC BY 4.0 |
| ICE / EEX (TTF) | API key | Natural gas (TTF) daily | Paid |
| callmepower.be | None | Variable tariff scraping | Public HTML |

---

## 🚢 Deployment

### Backend → Railway

```
1. Push to main branch
2. Railway auto-detects Node.js → runs npm start
3. Set env vars in Railway dashboard
4. Live URL: https://smart-energy-production-aef3.up.railway.app
```

### Frontend → Vercel

```
1. Connect GitHub repo to Vercel
2. Root Directory: StroomprijsApp/frontend
3. Vercel auto-detects Vite → runs npm run build
4. vercel.json handles:
   - /api/*  → proxied to Railway backend
   - /*      → index.html (SPA fallback, enables /calculator/* routes)
```

### Git push (Windows)

```powershell
cd "C:\Users\kvmou\OneDrive\Documents\GitHub\Smart Energy\StroomprijsApp"
git add .
git commit -m "your message"
git push origin main
```

---

## ✅ Features (March 2026)

- [x] Real-time EPEX Spot electricity price chart
- [x] TTF gas prices with 7-day history
- [x] ⚡ / 🔥 energy type toggle with live indicator
- [x] 5 cheapest hours finder
- [x] Today / Tomorrow / History / Best Hours / Suppliers / Alerts tabs
- [x] Graph + Table toggle on price charts
- [x] **Electricity Plan Calculator** — `/calculator/electricity`
- [x] **Gas Plan Calculator** — `/calculator/gas`
- [x] Calculator in ⚡ · 🔥 · 🔌 nav toggle on dashboard
- [x] Calculator CTAs on landing page (both electricity + gas)
- [x] Sign-in gate on calculator results (deferred — calc runs before login prompt)
- [x] 7 Belgian suppliers: Engie · Luminus · Bolt · TotalEnergies · Eneco · Mega · Octa+
- [x] Flanders capacity tariff (peak kW detection)
- [x] Wallonia / Brussels kWh-based grid tariff
- [x] Gas 21% VAT + Fluxys/ORES breakdown
- [x] Weekly tariff scraper (callmepower.be)
- [x] Email + Google OAuth login
- [x] Guest mode — browse without account
- [x] Price alerts by email (Resend, `alerts@smartprice.be`)
- [x] Mobile-first UI + bottom navigation
- [x] PWA — installable on Android/iOS
- [x] GDPR: privacy policy + delete account

---

## 🗺 Roadmap

### Near term
- [ ] Save calculator configuration to user profile
- [ ] "Compare my current bill" — upload PDF → extract consumption → show savings
- [ ] Web push notifications (no app store needed)

### Later
- [ ] French language toggle (NL/FR)
- [ ] Postcode-based exact grid costs (per municipality)
- [ ] Affiliate switch links (€30–80 referral commission)
- [ ] itsme auth + Fluvius smart meter sync (EAN-based personal consumption)
- [ ] CREG registration as official comparator

---

## 📜 License & Credits

- **Code:** Private / proprietary  
- **Price data:** Energy-Charts.info · Elia Open Data (CC BY 4.0) · ENTSO-E · ICE EEX  
- **Contact:** hello@smartprice.be  
- **Not financial advice** — always verify tariffs on supplier websites before switching