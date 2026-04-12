/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { testApiHandler } from 'next-test-api-route-handler'

// Mock Supabase server client (used by getRestaurantAuth)
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock Supabase admin client (used by most routes after auth)
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

// Mock Supabase service client (used by sessions, SOPs, SOP instances)
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a chainable mock table that resolves with the given result at terminal. */
function createMockQueryBuilder(result: { data: unknown; error: unknown; count?: number }) {
  const builder: any = {}
  // Make thenable so `await admin.from(...).select(...).eq(...)` resolves
  builder.then = (resolve: any) => resolve(result)
  // Terminal methods
  builder.single = vi.fn().mockResolvedValue(result)
  builder.maybeSingle = vi.fn().mockResolvedValue(result)
  // Chainable methods — all return the same builder (self-referencing)
  const methods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'gte', 'lte', 'gt', 'lt', 'like', 'ilike', 'is', 'not', 'in', 'contains', 'containedBy', 'filter', 'or', 'order', 'limit', 'range', 'match', 'textSearch']
  for (const m of methods) {
    builder[m] = vi.fn().mockReturnValue(builder)
  }
  return builder
}

function createMockTable(result: { data: unknown; error: unknown } = { data: [], error: null }) {
  return createMockQueryBuilder(result)
}

/**
 * Sets up mocks so getRestaurantAuth resolves to an authenticated user.
 * Uses the organization_users junction table pattern.
 */
async function mockAuthenticatedUser(orgId = 'test-org-id', userId = 'test-user-id') {
  const { createClient } = await import('@/lib/supabase/server')
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId, email: 'test@test.com' } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'organization_users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(function (this: any) { return this }),
            limit: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { organization_id: orgId },
                error: null,
              }),
            })),
          })),
        }
      }
      return createMockTable()
    }),
  } as any)
}

async function mockUnauthenticatedUser() {
  const { createClient } = await import('@/lib/supabase/server')
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      }),
    },
  } as any)
}

async function mockUserNoOrg() {
  const { createClient } = await import('@/lib/supabase/server')
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@test.com' } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'organization_users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(function (this: any) { return this }),
            limit: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'No org' },
              }),
            })),
          })),
        }
      }
      return createMockTable()
    }),
  } as any)
  // Also mock admin client for the fallback path in getOrgId
  const { createAdminClient } = await import('@/lib/supabase/admin')
  vi.mocked(createAdminClient).mockReturnValue({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(function (this: any) { return this }),
        limit: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'No org' },
          }),
        })),
      })),
    })),
  } as any)
}

async function mockAdminClient(tableMap: Record<string, { data: unknown; error: unknown }> = {}) {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  vi.mocked(createAdminClient).mockReturnValue({
    from: vi.fn((table: string) => {
      if (tableMap[table]) return createMockTable(tableMap[table])
      return createMockTable()
    }),
  } as any)
}

async function mockServiceClient(tableMap: Record<string, { data: unknown; error: unknown }> = {}) {
  const { createServiceClient } = await import('@/lib/supabase/service')
  vi.mocked(createServiceClient).mockReturnValue({
    from: vi.fn((table: string) => {
      if (tableMap[table]) return createMockTable(tableMap[table])
      return createMockTable()
    }),
  } as any)
}

// ===========================================================================
// Tests
// ===========================================================================

describe('Restaurant Module API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Menu ─────────────────────────────────────────────────────────────────

  describe('GET /api/restaurant/menu', () => {
    it('returns 401 when unauthenticated', async () => {
      await mockUnauthenticatedUser()
      const menuRoute = await import('@/app/api/restaurant/menu/route')

      await testApiHandler({
        appHandler: menuRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(401)
          const body = await res.json()
          expect(body.error).toBe('Unauthorized')
        },
      })
    })

    it('returns 400 when no organization', async () => {
      await mockUserNoOrg()
      const menuRoute = await import('@/app/api/restaurant/menu/route')

      await testApiHandler({
        appHandler: menuRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('Organization not found')
        },
      })
    })

    it('returns 400 when restaurant_id missing', async () => {
      await mockAuthenticatedUser()
      await mockAdminClient()
      const menuRoute = await import('@/app/api/restaurant/menu/route')

      await testApiHandler({
        appHandler: menuRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('restaurant_id required')
        },
      })
    })

    it('returns items list for type=items', async () => {
      await mockAuthenticatedUser()
      const mockItems = [{ id: '1', name: 'Burger', price: 99 }]
      await mockAdminClient({ menu_items: { data: mockItems, error: null } })
      const menuRoute = await import('@/app/api/restaurant/menu/route')

      await testApiHandler({
        appHandler: menuRoute as any,
        url: '/api/restaurant/menu?restaurant_id=r1&type=items',
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(200)
          const body = await res.json()
          expect(body.items).toBeDefined()
        },
      })
    })

    it('returns categories for type=categories', async () => {
      await mockAuthenticatedUser()
      const mockCats = [{ id: 'c1', name: 'Mains', menu_items: [] }]
      await mockAdminClient({ menu_categories: { data: mockCats, error: null } })
      const menuRoute = await import('@/app/api/restaurant/menu/route')

      await testApiHandler({
        appHandler: menuRoute as any,
        url: '/api/restaurant/menu?restaurant_id=r1&type=categories',
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(200)
          const body = await res.json()
          expect(body.categories).toBeDefined()
        },
      })
    })
  })

  describe('POST /api/restaurant/menu', () => {
    it('returns 401 when unauthenticated', async () => {
      await mockUnauthenticatedUser()
      const menuRoute = await import('@/app/api/restaurant/menu/route')

      await testApiHandler({
        appHandler: menuRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Test' }),
          })
          expect(res.status).toBe(401)
        },
      })
    })

    it('returns 422 when item schema invalid (missing name)', async () => {
      await mockAuthenticatedUser()
      await mockAdminClient()
      const menuRoute = await import('@/app/api/restaurant/menu/route')

      await testApiHandler({
        appHandler: menuRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ restaurant_id: '550e8400-e29b-41d4-a716-446655440000', price: 50 }),
          })
          expect(res.status).toBe(422)
        },
      })
    })

    it('creates a menu item with valid data', async () => {
      await mockAuthenticatedUser()
      const mockItem = { id: 'item-1', name: 'Fish & Chips', price: 125 }
      await mockAdminClient({ menu_items: { data: mockItem, error: null } })
      const menuRoute = await import('@/app/api/restaurant/menu/route')

      await testApiHandler({
        appHandler: menuRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              restaurant_id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Fish & Chips',
              price: 125,
            }),
          })
          expect(res.status).toBe(201)
          const body = await res.json()
          expect(body.item).toBeDefined()
        },
      })
    })

    it('creates a menu category when type=category', async () => {
      await mockAuthenticatedUser()
      const mockCat = { id: 'cat-1', name: 'Starters' }
      await mockAdminClient({ menu_categories: { data: mockCat, error: null } })
      const menuRoute = await import('@/app/api/restaurant/menu/route')

      await testApiHandler({
        appHandler: menuRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'category',
              restaurant_id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Starters',
            }),
          })
          expect(res.status).toBe(201)
          const body = await res.json()
          expect(body.category).toBeDefined()
        },
      })
    })
  })

  describe('PATCH /api/restaurant/menu', () => {
    it('returns 400 when id missing', async () => {
      await mockAuthenticatedUser()
      await mockAdminClient()
      const menuRoute = await import('@/app/api/restaurant/menu/route')

      await testApiHandler({
        appHandler: menuRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Updated' }),
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('id required')
        },
      })
    })

    it('updates a menu item', async () => {
      await mockAuthenticatedUser()
      const mockItem = { id: 'item-1', name: 'Updated Name', price: 150 }
      await mockAdminClient({ menu_items: { data: mockItem, error: null } })
      const menuRoute = await import('@/app/api/restaurant/menu/route')

      await testApiHandler({
        appHandler: menuRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: 'item-1', name: 'Updated Name' }),
          })
          expect(res.status).toBe(200)
          const body = await res.json()
          expect(body.item).toBeDefined()
        },
      })
    })
  })

  // ─── Staff ────────────────────────────────────────────────────────────────

  describe('GET /api/restaurant/staff', () => {
    it('returns 401 when unauthenticated', async () => {
      await mockUnauthenticatedUser()
      const staffRoute = await import('@/app/api/restaurant/staff/route')

      await testApiHandler({
        appHandler: staffRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(401)
        },
      })
    })

    it('returns staff list', async () => {
      await mockAuthenticatedUser()
      const mockStaff = [
        { id: 's1', display_name: 'Alice', role: 'server', is_active: true },
        { id: 's2', display_name: 'Bob', role: 'chef', is_active: true },
      ]
      await mockAdminClient({ restaurant_staff: { data: mockStaff, error: null } })
      const staffRoute = await import('@/app/api/restaurant/staff/route')

      await testApiHandler({
        appHandler: staffRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(200)
          const body = await res.json()
          expect(body.staff).toBeDefined()
        },
      })
    })
  })

  describe('POST /api/restaurant/staff', () => {
    it('returns 422 when schema invalid', async () => {
      await mockAuthenticatedUser()
      await mockAdminClient()
      const staffRoute = await import('@/app/api/restaurant/staff/route')

      await testApiHandler({
        appHandler: staffRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ display_name: 'Alice' }), // missing restaurant_id, role
          })
          expect(res.status).toBe(422)
        },
      })
    })

    it('creates staff member with valid data', async () => {
      await mockAuthenticatedUser()
      const mockStaff = { id: 's1', display_name: 'Alice', role: 'server', is_active: true }
      await mockAdminClient({ restaurant_staff: { data: mockStaff, error: null } })
      const staffRoute = await import('@/app/api/restaurant/staff/route')

      await testApiHandler({
        appHandler: staffRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              restaurant_id: '550e8400-e29b-41d4-a716-446655440000',
              display_name: 'Alice',
              role: 'server',
            }),
          })
          expect(res.status).toBe(201)
          const body = await res.json()
          expect(body.staff).toBeDefined()
          expect(body.staff.display_name).toBe('Alice')
        },
      })
    })
  })

  // ─── Staff Public ─────────────────────────────────────────────────────────

  describe('GET /api/restaurant/staff/public', () => {
    it('returns 400 when restaurant_id missing', async () => {
      const publicRoute = await import('@/app/api/restaurant/staff/public/route')

      // Mock admin client for public route
      await mockAdminClient()

      await testApiHandler({
        appHandler: publicRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('restaurant_id required')
        },
      })
    })

    it('returns staff list without auth (public endpoint)', async () => {
      const mockStaff = [
        { id: 's1', display_name: 'Alice', role: 'server' },
        { id: 's2', display_name: 'Bob', role: 'chef' },
      ]
      await mockAdminClient({ restaurant_staff: { data: mockStaff, error: null } })
      const publicRoute = await import('@/app/api/restaurant/staff/public/route')

      await testApiHandler({
        appHandler: publicRoute as any,
        url: '/api/restaurant/staff/public?restaurant_id=r1',
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(200)
          const body = await res.json()
          expect(body.staff).toHaveLength(2)
          expect(body.staff[0].display_name).toBeDefined()
          expect(body.staff[0].role).toBeDefined()
        },
      })
    })
  })

  // ─── Reservations ─────────────────────────────────────────────────────────

  describe('GET /api/restaurant/reservations', () => {
    it('returns 401 when unauthenticated', async () => {
      await mockUnauthenticatedUser()
      const resRoute = await import('@/app/api/restaurant/reservations/route')

      await testApiHandler({
        appHandler: resRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(401)
        },
      })
    })

    it('returns reservations list', async () => {
      await mockAuthenticatedUser()
      const mockReservations = [
        { id: 'r1', reservation_date: '2026-04-12', reservation_time: '19:00', party_size: 4 },
      ]
      await mockAdminClient({ reservations: { data: mockReservations, error: null } })
      const resRoute = await import('@/app/api/restaurant/reservations/route')

      await testApiHandler({
        appHandler: resRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(200)
          const body = await res.json()
          expect(body.reservations).toBeDefined()
        },
      })
    })
  })

  describe('POST /api/restaurant/reservations', () => {
    it('returns 422 when schema invalid', async () => {
      await mockAuthenticatedUser()
      await mockAdminClient()
      const resRoute = await import('@/app/api/restaurant/reservations/route')

      await testApiHandler({
        appHandler: resRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ party_size: 4 }), // missing required fields
          })
          expect(res.status).toBe(422)
        },
      })
    })

    it('creates reservation with valid data', async () => {
      await mockAuthenticatedUser()
      const mockRes = {
        id: 'res-1',
        reservation_date: '2026-04-15',
        reservation_time: '19:00',
        party_size: 4,
      }
      await mockAdminClient({ reservations: { data: mockRes, error: null } })
      const resRoute = await import('@/app/api/restaurant/reservations/route')

      await testApiHandler({
        appHandler: resRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              restaurant_id: '550e8400-e29b-41d4-a716-446655440000',
              reservation_date: '2026-04-15',
              reservation_time: '19:00',
              party_size: 4,
            }),
          })
          expect(res.status).toBe(201)
          const body = await res.json()
          expect(body.reservation).toBeDefined()
        },
      })
    })

    it('returns 400 when no organization', async () => {
      await mockUserNoOrg()
      const resRoute = await import('@/app/api/restaurant/reservations/route')

      await testApiHandler({
        appHandler: resRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              restaurant_id: '550e8400-e29b-41d4-a716-446655440000',
              reservation_date: '2026-04-15',
              reservation_time: '19:00',
              party_size: 4,
            }),
          })
          expect(res.status).toBe(400)
        },
      })
    })
  })

  // ─── Sessions ─────────────────────────────────────────────────────────────

  describe('POST /api/restaurant/sessions', () => {
    it('returns 400 when table_id or party_size missing', async () => {
      await mockServiceClient()
      const sessRoute = await import('@/app/api/restaurant/sessions/route')

      await testApiHandler({
        appHandler: sessRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ party_size: 2 }), // missing table_id
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('table_id and party_size are required')
        },
      })
    })

    it('returns 409 when table has active session', async () => {
      const { createServiceClient } = await import('@/lib/supabase/service')
      vi.mocked(createServiceClient).mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'table_sessions') {
            return createMockQueryBuilder({
              data: { id: 'existing-session' },
              error: null,
            })
          }
          return createMockTable()
        }),
      } as any)

      const sessRoute = await import('@/app/api/restaurant/sessions/route')

      await testApiHandler({
        appHandler: sessRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              table_id: '550e8400-e29b-41d4-a716-446655440000',
              party_size: 4,
            }),
          })
          expect(res.status).toBe(409)
          const body = await res.json()
          expect(body.error).toBe('Table already has an active session')
        },
      })
    })

    it('returns 404 when table not found', async () => {
      const { createServiceClient } = await import('@/lib/supabase/service')
      vi.mocked(createServiceClient).mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'table_sessions') {
            return createMockQueryBuilder({ data: null, error: null })
          }
          if (table === 'restaurant_tables') {
            return createMockQueryBuilder({ data: null, error: null })
          }
          return createMockTable()
        }),
      } as any)

      const sessRoute = await import('@/app/api/restaurant/sessions/route')

      await testApiHandler({
        appHandler: sessRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              table_id: '550e8400-e29b-41d4-a716-446655440000',
              party_size: 4,
            }),
          })
          expect(res.status).toBe(404)
          const body = await res.json()
          expect(body.error).toBe('Table not found')
        },
      })
    })
  })

  // ─── Auth PIN ─────────────────────────────────────────────────────────────

  describe('POST /api/restaurant/auth/pin', () => {
    it('returns 400 for invalid JSON', async () => {
      await mockAdminClient()
      const pinRoute = await import('@/app/api/restaurant/auth/pin/route')

      await testApiHandler({
        appHandler: pinRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: 'not-json',
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('Invalid JSON')
        },
      })
    })

    it('returns 400 when staff_id or pin missing', async () => {
      await mockAdminClient()
      const pinRoute = await import('@/app/api/restaurant/auth/pin/route')

      await testApiHandler({
        appHandler: pinRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staff_id: 's1' }), // missing pin
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('Missing fields')
        },
      })
    })

    it('returns 400 when field types invalid', async () => {
      await mockAdminClient()
      const pinRoute = await import('@/app/api/restaurant/auth/pin/route')

      await testApiHandler({
        appHandler: pinRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staff_id: 123, pin: 456 }), // numbers, not strings
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('Invalid field types')
        },
      })
    })

    it('returns 404 when staff not found', async () => {
      await mockAdminClient({ restaurant_staff: { data: null, error: null } })
      const pinRoute = await import('@/app/api/restaurant/auth/pin/route')

      await testApiHandler({
        appHandler: pinRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staff_id: 'non-existent', pin: '1234' }),
          })
          expect(res.status).toBe(404)
          const body = await res.json()
          expect(body.error).toBe('Staff not found')
        },
      })
    })

    it('returns 401 when PIN incorrect', async () => {
      const crypto = require('crypto')
      const correctHash = crypto.createHash('sha256').update('9999').digest('hex')
      await mockAdminClient({
        restaurant_staff: {
          data: { id: 's1', display_name: 'Alice', role: 'server', pin_hash: correctHash, is_active: true },
          error: null,
        },
      })
      const pinRoute = await import('@/app/api/restaurant/auth/pin/route')

      await testApiHandler({
        appHandler: pinRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staff_id: 's1', pin: '1234' }), // wrong PIN
          })
          expect(res.status).toBe(401)
          const body = await res.json()
          expect(body.error).toBe('Incorrect PIN')
        },
      })
    })

    it('returns staff data on correct PIN', async () => {
      const crypto = require('crypto')
      const pinHash = crypto.createHash('sha256').update('1234').digest('hex')
      await mockAdminClient({
        restaurant_staff: {
          data: { id: 's1', display_name: 'Alice', role: 'server', pin_hash: pinHash, is_active: true },
          error: null,
        },
      })
      const pinRoute = await import('@/app/api/restaurant/auth/pin/route')

      await testApiHandler({
        appHandler: pinRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staff_id: 's1', pin: '1234' }),
          })
          expect(res.status).toBe(200)
          const body = await res.json()
          expect(body.staff).toBeDefined()
          expect(body.staff.id).toBe('s1')
          expect(body.staff.display_name).toBe('Alice')
          expect(body.staff.role).toBe('server')
          // pin_hash must NOT be exposed
          expect(body.staff.pin_hash).toBeUndefined()
        },
      })
    })
  })

  // ─── SOPs ─────────────────────────────────────────────────────────────────

  describe('POST /api/restaurant/sops', () => {
    it('returns 400 when title missing', async () => {
      await mockServiceClient()
      const sopRoute = await import('@/app/api/restaurant/sops/route')

      await testApiHandler({
        appHandler: sopRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('title is required')
        },
      })
    })

    it('returns 400 when blocks format but no blocks array', async () => {
      await mockServiceClient()
      const sopRoute = await import('@/app/api/restaurant/sops/route')

      await testApiHandler({
        appHandler: sopRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Opening SOP', sop_format: 'blocks' }),
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toContain('blocks array is required')
        },
      })
    })

    it('creates a text SOP', async () => {
      const mockSop = { id: 'sop-1', title: 'Cleaning SOP', sop_format: 'text', content: 'Step 1...' }
      await mockServiceClient({ restaurant_sops: { data: mockSop, error: null } })
      const sopRoute = await import('@/app/api/restaurant/sops/route')

      await testApiHandler({
        appHandler: sopRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Cleaning SOP', content: 'Step 1...' }),
          })
          expect(res.status).toBe(200) // This route returns 200 not 201
          const body = await res.json()
          expect(body.sop).toBeDefined()
          expect(body.sop.title).toBe('Cleaning SOP')
          expect(body.blocks).toBeNull()
        },
      })
    })
  })

  // ─── SOP Instances ────────────────────────────────────────────────────────

  describe('POST /api/restaurant/sops/instances', () => {
    it('returns 400 when sop_id missing', async () => {
      await mockServiceClient()
      const instRoute = await import('@/app/api/restaurant/sops/instances/route')

      await testApiHandler({
        appHandler: instRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('sop_id is required')
        },
      })
    })

    it('returns 404 when SOP not found', async () => {
      await mockServiceClient({ restaurant_sops: { data: null, error: null } })
      const instRoute = await import('@/app/api/restaurant/sops/instances/route')

      await testApiHandler({
        appHandler: instRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sop_id: 'non-existent' }),
          })
          expect(res.status).toBe(404)
          const body = await res.json()
          expect(body.error).toBe('SOP not found')
        },
      })
    })

    it('returns 400 when SOP is not block-based', async () => {
      await mockServiceClient({
        restaurant_sops: { data: { id: 'sop-1', title: 'Text SOP', sop_format: 'text' }, error: null },
      })
      const instRoute = await import('@/app/api/restaurant/sops/instances/route')

      await testApiHandler({
        appHandler: instRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sop_id: 'sop-1' }),
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('Only block-based SOPs can have instances')
        },
      })
    })
  })

  // ─── Temperature Logs ─────────────────────────────────────────────────────

  describe('GET /api/restaurant/temp-log', () => {
    it('returns 401 when unauthenticated', async () => {
      await mockUnauthenticatedUser()
      const tempRoute = await import('@/app/api/restaurant/temp-log/route')

      await testApiHandler({
        appHandler: tempRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(401)
        },
      })
    })

    it('returns logs list', async () => {
      await mockAuthenticatedUser()
      const mockLogs = [
        { id: 'l1', equipment_name: 'Main Fridge', temperature: 4, status: 'ok' },
      ]
      await mockAdminClient({ temp_logs: { data: mockLogs, error: null } })
      const tempRoute = await import('@/app/api/restaurant/temp-log/route')

      await testApiHandler({
        appHandler: tempRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(200)
          const body = await res.json()
          expect(body.logs).toBeDefined()
        },
      })
    })
  })

  describe('POST /api/restaurant/temp-log', () => {
    it('returns 422 when schema invalid', async () => {
      await mockAuthenticatedUser()
      await mockAdminClient()
      const tempRoute = await import('@/app/api/restaurant/temp-log/route')

      await testApiHandler({
        appHandler: tempRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ temperature: 4 }), // missing required fields
          })
          expect(res.status).toBe(422)
        },
      })
    })

    it('creates a temp log with valid data', async () => {
      await mockAuthenticatedUser()
      const mockLog = {
        id: 'l1',
        equipment_name: 'Main Fridge',
        equipment_type: 'fridge',
        temperature: 4,
        status: 'ok',
      }
      await mockAdminClient({ temp_logs: { data: mockLog, error: null } })
      const tempRoute = await import('@/app/api/restaurant/temp-log/route')

      await testApiHandler({
        appHandler: tempRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              restaurant_id: '550e8400-e29b-41d4-a716-446655440000',
              equipment_name: 'Main Fridge',
              equipment_type: 'fridge',
              temperature: 4,
            }),
          })
          expect(res.status).toBe(201)
          const body = await res.json()
          expect(body.log).toBeDefined()
          expect(body.status).toBeDefined()
        },
      })
    })

    it('returns 401 when unauthenticated', async () => {
      await mockUnauthenticatedUser()
      const tempRoute = await import('@/app/api/restaurant/temp-log/route')

      await testApiHandler({
        appHandler: tempRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              restaurant_id: '550e8400-e29b-41d4-a716-446655440000',
              equipment_name: 'Main Fridge',
              equipment_type: 'fridge',
              temperature: 4,
            }),
          })
          expect(res.status).toBe(401)
        },
      })
    })
  })

  // ─── Tables ───────────────────────────────────────────────────────────────

  describe('GET /api/restaurant/tables', () => {
    it('returns 401 when unauthenticated', async () => {
      await mockUnauthenticatedUser()
      const tablesRoute = await import('@/app/api/restaurant/tables/route')

      await testApiHandler({
        appHandler: tablesRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(401)
        },
      })
    })

    it('returns tables list with active session annotation', async () => {
      await mockAuthenticatedUser()
      const mockTables = [
        {
          id: 't1', label: 'Table 1', section: 'indoor', is_active: true,
          table_sessions: [{ id: 'sess-1', status: 'open' }],
        },
        {
          id: 't2', label: 'Table 2', section: 'deck', is_active: true,
          table_sessions: [],
        },
      ]
      await mockAdminClient({ restaurant_tables: { data: mockTables, error: null } })
      const tablesRoute = await import('@/app/api/restaurant/tables/route')

      await testApiHandler({
        appHandler: tablesRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(200)
          const body = await res.json()
          expect(body.tables).toBeDefined()
        },
      })
    })
  })

  describe('POST /api/restaurant/tables', () => {
    it('returns 422 when schema invalid', async () => {
      await mockAuthenticatedUser()
      await mockAdminClient()
      const tablesRoute = await import('@/app/api/restaurant/tables/route')

      await testApiHandler({
        appHandler: tablesRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ capacity: 4 }), // missing restaurant_id, label
          })
          expect(res.status).toBe(422)
        },
      })
    })

    it('creates table with valid data', async () => {
      await mockAuthenticatedUser()
      const mockTable = { id: 't-new', label: 'Table 10', qr_token: 'abc123' }
      const mockRestaurant = { slug: 'the-lookout' }
      const { createAdminClient } = await import('@/lib/supabase/admin')
      vi.mocked(createAdminClient).mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'restaurants') {
            return createMockQueryBuilder({ data: mockRestaurant, error: null })
          }
          if (table === 'restaurant_tables') {
            const builder = createMockQueryBuilder({ data: mockTable, error: null })
            builder.update = vi.fn().mockReturnValue(createMockQueryBuilder({ data: mockTable, error: null }))
            return builder
          }
          return createMockTable()
        }),
      } as any)

      const tablesRoute = await import('@/app/api/restaurant/tables/route')

      await testApiHandler({
        appHandler: tablesRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              restaurant_id: '550e8400-e29b-41d4-a716-446655440000',
              label: 'Table 10',
            }),
          })
          expect(res.status).toBe(201)
          const body = await res.json()
          expect(body.table).toBeDefined()
        },
      })
    })
  })

  describe('PATCH /api/restaurant/tables', () => {
    it('returns 400 when id missing', async () => {
      await mockAuthenticatedUser()
      await mockAdminClient()
      const tablesRoute = await import('@/app/api/restaurant/tables/route')

      await testApiHandler({
        appHandler: tablesRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label: 'New Label' }),
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('id required')
        },
      })
    })

    it('updates table with valid data', async () => {
      await mockAuthenticatedUser()
      const mockTable = { id: 't1', label: 'Updated Label' }
      await mockAdminClient({ restaurant_tables: { data: mockTable, error: null } })
      const tablesRoute = await import('@/app/api/restaurant/tables/route')

      await testApiHandler({
        appHandler: tablesRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: 't1', label: 'Updated Label' }),
          })
          expect(res.status).toBe(200)
          const body = await res.json()
          expect(body.table).toBeDefined()
        },
      })
    })
  })

  // ─── Bill Items ───────────────────────────────────────────────────────────

  describe('POST /api/restaurant/bills/items', () => {
    it('returns 401 when unauthenticated', async () => {
      await mockUnauthenticatedUser()
      const billItemsRoute = await import('@/app/api/restaurant/bills/items/route')

      await testApiHandler({
        appHandler: billItemsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
          expect(res.status).toBe(401)
        },
      })
    })

    it('returns 422 when schema invalid', async () => {
      await mockAuthenticatedUser()
      await mockAdminClient()
      const billItemsRoute = await import('@/app/api/restaurant/bills/items/route')

      await testApiHandler({
        appHandler: billItemsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: 1 }), // missing session_id, menu_item_id
          })
          expect(res.status).toBe(422)
        },
      })
    })
  })

  describe('DELETE /api/restaurant/bills/items', () => {
    it('returns 401 when unauthenticated', async () => {
      await mockUnauthenticatedUser()
      const billItemsRoute = await import('@/app/api/restaurant/bills/items/route')

      await testApiHandler({
        appHandler: billItemsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
          expect(res.status).toBe(401)
        },
      })
    })

    it('returns 422 when void schema invalid', async () => {
      await mockAuthenticatedUser()
      await mockAdminClient()
      const billItemsRoute = await import('@/app/api/restaurant/bills/items/route')

      await testApiHandler({
        appHandler: billItemsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item_id: '550e8400-e29b-41d4-a716-446655440000' }), // missing void_reason
          })
          expect(res.status).toBe(422)
        },
      })
    })
  })

  // ─── Service auth (N8N bearer token) ──────────────────────────────────────

  describe('Service role auth (N8N pattern)', () => {
    it('allows access with valid service role Bearer token + x-tenant-id', async () => {
      const originalEnv = process.env.SUPABASE_SERVICE_ROLE_KEY
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'

      // Mock createClient to return a client that passes service auth
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('no session'), // doesn't matter -- service auth is checked first
          }),
        },
        from: vi.fn(() => createMockTable()),
      } as any)

      await mockAdminClient({
        temp_logs: {
          data: [{ id: 'l1', equipment_name: 'Fridge', temperature: 3, status: 'ok' }],
          error: null,
        },
      })

      const tempRoute = await import('@/app/api/restaurant/temp-log/route')

      await testApiHandler({
        appHandler: tempRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'GET',
            headers: {
              Authorization: 'Bearer test-service-key',
              'x-tenant-id': 'service-org-id',
            },
          })
          expect(res.status).toBe(200)
          const body = await res.json()
          expect(body.logs).toBeDefined()
        },
      })

      process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv
    })

    it('rejects invalid service role token and falls back to user auth', async () => {
      const originalEnv = process.env.SUPABASE_SERVICE_ROLE_KEY
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'real-key'

      await mockUnauthenticatedUser()

      const tempRoute = await import('@/app/api/restaurant/temp-log/route')

      await testApiHandler({
        appHandler: tempRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'GET',
            headers: {
              Authorization: 'Bearer wrong-key',
              'x-tenant-id': 'org-id',
            },
          })
          expect(res.status).toBe(401) // falls back to user auth, which fails
        },
      })

      process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv
    })
  })
})
