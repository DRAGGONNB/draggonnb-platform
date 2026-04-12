/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { testApiHandler } from 'next-test-api-route-handler'
import * as companiesRoute from '@/app/api/crm/companies/route'
import { testAuthRequired, testOrgRequired } from '@/__tests__/helpers/api-test-utils'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => createChainableBuilder({ data: null, error: { message: 'Not found' } })),
  })),
}))

vi.mock('@/lib/webhooks/dispatcher', () => ({
  dispatchWebhooksForOrg: vi.fn().mockResolvedValue(undefined),
}))

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
      const companiesBuilder = createChainableBuilder({ data: mockCompany, error: null })
      const mock = createCompaniesAuthMock()
      ;(mock.from as any).mockImplementation((table: string) => {
        if (table === 'organization_users') {
          return createOrgUserBuilder('test-org-id')
        }
        if (table === 'companies') {
          return companiesBuilder
        }
        return createChainableBuilder({ data: null, error: null })
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
  const companiesBuilder = createChainableBuilder({ data: companies, error: null, count } as any)

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@test.co.za' } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'organization_users') {
        return createOrgUserBuilder('test-org-id')
      }
      if (table === 'companies') {
        return companiesBuilder
      }
      return createChainableBuilder({ data: null, error: null })
    }),
  }
}
