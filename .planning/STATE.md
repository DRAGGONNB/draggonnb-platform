# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-01)

**Core value:** Complete multi-tenant B2B operating system for South African SMEs. Shared Supabase DB with RLS-based tenant isolation, wildcard subdomain routing, DB-backed module gating, automated provisioning.
**Current focus:** Accommodation module at ~97% implementation. 54 DB tables live (39 base + 15 automation/ops), 94+ API routes, 11 UI pages, 4 AI agents, 7 new libraries. Full 5-phase AI Automation & Operations Layer complete. All management UI pages built. Build passing.

## Current Position

Phase: Accommodation UI & Integration — IN PROGRESS
Plan: v1 roadmap complete (7/7 phases). BOS v2 complete. Accommodation base + Automation Layer + Management UI all complete.
Status: DEPLOYED TO PRODUCTION. Live at https://draggonnb-platform.vercel.app
Last activity: 2026-03-10 -- Session 34: Management UI pages + security fixes
Progress: 54 DB tables + RLS live in Supabase. 94+ API routes. 11 UI pages. 4 AI agents. 7 new libraries. TypeScript build passing (0 source errors).

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
- Sidebar: emoji icons with blue active states, branded "DraggonnB OS"
- AI Agents surfaced as dedicated sidebar section (Autopilot, AI Workflows, Agent Settings)
- Protected pages use inline error states (never redirect to /login) to prevent redirect loops
- `getUserOrg()` uses admin client fallback for RLS bypass + auto-creates missing user records
- Supabase service role key rotated (2026-03-05) after accidental exposure
- Dev server on Windows: use `node node_modules/next/dist/bin/next dev` (npm/npx ENOENT on this machine)

### Pending Todos

- Save actual DraggonnB logo as public/logo.png and update src in nav.tsx + Sidebar.tsx
- Apply migration 08_ops_dashboard.sql to Supabase (when managing 5+ clients)
- Configure PayFast passphrase and production mode
- Configure Facebook/LinkedIn OAuth credentials
- Configure Resend API key for email delivery
- First end-to-end provisioning test with real client config
- Accommodation: Guest portal with access pack system
- Accommodation: Channel manager integration (Booking.com, Airbnb sync)
- Accommodation: Configure N8N workflows (17 planned -- queue processor, reminders, daily brief, etc.)
- Accommodation: Wire PayFast link generator to existing webhook handler
- Accommodation: Set up Telegram ops bot webhook + channel configuration

### Blockers/Concerns

- Actual logo PNG file needs to be saved to public/logo.png
- Facebook/LinkedIn OAuth credentials still needed
- PayFast passphrase still needed
- Resend API key still needed

## Session Continuity

Last session: 2026-03-10 (Session 34)
Stopped at: All management UI pages built (automation, stock, costs). Security fixes applied. Pushed to GitHub.
Resume with: Guest portal with access pack system. Channel manager integration. N8N workflow configuration. First provisioning pipeline test.

### Session 34 Summary (2026-03-10)
**What was accomplished:**
1. Committed 33 uncommitted files from previous session (guest portal, channel manager, API keys, N8N workflows, ops APIs)
2. Code review found 5 issues -- fixed 3:
   - Bug: Added try/catch to guest-portal/access/route.ts (was the only route missing one)
   - Security: Removed unsafe default secret in guest-portal.ts, added production warning
   - Minor: Fixed silent error swallowing in api-key-auth.ts fire-and-forget
3. Built 3 new UI pages (2,274 lines total):
   - **Automation Hub** (`/accommodation/automation`): 3 tabs -- automation rules CRUD with toggle, message queue with retry/cancel, comms log with expandable rows
   - **Stock & Inventory** (`/accommodation/stock`): 2 tabs -- stock items with low/in-stock/overstocked badges, stock movements with type color coding
   - **Cost Tracking & Profitability** (`/accommodation/costs`): 3 tabs -- cost summary with breakdown bars, unit costs grouped by unit, profitability with margin color coding
4. Added 3 sidebar navigation links (Automation, Stock, Costs)
5. Fixed TS error: Supabase PromiseLike lacks .catch() -- wrapped in Promise.resolve()
6. TypeScript build: 0 source errors
7. Fixed `.claude/launch.json` for Windows (node + next dist path)

**Git commits this session:**
- `1483c34` feat: add guest portal, channel manager, API keys, N8N workflows, and ops APIs
- `cde7e20` fix: harden guest portal and API key auth security
- `8732275` feat: add automation, stock, and cost tracking UI pages

**Errors encountered:**
- TS2339: PromiseLike .catch -- fixed with Promise.resolve() wrapper (ERR-016)
- preview_start ENOENT on Windows for npm/npx -- fixed with node direct path

**What to do next session:**
1. Guest portal with access pack system
2. Channel manager integration prep (Booking.com, Airbnb sync)
3. Configure N8N workflows (17 planned)
4. First provisioning pipeline test with real client config

### Session 33 Summary (2026-03-06)
Complete 5-phase AI Automation & Operations Layer delivered: 15 new DB tables, 46 new API routes, 7 new library files, 4 AI agent classes. TypeScript build passing. Commits: `178f792`.

### Session 31 Summary (2026-03-05)
Verified Vercel production deployment. Smoke tested full booking flow end-to-end via SQL. Discovered `nights` is a generated column. Fixed `.claude/launch.json`.

### Previous Sessions
- Session 30 (2026-03-05): Built 6 remaining accommodation APIs (deposit-policies, email-templates, comms-timeline). 48 API routes total.
- Session 29 (2026-03-05): Applied DB migrations to Supabase (39 tables). Built 30 API routes + 4 frontend pages. Merged upstream changes.
- Session 28 (2026-03-05): Fixed 4 live bugs (signup, dashboard blank, CRM redirect loop). Added 59 tests. Rotated Supabase key.
- Session 27 (2026-03-03): Reverted light theme, restored dark charcoal + blue/purple palette.
- Session 26 (2026-03-01): Dashboard & CRM redesign (6 pages). Brand color rebrand. Sidebar + header rewrite.
- Sessions 1-25: All 7 v1 phases built + v2 BOS evolution + architecture restructure.
