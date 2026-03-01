# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-01)

**Core value:** A complete, working end-to-end business automation platform that can be cloned and deployed for a new client within 48-72 hours.
**Current focus:** Billing & monetization layer complete. 90-day plan Sprints 2-6 delivered. Ready for migration deployment and E2E testing.

## Current Position

Phase: v3 Billing & Monetization (Sprints 2-6 complete)
Plan: 16/16 v1 plans + BOS Phases A-E + Billing Sprints 1-6
Status: DEPLOYED TO PRODUCTION. Live at https://draggonnb-mvp.vercel.app
Last activity: 2026-03-01 -- Session 26: 90-day billing plan execution (Sprints 2-6)
Progress: Full billing stack built. Migrations pending deployment to Supabase.

## Accumulated Context

### Decisions

Key architectural decisions (v3 additions):
- Event-sourced usage metering via usage_events table (replaces counter-based system)
- DB-driven billing plans (billing_plans + plan_limits tables) instead of hardcoded tiers
- Dual-write bridge: incrementUsage() writes to both legacy counters and new event log
- FIFO credit deduction: bolt-on credits consumed oldest-first
- WhatsApp split metering: separate utility vs marketing dimensions
- Service window tracking: 24h free reply window after inbound customer message
- CSI composite scoring: 5-metric weighted index (usage 30%, adoption 20%, support 20%, payment 15%, engagement 15%)
- Referral lifecycle: pending -> signed_up -> qualified (60 days) -> rewarded
- Ops dashboard activated (was 501 stubs)
- Provisioning pipeline extended to 9 steps (billing setup added)

### What Was Built (Session 26)

**Sprint 2 -- Bolt-On Credits & Usage Alerts:**
- Migration 10_billing_foundation.sql: billing_plans, plan_limits, tenant_subscriptions, usage_events, whatsapp_inbound_log tables
- Migration 11_credits_and_alerts.sql: credit_packs, tenant_credits, usage_alerts, materialized views
- lib/usage/meter.ts: event-sourced metering with logUsage() + logUsageSync()
- lib/usage/check-limit.ts: checkUsageLimit() + getUsageSummary() with bolt-on awareness
- lib/usage/deduct-credits.ts: FIFO credit deduction engine
- API routes: GET/POST /api/billing/bolt-on (credit pack listing + PayFast purchase)
- N8N workflows: wf-refresh-views.json (15-min materialized view refresh), wf-usage-alerts.json (15-min threshold alerts)

**Sprint 3 -- Client Dashboard & WhatsApp Metering:**
- app/(dashboard)/billing/page.tsx: Full billing dashboard with usage bars, credits tab, bolt-on purchase
- API routes: GET /api/billing/usage, GET /api/billing/credits
- Migration 12_whatsapp_and_referrals.sql: service window function, referrals table, referral_code on organizations
- lib/whatsapp/send-metered.ts: service window check + metered text/interactive messages
- WhatsApp webhook updated to log inbound messages to whatsapp_inbound_log
- API routes: GET/POST /api/referrals, GET /api/referrals/validate
- whatsapp_utility and whatsapp_marketing added as metered dimensions

**Sprint 4 -- Billing Cycle & Provisioning:**
- N8N wf-billing-cycle.json: monthly overage calculation + invoice summary (1st of month)
- N8N wf-credit-expiry.json: daily expired credit cleanup
- scripts/provisioning/steps/09-billing.ts: billing setup provisioning step
- Orchestrator upgraded from 8 to 9 steps with billing_setup type

**Sprint 5 -- Customer Intelligence:**
- lib/csi/calculator.ts: 5-metric CSI composite scoring (0-100, 4 bands)
- lib/billing/upsell.ts: smart upsell evaluation (bolt-on spend threshold + frequency)
- N8N wf-csi-calculator.json: weekly CSI calculation (Sunday 03:00)
- N8N wf-referral-credits.json: daily referral qualification + tier-based credit issuance
- N8N wf-loyalty-milestones.json: weekly loyalty milestone detection + idempotent rewards
- Migration 13_csi_scores.sql: CSI scores table with RLS
- POST /api/ops/csi/calculate: batch CSI calculation endpoint

**Sprint 6 -- Ops Dashboard Activation:**
- GET /api/ops/clients: full implementation with tier/health/billing filters + summary
- GET /api/ops/clients/:id: full implementation with health history + billing events
- Build reviewer agent (.claude/agents/build-reviewer.md) -- note: .gitignored

### Pending Todos

- Apply migrations 10-13 to Supabase (billing foundation, credits, WhatsApp/referrals, CSI)
- Apply migration 08_ops_dashboard.sql to Supabase
- Seed billing_plans and plan_limits with Core/Growth/Scale pricing
- Seed credit_packs for each dimension
- Configure N8N workflows on VPS (7 new workflows)
- First end-to-end provisioning test with billing step
- Switch PAYFAST_MODE from sandbox to production
- Configure Facebook/LinkedIn OAuth credentials
- E2E flow test: signup -> subscribe -> use -> hit limit -> buy bolt-on -> overage calc

### Blockers/Concerns

- Migrations 10-13 not yet applied to production Supabase
- N8N workflow files exist but not yet deployed to VPS
- PayFast production credentials still needed
- Facebook/LinkedIn OAuth credentials still needed
- usage_current_period materialized view referenced in CSI calculator needs to exist (created by migration 11)

## Session Continuity

Last session: 2026-03-01 (Session 26)
Stopped at: Sprints 2-6 complete. All code committed and pushed. Migrations not yet applied.
Resume with: Apply migrations to Supabase. Seed billing plans. Deploy N8N workflows. E2E test.

### Session 26 Summary (2026-03-01)
**What was accomplished:**
1. Executed 90-day billing plan Sprints 2-6 in a single session
2. 31 files created/modified, 2,723 lines added across 4 commits
3. Zero TypeScript errors in source files
4. Full billing stack: event metering, credit packs, usage alerts, materialized views
5. WhatsApp split metering with service window tracking
6. Referral system with lifecycle management and credit issuance
7. CSI scoring, smart upsells, loyalty milestones
8. Ops dashboard activated (replaced 501 stubs)
9. Provisioning pipeline extended to 9 steps

**Git commits this session:**
- `50caca8` feat(billing): Add bolt-on credit system, usage alerts, and materialized views (Sprint 2)
- `636ebbe` feat(billing): Add client dashboard, WhatsApp split metering, and referral system (Sprint 3)
- `4bc3f1e` feat(billing): Add billing cycle automation, credit expiry, and provisioning step 09 (Sprint 4)
- `8ceb76b` feat(ops): Add CSI scoring, smart upsells, referral rewards, and ops dashboard (Sprint 5+6)

**What to do next session:**
1. Apply migrations 10-13 to production Supabase
2. Seed billing_plans (Core R1500, Growth R3500, Scale R7500) and plan_limits
3. Seed credit_packs for AI generations, social posts, email sends
4. Deploy all 7 N8N workflows to VPS
5. E2E test: billing dashboard loads real data, bolt-on purchase flow works
6. Verify CSI calculation runs correctly against real orgs

### Previous Sessions
- Session 25 (2026-02-28): Billing foundation (Sprint 1 - migration + metering)
- Session 24 (2026-02-14): Business Operating System (Phases A-E)
- Session 23 (2026-02-10): Production credentials configured
- Session 22 (2026-02-10): Dashboard/CRM/security fixes
- Session 21 (2026-02-09): Audit fixes + Supabase migrations
- Session 20 (2026-02-08): Cleanup (git, Vercel, GitHub sync)
- Sessions 1-19: All 7 phases built + v2 evolution plan
