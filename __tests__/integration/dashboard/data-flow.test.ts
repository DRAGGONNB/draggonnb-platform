/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

describe('getUserOrg data flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns valid UserOrg when user and org exist', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'test@test.co.za' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'user-1',
                    email: 'test@test.co.za',
                    full_name: 'Test User',
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
                }),
              })),
            })),
          }
        }
        return {}
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

  it('auto-creates user record via admin client when user row is missing', async () => {
    const adminInsertMock = vi.fn().mockResolvedValue({ error: null })

    // User client: auth works but users query fails
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
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'not found' },
            }),
          })),
        })),
      })),
    } as any)

    // Admin client: handles the auto-create + re-fetch
    let adminQueryCount = 0
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockImplementation(() => {
                  adminQueryCount++
                  if (adminQueryCount <= 2) {
                    // First admin queries: user not found (for fallback check + initial fetch)
                    return Promise.resolve({ data: null, error: { code: 'PGRST116' } })
                  }
                  // After insert: user found
                  return Promise.resolve({
                    data: {
                      id: 'user-2',
                      email: 'missing@test.co.za',
                      full_name: 'Missing User',
                      organization_id: 'org-auto',
                      role: 'admin',
                      organizations: {
                        id: 'org-auto',
                        name: 'Auto Org',
                        subscription_tier: 'starter',
                        subscription_status: 'trial',
                      },
                    },
                    error: null,
                  })
                }),
              })),
            })),
            insert: adminInsertMock,
          }
        }
        if (table === 'organizations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'org-auto' },
                    error: null,
                  }),
                })),
              })),
            })),
          }
        }
        return {}
      }),
    } as any)

    const { getUserOrg } = await import('@/lib/auth/get-user-org')
    const result = await getUserOrg()

    // Should have auto-created the user record via admin client
    expect(adminInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-2',
        email: 'missing@test.co.za',
        full_name: 'Missing User',
        organization_id: 'org-auto',
        role: 'admin',
      })
    )

    // Should return valid data after auto-create
    expect(result.error).toBeNull()
    expect(result.data).toBeDefined()
    expect(result.data!.userId).toBe('user-2')
    expect(result.data!.organizationId).toBe('org-auto')
  })

  it('returns error when user has no organization', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-3', email: 'noorg@test.co.za' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'user-3',
                    email: 'noorg@test.co.za',
                    full_name: 'No Org User',
                    organization_id: null,
                    role: 'admin',
                    organizations: null,
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      }),
    } as any)

    const { getUserOrg } = await import('@/lib/auth/get-user-org')
    const result = await getUserOrg()

    expect(result.data).toBeNull()
    expect(result.error).toBe('User has no organization')
  })

  it('handles organizations returned as array', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-4', email: 'arr@test.co.za' } },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'user-4',
                email: 'arr@test.co.za',
                full_name: 'Array User',
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
            }),
          })),
        })),
      })),
    } as any)

    const { getUserOrg } = await import('@/lib/auth/get-user-org')
    const result = await getUserOrg()

    expect(result.data).toBeDefined()
    expect(result.data!.organization.name).toBe('Array Org')
    expect(result.data!.organization.subscription_tier).toBe('scale')
  })
})
