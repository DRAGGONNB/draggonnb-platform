/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { testApiHandler } from 'next-test-api-route-handler'

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock Supabase admin client
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_USER_ID = 'user-abc-123'
const TEST_ORG_ID = 'org-xyz-789'
const TEST_MEMBER_ID = 'member-001'

/**
 * Build a chainable Supabase mock where every method returns `this`
 * until a terminal (.single(), .limit(), etc.) resolves with `result`.
 */
function chain(result: { data: unknown; error: unknown; count?: number }) {
  const obj: Record<string, unknown> = {}
  // Make thenable so `await supabase.from(...).select(...).eq(...)` resolves
  obj.then = (resolve: any) => resolve(result)
  // Terminal methods
  obj.single = vi.fn().mockResolvedValue(result)
  obj.maybeSingle = vi.fn().mockResolvedValue(result)
  // Chainable methods — all return same obj (self-referencing)
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'in', 'is', 'gte', 'lte', 'gt', 'lt',
    'order', 'limit', 'range', 'or', 'ilike', 'filter',
    'not', 'match', 'contains', 'containedBy', 'textSearch',
  ]
  for (const m of methods) {
    obj[m] = vi.fn().mockReturnValue(obj)
  }
  return obj
}

/** Create a mock supabase client with auth + from dispatch. */
function mockSupabase(
  user: { id: string } | null,
  fromMap: Record<string, ReturnType<typeof chain>>,
  rpcMap?: Record<string, { data: unknown; error: unknown }>,
) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : new Error('Not authenticated'),
      }),
    },
    from: vi.fn((table: string) => fromMap[table] || chain({ data: null, error: null })),
    rpc: rpcMap
      ? vi.fn((fn: string) => Promise.resolve(rpcMap[fn] || { data: null, error: null }))
      : vi.fn(() => Promise.resolve({ data: null, error: null })),
  } as any
}

/** Authenticated supabase mock that resolves org via organization_users. */
function authedSupabase(fromMap: Record<string, ReturnType<typeof chain>> = {}) {
  const base: Record<string, ReturnType<typeof chain>> = {
    organization_users: chain({ data: { organization_id: TEST_ORG_ID }, error: null }),
    ...fromMap,
  }
  return mockSupabase({ id: TEST_USER_ID }, base)
}

/** Unauthed supabase mock. */
function unauthedSupabase() {
  return mockSupabase(null, {})
}

/** Authed but no org found. */
function noOrgSupabase() {
  return mockSupabase({ id: TEST_USER_ID }, {
    organization_users: chain({ data: null, error: { message: 'No org' } }),
  })
}

// ---------------------------------------------------------------------------
// Route imports
// ---------------------------------------------------------------------------

import * as sectionsRoute from '@/app/api/elijah/sections/route'
import * as membersRoute from '@/app/api/elijah/members/route'
import * as incidentsRoute from '@/app/api/elijah/incidents/route'
import * as patrolsRoute from '@/app/api/elijah/patrols/route'
import * as rollcallSchedulesRoute from '@/app/api/elijah/rollcall/schedules/route'
import * as rollcallCheckinRoute from '@/app/api/elijah/rollcall/checkin/route'
import * as householdsRoute from '@/app/api/elijah/households/route'
import * as waterPointsRoute from '@/app/api/elijah/fire/water-points/route'
import * as groupsRoute from '@/app/api/elijah/fire/groups/route'
import * as equipmentRoute from '@/app/api/elijah/fire/equipment/route'
import * as farmsRoute from '@/app/api/elijah/fire/farms/route'
import * as dashboardStatsRoute from '@/app/api/elijah/dashboard/stats/route'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Elijah Security Module API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ===================== AUTH TESTS =====================

  describe('Auth: shared patterns', () => {
    it('returns 401 for unauthenticated GET /sections', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(unauthedSupabase())

      await testApiHandler({
        appHandler: sectionsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(401)
          const data = await res.json()
          expect(data.error).toBe('Unauthorized')
        },
      })
    })

    it('returns 401 for unauthenticated POST /incidents', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(unauthedSupabase())

      await testApiHandler({
        appHandler: incidentsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'break_in', description: 'test' }),
          })
          expect(res.status).toBe(401)
        },
      })
    })

    it('returns 400 when user has no organization (GET /members)', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(noOrgSupabase())

      await testApiHandler({
        appHandler: membersRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(400)
          const data = await res.json()
          expect(data.error).toBe('Organization not found')
        },
      })
    })

    it('returns 400 when user has no organization (POST /households)', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(noOrgSupabase())

      await testApiHandler({
        appHandler: householdsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: '123 Main St' }),
          })
          expect(res.status).toBe(400)
          const data = await res.json()
          expect(data.error).toBe('Organization not found')
        },
      })
    })
  })

  // ===================== SECTIONS =====================

  describe('GET /api/elijah/sections', () => {
    it('returns sections list', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const sections = [{ id: 's1', name: 'North', households: [{ count: 3 }] }]
      vi.mocked(createClient).mockResolvedValue(authedSupabase({
        elijah_section: chain({ data: sections, error: null }),
      }))

      await testApiHandler({
        appHandler: sectionsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(200)
          const data = await res.json()
          expect(data.sections).toHaveLength(1)
          expect(data.sections[0].name).toBe('North')
        },
      })
    })
  })

  describe('POST /api/elijah/sections', () => {
    it('returns 400 when name is missing', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(authedSupabase())

      await testApiHandler({
        appHandler: sectionsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
          expect(res.status).toBe(400)
          const data = await res.json()
          expect(data.error).toBe('Validation failed')
        },
      })
    })

    it('creates section with valid data', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const created = { id: 's1', name: 'North', description: null, organization_id: TEST_ORG_ID }
      vi.mocked(createClient).mockResolvedValue(authedSupabase({
        elijah_section: chain({ data: created, error: null }),
      }))

      await testApiHandler({
        appHandler: sectionsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'North' }),
          })
          expect(res.status).toBe(201)
          const data = await res.json()
          expect(data.section.name).toBe('North')
        },
      })
    })
  })

  // ===================== MEMBERS =====================

  describe('GET /api/elijah/members', () => {
    it('returns members list', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const members = [{ id: 'm1', display_name: 'Alice', roles: [{ role: 'admin' }] }]
      vi.mocked(createClient).mockResolvedValue(authedSupabase({
        elijah_member: chain({ data: members, error: null }),
      }))

      await testApiHandler({
        appHandler: membersRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(200)
          const data = await res.json()
          expect(data.members).toHaveLength(1)
          expect(data.members[0].display_name).toBe('Alice')
        },
      })
    })
  })

  describe('POST /api/elijah/members', () => {
    it('returns 400 when display_name is missing', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(authedSupabase())

      await testApiHandler({
        appHandler: membersRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: '+27812345678' }),
          })
          expect(res.status).toBe(400)
          const data = await res.json()
          expect(data.error).toBe('Validation failed')
        },
      })
    })

    it('creates member with valid data and roles', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const created = { id: 'm2', display_name: 'Bob', phone: null, organization_id: TEST_ORG_ID }
      vi.mocked(createClient).mockResolvedValue(authedSupabase({
        elijah_member: chain({ data: created, error: null }),
        elijah_member_role: chain({ data: null, error: null }),
      }))

      await testApiHandler({
        appHandler: membersRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ display_name: 'Bob', roles: ['patroller'] }),
          })
          expect(res.status).toBe(201)
          const data = await res.json()
          expect(data.member.display_name).toBe('Bob')
        },
      })
    })
  })

  // ===================== INCIDENTS =====================

  describe('GET /api/elijah/incidents', () => {
    it('returns incidents with total count', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const incidents = [
        { id: 'i1', type: 'break_in', severity: 'high', status: 'open' },
      ]
      vi.mocked(createClient).mockResolvedValue(authedSupabase({
        elijah_incident: chain({ data: incidents, error: null, count: 1 }),
      }))

      await testApiHandler({
        appHandler: incidentsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(200)
          const data = await res.json()
          expect(data.incidents).toHaveLength(1)
          expect(data.total).toBe(1)
        },
      })
    })
  })

  describe('POST /api/elijah/incidents', () => {
    it('returns 400 when type is missing', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(authedSupabase())

      await testApiHandler({
        appHandler: incidentsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: 'Something happened' }),
          })
          expect(res.status).toBe(400)
          const data = await res.json()
          expect(data.error).toBe('Validation failed')
        },
      })
    })

    it('returns 400 when description is missing', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(authedSupabase())

      await testApiHandler({
        appHandler: incidentsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'break_in' }),
          })
          expect(res.status).toBe(400)
          const data = await res.json()
          expect(data.error).toBe('Validation failed')
        },
      })
    })

    it('returns 400 with invalid incident type', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(authedSupabase())

      await testApiHandler({
        appHandler: incidentsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'alien_invasion', description: 'UFO spotted' }),
          })
          expect(res.status).toBe(400)
        },
      })
    })

    it('returns 400 when elijah member record not found', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(authedSupabase({
        elijah_member: chain({ data: null, error: { message: 'not found' } }),
      }))

      await testApiHandler({
        appHandler: incidentsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'break_in', description: 'Window smashed' }),
          })
          expect(res.status).toBe(400)
          const data = await res.json()
          expect(data.error).toBe('Elijah member record not found')
        },
      })
    })

    it('creates incident with valid data', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const incident = { id: 'i2', type: 'break_in', severity: 'medium', status: 'open', description: 'Window smashed' }
      vi.mocked(createClient).mockResolvedValue(authedSupabase({
        elijah_member: chain({ data: { id: TEST_MEMBER_ID }, error: null }),
        elijah_incident: chain({ data: incident, error: null }),
        elijah_incident_timeline_event: chain({ data: null, error: null }),
      }))

      await testApiHandler({
        appHandler: incidentsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'break_in', description: 'Window smashed' }),
          })
          expect(res.status).toBe(201)
          const data = await res.json()
          expect(data.incident.type).toBe('break_in')
        },
      })
    })
  })

  // ===================== PATROLS =====================

  describe('GET /api/elijah/patrols', () => {
    it('returns patrols list', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const patrols = [{ id: 'p1', status: 'scheduled', scheduled_date: '2026-04-12' }]
      vi.mocked(createClient).mockResolvedValue(authedSupabase({
        elijah_patrol: chain({ data: patrols, error: null }),
      }))

      await testApiHandler({
        appHandler: patrolsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(200)
          const data = await res.json()
          expect(data.patrols).toHaveLength(1)
        },
      })
    })
  })

  describe('POST /api/elijah/patrols', () => {
    it('returns 400 when scheduled_date is missing', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(authedSupabase())

      await testApiHandler({
        appHandler: patrolsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
          expect(res.status).toBe(400)
          const data = await res.json()
          expect(data.error).toBe('Validation failed')
        },
      })
    })

    it('returns 400 with invalid date format', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(authedSupabase())

      await testApiHandler({
        appHandler: patrolsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scheduled_date: '12-04-2026' }),
          })
          expect(res.status).toBe(400)
        },
      })
    })

    it('creates patrol with valid data', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const patrol = { id: 'p2', scheduled_date: '2026-04-15', status: 'scheduled' }
      vi.mocked(createClient).mockResolvedValue(authedSupabase({
        elijah_patrol: chain({ data: patrol, error: null }),
      }))

      await testApiHandler({
        appHandler: patrolsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scheduled_date: '2026-04-15' }),
          })
          expect(res.status).toBe(201)
          const data = await res.json()
          expect(data.patrol.scheduled_date).toBe('2026-04-15')
        },
      })
    })
  })

  // ===================== ROLLCALL =====================

  describe('GET /api/elijah/rollcall/schedules', () => {
    it('returns schedules list', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const schedules = [{ id: 'rs1', time: '06:00', grace_minutes: 10 }]
      vi.mocked(createClient).mockResolvedValue(authedSupabase({
        elijah_rollcall_schedule: chain({ data: schedules, error: null }),
      }))

      await testApiHandler({
        appHandler: rollcallSchedulesRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(200)
          const data = await res.json()
          expect(data.schedules).toHaveLength(1)
        },
      })
    })
  })

  describe('POST /api/elijah/rollcall/schedules', () => {
    it('returns 400 with invalid time format', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(authedSupabase())

      await testApiHandler({
        appHandler: rollcallSchedulesRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ time: '6am' }),
          })
          expect(res.status).toBe(400)
        },
      })
    })

    it('creates schedule with valid time', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const schedule = { id: 'rs2', time: '18:00', grace_minutes: 10 }
      vi.mocked(createClient).mockResolvedValue(authedSupabase({
        elijah_rollcall_schedule: chain({ data: schedule, error: null }),
      }))

      await testApiHandler({
        appHandler: rollcallSchedulesRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ time: '18:00' }),
          })
          expect(res.status).toBe(201)
          const data = await res.json()
          expect(data.schedule.time).toBe('18:00')
        },
      })
    })
  })

  describe('POST /api/elijah/rollcall/checkin', () => {
    it('returns 400 when required fields are missing', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(authedSupabase())

      await testApiHandler({
        appHandler: rollcallCheckinRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'safe' }),
          })
          expect(res.status).toBe(400)
          const data = await res.json()
          expect(data.error).toBe('Validation failed')
        },
      })
    })

    it('returns 400 with invalid status value', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(authedSupabase())

      await testApiHandler({
        appHandler: rollcallCheckinRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              schedule_id: '00000000-0000-0000-0000-000000000001',
              household_id: '00000000-0000-0000-0000-000000000002',
              status: 'unknown',
            }),
          })
          expect(res.status).toBe(400)
        },
      })
    })

    it('creates checkin with valid data', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const checkinData = { id: 'c1', status: 'safe', schedule_id: 'rs1', household_id: 'h1' }
      vi.mocked(createClient).mockResolvedValue(authedSupabase({
        elijah_member: chain({ data: { id: TEST_MEMBER_ID }, error: null }),
        elijah_rollcall_checkin: chain({ data: checkinData, error: null }),
      }))

      await testApiHandler({
        appHandler: rollcallCheckinRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              schedule_id: '00000000-0000-0000-0000-000000000001',
              household_id: '00000000-0000-0000-0000-000000000002',
              status: 'safe',
            }),
          })
          expect(res.status).toBe(201)
          const data = await res.json()
          expect(data.checkin.status).toBe('safe')
        },
      })
    })
  })

  // ===================== HOUSEHOLDS =====================

  describe('GET /api/elijah/households', () => {
    it('returns households list', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const households = [{ id: 'h1', address: '1 Oak Ave', section: { id: 's1', name: 'North' } }]
      vi.mocked(createClient).mockResolvedValue(authedSupabase({
        elijah_household: chain({ data: households, error: null }),
      }))

      await testApiHandler({
        appHandler: householdsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(200)
          const data = await res.json()
          expect(data.households).toHaveLength(1)
          expect(data.households[0].address).toBe('1 Oak Ave')
        },
      })
    })
  })

  describe('POST /api/elijah/households', () => {
    it('returns 400 when address is missing', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(authedSupabase())

      await testApiHandler({
        appHandler: householdsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
          expect(res.status).toBe(400)
          const data = await res.json()
          expect(data.error).toBe('Validation failed')
        },
      })
    })

    it('creates household with valid data', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const household = { id: 'h2', address: '99 Pine Rd', organization_id: TEST_ORG_ID }
      vi.mocked(createClient).mockResolvedValue(authedSupabase({
        elijah_household: chain({ data: household, error: null }),
      }))

      await testApiHandler({
        appHandler: householdsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: '99 Pine Rd' }),
          })
          expect(res.status).toBe(201)
          const data = await res.json()
          expect(data.household.address).toBe('99 Pine Rd')
        },
      })
    })
  })

  // ===================== FIRE: WATER POINTS =====================

  describe('GET /api/elijah/fire/water-points', () => {
    it('returns water points list', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const points = [{ id: 'wp1', name: 'Dam 1', type: 'dam', status: 'operational' }]
      vi.mocked(createClient).mockResolvedValue(authedSupabase({
        elijah_fire_water_point: chain({ data: points, error: null }),
      }))

      await testApiHandler({
        appHandler: waterPointsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(200)
          const data = await res.json()
          expect(data.water_points).toHaveLength(1)
        },
      })
    })
  })

  describe('POST /api/elijah/fire/water-points', () => {
    it('returns 400 when name or location missing', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(authedSupabase())

      await testApiHandler({
        appHandler: waterPointsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Dam 2' }),
          })
          expect(res.status).toBe(400)
        },
      })
    })

    it('creates water point with valid data', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const wp = { id: 'wp2', name: 'Dam 2', type: 'dam', status: 'operational' }
      vi.mocked(createClient).mockResolvedValue(authedSupabase({
        elijah_fire_water_point: chain({ data: wp, error: null }),
      }))

      await testApiHandler({
        appHandler: waterPointsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Dam 2',
              location: { lat: -33.9, lng: 23.4 },
              type: 'dam',
            }),
          })
          expect(res.status).toBe(201)
          const data = await res.json()
          expect(data.water_point.name).toBe('Dam 2')
        },
      })
    })
  })

  // ===================== FIRE: GROUPS =====================

  describe('POST /api/elijah/fire/groups', () => {
    it('returns 400 with invalid group type', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(authedSupabase())

      await testApiHandler({
        appHandler: groupsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Team Alpha', type: 'invalid_type' }),
          })
          expect(res.status).toBe(400)
        },
      })
    })

    it('creates responder group with valid data', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const group = { id: 'g1', name: 'Team Alpha', type: 'community_team' }
      vi.mocked(createClient).mockResolvedValue(authedSupabase({
        elijah_fire_responder_group: chain({ data: group, error: null }),
      }))

      await testApiHandler({
        appHandler: groupsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Team Alpha', type: 'community_team' }),
          })
          expect(res.status).toBe(201)
          const data = await res.json()
          expect(data.group.name).toBe('Team Alpha')
        },
      })
    })
  })

  // ===================== FIRE: EQUIPMENT =====================

  describe('POST /api/elijah/fire/equipment', () => {
    it('returns 400 with invalid equipment type', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(authedSupabase())

      await testApiHandler({
        appHandler: equipmentRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Truck 1', type: 'helicopter' }),
          })
          expect(res.status).toBe(400)
        },
      })
    })

    it('creates equipment with valid data', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const equip = { id: 'e1', name: 'Bakkie 1', type: 'bakkie_skid', status: 'available' }
      vi.mocked(createClient).mockResolvedValue(authedSupabase({
        elijah_fire_equipment: chain({ data: equip, error: null }),
      }))

      await testApiHandler({
        appHandler: equipmentRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Bakkie 1', type: 'bakkie_skid' }),
          })
          expect(res.status).toBe(201)
          const data = await res.json()
          expect(data.equipment.type).toBe('bakkie_skid')
        },
      })
    })
  })

  // ===================== FIRE: FARMS =====================

  describe('POST /api/elijah/fire/farms', () => {
    it('returns 400 when required fields missing', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(authedSupabase())

      await testApiHandler({
        appHandler: farmsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Green Farm' }),
          })
          expect(res.status).toBe(400)
        },
      })
    })

    it('creates farm with valid data', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const farm = { id: 'f1', name: 'Green Farm', owner_name: 'Jan' }
      vi.mocked(createClient).mockResolvedValue(authedSupabase({
        elijah_fire_farm: chain({ data: farm, error: null }),
      }))

      await testApiHandler({
        appHandler: farmsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Green Farm',
              owner_name: 'Jan',
              location: { lat: -33.9, lng: 23.4 },
            }),
          })
          expect(res.status).toBe(201)
          const data = await res.json()
          expect(data.farm.name).toBe('Green Farm')
        },
      })
    })
  })

  // ===================== DASHBOARD STATS =====================

  describe('GET /api/elijah/dashboard/stats', () => {
    it('returns 401 when unauthenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(unauthedSupabase())

      await testApiHandler({
        appHandler: dashboardStatsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(401)
        },
      })
    })

    it('returns dashboard stats shape', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(authedSupabase({
        elijah_incident: chain({ data: [], error: null }),
        elijah_fire_incident: chain({ data: [], error: null }),
        elijah_rollcall_checkin: chain({ data: [], error: null }),
        elijah_patrol: chain({ data: [], error: null }),
        elijah_household: chain({ data: [{ id: 'h1' }, { id: 'h2' }], error: null }),
      }))

      await testApiHandler({
        appHandler: dashboardStatsRoute as any,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(200)
          const data = await res.json()
          expect(data).toHaveProperty('active_incidents')
          expect(data).toHaveProperty('active_incidents_count')
          expect(data).toHaveProperty('active_fires')
          expect(data).toHaveProperty('rollcall')
          expect(data).toHaveProperty('active_patrols')
          expect(data.rollcall.total).toBe(2)
          expect(data.rollcall.pending).toBe(2)
        },
      })
    })
  })

  // ===================== POPIA: SENSITIVE DATA =====================

  describe('GET /api/elijah/members/[id]/sensitive', () => {
    it('returns 401 when unauthenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(unauthedSupabase())

      const sensitiveRoute = await import('@/app/api/elijah/members/[id]/sensitive/route')

      await testApiHandler({
        appHandler: sensitiveRoute as any,
        params: { id: 'member-999' },
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(401)
        },
      })
    })

    it('returns 403 when member record not found', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(authedSupabase({
        elijah_member: chain({ data: null, error: null }),
      }))

      const sensitiveRoute = await import('@/app/api/elijah/members/[id]/sensitive/route')

      await testApiHandler({
        appHandler: sensitiveRoute as any,
        params: { id: 'member-999' },
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(403)
          const data = await res.json()
          expect(data.error).toBe('Elijah member not found')
        },
      })
    })

    it('returns 403 when member lacks admin/dispatcher role', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(authedSupabase({
        elijah_member: chain({ data: { id: TEST_MEMBER_ID, display_name: 'Bob' }, error: null }),
        elijah_member_role: chain({ data: [{ role: 'patroller' }], error: null }),
      }))

      const sensitiveRoute = await import('@/app/api/elijah/members/[id]/sensitive/route')

      await testApiHandler({
        appHandler: sensitiveRoute as any,
        params: { id: 'member-999' },
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(403)
          const data = await res.json()
          expect(data.error).toBe('Insufficient role for sensitive data access')
        },
      })
    })

    it('returns sensitive profile for admin role', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(authedSupabase({
        elijah_member: chain({ data: { id: TEST_MEMBER_ID, display_name: 'Admin User' }, error: null }),
        elijah_member_role: chain({ data: [{ role: 'admin' }], error: null }),
      }))

      const { createAdminClient } = await import('@/lib/supabase/admin')
      const adminProfile = { member_id: 'member-999', id_number: '9001015009087', medical_aid: 'Discovery' }
      vi.mocked(createAdminClient).mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'elijah_sensitive_access_audit') {
            return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) }
          }
          if (table === 'elijah_member_sensitive_profile') {
            return chain({ data: adminProfile, error: null })
          }
          return chain({ data: null, error: null })
        }),
      } as any)

      const sensitiveRoute = await import('@/app/api/elijah/members/[id]/sensitive/route')

      await testApiHandler({
        appHandler: sensitiveRoute as any,
        params: { id: 'member-999' },
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          expect(res.status).toBe(200)
          const data = await res.json()
          expect(data.profile).toBeDefined()
          expect(data.profile.id_number).toBe('9001015009087')
        },
      })
    })
  })

  // ===================== VALIDATION UNIT TESTS =====================

  describe('Validation schemas (unit)', () => {
    it('createSectionSchema rejects empty name', async () => {
      const { createSectionSchema } = await import('@/lib/elijah/validations')
      const result = createSectionSchema.safeParse({ name: '' })
      expect(result.success).toBe(false)
    })

    it('createIncidentSchema rejects invalid severity', async () => {
      const { createIncidentSchema } = await import('@/lib/elijah/validations')
      const result = createIncidentSchema.safeParse({
        type: 'break_in',
        severity: 'extreme',
        description: 'Test',
      })
      expect(result.success).toBe(false)
    })

    it('createIncidentSchema accepts valid input with defaults', async () => {
      const { createIncidentSchema } = await import('@/lib/elijah/validations')
      const result = createIncidentSchema.safeParse({
        type: 'fire',
        description: 'Veld fire on the ridge',
      })
      expect(result.success).toBe(true)
      expect(result.data.severity).toBe('medium')
    })

    it('rollcallCheckinSchema rejects missing schedule_id', async () => {
      const { rollcallCheckinSchema } = await import('@/lib/elijah/validations')
      const result = rollcallCheckinSchema.safeParse({
        household_id: '00000000-0000-0000-0000-000000000001',
        status: 'safe',
      })
      expect(result.success).toBe(false)
    })

    it('createWaterPointSchema rejects invalid type', async () => {
      const { createWaterPointSchema } = await import('@/lib/elijah/validations')
      const result = createWaterPointSchema.safeParse({
        name: 'Lake',
        location: { lat: -33.9, lng: 23.4 },
        type: 'lake',
      })
      expect(result.success).toBe(false)
    })

    it('createPatrolSchema rejects bad date format', async () => {
      const { createPatrolSchema } = await import('@/lib/elijah/validations')
      const result = createPatrolSchema.safeParse({ scheduled_date: 'April 15' })
      expect(result.success).toBe(false)
    })

    it('createEquipmentSchema accepts valid input with defaults', async () => {
      const { createEquipmentSchema } = await import('@/lib/elijah/validations')
      const result = createEquipmentSchema.safeParse({
        name: 'Pump A',
        type: 'pump',
      })
      expect(result.success).toBe(true)
      expect(result.data.status).toBe('available')
    })

    it('createFarmSchema requires location', async () => {
      const { createFarmSchema } = await import('@/lib/elijah/validations')
      const result = createFarmSchema.safeParse({
        name: 'Farm A',
        owner_name: 'Jan',
      })
      expect(result.success).toBe(false)
    })

    it('createResponderGroupSchema rejects invalid type', async () => {
      const { createResponderGroupSchema } = await import('@/lib/elijah/validations')
      const result = createResponderGroupSchema.safeParse({
        name: 'Team B',
        type: 'military',
      })
      expect(result.success).toBe(false)
    })
  })

  // ===================== WHATSAPP COMMANDS (UNIT) =====================

  describe('WhatsApp command router (unit)', () => {
    it('routeElijahCommand is exported and callable', async () => {
      const { routeElijahCommand } = await import('@/lib/elijah/whatsapp-commands')
      expect(typeof routeElijahCommand).toBe('function')
    })
  })
})
