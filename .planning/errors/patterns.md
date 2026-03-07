# Error Patterns

Recurring issues identified across multiple sessions. Consult before making changes in these areas.

## Pattern: DB Column Name Mismatches
- **Occurrences:** 3+ sessions (21, 22, and earlier)
- **Root cause:** Code assumptions don't match actual schema. Column names are guessed rather than verified.
- **Prevention:** Always check actual table schema before writing queries. Use `\d table_name` or Supabase MCP to inspect columns.
- **Key tables:**
  - `client_usage_metrics`: uses `posts_published` (not posts_monthly), `ai_generations_count` (not ai_generations_monthly)
  - `deals`: uses `stage` (not status) with values: prospect, qualified, proposal, won, lost
  - `analytics_snapshots`: uses `platform_breakdown` (JSONB), `total_engagement` (not per-platform columns)
  - `social_posts`: no `platform` column, uses `publish_to_accounts`
- **Related errors:** ERR-001, ERR-002

## Pattern: Missing search_path on Supabase Functions
- **Occurrences:** 2+ sessions
- **Root cause:** Functions created without `SET search_path = public`, flagged by Supabase security advisor
- **Prevention:** Every `CREATE FUNCTION` or `ALTER FUNCTION` statement must include `SET search_path = public`
- **Template:**
  ```sql
  CREATE OR REPLACE FUNCTION my_function()
  RETURNS void
  LANGUAGE plpgsql
  SET search_path = public
  AS $$ ... $$;
  ```
- **Related errors:** ERR-004

## Pattern: Vercel TypeScript Strictness
- **Occurrences:** Multiple sessions
- **Root cause:** Vercel build uses stricter TypeScript settings than local dev environment. Type assertions that compile locally fail on Vercel.
- **Prevention:**
  - Cast complex types through `unknown`: `value as unknown as TargetType`
  - Run `npx tsc --noEmit` locally before pushing to catch issues early
  - Avoid direct type assertions between unrelated types
- **Related errors:** ERR-007

## Pattern: useSearchParams Requires Suspense Boundary
- **Occurrences:** Multiple sessions
- **Root cause:** Next.js 14 requires `useSearchParams()` to be wrapped in a `<Suspense>` boundary for SSG compatibility. Build fails without it.
- **Prevention:** Always wrap any component using `useSearchParams()` in a Suspense boundary:
  ```tsx
  <Suspense fallback={<div>Loading...</div>}>
    <ComponentUsingSearchParams />
  </Suspense>
  ```
- **Related errors:** ERR-006

## Pattern: Gitea Connectivity from Windows
- **Occurrences:** Multiple sessions (20+)
- **Root cause:** DNS for git.draggonnb.online does not resolve from the Windows dev machine. Additionally, Gitea maps container port 3000 to host port 3030.
- **Prevention:**
  - Never use `git.draggonnb.online` directly from Windows
  - Use SSH: `ssh hostinger-vps` then access via `localhost:3030`
  - For API calls: SCP payload to VPS, then `curl @file` on VPS
  - Port is 3030 on host, NOT 3000
- **Related errors:** ERR-010, ERR-011

## Pattern: Supabase Joined Query Type Casting
- **Occurrences:** 6+ errors in session 33, recurring from ERR-007 pattern
- **Root cause:** Supabase TypeScript types infer foreign-key joined data as array types. For many-to-one relationships (e.g., `.select('*, category:accommodation_cost_categories(name)')`) the actual returned data is a single object, but TypeScript sees it as `{ name: string }[]`. Casting directly fails TS2352.
- **Prevention:**
  - Always use double-cast through `unknown` for joined query results:
    ```typescript
    const catName = (row.category as unknown as { name: string } | null)?.name || 'Unknown'
    ```
  - Run `npx tsc --noEmit` locally before pushing
  - This is the same root pattern as ERR-007 (Vercel TypeScript Strictness) but specific to Supabase joins
- **Related errors:** ERR-007, ERR-015

## Pattern: Supabase MCP Re-authentication
- **Occurrences:** Every session
- **Root cause:** Supabase MCP uses OAuth with browser-based login. Tokens expire between sessions.
- **Prevention:**
  - Expect to re-authenticate at the start of every session
  - Do not assume previous session tokens are still valid
  - Have browser ready for OAuth flow when starting Supabase work
- **Related errors:** ERR-009
