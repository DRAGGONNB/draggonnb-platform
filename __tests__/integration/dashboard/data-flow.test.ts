/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

/**
 * Creates a chainable Supabase mock that supports the full query chain:
 *   .from(table).select(...).eq(...).eq(...).limit(1).single()
 */
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

describe('getUserOrg data flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns valid UserOrg when user and org exist', async () => {
    const membershipBuilder = createChainableBuilder({
      data: {
        organization_id: 'org-1',
        role: 'admin',
        organizations: {
          id: 'org-1',
          name: 'Test Org',
          subscription_tier: 'growth',
          subscription_status: 'active',
        },
      },
      error: null,
    })

    const profileBuilder = createChainableBuilder({
      data: { full_name: 'Test User' },
      error: null,
    })

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'test@test.co.za' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'organization_users') return membershipBuilder
        return createChainableBuilder({ data: null, error: null })
      }),
    } as any)

    // Admin client used for user_profiles lookup
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'user_profiles') return profileBuilder
        return createChainableBuilder({ data: null, error: null })
      }),
    } as any)

    const { getUserOrg } = await import('@/lib/auth/get-user-org')
    const result = await getUserOrg()

    expect(result.error).toBeNull()
    expect(result.data).toBeDefined()
    expect(result.data!.userId).toBe('user-1')
    expect(result.data!.organizationId).toBe('org-1')
    expect(result.data!.organization.subscription_tier).toBe('growth')
    expect(result.data!.role).toBe('admin')
  })

  it('returns error when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
    } as any)

    const { getUserOrg } = await import('@/lib/auth/get-user-org')
    const result = await getUserOrg()

    expect(result.data).toBeNull()
    expect(result.error).toBe('Not authenticated')
  })

  it('auto-creates user record via ensureUserRecord when membership is missing', async () => {
    // User client: auth works but organization_users query returns null (no membership)
    const userOrgBuilder = createChainableBuilder({
      data: null,
      error: { code: 'PGRST116', message: 'not found' },
    })

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-2',
              email: 'missing@test.co.za',
              user_metadata: { full_name: 'Missing User' },
            },
          },
          error: null,
        }),
      },
      from: vi.fn(() => userOrgBuilder),
    } as any)

    // Admin client handles: fallback lookup, ensureUserRecord checks, org lookup, inserts, re-fetch
    let adminOrgUsersCallCount = 0
    const adminInsertMock = vi.fn().mockReturnValue(
      createChainableBuilder({ data: null, error: null })
    )
    const adminUpsertMock = vi.fn().mockResolvedValue({ data: null, error: null })

    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'organization_users') {
          adminOrgUsersCallCount++
          if (adminOrgUsersCallCount <= 2) {
            // First calls: membership not found (fallback + ensureUserRecord check)
            return createChainableBuilder({
              data: null,
              error: { code: 'PGRST116', message: 'not found' },
            })
          }
          // After auto-create: re-fetch returns membership with joined org
          const refetchBuilder = createChainableBuilder({
            data: {
              organization_id: 'org-auto',
              role: 'admin',
              organizations: {
                id: 'org-auto',
                name: "Missing User's Organization",
                subscription_tier: 'starter',
                subscription_status: 'trial',
              },
            },
            error: null,
          })
          refetchBuilder.insert = adminInsertMock
          return refetchBuilder
        }
        if (table === 'organizations') {
          // ensureUserRecord: no managed org found, then creates a new org
          const orgBuilder: any = createChainableBuilder({
            data: null,
            error: { code: 'PGRST116', message: 'not found' },
          })
          orgBuilder.insert = vi.fn().mockReturnValue(
            createChainableBuilder({
              data: { id: 'org-auto' },
              error: null,
            })
          )
          return orgBuilder
        }
        if (table === 'user_profiles') {
          const profileBuilder: any = createChainableBuilder({
            data: { full_name: 'Missing User' },
            error: null,
          })
          profileBuilder.upsert = adminUpsertMock
          return profileBuilder
        }
        return createChainableBuilder({ data: null, error: null })
      }),
    } as any)

    const { getUserOrg } = await import('@/lib/auth/get-user-org')
    const result = await getUserOrg()

    // Should return valid data after auto-create
    expect(result.error).toBeNull()
    expect(result.data).toBeDefined()
    expect(result.data!.userId).toBe('user-2')
    expect(result.data!.organizationId).toBe('org-auto')
  })

  it('handles organizations returned as array from join', async () => {
    const membershipBuilder = createChainableBuilder({
      data: {
        organization_id: 'org-arr',
        role: 'admin',
        organizations: [{
          id: 'org-arr',
          name: 'Array Org',
          subscription_tier: 'scale',
          subscription_status: 'active',
        }],
      },
      error: null,
    })

    const profileBuilder = createChainableBuilder({
      data: { full_name: 'Array User' },
      error: null,
    })

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-4', email: 'arr@test.co.za' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'organization_users') return membershipBuilder
        return createChainableBuilder({ data: null, error: null })
      }),
    } as any)

    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'user_profiles') return profileBuilder
        return createChainableBuilder({ data: null, error: null })
      }),
    } as any)

    const { getUserOrg } = await import('@/lib/auth/get-user-org')
    const result = await getUserOrg()

    expect(result.data).toBeDefined()
    expect(result.data!.organization.name).toBe('Array Org')
    expect(result.data!.organization.subscription_tier).toBe('scale')
  })
})
