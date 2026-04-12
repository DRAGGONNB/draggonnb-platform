/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { testApiHandler } from 'next-test-api-route-handler'

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock Supabase admin client
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  })),
}))

// Mock Telegram ops bot (used by task-assignments)
vi.mock('@/lib/accommodation/telegram/ops-bot', () => ({
  sendHousekeepingTask: vi.fn(),
  sendMaintenanceRequest: vi.fn(),
  getChannelConfig: vi.fn().mockResolvedValue(null),
}))

// Mock AI agents (used by generate-quote and concierge)
vi.mock('@/lib/accommodation/agents/quoter-agent', () => ({
  QuoterAgent: vi.fn().mockImplementation(() => ({
    generateQuote: vi.fn().mockResolvedValue({
      sessionId: 'session-123',
      result: { quote_text: 'Test quote', total: 1500 },
      tokensUsed: 100,
      status: 'completed',
    }),
  })),
}))

vi.mock('@/lib/accommodation/agents/concierge-agent', () => ({
  ConciergeAgent: vi.fn().mockImplementation(() => ({
    handleMessage: vi.fn().mockResolvedValue({
      sessionId: 'session-456',
      result: { response: 'Hello, how can I help?' },
      tokensUsed: 50,
      status: 'completed',
    }),
  })),
}))

// ---------------------------------------------------------------------------
// Helpers: mock Supabase client for accommodation auth flow
// ---------------------------------------------------------------------------

/**
 * Build a mock Supabase client that passes the accommodation auth flow.
 * The `tableOverrides` param lets each test customize specific table responses.
 */
function buildAuthenticatedMock(tableOverrides: Record<string, any> = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      // Auth flow tables
      if (table === 'users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'test-user-id', organization_id: 'test-org-id' },
                error: null,
              }),
            })),
          })),
        }
      }
      if (table === 'organizations') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'test-org-id', subscription_tier: 'growth' },
                error: null,
              }),
            })),
          })),
        }
      }
      // Custom table override
      if (tableOverrides[table]) {
        return tableOverrides[table]
      }
      // Default chainable mock (returns empty data for any query chain)
      return buildDefaultChain()
    }),
  } as any
}

function buildUnauthenticatedMock() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      }),
    },
  } as any
}

function buildNoOrgMock() {
  return {
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
                error: { message: 'Not found' },
              }),
            })),
          })),
        }
      }
      return {}
    }),
  } as any
}

function buildCoreTierMock() {
  return {
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
                data: { id: 'test-user-id', organization_id: 'core-org' },
                error: null,
              }),
            })),
          })),
        }
      }
      if (table === 'organizations') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'core-org', subscription_tier: 'core' },
                error: null,
              }),
            })),
          })),
        }
      }
      return {}
    }),
  } as any
}

/** Default chainable mock -- handles select/insert/eq/order/or/not/in/gte/lte/limit/range/single */
function buildDefaultChain(data: any = [], opts: { count?: number; error?: any } = {}) {
  const terminalResult = { data, error: opts.error || null, count: opts.count ?? 0 }
  const chain: any = {}
  const methods = [
    'select', 'insert', 'eq', 'order', 'or', 'not', 'in', 'gte', 'lte',
    'limit', 'range', 'ilike', 'is',
  ]
  for (const m of methods) {
    chain[m] = vi.fn(() => chain)
  }
  chain.single = vi.fn().mockResolvedValue(terminalResult)
  // Make chain itself thenable (for queries that don't call .single())
  chain.then = (resolve: any) => resolve(terminalResult)
  return chain
}

function buildInsertChain(data: any, error: any = null) {
  return {
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data, error }),
      })),
    })),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Accommodation API - Full Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  // =========================================================================
  // 1. Properties
  // =========================================================================
  describe('Properties /api/accommodation/properties', () => {
    it('GET returns 401 when unauthenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildUnauthenticatedMock())

      const propertiesRoute = await import('@/app/api/accommodation/properties/route')
      await testApiHandler({
        appHandler: propertiesRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(401)
          const body = await res.json()
          expect(body.error).toBe('Unauthorized')
        },
      })
    })

    it('GET returns 400 when user has no organization', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildNoOrgMock())

      const propertiesRoute = await import('@/app/api/accommodation/properties/route')
      await testApiHandler({
        appHandler: propertiesRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('Organization not found')
        },
      })
    })

    it('GET returns 403 for core tier', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildCoreTierMock())

      const propertiesRoute = await import('@/app/api/accommodation/properties/route')
      await testApiHandler({
        appHandler: propertiesRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(403)
          const body = await res.json()
          expect(body.upgradeRequired).toBeDefined()
        },
      })
    })

    it('GET returns empty properties list', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          accommodation_properties: buildDefaultChain([], { count: 0 }),
        })
      )

      const propertiesRoute = await import('@/app/api/accommodation/properties/route')
      await testApiHandler({
        appHandler: propertiesRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(200)
          const body = await res.json()
          expect(body.properties).toEqual([])
          expect(body.total).toBe(0)
        },
      })
    })

    it('POST returns 400 when name is missing', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildAuthenticatedMock())

      const propertiesRoute = await import('@/app/api/accommodation/properties/route')
      await testApiHandler({
        appHandler: propertiesRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'hotel' }),
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toContain('Name')
        },
      })
    })

    it('POST returns 400 when type is missing', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildAuthenticatedMock())

      const propertiesRoute = await import('@/app/api/accommodation/properties/route')
      await testApiHandler({
        appHandler: propertiesRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Test Property' }),
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toContain('type')
        },
      })
    })

    it('POST returns 201 with valid data', async () => {
      const mockProperty = {
        id: 'prop-1',
        name: 'Beach House',
        type: 'guest_house',
        organization_id: 'test-org-id',
      }
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          accommodation_properties: buildInsertChain(mockProperty),
        })
      )

      const propertiesRoute = await import('@/app/api/accommodation/properties/route')
      await testApiHandler({
        appHandler: propertiesRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Beach House', type: 'guest_house' }),
          })
          expect(res.status).toBe(201)
          const body = await res.json()
          expect(body.property).toBeDefined()
          expect(body.property.name).toBe('Beach House')
        },
      })
    })
  })

  // =========================================================================
  // 2. Units
  // =========================================================================
  describe('Units /api/accommodation/units', () => {
    it('GET returns 401 when unauthenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildUnauthenticatedMock())

      const unitsRoute = await import('@/app/api/accommodation/units/route')
      await testApiHandler({
        appHandler: unitsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(401)
        },
      })
    })

    it('GET returns units list', async () => {
      const mockUnits = [{ id: 'u1', name: 'Suite 1', unit_type: 'suite' }]
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          accommodation_units: buildDefaultChain(mockUnits, { count: 1 }),
        })
      )

      const unitsRoute = await import('@/app/api/accommodation/units/route')
      await testApiHandler({
        appHandler: unitsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(200)
          const body = await res.json()
          expect(body.units).toHaveLength(1)
          expect(body.total).toBe(1)
        },
      })
    })

    it('POST returns 400 with missing property_id', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildAuthenticatedMock())

      const unitsRoute = await import('@/app/api/accommodation/units/route')
      await testApiHandler({
        appHandler: unitsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Room 1', unit_type: 'room' }),
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('Validation failed')
          expect(body.details).toBeDefined()
        },
      })
    })

    it('POST returns 201 with valid unit data', async () => {
      const mockUnit = { id: 'u1', name: 'Room 1', unit_type: 'room', property_id: '550e8400-e29b-41d4-a716-446655440000' }
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          accommodation_units: buildInsertChain(mockUnit),
        })
      )

      const unitsRoute = await import('@/app/api/accommodation/units/route')
      await testApiHandler({
        appHandler: unitsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              property_id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Room 1',
              unit_type: 'room',
            }),
          })
          expect(res.status).toBe(201)
          const body = await res.json()
          expect(body.unit.name).toBe('Room 1')
        },
      })
    })
  })

  // =========================================================================
  // 3. Bookings
  // =========================================================================
  describe('Bookings /api/accommodation/bookings', () => {
    it('GET returns 401 when unauthenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildUnauthenticatedMock())

      const bookingsRoute = await import('@/app/api/accommodation/bookings/route')
      await testApiHandler({
        appHandler: bookingsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(401)
        },
      })
    })

    it('GET returns bookings list', async () => {
      const mockBookings = [
        { id: 'b1', booking_ref: 'BK-TEST1', status: 'confirmed', accommodation_guests: { first_name: 'John', last_name: 'Doe', email: 'j@e.com' } },
      ]
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          accommodation_bookings: buildDefaultChain(mockBookings, { count: 1 }),
        })
      )

      const bookingsRoute = await import('@/app/api/accommodation/bookings/route')
      await testApiHandler({
        appHandler: bookingsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(200)
          const body = await res.json()
          expect(body.bookings).toHaveLength(1)
          expect(body.total).toBe(1)
        },
      })
    })

    it('POST returns 400 with missing required fields', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildAuthenticatedMock())

      const bookingsRoute = await import('@/app/api/accommodation/bookings/route')
      await testApiHandler({
        appHandler: bookingsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ check_in_date: '2026-05-01' }),
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('Validation failed')
        },
      })
    })

    it('POST returns 201 with valid booking data', async () => {
      const mockBooking = {
        id: 'b1',
        booking_ref: 'BK-TEST1',
        status: 'inquiry',
        nights: 3,
        property_id: '550e8400-e29b-41d4-a716-446655440000',
        unit_id: '550e8400-e29b-41d4-a716-446655440001',
        guest_id: '550e8400-e29b-41d4-a716-446655440002',
      }
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          accommodation_bookings: buildInsertChain(mockBooking),
        })
      )

      const bookingsRoute = await import('@/app/api/accommodation/bookings/route')
      await testApiHandler({
        appHandler: bookingsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              property_id: '550e8400-e29b-41d4-a716-446655440000',
              unit_id: '550e8400-e29b-41d4-a716-446655440001',
              guest_id: '550e8400-e29b-41d4-a716-446655440002',
              check_in_date: '2026-05-01',
              check_out_date: '2026-05-04',
            }),
          })
          expect(res.status).toBe(201)
          const body = await res.json()
          expect(body.booking).toBeDefined()
          expect(body.booking.status).toBe('inquiry')
        },
      })
    })
  })

  // =========================================================================
  // 4. Guests
  // =========================================================================
  describe('Guests /api/accommodation/guests', () => {
    it('GET returns 401 when unauthenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildUnauthenticatedMock())

      const guestsRoute = await import('@/app/api/accommodation/guests/route')
      await testApiHandler({
        appHandler: guestsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(401)
        },
      })
    })

    it('POST returns 400 when first_name is missing', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildAuthenticatedMock())

      const guestsRoute = await import('@/app/api/accommodation/guests/route')
      await testApiHandler({
        appHandler: guestsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ last_name: 'Doe' }),
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('Validation failed')
        },
      })
    })

    it('POST returns 201 with valid guest data', async () => {
      const mockGuest = { id: 'g1', first_name: 'John', last_name: 'Doe', email: 'john@test.com' }
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          accommodation_guests: buildInsertChain(mockGuest),
        })
      )

      const guestsRoute = await import('@/app/api/accommodation/guests/route')
      await testApiHandler({
        appHandler: guestsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ first_name: 'John', last_name: 'Doe' }),
          })
          expect(res.status).toBe(201)
          const body = await res.json()
          expect(body.guest.first_name).toBe('John')
        },
      })
    })

    it('POST returns 409 when guest email already exists', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          accommodation_guests: buildInsertChain(null, { code: '23505', message: 'Duplicate' }),
        })
      )

      const guestsRoute = await import('@/app/api/accommodation/guests/route')
      await testApiHandler({
        appHandler: guestsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ first_name: 'John', last_name: 'Doe', email: 'dup@test.com' }),
          })
          expect(res.status).toBe(409)
          const body = await res.json()
          expect(body.error).toContain('already exists')
        },
      })
    })
  })

  // =========================================================================
  // 5. Rate Plans
  // =========================================================================
  describe('Rate Plans /api/accommodation/rate-plans', () => {
    it('POST returns 400 with missing required fields', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildAuthenticatedMock())

      const ratePlansRoute = await import('@/app/api/accommodation/rate-plans/route')
      await testApiHandler({
        appHandler: ratePlansRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Peak Season' }),
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('Validation failed')
        },
      })
    })

    it('POST returns 201 with valid rate plan data', async () => {
      const mockRatePlan = {
        id: 'rp1',
        name: 'Peak Season',
        rate_type: 'nightly',
        base_rate: 1200,
        property_id: '550e8400-e29b-41d4-a716-446655440000',
      }
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          accommodation_rate_plans: buildInsertChain(mockRatePlan),
        })
      )

      const ratePlansRoute = await import('@/app/api/accommodation/rate-plans/route')
      await testApiHandler({
        appHandler: ratePlansRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              property_id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Peak Season',
              rate_type: 'nightly',
              base_rate: 1200,
            }),
          })
          expect(res.status).toBe(201)
          const body = await res.json()
          expect(body.ratePlan.name).toBe('Peak Season')
          expect(body.ratePlan.base_rate).toBe(1200)
        },
      })
    })
  })

  // =========================================================================
  // 6. Payments
  // =========================================================================
  describe('Payments /api/accommodation/payments', () => {
    it('GET returns 401 when unauthenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildUnauthenticatedMock())

      const paymentsRoute = await import('@/app/api/accommodation/payments/route')
      await testApiHandler({
        appHandler: paymentsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(401)
        },
      })
    })

    it('POST returns 400 with invalid gateway value', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildAuthenticatedMock())

      const paymentsRoute = await import('@/app/api/accommodation/payments/route')
      await testApiHandler({
        appHandler: paymentsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              booking_id: '550e8400-e29b-41d4-a716-446655440000',
              gateway: 'invalid_gateway',
              amount: 500,
            }),
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('Validation failed')
        },
      })
    })

    it('POST returns 201 with valid payment data', async () => {
      const mockPayment = {
        id: 'pay1',
        booking_id: '550e8400-e29b-41d4-a716-446655440000',
        gateway: 'payfast',
        amount: 500,
        status: 'pending',
      }
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          accommodation_payment_transactions: buildInsertChain(mockPayment),
        })
      )

      const paymentsRoute = await import('@/app/api/accommodation/payments/route')
      await testApiHandler({
        appHandler: paymentsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              booking_id: '550e8400-e29b-41d4-a716-446655440000',
              gateway: 'payfast',
              amount: 500,
            }),
          })
          expect(res.status).toBe(201)
          const body = await res.json()
          expect(body.payment.gateway).toBe('payfast')
          expect(body.payment.amount).toBe(500)
        },
      })
    })
  })

  // =========================================================================
  // 7. Rooms
  // =========================================================================
  describe('Rooms /api/accommodation/rooms', () => {
    it('POST returns 400 when unit_id is missing', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildAuthenticatedMock())

      const roomsRoute = await import('@/app/api/accommodation/rooms/route')
      await testApiHandler({
        appHandler: roomsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Bedroom 1', room_type: 'bedroom' }),
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('Validation failed')
        },
      })
    })

    it('POST returns 201 with valid room data', async () => {
      const mockRoom = { id: 'r1', name: 'Bedroom 1', room_type: 'bedroom', unit_id: '550e8400-e29b-41d4-a716-446655440000' }
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          accommodation_rooms: buildInsertChain(mockRoom),
        })
      )

      const roomsRoute = await import('@/app/api/accommodation/rooms/route')
      await testApiHandler({
        appHandler: roomsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              unit_id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Bedroom 1',
              room_type: 'bedroom',
            }),
          })
          expect(res.status).toBe(201)
          const body = await res.json()
          expect(body.room.name).toBe('Bedroom 1')
        },
      })
    })
  })

  // =========================================================================
  // 8. Automation Rules
  // =========================================================================
  describe('Automation Rules /api/accommodation/automation-rules', () => {
    it('GET returns rules list', async () => {
      const mockRules = [{ id: 'ar1', name: 'Welcome Email', trigger_event: 'booking_confirmed', channel: 'email' }]
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          accommodation_automation_rules: buildDefaultChain(mockRules),
        })
      )

      const automationRoute = await import('@/app/api/accommodation/automation-rules/route')
      await testApiHandler({
        appHandler: automationRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(200)
          const body = await res.json()
          expect(body.rules).toHaveLength(1)
        },
      })
    })

    it('POST returns 400 with invalid channel', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildAuthenticatedMock())

      const automationRoute = await import('@/app/api/accommodation/automation-rules/route')
      await testApiHandler({
        appHandler: automationRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Test Rule',
              trigger_event: 'booking_confirmed',
              channel: 'pigeon',
            }),
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('Validation failed')
        },
      })
    })

    it('POST returns 201 with valid automation rule', async () => {
      const mockRule = { id: 'ar1', name: 'Welcome Email', trigger_event: 'booking_confirmed', channel: 'email' }
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          accommodation_automation_rules: buildInsertChain(mockRule),
        })
      )

      const automationRoute = await import('@/app/api/accommodation/automation-rules/route')
      await testApiHandler({
        appHandler: automationRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Welcome Email',
              trigger_event: 'booking_confirmed',
              channel: 'email',
            }),
          })
          expect(res.status).toBe(201)
          const body = await res.json()
          expect(body.rule.name).toBe('Welcome Email')
        },
      })
    })
  })

  // =========================================================================
  // 9. Message Queue
  // =========================================================================
  describe('Message Queue /api/accommodation/message-queue', () => {
    it('GET returns 401 when unauthenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildUnauthenticatedMock())

      const mqRoute = await import('@/app/api/accommodation/message-queue/route')
      await testApiHandler({
        appHandler: mqRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(401)
        },
      })
    })

    it('GET returns messages list', async () => {
      const mockMessages = [
        { id: 'mq1', status: 'pending', channel: 'email', accommodation_automation_rules: { name: 'Welcome', trigger_event: 'booking_confirmed' } },
      ]
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          accommodation_message_queue: buildDefaultChain(mockMessages),
        })
      )

      const mqRoute = await import('@/app/api/accommodation/message-queue/route')
      await testApiHandler({
        appHandler: mqRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(200)
          const body = await res.json()
          expect(body.messages).toHaveLength(1)
        },
      })
    })
  })

  // =========================================================================
  // 10. Payment Links
  // =========================================================================
  describe('Payment Links /api/accommodation/payment-links', () => {
    it('POST returns 400 with missing booking_id', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildAuthenticatedMock())

      const plRoute = await import('@/app/api/accommodation/payment-links/route')
      await testApiHandler({
        appHandler: plRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 500, payment_type: 'deposit' }),
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('Validation failed')
        },
      })
    })

    it('POST returns 404 when booking not found', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      // Build a mock where accommodation_bookings lookup returns null (not found),
      // but payment links insert would succeed
      const bookingsLookup = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            })),
          })),
        })),
      }
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          accommodation_bookings: bookingsLookup,
        })
      )

      const plRoute = await import('@/app/api/accommodation/payment-links/route')
      await testApiHandler({
        appHandler: plRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              booking_id: '550e8400-e29b-41d4-a716-446655440099',
              amount: 500,
              payment_type: 'deposit',
            }),
          })
          expect(res.status).toBe(404)
          const body = await res.json()
          expect(body.error).toBe('Booking not found')
        },
      })
    })

    it('POST returns 400 with invalid payment_type', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildAuthenticatedMock())

      const plRoute = await import('@/app/api/accommodation/payment-links/route')
      await testApiHandler({
        appHandler: plRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              booking_id: '550e8400-e29b-41d4-a716-446655440000',
              amount: 500,
              payment_type: 'invalid_type',
            }),
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('Validation failed')
        },
      })
    })
  })

  // =========================================================================
  // 11. Staff
  // =========================================================================
  describe('Staff /api/accommodation/staff', () => {
    it('POST returns 400 when department is missing', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildAuthenticatedMock())

      const staffRoute = await import('@/app/api/accommodation/staff/route')
      await testApiHandler({
        appHandler: staffRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ first_name: 'Alice', last_name: 'Smith' }),
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('Validation failed')
        },
      })
    })

    it('POST returns 201 with valid staff data', async () => {
      const mockStaff = { id: 's1', first_name: 'Alice', last_name: 'Smith', department: 'housekeeping' }
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          accommodation_staff: buildInsertChain(mockStaff),
        })
      )

      const staffRoute = await import('@/app/api/accommodation/staff/route')
      await testApiHandler({
        appHandler: staffRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              first_name: 'Alice',
              last_name: 'Smith',
              department: 'housekeeping',
            }),
          })
          expect(res.status).toBe(201)
          const body = await res.json()
          expect(body.staff.first_name).toBe('Alice')
          expect(body.staff.department).toBe('housekeeping')
        },
      })
    })
  })

  // =========================================================================
  // 12. Task Assignments
  // =========================================================================
  describe('Task Assignments /api/accommodation/task-assignments', () => {
    it('GET returns 401 when unauthenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildUnauthenticatedMock())

      const taRoute = await import('@/app/api/accommodation/task-assignments/route')
      await testApiHandler({
        appHandler: taRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(401)
        },
      })
    })

    it('POST returns 400 with missing task_type', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildAuthenticatedMock())

      const taRoute = await import('@/app/api/accommodation/task-assignments/route')
      await testApiHandler({
        appHandler: taRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              task_id: '550e8400-e29b-41d4-a716-446655440000',
              staff_id: '550e8400-e29b-41d4-a716-446655440001',
            }),
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('Validation failed')
        },
      })
    })

    it('POST returns 201 with valid task assignment', async () => {
      const mockAssignment = {
        id: 'ta1',
        task_id: '550e8400-e29b-41d4-a716-446655440000',
        task_type: 'housekeeping',
        staff_id: '550e8400-e29b-41d4-a716-446655440001',
      }
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          accommodation_task_assignments: buildInsertChain(mockAssignment),
        })
      )

      const taRoute = await import('@/app/api/accommodation/task-assignments/route')
      await testApiHandler({
        appHandler: taRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              task_id: '550e8400-e29b-41d4-a716-446655440000',
              task_type: 'housekeeping',
              staff_id: '550e8400-e29b-41d4-a716-446655440001',
            }),
          })
          expect(res.status).toBe(201)
          const body = await res.json()
          expect(body.assignment).toBeDefined()
          expect(body.assignment.task_type).toBe('housekeeping')
        },
      })
    })
  })

  // =========================================================================
  // 13. Stock Items
  // =========================================================================
  describe('Stock Items /api/accommodation/stock-items', () => {
    it('GET returns stock items list', async () => {
      const mockItems = [{ id: 'si1', name: 'Towels', category: 'linen', current_stock: 50 }]
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          accommodation_stock_items: buildDefaultChain(mockItems),
        })
      )

      const stockRoute = await import('@/app/api/accommodation/stock-items/route')
      await testApiHandler({
        appHandler: stockRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(200)
          const body = await res.json()
          expect(body.stock_items).toHaveLength(1)
        },
      })
    })

    it('POST returns 400 when name is missing', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildAuthenticatedMock())

      const stockRoute = await import('@/app/api/accommodation/stock-items/route')
      await testApiHandler({
        appHandler: stockRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: 'linen', unit_of_measure: 'each' }),
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('Validation failed')
        },
      })
    })

    it('POST returns 201 with valid stock item', async () => {
      const mockItem = { id: 'si1', name: 'Towels', category: 'linen', unit_of_measure: 'each', current_stock: 0 }
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          accommodation_stock_items: buildInsertChain(mockItem),
        })
      )

      const stockRoute = await import('@/app/api/accommodation/stock-items/route')
      await testApiHandler({
        appHandler: stockRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Towels',
              category: 'linen',
              unit_of_measure: 'each',
            }),
          })
          expect(res.status).toBe(201)
          const body = await res.json()
          expect(body.stock_item.name).toBe('Towels')
        },
      })
    })
  })

  // =========================================================================
  // 14. AI: Generate Quote
  // =========================================================================
  describe('AI Generate Quote /api/accommodation/ai/generate-quote', () => {
    it('POST returns 401 when unauthenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildUnauthenticatedMock())

      const quoteRoute = await import('@/app/api/accommodation/ai/generate-quote/route')
      await testApiHandler({
        appHandler: quoteRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inquiry_text: 'Test' }),
          })
          expect(res.status).toBe(401)
        },
      })
    })

    it('POST returns 400 when inquiry_text is missing', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          accommodation_ai_configs: {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                })),
              })),
            })),
          },
        })
      )

      const quoteRoute = await import('@/app/api/accommodation/ai/generate-quote/route')
      await testApiHandler({
        appHandler: quoteRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('Validation failed')
        },
      })
    })

    it('POST returns quote result with valid request', async () => {
      const aiConfigChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { is_enabled: true, config: {}, system_prompt_override: null, model_override: null },
                error: null,
              }),
            })),
          })),
        })),
      }
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          accommodation_ai_configs: aiConfigChain,
        })
      )

      const quoteRoute = await import('@/app/api/accommodation/ai/generate-quote/route')
      await testApiHandler({
        appHandler: quoteRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inquiry_text: 'Looking for 2 nights for 4 guests in May',
              guest_name: 'John Doe',
            }),
          })
          expect(res.status).toBe(200)
          const body = await res.json()
          expect(body.session_id).toBe('session-123')
          expect(body.quote).toBeDefined()
          expect(body.tokens_used).toBe(100)
          expect(body.status).toBe('completed')
        },
      })
    })

    it('POST returns 403 when quoter agent is disabled', async () => {
      const aiConfigChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { is_enabled: false, config: {}, system_prompt_override: null, model_override: null },
                error: null,
              }),
            })),
          })),
        })),
      }
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          accommodation_ai_configs: aiConfigChain,
        })
      )

      const quoteRoute = await import('@/app/api/accommodation/ai/generate-quote/route')
      await testApiHandler({
        appHandler: quoteRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inquiry_text: 'Need a quote' }),
          })
          expect(res.status).toBe(403)
          const body = await res.json()
          expect(body.error).toContain('disabled')
        },
      })
    })
  })

  // =========================================================================
  // 15. AI: Concierge
  // =========================================================================
  describe('AI Concierge /api/accommodation/ai/concierge', () => {
    it('POST returns 400 when message is missing', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          accommodation_ai_configs: {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                })),
              })),
            })),
          },
        })
      )

      const conciergeRoute = await import('@/app/api/accommodation/ai/concierge/route')
      await testApiHandler({
        appHandler: conciergeRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
          expect(res.status).toBe(400)
          const body = await res.json()
          expect(body.error).toBe('Validation failed')
        },
      })
    })

    it('POST returns concierge response with valid message', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          accommodation_ai_configs: {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { is_enabled: true, config: {}, system_prompt_override: null, model_override: null },
                    error: null,
                  }),
                })),
              })),
            })),
          },
        })
      )

      const conciergeRoute = await import('@/app/api/accommodation/ai/concierge/route')
      await testApiHandler({
        appHandler: conciergeRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'What restaurants are nearby?' }),
          })
          expect(res.status).toBe(200)
          const body = await res.json()
          expect(body.session_id).toBe('session-456')
          expect(body.concierge).toBeDefined()
          expect(body.status).toBe('completed')
        },
      })
    })

    it('POST returns 403 when concierge agent is disabled', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          accommodation_ai_configs: {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { is_enabled: false },
                    error: null,
                  }),
                })),
              })),
            })),
          },
        })
      )

      const conciergeRoute = await import('@/app/api/accommodation/ai/concierge/route')
      await testApiHandler({
        appHandler: conciergeRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Hello' }),
          })
          expect(res.status).toBe(403)
          const body = await res.json()
          expect(body.error).toContain('disabled')
        },
      })
    })
  })

  // =========================================================================
  // 16. AI: Sessions
  // =========================================================================
  describe('AI Sessions /api/accommodation/ai/sessions', () => {
    it('GET returns 401 when unauthenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(buildUnauthenticatedMock())

      const sessionsRoute = await import('@/app/api/accommodation/ai/sessions/route')
      await testApiHandler({
        appHandler: sessionsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(401)
        },
      })
    })

    it('GET returns sessions with pagination', async () => {
      const mockSessions = [
        { id: 'sess1', agent_type: 'accommodation_quoter', status: 'completed', tokens_used: 100, result: {}, created_at: '2026-04-10', updated_at: '2026-04-10' },
      ]
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        buildAuthenticatedMock({
          agent_sessions: buildDefaultChain(mockSessions, { count: 1 }),
        })
      )

      const sessionsRoute = await import('@/app/api/accommodation/ai/sessions/route')
      await testApiHandler({
        appHandler: sessionsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(200)
          const body = await res.json()
          expect(body.sessions).toHaveLength(1)
          expect(body.pagination).toBeDefined()
          expect(body.pagination.total).toBe(1)
        },
      })
    })
  })
})
