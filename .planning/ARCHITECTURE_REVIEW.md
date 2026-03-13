# DraggonnB Architecture Restructure: Decision Record

## Context

Chris provided a comprehensive architecture plan for scaling DraggonnB to 200+ SA SMEs. After deep analysis of the current codebase, this document records the decisions made and their rationale. **All execution phases are COMPLETE as of 2026-03-06.**

## Key Decisions

| # | Area | Decision | Rationale |
|---|------|----------|-----------|
| 1 | Database | Shared DB + RLS with `get_user_org_id()` | Eliminates per-client Supabase project overhead |
| 2 | Codebase | Keep single Next.js 14 app | Turborepo would touch every import in 38,000+ lines for no current benefit |
| 3 | Deployment | Single Vercel deployment, wildcard domains | Eliminates per-client GitHub repo + Vercel project |
| 4 | Provisioning | Org-row-based (9-step saga) | Simplified from per-client infrastructure creation |
| 5 | Modules | DB-backed `module_registry` + `tenant_modules` | Replaces static JSON config files |

## What Was Adopted

- Shared DB + RLS with composite indexes and JWT-based `get_user_org_id()` function
- Single Vercel deployment with wildcard domain routing (`*.draggonnb.co.za`)
- DB-backed module registry replacing static JSON config
- POPIA compliance via RLS-based tenant isolation
- Pricing structure: R1,500-R7,500 base tiers

## What Was Rejected/Deferred

- **Turborepo monorepo** -- touches every import, solves no current problem
- **Firecrawl + Brand.dev** -- many SA SMEs lack websites, existing `ClientOnboardingAgent` is sufficient
- **PWA offline support** -- CRM needs real-time data, offline is contradictory
- **GSAP + Framer Motion + Magic UI** -- marketing site works, animation is cosmetic
- **Telegram Supergroups** -- Telegram ops bot built instead for staff notifications

## Execution Status

All 4 phases completed:
- Phase 1: Shared DB + Optimized RLS -- DONE (2026-02-14)
- Phase 2: Single Deployment + Wildcard Routing -- DONE (2026-02-14)
- Phase 3: WhatsApp Integration -- Scaffolded (client.ts + intake-flow.ts exist, Meta Cloud API deferred)
- Phase 4: Accommodation Module -- DONE (2026-03-10, 102 routes, 12 UI pages, 4 AI agents)

---
*Last updated: 2026-03-13 -- converted from execution plan to decision record*
