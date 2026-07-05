# SmartPrice.be — Changelog

---

## July 2026

### Landing Page — EV API section (2026-07-05)
New section targeting charging app developers, in-car navigation teams, and fleet software builders. Positions SmartPrice API as the "when to charge" layer complementing Tesla/BMW/Fastned "where to charge" maps.
- Three use-case cards: charging map apps (overlay EPEX vs station price), in-car navigation (cheapest window tonight), fleet dispatch (EPEX cost threshold)
- Monospace API spec strip: `/api/current` · `/api/cheapest` · `/api/prices/today`
- CTA buttons: API docs + enterprise contact
- Fully translated EN/NL/FR

### Landing Page — Eco strip (2026-07-05)
Thin factual strip between stats bar and journey section explaining grid impact:
- "EPEX prices fall when wind and solar flood the Belgian grid. Cheap hours = peak renewables. Negative prices = surplus clean energy going to waste."
- Three pills: 🌱 Lower grid carbon · 💨 Wind surplus hours · ⚡ Zero renewable waste
- Green gradient background, centered, theme-aware (dark/light)
- Fully translated EN/NL/FR

### Landing Page + Business Page — Animated journey strips (2026-07-03)
Scroll-triggered, slide-up fade-in 3-card strips with staggered 0.42s delay and fading arrows between cards. Cards animate only when scrolled into view (IntersectionObserver, threshold 0.15).

**Landing page** (consumer):
- 😰 Peak hour 18:00 — €0.48/kWh, charging costs €3.60
- 🔍 Finds SmartPrice.be — free charge planner, no account needed
- 😮 Price drops to €0.04/kWh — same charge €0.30, save €200+/year

**Business page** (fleet managers):
- 😰 HR signs off €42,000/year — 50 EVs at flat CREG rate, no audit trail
- 🔍 Runs SmartPrice Fleet Audit — 2 min, free
- 😮 Overpaying €13,000/year — €260/EV overpayment + CIR 92 gap revealed

Both fully translated EN/NL/FR via i18n.js.

### Facebook Page auto-posting (2026-07-01)
SmartPrice.be Facebook Page (ID: 1278145935386175) connected to the daily posts endpoint.
- Graph API permanent Page Access Token obtained via 3-step OAuth flow
- `POST /{page-id}/feed` with Dutch EPEX post called from `daily-posts.js`
- Cloud agent fires daily at 06:00 UTC via Vercel proxy (Railway direct URL blocked)
- Response includes `{ facebook: { ok, post_id } }` for logging

### Outreach — Mercedes-Benz contact removed (2026-07-01)
Steve Vanslype (steve.vanslype@mercedes-benz.com) replied "unsubscribe" to the closing-the-loop email. Removed from `PRESET_CONTACTS` in `outreach-send.js`. Contact count: 24 → 23.

---

## June 2026

### Performance improvements (2026-06-25)

**Backend — history endpoint parallelization**
`/api/prices/history` rewrote sequential `await` in for-loop → `Promise.allSettled()` parallel fetch.
- Before: ~1,470ms for 7 days
- After: ~200ms (7× faster)
- Failed days are skipped gracefully; fulfilled days are included

**Frontend — Vite bundle splitting**
Added `manualChunks` to `vite.config.js`:
| Chunk | Size |
|---|---|
| index (main) | 251 KB (was 1,072 KB, −76%) |
| vendor (React/Recharts/D3) | 537 KB (separate, cached by browser) |
| page-business | 86 KB |
| page-seo | 204 KB |
| page-admin | 22 KB |

### Daily posts — hour deduplication fix (2026-06-22)
`/api/cheapest` returns 15-min slots, causing the same hour to appear multiple times in the post. Fixed with `Set`-based deduplication in `daily-posts.js`.

### Daily posts — cloud agent URL fix (2026-06-22)
Cloud agents (CCR) cannot reach Railway directly (network policy 403). Fixed by updating the routine to call `https://smartprice.be/api/admin/daily-posts` via Vercel proxy instead of the Railway URL.

### Invest in Antwerp outreach email drafted (2026-06-20)
Professional outreach email drafted to `invest@antwerp.be`. Covers: SmartPrice features, traction (110+ subscribers, 6 HACS installs), location (Berchem, Antwerp), asks for introductions/grants/advice.
File: `outreach/invest_antwerp_email.md`

### Telegram notification added to daily posts (2026-06-20)
Optional Telegram notification support added to `daily-posts.js`. Sends formatted Dutch post with cheapest hours to a Telegram chat. Not activated (no env vars set — Belgians don't use Telegram).

### Facebook Page created (2026-06-18)
SmartPrice.be Facebook Page created at facebook.com/profile.php?id=61591589255351.
- Meta Developer App created (App ID: 1649077839489787)
- Graph API Explorer used to obtain short-lived user token
- Token exchanged for 60-day long-lived token, then permanent Page Access Token
- `FACEBOOK_PAGE_ID` and `FACEBOOK_PAGE_TOKEN` added to Railway environment variables

### Business page polish — 4 fixes (2026-06-15)
Second review pass fixes applied to BusinessPage:
- Glossary section added before problem section (EPEX / CREG / CIR 92 plain-language definitions)
- Section divider labels translated
- Stats bar copy refined
- Modal form field labels corrected

### Business/Fleet Audit visibility fix (2026-06-14)
Business page and Fleet Audit tool were invisible to logged-in users. Root cause: routing logic in App.jsx checked auth state before page paths. Fixed conditional order.

### Outreach — fleet follow-up and closing emails (2026-06-14)
22 initial B2B fleet outreach emails sent via `/api/admin/send-outreach`. Templates added:
- Follow-up template (EN/NL/FR): "Did this reach the right person?"
- Closing-the-loop template: final check-in for non-responders
Scheduled cloud agent created for June 21 follow-up run.

### Fleet Audit nav + Session Calculator translations (2026-06-12)
- Fleet Audit logo nav restored
- Session Calculator got full NL/FR translations
- Session Calculator "Talk to SmartPrice Business" CTA fixed (wasn't capturing leads)

### HACS install tracking (2026-06-10)
Home Assistant instances ping `/api/hacs/ping` on startup. Stored in `hacs_pings` table. Visible in admin dashboard as a stat card.

---

## May 2026

### Session Calculator launched (`/session-calc`) (2026-05-28)
Per-session EPEX reimbursement calculator in two modes:
- **Reimburse mode**: date + hour + kWh → exact CIR 92-compliant reimbursement at EPEX price
- **Fleet card mode**: date + hour + kWh + card amount → shows overpayment vs EPEX per session

Coming-soon badges removed from Tool 1 (Fleet Card Invoice Checker) and Tool 6 (Per-Session Calculator).

### Fluvius P1 endpoint + waitlist (2026-05-20)
- `POST /api/fluvius/push` — receive P1 readings (power_w, solar_w, energy_kwh, gas_m3)
- `GET /api/fluvius/latest` — latest reading + EPEX price + charge signal
- Waitlist email template added for Fluvius status updates

### Fleet card track added to Business page (2026-05-15)
Two-model hero on BusinessPage: fleet energy cards (Velocity/DKV/UTA) + home-charging reimbursements. Fleet card invoice optimizer section added. Fleet ecosystem section with social secretariaten logos.

### Full EN/NL/FR translations — Business page (2026-05-12)
Complete translations added to i18n.js for business section: stats bar, problem section, ROI calculator, tools, security section, CTA.

### Newsletter opt-in flow (2026-05-08)
- `/api/newsletter/subscribe` and `/api/newsletter/unsubscribe` endpoints
- Weekly digest includes subscriber list; unsubscribe tokens in emails
- Admin stat card shows active/unsubscribed counts

### Daily social posts endpoint (2026-05-05)
`POST /api/admin/daily-posts` — generates Dutch + English EPEX posts from live price data.
Emails formatted copy-paste content to info@smartprice.be via Resend.

### B2B outreach admin endpoint (2026-05-01)
`POST /api/admin/send-outreach` — sends initial outreach or follow-up emails to preset fleet contacts. 24 verified Belgian leasing + OEM fleet contacts. EN/NL/FR templates via Resend.

---

## April 2026

### LandingPage v9 — enterprise-scale redesign
Full redesign: dark navy hero, dual B2C/B2B CTA, at-a-glance price snapshot, tools grid, dev API section, FAQ. Compressed to ~3 viewport heights above the fold.

### AuthPage redesign
Theme-aware, fully translated (EN/NL/FR), value proposition strip added.

### Dark/light theme + full translation coverage
- Theme-aware colors across all pages using ThemeContext
- All pages fully translated EN/NL/FR
- EU number formatting (Intl.NumberFormat with locale-specific separators)

### Belgian black/gold/red color palette
Experimental palette applied, then reverted to green (#22C55E / #16A34A) as primary brand color.

---

## March 2026

### Home Assistant HACS integration launched
`smartprice-ha/` — official HACS integration with 6 sensors (current price, cheapest hour, gas price, today min/avg/max). Published to HACS default store.

### Fleet Audit tool (`/fleet-audit`)
Free fleet-wide cost comparison: fleet size + km/month + billing method → annual overpayment vs live EPEX. PDF report generation. B2B lead capture.

### SmartPrice Business page (`/business`)
Initial B2B landing page: CIR 92 explainer, ROI calculator, audit modal, GDPR trust section. OG meta tags for LinkedIn sharing.

### GDPR unsubscribe
One-click email unsubscribe with `email_opt_out` flag in users table. Admin endpoint to manage opt-outs.
