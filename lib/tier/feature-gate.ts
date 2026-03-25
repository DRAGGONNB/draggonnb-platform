import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Centralized Feature Gating System
 * Controls feature access and usage limits based on organization subscription tier.
 *
 * NOTE: The following RPC function must exist in the database (add to migration if not present):
 *
 * CREATE OR REPLACE FUNCTION increment_usage_metric(
 *   p_organization_id UUID,
 *   p_column_name TEXT,
 *   p_amount INTEGER DEFAULT 1
 * ) RETURNS VOID AS $$
 * BEGIN
 *   EXECUTE format(
 *     'UPDATE client_usage_metrics SET %I = COALESCE(%I, 0) + $1 WHERE organization_id = $2',
 *     p_column_name, p_column_name
 *   ) USING p_amount, p_organization_id;
 * END;
 * $$ LANGUAGE plpgsql SECURITY DEFINER;
 */

// Tier hierarchy for comparison
const TIER_HIERARCHY: Record<string, number> = {
  core: 1, starter: 1,
  growth: 2, professional: 2,
  scale: 3, enterprise: 3,
}

// Map old tier names to new
const TIER_ALIASES: Record<string, string> = {
  starter: 'core',
  professional: 'growth',
  enterprise: 'scale',
}

export function normalizeTier(tier: string): string {
  return TIER_ALIASES[tier] || tier
}

export type Feature =
  | 'social_posts'
  | 'ai_generations'
  | 'email_sends'
  | 'social_accounts'
  | 'team_users'
  | 'custom_automations'
  | 'ab_testing'
  | 'smart_segmentation'
  | 'lead_pipeline'
  | 'white_label'
  | 'ai_agents'
  | 'business_autopilot'
  | 'api_access'
  | 'advanced_analytics'
  | 'custom_integrations'
  | 'accommodation_module'
  | 'restaurant_module'
  | 'events_module'
  | 'security_ops_module'

export type UsageMetric =
  | 'social_posts'
  | 'ai_generations'
  | 'email_sends'
  | 'agent_invocations'
  | 'autopilot_runs'

export interface FeatureCheckResult {
  allowed: boolean
  reason?: string
  upgradeRequired?: string  // tier needed
}

export interface UsageCheckResult {
  allowed: boolean
  reason?: string
  current: number
  limit: number
  upgradeRequired?: string
}

// Tier limits configuration
export const TIER_LIMITS: Record<string, Record<UsageMetric, number>> = {
  core: {
    social_posts: 30,
    ai_generations: 50,
    email_sends: 1000,
    agent_invocations: 10,
    autopilot_runs: 2,
  },
  growth: {
    social_posts: 100,
    ai_generations: 200,
    email_sends: 10000,
    agent_invocations: 50,
    autopilot_runs: 4,
  },
  scale: {
    social_posts: Infinity,
    ai_generations: Infinity,
    email_sends: Infinity,
    agent_invocations: 1000,
    autopilot_runs: Infinity,
  },
}

// Feature access by minimum tier
const FEATURE_MIN_TIER: Record<Feature, string> = {
  social_posts: 'core',
  ai_generations: 'core',
  email_sends: 'core',
  social_accounts: 'core',
  team_users: 'core',
  custom_automations: 'core',  // 1 for core, 3+ for growth, unlimited for scale
  ab_testing: 'growth',
  smart_segmentation: 'growth',
  lead_pipeline: 'growth',
  advanced_analytics: 'growth',
  white_label: 'scale',
  ai_agents: 'core',
  business_autopilot: 'core',
  api_access: 'scale',
  custom_integrations: 'scale',
  accommodation_module: 'growth',
  restaurant_module: 'growth',
  events_module: 'growth',
  security_ops_module: 'core',
}

export function checkFeatureAccess(tier: string, feature: Feature): FeatureCheckResult {
  const normalizedTier = normalizeTier(tier)
  const requiredTier = FEATURE_MIN_TIER[feature]

  if (!requiredTier) {
    return { allowed: false, reason: `Unknown feature: ${feature}` }
  }

  const tierLevel = TIER_HIERARCHY[normalizedTier] || 0
  const requiredLevel = TIER_HIERARCHY[requiredTier] || 0

  if (tierLevel >= requiredLevel) {
    return { allowed: true }
  }

  return {
    allowed: false,
    reason: `${feature} requires ${requiredTier} tier or above`,
    upgradeRequired: requiredTier,
  }
}

export async function checkUsage(
  organizationId: string,
  metric: UsageMetric
): Promise<UsageCheckResult> {
  const supabase = createAdminClient()

  // Get organization tier
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('subscription_tier')
    .eq('id', organizationId)
    .single()

  if (orgError || !org) {
    return { allowed: false, reason: 'Organization not found', current: 0, limit: 0 }
  }

  const tier = normalizeTier(org.subscription_tier)
  const limits = TIER_LIMITS[tier]
  if (!limits) {
    return { allowed: false, reason: `Unknown tier: ${tier}`, current: 0, limit: 0 }
  }

  const limit = limits[metric]

  // Get current usage
  const { data: usage, error: usageError } = await supabase
    .from('client_usage_metrics')
    .select('*')
    .eq('organization_id', organizationId)
    .single()

  if (usageError || !usage) {
    return { allowed: true, current: 0, limit }
  }

  // Map metric to column name
  const metricColumn: Record<UsageMetric, string> = {
    social_posts: 'posts_monthly',
    ai_generations: 'ai_generations_monthly',
    email_sends: 'emails_sent_monthly',
    agent_invocations: 'agent_invocations_monthly',
    autopilot_runs: 'autopilot_runs_monthly',
  }

  const current = (usage as Record<string, number>)[metricColumn[metric]] || 0

  if (limit === Infinity || current < limit) {
    return { allowed: true, current, limit }
  }

  // Find the next tier that allows more
  const tierNames = ['core', 'growth', 'scale']
  const currentIndex = tierNames.indexOf(tier)
  const upgradeTier = currentIndex < tierNames.length - 1 ? tierNames[currentIndex + 1] : undefined

  return {
    allowed: false,
    reason: `Monthly ${metric.replace('_', ' ')} limit reached (${current}/${limit})`,
    current,
    limit,
    upgradeRequired: upgradeTier,
  }
}

export async function incrementUsage(
  organizationId: string,
  metric: UsageMetric,
  amount: number = 1
): Promise<void> {
  const supabase = createAdminClient()

  const metricColumn: Record<UsageMetric, string> = {
    social_posts: 'posts_monthly',
    ai_generations: 'ai_generations_monthly',
    email_sends: 'emails_sent_monthly',
    agent_invocations: 'agent_invocations_monthly',
    autopilot_runs: 'autopilot_runs_monthly',
  }

  const column = metricColumn[metric]

  // Use RPC or raw SQL for atomic increment
  const { error } = await supabase.rpc('increment_usage_metric', {
    p_organization_id: organizationId,
    p_column_name: column,
    p_amount: amount,
  })

  if (error) {
    // Fallback: read-then-write (less safe but works without RPC)
    const { data: usage } = await supabase
      .from('client_usage_metrics')
      .select(column)
      .eq('organization_id', organizationId)
      .single()

    if (usage) {
      await supabase
        .from('client_usage_metrics')
        .update({ [column]: ((usage as unknown as Record<string, number>)[column] || 0) + amount })
        .eq('organization_id', organizationId)
    }
  }
}

// Check if a specific module is enabled for an organization (DB-backed)
export async function checkModuleAccess(
  organizationId: string,
  moduleId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('tenant_modules')
    .select('is_enabled')
    .eq('organization_id', organizationId)
    .eq('module_id', moduleId)
    .single()

  if (!data || !data.is_enabled) {
    return { allowed: false, reason: `Module '${moduleId}' is not enabled for this organization` }
  }

  return { allowed: true }
}

// Get all enabled modules for an organization
export async function getEnabledModules(organizationId: string): Promise<string[]> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('tenant_modules')
    .select('module_id')
    .eq('organization_id', organizationId)
    .eq('is_enabled', true)

  return (data || []).map((m: { module_id: string }) => m.module_id)
}

// Get AI generation limit for a subscription tier
export function getGenerationLimit(tier: string): number {
  const normalized = normalizeTier(tier)
  const limits = TIER_LIMITS[normalized]
  return limits?.ai_generations ?? 50
}

// Helper: get organization's tier
export async function getOrganizationTier(organizationId: string): Promise<string | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('organizations')
    .select('subscription_tier')
    .eq('id', organizationId)
    .single()

  if (error || !data) return null
  return normalizeTier(data.subscription_tier)
}
