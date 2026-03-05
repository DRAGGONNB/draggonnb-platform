import { vi } from 'vitest'

/**
 * Pre-built tenant configurations for testing across tiers
 */

export const CORE_TENANT = {
  orgId: 'core-org-id',
  userId: 'core-user-id',
  email: 'core@test.co.za',
  subdomain: 'coretest',
  tier: 'core',
  enabledModules: ['crm', 'email', 'analytics'],
  usageLimits: {
    social_posts: 30,
    ai_generations: 50,
    email_sends: 1000,
    agent_invocations: 10,
    autopilot_runs: 2,
  },
}

export const GROWTH_TENANT = {
  orgId: 'growth-org-id',
  userId: 'growth-user-id',
  email: 'growth@test.co.za',
  subdomain: 'growthtest',
  tier: 'growth',
  enabledModules: ['crm', 'email', 'social', 'content_studio', 'accommodation', 'analytics'],
  usageLimits: {
    social_posts: 100,
    ai_generations: 200,
    email_sends: 10000,
    agent_invocations: 50,
    autopilot_runs: 4,
  },
}

export const SCALE_TENANT = {
  orgId: 'scale-org-id',
  userId: 'scale-user-id',
  email: 'scale@test.co.za',
  subdomain: 'scaletest',
  tier: 'scale',
  enabledModules: ['crm', 'email', 'social', 'content_studio', 'accommodation', 'ai_agents', 'analytics'],
  usageLimits: {
    social_posts: Infinity,
    ai_generations: Infinity,
    email_sends: Infinity,
    agent_invocations: 1000,
    autopilot_runs: Infinity,
  },
}

// Alias tiers (legacy names)
export const STARTER_TENANT = { ...CORE_TENANT, tier: 'starter' }
export const PROFESSIONAL_TENANT = { ...GROWTH_TENANT, tier: 'professional' }
export const ENTERPRISE_TENANT = { ...SCALE_TENANT, tier: 'enterprise' }

export type TenantConfig = typeof CORE_TENANT

/**
 * Build x-tenant-* headers for a tenant config
 */
export function tenantHeaders(tenant: TenantConfig): Record<string, string> {
  return {
    'x-tenant-id': tenant.orgId,
    'x-tenant-subdomain': tenant.subdomain,
    'x-tenant-tier': tenant.tier,
    'x-tenant-modules': tenant.enabledModules.join(','),
  }
}

/**
 * Create a mock Supabase client pre-configured for a specific tenant
 */
export function createTenantMock(tenant: TenantConfig) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: tenant.userId, email: tenant.email } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: tenant.userId, organization_id: tenant.orgId },
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
                data: { id: tenant.orgId, subscription_tier: tenant.tier, subdomain: tenant.subdomain },
                error: null,
              }),
            })),
          })),
        }
      }
      if (table === 'tenant_modules') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                data: tenant.enabledModules.map(m => ({ module_id: m })),
                error: null,
              })),
            })),
          })),
        }
      }
      // Default: return chainable mock
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            order: vi.fn(() => ({
              range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
            })),
          })),
          order: vi.fn(() => ({
            range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'updated-id' }, error: null }),
            })),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      }
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
}
