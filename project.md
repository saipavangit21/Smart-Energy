# SmartPrice.be — Full Project Explainer
## For technical and non-technical audiences

---

## PART 1: WHAT IS IT? (For anyone)

SmartPrice.be is a free Belgian website (and mobile app) that shows electricity prices in real-time, hour by hour.

**The problem it solves:**
If you have a "dynamic" electricity contract in Belgium (like Bolt, Engie Spot, or TotalEnergies Flex), your electricity price changes every single hour based on the wholesale market. Most people have no idea when it's cheap or expensive — they just use electricity whenever they want and get a big bill at the end of the month.

**What SmartPrice does:**
- Shows you the price for every hour of today and tomorrow
- Tells you the cheapest 3–5 hours (best time for washing machine, EV charging, dishwasher)
- Sends you an email alert when prices drop below a level you choose
- Works like a native app on your phone — no app store needed

**Who it's for:**
Anyone in Belgium on a dynamic electricity contract. This is increasingly common as energy suppliers push "spot price" contracts.

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

1. **The data comes from EPEX Spot** — the European Power Exchange where electricity is traded wholesale. Belgian prices are published the day before (day-ahead market).

2. **Our server fetches this data** from two free public sources (Elia Open Data and Energy-Charts by Fraunhofer Institute in Germany). It checks for updates every 15 minutes.

3. **Your browser shows it** as a colour-coded chart — green = cheap, red = expensive.

4. **Alerts work like this:** Every hour, the server checks if the current price is below your chosen threshold. If yes, it sends you an email automatically.

---

## PART 3: TECHNICAL ARCHITECTURE

### The Stack

```
┌─────────────────────────────────────────────────────┐
│  FRONTEND (what you see)                            │
│  React + Vite · Hosted on Vercel                    │
│  smartprice.be → Vercel servers (global CDN)        │
└─────────────────┬───────────────────────────────────┘
                  │ HTTPS API calls
┌─────────────────▼───────────────────────────────────┐
│  BACKEND (the engine)                               │
│  Node.js + Express · Hosted on Railway (EU West)    │
│  Handles: auth, prices, alerts, user preferences    │
└──────┬──────────────────────────┬───────────────────┘
       │                          │
┌──────▼──────┐          ┌────────▼────────┐
│  DATABASE   │          │  EMAIL SERVICE  │
│  PostgreSQL │          │  Resend         │
│  Supabase   │          │  alerts@        │
│  (EU region)│          │  smartprice.be  │
└─────────────┘          └─────────────────┘
```

### Frontend — React
React is a JavaScript library for building user interfaces. Think of it like LEGO — you build small reusable pieces (components) that snap together. Each tab on the dashboard (Today, Alerts, History, etc.) is a separate component. When data changes, React automatically updates only the parts of the page that need updating — no full page reload.

**Vite** is the build tool — it compiles and bundles all the code for production.

**Recharts** draws the price graphs — it takes raw numbers and turns them into the colourful bar charts.

**PWA (Progressive Web App)** — a set of browser standards that let a website behave like a native app. When you visit smartprice.be on Android and tap "Add to Home Screen", it installs like a real app — offline capable, full screen, no browser bar.

### Backend — Node.js + Express
Node.js is JavaScript running on a server (not in a browser). Express is a lightweight framework that makes it easy to define API routes — rules like "when someone calls /api/prices/today, do this".

The backend does four main jobs:
1. **Fetch prices** from external APIs (Elia, Energy-Charts) and cache them for 15 minutes
2. **Handle authentication** — check who you are, issue tokens, manage sessions
3. **Store and retrieve user preferences** — your chosen supplier, alert threshold, email
4. **Send alert emails** — runs every hour, checks all users with alerts enabled

### Database — PostgreSQL on Supabase
PostgreSQL is a relational database — like a very powerful, structured spreadsheet. We use it to store:
- User accounts (name, hashed password, preferences)
- Refresh tokens (for keeping you logged in safely)

Supabase is a hosted PostgreSQL service — they manage the server, backups, and scaling. We're on their EU region so data stays in Europe.

### Hosting
- **Vercel** hosts the frontend. Every time code is pushed to GitHub, Vercel automatically rebuilds and deploys in ~30 seconds.
- **Railway** hosts the backend. Same auto-deploy on push. EU West region for data sovereignty.

---

## PART 4: AUTHENTICATION — HOW LOGIN WORKS

### The Problem with Passwords
We never store your actual password. Instead, we run it through a one-way function called **bcrypt** (a hashing algorithm). The result looks like `$2b$12$eW5e...` — completely unreadable. When you log in, we hash what you typed and compare the two hashes. If they match, you're in.

Even if a hacker stole our database, they'd only get a list of unreadable hashes — not your password.

### Tokens — How We Know It's You
After you log in, the server creates two short-lived **JWT tokens** (JSON Web Tokens):

- **Access token** — like a 15-minute visitor pass. Attached automatically to every request.
- **Refresh token** — like a 7-day "renew your pass" ticket. Used only to get a new access token when the old one expires.

These tokens are stored in **httpOnly cookies** — a special type of browser storage that JavaScript cannot read. This protects against XSS attacks (where malicious code injected into a page tries to steal your credentials).

### Google OAuth — "Continue with Google"
OAuth is a standard protocol for "login with another service". Here's what happens:

```
1. You click "Continue with Google"
2. You're sent to Google's servers (accounts.google.com)
3. You approve on Google's page
4. Google sends a one-time code back to OUR server
5. Our server exchanges that code for your Google profile (name, email)
6. We create/find your account, generate our own JWT tokens
7. You're logged in — we never see your Google password
```

### Email is Optional
Most apps force you to give an email at signup. SmartPrice only asks for a name and password. Email is only collected if you want price alert notifications — and only then, only for sending alerts.

---

## PART 5: SECURITY IN PLAIN ENGLISH

### For a non-technical person:
Think of security like a house:
- **bcrypt passwords** = we don't keep a copy of your key, just a photo of the lock pattern that only matches your key
- **httpOnly cookies** = your visitor badge is in a sealed envelope — you can show it at doors but can't read what's inside
- **HTTPS** = all conversations between your browser and our server are encrypted — like talking in a soundproof booth
- **EU hosting** = your data never leaves Europe

### For a technical person:

| Threat | Mitigation |
|---|---|
| Password database breach | bcrypt cost 12 — each crack attempt takes ~250ms |
| XSS token theft | httpOnly cookies — inaccessible to JavaScript |
| CSRF attacks | sameSite cookie policy + CORS credentials whitelist |
| Token replay attacks | Refresh token rotation — old tokens invalidated on use |
| Brute force login | express-rate-limit: 20 attempts per 15 min per IP |
| Privilege escalation | requireAuth middleware on every protected route |
| Cross-origin cookie theft | sameSite: none + secure: true in production only |
| SQL injection | Parameterised queries via pg library — no string interpolation |

---

## PART 6: GDPR EXPLAINED

### What is GDPR?
GDPR (General Data Protection Regulation) is EU law that gives people control over their personal data. It applies to any service that handles data of EU residents — regardless of where the company is based.

### Key principles and how SmartPrice complies:

**1. Data Minimisation — only collect what you need**
SmartPrice collects:
- Name (to identify you)
- Password hash (to authenticate you)
- Email — only if you want alerts, only when you ask for it
- Your alert preferences (threshold, chosen supplier)

We do NOT collect: location, browsing behaviour, device fingerprints, advertising IDs.

**2. Purpose Limitation — only use data for what you said**
Your email is used only to send price alerts. It is never shared, sold, or used for marketing.

**3. Storage Limitation — don't keep data forever**
Users can delete their account at any time. Deletion removes all data including refresh tokens.

**4. Data stored in EU**
Railway (EU West) + Supabase (EU region) — data never leaves the European Economic Area.

**5. Right to be forgotten**
`DELETE /auth/delete-account` — one call removes everything from the database permanently.

**6. Transparency**
Privacy policy is live at smartprice.be explaining exactly what is collected and why.

### What GDPR does NOT require:
- Cookie banner for functional cookies (login cookies are necessary for the service to function — no consent needed)
- Registration with any authority for a small app handling non-sensitive data

### What's still recommended:
- Sign the Supabase Data Processing Agreement (DPA) at supabase.com/dpa — this formally documents the processor relationship
- Document a data breach response plan (even a simple one)

---

## PART 7: ISO 27001 EXPLAINED

### What is ISO 27001?
ISO 27001 is an international standard for Information Security Management Systems (ISMS). It's a certification that proves an organisation has systematic processes for managing information security risks.

### Does SmartPrice have it?
No — and it doesn't need it at this stage.

ISO 27001 certification:
- Costs €15,000–50,000+ for audit and certification
- Takes 6–12 months to implement
- Requires a full documented ISMS (policies, procedures, risk registers)
- Is designed for organisations handling sensitive data at scale (hospitals, banks, SaaS companies with enterprise customers)

### When would SmartPrice need it?
If we wanted to:
- Sign enterprise B2B contracts (companies often require it from suppliers)
- Handle sensitive personal data (medical, financial)
- Sell to government or regulated industries

### What SmartPrice DOES have (ISO 27001-aligned practices):
Even without certification, many ISO 27001 controls are already implemented:
- ✅ Access control (JWT + role-based routes)
- ✅ Cryptography (bcrypt, HTTPS, JWT signing)
- ✅ Secure development (parameterised queries, rate limiting)
- ✅ Audit logging (Railway logs all requests)
- ✅ Data backup (Supabase automated backups)
- ✅ Incident response capability (Railway alerts on crashes)

---

## PART 8: HOW TO EXPLAIN IT TO ANYONE

### To a family member:
"I built a free app that tells you when electricity is cheapest in Belgium. If you have one of those contracts where the price changes every hour, this app tells you the best time to run your washing machine or charge your car. It sends you an email when prices are really low."

### To a non-technical colleague:
"It's like a real-time dashboard for Belgian electricity spot prices. It fetches wholesale market data from public sources every 15 minutes, shows you a colour-coded hourly chart, and emails you when prices drop below your chosen threshold. No subscription, no ads, free to use."

### To a developer:
"React + Vite frontend on Vercel, Node/Express backend on Railway EU, PostgreSQL on Supabase. Fetches EPEX Spot prices via Elia Open Data and Energy-Charts API with 15-min NodeCache. Cookie-based auth with httpOnly JWT, bcrypt passwords, refresh token rotation. PWA with service worker. Google OAuth with cross-origin token exchange pattern."

### To a recruiter / hiring manager:
"I built and deployed a full-stack production application from scratch — React frontend, Node.js REST API, PostgreSQL database, Google OAuth, email notifications via Resend, PWA, and HTTPS cookie-based authentication. It handles real users, real data, and is live at smartprice.be. The codebase covers auth security (httpOnly cookies, bcrypt, token rotation), CORS, rate limiting, and GDPR compliance."

### To an investor:
"SmartPrice.be is a free tool for Belgian dynamic electricity contract holders — a market that's growing as more suppliers push spot-price contracts. We have real-time EPEX Spot data, price alerts, and a mobile-installable app. Phase 2 adds a real bill calculator (unique vs competitors). Phase 3 monetises via affiliate referrals (€30–80 per supplier switch). The main competitor, Mijnenergie.be (owned by DPG Media), doesn't cover dynamic contracts — that's our differentiation."