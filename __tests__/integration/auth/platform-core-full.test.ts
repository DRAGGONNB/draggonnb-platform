/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks -- must be declared before any imports that reference these modules
// ---------------------------------------------------------------------------
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import {
  getUserOrg,
  getOrgId,
  getServiceRoleOrgId,
} from '@/lib/auth/get-user-org'
import {
  checkFeatureAccess,
  normalizeTier,
  TIER_LIMITS,
  type Feature,
} from '@/lib/tier/feature-gate'
import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  isEmailTrackingSecretConfigured,
} from '@/lib/security/email-tokens'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a chainable Supabase mock whose `.single()` resolves to {data, error} */
function singleMock(data: unknown, error: unknown = null) {
  const single = vi.fn().mockResolvedValue({ data, error })
  const limit = vi.fn(() => ({ single, data, error }))
  const eq: any = vi.fn(() => ({ eq, single, limit }))
  return { select: vi.fn(() => ({ eq })), insert: vi.fn(() => ({ select: vi.fn(() => ({ single })) })), upsert: vi.fn().mockResolvedValue({ data: null, error: null }) }
}

function buildUserClient(opts: {
  user?: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null
  authError?: unknown
  memberData?: unknown
  memberError?: unknown
}) {
  const memberSingle = vi.fn().mockResolvedValue({
    data: opts.memberData ?? null,
    error: opts.memberError ?? (opts.memberData ? null : { message: 'not found' }),
  })
  const memberLimit = vi.fn(() => ({ single: memberSingle }))
  const memberEq: any = vi.fn(() => ({ eq: memberEq, limit: memberLimit, single: memberSingle }))

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: opts.user ?? null },
        error: opts.authError ?? (opts.user ? null : { message: 'Not authenticated' }),
      }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: opts.user }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: memberEq })),
    })),
  } as any
}

function buildAdminClient(overrides: Record<string, any> = {}) {
  const defaultFrom = vi.fn((table: string) => {
    const handler = overrides[table]
    if (handler) return handler
    return singleMock(null, { message: 'no mock' })
  })
  return { from: defaultFrom, rpc: vi.fn().mockResolvedValue({ data: null, error: null }), ...overrides._root } as any
}

// ---------------------------------------------------------------------------
// 1. getUserOrg
// ---------------------------------------------------------------------------
describe('getUserOrg', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns user + org when authenticated with valid membership', async () => {
    const user = { id: 'u1', email: 'alice@test.com', user_metadata: { full_name: 'Alice' } }
    const memberData = {
      organization_id: 'org-1',
      role: 'admin',
      organizations: { id: 'org-1', name: 'Acme', subscription_tier: 'growth', subscription_status: 'active' },
    }

    vi.mocked(createClient).mockResolvedValue(buildUserClient({ user, memberData }))
    // Admin client for profile lookup
    vi.mocked(createAdminClient).mockReturnValue(buildAdminClient({
      user_profiles: singleMock({ full_name: 'Alice Wonder' }),
    }))

    const result = await getUserOrg()

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    expect(result.data!.userId).toBe('u1')
    expect(result.data!.email).toBe('alice@test.com')
    expect(result.data!.organizationId).toBe('org-1')
    expect(result.data!.role).toBe('admin')
    expect(result.data!.organization.name).toBe('Acme')
  })

  it('returns error when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(buildUserClient({ user: null }))

    const result = await getUserOrg()

    expect(result.data).toBeNull()
    expect(result.error).toBe('Not authenticated')
  })

  it('falls back to admin client when RLS blocks user client', async () => {
    const user = { id: 'u2', email: 'bob@test.com' }
    // User client: no membership found
    vi.mocked(createClient).mockResolvedValue(buildUserClient({ user, memberData: null }))

    // Admin client: finds membership + profile
    const adminMemberSingle = vi.fn().mockResolvedValue({
      data: {
        organization_id: 'org-2',
        role: 'member',
        organizations: { id: 'org-2', name: 'BobCo', subscription_tier: 'core', subscription_status: 'trial' },
      },
      error: null,
    })
    const adminMemberLimit = vi.fn(() => ({ single: adminMemberSingle }))
    const adminMemberEq: any = vi.fn(() => ({ eq: adminMemberEq, limit: adminMemberLimit, single: adminMemberSingle }))

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'organization_users') {
          return { select: vi.fn(() => ({ eq: adminMemberEq })) }
        }
        if (table === 'user_profiles') {
          return singleMock({ full_name: 'Bob Smith' })
        }
        return singleMock(null)
      }),
    } as any)

    const result = await getUserOrg()

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    expect(result.data!.organizationId).toBe('org-2')
    expect(result.data!.organization.name).toBe('BobCo')
  })

  it('auto-creates user records via ensureUserRecord when membership missing', async () => {
    const user = { id: 'u3', email: 'new@test.com', user_metadata: { full_name: 'New User' } }

    // User client: no membership
    vi.mocked(createClient).mockResolvedValue(buildUserClient({ user, memberData: null }))

    // Track admin calls for verification
    const insertCalls: string[] = []
    const adminMemberSingle = vi.fn()
      // First call from getUserOrg admin fallback: not found
      .mockResolvedValueOnce({ data: null, error: { message: 'not found' } })
      // ensureUserRecord: check existing membership
      .mockResolvedValueOnce({ data: null, error: { message: 'not found' } })
      // ensureUserRecord: check managed org -- not found
      // Re-fetch after auto-create: membership exists now
      .mockResolvedValue({
        data: {
          organization_id: 'new-org',
          role: 'admin',
          organizations: { id: 'new-org', name: "New User's Organization", subscription_tier: 'starter', subscription_status: 'trial' },
        },
        error: null,
      })

    const adminMemberLimit = vi.fn(() => ({ single: adminMemberSingle }))
    const adminMemberEq: any = vi.fn(() => ({ eq: adminMemberEq, limit: adminMemberLimit, single: adminMemberSingle }))

    const orgInsertSingle = vi.fn().mockResolvedValue({ data: { id: 'new-org' }, error: null })

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'organization_users') {
          return {
            select: vi.fn(() => ({ eq: adminMemberEq })),
            insert: vi.fn(() => {
              insertCalls.push('organization_users')
              return { select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'ou-1' }, error: null }) })) }
            }),
          }
        }
        if (table === 'organizations') {
          return {
            select: vi.fn(() => ({ eq: adminMemberEq })),
            insert: vi.fn(() => {
              insertCalls.push('organizations')
              return { select: vi.fn(() => ({ single: orgInsertSingle })) }
            }),
          }
        }
        if (table === 'user_profiles') {
          return { upsert: vi.fn().mockResolvedValue({ data: null, error: null }), select: vi.fn(() => ({ eq: adminMemberEq })) }
        }
        return singleMock(null)
      }),
    } as any)

    const result = await getUserOrg()

    // ensureUserRecord path should have been triggered
    expect(result.data).not.toBeNull()
    expect(result.data!.organizationId).toBe('new-org')
  })

  it('returns Organization not found when membership has null organizations join', async () => {
    const user = { id: 'u4', email: 'noorg@test.com' }
    const memberData = {
      organization_id: 'org-ghost',
      role: 'admin',
      organizations: null,
    }

    vi.mocked(createClient).mockResolvedValue(buildUserClient({ user, memberData }))
    vi.mocked(createAdminClient).mockReturnValue(buildAdminClient({
      user_profiles: singleMock(null),
    }))

    const result = await getUserOrg()

    expect(result.data).toBeNull()
    expect(result.error).toBe('Organization not found')
  })

  it('handles organizations returned as array (Supabase join quirk)', async () => {
    const user = { id: 'u5', email: 'arr@test.com' }
    const memberData = {
      organization_id: 'org-arr',
      role: 'member',
      organizations: [{ id: 'org-arr', name: 'ArrayOrg', subscription_tier: 'scale', subscription_status: 'active' }],
    }

    vi.mocked(createClient).mockResolvedValue(buildUserClient({ user, memberData }))
    vi.mocked(createAdminClient).mockReturnValue(buildAdminClient({
      user_profiles: singleMock({ full_name: 'ArrayUser' }),
    }))

    const result = await getUserOrg()

    expect(result.error).toBeNull()
    expect(result.data!.organization.name).toBe('ArrayOrg')
    expect(result.data!.fullName).toBe('ArrayUser')
  })

  it('uses email prefix as fallback when no profile found', async () => {
    const user = { id: 'u6', email: 'fallback@domain.com' }
    const memberData = {
      organization_id: 'org-fb',
      role: 'admin',
      organizations: { id: 'org-fb', name: 'FBOrg', subscription_tier: 'core', subscription_status: 'trial' },
    }

    vi.mocked(createClient).mockResolvedValue(buildUserClient({ user, memberData }))
    // Admin client throws -- cannot create
    vi.mocked(createAdminClient).mockImplementation(() => { throw new Error('no admin') })

    const result = await getUserOrg()

    expect(result.error).toBeNull()
    expect(result.data!.fullName).toBe('fallback')
  })
})

// ---------------------------------------------------------------------------
// 2. getOrgId
// ---------------------------------------------------------------------------
describe('getOrgId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns org_id from organization_users junction table', async () => {
    const single = vi.fn().mockResolvedValue({ data: { organization_id: 'org-direct' }, error: null })
    const limit = vi.fn(() => ({ single }))
    const eq: any = vi.fn(() => ({ eq, limit, single }))
    const mock = { from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })) } as any

    const result = await getOrgId(mock, 'user-1')
    expect(result).toBe('org-direct')
  })

  it('falls back to admin client when user client returns null', async () => {
    // User client: null
    const userSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const userLimit = vi.fn(() => ({ single: userSingle }))
    const userEq: any = vi.fn(() => ({ eq: userEq, limit: userLimit, single: userSingle }))
    const userMock = { from: vi.fn(() => ({ select: vi.fn(() => ({ eq: userEq })) })) } as any

    // Admin client: found
    const adminSingle = vi.fn().mockResolvedValue({ data: { organization_id: 'org-admin' }, error: null })
    const adminLimit = vi.fn(() => ({ single: adminSingle }))
    const adminEq: any = vi.fn(() => ({ eq: adminEq, limit: adminLimit, single: adminSingle }))
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: adminEq })) })),
    } as any)

    const result = await getOrgId(userMock, 'user-1')
    expect(result).toBe('org-admin')
  })

  it('returns null when no membership exists in either client', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: null })
    const limit = vi.fn(() => ({ single }))
    const eq: any = vi.fn(() => ({ eq, limit, single }))
    const userMock = { from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })) } as any

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })),
    } as any)

    const result = await getOrgId(userMock, 'user-orphan')
    expect(result).toBeNull()
  })

  it('returns null when admin client throws', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: null })
    const limit = vi.fn(() => ({ single }))
    const eq: any = vi.fn(() => ({ eq, limit, single }))
    const userMock = { from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })) } as any

    vi.mocked(createAdminClient).mockImplementation(() => { throw new Error('boom') })

    const result = await getOrgId(userMock, 'user-1')
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 3. getServiceRoleOrgId
// ---------------------------------------------------------------------------
describe('getServiceRoleOrgId', () => {
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...ORIGINAL_ENV, SUPABASE_SERVICE_ROLE_KEY: 'test-service-key' }
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it('returns org from x-tenant-id header with valid service key', () => {
    const request = new Request('http://localhost/api/test', {
      headers: {
        authorization: 'Bearer test-service-key',
        'x-tenant-id': 'org-tenant-123',
      },
    })

    expect(getServiceRoleOrgId(request)).toBe('org-tenant-123')
  })

  it('returns DEFAULT_ORG_ID when no x-tenant-id header', () => {
    process.env.DEFAULT_ORG_ID = 'default-org'
    const request = new Request('http://localhost/api/test', {
      headers: { authorization: 'Bearer test-service-key' },
    })

    expect(getServiceRoleOrgId(request)).toBe('default-org')
    delete process.env.DEFAULT_ORG_ID
  })

  it('returns null when no Bearer token', () => {
    const request = new Request('http://localhost/api/test')
    expect(getServiceRoleOrgId(request)).toBeNull()
  })

  it('returns null for invalid Bearer token', () => {
    const request = new Request('http://localhost/api/test', {
      headers: { authorization: 'Bearer wrong-key' },
    })

    expect(getServiceRoleOrgId(request)).toBeNull()
  })

  it('returns null when SUPABASE_SERVICE_ROLE_KEY is not set', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const request = new Request('http://localhost/api/test', {
      headers: { authorization: 'Bearer test-service-key' },
    })

    expect(getServiceRoleOrgId(request)).toBeNull()
  })

  it('returns null for non-Bearer authorization scheme', () => {
    const request = new Request('http://localhost/api/test', {
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    })

    expect(getServiceRoleOrgId(request)).toBeNull()
  })

  it('returns null when both x-tenant-id and DEFAULT_ORG_ID are missing', () => {
    delete process.env.DEFAULT_ORG_ID
    const request = new Request('http://localhost/api/test', {
      headers: { authorization: 'Bearer test-service-key' },
    })

    expect(getServiceRoleOrgId(request)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 4. getTenantContext
// ---------------------------------------------------------------------------
describe('getTenantContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns tenant context from middleware headers', async () => {
    const mockHeaders = new Map([
      ['x-tenant-id', 'org-abc'],
      ['x-tenant-subdomain', 'swa-zulu'],
      ['x-tenant-tier', 'growth'],
      ['x-tenant-modules', 'crm,email,accommodation'],
    ])
    vi.mocked(headers).mockResolvedValue({
      get: (key: string) => mockHeaders.get(key) ?? null,
    } as any)

    const { getTenantContext } = await import('@/lib/auth/get-tenant-context')
    const ctx = await getTenantContext()

    expect(ctx).not.toBeNull()
    expect(ctx!.organizationId).toBe('org-abc')
    expect(ctx!.subdomain).toBe('swa-zulu')
    expect(ctx!.tier).toBe('growth')
    expect(ctx!.enabledModules).toEqual(['crm', 'email', 'accommodation'])
  })

  it('returns null when no x-tenant-id header (platform request)', async () => {
    vi.mocked(headers).mockResolvedValue({
      get: () => null,
    } as any)

    const { getTenantContext } = await import('@/lib/auth/get-tenant-context')
    const ctx = await getTenantContext()

    expect(ctx).toBeNull()
  })

  it('returns empty modules array when x-tenant-modules is empty', async () => {
    const mockHeaders = new Map([
      ['x-tenant-id', 'org-empty'],
      ['x-tenant-subdomain', ''],
      ['x-tenant-tier', ''],
      ['x-tenant-modules', ''],
    ])
    vi.mocked(headers).mockResolvedValue({
      get: (key: string) => mockHeaders.get(key) ?? null,
    } as any)

    const { getTenantContext } = await import('@/lib/auth/get-tenant-context')
    const ctx = await getTenantContext()

    expect(ctx).not.toBeNull()
    expect(ctx!.enabledModules).toEqual([])
    expect(ctx!.tier).toBe('core') // defaults to 'core'
  })
})

// ---------------------------------------------------------------------------
// 5. Restaurant API helpers
// ---------------------------------------------------------------------------
describe('getRestaurantAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc-key'
  })

  it('returns auth context for valid user', async () => {
    const user = { id: 'chef-1', email: 'chef@restaurant.com' }
    const orgSingle = vi.fn().mockResolvedValue({ data: { organization_id: 'rest-org' }, error: null })
    const orgLimit = vi.fn(() => ({ single: orgSingle }))
    const orgEq: any = vi.fn(() => ({ eq: orgEq, limit: orgLimit, single: orgSingle }))

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      },
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: orgEq })) })),
    } as any)

    // Admin client fallback (getOrgId may need it)
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: orgEq })) })),
    } as any)

    const { getRestaurantAuth } = await import('@/lib/restaurant/api-helpers')
    const result = await getRestaurantAuth()

    // Should not be a NextResponse (error)
    expect('userId' in result).toBe(true)
    if ('userId' in result) {
      expect(result.userId).toBe('chef-1')
      expect(result.organizationId).toBe('rest-org')
    }
  })

  it('returns 401 for unauthenticated user', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'nope' } }),
      },
    } as any)

    const { getRestaurantAuth, isRestaurantAuthError } = await import('@/lib/restaurant/api-helpers')
    const result = await getRestaurantAuth()

    expect(isRestaurantAuthError(result)).toBe(true)
  })

  it('accepts service-role Bearer token via request', async () => {
    const request = {
      headers: {
        get: (key: string) => {
          if (key === 'authorization') return 'Bearer svc-key'
          if (key === 'x-tenant-id') return 'rest-org-svc'
          return null
        },
      },
    }

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as any)

    const { getRestaurantAuth } = await import('@/lib/restaurant/api-helpers')
    const result = await getRestaurantAuth(request as any)

    expect('userId' in result).toBe(true)
    if ('userId' in result) {
      expect(result.userId).toBe('service')
      expect(result.organizationId).toBe('rest-org-svc')
    }
  })
})

describe('isRestaurantAuthError', () => {
  it('returns true for NextResponse instances', async () => {
    const { NextResponse } = await import('next/server')
    const { isRestaurantAuthError } = await import('@/lib/restaurant/api-helpers')
    const resp = NextResponse.json({ error: 'test' }, { status: 401 })
    expect(isRestaurantAuthError(resp)).toBe(true)
  })

  it('returns false for auth context objects', async () => {
    const { isRestaurantAuthError } = await import('@/lib/restaurant/api-helpers')
    const ctx = { supabase: {}, userId: 'u1', organizationId: 'o1' }
    expect(isRestaurantAuthError(ctx as any)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 6. Feature gating (pure functions -- no mocks needed)
// ---------------------------------------------------------------------------
describe('Feature Gating', () => {
  describe('normalizeTier', () => {
    it('maps starter -> core', () => {
      expect(normalizeTier('starter')).toBe('core')
    })

    it('maps professional -> growth', () => {
      expect(normalizeTier('professional')).toBe('growth')
    })

    it('maps enterprise -> scale', () => {
      expect(normalizeTier('enterprise')).toBe('scale')
    })

    it('passes through unknown tiers unchanged', () => {
      expect(normalizeTier('growth')).toBe('growth')
      expect(normalizeTier('scale')).toBe('scale')
      expect(normalizeTier('core')).toBe('core')
    })
  })

  describe('checkFeatureAccess', () => {
    it('allows core-tier features on core tier', () => {
      const result = checkFeatureAccess('core', 'social_posts')
      expect(result.allowed).toBe(true)
    })

    it('allows core-tier features on higher tiers', () => {
      expect(checkFeatureAccess('growth', 'social_posts').allowed).toBe(true)
      expect(checkFeatureAccess('scale', 'social_posts').allowed).toBe(true)
    })

    it('denies growth-tier features on core tier', () => {
      const result = checkFeatureAccess('core', 'accommodation_module')
      expect(result.allowed).toBe(false)
      expect(result.upgradeRequired).toBe('growth')
    })

    it('allows growth-tier features on growth', () => {
      expect(checkFeatureAccess('growth', 'accommodation_module').allowed).toBe(true)
    })

    it('denies scale-tier features on growth tier', () => {
      const result = checkFeatureAccess('growth', 'api_access')
      expect(result.allowed).toBe(false)
      expect(result.upgradeRequired).toBe('scale')
    })

    it('allows scale-tier features on scale', () => {
      expect(checkFeatureAccess('scale', 'api_access').allowed).toBe(true)
    })

    it('normalizes tier aliases before checking', () => {
      expect(checkFeatureAccess('starter', 'social_posts').allowed).toBe(true)
      expect(checkFeatureAccess('professional', 'ab_testing').allowed).toBe(true)
      expect(checkFeatureAccess('enterprise', 'white_label').allowed).toBe(true)
    })

    it('denies restaurant_module on core tier', () => {
      const result = checkFeatureAccess('core', 'restaurant_module')
      expect(result.allowed).toBe(false)
    })

    it('allows restaurant_module on growth tier', () => {
      expect(checkFeatureAccess('growth', 'restaurant_module').allowed).toBe(true)
    })

    it('returns reason with unknown feature (cast test)', () => {
      const result = checkFeatureAccess('core', 'nonexistent_feature' as Feature)
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Unknown feature')
    })
  })

  describe('TIER_LIMITS', () => {
    it('core tier has finite limits', () => {
      expect(TIER_LIMITS.core.social_posts).toBe(30)
      expect(TIER_LIMITS.core.ai_generations).toBe(50)
      expect(TIER_LIMITS.core.email_sends).toBe(1000)
    })

    it('scale tier has infinite limits for most metrics', () => {
      expect(TIER_LIMITS.scale.social_posts).toBe(Infinity)
      expect(TIER_LIMITS.scale.ai_generations).toBe(Infinity)
      expect(TIER_LIMITS.scale.email_sends).toBe(Infinity)
    })

    it('growth tier has higher limits than core', () => {
      expect(TIER_LIMITS.growth.social_posts).toBeGreaterThan(TIER_LIMITS.core.social_posts)
      expect(TIER_LIMITS.growth.ai_generations).toBeGreaterThan(TIER_LIMITS.core.ai_generations)
    })
  })
})

// ---------------------------------------------------------------------------
// 7. Email token security
// ---------------------------------------------------------------------------
describe('Email Token Security', () => {
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, EMAIL_TRACKING_SECRET: 'test-secret-key-256' }
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it('generates and verifies a valid token', () => {
    const token = generateUnsubscribeToken('send-123', 'user@example.com')
    const result = verifyUnsubscribeToken(token)

    expect(result.valid).toBe(true)
    expect(result.emailSendId).toBe('send-123')
    expect(result.contactEmail).toBe('user@example.com')
  })

  it('rejects a tampered token', () => {
    const token = generateUnsubscribeToken('send-123', 'user@example.com')
    // Flip a character
    const tampered = token.slice(0, -2) + 'XX'
    const result = verifyUnsubscribeToken(tampered)

    expect(result.valid).toBe(false)
  })

  it('rejects token with invalid format', () => {
    const badToken = Buffer.from('only:two:parts').toString('base64url')
    const result = verifyUnsubscribeToken(badToken)

    expect(result.valid).toBe(false)
    expect(result.error).toBe('Invalid token format')
  })

  it('throws when EMAIL_TRACKING_SECRET is not set on generate', () => {
    delete process.env.EMAIL_TRACKING_SECRET
    expect(() => generateUnsubscribeToken('id', 'email')).toThrow('EMAIL_TRACKING_SECRET')
  })

  it('returns invalid when EMAIL_TRACKING_SECRET is not set on verify', () => {
    delete process.env.EMAIL_TRACKING_SECRET
    const result = verifyUnsubscribeToken('any-token')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('EMAIL_TRACKING_SECRET')
  })

  it('isEmailTrackingSecretConfigured returns true when set', () => {
    expect(isEmailTrackingSecretConfigured()).toBe(true)
  })

  it('isEmailTrackingSecretConfigured returns false when unset', () => {
    delete process.env.EMAIL_TRACKING_SECRET
    expect(isEmailTrackingSecretConfigured()).toBe(false)
  })

  it('rejects expired tokens', () => {
    // Create a token with an old timestamp by crafting the payload manually
    const { createHmac } = require('crypto')
    const oldTimestamp = Date.now() - (31 * 24 * 60 * 60 * 1000) // 31 days ago
    const payload = `send-old:old@test.com:${oldTimestamp}`
    const signature = createHmac('sha256', 'test-secret-key-256').update(payload).digest('hex')
    const expiredToken = Buffer.from(`${payload}:${signature}`).toString('base64url')

    const result = verifyUnsubscribeToken(expiredToken)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Token expired')
  })

  it('rejects tokens with future timestamps', () => {
    const { createHmac } = require('crypto')
    const futureTimestamp = Date.now() + (60 * 60 * 1000) // 1 hour in future
    const payload = `send-future:future@test.com:${futureTimestamp}`
    const signature = createHmac('sha256', 'test-secret-key-256').update(payload).digest('hex')
    const futureToken = Buffer.from(`${payload}:${signature}`).toString('base64url')

    const result = verifyUnsubscribeToken(futureToken)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Token timestamp in future')
  })
})

// ---------------------------------------------------------------------------
// 8. Lead capture route (public, no auth)
// ---------------------------------------------------------------------------
describe('POST /api/leads/capture', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('captures a valid lead', async () => {
    const insertSingle = vi.fn().mockResolvedValue({ data: { id: 'lead-1' }, error: null })
    const existingSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const existingLimit = vi.fn(() => ({ single: existingSingle }))
    const existingGte = vi.fn(() => ({ limit: existingLimit }))
    const existingEq: any = vi.fn(() => ({ eq: existingEq, gte: existingGte }))

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'leads') {
          return {
            select: vi.fn(() => ({ eq: existingEq })),
            insert: vi.fn(() => ({ select: vi.fn(() => ({ single: insertSingle })) })),
          }
        }
        return singleMock(null)
      }),
    } as any)

    const { POST } = await import('@/app/api/leads/capture/route')
    const request = new Request('http://localhost/api/leads/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
      body: JSON.stringify({
        email: 'lead@test.com',
        company_name: 'TestCo',
        contact_name: 'John',
        business_issues: ['marketing'],
      }),
    }) as any

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.leadId).toBe('lead-1')
  })

  it('rejects missing email', async () => {
    const { POST } = await import('@/app/api/leads/capture/route')
    const request = new Request('http://localhost/api/leads/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.0.1' },
      body: JSON.stringify({ company_name: 'TestCo', business_issues: ['marketing'] }),
    }) as any

    const response = await POST(request)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Email')
  })

  it('rejects missing company_name', async () => {
    const { POST } = await import('@/app/api/leads/capture/route')
    const request = new Request('http://localhost/api/leads/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.0.2' },
      body: JSON.stringify({ email: 'test@test.com', business_issues: ['marketing'] }),
    }) as any

    const response = await POST(request)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Company name')
  })

  it('rejects invalid email format', async () => {
    const { POST } = await import('@/app/api/leads/capture/route')
    const request = new Request('http://localhost/api/leads/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.0.3' },
      body: JSON.stringify({ email: 'not-an-email', company_name: 'Co', business_issues: ['x'] }),
    }) as any

    const response = await POST(request)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Invalid email')
  })

  it('handles duplicate email within 24 hours', async () => {
    const existingSingle = vi.fn().mockResolvedValue({ data: { id: 'existing-lead' }, error: null })
    const existingLimit = vi.fn(() => ({ single: existingSingle }))
    const existingGte = vi.fn(() => ({ limit: existingLimit }))
    const existingEq: any = vi.fn(() => ({ eq: existingEq, gte: existingGte }))

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({ eq: existingEq })),
      })),
    } as any)

    const { POST } = await import('@/app/api/leads/capture/route')
    const request = new Request('http://localhost/api/leads/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.0.4' },
      body: JSON.stringify({ email: 'dup@test.com', company_name: 'DupCo', business_issues: ['ops'] }),
    }) as any

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.leadId).toBe('existing-lead')
    expect(data.message).toContain('already captured')
  })

  it('silently accepts honeypot submissions', async () => {
    const { POST } = await import('@/app/api/leads/capture/route')
    const request = new Request('http://localhost/api/leads/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.0.5' },
      body: JSON.stringify({ email: 'bot@spam.com', company_name: 'Bot', honeypot: 'gotcha', business_issues: ['x'] }),
    }) as any

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('rejects empty business_issues', async () => {
    const { POST } = await import('@/app/api/leads/capture/route')
    const request = new Request('http://localhost/api/leads/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.0.6' },
      body: JSON.stringify({ email: 'test@valid.com', company_name: 'Valid', business_issues: [] }),
    }) as any

    const response = await POST(request)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('business challenge')
  })

  it('accepts business_name as alias for company_name', async () => {
    const insertSingle = vi.fn().mockResolvedValue({ data: { id: 'lead-alias' }, error: null })
    const existingSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const existingLimit = vi.fn(() => ({ single: existingSingle }))
    const existingGte = vi.fn(() => ({ limit: existingLimit }))
    const existingEq: any = vi.fn(() => ({ eq: existingEq, gte: existingGte }))

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({ eq: existingEq })),
        insert: vi.fn(() => ({ select: vi.fn(() => ({ single: insertSingle })) })),
      })),
    } as any)

    const { POST } = await import('@/app/api/leads/capture/route')
    const request = new Request('http://localhost/api/leads/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.0.7' },
      body: JSON.stringify({ email: 'alias@test.com', business_name: 'AliasCo', business_issues: ['growth'] }),
    }) as any

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
