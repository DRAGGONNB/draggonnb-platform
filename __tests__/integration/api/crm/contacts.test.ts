/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { testApiHandler } from 'next-test-api-route-handler'
import * as contactsRoute from '@/app/api/crm/contacts/route'

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock admin client (getOrgId falls back to it)
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => createChainableBuilder({ data: null, error: { message: 'Not found' } })),
  })),
}))

// Mock webhook dispatcher (fire-and-forget, not under test)
vi.mock('@/lib/webhooks/dispatcher', () => ({
  dispatchWebhooksForOrg: vi.fn().mockResolvedValue(undefined),
}))

/**
 * Chainable Supabase query builder mock.
 * Supports .select().eq().eq().limit().single() and direct await (thenable).
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

function createOrgUserBuilder(orgId: string | null) {
  return createChainableBuilder({
    data: orgId ? { organization_id: orgId } : null,
    error: orgId ? null : { message: 'Not found' },
  })
}

function createAuthMock(opts: {
  user?: { id: string; email: string } | null
  orgId?: string | null
  tableBuilders?: Record<string, any>
}) {
  const { user = null, orgId = 'test-org-id', tableBuilders = {} } = opts
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : new Error('Not authenticated'),
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'organization_users') {
        return createOrgUserBuilder(orgId)
      }
      if (tableBuilders[table]) {
        return tableBuilders[table]
      }
      return createChainableBuilder({ data: null, error: null })
    }),
  }
}

const TEST_USER = { id: 'test-user-id', email: 'test@example.com' }

describe('CRM Contacts API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/crm/contacts', () => {
    it('returns 401 when user is not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        createAuthMock({ user: null }) as any
      )

      await testApiHandler({
        appHandler: contactsRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({ method: 'GET' })
          expect(response.status).toBe(401)
          const data = await response.json()
          expect(data.error).toBe('Unauthorized')
        },
      })
    })

    it('returns 400 when user has no organization', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        createAuthMock({ user: TEST_USER, orgId: null }) as any
      )
      // Admin fallback also returns no org
      const { createAdminClient } = await import('@/lib/supabase/admin')
      vi.mocked(createAdminClient).mockReturnValue({
        from: vi.fn(() => createOrgUserBuilder(null)),
      } as any)

      await testApiHandler({
        appHandler: contactsRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({ method: 'GET' })
          expect(response.status).toBe(400)
          const data = await response.json()
          expect(data.error).toBe('Organization not found')
        },
      })
    })

    it('returns empty contacts list for new organization', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const contactsBuilder = createChainableBuilder({ data: [], error: null, count: 0 } as any)
      vi.mocked(createClient).mockResolvedValue(
        createAuthMock({
          user: TEST_USER,
          tableBuilders: { contacts: contactsBuilder },
        }) as any
      )

      await testApiHandler({
        appHandler: contactsRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({ method: 'GET' })
          expect(response.status).toBe(200)
          const data = await response.json()
          expect(data.contacts).toEqual([])
          expect(data.total).toBe(0)
          expect(data.limit).toBeDefined()
          expect(data.offset).toBeDefined()
        },
      })
    })

    it('returns contacts list with pagination info', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const mockContacts = [
        { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@example.com', organization_id: 'test-org-id' },
        { id: '2', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com', organization_id: 'test-org-id' },
      ]
      const contactsBuilder = createChainableBuilder({ data: mockContacts, error: null, count: 2 } as any)
      vi.mocked(createClient).mockResolvedValue(
        createAuthMock({
          user: TEST_USER,
          tableBuilders: { contacts: contactsBuilder },
        }) as any
      )

      await testApiHandler({
        appHandler: contactsRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({ method: 'GET' })
          expect(response.status).toBe(200)
          const data = await response.json()
          expect(data.contacts).toHaveLength(2)
          expect(data.total).toBe(2)
          expect(data.contacts[0].first_name).toBe('John')
          expect(data.contacts[1].first_name).toBe('Jane')
        },
      })
    })

    it('filters contacts by search query', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const mockContacts = [
        { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@example.com', organization_id: 'test-org-id' },
      ]
      const contactsBuilder = createChainableBuilder({ data: mockContacts, error: null, count: 1 } as any)
      vi.mocked(createClient).mockResolvedValue(
        createAuthMock({
          user: TEST_USER,
          tableBuilders: { contacts: contactsBuilder },
        }) as any
      )

      await testApiHandler({
        appHandler: contactsRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({ method: 'GET' } as any)
          expect(response.status).toBe(200)
          const data = await response.json()
          expect(data.contacts).toHaveLength(1)
          expect(data.contacts[0].first_name).toBe('John')
        },
      })
    })
  })

  describe('POST /api/crm/contacts', () => {
    it('returns 401 when user is not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        createAuthMock({ user: null }) as any
      )

      await testApiHandler({
        appHandler: contactsRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ first_name: 'John', email: 'john@example.com' }),
          })
          expect(response.status).toBe(401)
          const data = await response.json()
          expect(data.error).toBe('Unauthorized')
        },
      })
    })

    it('returns 400 when first_name is missing', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        createAuthMock({ user: TEST_USER }) as any
      )

      await testApiHandler({
        appHandler: contactsRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test@example.com' }),
          })
          expect(response.status).toBe(400)
          const data = await response.json()
          expect(data.error).toContain('First name')
        },
      })
    })

    it('returns 400 when email is missing', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(
        createAuthMock({ user: TEST_USER }) as any
      )

      await testApiHandler({
        appHandler: contactsRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ first_name: 'John' }),
          })
          expect(response.status).toBe(400)
          const data = await response.json()
          expect(data.error).toContain('email')
        },
      })
    })

    it('returns 201 and creates contact with valid data', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const mockContact = {
        id: 'new-contact-id',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        organization_id: 'test-org-id',
        created_by: 'test-user-id',
      }
      const contactsBuilder = createChainableBuilder({ data: mockContact, error: null })
      vi.mocked(createClient).mockResolvedValue(
        createAuthMock({
          user: TEST_USER,
          tableBuilders: { contacts: contactsBuilder },
        }) as any
      )

      await testApiHandler({
        appHandler: contactsRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              first_name: 'John',
              last_name: 'Doe',
              email: 'john@example.com',
            }),
          })
          expect(response.status).toBe(201)
          const data = await response.json()
          expect(data.contact).toBeDefined()
          expect(data.contact.first_name).toBe('John')
          expect(data.contact.email).toBe('john@example.com')
        },
      })
    })

    it('returns 409 when email already exists', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const contactsBuilder = createChainableBuilder({
        data: null,
        error: { code: '23505', message: 'Duplicate key' },
      })
      vi.mocked(createClient).mockResolvedValue(
        createAuthMock({
          user: TEST_USER,
          tableBuilders: { contacts: contactsBuilder },
        }) as any
      )

      await testApiHandler({
        appHandler: contactsRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              first_name: 'John',
              last_name: 'Doe',
              email: 'john@example.com',
            }),
          })
          expect(response.status).toBe(409)
          const data = await response.json()
          expect(data.error).toContain('already exists')
        },
      })
    })

    it('creates contact with optional fields', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const mockContact = {
        id: 'new-contact-id',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '+27123456789',
        company: 'Acme Corp',
        job_title: 'CEO',
        organization_id: 'test-org-id',
        created_by: 'test-user-id',
      }
      const contactsBuilder = createChainableBuilder({ data: mockContact, error: null })
      vi.mocked(createClient).mockResolvedValue(
        createAuthMock({
          user: TEST_USER,
          tableBuilders: { contacts: contactsBuilder },
        }) as any
      )

      await testApiHandler({
        appHandler: contactsRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              first_name: 'John',
              last_name: 'Doe',
              email: 'john@example.com',
              phone: '+27123456789',
              company: 'Acme Corp',
              job_title: 'CEO',
            }),
          })
          expect(response.status).toBe(201)
          const data = await response.json()
          expect(data.contact.phone).toBe('+27123456789')
          expect(data.contact.company).toBe('Acme Corp')
          expect(data.contact.job_title).toBe('CEO')
        },
      })
    })
  })
})
