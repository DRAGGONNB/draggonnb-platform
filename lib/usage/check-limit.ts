import { createAdminClient } from '@/lib/supabase/admin'
import type { UsageDimension } from './meter'
import { getBoltOnBalance } from './deduct-credits'

export interface UsageLimitResult {
  allowed: boolean
  current: number
  planIncluded: number
  boltOnRemaining: number
  totalAvailable: number
  percent: number
  overageAvailable: boolean
  overageRateZar: number // cents per unit
  overageUnits: number
  overageCostZar: number // cents
  upgradeRequired?: string
  reason?: string
}

/**
 * Check whether an organization can use more of a given dimension.
 *
 * Reads from billing_plans + plan_limits + usage_events + tenant_credits.
 * Falls back to the legacy feature-gate system if no tenant_subscription exists.
 */
export async function checkUsageLimit(
  organizationId: string,
  dimension: UsageDimension
): Promise<UsageLimitResult> {
  const supabase = createAdminClient()

  // 1. Get tenant subscription + plan info
  const { data: sub } = await supabase
    .from('tenant_subscriptions')
    .select(`
      id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      billing_plans!inner (
        slug,
        name
      )
    `)
    .eq('organization_id', organizationId)
    .in('status', ['active', 'trialing'])
    .single()

  // No subscription found -- fall back to legacy system
  if (!sub) {
    return {
      allowed: true,
      current: 0,
      planIncluded: 0,
      boltOnRemaining: 0,
      totalAvailable: 0,
      percent: 0,
      overageAvailable: false,
      overageRateZar: 0,
      overageUnits: 0,
      overageCostZar: 0,
      reason: 'No subscription found, using legacy limits',
    }
  }

  // 2. Get plan limit for this dimension
  const { data: limit } = await supabase
    .from('plan_limits')
    .select('included_quantity, overage_rate_zar')
    .eq('plan_id', sub.plan_id)
    .eq('dimension', dimension)
    .single()

  if (!limit) {
    return {
      allowed: true,
      current: 0,
      planIncluded: 0,
      boltOnRemaining: 0,
      totalAvailable: 0,
      percent: 0,
      overageAvailable: false,
      overageRateZar: 0,
      overageUnits: 0,
      overageCostZar: 0,
      reason: `Dimension '${dimension}' not configured for plan`,
    }
  }

  // 3. Get current period usage + bolt-on balance in parallel
  const [usageResult, boltOnRemaining] = await Promise.all([
    supabase
      .from('usage_events')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('dimension', dimension)
      .gte('created_at', sub.current_period_start)
      .lt('created_at', sub.current_period_end),
    getBoltOnBalance(organizationId, dimension),
  ])

  const current = usageResult.count || 0
  const planIncluded = limit.included_quantity
  const overageRateZar = limit.overage_rate_zar
  const overageAvailable = overageRateZar > 0

  // For "unlimited" plans (999999), always allow
  const isUnlimited = planIncluded >= 999999
  const totalAvailable = planIncluded + boltOnRemaining
  const percent = isUnlimited ? 0 : totalAvailable > 0 ? Math.round((current / totalAvailable) * 100) : 0

  // Overage = usage beyond plan + bolt-on credits
  const overageUnits = isUnlimited ? 0 : Math.max(0, current - totalAvailable)
  const overageCostZar = overageUnits * overageRateZar

  const allowed = isUnlimited || current < totalAvailable || overageAvailable

  const result: UsageLimitResult = {
    allowed,
    current,
    planIncluded,
    boltOnRemaining,
    totalAvailable,
    percent,
    overageAvailable,
    overageRateZar,
    overageUnits,
    overageCostZar,
  }

  if (!allowed) {
    const planSlug = (sub.billing_plans as unknown as { slug: string }).slug
    const tierOrder = ['core', 'growth', 'scale']
    const currentIdx = tierOrder.indexOf(planSlug)
    if (currentIdx < tierOrder.length - 1) {
      result.upgradeRequired = tierOrder[currentIdx + 1]
    }
    result.reason = `Monthly ${dimension.replace(/_/g, ' ')} limit reached (${current}/${totalAvailable})`
  }

  return result
}

/**
 * Get usage summary for all dimensions for an organization.
 * Useful for the client-facing usage dashboard.
 */
export async function getUsageSummary(
  organizationId: string
): Promise<Record<string, UsageLimitResult>> {
  const dimensions: UsageDimension[] = [
    'ai_generations',
    'social_posts',
    'email_sends',
    'agent_invocations',
    'autopilot_runs',
  ]

  const results: Record<string, UsageLimitResult> = {}

  const checks = await Promise.all(
    dimensions.map(dim => checkUsageLimit(organizationId, dim))
  )

  dimensions.forEach((dim, i) => {
    results[dim] = checks[i]
  })

  return results
}
