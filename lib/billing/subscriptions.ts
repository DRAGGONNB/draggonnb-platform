import { createAdminClient } from '@/lib/supabase/admin'
import { getPayFastConfig } from '@/lib/payments/payfast'
import { comparePlans } from './plans'
import type {
  SubscriptionInfo,
  SubscriptionStatus,
  BillingPlan,
  PaymentEventData,
} from './types'

// ---------------------------------------------------------------------------
// GET SUBSCRIPTION
// ---------------------------------------------------------------------------

/**
 * Get an organization's current subscription info including the joined plan.
 */
export async function getSubscription(orgId: string): Promise<{
  data: SubscriptionInfo | null
  error: string | null
}> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('organizations')
      .select(`
        id,
        plan_id,
        subscription_status,
        next_billing_date,
        payfast_subscription_token,
        billing_plans:plan_id (*)
      `)
      .eq('id', orgId)
      .single()

    if (error) {
      console.error('Failed to fetch subscription:', error.message)
      return { data: null, error: error.message }
    }

    if (!data) {
      return { data: null, error: 'Organization not found' }
    }

    const plan = data.billing_plans as unknown as BillingPlan | null

    return {
      data: {
        organization_id: data.id as string,
        plan_id: data.plan_id as string | null,
        subscription_status: (data.subscription_status || 'pending') as SubscriptionStatus,
        next_billing_date: data.next_billing_date as string | null,
        payfast_subscription_token: data.payfast_subscription_token as string | null,
        plan,
      },
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error fetching subscription'
    console.error('getSubscription error:', message)
    return { data: null, error: message }
  }
}

// ---------------------------------------------------------------------------
// CHANGE PLAN
// ---------------------------------------------------------------------------

/**
 * Change an organization's plan. Updates organizations.plan_id and inserts
 * a billing_plan_changes audit record.
 */
export async function changePlan(
  orgId: string,
  newPlanId: string,
  changedBy: string,
  reason?: string
): Promise<{
  data: { direction: 'upgrade' | 'downgrade' | 'same' } | null
  error: string | null
}> {
  try {
    const supabase = createAdminClient()

    // Fetch current plan_id
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('plan_id')
      .eq('id', orgId)
      .single()

    if (orgError) {
      console.error('Failed to fetch org for plan change:', orgError.message)
      return { data: null, error: orgError.message }
    }

    const currentPlanId = (org?.plan_id as string | null) || 'core'

    // Determine direction
    const { data: direction, error: compareError } = await comparePlans(
      currentPlanId,
      newPlanId
    )

    if (compareError) {
      return { data: null, error: compareError }
    }

    if (direction === 'same') {
      return { data: { direction: 'same' }, error: null }
    }

    // Update org plan_id
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ plan_id: newPlanId })
      .eq('id', orgId)

    if (updateError) {
      console.error('Failed to update org plan:', updateError.message)
      return { data: null, error: updateError.message }
    }

    // Insert plan change audit record
    const { error: changeError } = await supabase
      .from('billing_plan_changes')
      .insert({
        organization_id: orgId,
        from_plan_id: currentPlanId,
        to_plan_id: newPlanId,
        changed_by: changedBy,
        reason: reason || null,
        effective_at: new Date().toISOString(),
      })

    if (changeError) {
      console.error('Failed to insert plan change record:', changeError.message)
      // Non-fatal: the plan update succeeded, audit trail insert failed
    }

    return { data: { direction: direction! }, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error changing plan'
    console.error('changePlan error:', message)
    return { data: null, error: message }
  }
}

// ---------------------------------------------------------------------------
// CANCEL SUBSCRIPTION
// ---------------------------------------------------------------------------

/**
 * Cancel an organization's subscription. Sets subscription_status to 'cancelled'
 * and attempts to cancel the PayFast subscription if a token exists.
 */
export async function cancelSubscription(orgId: string): Promise<{
  data: { cancelled: boolean } | null
  error: string | null
}> {
  try {
    const supabase = createAdminClient()

    // Fetch current subscription token
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('payfast_subscription_token, subscription_status')
      .eq('id', orgId)
      .single()

    if (orgError) {
      console.error('Failed to fetch org for cancellation:', orgError.message)
      return { data: null, error: orgError.message }
    }

    if (!org) {
      return { data: null, error: 'Organization not found' }
    }

    // Cancel PayFast subscription if token exists
    const token = org.payfast_subscription_token as string | null
    if (token) {
      try {
        await cancelPayFastSubscription(token)
      } catch (pfError) {
        console.error('PayFast cancellation failed (proceeding with local cancel):', pfError)
        // Continue with local cancellation even if PayFast API fails
      }
    }

    // Update org status
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ subscription_status: 'cancelled' })
      .eq('id', orgId)

    if (updateError) {
      console.error('Failed to update subscription status:', updateError.message)
      return { data: null, error: updateError.message }
    }

    return { data: { cancelled: true }, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error cancelling subscription'
    console.error('cancelSubscription error:', message)
    return { data: null, error: message }
  }
}

// ---------------------------------------------------------------------------
// SUBSCRIPTION HISTORY
// ---------------------------------------------------------------------------

/**
 * Fetch subscription history (payment transactions) for an organization.
 */
export async function getSubscriptionHistory(
  orgId: string,
  limit: number = 20
): Promise<{
  data: Record<string, unknown>[] | null
  error: string | null
}> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('subscription_history')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to fetch subscription history:', error.message)
      return { data: null, error: error.message }
    }

    return { data: data as Record<string, unknown>[], error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error fetching subscription history'
    console.error('getSubscriptionHistory error:', message)
    return { data: null, error: message }
  }
}

// ---------------------------------------------------------------------------
// HANDLE PAYMENT COMPLETE
// ---------------------------------------------------------------------------

/**
 * Process a successful payment. Updates org status, logs to subscription_history,
 * and resets usage metrics for the new billing cycle.
 */
export async function handlePaymentComplete(
  orgId: string,
  paymentData: PaymentEventData
): Promise<{
  data: { processed: boolean } | null
  error: string | null
}> {
  try {
    const supabase = createAdminClient()

    // Calculate next billing date (1 month from now)
    const nextBilling = new Date()
    nextBilling.setMonth(nextBilling.getMonth() + 1)
    const nextBillingDate = nextBilling.toISOString().split('T')[0]

    // Update organization
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        subscription_status: 'active',
        payfast_subscription_token: paymentData.pf_payment_id,
        next_billing_date: nextBillingDate,
      })
      .eq('id', orgId)

    if (updateError) {
      console.error('Failed to update org after payment:', updateError.message)
      return { data: null, error: updateError.message }
    }

    // Log to subscription_history
    const { error: historyError } = await supabase
      .from('subscription_history')
      .insert({
        organization_id: orgId,
        transaction_id: paymentData.pf_payment_id,
        amount: parseFloat(paymentData.amount_gross),
        amount_fee: parseFloat(paymentData.amount_fee || '0'),
        amount_net: parseFloat(paymentData.amount_net || paymentData.amount_gross),
        status: 'completed',
        payment_method: 'payfast',
        created_at: new Date().toISOString(),
      })

    if (historyError) {
      console.error('Failed to log payment to subscription_history:', historyError.message)
      // Non-fatal: payment is already processed
    }

    // Reset usage metrics for new billing cycle
    const { error: usageError } = await supabase
      .from('client_usage_metrics')
      .update({
        monthly_posts_used: 0,
        monthly_ai_generations_used: 0,
        reset_date: new Date().toISOString(),
      })
      .eq('organization_id', orgId)

    if (usageError) {
      console.error('Failed to reset usage metrics:', usageError.message)
      // Non-fatal: usage reset can be retried
    }

    return { data: { processed: true }, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error processing payment'
    console.error('handlePaymentComplete error:', message)
    return { data: null, error: message }
  }
}

// ---------------------------------------------------------------------------
// HANDLE PAYMENT FAILED
// ---------------------------------------------------------------------------

/**
 * Process a failed payment. Updates org status and logs to subscription_history.
 */
export async function handlePaymentFailed(
  orgId: string,
  paymentData: PaymentEventData
): Promise<{
  data: { processed: boolean } | null
  error: string | null
}> {
  try {
    const supabase = createAdminClient()

    // Update organization status
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ subscription_status: 'payment_failed' })
      .eq('id', orgId)

    if (updateError) {
      console.error('Failed to update org after failed payment:', updateError.message)
      return { data: null, error: updateError.message }
    }

    // Log to subscription_history
    const { error: historyError } = await supabase
      .from('subscription_history')
      .insert({
        organization_id: orgId,
        transaction_id: paymentData.pf_payment_id,
        amount: parseFloat(paymentData.amount_gross),
        status: 'failed',
        payment_method: 'payfast',
        created_at: new Date().toISOString(),
      })

    if (historyError) {
      console.error('Failed to log failed payment to subscription_history:', historyError.message)
    }

    return { data: { processed: true }, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error processing failed payment'
    console.error('handlePaymentFailed error:', message)
    return { data: null, error: message }
  }
}

// ---------------------------------------------------------------------------
// INTERNAL: PayFast Subscription Cancellation
// ---------------------------------------------------------------------------

/**
 * Cancel a subscription via the PayFast API.
 * Uses the subscription token from the organization record.
 */
async function cancelPayFastSubscription(token: string): Promise<void> {
  const config = getPayFastConfig()

  const cancelUrl = config.mode === 'production'
    ? `https://api.payfast.co.za/subscriptions/${token}/cancel`
    : `https://sandbox.payfast.co.za/eng/recurring/update/${token}/cancel`

  const timestamp = new Date().toISOString()

  const response = await fetch(cancelUrl, {
    method: 'PUT',
    headers: {
      'merchant-id': config.merchantId,
      'version': 'v1',
      'timestamp': timestamp,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`PayFast cancel failed (${response.status}): ${body}`)
  }
}
