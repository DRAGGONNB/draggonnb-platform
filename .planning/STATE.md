# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-13)

**Core value:** Complete multi-tenant B2B operating system for South African SMEs. Shared Supabase DB with RLS-based tenant isolation, wildcard subdomain routing, DB-backed module gating, automated provisioning.
**Current stats:** 84 DB tables live, 162 API routes, 16+ UI modules, 4 AI agents, 17 N8N workflow templates, 241 tests. Build passing.

## Current Position

Phase: Accommodation UI & Integration — COMPLETE
Plan: v1 roadmap complete (7/7 phases). BOS v2 complete. Architecture restructure complete. Accommodation base + Automation Layer + Management UI all complete.
Status: DEPLOYED TO PRODUCTION. Live at https://draggonnb-platform.vercel.app
Last activity: 2026-03-13 -- Session 36: getUserOrg auth fix, planning files audit
Progress: 84 DB tables + RLS live in Supabase. 162 API routes. 16+ UI modules. 4 AI agents. 17 N8N templates. 241 tests. TypeScript build passing (0 source errors).

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

Last session: 2026-03-13 (Session 36)
Stopped at: getUserOrg auth rewrite committed. All planning files audited and updated.
Resume with: N8N workflow configuration. First provisioning pipeline test. Wire PayFast link generator. Telegram ops bot setup.

### Session 36 Summary (2026-03-13)
**What was accomplished:**
1. Fixed **Dashboard and CRM "Unable to load" errors**: Rewrote `getUserOrg()` in `lib/auth/get-user-org.ts` to use `organization_users` junction table instead of legacy `users` table
2. Fixed **RLS recursion** on `organization_users`: The RLS policy was calling `get_user_org_id()` which queried `organization_users`, causing infinite recursion. Fixed by using `auth.uid()` directly in the policy
3. Inserted **missing data rows**: Created `organization_users` junction record and `user_profiles` record via SQL for Chris's auth user
4. **Comprehensive planning files audit**: Explored full codebase (600+ files), updated all .planning/*.md files with accurate current data
5. Committed getUserOrg fix as `33e0376`
6. TypeScript build: 0 source errors

**Files modified:** lib/auth/get-user-org.ts, all .planning/*.md files
**Errors encountered:**
- RLS recursion on organization_users (fixed via SQL policy update)
- getUserOrg returning null due to querying non-existent `users` table (fixed by rewriting to use organization_users)

**What to do next session:**
1. Configure N8N workflows (17 planned)
2. First provisioning pipeline test with real client config
3. Wire PayFast link generator to existing webhook handler
4. Set up Telegram ops bot webhook + channel configuration

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
