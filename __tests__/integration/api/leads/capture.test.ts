/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { testApiHandler } from 'next-test-api-route-handler'
import * as captureRoute from '@/app/api/leads/capture/route'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

describe('Lead Capture API (Public)', () => {
  // Each test gets a unique IP to avoid rate limiter collisions
  let testIp = 0

  beforeEach(() => {
    vi.clearAllMocks()
    testIp++
  })

  function getTestHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-forwarded-for': `10.0.0.${testIp}`,
    }
  }

  const validLead = {
    email: 'newlead@company.co.za',
    company_name: 'Test Company SA',
    contact_name: 'John Doe',
    business_issues: ['manual_processes', 'no_crm'],
    industry: 'technology',
  }

  describe('POST /api/leads/capture', () => {
    it('captures valid lead successfully', async () => {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      vi.mocked(createAdminClient).mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'leads') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({ data: null, error: null }),
                    })),
                  })),
                })),
              })),
              insert: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'new-lead-id' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          return {}
        }),
      } as any)

      // Mock the async qualification trigger
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

      await testApiHandler({
        appHandler: captureRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: getTestHeaders(),
            body: JSON.stringify(validLead),
          })
          expect(response.status).toBe(200)
          const data = await response.json()
          expect(data.success).toBe(true)
          expect(data.leadId).toBe('new-lead-id')
        },
      })
    })

    it('returns 400 when email is missing', async () => {
      await testApiHandler({
        appHandler: captureRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: getTestHeaders(),
            body: JSON.stringify({ company_name: 'Test', business_issues: ['test'] }),
          })
          expect(response.status).toBe(400)
          const data = await response.json()
          expect(data.error).toContain('Email')
        },
      })
    })

    it('returns 400 when company_name is missing', async () => {
      await testApiHandler({
        appHandler: captureRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: getTestHeaders(),
            body: JSON.stringify({ email: 'test@test.co.za', business_issues: ['test'] }),
          })
          expect(response.status).toBe(400)
          const data = await response.json()
          expect(data.error).toContain('Company')
        },
      })
    })

    it('returns 400 for invalid email format', async () => {
      await testApiHandler({
        appHandler: captureRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: getTestHeaders(),
            body: JSON.stringify({
              ...validLead,
              email: 'not-an-email',
            }),
          })
          expect(response.status).toBe(400)
          const data = await response.json()
          expect(data.error).toContain('email')
        },
      })
    })

    it('returns 400 when no business issues provided', async () => {
      await testApiHandler({
        appHandler: captureRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: getTestHeaders(),
            body: JSON.stringify({
              email: 'test@test.co.za',
              company_name: 'Test',
              business_issues: [],
            }),
          })
          expect(response.status).toBe(400)
          const data = await response.json()
          expect(data.error).toContain('business challenge')
        },
      })
    })

    it('silently accepts honeypot submissions without processing', async () => {
      await testApiHandler({
        appHandler: captureRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: getTestHeaders(),
            body: JSON.stringify({
              ...validLead,
              honeypot: 'bot-filled-this',
            }),
          })
          expect(response.status).toBe(200)
          const data = await response.json()
          expect(data.success).toBe(true)
          // Should NOT have created a real lead
          expect(data.leadId).toBe('captured')
        },
      })
    })

    it('returns existing lead if duplicate within 24 hours', async () => {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      vi.mocked(createAdminClient).mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'leads') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({
                        data: { id: 'existing-lead-id' },
                        error: null,
                      }),
                    })),
                  })),
                })),
              })),
            }
          }
          return {}
        }),
      } as any)

      await testApiHandler({
        appHandler: captureRoute as any,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: getTestHeaders(),
            body: JSON.stringify(validLead),
          })
          expect(response.status).toBe(200)
          const data = await response.json()
          expect(data.success).toBe(true)
          expect(data.leadId).toBe('existing-lead-id')
          expect(data.message).toContain('already captured')
        },
      })
    })
  })
})
