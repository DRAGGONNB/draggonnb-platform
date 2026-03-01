import { createAdminClient } from '@/lib/supabase/admin'

/**
 * FIFO Credit Deduction
 *
 * When a usage event exceeds the plan's included allowance, credits are
 * deducted from bolt-on packs in FIFO order (oldest purchase first).
 *
 * Deduction order: plan included -> bolt-on credits (FIFO) -> overage pricing
 */

interface DeductionResult {
  deducted: number
  remainingOverage: number
  creditsDepleted: string[] // IDs of credit records fully consumed
}

/**
 * Deduct bolt-on credits for a usage event that exceeded plan limits.
 *
 * Call this AFTER logging a usage event, when the event pushes usage
 * past the plan's included quantity.
 *
 * @param organizationId - The tenant's organization ID
 * @param dimension - The usage dimension (e.g., 'ai_generations')
 * @param quantity - Number of units to deduct from credits
 * @param usageEventId - The usage_event that triggered this deduction (optional)
 */
export async function deductBoltOnCredits(
  organizationId: string,
  dimension: string,
  quantity: number,
  usageEventId?: string
): Promise<DeductionResult> {
  const supabase = createAdminClient()

  // Fetch active credits for this dimension, ordered FIFO (oldest first)
  const { data: activeCredits, error } = await supabase
    .from('tenant_credits')
    .select('id, credits_remaining')
    .eq('organization_id', organizationId)
    .eq('dimension', dimension)
    .eq('status', 'active')
    .gt('credits_remaining', 0)
    .gt('expires_at', new Date().toISOString())
    .order('purchased_at', { ascending: true })

  if (error || !activeCredits?.length) {
    return { deducted: 0, remainingOverage: quantity, creditsDepleted: [] }
  }

  let remaining = quantity
  let totalDeducted = 0
  const creditsDepleted: string[] = []

  for (const credit of activeCredits) {
    if (remaining <= 0) break

    const deductAmount = Math.min(remaining, credit.credits_remaining)
    const newRemaining = credit.credits_remaining - deductAmount
    const newStatus = newRemaining === 0 ? 'depleted' : 'active'

    // Update the credit record
    const { error: updateError } = await supabase
      .from('tenant_credits')
      .update({
        credits_remaining: newRemaining,
        status: newStatus,
      })
      .eq('id', credit.id)

    if (updateError) {
      console.error(`[CreditDeduction] Failed to update credit ${credit.id}:`, updateError.message)
      continue
    }

    // Log the deduction
    await supabase.from('credit_deductions').insert({
      tenant_credit_id: credit.id,
      usage_event_id: usageEventId || null,
      quantity_deducted: deductAmount,
    })

    remaining -= deductAmount
    totalDeducted += deductAmount

    if (newStatus === 'depleted') {
      creditsDepleted.push(credit.id)
    }
  }

  return {
    deducted: totalDeducted,
    remainingOverage: Math.max(0, remaining),
    creditsDepleted,
  }
}

/**
 * Check if a usage event should trigger credit deduction.
 *
 * Compares current period usage against plan included quantity.
 * If usage exceeds plan, deducts from bolt-on credits.
 *
 * @returns true if credits were sufficient to cover the overage
 */
export async function checkAndDeductCredits(
  organizationId: string,
  dimension: string,
  usageEventId?: string
): Promise<{ covered: boolean; overageUnits: number }> {
  const supabase = createAdminClient()

  // Get the subscription + plan limit
  const { data: sub } = await supabase
    .from('tenant_subscriptions')
    .select('plan_id, current_period_start, current_period_end')
    .eq('organization_id', organizationId)
    .in('status', ['active', 'trialing'])
    .single()

  if (!sub) return { covered: true, overageUnits: 0 }

  const { data: planLimit } = await supabase
    .from('plan_limits')
    .select('included_quantity')
    .eq('plan_id', sub.plan_id)
    .eq('dimension', dimension)
    .single()

  if (!planLimit) return { covered: true, overageUnits: 0 }

  // Count current period usage
  const { count: periodUsage } = await supabase
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('dimension', dimension)
    .gte('created_at', sub.current_period_start)
    .lt('created_at', sub.current_period_end)

  const used = periodUsage || 0

  // If still within plan limits, no deduction needed
  if (used <= planLimit.included_quantity) {
    return { covered: true, overageUnits: 0 }
  }

  // Calculate how many units are over the plan limit
  const overageUnits = used - planLimit.included_quantity

  // Already-deducted credits for this period
  const { data: existingDeductions } = await supabase
    .from('credit_deductions')
    .select('quantity_deducted')
    .in('tenant_credit_id',
      (await supabase
        .from('tenant_credits')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('dimension', dimension)
      ).data?.map((c: { id: string }) => c.id) || []
    )

  const alreadyDeducted = existingDeductions?.reduce(
    (sum: number, d: { quantity_deducted: number }) => sum + d.quantity_deducted, 0
  ) || 0

  const needToDeduct = overageUnits - alreadyDeducted
  if (needToDeduct <= 0) {
    return { covered: true, overageUnits: 0 }
  }

  // Deduct the difference
  const result = await deductBoltOnCredits(
    organizationId,
    dimension,
    needToDeduct,
    usageEventId
  )

  return {
    covered: result.remainingOverage === 0,
    overageUnits: result.remainingOverage,
  }
}

/**
 * Get remaining bolt-on credits for an organization + dimension.
 */
export async function getBoltOnBalance(
  organizationId: string,
  dimension: string
): Promise<number> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('tenant_credits')
    .select('credits_remaining')
    .eq('organization_id', organizationId)
    .eq('dimension', dimension)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())

  if (!data) return 0
  return data.reduce((sum: number, c: { credits_remaining: number }) => sum + c.credits_remaining, 0)
}
