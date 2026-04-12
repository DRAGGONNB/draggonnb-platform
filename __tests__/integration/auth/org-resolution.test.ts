import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock modules before importing
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { getOrgId } from '@/lib/auth/get-user-org'

/**
 * Creates a chainable Supabase mock that mirrors the actual query chain:
 *   .from('organization_users').select('organization_id').eq(...).eq(...).limit(1).single()
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

function createMockClient(result: { data: unknown; error: unknown }) {
  const builder = createChainableBuilder(result)
  return {
    from: vi.fn(() => builder),
  } as any
}

describe('getOrgId - org resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the org when user has a membership', async () => {
    const mock = createMockClient({
      data: { organization_id: 'org-1' },
      error: null,
    })

    const result = await getOrgId(mock, 'user-1')
    expect(result).toBe('org-1')
  })

  it('queries organization_users table', async () => {
    const mock = createMockClient({
      data: { organization_id: 'org-1' },
      error: null,
    })

    await getOrgId(mock, 'user-1')
    expect(mock.from).toHaveBeenCalledWith('organization_users')
  })

  it('filters by user_id and is_active', async () => {
    const builder = createChainableBuilder({
      data: { organization_id: 'org-1' },
      error: null,
    })
    const mock = { from: vi.fn(() => builder) } as any

    await getOrgId(mock, 'user-1')
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(builder.eq).toHaveBeenCalledWith('is_active', true)
  })

  it('returns the first org (no tier priority selection)', async () => {
    // getOrgId uses .limit(1).single() so it returns whatever the DB gives first
    const mock = createMockClient({
      data: { organization_id: 'org-first' },
      error: null,
    })

    const result = await getOrgId(mock, 'user-1')
    expect(result).toBe('org-first')
  })

  it('returns null when user has no memberships', async () => {
    const userMock = createMockClient({
      data: null,
      error: { code: 'PGRST116', message: 'not found' },
    })

    // Also mock admin client to return empty
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(
      createMockClient({
        data: null,
        error: { code: 'PGRST116', message: 'not found' },
      }) as any
    )

    const result = await getOrgId(userMock, 'user-1')
    expect(result).toBeNull()
  })

  it('falls back to admin client when user client returns null', async () => {
    const userMock = createMockClient({
      data: null,
      error: { code: 'PGRST116', message: 'not found' },
    })

    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(
      createMockClient({
        data: { organization_id: 'org-admin-found' },
        error: null,
      }) as any
    )

    const result = await getOrgId(userMock, 'user-1')
    expect(result).toBe('org-admin-found')
  })

  it('returns null when admin client also fails', async () => {
    const userMock = createMockClient({
      data: null,
      error: { code: 'PGRST116', message: 'not found' },
    })

    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error('Admin client unavailable')
    })

    const result = await getOrgId(userMock, 'user-1')
    expect(result).toBeNull()
  })

  it('uses limit(1) and single() for the query', async () => {
    const builder = createChainableBuilder({
      data: { organization_id: 'org-1' },
      error: null,
    })
    const mock = { from: vi.fn(() => builder) } as any

    await getOrgId(mock, 'user-1')
    expect(builder.limit).toHaveBeenCalledWith(1)
    expect(builder.single).toHaveBeenCalled()
  })
})
