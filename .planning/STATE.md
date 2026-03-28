# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-13)

**Core value:** Complete multi-tenant B2B operating system for South African SMEs. Shared Supabase DB with RLS-based tenant isolation, wildcard subdomain routing, DB-backed module gating, automated provisioning.
**Current stats:** 168 DB tables (166 with RLS), 162 API routes, 17+ UI modules, 6 AI agents, 22 N8N workflows active, 241 tests. Build passing.

## Current Position

Phase: Launch Readiness + First Client Prep
Status: DEPLOYED TO PRODUCTION. Live at https://draggonnb-platform.vercel.app. Build passing.
Last activity: 2026-03-28 -- Session 44: Full Restaurant & Events module built (Phase 01-05). 16 new DB tables, 11 API route groups, LiveTab guest bill view, floor plan, POS page, 4 N8N workflows.
Progress: 184 DB tables + RLS live in Supabase. 173 API routes. 18+ UI modules. 6 AI agents. 26 N8N workflows active on VPS. 10 branded communication templates. 241 tests. Build clean.

## Accumulated Context

### Decisions

- Shared DB + RLS multi-tenant (replaces per-client Supabase isolation)
- Single Vercel deployment with wildcard subdomain routing (*.draggonnb.co.za)
- DB-backed module registry + tenant_modules for feature gating
- Hierarchical CLAUDE.md: root + 3 sub-directory build specs (agents, provisioning, API)
- Error catalogue as JSON knowledge base (.planning/errors/catalogue.json)
- No autonomous sub-agents per client until 20+ clients
- Ops dashboard tables designed but deferred until 5+ clients
- Brand identity: hybrid dark/light theme -- dark hero/nav/footer (#2D2F33), light middle sections, Burgundy #6B1420 accents
- CSS utilities: btn-brand, gradient-text-brand updated to official brand palette
- Sidebar: Lucide icons with crimson active states, branded "DraggonnB OS"
- AI Agents surfaced as dedicated sidebar section (Autopilot, AI Workflows, Agent Settings)
- Protected pages use inline error states (never redirect to /login) to prevent redirect loops
- Auth uses `organization_users` junction table (not a `users` table) to link auth users to organizations
- `getUserOrg()` queries junction table with admin client fallback, auto-creates missing records
- `getOrgId()` lightweight helper for API routes needing only org_id
- Supabase service role key rotated (2026-03-05) after accidental exposure
- Dev server on Windows: use `node node_modules/next/dist/bin/next dev` (npm/npx ENOENT on this machine)
- API keys stored as SHA-256 hashes with `dgb_` prefix format; webhook secrets use `whsec_` prefix
- Integration Admin Panel at `/admin/integrations` for vertical SaaS client connectivity
- Logo: 882x882 PNG integrated at public/logo.png
- PayFast merchant ID: 32705333 (updated on VPS + Vercel)
- N8N: self-hosted only (cloud reference removed), all 22 workflows active, tagged by category

### Pending Todos

- Visual QA of property/accommodation module (all roles) -- original user request, deferred during build fixes
- Scheduled publish cron (N8N workflow)
- Twitter/X OAuth + publish endpoint
- Image upload for social posts
- Analytics dashboard for social media
- Manual visual QA by Chris
- Domain DNS configuration (draggonnb.online verification)
- Phase 08.1: Create Meta config + Embedded Signup backend (blocked: Chris providing META_APP_ID, META_APP_SECRET, META_BUSINESS_PORTFOLIO_ID)
- Phase 08.4: Token refresh + social publishing multi-tenant
- Phase 08.5: Provisioning pipeline Meta setup step
- Set up Telegram ops bot webhook + channel configuration
- WhatsApp API: Phone Number ID and Access Token needed from Meta Business dashboard (deferred by Chris)

### Blockers/Concerns

- Gitea API token expired -- need to generate new token on VPS (Gitea admin panel at localhost:3030)
- WhatsApp API: Phone Number ID and Access Token needed from Meta Business dashboard (deferred by Chris)
- Domain DNS: draggonnb.online pointing needs verification
- Meta App credentials needed: META_APP_ID, META_APP_SECRET, META_BUSINESS_PORTFOLIO_ID (Chris to provide)

## Infrastructure State

- **Vercel:** production READY, 21 env vars, PayFast merchant 32705333, tsc clean
- **VPS:** Traefik + N8N (26 workflows active, tagged) + Gitea + OpenClaw
- **Supabase:** 184 tables, 182 with RLS, 7 orgs, 52 tenant_module activations
- **GitHub:** DRAGGONNB/draggonnb-platform (main branch), latest commit: `acdf47d`
- **N8N:** 26 workflows active (+4: Daily Briefing, Session Opened, PayFast ITN, Temp Critical Alert)
- **VPS env:** PayFast merchant 32705333, Resend key updated, N8N Cloud ref removed

## Session Continuity

Last session: 2026-03-28 (Session 44)
Stopped at: Restaurant & Events module fully built and deployed. 4 N8N workflows created.
Resume with: Visual QA of Restaurant module (floor plan, POS, LiveTab guest view). Activate N8N workflows (currently inactive — need activation in N8N dashboard). Add restaurant module to tenant_modules for restaurant clients. Then visual QA of accommodation module and remaining deferred todos.

### Session 44 Summary (2026-03-28)
**What was done:**
1. Applied 3 Supabase migrations: 16 new tables (restaurant_tables, table_sessions, bills, bill_items, bill_payers, bill_payments, menu_categories, menu_items, restaurant_staff, staff_shifts, reservations, temp_logs, restaurant_checklists, checklist_completions, event_vendors, restaurants alter), RLS policies, module_registry seed
2. Created lib/restaurant/ scaffold: api-helpers.ts, schemas.ts (all Zod schemas + R638 thresholds), types.ts, telegram/templates.ts, payfast/generate-link.ts
3. Created 11 API route groups: tables, sessions, sessions/[id]/status, bills/items, payment/itn (public webhook), payment/link, menu, reservations, staff, temp-log, checklists, settings
4. Created LiveTab guest flow: hooks/use-live-bill.ts (Supabase Realtime), app/(guest)/r/[slug]/[qrToken]/page.tsx, components/restaurant/livetab/LiveBillView.tsx
5. Created restaurant staff UI: floor plan page (tables grid + open-session modal), POS page (category tabs + menu grid + live bill sidebar), dashboard summary page
6. Created 4 N8N workflows: Daily Briefing (cron), Session Opened (webhook), PayFast ITN Notification (webhook), Temp Critical Alert (webhook)
7. Committed 27 files (3146 insertions) and deployed to Vercel

**Key decisions:**
- Per-restaurant PayFast credentials in restaurants table, env var fallback
- Manager PIN (SHA-256) required for voids > R50
- LiveTab uses Supabase Realtime on `livetab:{sessionId}` channel
- QR URL format: `/r/[slug]/[qrToken]` resolves to guest bill view
- R638 compliance auto-classifies temp readings as ok/warning/critical

**Session 43 Summary (2026-03-27)
**What was done:**
1. Fixed root cause of "cannot add properties" -- `getAccommodationAuth()` in `lib/accommodation/api-helpers.ts` queried non-existent `users` table, replaced with `getOrgId()` using correct `organization_users` junction table
2. Fixed same `users` table pattern across 13 email API routes, 4 content routes, and `lib/auth/actions.ts` signup function (20+ files total)
3. Added `platform_admin: 4` to `TIER_HIERARCHY` in `lib/feature-gate.ts` -- platform admins were failing all tier checks
4. Created `lib/accommodation/schemas.ts` -- 50+ Zod validation schemas imported by 54 accommodation API routes (file was never committed to git, causing all accommodation routes to fail at build)
5. Fixed forgot-password page Suspense boundary build error
6. Clean build verified: 166 pages, 0 errors
7. Committed and deployed to production

**Key fixes:**
- `lib/accommodation/api-helpers.ts` -- `getAccommodationAuth()` now uses `getOrgId()` instead of `.from('users')`
- `lib/auth/get-user-org.ts` -- Added `getOrgId()` export (lightweight org resolver with admin fallback)
- `lib/accommodation/schemas.ts` -- Created complete Zod schema file (was missing from git)
- `lib/feature-gate.ts` -- Added `platform_admin` to tier hierarchy
- 13 email routes + 4 content routes -- All fixed from `.from('users')` to `getOrgId()` pattern

### Previous Sessions (Condensed)
- Session 42 (2026-03-25): Bug fixes (PayFast, auth, leads), OnboardingChecklist widget, 2 N8N workflows, social publish button, VDJ demo prep
- Session 41 (2026-03-25): Brand identity redesign, 10 templates, admin panel (4 pages), 3 module stubs, logo, PR #9 merged, 22 N8N workflows activated
- Session 40 (2026-03-15): Env var audit, Phase 08 Meta scope, Billing Monitor N8N, Phase 08.2-08.3 implementation
- Session 39 (2026-03-13): getOrgId admin fallback fix, provisioning pipeline fix, 13 N8N workflows deployed
- Session 38 (2026-03-13): CRM `users` table fix, Integration Admin Panel
- Sessions 33-37: Accommodation automation layer, auth fixes, planning commits
- Sessions 1-32: All 7 v1 phases + v2 BOS + architecture restructure + brand redesign
