# SmartPrice.be — Document Update Brief
**Date: May 2026** | Apply to: Technical Documentation, Runbook, Knowledge Base, Investor Document

---

## SUMMARY OF ALL CHANGES SINCE LAST UPDATE (April → May 2026)

---

## 1. TESLA FLEET API INTEGRATION

**New major feature — add to all documents**

SmartPrice.be now integrates with the Tesla Fleet API:
- OAuth flow: user clicks "Connect your Tesla" → Tesla consent → tokens saved to user preferences
- Backend: `GET /auth/tesla` (start), `GET /auth/tesla/callback` (token exchange)
- Data: `GET /api/tesla/vehicle` returns battery_level, battery_range_km, charging_state, charge_limit_soc, minutes_to_full
- Partner registration completed for `www.smartprice.be` at Tesla Fleet API
- Public key hosted at `/.well-known/appspecific/com.tesla.3p.public-key.pem`
- Bug fixed: `COALESCE(preferences, '{}')` in updatePreferences to handle NULL preferences for new users
- Vehicle asleep state: shows amber warning with Refresh button
- Env vars required: `TESLA_CLIENT_ID`, `TESLA_CLIENT_SECRET`

---

## 2. EV PROFILE (ALL CARS)

**New feature — add to Knowledge Base and Technical Doc**

- 30 popular Belgian EVs with battery capacity in dropdown selector
- Battery % slider (5–95% step 5)
- Personalised cost: "Charging Ioniq 5 from 45%→80% (~27kWh) | Now: €3.20 | At 23:00: €1.40 | Save €1.80"
- Saved to user preferences (`ev_car`, `ev_batt`)
- Priority: Tesla live data > EV profile > generic 50kWh fallback

---

## 3. EV TAB — 3RD MAIN DASHBOARD TAB

**New feature — update Technical Doc and Knowledge Base**

Dashboard now has 3 main tabs: ⚡ Electricity | 🔥 Gas | 🔋 EV

EV tab contains:
- Hero stats: EPEX now, cost per charge, best window, saving if you wait
- Tesla connect card (or EV profile selector for non-Tesla)
- Personalised cost summary card
- Ranked cheapest hours list with per-charge cost + savings
- Tomorrow's windows preview
- Quick links: Stations Map, Compare EV Plans, Full EV Guide

---

## 4. WEEKLY EMAIL DIGEST

**New automated feature — add to Runbook and Knowledge Base**

- Sends every Monday at 08:00 Brussels time to all email users
- Content: last 7 days EPEX stats (avg/min/max/negative hours), contextual advice, Tesla Connect highlight, share buttons
- Once-per-day guard prevents duplicate sends
- Manual trigger: `POST /api/admin/send-weekly-digest { secret, force? }`
- Referral source tracking buttons (7 options) in welcome email

---

## 5. ADMIN NOTIFICATIONS

**New feature — add to Runbook**

- Admin email (info@smartprice.be) notified on every new registration
- Shows: name, email, timestamp (Brussels), total user count, link to admin dashboard
- Works for both email registration AND Google OAuth (fixed)

---

## 6. SEO IMPROVEMENTS

**Technical change — update Technical Doc**

- `robots.txt` added with sitemap pointer
- Unique `document.title` + `meta[description]` + canonical per page (8 pages)
- `index.html` canonical tag: `href=""` (empty) with `id="canonical-tag"` — JS sets per-page canonical
- Google Search Console: sitemap submitted, indexing requested
- Googlebot actively crawling (confirmed by 5,000–8,000 SEO page views/day)

---

## 7. EV STATIONS PAGE IMPROVEMENTS

**Feature updates — update Knowledge Base**

- "Best hours to charge today" panel above map (3 cheapest hours + cost per 30kWh)
- Email capture strip: "Get alerted when prices drop" → `/api/leads` with source=ev-stations
- Supplier CTA above map: "Compare all Belgian suppliers →"
- Home charging nudge in station detail panel

---

## 8. LANDING PAGE IMPROVEMENTS

**Feature updates — update Knowledge Base and Investor Doc**

- Negative price alert banner: pulsing cyan banner when EPEX < €0/MWh
- Gas price compact tile (TTF €/MWh + c€/kWh)
- Social proof counter: "X people checked EV prices today · Y users tracking Belgian energy"
- Context label: "⚡ Live Belgian electricity prices — updated every 15 min"
- Footer: added Facebook group + LinkedIn page links, Community column

---

## 9. SOCIAL & COMMUNITY PRESENCE

**New — add to Investor Document and Knowledge Base**

- Facebook group: facebook.com/groups/819979377511277
- LinkedIn company page: linkedin.com/company/smartprice-be
- Reddit: r/SmartPriceBE (low karma phase, building)
- Referral source tracked per user in admin dashboard

---

## 10. OUTREACH STATUS (for Investor Document)

**Update investor document with current outreach results:**

Supplier affiliate:
- TotalEnergies: responded, requested detailed proposal → sent
- Engie: responded "too small now" — direct contact Erik Voet (Erik.voet@engie.com)
- Luminus: form submitted, communication@luminus.be invalid
- Bolt, Eneco, Mega, Octa+: sent, awaiting replies

B2B fleet:
- BMW: replied — decision at Munich HQ
- Lizy: declined — existing solution
- RENTA federation: replied — provided 60-member list → 13 targeted emails sent
- Tesla Belgium: email sent with Developer Portal Active status

---

## 11. METRICS (May 2026)

**Update Investor Document:**

- 70+ registered users (started March 2026, ~2/day growth)
- 300+ daily EV page views (some days 430+)
- 50+ email subscribers (weekly digest)
- 6 leads from email capture
- Tesla Fleet API: Active app, partner registered, first external user connected
- Calculator runs: starting to occur (3/day)
- SEO: Google actively indexing, 68 real human SEO sessions recorded

---

## 12. TECHNICAL CHANGES

**Update Technical Documentation:**

- EV stations: switched from OpenChargeMap to OpenStreetMap/Overpass API (24h cache, pre-warmed on startup)
- `/api/cheapest` now returns enriched prices (with hour, day, is_current) — was returning raw
- `updatePreferences` uses `COALESCE(preferences, '{}')` — fixes NULL preferences for new users
- Email from address: `info@smartprice.be` throughout (was `hello@` in welcome email)
- Google OAuth now sends welcome email + admin notification on first sign-in (was missing)
- New public endpoint: `GET /api/stats` — registered_users + ev_views_today (5min cache)
- New endpoint: `GET /api/referral-source` — logs how users found SmartPrice
- Tesla public key served at `/api/tesla/public-key.pem` (proxied from Vercel via rewrite)

---

## ENV VARS ADDED

Add to all environment variable lists:

```
TESLA_CLIENT_ID=...          # Tesla Developer Portal client ID
TESLA_CLIENT_SECRET=...      # Tesla Developer Portal client secret
```

---

## CONTACT / SOCIAL UPDATES

- Email: `info@smartprice.be` (was `hello@smartprice.be`)
- Facebook: facebook.com/groups/819979377511277
- LinkedIn: linkedin.com/company/smartprice-be
