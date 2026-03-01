# Roadmap: DraggonnB CRMM v1

## Overview

DraggonnB CRMM is a production-ready B2B automation SaaS targeting South African SMEs. The platform provides CRM, email marketing, AI content generation, social media automation, analytics, payments, and billing -- all deployable per-client with isolated infrastructure in 48-72 hours.

## Phases

**Phase Numbering:**
- Integer phases (1-8): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Security & Auth Hardening** - Fix every security gap so the app is safe for real users
- [x] **Phase 2: Core Module Completion** - Wire dashboard, email, and payments to real data
- [x] **Phase 3: Landing Page & Public UI** - Build a marketing page that converts visitors to signups
- [x] **Phase 4: N8N Automation** - Activate AI content generation and analytics workflows
- [x] **Phase 5: Social Media Integration** - Connect Facebook/Instagram and LinkedIn for publishing
- [x] **Phase 6: Client Provisioning** - Automate new client deployment (repo, database, hosting)
- [x] **Phase 7: Testing & Hardening** - Add automated tests for critical paths
- [x] **Phase 8: Billing & Monetization** - Event-sourced metering, credit system, billing automation

## Phase Details

### Phase 1: Security & Auth Hardening
**Goal**: Every authenticated route is protected, every database table has RLS, and no security shortcuts remain in the codebase
**Depends on**: Nothing (first phase)
**Status**: Complete (2026-02-03)

Plans:
- [x] 01-01-PLAN.md -- RLS policies and admin Supabase client for webhooks
- [x] 01-02-PLAN.md -- Signup flow RLS compatibility and middleware route protection
- [x] 01-03-PLAN.md -- Email security (HMAC tokens, URL validation) and env var alignment

### Phase 2: Core Module Completion
**Goal**: Dashboard shows real data, email campaigns actually send to contacts, and payments work end-to-end
**Depends on**: Phase 1
**Status**: Complete (2026-02-04)

Plans:
- [x] 02-01-PLAN.md -- Dashboard real data with parallel queries and empty states
- [x] 02-02-PLAN.md -- Email campaign targeting contacts with batch API
- [x] 02-03-PLAN.md -- Verification checkpoint for dashboard and email

### Phase 3: Landing Page & Public UI
**Goal**: Visitors see a professional marketing page that explains the product and drives signups
**Depends on**: Phase 1
**Status**: Complete (2026-02-09)

Plans:
- [x] 03-01-PLAN.md -- Marketing landing page
- [x] 03-02-PLAN.md -- Payment success page improvements

### Phase 4: N8N Automation
**Goal**: AI content generation, content queue processing, and analytics collection all work end-to-end through N8N workflows
**Depends on**: Phase 1
**Status**: Complete (2026-02-09)

Plans:
- [x] 04-01-PLAN.md -- N8N credential configuration and webhook verification
- [x] 04-02-PLAN.md -- Content generation and queue API wiring
- [x] 04-03-PLAN.md -- Analytics display on dashboard

### Phase 5: Social Media Integration
**Goal**: Users can connect their social media accounts and publish posts to Facebook/Instagram and LinkedIn
**Depends on**: Phase 4
**Status**: Complete (2026-02-05)

Plans:
- [x] 05-01-PLAN.md -- Social accounts management foundation
- [x] 05-02-PLAN.md -- Facebook/Instagram OAuth and Graph API publishing
- [x] 05-03-PLAN.md -- LinkedIn OAuth and API publishing

### Phase 6: Client Provisioning
**Goal**: A new paying client can be deployed with their own isolated infrastructure in under an hour through automation
**Depends on**: Phase 1, Phase 4
**Status**: Complete (2026-02-05)

Plans:
- [x] 06-01-PLAN.md -- Supabase project creation and database schema provisioning with RLS
- [x] 06-02-PLAN.md -- GitHub repo from template and Vercel deployment automation
- [x] 06-03-PLAN.md -- N8N webhook configuration and orchestrator with saga rollback

### Phase 7: Testing & Hardening
**Goal**: Critical paths have automated tests so changes do not silently break payments, auth, or CRM
**Depends on**: Phase 1, Phase 2
**Status**: Complete (2026-02-05)

Plans:
- [x] 07-01-PLAN.md -- Test framework setup (Vitest) and PayFast signature unit tests
- [x] 07-02-PLAN.md -- Auth middleware tests and CRM contacts API integration tests

### Phase 8: Billing & Monetization
**Goal**: Complete billing stack with event-sourced metering, credit system, usage alerts, billing automation, and customer intelligence
**Depends on**: Phase 2, Phase 6
**Status**: Complete (2026-03-01)

Sprints:
- [x] Sprint 1 -- Billing foundation: DB-driven plans, event-sourced usage_events, tenant_subscriptions, WhatsApp inbound log, materialized views
- [x] Sprint 2 -- Bolt-on credits: credit_packs, tenant_credits with FIFO deduction, usage_alerts, materialized view refresh + alert N8N workflows
- [x] Sprint 3 -- Client dashboard: billing page with usage bars + credits + purchase flow, WhatsApp split metering (utility/marketing), referral system foundation
- [x] Sprint 4 -- Billing automation: monthly billing cycle N8N workflow, credit expiry cleanup, provisioning step 09 (billing setup)
- [x] Sprint 5 -- Customer intelligence: CSI scoring (5-metric composite), smart upsell logic, referral credit issuance, loyalty milestone rewards
- [x] Sprint 6 -- Ops activation: ops dashboard API routes activated (was 501 stubs), build reviewer agent

## Progress

| Phase | Plans/Sprints | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Security & Auth Hardening | 3/3 plans | Complete | 2026-02-03 |
| 2. Core Module Completion | 3/3 plans | Complete | 2026-02-04 |
| 3. Landing Page & Public UI | 2/2 plans | Complete | 2026-02-09 |
| 4. N8N Automation | 3/3 plans | Complete | 2026-02-09 |
| 5. Social Media Integration | 3/3 plans | Complete | 2026-02-05 |
| 6. Client Provisioning | 3/3 plans | Complete | 2026-02-05 |
| 7. Testing & Hardening | 2/2 plans | Complete | 2026-02-05 |
| 8. Billing & Monetization | 6/6 sprints | Complete | 2026-03-01 |

## What's Next

### Immediate (next session)
1. Apply migrations 10-13 to production Supabase
2. Seed billing_plans, plan_limits, and credit_packs
3. Deploy 7 N8N workflows to VPS
4. E2E test: billing dashboard, bolt-on purchase, usage tracking

### Short-term (next 2 weeks)
5. First real client provisioning test with billing step
6. PayFast production mode activation
7. Facebook/LinkedIn OAuth credential setup
8. Full E2E test: signup -> subscribe -> use -> hit limit -> buy bolt-on -> billing cycle

### Medium-term (next 30 days)
9. First paying client onboarded
10. CSI scoring validated against real usage data
11. Referral program launch
12. WhatsApp metered messaging in production
