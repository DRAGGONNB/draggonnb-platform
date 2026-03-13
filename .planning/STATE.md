# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-13)

**Core value:** Complete multi-tenant B2B operating system for South African SMEs. Shared Supabase DB with RLS-based tenant isolation, wildcard subdomain routing, DB-backed module gating, automated provisioning.
**Current stats:** 84 DB tables live, 166 API routes, 17+ UI modules, 4 AI agents, 17 N8N workflow templates, 241 tests. Build passing.

## Current Position

Phase: Accommodation UI & Integration — COMPLETE
Plan: v1 roadmap complete (7/7 phases). BOS v2 complete. Architecture restructure complete. Accommodation base + Automation Layer + Management UI all complete.
Status: DEPLOYED TO PRODUCTION. Live at https://draggonnb-platform.vercel.app
Last activity: 2026-03-13 -- Session 38: CRM bug fix + Integration Admin Panel
Progress: 84 DB tables + RLS live in Supabase. 166 API routes. 17+ UI modules. 4 AI agents. 17 N8N templates. 241 tests. TypeScript build passing (0 source errors).

## Accumulated Context

### Decisions

- Shared DB + RLS multi-tenant (replaces per-client Supabase isolation)
- Single Vercel deployment with wildcard subdomain routing (*.draggonnb.co.za)
- DB-backed module registry + tenant_modules for feature gating
- Hierarchical CLAUDE.md: root + 3 sub-directory build specs (agents, provisioning, API)
- Error catalogue as JSON knowledge base (.planning/errors/catalogue.json)
- No autonomous sub-agents per client until 20+ clients
- Ops dashboard tables designed but deferred until 5+ clients
- Brand identity: light theme with Brand Crimson (HSL 348) + Charcoal (HSL 220) palette
- Sidebar: Lucide icons with crimson active states, branded "DraggonnB OS"
- AI Agents surfaced as dedicated sidebar section (Autopilot, AI Workflows, Agent Settings)
- Protected pages use inline error states (never redirect to /login) to prevent redirect loops
- Auth uses `organization_users` junction table (not a `users` table) to link auth users to organizations
- `getUserOrg()` queries junction table with admin client fallback, auto-creates missing records
- Supabase service role key rotated (2026-03-05) after accidental exposure
- Dev server on Windows: use `node node_modules/next/dist/bin/next dev` (npm/npx ENOENT on this machine)
- `getOrgId()` lightweight helper in `lib/auth/get-user-org.ts` for API routes needing only org_id (avoids full getUserOrg overhead)
- API keys stored as SHA-256 hashes with `dgb_` prefix format; webhook secrets use `whsec_` prefix
- Integration Admin Panel at `/admin/integrations` for vertical SaaS client connectivity

### Pending Todos

- Save actual DraggonnB logo as public/logo.png and update src in nav.tsx + Sidebar.tsx
- Apply migration 08_ops_dashboard.sql to Supabase (when managing 5+ clients)
- Configure PayFast passphrase and production mode
- Configure Facebook/LinkedIn OAuth credentials
- Configure Resend API key for email delivery
- First end-to-end provisioning test with real client config
- Configure N8N workflows (17 planned -- queue processor, reminders, daily brief, etc.)
- Wire PayFast link generator to existing webhook handler
- Set up Telegram ops bot webhook + channel configuration

### Blockers/Concerns

- Actual logo PNG file needs to be saved to public/logo.png
- Facebook/LinkedIn OAuth credentials still needed
- PayFast passphrase still needed
- Resend API key still needed

## Session Continuity

Last session: 2026-03-13 (Session 38)
Stopped at: CRM bug fix + Integration Admin Panel complete. All changes committed and pushed.
Resume with: N8N workflow configuration. First provisioning pipeline test. Wire PayFast link generator. Telegram ops bot setup. Deploy Integration Admin Panel to production.

### Session 38 Summary (2026-03-13)
**What was accomplished:**
1. Fixed CRM bug: all 6 CRM API routes queried non-existent `users` table -- replaced with `getOrgId()` helper querying `organization_users`
2. Added `getOrgId()` lightweight helper to `lib/auth/get-user-org.ts`
3. Built Integration Admin Panel (`/admin/integrations`) with API Keys and Webhooks tabs
4. Created 4 new admin API routes: `api/admin/api-keys/` (GET, POST), `api/admin/api-keys/[id]/` (PATCH, DELETE), `api/admin/webhooks/` (GET, POST), `api/admin/webhooks/[id]/` (GET, PATCH, DELETE)
5. Added Admin > Integrations entry to Sidebar + DashboardHeader breadcrumbs
6. Verified: TypeScript clean (0 source errors), UI renders correctly

**New files:**
- `app/(dashboard)/admin/integrations/page.tsx` -- Integration Admin Panel UI
- `app/api/admin/api-keys/route.ts` -- API key list + generate
- `app/api/admin/api-keys/[id]/route.ts` -- API key update + revoke
- `app/api/admin/webhooks/route.ts` -- Webhook list + create
- `app/api/admin/webhooks/[id]/route.ts` -- Webhook get + update + delete

**Modified files:**
- `lib/auth/get-user-org.ts` -- added `getOrgId()` helper
- 6 CRM API routes -- fixed `users` table references to `organization_users`
- `components/dashboard/Sidebar.tsx` -- added Admin section
- `components/dashboard/DashboardHeader.tsx` -- added integrations breadcrumb

**What to do next session:**
1. Deploy to production (Vercel)
2. Configure N8N workflows (17 planned)
3. First provisioning pipeline test with real client config
4. Wire PayFast link generator to existing webhook handler
5. Set up Telegram ops bot webhook + channel configuration

### Session 37 Summary (2026-03-13)
Committed all planning file updates + session 35 UI work as `137dba5`. Pushed 8 commits to GitHub.

### Session 36 Summary (2026-03-13)
getUserOrg auth fix (`33e0376`): rewrote to use `organization_users` junction table. Fixed RLS recursion. Comprehensive planning files audit across all .planning/*.md files. 0 source errors.

### Session 35 Summary (2026-03-10)
Built Booking Detail page and Channel Manager UI. Integrated guest portal URL into event dispatcher. Fixed provisioning API security and QA checks. 0 source errors.

### Session 34 Summary (2026-03-10)
Committed 33 files from previous session. Fixed 3 code review issues. Built Automation Hub, Stock & Inventory, Cost Tracking UI pages. 0 source errors.

### Previous Sessions
- Session 33 (2026-03-06): Complete 5-phase AI Automation & Operations Layer (15 tables, 46 routes, 7 libs, 4 agents).
- Session 31 (2026-03-05): Verified production deployment. Smoke tested booking flow.
- Session 30 (2026-03-05): Built 6 remaining accommodation APIs. 48 routes total.
- Session 29 (2026-03-05): Applied DB migrations to Supabase (39 tables). Built 30 routes + 4 pages.
- Session 28 (2026-03-05): Fixed 4 live bugs. Added 59 tests. Rotated Supabase key.
- Sessions 1-27: All 7 v1 phases + v2 BOS + architecture restructure + brand redesign.
