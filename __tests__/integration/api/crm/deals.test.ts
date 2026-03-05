/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { testApiHandler } from 'next-test-api-route-handler'
import * as dealsRoute from '@/app/api/crm/deals/route'
import { testAuthRequired, testOrgRequired } from '@/__tests__/helpers/api-test-utils'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('CRM Deals API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/crm/deals', () => {
    it('returns 401 when not authenticated', async () => {
      await testAuthRequired(dealsRoute as any)
    })

    it('returns 400 when user has no organization', async () => {
      await testOrgRequired(dealsRoute as any)
    })

    it('returns empty deals list', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(createDealsAuthMock([], 0) as any)

      await testApiHandler({
        appHandler: dealsRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({ method: 'GET' })
          expect(response.status).toBe(200)
          const data = await response.json()
          expect(data.deals).toEqual([])
          expect(data.total).toBe(0)
          expect(data.limit).toBeDefined()
          expect(data.offset).toBeDefined()
        },
      })
    })

    it('returns deals with pagination', async () => {
      const mockDeals = [
        { id: '1', name: 'Deal One', value: 50000, stage: 'qualified', organization_id: 'test-org-id' },
        { id: '2', name: 'Deal Two', value: 120000, stage: 'proposal', organization_id: 'test-org-id' },
      ]
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(createDealsAuthMock(mockDeals, 2) as any)

      await testApiHandler({
        appHandler: dealsRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({ method: 'GET' })
          expect(response.status).toBe(200)
          const data = await response.json()
          expect(data.deals).toHaveLength(2)
          expect(data.total).toBe(2)
          expect(data.deals[0].name).toBe('Deal One')
          expect(data.deals[0].value).toBe(50000)
        },
      })
    })
  })

  describe('POST /api/crm/deals', () => {
    it('returns 401 when not authenticated', async () => {
      await testAuthRequired(dealsRoute as any, 'POST', { name: 'Test Deal' })
    })

    it('returns 400 when name is missing', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(createDealsAuthMock() as any)

      await testApiHandler({
        appHandler: dealsRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: 50000 }),
          })
          expect(response.status).toBe(400)
          const data = await response.json()
          expect(data.error).toContain('name')
        },
      })
    })

    it('creates deal with valid data', async () => {
      const mockDeal = {
        id: 'new-deal-id',
        name: 'New Deal',
        value: 75000,
        stage: 'lead',
        organization_id: 'test-org-id',
        created_by: 'test-user-id',
      }

      const { createClient } = await import('@/lib/supabase/server')
      const mock = createDealsAuthMock()
      ;(mock.from as any).mockImplementation((table: string) => {
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
        if (table === 'deals') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockDeal, error: null }),
              })),
            })),
          }
        }
        return {}
      })
      vi.mocked(createClient).mockResolvedValue(mock as any)

      await testApiHandler({
        appHandler: dealsRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'New Deal',
              value: 75000,
              stage: 'lead',
            }),
          })
          expect(response.status).toBe(201)
          const data = await response.json()
          expect(data.deal).toBeDefined()
          expect(data.deal.name).toBe('New Deal')
          expect(data.deal.value).toBe(75000)
        },
      })
    })

    it('defaults stage to lead and value to 0', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const insertMock = vi.fn()
      const mock = createDealsAuthMock()
      ;(mock.from as any).mockImplementation((table: string) => {
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
        if (table === 'deals') {
          insertMock.mockReturnValue({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'new-id', name: 'Minimal Deal', value: 0, stage: 'lead' },
                error: null,
              }),
            })),
          })
          return { insert: insertMock }
        }
        return {}
      })
      vi.mocked(createClient).mockResolvedValue(mock as any)

      await testApiHandler({
        appHandler: dealsRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Minimal Deal' }),
          })
          expect(response.status).toBe(201)
          // Verify defaults were applied in the insert call
          const insertArg = insertMock.mock.calls[0][0]
          expect(insertArg.value).toBe(0)
          expect(insertArg.stage).toBe('lead')
        },
      })
    })
  })
})

function createDealsAuthMock(deals: unknown[] = [], count: number = 0) {
  const orMock = vi.fn().mockResolvedValue({ data: deals, error: null, count })
  const rangeMock = vi.fn().mockReturnValue({ or: orMock, data: deals, error: null, count, then: (resolve: any) => resolve({ data: deals, error: null, count }) })
  // Handle the chained query pattern with .or() being called after .range()
  rangeMock.mockImplementation(() => ({
    or: orMock,
    eq: vi.fn(() => ({ or: orMock, data: deals, error: null, count, then: (resolve: any) => resolve({ data: deals, error: null, count }) })),
    then: (resolve: any) => resolve({ data: deals, error: null, count }),
  }))

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@test.co.za' } },
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
      if (table === 'deals') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                range: rangeMock,
              })),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: deals[0] || { id: 'new-id' }, error: null }),
            })),
          })),
        }
      }
      return {}
    }),
  }
}
