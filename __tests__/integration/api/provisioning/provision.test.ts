/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { testApiHandler } from 'next-test-api-route-handler'
import * as provisioningRoute from '@/app/api/provisioning/route'
import { testAuthRequired } from '@/__tests__/helpers/api-test-utils'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/scripts/provisioning/orchestrator', () => ({
  provisionClient: vi.fn(),
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

/** Create a mock supabase client that passes auth and admin role check */
function mockAuthenticatedAdmin() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'admin-user' } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'organization_users') {
        return createChainableBuilder({
          data: { role: 'admin' },
          error: null,
        })
      }
      return createChainableBuilder({ data: null, error: null })
    }),
  } as any
}

describe('Provisioning API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const validBody = {
    clientId: 'test-client',
    clientName: 'Test Client SA',
    orgEmail: 'admin@testclient.co.za',
    tier: 'growth',
  }

  describe('POST /api/provisioning', () => {
    it('returns 401 when not authenticated', async () => {
      await testAuthRequired(provisioningRoute as any, 'POST', validBody)
    })

    it('returns 400 for missing clientId', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockAuthenticatedAdmin())

      await testApiHandler({
        appHandler: provisioningRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientName: 'Test', orgEmail: 'a@b.co.za', tier: 'core' }),
          })
          expect(response.status).toBe(400)
          const data = await response.json()
          expect(data.error).toContain('Invalid')
          expect(data.details).toBeDefined()
        },
      })
    })

    it('returns 400 for invalid tier', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockAuthenticatedAdmin())

      await testApiHandler({
        appHandler: provisioningRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...validBody, tier: 'invalid-tier' }),
          })
          expect(response.status).toBe(400)
          const data = await response.json()
          expect(data.error).toContain('Invalid')
        },
      })
    })

    it('returns 400 for invalid email', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockAuthenticatedAdmin())

      await testApiHandler({
        appHandler: provisioningRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...validBody, orgEmail: 'not-an-email' }),
          })
          expect(response.status).toBe(400)
        },
      })
    })

    it('accepts all valid tier names', async () => {
      const validTiers = ['starter', 'professional', 'enterprise', 'core', 'growth', 'scale']

      const { createClient } = await import('@/lib/supabase/server')
      const { provisionClient } = await import('@/scripts/provisioning/orchestrator')
      vi.mocked(provisionClient).mockResolvedValue({
        success: true,
        resources: {},
      } as any)

      for (const tier of validTiers) {
        vi.mocked(createClient).mockResolvedValue(mockAuthenticatedAdmin())

        await testApiHandler({
          appHandler: provisioningRoute as any,
          test: async ({ fetch }) => {
            const response = await fetch({
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...validBody, tier }),
            })
            // Should not be 400 (validation pass)
            expect(response.status).not.toBe(400)
          },
        })
      }
    })

    it('validates branding color format', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockAuthenticatedAdmin())

      await testApiHandler({
        appHandler: provisioningRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...validBody,
              branding: { primary_color: 'not-a-hex' },
            }),
          })
          expect(response.status).toBe(400)
        },
      })
    })

    it('accepts valid hex color in branding', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { provisionClient } = await import('@/scripts/provisioning/orchestrator')
      vi.mocked(provisionClient).mockResolvedValue({ success: true, resources: {} } as any)
      vi.mocked(createClient).mockResolvedValue(mockAuthenticatedAdmin())

      await testApiHandler({
        appHandler: provisioningRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...validBody,
              branding: { primary_color: '#FF5733' },
            }),
          })
          expect(response.status).not.toBe(400)
        },
      })
    })

    it('returns success with resource URLs on successful provisioning', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { provisionClient } = await import('@/scripts/provisioning/orchestrator')

      vi.mocked(createClient).mockResolvedValue(mockAuthenticatedAdmin())

      vi.mocked(provisionClient).mockResolvedValue({
        success: true,
        resources: {
          organizationId: 'org-123',
          subdomain: 'test-client',
          n8nWebhookUrl: 'https://n8n.test/webhook',
          qaResult: { passed: true },
        },
      } as any)

      await testApiHandler({
        appHandler: provisioningRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validBody),
          })
          expect(response.status).toBe(200)
          const data = await response.json()
          expect(data.success).toBe(true)
          expect(data.resources.organizationId).toBe('org-123')
          expect(data.resources.subdomain).toBe('test-client')
        },
      })
    })
  })
})
