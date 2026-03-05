/**
 * Usage Metering - Core recording and querying functions
 *
 * recordUsage() is the main entry point called by the rest of the app
 * whenever a metered action occurs (AI generation, social post, email send, etc).
 *
 * Flow: plan limit check -> credit pack fallback -> record event
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { UsageMetric, UsageCheckResult, UsageSummary } from './types'

// ============================================================================
// RECORD USAGE
// ============================================================================

/**
 * Record a usage event for an organization.
 *
 * 1. Calls record_usage_event RPC (checks plan limit + inserts atomically)
 * 2. If plan limit reached, attempts consume_credits RPC for credit pack fallback
 * 3. If credits consumed, records the event manually
 *
 * Returns { data, error } where data is UsageCheckResult.
 */
export async function recordUsage(
  orgId: string,
  metric: UsageMetric,
  quantity: number = 1,
  metadata: Record<string, unknown> = {}
): Promise<{ data: UsageCheckResult | null; error: string | null }> {
  try {
    const supabase = createAdminClient()

    // Step 1: Try the plan-limit-aware RPC
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'record_usage_event',
      {
        p_org_id: orgId,
        p_metric: metric,
        p_quantity: quantity,
        p_metadata: metadata,
      }
    )

    if (rpcError) {
      console.error('[Usage] record_usage_event RPC failed:', rpcError.message)
      return { data: null, error: rpcError.message }
    }

    const result = rpcResult as {
      allowed: boolean
      current: number
      limit: number
      remaining: number
    }

    // If allowed by plan, return immediately
    if (result.allowed) {
      return {
        data: {
          allowed: true,
          current: result.current,
          limit: result.limit,
          remaining: result.remaining,
        },
        error: null,
      }
    }

    // Step 2: Plan limit reached -- try credit pack fallback
    const creditResult = await tryConsumeCredits(orgId, metric, quantity)

    if (creditResult.consumed) {
      // Step 3: Credits consumed -- record the event manually (bypassing plan limit check)
      const { error: insertError } = await supabase
        .from('usage_events')
        .insert({
          organization_id: orgId,
          metric,
          quantity,
          metadata: { ...metadata, source: 'credit_pack' },
        })

      if (insertError) {
        console.error('[Usage] Failed to insert credit-funded event:', insertError.message)
        return { data: null, error: insertError.message }
      }

      return {
        data: {
          allowed: true,
          current: result.current + quantity,
          limit: result.limit,
          remaining: creditResult.creditsRemaining,
        },
        error: null,
      }
    }

    // Neither plan limit nor credits available
    return {
      data: {
        allowed: false,
        current: result.current,
        limit: result.limit,
        remaining: result.remaining,
      },
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error recording usage'
    console.error('[Usage] recordUsage error:', message)
    return { data: null, error: message }
  }
}

// ============================================================================
// CHECK USAGE (read-only, does not record)
// ============================================================================

/**
 * Check current usage for a metric without recording anything.
 * Returns current count, limit, remaining, and percent used.
 */
export async function checkUsage(
  orgId: string,
  metric: UsageMetric
): Promise<{ data: UsageSummary | null; error: string | null }> {
  try {
    const supabase = createAdminClient()

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'get_usage_summary',
      { p_org_id: orgId }
    )

    if (rpcError) {
      console.error('[Usage] get_usage_summary RPC failed:', rpcError.message)
      return { data: null, error: rpcError.message }
    }

    const summary = rpcResult as Record<
      string,
      { used: number; limit: number; remaining: number; percent: number }
    >

    const metricData = summary[metric]

    if (!metricData) {
      // Metric not defined in the org's plan limits
      return {
        data: {
          metric,
          used: 0,
          limit: 0,
          remaining: 0,
          percent: 0,
        },
        error: null,
      }
    }

    return {
      data: {
        metric,
        used: metricData.used,
        limit: metricData.limit,
        remaining: metricData.remaining,
        percent: metricData.percent,
      },
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error checking usage'
    console.error('[Usage] checkUsage error:', message)
    return { data: null, error: message }
  }
}

// ============================================================================
// GET FULL USAGE SUMMARY
// ============================================================================

/**
 * Get usage summary for all metrics defined in the org's plan.
 * Returns a record keyed by metric name.
 */
export async function getUsageSummary(
  orgId: string
): Promise<{ data: Record<UsageMetric, UsageSummary> | null; error: string | null }> {
  try {
    const supabase = createAdminClient()

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'get_usage_summary',
      { p_org_id: orgId }
    )

    if (rpcError) {
      console.error('[Usage] get_usage_summary RPC failed:', rpcError.message)
      return { data: null, error: rpcError.message }
    }

    const raw = rpcResult as Record<
      string,
      { used: number; limit: number; remaining: number; percent: number }
    >

    const result = {} as Record<UsageMetric, UsageSummary>

    for (const [key, value] of Object.entries(raw)) {
      result[key as UsageMetric] = {
        metric: key as UsageMetric,
        used: value.used,
        limit: value.limit,
        remaining: value.remaining,
        percent: value.percent,
      }
    }

    return { data: result, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error getting usage summary'
    console.error('[Usage] getUsageSummary error:', message)
    return { data: null, error: message }
  }
}

// ============================================================================
// CREDIT PACK FALLBACK (internal)
// ============================================================================

/**
 * Attempt to consume credits from credit_purchases for the given metric.
 * Returns whether credits were consumed and how many remain.
 *
 * Uses consume_credits RPC if available. If the RPC or table doesn't exist,
 * returns consumed: false gracefully (credit packs not provisioned yet).
 */
async function tryConsumeCredits(
  orgId: string,
  metric: UsageMetric,
  quantity: number
): Promise<{ consumed: boolean; creditsRemaining: number }> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase.rpc('consume_credits', {
      p_org_id: orgId,
      p_metric: metric,
      p_quantity: quantity,
    })

    if (error) {
      // RPC doesn't exist yet or other DB error -- credit packs not available
      return { consumed: false, creditsRemaining: 0 }
    }

    const result = data as { consumed: boolean; remaining: number } | null

    if (!result || !result.consumed) {
      return { consumed: false, creditsRemaining: 0 }
    }

    return { consumed: true, creditsRemaining: result.remaining }
  } catch {
    // Credit pack system not available
    return { consumed: false, creditsRemaining: 0 }
  }
}
