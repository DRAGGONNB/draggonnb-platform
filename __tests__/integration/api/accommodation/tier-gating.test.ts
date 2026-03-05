/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkFeatureAccess } from '@/lib/tier/feature-gate'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('Accommodation Tier Gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('feature gate checks', () => {
    it('blocks accommodation for core tier', () => {
      const result = checkFeatureAccess('core', 'accommodation_module')
      expect(result.allowed).toBe(false)
      expect(result.upgradeRequired).toBe('growth')
      expect(result.reason).toContain('growth tier or above')
    })

    it('blocks accommodation for starter tier (alias for core)', () => {
      const result = checkFeatureAccess('starter', 'accommodation_module')
      expect(result.allowed).toBe(false)
      expect(result.upgradeRequired).toBe('growth')
    })

    it('allows accommodation for growth tier', () => {
      const result = checkFeatureAccess('growth', 'accommodation_module')
      expect(result.allowed).toBe(true)
    })

    it('allows accommodation for professional tier (alias for growth)', () => {
      const result = checkFeatureAccess('professional', 'accommodation_module')
      expect(result.allowed).toBe(true)
    })

    it('allows accommodation for scale tier', () => {
      const result = checkFeatureAccess('scale', 'accommodation_module')
      expect(result.allowed).toBe(true)
    })

    it('allows accommodation for enterprise tier (alias for scale)', () => {
      const result = checkFeatureAccess('enterprise', 'accommodation_module')
      expect(result.allowed).toBe(true)
    })
  })

  describe('getAccommodationAuth() integration', () => {
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

      const { getAccommodationAuth, isAuthError } = await import('@/lib/accommodation/api-helpers')
      const result = await getAccommodationAuth()
      expect(isAuthError(result)).toBe(true)
    })

    it('returns 400 when user has no organization', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user', email: 'test@test.co.za' } },
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
      } as any)

      const { getAccommodationAuth, isAuthError } = await import('@/lib/accommodation/api-helpers')
      const result = await getAccommodationAuth()
      expect(isAuthError(result)).toBe(true)
    })

    it('returns 403 for core tier user', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'core-user', email: 'core@test.co.za' } },
            error: null,
          }),
        },
        from: vi.fn((table: string) => {
          if (table === 'users') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'core-user', organization_id: 'core-org' },
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
      } as any)

      const { getAccommodationAuth, isAuthError } = await import('@/lib/accommodation/api-helpers')
      const result = await getAccommodationAuth()
      expect(isAuthError(result)).toBe(true)
    })

    it('returns AuthContext for growth tier user', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'growth-user', email: 'growth@test.co.za' } },
            error: null,
          }),
        },
        from: vi.fn((table: string) => {
          if (table === 'users') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'growth-user', organization_id: 'growth-org' },
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
                    data: { id: 'growth-org', subscription_tier: 'growth' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          return {}
        }),
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const { getAccommodationAuth, isAuthError } = await import('@/lib/accommodation/api-helpers')
      const result = await getAccommodationAuth()
      expect(isAuthError(result)).toBe(false)
      if (!isAuthError(result)) {
        expect(result.userId).toBe('growth-user')
        expect(result.organizationId).toBe('growth-org')
        expect(result.supabase).toBeDefined()
      }
    })
  })
})
