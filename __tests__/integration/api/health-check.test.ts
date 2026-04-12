import { describe, it, expect, vi, beforeEach } from 'vitest'
import { testApiHandler } from 'next-test-api-route-handler'

// Mock modules
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

function createChainableBuilder(result: { data: unknown; error: unknown }) {
  const builder: any = {}
  builder.then = (resolve: any) => resolve(result)
  builder.single = vi.fn().mockResolvedValue(result)
  builder.maybeSingle = vi.fn().mockResolvedValue(result)
  const methods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'gte', 'lte', 'gt', 'lt', 'like', 'ilike', 'is', 'not', 'in', 'contains', 'filter', 'or', 'order', 'limit', 'range', 'match']
  for (const m of methods) {
    builder[m] = vi.fn().mockReturnValue(builder)
  }
  return builder
}

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns db_connectivity check when unauthenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { createAdminClient } = await import('@/lib/supabase/admin')

    // Admin client for DB check - success
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          limit: vi.fn(() => ({
            data: [{ id: 'test' }],
            error: null,
          })),
        })),
      })),
    } as any)

    // User client - not authenticated
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
    } as any)

    const routeModule = await import('@/app/api/health/route')

    await testApiHandler({
      appHandler: routeModule as any,
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'GET' })
        const data = await response.json()

        expect(data.checks).toBeDefined()
        expect(data.checks.length).toBeGreaterThanOrEqual(1)

        const dbCheck = data.checks.find((c: { name: string }) => c.name === 'db_connectivity')
        expect(dbCheck).toBeDefined()
        expect(dbCheck.status).toBe('pass')
      },
    })
  })

  it('returns full check suite when authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { createAdminClient } = await import('@/lib/supabase/admin')

    const mockOrgId = 'test-org-id'

    // Admin client - used for DB check (organizations select id limit 1)
    // and for org tier lookup (organizations select name,subscription_tier eq id single)
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'organizations') {
          // The admin client queries organizations twice:
          // 1) health check: .select('id').limit(1) -> { data: [...], error }
          // 2) org tier: .select('name, subscription_tier').eq('id', orgId).single()
          // Use chainable builder that returns org data for both patterns
          return createChainableBuilder({
            data: { id: mockOrgId, name: 'Test Org', subscription_tier: 'growth' },
            error: null,
          })
        }
        return createChainableBuilder({ data: [], error: null })
      }),
    } as any)

    // User client - authenticated
    // getOrgId calls: .from('organization_users').select('organization_id').eq('user_id',...).eq('is_active',true).limit(1).single()
    // table_access calls: .from('organization_users').select('id').eq('organization_id',...).limit(1)
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'test@test.com' } },
          error: null,
        }),
      },
      from: vi.fn(() => {
        return createChainableBuilder({
          data: { organization_id: mockOrgId, id: 'test' },
          error: null,
        })
      }),
    } as any)

    const routeModule = await import('@/app/api/health/route')

    await testApiHandler({
      appHandler: routeModule as any,
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'GET' })
        const data = await response.json()

        expect(data.checks).toBeDefined()

        const authCheck = data.checks.find((c: { name: string }) => c.name === 'auth')
        expect(authCheck).toBeDefined()
        expect(authCheck.status).toBe('pass')

        const orgCheck = data.checks.find((c: { name: string }) => c.name === 'org_resolution')
        expect(orgCheck).toBeDefined()
      },
    })
  })
})
