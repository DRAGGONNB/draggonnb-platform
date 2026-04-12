# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-13)

**Core value:** Complete multi-tenant B2B operating system for South African SMEs. Shared Supabase DB with RLS-based tenant isolation, wildcard subdomain routing, DB-backed module gating, automated provisioning.
**Current stats:** 217+ DB tables, 198+ API routes, 20+ UI modules, 6 AI agents, 30 N8N workflows (27 active), 583 tests (34 files). Build passing. tsc clean.

## Current Position

Phase: Launch Readiness + First Client Prep (Restaurant Module Upgrade)
Status: DEPLOYED TO PRODUCTION. Live at https://draggonnb-platform.vercel.app. Build passing. tsc clean.
Last activity: 2026-04-12 -- Session 48: Comprehensive test suite overhaul. 583 tests all passing across 34 files. New integration tests for restaurant (54), elijah (54), social (52), email (62), accommodation (51), platform-core (60). Fixed all pre-existing test failures (mock patterns, auth junction table, webhook security).
Progress: 217+ DB tables + RLS live in Supabase. 198+ API routes. 20+ UI modules. 6 AI agents. 30 N8N workflows. 583 tests (34 files). Build clean.

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
- **VPS:** Traefik + N8N (39 workflows, 27 active) + Gitea (OpenClaw removed -- security concern)
- **Supabase:** 217 tables (33 new elijah_ tables), RLS live, 8 orgs, demo restaurant seeded (Sunset Grill, org: 678634bd), Elijah seeded (DragoonB org: 094a610d)
- **GitHub:** DRAGGONNB/draggonnb-platform (main branch), latest commit: `905602d0`
- **N8N:** 30 workflows (27 active). 4 restaurant workflows INACTIVE. Elijah Incident Intake INACTIVE (needs WhatsApp Cloud API).
- **VPS env:** PayFast merchant 32705333, Resend key updated, N8N Cloud ref removed
- **Gitea:** API token expired — Chris to generate new token at localhost:3030 on VPS

## Session Continuity

Last session: 2026-04-09 (Session 47)
Stopped at: Restaurant module upgraded. 6 new pages built. Vercel build fixed. All code pushed.
Resume with:
1. Visual QA of restaurant module at `/restaurant/dashboard` (verify Vercel deploy works end-to-end)
2. Seed demo data for The Lookout Deck (tables, staff with PINs, menu items, reservations, equipment)
3. Block-based SOP execution page (Phase 4 of SOP plan) -- plan exists at `.claude/plans/graceful-beaming-dolphin.md`
4. N8N Telegram AI SOP Creator workflow (Phase 5 of SOP plan)
5. Guest-facing flow polish (`/t/[token]` bill view, payment, split)
6. WhatsApp Cloud API setup → activate n8n Incident Intake workflow `KTzrMCJ7fcNe5PKN`
7. Activate 4 N8N restaurant workflows in N8N dashboard (currently inactive)
8. Gitea token renewal (Chris: Gitea admin panel at localhost:3030 via SSH tunnel)

## Demo Restaurant — The Lookout Deck (Sunset Grill)

**Org:** Test Restaurant ABC (`678634bd-0f62-423d-a828-b7a1394580b5`)
**Restaurant ID:** `0e1c61c5-42c7-4703-9047-ed3dcdf35e15`
**Staff PIN:** `1234` (all 3 staff: Chris Manager, Thandi Server, Sipho Server)

| Screen | URL |
|--------|-----|
| Dashboard | `/restaurant/dashboard` |
| Staff Login | `/restaurant/login?r=0e1c61c5-42c7-4703-9047-ed3dcdf35e15` |
| Tables/Floor Plan | `/restaurant/tables` |
| Bills | `/restaurant/bills` |
| Menu | `/restaurant/menu` |
| Reservations | `/restaurant/reservations` |
| Staff | `/restaurant/staff` |
| SOPs | `/restaurant/sops` |
| QR Codes | `/restaurant/qr-codes` |
| Events | `/restaurant/events` |
| Compliance | `/restaurant/compliance/temps` |
| Guest T1 | `/r/sunset-grill/876b6b13-40b8-4aaa-99ed-593e808d46b9` |
| Guest T2 | `/r/sunset-grill/5310b828-e25d-4a2e-930b-0d67c90cef09` |
| Guest VIP | `/r/sunset-grill/d6db13a7-366b-491e-a623-cdd66bdbad50` |

### Session 47 Summary (2026-04-09) — Restaurant Module Massive Upgrade
**What was done:**
1. Resolved git conflict between master (Next.js 16 + Tailwind 4) and origin/main (Next.js 14 + Tailwind 3) -- created restaurant-sop-upgrade branch from origin/main, cherry-picked restaurant files
2. Committed block-based SOP system + restaurant billing, payments, menu (38 files, commit ba7f15a4)
3. Built interactive floor plan editor with Konva canvas -- drag-and-drop table positioning, snap-to-grid, shape changes (rect/circle/oval)
4. Built table linking system -- merge 2+ tables into groups (e.g., 2x 4-seater = 8-seater), API routes for groups CRUD
5. Applied Supabase migration: restaurant_floor_plans table, position columns on restaurant_tables, restaurant_table_groups table with RLS
6. Built 6 new restaurant management pages:
   - Dashboard: live stats (occupancy, revenue, covers, open bills, SOPs), 30s auto-refresh, quick links
   - Staff: role-colored grid, filter by role, add staff modal
   - Reservations: date navigation, status grouping (upcoming/seated/done), status actions, add booking modal
   - QR Codes: generate/regenerate tokens, QR rendering (qrcode.react), copy link, download PNG, section filter
   - Events: upcoming/past tabs, full event details (client, venue, budget, deposit), create modal (uses existing events table)
   - Compliance/Temps: temperature logging with in-range/out-of-range indicators, corrective actions, add equipment modal
7. Updated restaurant layout sidebar with all nav items (10 pages total)
8. Fixed Vercel ERESOLVE build failure: added .npmrc with legacy-peer-deps=true
9. Fixed react-konva version: downgraded from 19.2.3 (React 19) to 18.2.14 (React 18 compatible)
10. Created .env.local with Supabase URL and anon key for local dev
11. Created .claude/launch.json with dev server configs
12. All 5 commits pushed to origin/main, Vercel deploying

**Key decisions:**
- Stayed on origin/main's package.json (Next.js 14 + Tailwind 3) since most platform code uses it
- Used react-konva@18 for React 18 compatibility (v19 requires React 19)
- Events page uses existing `events` table (has restaurant_id column), not a new restaurant_events table
- Temp logs use `restaurant_temperature_logs` table, equipment uses `restaurant_equipment` table
- Floor plan canvas uses Next.js dynamic import (SSR incompatible Konva)
- Replaced Map<> with Record<> throughout due to TypeScript strict mode issues

**Commits pushed:**
- ba7f15a4: Block-based SOP system + restaurant billing, payments, and menu
- 3ac3d5b2: Interactive floor plan editor with table linking
- 4421c92a: Restaurant module: dashboard, staff, reservations, QR codes, events, compliance pages
- ec55945b: Add .npmrc with legacy-peer-deps for Vercel builds
- 905602d0: Fix react-konva version: downgrade to v18 for React 18 compatibility

### Session 46 Summary (2026-04-01) — Elijah Security & Response Module
**What was done:**
1. Restored Supabase project psqfgzbjbgqrmjskdavs (was already ACTIVE_HEALTHY)
2. Applied 10 SQL migrations: 16 enums, 33 tables, full RLS, module registration, PostGIS RPCs, n8n RPCs
3. Created 23 API routes under app/api/elijah/ (sections, households, members, incidents, patrols, rollcall, fire, water-points, farms, groups, equipment, sops, checklists)
4. Created 19 UI pages under app/(dashboard)/elijah/ (dashboard, members, incidents, patrols, rollcall, fire map, water-points, farms, groups, equipment, sops, settings)
5. Created 5 lib files: lib/elijah/ (types, constants, validations, api-helpers, whatsapp-commands)
6. Added "Security & Response" sidebar nav section (7 items, gated by security_ops module)
7. Enabled security_ops module for all tenants via tenant_modules
8. Deployed 4 n8n workflows: Roll Call Scheduler (VrKSm0ybQCiY6DHr), Escalation Engine (DojNZlDuR3QP6dBS), Fire Alert (cWMygnR05cAaP9mB), Incident Intake (KTzrMCJ7fcNe5PKN - INACTIVE)
9. Rewrote all n8n workflows from Postgres nodes to httpRequest + $env.SUPABASE_URL convention
10. Created 9 Supabase RPC functions for n8n workflow support
11. Seeded test data: 3 sections, 5 households, 4 water points, 1 farm, 1 fire group, 5 equipment, 1 schedule, 1 patrol, 2 incidents, 1 SOP
12. Fixed whatsapp-commands.ts Supabase v2 API (.upsert instead of .insert().onConflict())
13. Fixed module_registry INSERT to match actual schema columns
14. Build passes with 0 errors
15. Committed (8df46dc + a06f0e2) and pushed to origin/main

**Key decisions:**
- Organization = Community (use organization_id, dropped elijah_community table)
- n8n workflows must use httpRequest + env vars (NOT Postgres nodes) — DraggonnB convention
- Incident Intake is only workflow needing WhatsApp — other 3 activated without it
- Created RPC functions to handle complex JOINs through Supabase REST API
- WhatsApp command router ready but WhatsApp Cloud API setup deferred (Chris working on separately)

**n8n workflow IDs:**
- Roll Call Scheduler: VrKSm0ybQCiY6DHr (ACTIVE)
- Escalation Engine: DojNZlDuR3QP6dBS (ACTIVE)
- Fire Alert Dispatcher: cWMygnR05cAaP9mB (ACTIVE)
- Incident Intake: KTzrMCJ7fcNe5PKN (INACTIVE - needs WhatsApp)

**Elijah test data (DragoonB org: 094a610d):**
- Chris member ID: eb489f2b-cd61-4dce-b494-89849f958bfb
- Sections: Ridgeview Heights, Oakwood Gardens, Riverside Bend
- Water points: Main Reservoir (10000L), Ridgeview Hydrant, Community Pool, Farm Dam
- Farm: Groenvlei Farm (owner Jan van der Merwe)

### Session 45 Summary (2026-03-30) — Org Restructure + Cleanup
**What was done:**
1. Full project inventory: catalogued all 10 projects, 39 N8N workflows, 6 Vercel deploys, 5 Supabase projects, 17 MCP connections
2. GitHub repo renames to kebab-case: VDJ_Accounting -> vdj-accounting, Figarie-Luxury-Travel -> figarie-travel, lotto-checker-frontend -> check-my-lotto
3. Updated git remotes in local repos to match renamed GitHub repos
4. Cowork agent restructured all local files into C:\Dev\DraggonnB\ org hierarchy (platform/, clients/, products/, modules/, tools/, docs/, archive/)
5. Created client provisioning template at clients/_template/ (CLAUDE.md + config.json + n8n/)
6. Created MANIFEST.md at org root with complete inventory tables
7. Removed OpenClaw from CLAUDE.md and STATE.md (replaced with Claude Cowork in role definitions)
8. Created VPS removal script for OpenClaw at tools/ops-hub/remove-openclaw.sh
9. OpenClaw container removal pending -- VPS SSH timed out, script ready for next connection

**Key decisions:**
- OpenClaw decommissioned (security concern -- unnecessary read-access AI layer on VPS)
- Claude Cowork replaces OpenClaw's advisory role (parallel agents, same session)
- All repos standardized to kebab-case naming convention
- Org structure: platform > clients > products > modules > tools > docs > archive

### Session 44 Summary (2026-03-28) — FULL SESSION
**What was done:**
1. Applied 3 Supabase migrations: 16 new tables + RLS + module_registry seed
2. Created lib/restaurant/ scaffold: api-helpers, schemas (Zod + R638), types, telegram templates, PayFast link generator
3. Created 12 API route groups: tables, sessions, sessions/[id]/status, bills/items, payment/itn, payment/link, menu, reservations, staff, temp-log, checklists, settings, auth/pin (public)
4. Created LiveTab guest flow: use-live-bill hook (Supabase Realtime), /r/[slug]/[qrToken] page, LiveBillView component
5. Created prototype spec: .planning/restaurant-ui-prototype-spec.md (8 screens, component inventory, design decisions)
6. Built all 18 UI components via 3 parallel agents:
   - Auth: PINPad, StaffCard, RestaurantAuthGuard, login page
   - POS/Payment: VoidItemSheet, TipSelector, SplitSlotRow, BillSummaryCard, bill finalisation page
   - Ops: DashboardStatCard, ReservationRow, AddReservationSheet, TempLogRow, TempLogSheet, WaitingScreen, reservations page, temp-log page, dashboard rewrite
7. Created 4 N8N workflows: Daily Briefing, Session Opened, PayFast ITN, Temp Critical Alert
8. Fixed staff login: public endpoint /api/restaurant/staff/public (no auth, id+name only)
9. Seeded demo: Sunset Grill restaurant, 3 staff (PIN 1234), 9 tables, 13 menu items
10. 3 type-check passes — zero TypeScript errors across all new files

**Key decisions:**
- Staff auth is PIN-only (not Supabase auth) — sessionStorage, 8h implied expiry
- Public staff list endpoint scoped by restaurant_id (no sensitive data)
- Login URL: /restaurant/login?r={restaurant_id} or NEXT_PUBLIC_DEFAULT_RESTAURANT_ID env var
- Manager PIN (SHA-256) required for voids > R50
- LiveTab Realtime channel: livetab:{sessionId}
- R638 temp thresholds mirrored client-side in TempLogSheet for live preview

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
