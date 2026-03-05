/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { testApiHandler } from 'next-test-api-route-handler'
import * as companiesRoute from '@/app/api/crm/companies/route'
import { testAuthRequired, testOrgRequired } from '@/__tests__/helpers/api-test-utils'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('CRM Companies API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/crm/companies', () => {
    it('returns 401 when not authenticated', async () => {
      await testAuthRequired(companiesRoute as any)
    })

    it('returns 400 when user has no organization', async () => {
      await testOrgRequired(companiesRoute as any)
    })

    it('returns empty companies list', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(createCompaniesAuthMock([], 0) as any)

      await testApiHandler({
        appHandler: companiesRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({ method: 'GET' })
          expect(response.status).toBe(200)
          const data = await response.json()
          expect(data.companies).toEqual([])
          expect(data.total).toBe(0)
        },
      })
    })

    it('returns companies list with pagination', async () => {
      const mockCompanies = [
        { id: '1', name: 'Acme Corp', industry: 'Technology', organization_id: 'test-org-id' },
        { id: '2', name: 'Safari Lodge', industry: 'Tourism', organization_id: 'test-org-id' },
      ]
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(createCompaniesAuthMock(mockCompanies, 2) as any)

      await testApiHandler({
        appHandler: companiesRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({ method: 'GET' })
          expect(response.status).toBe(200)
          const data = await response.json()
          expect(data.companies).toHaveLength(2)
          expect(data.total).toBe(2)
          expect(data.companies[0].name).toBe('Acme Corp')
        },
      })
    })
  })

  describe('POST /api/crm/companies', () => {
    it('returns 401 when not authenticated', async () => {
      await testAuthRequired(companiesRoute as any, 'POST', { name: 'Test Company' })
    })

    it('returns 400 when name is missing', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(createCompaniesAuthMock() as any)

      await testApiHandler({
        appHandler: companiesRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ industry: 'Tech' }),
          })
          expect(response.status).toBe(400)
          const data = await response.json()
          expect(data.error).toContain('name')
        },
      })
    })

    it('creates company with valid data', async () => {
      const mockCompany = {
        id: 'new-company-id',
        name: 'New SA Company',
        industry: 'Tourism',
        organization_id: 'test-org-id',
      }

      const { createClient } = await import('@/lib/supabase/server')
      const mock = createCompaniesAuthMock()
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
        if (table === 'companies') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockCompany, error: null }),
              })),
            })),
          }
        }
        return {}
      })
      vi.mocked(createClient).mockResolvedValue(mock as any)

      await testApiHandler({
        appHandler: companiesRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'New SA Company',
              industry: 'Tourism',
            }),
          })
          expect(response.status).toBe(201)
          const data = await response.json()
          expect(data.company).toBeDefined()
          expect(data.company.name).toBe('New SA Company')
          expect(data.company.industry).toBe('Tourism')
        },
      })
    })
  })
})

function createCompaniesAuthMock(companies: unknown[] = [], count: number = 0) {
  const orMock = vi.fn().mockResolvedValue({ data: companies, error: null, count })

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
      if (table === 'companies') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                range: vi.fn().mockImplementation(() => ({
                  or: orMock,
                  then: (resolve: any) => resolve({ data: companies, error: null, count }),
                })),
              })),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: companies[0] || { id: 'new-id' }, error: null }),
            })),
          })),
        }
      }
      return {}
    }),
  }
}
