# SmartPrice.be — Full Project Explainer
## For technical and non-technical audiences
**Last updated: May 2026**

---

## PART 1: WHAT IS IT? (For anyone)

SmartPrice.be is a free Belgian energy intelligence platform showing electricity prices in real-time, helping households and EV drivers make smarter energy decisions.

**The problem it solves:**
If you have a "dynamic" electricity contract in Belgium (like Bolt, Engie Spot, or TotalEnergies Flex), your electricity price changes every hour based on the wholesale market. Most people have no idea when it's cheap or expensive — they just use electricity whenever they want and get a big bill at the end of the month.

**What SmartPrice does:**
- Shows the price for every hour of today and tomorrow (EPEX Spot Belgium)
- Tells you the cheapest upcoming hours (best time for EV charging, washing machine, dishwasher)
- **EV tab** — dedicated dashboard for EV drivers with cheapest charge windows ranked
- **Tesla integration** — connects via official Tesla Fleet API to show your actual battery level and exact charging cost ("charge now for €3.95 or wait until 14:00 for €2.21")
- **EV profile** — select your car model (30 cars: Ioniq 5, ID.4, BMW i4, Polestar 2, etc.) + set battery % for personalised cost estimates without Tesla API
- Sends email alert when prices drop below your chosen threshold
- Compares all Belgian electricity and gas suppliers with personalised annual costs
- Shows live TTF gas prices and compact tile on landing page
- AI assistant (Claude) answers energy questions
- Map of all public EV charging stations in Belgium
- Negative price alert banner on landing page when EPEX < €0/MWh
- Weekly Monday email digest with last week's price stats + Tesla feature highlight + share buttons

**Who it's for:**
Belgian households, EV drivers, smart home users (Home Assistant), and dynamic electricity contract holders.

**Current metrics (May 2026):**
- 70+ registered users (growing ~2/day)
- 300+ daily EV page views
- 50+ email subscribers (weekly digest)
- Tesla Fleet API registered and active
- 6 leads captured via email capture strip

---

## PART 2: HOW IT WORKS — NON-TECHNICAL

Think of it like a weather app, but for electricity prices.

```
Electricity Market (EPEX Spot)
        ↓  prices published day-ahead
Our Server (checks every 15 min)
        ↓  processes and stores prices
Your Browser / Phone
        ↓  shows you the chart + alerts
```

1. **The data comes from EPEX Spot** — the European Power Exchange where electricity is traded wholesale. Belgian prices are published the day before (day-ahead market). Prices can range from −€479/MWh to +€400/MWh on the same day.

2. **Our server fetches this data** from Energy-Charts.info (Fraunhofer ISE) with ENTSO-E as fallback. It checks for updates every 15 minutes.

3. **Your browser shows it** as a colour-coded chart — green = cheap, red = expensive.

4. **Alerts work like this:** Every hour, the server checks if the current price is below your chosen threshold. If yes, it sends you an email automatically.

5. **Tesla integration:** User connects their Tesla via OAuth → SmartPrice reads battery level and charging state → shows personalised cost calculation in real time.

---

## PART 3: TECHNICAL ARCHITECTURE

### The Stack

```
┌─────────────────────────────────────────────────────┐
│  FRONTEND (what you see)                            │
│  React + Vite · Hosted on Vercel (CDN)              │
│  smartprice.be → Vercel servers (global CDN)        │
└─────────────────┬───────────────────────────────────┘
                  │ HTTPS API calls (proxied)
┌─────────────────▼───────────────────────────────────┐
│  BACKEND (the engine)                               │
│  Node.js + Express · Hosted on Railway (EU West)    │
│  Handles: auth, prices, alerts, Tesla OAuth         │
└──────┬──────────────────────────┬───────────────────┘
       │                          │
┌──────▼──────┐          ┌────────▼────────┐
│  DATABASE   │          │  EMAIL SERVICE  │
│  PostgreSQL │          │  Resend         │
│  Supabase   │          │  info@          │
│  (Ireland)  │          │  smartprice.be  │
└─────────────┘          └─────────────────┘
```

### Key Backend Routes
- `GET /api/current` — current EPEX price
- `GET /api/prices/today` — enriched 24h prices (hour, day, is_current, is_negative)
- `GET /api/cheapest?hours=N` — N cheapest upcoming hours (enriched)
- `GET /api/gas/current` — TTF gas price
- `GET /api/tesla/vehicle` — Tesla battery + charging state (JWT required)
- `GET /auth/tesla` — Tesla OAuth start
- `GET /auth/tesla/callback` — Tesla OAuth callback
- `GET /api/stats` — public stats for social proof counter
- `GET /api/referral-source` — tracks how users found SmartPrice (from welcome email)
- `POST /api/admin/send-weekly-digest` — manual digest trigger

---

## PART 4: AUTHENTICATION

### Email + Password
Registration requires email + password. Email is mandatory (login + price alerts). bcrypt cost 12. JWT access token (15min) + refresh token (7d) in httpOnly cookies.

### Google OAuth
Standard OAuth 2.0 flow via Google. On first sign-in, welcome email + admin notification are sent automatically.

### Tesla Fleet API OAuth
1. User clicks "Connect your Tesla" on EV tab
2. Redirected to Tesla consent page (`auth.tesla.com/oauth2/v3/authorize`)
3. Tesla redirects to `https://smartprice.be/auth/tesla/callback`
4. Backend exchanges code for tokens, saves to user preferences (`COALESCE` fix for NULL preferences)
5. Vehicle data fetched from `fleet-api.prd.eu.vn.cloud.tesla.com`
6. Partner registration completed for `www.smartprice.be` (required by Tesla Fleet API)
7. Public key hosted at `/.well-known/appspecific/com.tesla.3p.public-key.pem` via Railway

---

## PART 5: EMAIL SYSTEM

All emails sent via Resend from `info@smartprice.be`.

| Email | Trigger | Recipients |
|-------|---------|------------|
| Welcome | New registration (email or Google OAuth) | New user |
| Admin notification | New registration | info@smartprice.be |
| Price alert | Hourly check, price < threshold | Alert subscribers |
| Weekly digest | Every Monday 08:00 Brussels | All email users |
| Uptime alert | Site down/recovery | ALERT_ADMIN_EMAIL |

**Weekly digest includes:**
- Last 7 days EPEX stats (avg, min, max, negative hours)
- Contextual EV charging advice
- Tesla Connect feature highlight
- "How did you find SmartPrice?" referral source tracking buttons
- Share on WhatsApp / forward by email buttons

---

## PART 6: SEO

- `robots.txt` → points to sitemap
- `sitemap.xml` → all 10 routes
- Each page sets unique `document.title` + `meta[description]` + canonical via `getElementById('canonical-tag')`
- Google Search Console verified and sitemap submitted
- Canonical fix: `index.html` has empty `href=""` canonical; each page sets its own via JS
- Googlebot crawling confirmed (5,000–8,000 SEO page views/day during indexing phase)

---

## PART 7: SOCIAL & COMMUNITY

- **Facebook group:** facebook.com/groups/819979377511277
- **LinkedIn page:** linkedin.com/company/smartprice-be
- **Reddit:** r/SmartPriceBE (created, low karma phase)
- Footer links to Facebook + LinkedIn on landing page
- Referral source tracked in welcome email (7 options: Facebook, Google, friend, HA, LinkedIn, Tesla group, Other)

---

## PART 8: OUTREACH STATUS (May 2026)

### Supplier affiliate outreach
| Supplier | Status |
|---------|--------|
| Bolt Energy | Sent — awaiting reply |
| Eneco | Sent — awaiting reply |
| Mega | Sent — redirected to partnerships dept |
| Engie | Replied — "too small now, follow up later" — contact: Erik.voet@engie.com |
| Luminus | Form submitted |
| TotalEnergies | Replied — requested detailed proposal (sent) |
| Octa+ | Sent — EV/fuel card angle |

### B2B fleet / widget outreach
| Company | Status |
|---------|--------|
| Tesla Belgium | Email sent — Developer Portal Active, partner registered |
| Polestar Belgium | Draft ready |
| Blink/Bluecorner | Draft ready |
| Renault/Mobilize | Draft ready |
| BMW Financial Services | Replied — decision at Munich HQ |
| Lizy BV | Declined — existing solution |
| RENTA federation | Replied — provided 60-member list |

---

## PART 9: GDPR

SmartPrice collects:
- Email + password hash (registration)
- User preferences (supplier, alert threshold, EV car, Tesla tokens)
- Referral source (from welcome email click)
- Lead email (optional landing page capture)
- Analytics events (page views, calculator starts — no PII)

No location, browsing behaviour, device fingerprints, or advertising IDs collected.
Users can delete their account at any time (`DELETE /auth/delete-account`).
Data stored in EU (Railway Amsterdam + Supabase Ireland).

---

## PART 10: HOW TO EXPLAIN IT TO ANYONE

### To a family member:
"I built a free app that tells you when electricity is cheapest in Belgium. If you have one of those contracts where the price changes every hour, this app tells you the best time to run your washing machine or charge your car — and if you have a Tesla, it connects directly to your car and shows you the exact cost."

### To a developer:
"React + Vite frontend on Vercel, Node/Express backend on Railway EU, PostgreSQL on Supabase. EPEX Spot prices via Energy-Charts.info (15-min NodeCache), ENTSO-E fallback. Cookie-based auth with httpOnly JWT, bcrypt, refresh token rotation. Tesla Fleet API OAuth with partner registration (www.smartprice.be). Google OAuth. EV profile (30 cars) + Tesla live data. Weekly digest with referral tracking. Public REST API for Home Assistant. TTF gas via OilPriceAPI. Trilingual EN/NL/FR."

### To an investor:
"SmartPrice.be is a free energy intelligence tool for Belgian dynamic contract holders — a market growing as more suppliers push spot-price contracts. We have 70+ users in 3 months with zero marketing spend, a live Tesla Fleet API integration (first in Belgium), and active B2B conversations with TotalEnergies, Engie, Luminus, and fleet companies (RENTA member network). Revenue model: €20–50/activation affiliate commissions from energy suppliers + B2B API access fees for fleet/mobility companies. The main Belgian comparison sites (Mijnenergie.be) don't cover dynamic pricing — that's our differentiation. Timeline: 2-year build to sustainable revenue."
