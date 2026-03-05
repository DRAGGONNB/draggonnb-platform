import { vi, expect } from 'vitest'
import { testApiHandler } from 'next-test-api-route-handler'

/**
 * Test that an API route returns 401 when user is not authenticated
 */
export async function testAuthRequired(
  routeModule: Record<string, unknown>,
  method: string = 'GET',
  body?: Record<string, unknown>
) {
  const { createClient } = await import('@/lib/supabase/server')
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      }),
    },
  } as any)

  await testApiHandler({
    appHandler: routeModule as any,
    test: async ({ fetch }) => {
      const options: RequestInit = { method }
      if (body) {
        options.headers = { 'Content-Type': 'application/json' }
        options.body = JSON.stringify(body)
      }
      const response = await fetch(options)
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    },
  })
}

/**
 * Test that an API route returns 400 when user has no organization
 */
export async function testOrgRequired(
  routeModule: Record<string, unknown>,
  method: string = 'GET',
  body?: Record<string, unknown>
) {
  const { createClient } = await import('@/lib/supabase/server')
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'User not found' },
              }),
            })),
          })),
        }
      }
      return {}
    }),
  } as any)

  await testApiHandler({
    appHandler: routeModule as any,
    test: async ({ fetch }) => {
      const options: RequestInit = { method }
      if (body) {
        options.headers = { 'Content-Type': 'application/json' }
        options.body = JSON.stringify(body)
      }
      const response = await fetch(options)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Organization')
    },
  })
}

/**
 * Setup auth mock with a specific user and organization
 */
export function setupAuthMock(userId: string = 'test-user-id', orgId: string = 'test-org-id') {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId, email: `${userId}@test.co.za` } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: userId, organization_id: orgId },
                error: null,
              }),
            })),
          })),
        }
      }
      // Return a flexible chainable mock for other tables
      return createChainableMock()
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
}

/**
 * Create a chainable Supabase mock for any table
 */
export function createChainableMock(data: unknown = [], count: number = 0) {
  const rangeMock = vi.fn().mockResolvedValue({ data, error: null, count })
  const orderMock = vi.fn(() => ({ range: rangeMock, limit: vi.fn(() => ({ data, error: null })) }))
  const eqMock: any = vi.fn(() => ({
    single: vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] : data, error: null }),
    order: orderMock,
    eq: eqMock,
    limit: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] : data, error: null }) })),
    or: vi.fn().mockResolvedValue({ data, error: null, count }),
    ilike: vi.fn(() => ({
      order: orderMock,
      eq: eqMock,
    })),
  }))

  return {
    select: vi.fn(() => ({
      eq: eqMock,
      order: orderMock,
      ilike: vi.fn(() => ({ eq: eqMock, order: orderMock })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: Array.isArray(data) ? data[0] : data || { id: 'new-id' },
          error: null,
        }),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: Array.isArray(data) ? data[0] : data || { id: 'updated-id' },
            error: null,
          }),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }
}

/**
 * Assert a JSON error response
 */
export async function expectJsonError(
  response: Response,
  status: number,
  messageContains?: string
) {
  expect(response.status).toBe(status)
  const data = await response.json()
  expect(data.error).toBeDefined()
  if (messageContains) {
    expect(data.error.toLowerCase()).toContain(messageContains.toLowerCase())
  }
  return data
}
