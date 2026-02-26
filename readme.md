# ⚡ StroomSlim — Belgium Real-Time Electricity Price App

A full-stack web app showing real EPEX Spot prices for Belgium in real-time.  
Built with: **React + Vite** (frontend) + **Node.js/Express** (proxy backend)

---

## 🗂 Project Structure

```
stroomslim/
├── backend/
│   ├── server.js          ← Proxy server (fetches Elia + Energy-Charts + ENTSO-E)
│   ├── package.json
│   └── .env.example       ← Copy to .env and fill in your API keys
└── frontend/
    ├── src/
    │   ├── App.jsx         ← Main dashboard UI
    │   ├── hooks/
    │   │   └── usePrices.js   ← Data fetching hooks
    │   └── utils/
    │       └── priceUtils.js  ← Price formatting & supplier formulas
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## 🚀 Quick Start

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # Fill in your keys (see below)
npm run dev                 # Starts on http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                 # Starts on http://localhost:5173
```

The Vite dev server automatically proxies `/api/*` to the backend.

---

## 🔑 API Keys & Registration

### Source 1: Energy-Charts (Fraunhofer ISE) — NO KEY NEEDED ✅
- **URL**: `https://api.energy-charts.info/`
- **Coverage**: EPEX Spot Belgium, hourly, day-ahead and some intraday
- **Rate limit**: ~100 req/hour (be polite!)
- **License**: Free for commercial use with attribution

### Source 2: Elia Open Data — NO KEY NEEDED ✅
- **URL**: `https://opendata.elia.be/api/explore/v2.1/`
- **Coverage**: Belgium grid data, day-ahead prices, balancing, generation
- **License**: Creative Commons Attribution 4.0 (CC BY 4.0) — free, commercial OK
- **Attribution required**: "Source: Elia Open Data (elia.be)"

### Source 3: ENTSO-E Transparency Platform — FREE, requires registration
1. Register at: https://transparency.entsoe.eu/
2. Email: transparency@entsoe.eu
   - Subject: **"Restful API access"**
   - Body: include your registered email address
3. Receive your security token within **1-2 business days**
4. Add to `.env`: `ENTSOE_API_KEY=your_token_here`

---

## 📜 Terms & Conditions Summary

| Source | Commercial use | Attribution | Rate limits | Notes |
|---|---|---|---|---|
| **Energy-Charts** (Fraunhofer ISE) | ✅ Free | Required | ~100/hr | Best source for EPEX Spot |
| **Elia Open Data** | ✅ Free (CC BY 4.0) | Required | No hard limit | Belgian grid operator |
| **ENTSO-E** | ✅ Free with token | Required | 400 req/hour | EU-wide, official source |
| **EPEX SPOT (direct)** | 💰 Paid license | Yes | Per contract | Not needed for day-ahead |

### Full License Links
- Elia CC BY 4.0: https://www.elia.be/en/grid-data/elia-open-data-license
- ENTSO-E T&C: https://transparency.entsoe.eu/content/static_content/Static%20content/terms%20and%20conditions/terms%20and%20conditions.html
- Energy-Charts: https://www.energy-charts.info (Fraunhofer ISE, open data)

### What you MUST do in your app:
```
✅ Attribute "Source: Elia Open Data (elia.be)" in your UI
✅ Attribute "Data: Energy-Charts.info / Fraunhofer ISE"
✅ Attribute "Source: ENTSO-E Transparency Platform" if using ENTSO-E
✅ Don't claim data is more accurate than it is
✅ Don't re-sell raw API data without a separate commercial agreement
✅ Include "Not financial advice" disclaimer
```

---

## 📡 API Endpoints (Proxy Server)

| Endpoint | Description |
|---|---|
| `GET /api/health` | Server health + cache status |
| `GET /api/prices/today` | Today + tomorrow hourly prices (auto-source) |
| `GET /api/prices/range?start=YYYY-MM-DD&end=YYYY-MM-DD` | Historical range |
| `GET /api/prices/entsoe` | ENTSO-E day-ahead (needs API key) |
| `GET /api/current` | Current hour only (for live polling) |
| `GET /api/cheapest?hours=5` | N cheapest upcoming hours |

---

## 🏗 Production Deployment

### Option A: Simple (single server)
```
AWS EC2 t3.small or Hetzner VPS (€4/month)
├── nginx reverse proxy (port 80/443)
├── PM2 for Node.js backend
└── Vite build served as static files
```

### Option B: Serverless
```
Vercel (frontend) + Railway or Render (backend proxy)
Cost: ~€0–10/month depending on traffic
```

### Option C: Docker
```dockerfile
# Both services can be containerized
# docker-compose.yml included below
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports: ["3001:3001"]
    env_file: ./backend/.env
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports: ["80:80"]
    depends_on: [backend]
    restart: unless-stopped
```

---

## 🔐 itsme Integration (Phase 2)

To add Belgian digital identity login (for Fluvius smart meter access):

1. **Apply** at: https://www.itsme-id.com/business
2. **Protocol**: OpenID Connect (OIDC) — standard OAuth2 flow
3. **Timeline**: ~8-12 weeks for partnership agreement
4. **Use case**: Let users connect their Fluvius EAN number to auto-fetch personal consumption data

```javascript
// itsme OIDC config (add to your auth provider)
{
  issuer: 'https://idp.itsme.services/v2',
  authorization_endpoint: 'https://idp.itsme.services/v2/authorization',
  clientId: 'YOUR_ITSME_CLIENT_ID',
  scope: 'openid profile email service:YOUR_SERVICE_CODE',
}
```

---

## 📊 Data Flow

```
Browser → Your Frontend (React)
              ↓ fetch /api/prices/today
         Your Backend Proxy (Node.js)
              ↓ (picks fastest source with fallback)
    ┌─────────────────────────────────┐
    │  1. Energy-Charts API (no auth) │  ← Primary
    │  2. Elia Open Data API (no auth)│  ← Fallback
    │  3. ENTSO-E API (API key)       │  ← Day-ahead backup
    └─────────────────────────────────┘
              ↓ cached in memory (15 min)
         JSON response to browser
              ↓
         Recharts renders real graph
```

---

## 🇧🇪 CREG Compliance (for price comparison features)

If you show supplier price comparisons and want official recognition:
- Apply for CREG certification: https://www.creg.be
- This is **free** and makes your app an officially recognized comparator
- Required if you want to be listed on government energy portals
- Improves consumer trust significantly

---

## 📈 Roadmap

- [x] Phase 1: Real-time EPEX spot price chart (this app)
- [ ] Phase 2: itsme auth + Fluvius smart meter sync
- [ ] Phase 3: Push notifications (Expo / FCM)
- [ ] Phase 4: EV charger API integration (OCPP)
- [ ] Phase 5: AI scheduling assistant (MCP-powered)