# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-13)

**Core value:** Complete multi-tenant B2B operating system for South African SMEs. Shared Supabase DB with RLS-based tenant isolation, wildcard subdomain routing, DB-backed module gating, automated provisioning.
**Current stats:** 184 DB tables, 175 API routes, 19+ UI modules, 6 AI agents, 26 N8N workflows active, 241 tests. Build passing. tsc clean.

## Current Position

Phase: Launch Readiness + First Client Prep
Status: DEPLOYED TO PRODUCTION. Live at https://draggonnb-platform.vercel.app. Build passing. tsc clean.
Last activity: 2026-03-28 -- Session 44: Restaurant module fully built end-to-end (DB + APIs + all UI + N8N workflows + demo seeded).
Progress: 184 DB tables + RLS live in Supabase. 175 API routes. 19+ UI modules. 6 AI agents. 26 N8N workflows. 241 tests. Build clean.

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
- **VPS:** Traefik + N8N (26 workflows created, need manual activation) + Gitea + OpenClaw
- **Supabase:** 184 tables, RLS live, 8 orgs, demo restaurant seeded (Sunset Grill, org: 678634bd)
- **GitHub:** DRAGGONNB/draggonnb-platform (main branch), latest commit: `1542da4`
- **N8N:** 26 workflows (4 restaurant workflows INACTIVE — activate manually in N8N dashboard)
- **VPS env:** PayFast merchant 32705333, Resend key updated, N8N Cloud ref removed
- **Gitea:** API token expired — Chris to generate new token at localhost:3030 on VPS

## Session Continuity

Last session: 2026-03-28 (Session 44 — extended)
Stopped at: Restaurant module fully built, all UI components complete, demo seeded in Supabase, deployed and type-check clean.
Resume with:
1. Visual QA of Restaurant module using demo URLs below
2. Activate 4 N8N restaurant workflows in N8N dashboard (currently inactive)
3. Add `restaurant` to `tenant_modules` for org 678634bd to enable feature gating
4. Gitea token renewal (Chris: Gitea admin panel at localhost:3030 via SSH tunnel)
5. Then: accommodation module visual QA + remaining deferred todos (Twitter/X, scheduled publish cron, Meta config)

## Demo Restaurant — Sunset Grill

**Org:** Test Restaurant ABC (`678634bd-0f62-423d-a828-b7a1394580b5`)
**Restaurant ID:** `0e1c61c5-42c7-4703-9047-ed3dcdf35e15`
**Staff PIN:** `1234` (all 3 staff: Chris Manager, Thandi Server, Sipho Server)

| Screen | URL |
|--------|-----|
| Staff Login | `/restaurant/login?r=0e1c61c5-42c7-4703-9047-ed3dcdf35e15` |
| Floor Plan | `/restaurant/tables` (after login) |
| Guest T1 | `/r/sunset-grill/876b6b13-40b8-4aaa-99ed-593e808d46b9` |
| Guest T2 | `/r/sunset-grill/5310b828-e25d-4a2e-930b-0d67c90cef09` |
| Guest VIP | `/r/sunset-grill/d6db13a7-366b-491e-a623-cdd66bdbad50` |

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
