# Requirements -- DraggonnB OS

## Security & Infrastructure

- [x] **SEC-01**: Supabase RLS policies enabled on all tables -- users can only read/write data belonging to their organization
- [x] **SEC-02**: Auth links users to organizations via `organization_users` junction table -- all org-scoped queries work
- [x] **SEC-03**: Auth middleware protects all dashboard routes -- unauthenticated users get inline error states (no redirect loops)
- [x] **SEC-04**: Admin Supabase client using service role key exists for webhook handlers and RLS bypass
- [x] **SEC-05**: Setup API has no hardcoded default secret -- fails if `SETUP_SECRET` env var not set
- [x] **SEC-06**: Email unsubscribe tokens signed with HMAC -- cannot be forged
- [x] **SEC-07**: Email click tracking validates redirect URLs -- rejects non-http(s) schemes
- [ ] **SEC-08**: PayFast passphrase required when `PAYFAST_MODE=production` -- needs production passphrase configured
- [x] **SEC-09**: Environment variable names aligned between `.env.example` and codebase
- [x] **SEC-10**: Supabase service role key rotated after accidental exposure (2026-03-05)
- [x] **SEC-11**: Provisioning API restricted to platform_admin role only

## Authentication

- [x] **AUTH-01**: User can create account with email and password
- [x] **AUTH-02**: User can log in and stay logged in across sessions via cookie
- [x] **AUTH-03**: User can request password reset via email
- [x] **AUTH-04**: User can reset password with email link
- [x] **AUTH-05**: Auth session refreshed automatically on every request via middleware
- [x] **AUTH-06**: OAuth callback handler for social login (scaffolded, needs credentials)
- [x] **AUTH-07**: `getUserOrg()` auto-creates missing user/org records via admin client
- [x] **AUTH-08**: Protected pages render inline error states (never redirect to /login)

## CRM Module

- [x] **CRM-01**: User can create, view, edit, and delete contacts with search/filter
- [x] **CRM-02**: User can create, view, edit, and delete companies
- [x] **CRM-03**: User can create, view, edit, and delete deals with pipeline view
- [x] **CRM-04**: All CRM data scoped by organization_id
- [x] **CRM-05**: External CRM API with M2M auth and scope guards

## Email Module

- [x] **EMAIL-01**: User can create and manage email templates with variable substitution
- [x] **EMAIL-02**: User can create and manage email campaigns
- [x] **EMAIL-03**: User can create and manage email sequences with steps
- [x] **EMAIL-04**: Email tracking (opens via pixel, clicks via link wrapping) scaffolded
- [x] **EMAIL-05**: Per-tier email usage limits enforced
- [ ] **EMAIL-06**: Resend API configured and emails actually send -- needs API key
- [x] **EMAIL-07**: External email sequence enrollment endpoint with M2M auth

## Payments

- [x] **PAY-01**: Pricing page displays 3 tiers (Starter R1,500, Pro R3,500, Enterprise R7,500)
- [x] **PAY-02**: Checkout flow submits PayFast subscription form
- [x] **PAY-03**: PayFast ITN webhook validates signature, verifies with server, checks amount
- [x] **PAY-04**: Successful payment updates organization subscription status and logs transaction
- [x] **PAY-05**: PayFast webhook uses admin Supabase client for RLS bypass
- [ ] **PAY-06**: PayFast production passphrase configured -- currently sandbox only

## Dashboard & Analytics

- [x] **DASH-01**: Dashboard page with stat cards and charts
- [x] **DASH-02**: Sidebar navigation with all module links
- [x] **DASH-03**: Dashboard queries Supabase for real data (with fallback empty states)
- [x] **DASH-04**: Pipeline chart component with Recharts

## Landing Page & Public UI

- [x] **LP-01**: Pricing page with 3 tiers and checkout buttons
- [x] **LP-02**: Marketing landing page with value proposition, features section, and CTA
- [x] **LP-03**: Light theme with dark CTA section for contrast

## Accommodation Module

- [x] **ACCOM-01**: Properties CRUD with multi-unit support
- [x] **ACCOM-02**: Units CRUD with amenities, capacity, pricing
- [x] **ACCOM-03**: Bookings CRUD with status workflow (inquiry -> confirmed -> checked_in -> checked_out)
- [x] **ACCOM-04**: Guest management with contact details and booking history
- [x] **ACCOM-05**: Rate management with seasonal pricing and unit-specific rates
- [x] **ACCOM-06**: Availability calendar with date range queries
- [x] **ACCOM-07**: Inquiry management with conversion tracking
- [x] **ACCOM-08**: Booking detail page with guest info, financial summary, status actions
- [x] **ACCOM-09**: Guest portal with access pack system (booking details for guests)
- [x] **ACCOM-10**: Channel manager with iCal feed management for Booking.com/Airbnb/VRBO

## Accommodation Automation

- [x] **AUTO-01**: Event dispatcher (`emitBookingEvent()`) triggers automation on booking status changes
- [x] **AUTO-02**: Automation rules CRUD with enable/disable toggle
- [x] **AUTO-03**: Message queue with retry/cancel and multi-channel sending (email, SMS, WhatsApp)
- [x] **AUTO-04**: Communications log with expandable message rows
- [x] **AUTO-05**: PayFast link generation for per-booking payments
- [x] **AUTO-06**: Payment tracking with financial snapshots
- [x] **AUTO-07**: Telegram ops bot for staff notifications and task assignments
- [x] **AUTO-08**: 4 AI agents: QuoterAgent, ConciergeAgent, ReviewerAgent, PricerAgent
- [x] **AUTO-09**: Per-unit cost tracking with stock inventory management
- [x] **AUTO-10**: Profitability reports with margin calculations
- [x] **AUTO-11**: Stock items with low/in-stock/overstocked badges and movement tracking
- [ ] **AUTO-12**: N8N workflows configured and active (17 templates exist, need activation)
- [ ] **AUTO-13**: Telegram ops bot webhook configured with channel setup
- [ ] **AUTO-14**: PayFast link generator wired to existing webhook handler

## AI & Agents

- [x] **AI-01**: BaseAgent pattern with session tracking and Claude API integration
- [x] **AI-02**: LeadQualifierAgent for lead scoring
- [x] **AI-03**: ProposalGeneratorAgent for content generation
- [x] **AI-04**: Autopilot UI with agent management
- [x] **AI-05**: 4 accommodation-specific agents (quoter, concierge, reviewer, pricer)

## Content & Social

- [x] **CONTENT-01**: AI content generation via N8N webhook integration
- [x] **CONTENT-02**: Content queue for scheduled publishing
- [x] **SOCIAL-01**: Social account management UI scaffolded
- [ ] **SOCIAL-02**: Facebook/Instagram Graph API connected -- needs OAuth credentials
- [ ] **SOCIAL-03**: LinkedIn API connected -- needs OAuth credentials

## Provisioning

- [x] **PROV-01**: 9-step saga orchestrator with rollback support
- [x] **PROV-02**: Organization row creation in shared DB
- [x] **PROV-03**: Module activation via tenant_modules table
- [x] **PROV-04**: DB-backed module registry (module_registry table)
- [x] **PROV-05**: Provisioning API restricted to platform_admin role
- [x] **PROV-06**: QA checks validate org records and module activation
- [ ] **PROV-07**: First end-to-end provisioning test with real client config
- [ ] **PROV-08**: N8N webhooks configured per client (step exists, needs N8N setup)

## Testing

- [x] **TEST-01**: 241 Vitest tests (unit, integration, component)
- [x] **TEST-02**: PayFast signature validation tests
- [x] **TEST-03**: Auth middleware and user/org auto-creation tests
- [x] **TEST-04**: CRM API route tests
- [x] **TEST-05**: Dashboard data flow integration tests
- [x] **TEST-06**: Component render tests (dashboard, CRM, autopilot, sidebar)

## External Integrations

- [x] **EXT-01**: External CRM contacts API with M2M auth
- [x] **EXT-02**: External CRM companies API with M2M auth
- [x] **EXT-03**: External email sequence enrollment API
- [x] **EXT-04**: Scope guard utility for API key permission checking
- [x] **EXT-05**: Embed route group with social page and CSP headers
- [x] **EXT-06**: Webhook dispatch wired into CRM contact routes

---

## v2 Requirements (Deferred)

- Dark mode UI
- White-label branding for Enterprise tier
- WhatsApp Business integration (Meta Cloud API)
- Voice AI agents
- Admin panel (manage via Supabase dashboard for now)
- Advanced ML-driven analytics
- Mobile native apps (responsive web sufficient)
- Multi-language support (English only for SA market)
- CI/CD pipeline (manual Vercel deploys for now)
- SEO optimization module
- Error tracking (Sentry or similar)
- Rate limiting on public endpoints

## Out of Scope

- Stripe/international payments -- PayFast is SA market requirement
- Custom domains per client -- Vercel subdomains sufficient for v1
- Multi-currency -- ZAR only
- Self-hosted Supabase -- using Supabase Cloud
- Autonomous sub-agents per client -- deferred until 20+ clients

---
*Last updated: 2026-03-13 after Session 36 comprehensive audit*
