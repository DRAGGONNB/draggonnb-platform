# DraggonnB OS -- AI-Powered Business Operating System

## What This Is

A production-deployed multi-tenant B2B operating system targeting South African SMEs. DraggonnB OS provides CRM, email marketing, AI content generation, social media automation, accommodation management with full AI automation, AI agents, analytics, and payments -- all in one platform. All clients share a single Supabase project with RLS-based tenant isolation. Each client gets a subdomain on *.draggonnb.co.za with DB-backed module gating.

## Core Value

**A complete, working multi-tenant business automation platform where new clients are provisioned with a database row, a subdomain, and activated modules -- live in under an hour.** Every module works: CRM, email, content, payments, dashboard, accommodation (with AI automation, guest portal, channel manager, cost tracking), AI agents.

## Architecture

- **Multi-tenant:** Shared Supabase DB with RLS policies using `get_user_org_id()` (STABLE, cached per-query)
- **Auth model:** `organization_users` junction table links auth users to `organizations`. `user_profiles` for display info. `getUserOrg()` in `lib/auth/get-user-org.ts` is the central auth function (used by 19+ files)
- **Routing:** Wildcard DNS on `*.draggonnb.co.za`, middleware resolves tenant from subdomain, injects `x-tenant-id`/`x-tenant-tier`/`x-tenant-modules` headers
- **Module gating:** `module_registry` (global catalog) + `tenant_modules` (per-tenant activation) tables
- **Provisioning:** 9-step saga: create-org -> create-admin -> assign-subdomain -> seed-data -> n8n-webhooks -> deploy-automations -> onboarding-sequence -> qa-checks -> configure-billing. Rollback cascades via `DELETE FROM organizations WHERE id = ...`
- **AI ops:** N8N for deterministic automation, Claude API via BaseAgent for intelligent ops, build-time Claude Code
- **Event-driven automation:** `emitBookingEvent()` dispatcher triggers automation rules, guest messages, staff notifications, and auto-cost entries on booking status changes

## Tech Stack

- Next.js 14.2.33 App Router, TypeScript, Tailwind CSS, shadcn/ui
- Supabase (DB + Auth), Resend (email), PayFast (payments), N8N (workflows)
- Vercel (hosting), GitHub (code), Gitea (state docs)
- Recharts (charts), Lucide React (icons)

## Brand Identity

- **Primary:** Brand Crimson (HSL 348, 75%, 42%) -- buttons, active states, accents
- **Secondary:** Brand Charcoal (HSL 220) -- text, dark elements, secondary accents
- **Theme:** Light (white/gray-50 backgrounds, crimson accents)
- **Logo:** Charcoal + crimson split icon with "DRAGGONNB Operating System" text
- **Landing page:** Light theme with dark CTA section for contrast

## Platform Scale

| Metric | Count |
|--------|-------|
| DB tables (Supabase) | 84 |
| API routes | 162 |
| UI modules/pages | 16+ |
| Library modules | 21 |
| Components | 54 |
| N8N workflow templates | 17 |
| AI agents | 4 |
| Vitest tests | 241 |
| Provisioning steps | 9 |
| Supabase migrations | 14 |

## Modules

| Module | Status | Tier | Routes | Key Features |
|--------|--------|------|--------|--------------|
| CRM (contacts, companies, deals) | Complete | Core | 6 | Pipeline view, search/filter, org-scoped |
| Email Marketing (campaigns, sequences, templates) | Complete | Core | 14 | Variable substitution, tracking, batch send |
| Content Studio (AI generation) | Complete | Core | 5 | N8N-powered AI content generation |
| Social Media (scheduling, publishing) | Complete | Growth | 4 | Facebook/LinkedIn/Instagram scheduling |
| Accommodation | Complete | Growth | 102 | Properties, units, bookings, guests, rates, availability, inquiries, guest portal, channel manager, automation, payments, stock, costs, agents |
| AI Agents (Autopilot, workflows, settings) | Complete | Scale | 4 | BaseAgent pattern, session tracking |
| Analytics (dashboard stats, pipeline charts) | Complete | Core | 2 | Stat cards, Recharts pipeline chart |
| Payments (PayFast, 3 tiers) | Complete | Core | 1 | R1,500/R3,500/R7,500 tiers, ITN webhook |
| Leads (capture, scoring) | Complete | Core | 4 | Lead qualification, scoring |
| Webhooks (PayFast, N8N, Resend) | Complete | Core | 5 | ITN validation, signature verification |
| External APIs (CRM, email sequences) | Complete | Core | 5 | M2M auth, scope guards |
| Ops (health, metrics) | Complete | Core | 2 | Platform health monitoring |

### Accommodation Automation Layer (Complete)

| Phase | Scope | Key Components |
|-------|-------|----------------|
| 1: Guest Comms | Event dispatcher + message queue + multi-channel sending | `emitBookingEvent()`, automation rules, template system |
| 2: Payments | PayFast link generation + payment tracking + financial snapshots | Per-booking payment links, reconciliation |
| 3: Staff Ops | Telegram ops bot + task assignments + department channels | Real-time staff notifications |
| 4: AI Agents | 4 agents extending BaseAgent | QuoterAgent, ConciergeAgent, ReviewerAgent, PricerAgent |
| 5: Costing | Per-unit cost tracking + stock inventory + profitability reports | Auto-cost on booking events |

### Accommodation UI Pages (Complete)

- Properties list + management
- Units list + management
- Bookings list + detail view (with guest info, financial summary, status actions)
- Guests list
- Rates management
- Availability calendar
- Inquiries
- Automation Hub (rules, message queue, comms log)
- Stock & Inventory (items, movements)
- Cost Tracking & Profitability (summary, unit costs, margins)
- Channel Manager (iCal feeds for Booking.com/Airbnb/VRBO)
- Guest Portal (access pack with booking details)

## API Route Breakdown

| Category | Routes | Path Prefix |
|----------|--------|-------------|
| Accommodation (base) | 56 | /api/accommodation/* |
| Accommodation (automation) | 46 | /api/accommodation/automation/*, agents/*, payments/*, ops/* |
| Email | 14 | /api/email/* |
| CRM | 6 | /api/crm/* |
| Webhooks | 5 | /api/webhooks/* |
| External | 5 | /api/external/* |
| Content | 5 | /api/content/* |
| Auth | 5 | /api/auth/* |
| Social | 4 | /api/social/* |
| Leads | 4 | /api/leads/* |
| Autopilot | 4 | /api/autopilot/* |
| Ops | 2 | /api/ops/* |
| Guest Portal | 2 | /api/guest-portal/* |
| Embed | 2 | /api/embed/* |
| Payments | 1 | /api/payments/* |
| Provisioning | 1 | /api/provisioning/* |
| Setup | 1 | /api/setup/* |

## Infrastructure

- **Supabase project:** `psqfgzbjbgqrmjskdavs`
- **Vercel:** `draggonnb-mvp` auto-deploys from main
- **N8N:** draggonn-b.app.n8n.cloud (migrating to self-hosted on VPS)
- **VPS:** Hostinger with SSH access (`ssh hostinger-vps`)
- **Gitea:** git.draggonnb.online:3030 (state docs)
- **GitHub:** DRAGGONNB/draggonnb-platform

## Missing Credentials

- Resend API key (email delivery)
- Facebook/Instagram OAuth credentials (social publishing)
- LinkedIn OAuth credentials (social publishing)
- PayFast production passphrase (live payments)

## Completion Status

- v1 Roadmap: 7/7 phases complete
- v2 BOS: Phases A-E complete
- Architecture restructure: Shared DB + RLS migration complete
- UI Rebrand: Complete
- Accommodation module: Complete (base + automation + UI)
- **Next milestone:** First end-to-end client provisioning test

## Constraints

- **Tech stack:** Next.js 14, Supabase, TailwindCSS, TypeScript -- locked
- **Payment:** PayFast only (SA market requirement)
- **Currency:** ZAR (South African Rand)
- **Hosting:** Vercel for app, Hostinger VPS for N8N
- **Compliance:** POPI Act (SA data protection) -- RLS-based tenant isolation
- **AI:** Claude API via N8N workflows + BaseAgent for per-call ops

---
*Last updated: 2026-03-13 after Session 36 comprehensive audit*
