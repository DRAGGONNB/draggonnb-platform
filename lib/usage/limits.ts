/**
 * Usage Limit Enforcement Helpers
 *
 * Higher-level functions built on top of the metering system.
 * Used by UI components and API routes to check permissions and
 * generate alerts before attempting metered actions.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { checkUsage, getUsageSummary } from './meter'
import type { UsageMetric, UsageAlert } from './types'

// ============================================================================
// CAN PERFORM ACTION
// ============================================================================

/**
 * Check if an organization can perform a metered action.
 * Considers both plan limit and available credit packs.
 *
 * Returns true if:
 * - The metric is unlimited (-1)
 * - Current usage + quantity is within plan limit
 * - Credit packs have enough remaining balance
 */
export async function canPerformAction(
  orgId: string,
  metric: UsageMetric,
  quantity: number = 1
): Promise<boolean> {
  const { data } = await checkUsage(orgId, metric)

  if (!data) return false

  // Unlimited
  if (data.limit === -1) return true

  // Within plan limit
  if (data.used + quantity <= data.limit) return true

  // Check credit packs for overflow
  const creditBalance = await getCreditBalance(orgId, metric)
  const planRemaining = Math.max(0, data.limit - data.used)
  const neededFromCredits = quantity - planRemaining

  return creditBalance >= neededFromCredits
}

// ============================================================================
// GET USAGE ALERTS
// ============================================================================

/**
 * Get alerts for metrics approaching or exceeding their limits.
 * Returns alerts at 80%, 90%, and 100% thresholds.
 */
export async function getUsageAlerts(
  orgId: string
): Promise<UsageAlert[]> {
  const { data: summary } = await getUsageSummary(orgId)

  if (!summary) return []

  const alerts: UsageAlert[] = []
  const thresholds = [100, 90, 80] as const

  for (const [, metricSummary] of Object.entries(summary)) {
    // Skip unlimited metrics
    if (metricSummary.limit === -1) continue
    // Skip metrics with zero limit (not defined in plan)
    if (metricSummary.limit === 0) continue

    const percent = metricSummary.percent

    for (const threshold of thresholds) {
      if (percent >= threshold) {
        const label = metricSummary.metric.replace(/_/g, ' ')

        let message: string
        if (threshold === 100) {
          message = `${label} limit reached (${metricSummary.used}/${metricSummary.limit})`
        } else {
          message = `${label} at ${percent}% of limit (${metricSummary.used}/${metricSummary.limit})`
        }

        alerts.push({
          metric: metricSummary.metric,
          percent,
          threshold,
          message,
        })

        // Only the highest threshold per metric
        break
      }
    }
  }

  return alerts
}

// ============================================================================
// GET REMAINING QUOTA
// ============================================================================

/**
 * Get total remaining quota for a metric: plan remaining + credit pack balance.
 * Returns -1 if the metric is unlimited.
 */
export async function getRemainingQuota(
  orgId: string,
  metric: UsageMetric
): Promise<number> {
  const { data } = await checkUsage(orgId, metric)

  if (!data) return 0

  // Unlimited
  if (data.limit === -1) return -1

  const planRemaining = data.remaining
  const creditBalance = await getCreditBalance(orgId, metric)

  return planRemaining + creditBalance
}

// ============================================================================
// IS UNLIMITED
// ============================================================================

/**
 * Check if a metric has unlimited usage (-1) for this organization's plan.
 */
export async function isUnlimited(
  orgId: string,
  metric: UsageMetric
): Promise<boolean> {
  const { data } = await checkUsage(orgId, metric)
  return data?.limit === -1
}

// ============================================================================
// CREDIT BALANCE (internal helper)
// ============================================================================

/**
 * Query remaining credit balance for a metric from credit_purchases table.
 * Returns 0 if the table doesn't exist or no credits are available.
 */
async function getCreditBalance(
  orgId: string,
  metric: UsageMetric
): Promise<number> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('credit_purchases')
      .select('remaining')
      .eq('organization_id', orgId)
      .eq('metric', metric)
      .gt('remaining', 0)
      .gte('expires_at', new Date().toISOString())

    if (error || !data) return 0

    return (data as Array<{ remaining: number }>).reduce(
      (sum, row) => sum + row.remaining,
      0
    )
  } catch {
    // credit_purchases table may not exist yet
    return 0
  }
}
