# DraggonnB CRMM -- Base SaaS Template

## What This Is

A production-ready B2B automation SaaS platform targeting South African SMEs. DraggonnB CRMM (Client Relationship & Marketing Management) is the **base template** that every new client gets -- CRM, email marketing, AI content generation, social media automation, analytics, payments, and billing -- all in one platform. Each client gets an isolated deployment (separate Supabase project, GitHub repo, Vercel deployment) with client-specific customizations built on top of this base.

## Core Value

**A complete, working end-to-end business automation platform that can be cloned and deployed for a new client within 48-72 hours.** Every module must work -- CRM, email, content, payments, billing, dashboard -- because this is the foundation every client deployment inherits.

## Requirements

### Validated

- ✓ Next.js 14 App Router with TypeScript
- ✓ Supabase Auth (login, signup, password reset, session management)
- ✓ Multi-tenant architecture with organization_id isolation
- ✓ CRM module: contacts, deals pipeline, companies CRUD with search/filter
- ✓ Email module: campaign management, templates, sequences, batch send via Resend
- ✓ PayFast integration: checkout flow with 3 tiers (R1,500/R3,500/R7,500)
- ✓ PayFast ITN webhook with 3-step validation
- ✓ Dashboard with real data (contact counts, deal values, email stats)
- ✓ Sidebar navigation and dashboard layout
- ✓ shadcn/ui component library (32+ components)
- ✓ Middleware auth session refresh with route protection
- ✓ Vercel deployment with auto-deploy from GitHub
- ✓ N8N webhook client code (content gen, analytics, provisioning)
- ✓ Marketing landing page with pricing
- ✓ Social media integration (Facebook/Instagram, LinkedIn) OAuth + publishing
- ✓ Client provisioning pipeline (9 steps: Supabase, DB, GitHub, Vercel, N8N, automations, onboarding, QA, billing)
- ✓ Test framework (Vitest) with PayFast, auth, and CRM tests
- ✓ Event-sourced usage metering (usage_events table)
- ✓ DB-driven billing plans (billing_plans + plan_limits)
- ✓ Bolt-on credit system (credit_packs, tenant_credits, FIFO deduction)
- ✓ Usage alerts with configurable thresholds (50%, 80%, 100%)
- ✓ Materialized views for dashboard performance (usage_current_period, credit_balances)
- ✓ Client-facing billing dashboard (usage bars, credits, bolt-on purchase)
- ✓ WhatsApp split metering (utility vs marketing) with service window tracking
- ✓ Referral system (code generation, invitation, lifecycle, credit rewards)
- ✓ Monthly billing cycle automation (overage calculation, invoice summary)
- ✓ Credit expiry cleanup automation
- ✓ CSI scoring (5-metric composite: usage, adoption, support, payment, engagement)
- ✓ Smart upsell evaluation (bolt-on spend threshold + frequency triggers)
- ✓ Referral credit issuance (60-day qualification, tier-based rewards)
- ✓ Loyalty milestone rewards (100 events, 6-month anniversary, CSI 90+)
- ✓ Ops dashboard API (client listing with filters, client detail with health/billing history)
- ✓ Accommodation module (types, API routes, migrations)

### Pending Deployment

- [ ] Apply billing migrations (10-13) to production Supabase
- [ ] Seed billing_plans, plan_limits, and credit_packs
- [ ] Deploy 7 N8N workflows to VPS
- [ ] Configure PayFast production mode
- [ ] Configure Facebook/LinkedIn OAuth credentials

### Out of Scope

- Mobile native apps -- responsive web sufficient for MVP
- Dark mode -- configured but not priority for launch
- Voice AI agents -- future feature
- Bank SMS detection -- awaits SMS gateway partnership
- Admin panel -- manage via Supabase dashboard initially
- Advanced ML analytics -- basic reporting sufficient for launch
- Multi-language support -- English only for South African market

## Architecture

### Tech Stack
- Next.js 14.2.33 App Router, TypeScript, Tailwind CSS, shadcn/ui
- Supabase (DB + Auth), Resend (email), PayFast (payments), N8N (workflows)
- Vercel (hosting), GitHub (code), Gitea (state docs)
- WhatsApp Cloud API (messaging), Anthropic Claude (AI via N8N)

### Database Schema (13 migrations)
- 00: Core tables (organizations, users, contacts, deals, companies)
- 01-05: Email, social, analytics, content modules
- 06-07: Accommodation module
- 08: Ops dashboard (ops_clients, ops_client_health, ops_billing_events)
- 09: Agent sessions + autopilot profiles
- 10: Billing foundation (billing_plans, plan_limits, tenant_subscriptions, usage_events, whatsapp_inbound_log)
- 11: Credits & alerts (credit_packs, tenant_credits, usage_alerts, materialized views)
- 12: WhatsApp & referrals (referrals table, service window function, referral_code on organizations)
- 13: CSI scores table

### N8N Workflows (10 total)
- wf-analytics.json: Daily analytics snapshots
- wf-content-gen.json: AI content generation
- wf-queue.json: Content queue processing
- wf-refresh-views.json: Materialized view refresh (15 min)
- wf-usage-alerts.json: Usage threshold alerts (15 min)
- wf-billing-cycle.json: Monthly billing cycle (1st of month)
- wf-credit-expiry.json: Daily credit expiry cleanup
- wf-csi-calculator.json: Weekly CSI calculation (Sunday 03:00)
- wf-referral-credits.json: Daily referral qualification + credit issuance
- wf-loyalty-milestones.json: Weekly loyalty milestone rewards

### Provisioning Pipeline (9 steps)
1. Supabase project creation
2. Database schema cloning
3. GitHub repo from template
4. Vercel deployment
5. N8N webhook configuration
6. Client automation deployment
7. Onboarding email sequence
8. QA health checks
9. Billing setup (subscription + plan assignment)

## Context

**Business model:** R1,500-R7,500/month per client + bolt-on credit packs. Target: 30 clients in 6 months.
**Infrastructure:** Supabase, Vercel, Hostinger VPS (N8N + Gitea), GitHub
**Deployment:** https://draggonnb-mvp.vercel.app

## Key Decisions

| Decision | Rationale | Status |
|----------|-----------|--------|
| Separate Supabase project per client | Data isolation, simpler security, POPI compliance | ✓ Implemented |
| PayFast for payments (not Yoco/Stripe) | SA market standard, native ZAR, recurring subs | ✓ Sandbox working |
| Self-host N8N on Hostinger VPS | Control, no monthly N8N Cloud fee | ✓ Running |
| Event-sourced usage metering | Audit trail, flexible billing, no counter drift | ✓ Implemented |
| DB-driven billing plans | Change pricing without code deploys | ✓ Implemented |
| Dual-write bridge for migration | Legacy counters + new events coexist | ✓ Implemented |
| FIFO credit deduction | Fair consumption, oldest credits used first | ✓ Implemented |
| CSI composite scoring | Quantify client health for churn prevention | ✓ Implemented |
| Referral 60-day qualification | Prevents abuse, ensures genuine referrals | ✓ Implemented |

---
*Last updated: 2026-03-01 after Session 26 (Billing & Monetization complete)*
