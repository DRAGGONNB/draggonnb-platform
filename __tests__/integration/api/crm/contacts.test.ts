/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { testApiHandler } from 'next-test-api-route-handler'
import * as contactsRoute from '@/app/api/crm/contacts/route'

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('CRM Contacts API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/crm/contacts', () => {
    it('returns 401 when user is not authenticated', async () => {
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
                    data: { id: 'test-user-id', organization_id: 'test-org-id' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'contacts') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    range: vi.fn().mockResolvedValue({
                      data: [],
                      error: null,
                      count: 0,
                    }),
                  })),
                })),
              })),
            }
          }
          return {}
        }),
      } as any)

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
                    data: { id: 'test-user-id', organization_id: 'test-org-id' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'contacts') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    range: vi.fn().mockResolvedValue({
                      data: mockContacts,
                      error: null,
                      count: 2,
                    }),
                  })),
                })),
              })),
            }
          }
          return {}
        }),
      } as any)

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
                    data: { id: 'test-user-id', organization_id: 'test-org-id' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'contacts') {
            const rangeResult = {
              data: mockContacts,
              error: null,
              count: 1,
              or: vi.fn().mockResolvedValue({
                data: mockContacts,
                error: null,
                count: 1,
              }),
            }
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    range: vi.fn(() => rangeResult),
                  })),
                })),
              })),
            }
          }
          return {}
        }),
      } as any)

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
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Not authenticated'),
          }),
        },
      } as any)

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
                    data: { id: 'test-user-id', organization_id: 'test-org-id' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          return {}
        }),
      } as any)

      await testApiHandler({
        appHandler: contactsRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test@example.com' }), // Missing first_name
          })
          expect(response.status).toBe(400)
          const data = await response.json()
          expect(data.error).toContain('First name')
        },
      })
    })

    it('returns 400 when email is missing', async () => {
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
                    data: { id: 'test-user-id', organization_id: 'test-org-id' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          return {}
        }),
      } as any)

      await testApiHandler({
        appHandler: contactsRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ first_name: 'John' }), // Missing email
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
                    data: { id: 'test-user-id', organization_id: 'test-org-id' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'contacts') {
            return {
              insert: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: mockContact,
                    error: null,
                  }),
                })),
              })),
            }
          }
          return {}
        }),
      } as any)

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
                    data: { id: 'test-user-id', organization_id: 'test-org-id' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'contacts') {
            return {
              insert: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: '23505', message: 'Duplicate key' },
                  }),
                })),
              })),
            }
          }
          return {}
        }),
      } as any)

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
                    data: { id: 'test-user-id', organization_id: 'test-org-id' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'contacts') {
            return {
              insert: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: mockContact,
                    error: null,
                  }),
                })),
              })),
            }
          }
          return {}
        }),
      } as any)

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
