import { createClient } from '@/lib/supabase/server'
import type { BillingPlan, PlanChangeDirection } from './types'

/**
 * Fetch all active billing plans, ordered by sort_order.
 */
export async function getPlans(): Promise<{
  data: BillingPlan[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('billing_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Failed to fetch billing plans:', error.message)
      return { data: null, error: error.message }
    }

    return { data: data as BillingPlan[], error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error fetching plans'
    console.error('getPlans error:', message)
    return { data: null, error: message }
  }
}

/**
 * Fetch a single billing plan by ID.
 */
export async function getPlan(planId: string): Promise<{
  data: BillingPlan | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('billing_plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (error) {
      console.error('Failed to fetch billing plan:', error.message)
      return { data: null, error: error.message }
    }

    return { data: data as BillingPlan, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error fetching plan'
    console.error('getPlan error:', message)
    return { data: null, error: message }
  }
}

/**
 * Get the limits JSONB for a specific plan.
 */
export async function getPlanLimits(planId: string): Promise<{
  data: Record<string, number> | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('billing_plans')
      .select('limits')
      .eq('id', planId)
      .single()

    if (error) {
      console.error('Failed to fetch plan limits:', error.message)
      return { data: null, error: error.message }
    }

    return { data: (data as { limits: Record<string, number> }).limits, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error fetching plan limits'
    console.error('getPlanLimits error:', message)
    return { data: null, error: message }
  }
}

/**
 * Format cents to a ZAR display string.
 * Example: 150000 -> "R1,500"
 */
export function formatPrice(cents: number): string {
  const rands = cents / 100
  const formatted = rands.toLocaleString('en-ZA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  // Strip trailing ".00" for whole numbers
  const clean = formatted.endsWith('.00')
    ? formatted.slice(0, -3)
    : formatted
  return `R${clean}`
}

/**
 * Compare two plans and determine upgrade/downgrade/same.
 * Uses sort_order as the plan hierarchy indicator.
 */
export async function comparePlans(
  currentPlanId: string,
  newPlanId: string
): Promise<{
  data: PlanChangeDirection | null
  error: string | null
}> {
  if (currentPlanId === newPlanId) {
    return { data: 'same', error: null }
  }

  try {
    const supabase = await createClient()

    const { data: plans, error } = await supabase
      .from('billing_plans')
      .select('id, sort_order')
      .in('id', [currentPlanId, newPlanId])

    if (error) {
      console.error('Failed to compare plans:', error.message)
      return { data: null, error: error.message }
    }

    if (!plans || plans.length !== 2) {
      return { data: null, error: 'One or both plans not found' }
    }

    const currentPlan = plans.find((p: { id: string }) => p.id === currentPlanId)
    const newPlan = plans.find((p: { id: string }) => p.id === newPlanId)

    if (!currentPlan || !newPlan) {
      return { data: null, error: 'Plan lookup mismatch' }
    }

    if (newPlan.sort_order > currentPlan.sort_order) {
      return { data: 'upgrade', error: null }
    }

    return { data: 'downgrade', error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error comparing plans'
    console.error('comparePlans error:', message)
    return { data: null, error: message }
  }
}
