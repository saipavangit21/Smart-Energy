# SmartPrice.be — Document Update Brief
**Date:** April 2026 | Apply to: Technical Documentation, Runbook, Knowledge Base, Investor Document

---

## 1. AUTHENTICATION — BREAKING CHANGE

**Old:** Email was optional. Registration only required name + password.  
**New:** Email is required at registration. It is used for login (no username).  
**Removed:** itsme button, "No email required" footer text, guest mode.

Update everywhere that says "email is optional" or "name + password".

---

## 2. NEW FEATURES

### Email Lead Capture
- Landing page has a widget that captures visitor emails before sign-up
- Stored in a `leads` table in PostgreSQL (separate from user accounts)
- Admin can view leads at `GET /api/admin/leads`

### AI Assistant
- Claude Haiku-powered chat (`POST /api/agent/chat`)
- Answers energy-related questions
- Requires `ANTHROPIC_API_KEY` env var on Railway
- Gracefully returns 503 if key not set, 402 if credits depleted

### EV Charge Planner
- Live on the landing page (no login required)
- Shows all 23 upcoming hours ranked cheapest to most expensive
- Helps users decide when to plug in their EV

### Social Sharing & Referrals
- Share buttons on: landing page footer, dashboard nav, EV station cards
- Personalised referral link per user on EV stations page

### Solar Toggle + Capacity Tariff
- Solar generation toggle on dashboard
- Fluvius capacity tariff teaser added

### Supplier Compare Page
- New `SupplierCompare.jsx` page for side-by-side comparison

---

## 3. NEW API ENDPOINTS

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/prices/history` | Historical EPEX prices |
| GET | `/api/status-banner` | Site-wide banner (currently inactive) |
| GET | `/api/user/dashboard` | Personalised dashboard (JWT) |
| POST | `/api/leads` | Lead capture (public) |
| GET | `/api/admin/leads` | Admin leads list |
| POST | `/api/agent/chat` | AI assistant |
| POST | `/auth/exchange` | OAuth token exchange |
| POST | `/auth/logout` | Invalidate refresh token |
| PUT | `/auth/profile` | Update display name |
| PUT | `/auth/change-password` | Change password |

---

## 4. NEW ENVIRONMENT VARIABLE

```
ANTHROPIC_API_KEY=...    # Claude Haiku for AI assistant (Railway)
```

---

## 5. DNS / INFRASTRUCTURE

**SPF Records Fix (Cloudflare):**  
The two duplicate SPF TXT records on `smartprice.be` must be merged into one:

```
v=spf1 a mx include:spf.cloudemail.be include:_spf.mx.cloudflare.net -all
```

Multiple SPF records = `permerror` = email authentication fails.

---

## 6. REMOVED / DEPRECATED

| Item | Status |
|------|--------|
| Guest mode | Removed — landing page is the free experience |
| itsme login button | Removed |
| Username-based login | Removed — email-only now |
| "No email required" messaging | Removed |

---

## 7. INVESTOR DOCUMENT ADDITIONS

- **Lead capture funnel** in place — landing page collects emails before sign-up
- **Referral system** live — each user has a shareable referral link
- **AI assistant** differentiates from static competitor sites
- **Public API** used by Home Assistant community — growing distribution channel
- **Calculator covers electricity + gas** — full household energy spend in one tool
