import { createAdminClient } from '@/lib/supabase/admin'
import {
  createPayFastSubscription,
  type PayFastFormData,
} from '@/lib/payments/payfast'
import type { CreditPack, CreditPurchase, CreditBalance } from './types'

// ---------------------------------------------------------------------------
// GET CREDIT PACKS
// ---------------------------------------------------------------------------

/**
 * Fetch available credit packs from the catalog.
 * Optionally filter by minimum tier requirement.
 */
export async function getCreditPacks(tier?: string): Promise<{
  data: CreditPack[] | null
  error: string | null
}> {
  try {
    const supabase = createAdminClient()

    let query = supabase
      .from('credit_pack_catalog')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (tier) {
      // Include packs with no tier requirement OR packs that match the given tier
      query = query.or(`min_tier.is.null,min_tier.eq.${tier}`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch credit packs:', error.message)
      return { data: null, error: error.message }
    }

    return { data: data as unknown as CreditPack[], error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error fetching credit packs'
    console.error('getCreditPacks error:', message)
    return { data: null, error: message }
  }
}

// ---------------------------------------------------------------------------
// PURCHASE CREDIT PACK
// ---------------------------------------------------------------------------

/**
 * Initiate a credit pack purchase. Creates a pending credit_purchases record
 * and returns PayFast form data to redirect the user for payment.
 */
export async function purchaseCreditPack(
  orgId: string,
  packId: string
): Promise<{
  data: { purchase: CreditPurchase; payfastFormData: PayFastFormData } | null
  error: string | null
}> {
  try {
    const supabase = createAdminClient()

    // Fetch the pack
    const { data: pack, error: packError } = await supabase
      .from('credit_pack_catalog')
      .select('*')
      .eq('id', packId)
      .eq('is_active', true)
      .single()

    if (packError || !pack) {
      console.error('Failed to fetch credit pack:', packError?.message)
      return { data: null, error: packError?.message || 'Credit pack not found or inactive' }
    }

    // Fetch org info for PayFast form
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, owner_email')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      console.error('Failed to fetch org for credit purchase:', orgError?.message)
      return { data: null, error: orgError?.message || 'Organization not found' }
    }

    // Create pending purchase record
    const { data: purchase, error: purchaseError } = await supabase
      .from('credit_purchases')
      .insert({
        organization_id: orgId,
        pack_id: packId,
        metric: pack.metric as string,
        credits_purchased: pack.credit_amount as number,
        credits_remaining: pack.credit_amount as number,
        price_zar: pack.price_zar as number,
        status: 'pending',
      })
      .select('*')
      .single()

    if (purchaseError || !purchase) {
      console.error('Failed to create credit purchase:', purchaseError?.message)
      return { data: null, error: purchaseError?.message || 'Failed to create purchase record' }
    }

    // Generate PayFast form data for one-time payment
    const priceRands = (pack.price_zar as number) / 100
    const payfastFormData = createPayFastSubscription({
      organizationId: orgId,
      organizationName: (org.name as string) || 'Customer',
      email: (org.owner_email as string) || '',
      amount: priceRands,
      description: `Credit Pack: ${pack.display_name as string}`,
      subscriptionType: '1',
      billingDate: new Date().toISOString().split('T')[0],
      recurringAmount: 0,
      cycles: '0',
      metadata: {
        planTier: 'credit_pack',
        billingCycle: 'monthly',
        purchaseId: purchase.id as string,
        packId: packId,
      },
    })

    return {
      data: {
        purchase: purchase as unknown as CreditPurchase,
        payfastFormData,
      },
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error purchasing credit pack'
    console.error('purchaseCreditPack error:', message)
    return { data: null, error: message }
  }
}

// ---------------------------------------------------------------------------
// ACTIVATE CREDIT PURCHASE
// ---------------------------------------------------------------------------

/**
 * Activate a pending credit purchase after payment confirmation.
 * Sets status to 'active' and logs the initial credit to the ledger.
 */
export async function activateCreditPurchase(
  purchaseId: string,
  payfastPaymentId: string
): Promise<{
  data: CreditPurchase | null
  error: string | null
}> {
  try {
    const supabase = createAdminClient()

    // Update purchase status
    const { data: purchase, error: updateError } = await supabase
      .from('credit_purchases')
      .update({
        status: 'active',
        payfast_payment_id: payfastPaymentId,
      })
      .eq('id', purchaseId)
      .eq('status', 'pending')
      .select('*')
      .single()

    if (updateError) {
      console.error('Failed to activate credit purchase:', updateError.message)
      return { data: null, error: updateError.message }
    }

    if (!purchase) {
      return { data: null, error: 'Purchase not found or already activated' }
    }

    // Log initial credit to the ledger
    const { error: ledgerError } = await supabase
      .from('credit_ledger')
      .insert({
        organization_id: purchase.organization_id as string,
        purchase_id: purchaseId,
        metric: purchase.metric as string,
        amount: purchase.credits_purchased as number,
        balance_after: purchase.credits_remaining as number,
        description: 'Credit pack purchase activated',
      })

    if (ledgerError) {
      console.error('Failed to log credit to ledger:', ledgerError.message)
      // Non-fatal: purchase is already activated
    }

    return { data: purchase as unknown as CreditPurchase, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error activating credit purchase'
    console.error('activateCreditPurchase error:', message)
    return { data: null, error: message }
  }
}

// ---------------------------------------------------------------------------
// GET CREDIT BALANCES
// ---------------------------------------------------------------------------

/**
 * Get active credit balances per metric for an organization.
 * Calls the get_credit_balances DB RPC.
 * Returns an array of { metric, remaining } objects.
 */
export async function getCreditBalances(orgId: string): Promise<{
  data: CreditBalance[] | null
  error: string | null
}> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase.rpc('get_credit_balances', {
      p_org_id: orgId,
    })

    if (error) {
      console.error('Failed to get credit balances:', error.message)
      return { data: null, error: error.message }
    }

    // RPC returns JSONB like { "ai_generations": 150, "email_sends": 5000 }
    const balances = data as Record<string, number> | null

    if (!balances || Object.keys(balances).length === 0) {
      return { data: [], error: null }
    }

    const result: CreditBalance[] = Object.entries(balances).map(
      ([metric, remaining]) => ({ metric, remaining })
    )

    return { data: result, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error getting credit balances'
    console.error('getCreditBalances error:', message)
    return { data: null, error: message }
  }
}

// ---------------------------------------------------------------------------
// CONSUME CREDITS
// ---------------------------------------------------------------------------

/**
 * Consume credits from an organization's credit packs for a given metric.
 * Calls the consume_credits DB RPC which handles FIFO consumption.
 */
export async function consumeCredits(
  orgId: string,
  metric: string,
  quantity: number
): Promise<{
  data: { consumed: boolean; credits_used: number; remaining: number } | null
  error: string | null
}> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase.rpc('consume_credits', {
      p_org_id: orgId,
      p_metric: metric,
      p_quantity: quantity,
    })

    if (error) {
      console.error('Failed to consume credits:', error.message)
      return { data: null, error: error.message }
    }

    const result = data as {
      consumed: boolean
      credits_used: number
      credits_requested: number
      remaining: number
    } | null

    if (!result) {
      return { data: null, error: 'No result from consume_credits RPC' }
    }

    return {
      data: {
        consumed: result.consumed,
        credits_used: result.credits_used,
        remaining: result.remaining,
      },
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error consuming credits'
    console.error('consumeCredits error:', message)
    return { data: null, error: message }
  }
}
