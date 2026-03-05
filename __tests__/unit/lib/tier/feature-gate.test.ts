/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  checkFeatureAccess,
  normalizeTier,
  TIER_LIMITS,
  type Feature,
  type UsageMetric,
} from '@/lib/tier/feature-gate'

// Mock the admin client for async functions
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

describe('Feature Gate System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('normalizeTier()', () => {
    it('maps starter to core', () => {
      expect(normalizeTier('starter')).toBe('core')
    })

    it('maps professional to growth', () => {
      expect(normalizeTier('professional')).toBe('growth')
    })

    it('maps enterprise to scale', () => {
      expect(normalizeTier('enterprise')).toBe('scale')
    })

    it('returns tier unchanged when no alias exists', () => {
      expect(normalizeTier('core')).toBe('core')
      expect(normalizeTier('growth')).toBe('growth')
      expect(normalizeTier('scale')).toBe('scale')
    })
  })

  describe('TIER_LIMITS', () => {
    it('core tier has correct limits', () => {
      expect(TIER_LIMITS.core.social_posts).toBe(30)
      expect(TIER_LIMITS.core.ai_generations).toBe(50)
      expect(TIER_LIMITS.core.email_sends).toBe(1000)
      expect(TIER_LIMITS.core.agent_invocations).toBe(10)
      expect(TIER_LIMITS.core.autopilot_runs).toBe(2)
    })

    it('growth tier has higher limits', () => {
      expect(TIER_LIMITS.growth.social_posts).toBe(100)
      expect(TIER_LIMITS.growth.ai_generations).toBe(200)
      expect(TIER_LIMITS.growth.email_sends).toBe(10000)
      expect(TIER_LIMITS.growth.agent_invocations).toBe(50)
      expect(TIER_LIMITS.growth.autopilot_runs).toBe(4)
    })

    it('scale tier has unlimited or very high limits', () => {
      expect(TIER_LIMITS.scale.social_posts).toBe(Infinity)
      expect(TIER_LIMITS.scale.ai_generations).toBe(Infinity)
      expect(TIER_LIMITS.scale.email_sends).toBe(Infinity)
      expect(TIER_LIMITS.scale.agent_invocations).toBe(1000)
      expect(TIER_LIMITS.scale.autopilot_runs).toBe(Infinity)
    })
  })

  describe('checkFeatureAccess()', () => {
    // Core tier features
    const coreFeatures: Feature[] = [
      'social_posts', 'ai_generations', 'email_sends',
      'social_accounts', 'team_users', 'custom_automations',
      'ai_agents', 'business_autopilot',
    ]

    // Growth tier features (minimum)
    const growthFeatures: Feature[] = [
      'ab_testing', 'smart_segmentation', 'lead_pipeline',
      'advanced_analytics', 'accommodation_module',
    ]

    // Scale tier features (minimum)
    const scaleFeatures: Feature[] = [
      'white_label', 'api_access', 'custom_integrations',
    ]

    it('allows core features for core tier', () => {
      for (const feature of coreFeatures) {
        const result = checkFeatureAccess('core', feature)
        expect(result.allowed).toBe(true)
      }
    })

    it('blocks growth features for core tier', () => {
      for (const feature of growthFeatures) {
        const result = checkFeatureAccess('core', feature)
        expect(result.allowed).toBe(false)
        expect(result.upgradeRequired).toBe('growth')
        expect(result.reason).toContain('growth tier or above')
      }
    })

    it('blocks scale features for core tier', () => {
      for (const feature of scaleFeatures) {
        const result = checkFeatureAccess('core', feature)
        expect(result.allowed).toBe(false)
        expect(result.upgradeRequired).toBe('scale')
      }
    })

    it('allows core + growth features for growth tier', () => {
      for (const feature of [...coreFeatures, ...growthFeatures]) {
        const result = checkFeatureAccess('growth', feature)
        expect(result.allowed).toBe(true)
      }
    })

    it('blocks scale features for growth tier', () => {
      for (const feature of scaleFeatures) {
        const result = checkFeatureAccess('growth', feature)
        expect(result.allowed).toBe(false)
        expect(result.upgradeRequired).toBe('scale')
      }
    })

    it('allows all features for scale tier', () => {
      for (const feature of [...coreFeatures, ...growthFeatures, ...scaleFeatures]) {
        const result = checkFeatureAccess('scale', feature)
        expect(result.allowed).toBe(true)
      }
    })

    it('handles tier aliases correctly', () => {
      // starter = core
      expect(checkFeatureAccess('starter', 'social_posts').allowed).toBe(true)
      expect(checkFeatureAccess('starter', 'accommodation_module').allowed).toBe(false)

      // professional = growth
      expect(checkFeatureAccess('professional', 'accommodation_module').allowed).toBe(true)
      expect(checkFeatureAccess('professional', 'white_label').allowed).toBe(false)

      // enterprise = scale
      expect(checkFeatureAccess('enterprise', 'white_label').allowed).toBe(true)
    })

    it('blocks unknown tier for all features', () => {
      const result = checkFeatureAccess('unknown', 'social_posts')
      expect(result.allowed).toBe(false)
    })

    it('accommodation_module requires growth tier', () => {
      expect(checkFeatureAccess('core', 'accommodation_module').allowed).toBe(false)
      expect(checkFeatureAccess('core', 'accommodation_module').upgradeRequired).toBe('growth')
      expect(checkFeatureAccess('growth', 'accommodation_module').allowed).toBe(true)
      expect(checkFeatureAccess('scale', 'accommodation_module').allowed).toBe(true)
    })
  })

  describe('checkUsage()', () => {
    it('blocks when usage at limit for core tier', async () => {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      vi.mocked(createAdminClient).mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'organizations') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { subscription_tier: 'core' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'client_usage_metrics') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { posts_monthly: 30 },
                    error: null,
                  }),
                })),
              })),
            }
          }
          return {}
        }),
      } as any)

      const { checkUsage } = await import('@/lib/tier/feature-gate')
      const result = await checkUsage('test-org-id', 'social_posts')
      expect(result.allowed).toBe(false)
      expect(result.current).toBe(30)
      expect(result.limit).toBe(30)
      expect(result.upgradeRequired).toBe('growth')
    })

    it('allows when usage under limit', async () => {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      vi.mocked(createAdminClient).mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'organizations') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { subscription_tier: 'core' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'client_usage_metrics') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { posts_monthly: 15 },
                    error: null,
                  }),
                })),
              })),
            }
          }
          return {}
        }),
      } as any)

      const { checkUsage } = await import('@/lib/tier/feature-gate')
      const result = await checkUsage('test-org-id', 'social_posts')
      expect(result.allowed).toBe(true)
      expect(result.current).toBe(15)
      expect(result.limit).toBe(30)
    })

    it('returns not found for missing organization', async () => {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      vi.mocked(createAdminClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
            })),
          })),
        })),
      } as any)

      const { checkUsage } = await import('@/lib/tier/feature-gate')
      const result = await checkUsage('nonexistent-org', 'social_posts')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Organization not found')
    })

    it('allows when no usage record exists yet', async () => {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      vi.mocked(createAdminClient).mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'organizations') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { subscription_tier: 'core' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'No rows' } }),
              })),
            })),
          }
        }),
      } as any)

      const { checkUsage } = await import('@/lib/tier/feature-gate')
      const result = await checkUsage('new-org', 'social_posts')
      expect(result.allowed).toBe(true)
      expect(result.current).toBe(0)
    })
  })

  describe('incrementUsage()', () => {
    it('calls RPC function for atomic increment', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null })
      const { createAdminClient } = await import('@/lib/supabase/admin')
      vi.mocked(createAdminClient).mockReturnValue({
        rpc: mockRpc,
        from: vi.fn(),
      } as any)

      const { incrementUsage } = await import('@/lib/tier/feature-gate')
      await incrementUsage('test-org-id', 'ai_generations', 1)

      expect(mockRpc).toHaveBeenCalledWith('increment_usage_metric', {
        p_organization_id: 'test-org-id',
        p_column_name: 'ai_generations_monthly',
        p_amount: 1,
      })
    })

    it('falls back to read-then-write when RPC fails', async () => {
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }))
      const { createAdminClient } = await import('@/lib/supabase/admin')
      vi.mocked(createAdminClient).mockReturnValue({
        rpc: vi.fn().mockResolvedValue({ error: { message: 'RPC not found' } }),
        from: vi.fn((table: string) => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { ai_generations_monthly: 5 },
                error: null,
              }),
            })),
          })),
          update: mockUpdate,
        })),
      } as any)

      const { incrementUsage } = await import('@/lib/tier/feature-gate')
      await incrementUsage('test-org-id', 'ai_generations', 1)

      expect(mockUpdate).toHaveBeenCalledWith({ ai_generations_monthly: 6 })
    })
  })

  describe('getGenerationLimit()', () => {
    it('returns correct limit for each tier', async () => {
      const { getGenerationLimit } = await import('@/lib/tier/feature-gate')
      expect(getGenerationLimit('core')).toBe(50)
      expect(getGenerationLimit('growth')).toBe(200)
      expect(getGenerationLimit('scale')).toBe(Infinity)
    })

    it('handles aliases', async () => {
      const { getGenerationLimit } = await import('@/lib/tier/feature-gate')
      expect(getGenerationLimit('starter')).toBe(50)
      expect(getGenerationLimit('professional')).toBe(200)
      expect(getGenerationLimit('enterprise')).toBe(Infinity)
    })

    it('returns default 50 for unknown tier', async () => {
      const { getGenerationLimit } = await import('@/lib/tier/feature-gate')
      expect(getGenerationLimit('unknown')).toBe(50)
    })
  })
})
