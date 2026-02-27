# DraggonnB Architecture Restructure: Review & Execution Plan

## Context

Chris provided a comprehensive architecture plan for scaling DraggonnB to 200+ SA SMEs. After deep analysis of the current codebase (24 sessions, 7 phases, 62 API routes, 35+ tables, 5 AI agents, 8-step provisioning saga), this review identifies what to adopt, what to reject, and the execution sequence.

**Decisions confirmed:**
- Shared DB + RLS (replaces per-client Supabase isolation)
- Keep single Next.js app (no Turborepo)
- Lean scope: DB migration + WhatsApp + first hospitality client (defer Firecrawl, Brand.dev, PWA offline, GSAP, Telegram Supergroups)

---

## Part 1: Architecture Conflict Analysis

### 5 conflicts between current codebase and proposed plan

| # | Area | Current (Built) | Proposed | Decision |
|---|------|-----------------|----------|----------|
| 1 | **Database** | Per-client Supabase projects (`01-supabase.ts` creates new project per client) | Single shared DB + RLS with `get_user_org_id()` | **ADOPT** -- shared DB |
| 2 | **Codebase** | Single Next.js 14 app, forked per client | Turborepo monorepo with packages | **REJECT** -- keep single app |
| 3 | **Deployment** | Per-client GitHub repo + Vercel deployment | Single Vercel deployment, wildcard domains | **ADOPT** -- single deploy |
| 4 | **Provisioning** | 8-step saga (create Supabase, clone schema, fork repo, deploy Vercel, N8N, automations, onboarding, QA) | Webhook-driven from single DB | **ADOPT** -- simplify to org-row-based |
| 5 | **Modules** | Static `client-config.json` per repo | DB-backed `module_registry` + `tenant_modules` | **ADOPT** -- DB-backed flags |

### What the proposed plan gets right (adopt)
- Shared DB + RLS with composite indexes and JWT-based `get_user_org_id()` function
- Single Vercel deployment with wildcard domain routing
- WhatsApp as primary SA channel (96% adoption, free service conversations)
- DB-backed module registry replacing static JSON config
- POPIA compliance items (audit logging, consent timestamps, data export/deletion)
- Pricing structure: R499-R2,999 base + module add-ons with bundled API costs

### What the proposed plan gets wrong (reject/defer)
- **Turborepo monorepo** -- touches every import in 38,000+ lines, solves no current problem
- **Firecrawl + Brand.dev** -- R290/mo+ for scraping, many SA SMEs lack websites. Existing `ClientOnboardingAgent` is sufficient
- **PWA offline support (@serwist/next)** -- CRM needs real-time data, offline is contradictory. Add `manifest.json` only
- **GSAP + Framer Motion + Magic UI** -- marketing site works, animation is cosmetic
- **Telegram Supergroups for Elijah** -- build Elijah core module first, add Telegram later

---

## Part 2: What Claude Desktop Needs to Execute

### MCP Server Configuration
Claude Desktop needs these MCP servers configured:
1. **Supabase MCP** -- DB operations, migration management, RLS policy creation
2. **GitHub MCP** -- Repo management, PR creation
3. **Filesystem MCP** -- Code generation and file management
4. **N8N MCP** (custom) -- Workflow CRUD via N8N REST API

### CLAUDE.md Must Be Updated First
Before any coding, update the root CLAUDE.md to reflect the new architecture:
- Change "Each client gets their own Supabase project" to shared DB model
- Change provisioning description from 8-step saga to org-row-based
- Update module manifest section to reference DB tables
- Keep sub-directory CLAUDE.md files (agents, provisioning, API) but update provisioning spec

### Critical Files Map
| File | Current Role | Change Required |
|------|-------------|-----------------|
| `scripts/provisioning/orchestrator.ts` | 8-step saga creating per-client infra | Replace Steps 01-04 with org-row creation + module activation |
| `scripts/provisioning/steps/01-supabase.ts` | Creates new Supabase project via Management API | Replace with `INSERT INTO organizations` |
| `scripts/provisioning/steps/02-database.ts` | Clones schema to new project | Remove (shared schema) |
| `scripts/provisioning/steps/03-github.ts` | Forks template repo | Remove (single codebase) |
| `scripts/provisioning/steps/04-vercel.ts` | Creates Vercel project | Remove (single deployment) |
| `scripts/provisioning/steps/05-n8n.ts` | Configures N8N webhooks | Keep (still needed per-client) |
| `scripts/provisioning/steps/06-automations.ts` | Deploys module-specific workflows | Keep (still needed per-client) |
| `scripts/provisioning/steps/07-onboarding.ts` | 3-email Resend drip | Keep + add WhatsApp welcome |
| `scripts/provisioning/steps/08-qa-check.ts` | Post-deploy health checks | Keep, simplify (no Vercel/GitHub to check) |
| `supabase/migrations/01_rls_policies.sql` | Subquery-based RLS policies | Rewrite all to JWT-based `(SELECT get_user_org_id())` pattern |
| `lib/tier/feature-gate.ts` | Tier checking from TypeScript constants | Wire to `tenant_modules` DB table with TS fallbacks |
| `lib/provisioning/client-config.ts` | Generates/validates static JSON config | Bridge with DB-backed module_registry |
| `lib/supabase/middleware.ts` | Auth session management | Add subdomain parsing + tenant resolution |
| `middleware.ts` (root) | Auth redirect logic | Add module access gating per tenant |

### Existing Code to Reuse (Not Replace)
- `lib/agents/base-agent.ts` -- Agent pattern is solid, unchanged
- `lib/agents/client-onboarding-agent.ts` -- Enhance with web data input, don't replace
- `lib/tier/feature-gate.ts` -- Keep tier hierarchy logic, change data source to DB
- `lib/payments/payfast.ts` -- Unchanged, works with shared DB
- `lib/email/resend.ts` -- Unchanged
- `scripts/provisioning/rollback.ts` -- Keep saga pattern, simplify rollback targets
- All 5 AI agents -- Unchanged (already org-scoped via `organization_id`)
- `lib/whatsapp/client.ts` + `lib/whatsapp/intake-flow.ts` -- Extend for full WhatsApp integration

---

## Part 3: Execution Phases

### Phase 1: Shared DB + Optimized RLS (3-4 sessions)

**Goal**: Migrate from per-client Supabase to single shared DB with JWT-based RLS

**Step 1.1**: Create `get_user_org_id()` function
```sql
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'org_id')::UUID;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

**Step 1.2**: Add composite indexes to ALL tables with `organization_id`
```sql
CREATE INDEX idx_[table]_org_created ON [table](organization_id, created_at DESC);
```
Tables: organizations, users, client_usage_metrics, subscription_history, social_posts, analytics_snapshots, platform_metrics, contacts, companies, deals, activities, email_templates, email_campaigns, email_sequences, email_sends, social_accounts, leads, agent_sessions, content_queue, client_profiles

**Step 1.3**: Rewrite ALL RLS policies from subquery to JWT pattern
```sql
-- BEFORE (current, slow):
USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))

-- AFTER (proposed, fast):
USING (organization_id = (SELECT public.get_user_org_id()))
```
Apply `FORCE ROW LEVEL SECURITY` to all tables.

**Step 1.4**: Add `module_registry` + `tenant_modules` tables
```sql
CREATE TABLE module_registry (
  id TEXT PRIMARY KEY,  -- 'crm', 'accommodation', 'restaurant', 'elijah'
  display_name TEXT NOT NULL,
  description TEXT,
  min_tier TEXT NOT NULL DEFAULT 'core',
  routes TEXT[] NOT NULL DEFAULT '{}',
  tables TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tenant_modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL REFERENCES module_registry(id),
  is_enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  enabled_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, module_id)
);
```

**Step 1.5**: Configure Supabase auth hook to inject `org_id` into JWT custom claims

**Step 1.6**: Update `feature-gate.ts` to read from `tenant_modules` with TypeScript fallbacks

### Phase 2: Single Deployment + Wildcard Routing (2 sessions)

**Goal**: Eliminate per-client Vercel/GitHub deployments

**Step 2.1**: Configure wildcard domain on Vercel (`*.draggonnb.co.za`)

**Step 2.2**: Add tenant resolution to middleware:
```typescript
// In middleware.ts
const hostname = request.headers.get('host') || ''
const subdomain = hostname.split('.')[0]
if (subdomain && subdomain !== 'www' && subdomain !== 'draggonnb') {
  const tenant = await resolveTenant(subdomain) // lookup from organizations table
  // Inject tenant context into request headers
}
```

**Step 2.3**: Add module access gating in middleware (check `tenant_modules` for route access)

**Step 2.4**: Rewrite provisioning orchestrator:
- Step 01: `INSERT INTO organizations` (replaces Supabase project creation)
- Step 02: Create auth user + set JWT claims (replaces schema cloning)
- Step 03: Assign subdomain in organizations table (replaces GitHub repo creation)
- Step 04: REMOVED (no per-client Vercel)
- Steps 05-08: Keep (N8N, automations, onboarding, QA)

### Phase 3: WhatsApp Integration (2 sessions)

**Goal**: WhatsApp-native operations via Meta Cloud API

**Step 3.1**: Meta Cloud API integration via N8N workflow
- Webhook for incoming messages
- Template message sending for outbound
- Message routing to appropriate handler (lead capture, support, notifications)

**Step 3.2**: WhatsApp welcome flow for new tenants
- Add to Step 07 (onboarding): send WhatsApp welcome alongside email
- Template: business setup guide, first steps, support contact

**Step 3.3**: N8N workflow templates for WhatsApp automation
- Booking confirmations (accommodation module)
- Appointment reminders
- Lead capture from WhatsApp conversations

**Step 3.4**: Update `lib/whatsapp/client.ts` with full Meta Cloud API client

### Phase 4: First Hospitality Client (1-2 sessions)

**Goal**: Onboard Swa-Zulu Safari Lodges as reference client

**Step 4.1**: Apply accommodation migrations (06 + 07) to shared DB
**Step 4.2**: Complete accommodation API routes (partially scaffolded)
**Step 4.3**: Configure PayFast production credentials
**Step 4.4**: Run full provisioning pipeline (new org-row-based flow)
**Step 4.5**: End-to-end test: signup -> provision -> dashboard -> booking flow

---

## Part 4: Verification Plan

### After Phase 1 (Shared DB):
1. Create 2 test organizations in shared DB
2. Authenticate as user from Org A, verify cannot see Org B data
3. Verify `get_user_org_id()` returns correct UUID from JWT
4. Verify composite indexes exist on all `organization_id` columns
5. Verify FORCE ROW LEVEL SECURITY is ON for all tables
6. Run `npm run build` -- zero TypeScript errors

### After Phase 2 (Single Deployment):
1. Access `test-org.draggonnb.co.za` -- verify correct tenant resolution
2. Access module route that tenant doesn't have -- verify redirect/403
3. Run provisioning API with test config -- verify org created + modules activated + N8N configured in under 30 seconds
4. Verify wildcard SSL certificate works

### After Phase 3 (WhatsApp):
1. Send test WhatsApp message to webhook -- verify received and processed
2. Trigger template message send -- verify delivered
3. Test N8N WhatsApp workflow end-to-end

### After Phase 4 (First Client):
1. Full onboarding flow: signup -> AI content generation -> dashboard populated
2. Accommodation booking flow: inquiry -> booking -> confirmation (WhatsApp + email)
3. PayFast subscription payment processes successfully
4. Usage tracking increments correctly
5. Feature gating works (can't access modules not in their plan)

---

## Part 5: What This Plan Delivers to Claude Desktop

This document, combined with the updated CLAUDE.md, gives Claude Desktop everything it needs:

1. **Clear architecture decisions** -- no ambiguity about shared DB vs isolated, single app vs monorepo
2. **Critical files map** -- exact files to modify/create with their current role and required changes
3. **Existing code to reuse** -- prevents Claude Desktop from reinventing what's already built
4. **Sequenced phases** -- dependencies are clear (Phase 1 before Phase 2, etc.)
5. **SQL patterns** -- exact RLS pattern, index pattern, table schemas to follow
6. **Verification steps** -- how to test each phase is working

Claude Desktop should execute Phase 1 first, verify, then proceed to Phase 2. Each phase is independently testable.
