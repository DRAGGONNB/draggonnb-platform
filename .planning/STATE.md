# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** A complete, working end-to-end business automation platform that can be cloned and deployed for a new client within 48-72 hours.
**Current focus:** Landing page updated to reflect actual feature availability. Dashboard + CRM show empty data (needs seed data or end-to-end test). Restaurant & Events module not yet built. Production credentials + social OAuth remaining.

## Current Position

Phase: ALL 7 PHASES COMPLETE + v2 Evolution + Audit fixes + DB migrations + Dashboard fixes + Brand rebrand + Landing page accuracy update
Plan: 16/16 plans complete + all migrations applied to Supabase
Status: DEPLOYED TO PRODUCTION. Live at https://draggonnb-mvp.vercel.app
Last activity: 2026-02-25 -- Session 25: Landing page accuracy update + full platform gap analysis
Progress: [██████████░░] ~85% COMPLETE (dashboard/CRM empty data, restaurant module unbuilt, accommodation UI partial, PayFast passphrase, OAuth credentials)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Key architectural decisions:
- Brownfield project: ~60% of code existed, phases focused on fixing/completing
- Security first: RLS, signup flow, middleware fixed before feature work
- Admin client pattern: `lib/supabase/admin.ts` for webhooks (not service role in server.ts)
- Vitest over Jest (10-20x faster, better ESM support)
- N8N on VPS (Cloud access lost), shared between CML and DraggonnB
- Gitea on VPS as central state store (code on GitHub, state on Gitea)
- Centralized feature gating: `lib/tier/feature-gate.ts` for all usage checks and limits

### Pending Todos

**Critical -- Dashboard & CRM show empty/zero data on production:**
- Investigate why dashboard and CRM pages render no data. Likely causes:
  1. No seed data exists in Supabase for the logged-in user's organization
  2. RLS policies may be blocking queries (user's org_id doesn't match data)
  3. `getUserOrg()` may be failing silently (check browser console / server logs)
- Resolution: Run end-to-end test on production (signup -> create contacts/deals -> verify dashboard stats populate)
- If no data in DB: add seed data for the test organization, or create records via CRM UI and verify they appear

**Feature gaps identified by gap analysis:**
- Restaurant & Events module: ZERO code exists (no DB, no API, no UI). Landing page now shows "Coming Soon"
- Accommodation UI: Only ~30% built (properties, guests, inquiries). Missing: pricing UI, booking confirmation, payment processing, operations workflow, guest portal. DB schema (35 tables) is complete.
- Payment cancel page (`/payment/cancel`): Does not exist
- Subscription management / billing history UI: Does not exist

**Infrastructure:**
- Configure PayFast passphrase (from PayFast dashboard)
- Switch PAYFAST_MODE from sandbox to production (when ready for real payments)
- Configure Facebook/LinkedIn OAuth credentials (for social posting)

### Blockers/Concerns

- Dashboard + CRM pages render empty -- needs investigation (data vs auth vs RLS)
- Restaurant & Events module not built -- landing page updated to show "Coming Soon"
- Accommodation UI only covers inventory + inquiries -- pricing, bookings, operations UI needed
- Facebook App ID/Secret not yet configured (OAuth flow ready, needs credentials)
- LinkedIn Client ID/Secret not yet configured (OAuth flow ready, needs credentials)
- PayFast passphrase not yet provided (merchant ID + key configured)
- N8N workflows deployed and active on VPS -- content generator tested end-to-end with GPT-4o

## Session Continuity

Last session: 2026-02-25 (Session 25)
Stopped at: Landing page updated to reflect actual feature availability. Gap analysis complete. Dashboard + CRM empty data documented as priority handover task.
Resume with: 1) Fix dashboard/CRM empty data (seed data or auth/RLS investigation). 2) Merge PR to main. 3) PayFast passphrase + OAuth credentials. 4) Build out accommodation UI or restaurant module based on priority.

### Session 25 Summary (2026-02-25)
**What was accomplished:**
1. Full platform gap analysis across all modules:
   - CRM, Email, Content Studio, AI Agents, Autopilot, Provisioning: fully functional
   - Accommodation: DB complete (35 tables), UI covers ~30% (properties, guests, inquiries)
   - Restaurant & Events: ZERO code exists (only landing page marketing copy)
   - Missing: /payment/cancel page, subscription management UI, billing history
2. Landing page updated to reflect actual feature availability:
   - Restaurant & Events module card shows "Coming Soon" badge with dimmed styling
   - Restaurant industry tab shows "Coming Soon" badge + "Register Interest" CTA
   - Accommodation features split into "Available Now" and "Expanding" sections
   - Pain points rewritten to highlight CRM/email (fully built) instead of bookings
   - Hero subtitle updated to reference live features (CRM, email, AI content, agents)
   - Module showcase subtitle simplified (removed "production-ready" for all)
3. Dashboard + CRM empty data issue documented as priority handover task
4. No new TypeScript errors introduced

**Git commits this session:**
- `fb5789c` Update landing page to reflect actual feature availability
- `22a75b0` Update STATE.md with session 24 summary and add ERR-012 to error catalogue
- `895f783` Replace old blue/electric/neon colours with brand-crimson/charcoal/gold across all pages

**Still needed (priority order):**
1. Fix dashboard/CRM empty data rendering (investigate: seed data vs auth vs RLS)
2. Merge PR to main and verify Vercel deploy
3. PayFast passphrase (from PayFast dashboard)
4. PAYFAST_MODE switch to production (when ready)
5. Facebook/LinkedIn OAuth credentials
6. Build remaining accommodation UI (pricing, bookings, operations, guest portal)
7. Build Restaurant & Events module (when ready -- currently "Coming Soon")
8. Add /payment/cancel page and subscription management UI

### Session 24 Summary (2026-02-25)
**What was accomplished:**
1. Diagnosed Vercel CLI deploy failure -- `--token=` was empty because VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID secrets were not set in GitHub repo settings. User configured them.
2. Brand colour unification across 19 files (the landing page was rebranded in a prior PR but all other pages still used old blue/electric/neon colours):
   - Public pages: qualify, checkout, payment/success -- all slate/blue replaced with brand-charcoal/brand-crimson
   - Dashboard pages: dashboard hero, CRM (4 pages), email (6 pages), autopilot (2 pages), content-generator, accommodation inquiries
   - CSS utilities in globals.css: gradient-electric, gradient-hero, gradient-ai, gradient-mesh, btn-futuristic, gradient-text, hover-glow (3 variants), neon-border, tab-futuristic, input-futuristic, badge-info, pulse-glow animation -- all updated from electric-blue/neon-cyan/electric-purple to brand-crimson/brand-gold/brand-charcoal
3. No new TypeScript errors introduced (pre-existing test module resolution errors only)
4. Pushed to branch `claude/review-changes-mm1ym0lovqom0y8c-K79JF`

**Git commits this session:**
- `895f783` Replace old blue/electric/neon colours with brand-crimson/charcoal/gold across all pages

**Still needed:**
- Merge PR to main and verify Vercel deploy
- PayFast passphrase (from PayFast dashboard)
- PAYFAST_MODE switch to production (when ready)
- Facebook/LinkedIn OAuth credentials

### Session 23 Summary (2026-02-10)
**What was accomplished:**
1. Production credentials configured:
   - PayFast: Merchant ID (32705333) + Merchant Key set in .env.local and Vercel
   - Resend: API key configured in .env.local and Vercel
   - Supabase: Service role key added to Vercel production env
   - Email tracking: SECRET added to Vercel production env
2. Vercel now has 12 production env vars (was missing 5 critical ones)
3. VPS Gitea sync automated: created sync-gitea-state.sh script
4. STATE.md updated to reflect credentials progress

**Still needed:**
- PayFast passphrase (from PayFast dashboard)
- PAYFAST_MODE switch to production (when ready)
- Facebook/LinkedIn OAuth credentials

### Session 22 Summary (2026-02-10)
**What was accomplished:**
1. Dashboard fixes:
   - Fixed all queries to use correct DB column names (posts_published, ai_generations_count, stage)
   - Analytics chart now reads from platform_breakdown JSONB column
   - Replaced hardcoded fake usage/trends with real data + context-aware empty states
   - Sidebar now shows real usage stats from client_usage_metrics
   - Upgrade Plan button links to /pricing
2. +New button (header):
   - Made functional with dropdown menu (New Contact, New Deal, New Campaign, Generate Content)
   - Added dynamic breadcrumbs based on current route
3. CRM navigation fixed:
   - Created missing `companies` table in Supabase (CRM page depended on it)
   - Created missing `platform_metrics` table (dashboard top posts depended on it)
4. Security hardening (Supabase):
   - Fixed search_path on 5 functions (capture_lead, provision_client, get_media_stats, increment_media_usage, update_media_updated_at)
   - Converted 3 SECURITY DEFINER views to SECURITY INVOKER (dbe_lead_pipeline, dbe_client_overview, dbe_dashboard_metrics)
   - Security advisor now clean: only INFO-level items remain (intentional service-role-only tables)
5. All 41 tests still passing, no new TypeScript errors
6. State synced to Gitea VPS (platform-crmm repo)

**Git commits this session:**
- `332c0f3` chore: update state for session 22 (dashboard/CRM/security fixes)
- `3420348` fix: dashboard data queries, +New dropdown, CRM navigation
- `aae845d` chore: update state after Supabase migrations applied
- `cb0560b` fix: resolve audit issues, complete Phase 3+4, wire N8N integration

**Uncommitted changes:** None -- all work committed

**Supabase migrations this session:**
- `create_companies_and_platform_metrics` (companies + platform_metrics tables + RLS)
- `fix_function_search_paths_v2` (5 functions with SET search_path = public)
- `fix_security_definer_views` (3 views converted to SECURITY INVOKER)

**What to do next session:**
1. Configure Resend API key (RESEND_API_KEY in .env.local + Vercel)
2. Add SUPABASE_SERVICE_ROLE_KEY to .env.local and Vercel env vars
3. Add EMAIL_TRACKING_SECRET to .env.local
4. Configure PayFast production merchant credentials
5. Configure Facebook/LinkedIn OAuth credentials
6. Test full user flow end-to-end on production (signup -> dashboard -> CRM -> content)

**Key decisions:**
- Dashboard queries fixed to match actual DB schema (column names differed from code assumptions)
- Missing tables (companies, platform_metrics) created rather than removing code references
- SECURITY DEFINER views converted to SECURITY INVOKER for proper RLS enforcement

**Blockers/concerns:**
- Vercel MCP not connecting (Streamable HTTP error) -- deploy works via GitHub auto-deploy
- Supabase MCP tokens expire frequently -- need re-auth each session
- Gitea DNS doesn't resolve from Windows dev machine -- use SSH + localhost:3030

### Previous Sessions
- Session 24 (2026-02-25): Brand colour unification (19 files) + Vercel deploy secrets fix
- Session 23 (2026-02-10): Production credentials (PayFast, Resend, Supabase service role, email tracking)
- Session 22 (2026-02-10): Dashboard fixes, CRM navigation, security hardening, missing tables
- Session 21 (2026-02-09): Audit fixes + Supabase migrations (RLS, accommodation, RPC)
- Session 20 (2026-02-08): Cleanup (git, Vercel, GitHub sync)
- Sessions 1-19: All 7 phases built + v2 evolution plan
