# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-01)

**Core value:** Complete multi-tenant B2B operating system for South African SMEs. Shared Supabase DB with RLS-based tenant isolation, wildcard subdomain routing, DB-backed module gating, automated provisioning.
**Current focus:** Accommodation module at ~80% implementation. 39 DB tables live, 48 API routes, 8 UI pages. Billing module added. Build passing. Ready for first accommodation client test.

## Current Position

Phase: Accommodation module implementation (Waves 0-3) — COMPLETE
Plan: v1 roadmap complete (7/7 phases). BOS v2 complete. Accommodation module ~80% implemented.
Status: DEPLOYED TO PRODUCTION. Live at https://draggonnb-platform.vercel.app
Last activity: 2026-03-05 -- Session 31: Smoke test + session close
Progress: 39 DB tables + RLS live in Supabase. 48 API routes. 8 UI pages. 24 Zod schemas. Full booking flow smoke tested end-to-end. Next.js build passing. Dev server config saved.

## Accumulated Context

### Decisions

- Shared DB + RLS multi-tenant (replaces per-client Supabase isolation)
- Single Vercel deployment with wildcard subdomain routing (*.draggonnb.co.za)
- DB-backed module registry + tenant_modules for feature gating
- Hierarchical CLAUDE.md: root + 3 sub-directory build specs (agents, provisioning, API)
- Error catalogue as JSON knowledge base (.planning/errors/catalogue.json)
- No autonomous sub-agents per client until 20+ clients
- Ops dashboard tables designed but deferred until 5+ clients
- Brand identity: reverted to original dark charcoal theme with blue/purple accents
- Landing page: dark charcoal background (original design)
- Sidebar: emoji icons with blue active states (original design), branded "DraggonnB OS"
- AI Agents surfaced as dedicated sidebar section (Autopilot, AI Workflows, Agent Settings)
- Protected pages use inline error states (never redirect to /login) to prevent redirect loops
- `getUserOrg()` uses admin client fallback for RLS bypass + auto-creates missing user records
- Supabase service role key rotated (2026-03-05) after accidental exposure

### What Was Built (Session 26 -- 2026-03-01)

**Dashboard & CRM Redesign (6 pages):**
- Dashboard home: professional B2B overview with stat cards, quick actions, pipeline summary, module status, usage bars
- CRM overview: stat cards linking to sub-pages, pipeline bar chart (recharts), recent contacts/deals tables
- Contacts: professional data table with search/filter, status badges, 8 mock SA contacts
- Companies: data table with industry filter, deals value, 8 mock SA companies
- Deals: Kanban board with 6 pipeline stages, 12 mock deals, summary stats
- New component: CRMPipelineChart (recharts BarChart)

**Brand Color Rebrand (all pages):**
- CSS: --primary from dark blue to brand-crimson (348 75% 42%)
- All accent colors: blue -> brand-crimson, purple -> brand-charcoal
- Pipeline chart qualified bar: blue -> crimson
- Kept semantic colors: green=money/success, amber=content/gold

**Sidebar Rewrite:**
- All emoji icons replaced with Lucide React icons
- Logo area: image + "DRAGGONNB Operating System" branding
- Active nav: brand-crimson-50 bg + crimson-500 border
- Added AI Agents nav section: Autopilot, AI Workflows, Agent Settings

**Header Rewrite:**
- "+ New" button, avatar, search focus all brand-crimson
- Added AI Agents breadcrumb routes

**Landing Page Light Theme (5 files):**
- Full conversion from dark charcoal-900 to white/gray-50 light theme
- Nav with logo image + "DRAGGONNB OS" branding
- White cards, crimson accents, light backgrounds
- CTA section kept dark for contrast
- Footer branding: "CRMM" -> "OS"

### Pending Todos

- Save actual DraggonnB logo as public/logo.png and update src in nav.tsx + Sidebar.tsx
- Apply migration 08_ops_dashboard.sql to Supabase (when managing 5+ clients)
- Configure PayFast passphrase and production mode
- Configure Facebook/LinkedIn OAuth credentials
- Configure Resend API key for email delivery
- First end-to-end provisioning test with real client config
- Accommodation: Guest portal with access pack system
- Accommodation: Channel manager integration (Booking.com, Airbnb sync)
- ~~Accommodation: Smoke test full booking flow (property -> unit -> rate plan -> booking)~~ DONE (Session 31)
- Accommodation: First provisioning pipeline test with real client config

### Blockers/Concerns

- Actual logo PNG file needs to be saved to public/logo.png
- Facebook/LinkedIn OAuth credentials still needed
- PayFast passphrase still needed
- Resend API key still needed

## Session Continuity

Last session: 2026-03-05 (Session 31)
Stopped at: Smoke test passed. State files updated. Session close.
Resume with: Guest portal with access pack system. Channel manager integration prep. First provisioning pipeline test.

### Session 31 Summary (2026-03-05)
**What was accomplished:**
1. Verified Vercel production deployment is live at `draggonnb-platform.vercel.app` (old `draggonnb-mvp.vercel.app` returns 404)
2. Smoke tested full booking flow end-to-end via Supabase SQL:
   - Created property "Smoke Test Lodge" -> unit "Protea Suite" -> rate plan "Standard Rate" -> guest "Thabo Mabena" -> booking (3 nights)
   - Discovered `accommodation_bookings.nights` is a generated column (auto-computed from check_in/check_out dates)
   - Discovered column naming: `type` not `property_type`, `address` not `address_line1`
   - Full FK chain validated. All test data cleaned up after verification.
3. Set up `.claude/launch.json` with next-dev server config (port 3000)
4. Updated STATE.md with correct production URL
5. Updated CLAUDE.md with correct Vercel project reference

**Errors encountered:**
- Vercel MCP tools returning 404 for project — used GitHub Deployments API as workaround
- `nights` generated column cannot be inserted directly — removed from INSERT, auto-computes correctly
- Python3 not available on Windows — used Node.js for script parsing

**What to do next session:**
1. Guest portal with access pack system
2. Channel manager integration prep (Booking.com, Airbnb sync)
3. First provisioning pipeline test with real client config

### Session 30 Summary (2026-03-05)
**What was accomplished:**
1. Built 6 remaining accommodation API routes:
   - deposit-policies: CRUD (GET list, POST, GET/PATCH/DELETE by ID)
   - email-templates: CRUD with trigger_type filtering (GET list, POST, GET/PATCH/DELETE by ID)
   - comms-timeline: Communication log with booking/guest/channel filtering + pagination
2. Added 2 new Zod validation schemas: createEmailTemplateSchema, createCommsTimelineSchema
3. Verified Next.js build passes (`npx next build` — clean success)
4. Verified TypeScript check (`npx tsc --noEmit` — zero accommodation errors)
5. Set up `.claude/launch.json` for dev server preview
6. Total accommodation module metrics:
   - 39 database tables with RLS policies
   - 48 API route files (3,783 lines)
   - 8 frontend pages (3,879 lines)
   - 251 lines of Zod schemas (24 schemas)
   - 735 lines of TypeScript types (40+ interfaces/enums)

**Git commits this session:**
- `dd7d0bd` feat: add deposit policies, email templates, and comms timeline APIs -- 8 files, 507 lines

**What to do next session:**
1. Smoke test full booking flow (property -> unit -> rate plan -> booking)
2. Guest portal with access pack system
3. Channel manager integration prep
4. First provisioning pipeline test with real client config

### Session 29 Summary (2026-03-05)
**What was accomplished:**
1. Applied accommodation DB migrations to Supabase (06_accommodation_core.sql, 07_accommodation_rls.sql)
   - Fixed FK references: `REFERENCES users(id)` -> `REFERENCES auth.users(id)` (7 occurrences)
   - Fixed RLS pattern: subquery -> `get_user_org_id()` for consistency
   - 39 tables live with RLS policies enabled
2. Built 30 new API routes across 5 parallel streams:
   - Pricing: rate-plans, rate-plan-prices, discount-rules, additional-fees, cancellation-policies
   - Bookings: bookings, booking-segments, charge-line-items, bookings/cancel
   - Payments: payments
   - Operations: tasks, issues, readiness
   - Guest: guests/[id], waivers, service-catalog, addon-orders
3. Standardized 6 existing API routes with getAccommodationAuth() + Zod validation
4. Built 4 new frontend pages:
   - Bookings list (status filters, search, quick actions, inline create)
   - Property detail (tabs: Units, Rates, Settings, Images)
   - Calendar grid (14-day availability view, color-coded bookings)
   - Operations dashboard (tasks board, issues, unit readiness traffic light)
5. Updated sidebar navigation: added Bookings, Calendar, Operations links
6. TypeScript build check: zero accommodation-related errors
7. Merged with upstream changes (billing module, tests, onboarding wizard)

**Git commits this session:**
- `f1eccb4` feat: complete accommodation module (APIs, frontend, navigation) -- 45 files, 5816 lines
- `db82223` Merge remote changes (billing, tests, onboarding)

**What to do next session:**
1. Verify Vercel build succeeded
2. Smoke test: property -> unit -> rate plan -> booking flow
3. Remaining accommodation APIs: deposit policies, email templates, comms timeline
4. Guest portal with access pack system
5. First provisioning pipeline test

### Session 28 Summary (2026-03-05)
**What was accomplished:**
1. Fixed 4 live bugs: signup org linking, missing user auto-create, dashboard blank page, CRM redirect loop
2. Root cause: `redirect('/login')` in pages created infinite loop with middleware (both redirecting authenticated users)
3. Root cause: RLS blocked anon client from querying/creating user records; fixed with `createAdminClient()` bypass
4. Added 59 component render tests (dashboard, CRM, autopilot, sidebar, template editor) -- total 241 tests passing
5. Rebranded sidebar from "POWER CRM" to "DraggonnB OS"
6. Added error boundaries (`error.tsx`) for dashboard and CRM routes
7. Added `/api/auth/signout` route for error state "Sign Out & Retry" links
8. Supabase service role key rotated after accidental exposure in chat
9. Updated CLAUDE.md with auth pattern, testing section, repo name fix

**Git commits this session:**
- `5d37078` feat: add component tests for bug-fix verification
- `c44278c` fix: resolve dashboard blank page and CRM redirect loop
- `d61afc3` fix: use admin client for user/org auto-creation, rebrand to DraggonnB OS

**Files changed:** ~30 files (pages, auth lib, tests, error boundaries, sidebar)

**What to do next session:**
1. Chris tests with 3 tier accounts (starter, growth, enterprise)
2. Fix any issues found during tier testing
3. First end-to-end provisioning test
4. Save actual logo PNG to public/logo.png

### Session 27 Summary (2026-03-03)
**What was accomplished:**
1. Reviewed project status (STATE.md, ROADMAP.md, error catalogue, git log)
2. Reverted 3 design commits (5bebac3, 7701954, 91ba4cd) that changed dark->light theme
3. Restored original dark charcoal landing page, emoji sidebar with blue/purple accents, blue dashboard/CRM palette
4. 15 files restored to pre-rebrand state
5. Pushed to feature branch, owner merged to main via GitHub

**Git commits this session:**
- `1595f42` revert: restore original dark theme and blue/purple color palette

**Files changed:** 15 files

**What to do next session:**
1. Verify Vercel deploy succeeded with dark theme
2. Save actual logo PNG to public/logo.png
3. First end-to-end provisioning test

### Session 26 Summary (2026-03-01)
**What was accomplished:**
1. Complete dashboard and CRM page redesign (6 pages + 1 new component)
2. Full brand color rebrand across all dashboard, CRM, sidebar, header, and landing pages
3. Sidebar rewrite: emojis -> Lucide icons, AI Agents section added, logo branding
4. Header rewrite: crimson buttons and focus rings
5. Landing page converted from dark charcoal to light white/crimson theme
6. Zero TypeScript errors in all modified files

**Git commits:**
- `8f41fb9` feat: redesign UI, fix bugs, add onboarding wizard and ops CRUD
- `96a7913` feat: redesign CRM companies and deals pages
- `8f234c1` fix: minor polish on dashboard and CRM page formatting
- `5bebac3` style: rebrand dashboard and CRM to DraggonnB logo palette (REVERTED in S27)
- `7701954` style: rebrand sidebar and header to DraggonnB OS logo palette (REVERTED in S27)
- `91ba4cd` style: convert landing page from dark to light brand theme (REVERTED in S27)

### Previous Sessions
- Session 25 (2026-02-14): Architecture restructure discussion
- Session 24 (2026-02-14): Business Operating System v2 (Phases A-E)
- Session 23 (2026-02-10): Production credentials configured
- Session 22 (2026-02-10): Dashboard/CRM/security fixes
- Sessions 1-21: All 7 v1 phases built + v2 evolution
