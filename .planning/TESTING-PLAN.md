# DraggonnB OS -- Full Testing Plan

**Version:** 1.0 | **Date:** 2026-03-25
**Live URL:** https://draggonnb-platform.vercel.app
**PR Preview:** PR #9 branch `claude/affectionate-jepsen`

---

## How To Use This Plan

1. Work through each section top-to-bottom
2. Mark each test: PASS / FAIL / BLOCKED (with reason)
3. For any FAIL: note the issue, screenshot if visual, and we fix it together
4. After fixing, re-test that item before moving on

---

## PHASE 1: PUBLIC SITE (No Login Required)

### 1.1 Landing Page -- Visual Check

| # | Test | Expected | Status |
|---|------|----------|--------|
| 1.1.1 | Navigate to root URL `/` | Page loads, no errors | |
| 1.1.2 | **Nav bar** -- dark slate (#2D2F33) background, logo visible, "DRAGGON NB" text | White + burgundy text on dark bg | |
| 1.1.3 | **Nav links** -- Platform, Solutions, Pricing, Contact visible | Warm grey (#A8A9AD) text, hover to white | |
| 1.1.4 | **Nav CTA** -- "Get Started" button | Burgundy (#6B1420) button, white text | |
| 1.1.5 | **Hero section** -- dark background with subtle gradients | Dark Slate bg, white heading, gradient text on highlight | |
| 1.1.6 | **Hero CTAs** -- primary burgundy button + secondary outline button | Both clickable, correct colors | |
| 1.1.7 | **Module Showcase** -- white/light background | Cards with shadow, burgundy icons, clean text | |
| 1.1.8 | **How It Works** -- light grey background | 3 steps with burgundy numbers, charcoal text | |
| 1.1.9 | **Industry Solutions** -- white background | Cards with burgundy icon containers | |
| 1.1.10 | **Social Proof** -- dark contrast strip | Glassmorphism cards on dark bg | |
| 1.1.11 | **Pricing Preview** -- light grey background | White cards, burgundy "Popular" badge | |
| 1.1.12 | **CTA Section** -- burgundy gradient | White text, white CTA button | |
| 1.1.13 | **Footer** -- dark slate background | Warm grey links, logo visible | |
| 1.1.14 | **Mobile responsive** -- resize to 375px width | All sections stack properly, nav hamburger works | |
| 1.1.15 | **No console errors** -- open browser DevTools | Zero JS errors in console | |

### 1.2 Pricing Page

| # | Test | Expected | Status |
|---|------|----------|--------|
| 1.2.1 | Navigate to `/pricing` | Page loads with tier cards | |
| 1.2.2 | Three tiers visible: Starter (R1,500), Growth (R3,500), Enterprise (R7,500) | Correct ZAR prices | |
| 1.2.3 | "Popular" badge on Growth tier | Burgundy badge, burgundy border | |
| 1.2.4 | Annual toggle works | Prices update (10% discount) | |
| 1.2.5 | Feature comparison matrix visible | Check icons in burgundy | |
| 1.2.6 | CTA buttons on each tier | Clickable, correct routing | |

### 1.3 Qualify Page (Lead Capture)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 1.3.1 | Navigate to `/qualify` | Form loads | |
| 1.3.2 | All form fields present: name, email, phone, business type, message | Labels in charcoal, borders in silver | |
| 1.3.3 | Submit empty form | Validation errors shown | |
| 1.3.4 | Fill and submit valid data | Success state displayed | |
| 1.3.5 | Check Supabase `leads` table | New lead row created | |

### 1.4 Auth Pages

| # | Test | Expected | Status |
|---|------|----------|--------|
| 1.4.1 | Navigate to `/login` | Login form loads | |
| 1.4.2 | Navigate to `/signup` | Signup form loads | |
| 1.4.3 | Navigate to `/forgot-password` | Password reset form loads | |
| 1.4.4 | Invalid login credentials | Error message shown, no crash | |
| 1.4.5 | Sign up with test email | Confirmation email sent via Resend | |
| 1.4.6 | Login with valid credentials | Redirects to `/dashboard` | |

---

## PHASE 2: DASHBOARD (Login Required)

**Pre-requisite:** Log in with a valid account

### 2.1 Dashboard Home

| # | Test | Expected | Status |
|---|------|----------|--------|
| 2.1.1 | Navigate to `/dashboard` | Dashboard loads with KPI cards | |
| 2.1.2 | Sidebar visible with module links | All enabled modules shown | |
| 2.1.3 | User name displayed | Correct name from user_profiles | |
| 2.1.4 | KPI cards render (contacts, deals, revenue) | Numbers or zero-state, no errors | |
| 2.1.5 | Recent activity feed | Shows recent items or empty state | |

### 2.2 CRM Module

| # | Test | Expected | Status |
|---|------|----------|--------|
| 2.2.1 | Navigate to `/crm` | CRM overview loads | |
| 2.2.2 | `/crm/contacts` -- contacts list | Table renders (empty or with data) | |
| 2.2.3 | Add new contact | Form opens, saves to Supabase | |
| 2.2.4 | `/crm/companies` -- companies list | Table renders | |
| 2.2.5 | `/crm/deals` -- deals pipeline | Pipeline view renders | |
| 2.2.6 | Create new deal | Form saves, appears in pipeline | |

### 2.3 Email Module

| # | Test | Expected | Status |
|---|------|----------|--------|
| 2.3.1 | Navigate to `/email` | Email overview loads | |
| 2.3.2 | `/email/campaigns` -- campaigns list | Table renders | |
| 2.3.3 | `/email/campaigns/new` -- create campaign | Editor loads | |
| 2.3.4 | `/email/templates` -- template list | Templates shown | |
| 2.3.5 | `/email/templates/editor` -- template editor | Visual editor loads | |
| 2.3.6 | `/email/sequences` -- sequences list | Table renders | |
| 2.3.7 | `/email/analytics` -- email analytics | Charts or empty state | |
| 2.3.8 | `/email/outreach` -- outreach page | Page loads | |

### 2.4 Content Generator

| # | Test | Expected | Status |
|---|------|----------|--------|
| 2.4.1 | Navigate to `/content-generator` | Content studio loads | |
| 2.4.2 | `/content-generator/email` -- email generator | AI form loads | |
| 2.4.3 | `/content-generator/social` -- social generator | Platform selector + form | |
| 2.4.4 | Generate test content | AI returns content (needs ANTHROPIC_API_KEY) | |

### 2.5 Autopilot (AI Agents)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 2.5.1 | Navigate to `/autopilot` | Autopilot dashboard loads | |
| 2.5.2 | `/autopilot/settings` -- agent settings | Config form loads | |
| 2.5.3 | Chat interface works | Can send message (needs API key) | |

### 2.6 Accommodation Module

| # | Test | Expected | Status |
|---|------|----------|--------|
| 2.6.1 | Navigate to `/accommodation` | Accommodation overview loads | |
| 2.6.2 | `/accommodation/properties` -- property list | Table renders | |
| 2.6.3 | `/accommodation/bookings` -- bookings list | Table renders | |
| 2.6.4 | `/accommodation/calendar` -- calendar view | Calendar component loads | |
| 2.6.5 | `/accommodation/guests` -- guest list | Table renders | |
| 2.6.6 | `/accommodation/inquiries` -- inquiry list | Table renders | |
| 2.6.7 | `/accommodation/stock` -- stock management | Stock items shown | |
| 2.6.8 | `/accommodation/costs` -- cost tracking | Cost dashboard loads | |
| 2.6.9 | `/accommodation/channels` -- channel sync | Channel config page loads | |
| 2.6.10 | `/accommodation/operations` -- ops dashboard | Operations view loads | |
| 2.6.11 | `/accommodation/automation` -- automation rules | Rules config loads | |

### 2.7 Billing

| # | Test | Expected | Status |
|---|------|----------|--------|
| 2.7.1 | Navigate to `/billing` | Billing page loads | |
| 2.7.2 | Current plan displayed | Tier name and price shown | |
| 2.7.3 | PayFast checkout link | Generates valid PayFast URL | |

### 2.8 Onboarding

| # | Test | Expected | Status |
|---|------|----------|--------|
| 2.8.1 | Navigate to `/onboarding` | Onboarding wizard loads | |
| 2.8.2 | `/onboarding/meta` -- Meta integration setup | WhatsApp/FB config page | |

---

## PHASE 3: ADMIN PANEL (Admin Role Required)

### 3.1 Admin Pages

| # | Test | Expected | Status |
|---|------|----------|--------|
| 3.1.1 | Admin section visible in sidebar | Suite, Clients, Modules, Pricing links | |
| 3.1.2 | `/admin/suite` -- business suite dashboard | KPI cards, activity feed, quick actions | |
| 3.1.3 | `/admin/clients` -- client management | Client table with tier/status badges | |
| 3.1.4 | `/admin/modules` -- module registry | Module cards + per-client activation table | |
| 3.1.5 | `/admin/pricing` -- pricing matrix | Tier cards (R1,500/R3,500/R7,500) + feature matrix | |
| 3.1.6 | `/admin/integrations` -- integrations page | Integration config loads | |
| 3.1.7 | Toggle module for a client | API call succeeds, UI updates | |

### 3.2 Admin APIs

| # | Test | Expected | Status |
|---|------|----------|--------|
| 3.2.1 | `GET /api/admin/clients` | Returns org list with counts | |
| 3.2.2 | `GET /api/admin/modules` | Returns module registry + activations | |
| 3.2.3 | `PUT /api/admin/modules/{orgId}` | Toggles module, returns updated state | |
| 3.2.4 | Non-admin user accessing admin routes | 403 Forbidden | |

---

## PHASE 4: API ENDPOINTS (Key Flows)

### 4.1 Lead Flow

| # | Test | Expected | Status |
|---|------|----------|--------|
| 4.1.1 | `POST /api/leads/capture` with valid data | 200, lead created in DB | |
| 4.1.2 | `POST /api/leads/{id}/qualify` | Lead qualified, score assigned | |
| 4.1.3 | `POST /api/leads/{id}/proposal` | Proposal generated | |
| 4.1.4 | `POST /api/leads/{id}/approve` | Lead approved, org provisioned | |

### 4.2 External API (M2M)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 4.2.1 | `GET /api/external/health` with valid Bearer token | 200, health check passes | |
| 4.2.2 | `GET /api/external/crm/contacts` with valid Bearer token | 200, contacts returned | |
| 4.2.3 | Request without Bearer token | 401 Unauthorized | |
| 4.2.4 | Request with invalid token | 401 Invalid API key | |

### 4.3 Webhooks

| # | Test | Expected | Status |
|---|------|----------|--------|
| 4.3.1 | `POST /api/webhooks/payfast` | PayFast ITN processed | |
| 4.3.2 | `POST /api/webhooks/whatsapp` | WhatsApp message received | |
| 4.3.3 | `POST /api/webhooks/telegram` | Telegram command processed | |
| 4.3.4 | `POST /api/webhooks/n8n/test` | N8N test webhook responds | |

### 4.4 Payments

| # | Test | Expected | Status |
|---|------|----------|--------|
| 4.4.1 | `POST /api/payments/checkout` | PayFast checkout URL generated | |
| 4.4.2 | PayFast sandbox test payment | Payment recorded in DB | |
| 4.4.3 | Guest portal payment link | `/guest/{bookingId}` loads payment page | |

---

## PHASE 5: INTEGRATION CHECKS

### 5.1 Supabase

| # | Test | Expected | Status |
|---|------|----------|--------|
| 5.1.1 | Auth signup creates user | User in auth.users | |
| 5.1.2 | Auto-record creation | organization_users + user_profiles created | |
| 5.1.3 | RLS isolation | User A cannot see User B's data | |
| 5.1.4 | Service role bypasses RLS | Admin client reads all orgs | |

### 5.2 N8N Workflows

| # | Test | Expected | Status |
|---|------|----------|--------|
| 5.2.1 | Access N8N at `https://n8n.srv1114684.hstgr.cloud` | N8N UI loads | |
| 5.2.2 | All 20 workflows show as active | Green status indicators | |
| 5.2.3 | Analytics Collector cron fires | Check execution history | |
| 5.2.4 | Content Queue Processor triggers | Test with manual trigger | |
| 5.2.5 | Billing Monitor runs | Check execution history | |

### 5.3 Resend (Email)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 5.3.1 | Send test email via `/api/email/send` | Email delivered | |
| 5.3.2 | Email tracking pixel fires | Open tracked in analytics | |
| 5.3.3 | Email template renders correctly | Brand colors, logo, layout | |

### 5.4 PayFast

| # | Test | Expected | Status |
|---|------|----------|--------|
| 5.4.1 | Merchant ID is 32705333 in Vercel env | Confirmed via Vercel dashboard | |
| 5.4.2 | Checkout generates valid PayFast URL | URL contains correct merchant_id | |
| 5.4.3 | ITN webhook receives payment confirmation | Payment status updated in DB | |

### 5.5 Social Auth

| # | Test | Expected | Status |
|---|------|----------|--------|
| 5.5.1 | Facebook OAuth flow | `/api/auth/social/facebook` redirects to FB | |
| 5.5.2 | LinkedIn OAuth flow | `/api/auth/social/linkedin` redirects to LI | |
| 5.5.3 | Callback handles token exchange | Accounts saved in social_accounts | |

---

## PHASE 6: GUEST-FACING PAGES

| # | Test | Expected | Status |
|---|------|----------|--------|
| 6.1 | `/guest/{bookingId}` -- guest portal | Booking details shown (no login needed) | |
| 6.2 | `/checkout` -- checkout page | Payment form loads | |
| 6.3 | `/payment/success` -- payment confirmation | Success message shown | |
| 6.4 | `/embed/social` -- embeddable social widget | Widget renders in iframe | |

---

## PHASE 7: CROSS-CUTTING CONCERNS

### 7.1 Security

| # | Test | Expected | Status |
|---|------|----------|--------|
| 7.1.1 | Unauthenticated access to `/dashboard` | Redirects to `/login` | |
| 7.1.2 | Authenticated user at `/login` | Redirects to `/dashboard` | |
| 7.1.3 | Module gating -- access disabled module route | Redirects to `/dashboard` | |
| 7.1.4 | API rate limiting | Returns 429 after threshold | |
| 7.1.5 | CSRF protection | Forms include CSRF tokens | |

### 7.2 Performance

| # | Test | Expected | Status |
|---|------|----------|--------|
| 7.2.1 | Landing page load time | Under 3 seconds | |
| 7.2.2 | Dashboard first paint | Under 2 seconds | |
| 7.2.3 | No layout shift (CLS) | CLS score < 0.1 | |
| 7.2.4 | Images optimized | Next/Image used, WebP served | |

### 7.3 Mobile Responsiveness

| # | Test | Expected | Status |
|---|------|----------|--------|
| 7.3.1 | Landing page on mobile (375px) | No horizontal scroll, stacked layout | |
| 7.3.2 | Dashboard on tablet (768px) | Sidebar collapses, content fills | |
| 7.3.3 | Forms on mobile | Inputs full width, keyboard doesn't obscure | |
| 7.3.4 | Tables on mobile | Horizontal scroll or card view | |

---

## Issue Tracking

| Issue # | Phase | Test # | Description | Severity | Fix Status |
|---------|-------|--------|-------------|----------|------------|
| | | | | | |

---

## Testing Credentials

**Test Account:** (create one at `/signup` or use existing)
- Email: _______________
- Password: _______________

**Admin Account:** (needs admin role in organization_users)
- Email: _______________
- Password: _______________

**N8N Dashboard:** https://n8n.srv1114684.hstgr.cloud
**Supabase Dashboard:** https://supabase.com/dashboard/project/psqfgzbjbgqrmjskdavs
**Vercel Dashboard:** https://vercel.com/draggonn-b/draggonnb-platform

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Tester | | | |
| Developer | Claude Code | 2026-03-25 | Auto-generated |
| Approval | Chris Terblanche | | |
