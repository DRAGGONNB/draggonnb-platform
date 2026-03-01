import { NextRequest, NextResponse } from 'next/server'
import {
  validatePayFastSignature,
  verifyPayFastPayment,
  validatePaymentAmount,
  PRICING_TIERS,
  getCanonicalTierName,
  type PayFastITNData,
} from '@/lib/payments/payfast'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * PayFast ITN (Instant Transaction Notification) Webhook Handler
 * Processes payment notifications from PayFast
 *
 * PayFast ITN Documentation:
 * https://developers.payfast.co.za/docs#instant_transaction_notification
 *
 * Security Steps:
 * 1. Validate signature (MD5 hash)
 * 2. Verify payment with PayFast server
 * 3. Validate payment amount
 * 4. Update database
 */
export async function POST(request: NextRequest) {
  try {
    // Parse ITN data from PayFast (sent as URL-encoded form data)
    const formData = await request.formData()
    const itnData: Record<string, string> = {}

    formData.forEach((value, key) => {
      itnData[key] = value.toString()
    })

    console.log('PayFast ITN received:', {
      payment_id: itnData.pf_payment_id,
      status: itnData.payment_status,
      amount: itnData.amount_gross,
    })

    // Step 1: Validate signature
    const passphrase = process.env.PAYFAST_PASSPHRASE
    const isValidSignature = validatePayFastSignature(itnData, passphrase)

    if (!isValidSignature) {
      console.error('Invalid PayFast ITN signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    console.log('✓ Signature validated')

    // Step 2: Verify payment with PayFast server (server-to-server confirmation)
    const isValidPayment = await verifyPayFastPayment(itnData as PayFastITNData)

    if (!isValidPayment) {
      console.error('PayFast payment verification failed')
      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 400 }
      )
    }

    console.log('✓ Payment verified with PayFast server')

    // Step 3: Extract data
    const {
      pf_payment_id,
      payment_status,
      amount_gross,
      amount_fee,
      amount_net,
      custom_str1: organizationId,
      custom_str2: planTier,
      email_address,
      item_name,
    } = itnData as PayFastITNData

    if (!organizationId) {
      console.error('Missing organizationId in ITN custom_str1')
      return NextResponse.json(
        { error: 'Missing organization ID' },
        { status: 400 }
      )
    }

    // Step 4: Validate payment amount (prevent tampering)
    const effectiveTier = planTier ? (PRICING_TIERS[planTier] ? planTier : getCanonicalTierName(planTier)) : null
    if (effectiveTier && PRICING_TIERS[effectiveTier]) {
      const expectedAmount = PRICING_TIERS[effectiveTier].price
      const isValidAmount = validatePaymentAmount(amount_gross, expectedAmount)

      if (!isValidAmount) {
        console.error(`Payment amount mismatch: expected R${expectedAmount}, got R${amount_gross}`)
        return NextResponse.json(
          { error: 'Payment amount mismatch' },
          { status: 400 }
        )
      }

      console.log('✓ Payment amount validated')
    }

    // Initialize Supabase admin client (bypasses RLS for webhook handler)
    const supabase = createAdminClient()

    // Step 5: Detect bolt-on purchase vs subscription payment
    const isBoltOn = itnData.custom_str2 === 'bolt-on'
    const boltOnPackSlug = itnData.custom_str3

    if (isBoltOn && payment_status === 'COMPLETE' && boltOnPackSlug) {
      return await handleBoltOnPayment(
        supabase, organizationId, boltOnPackSlug, pf_payment_id, amount_gross, itnData
      )
    }

    // SUBSCRIPTION PAYMENT FLOW
    if (payment_status === 'COMPLETE') {
      // Payment successful - activate subscription
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          subscription_status: 'active',
          payfast_subscription_token: pf_payment_id,
          activated_at: new Date().toISOString(),
          next_billing_date: getNextBillingDate(),
        })
        .eq('id', organizationId)

      if (updateError) {
        console.error('Error updating organization:', updateError)
        return NextResponse.json(
          { error: 'Failed to update subscription' },
          { status: 500 }
        )
      }

      // Log successful transaction
      await supabase
        .from('subscription_history')
        .insert({
          organization_id: organizationId,
          transaction_id: pf_payment_id,
          amount: parseFloat(amount_gross),
          amount_fee: parseFloat(amount_fee || '0'),
          amount_net: parseFloat(amount_net || amount_gross),
          status: 'completed',
          payment_method: 'payfast',
          created_at: new Date().toISOString(),
          payfast_response: itnData,
        })

      // Reset usage metrics for new billing cycle
      await supabase
        .from('client_usage_metrics')
        .update({
          monthly_posts_used: 0,
          monthly_ai_generations_used: 0,
          reset_date: new Date().toISOString(),
        })
        .eq('organization_id', organizationId)

      console.log(`✓ Payment COMPLETE for organization ${organizationId}`)

      // Detect if this is a new subscription (no previous activated_at)
      const { data: orgData } = await supabase
        .from('organizations')
        .select('activated_at, name')
        .eq('id', organizationId)
        .single()

      const isNewSubscription = !orgData?.activated_at ||
        new Date(orgData.activated_at).getTime() === new Date(itnData.custom_str1 ? '' : '').getTime()

      if (isNewSubscription || !orgData?.activated_at) {
        // Create provisioning job record
        const { error: provJobError } = await supabase
          .from('provisioning_jobs')
          .insert({
            organization_id: organizationId,
            tier: planTier || 'core',
            status: 'pending',
            current_step: 'supabase-project',
            steps_completed: [],
            created_resources: {},
          })

        if (provJobError) {
          console.error('Failed to create provisioning job:', provJobError)
        }

        // Trigger provisioning workflow via N8N
        try {
          const { triggerClientProvisioning } = await import('@/lib/n8n/webhooks')
          await triggerClientProvisioning({
            organizationId,
            clientName: orgData?.name || email_address,
            email: email_address,
            tier: (planTier as 'starter' | 'professional' | 'enterprise' | 'core' | 'growth' | 'scale') || 'core',
            features: [],
          })
          console.log(`✓ Provisioning triggered for organization ${organizationId}`)
        } catch (provError) {
          console.error('Failed to trigger provisioning:', provError)
          // Non-fatal: provisioning can be retried manually
        }
      }
    } else if (payment_status === 'FAILED') {
      // Payment failed
      await supabase
        .from('organizations')
        .update({
          subscription_status: 'payment_failed',
        })
        .eq('id', organizationId)

      // Log failed transaction
      await supabase
        .from('subscription_history')
        .insert({
          organization_id: organizationId,
          transaction_id: pf_payment_id,
          amount: parseFloat(amount_gross),
          status: 'failed',
          payment_method: 'payfast',
          created_at: new Date().toISOString(),
          payfast_response: itnData,
        })

      console.log(`✗ Payment FAILED for organization ${organizationId}`)

      // TODO: Send payment failure notification email
    } else if (payment_status === 'PENDING') {
      // Payment pending (awaiting EFT confirmation, etc.)
      await supabase
        .from('organizations')
        .update({
          subscription_status: 'payment_pending',
        })
        .eq('id', organizationId)

      console.log(`⏳ Payment PENDING for organization ${organizationId}`)
    } else if (payment_status === 'CANCELLED') {
      // Payment cancelled by user
      await supabase
        .from('organizations')
        .update({
          subscription_status: 'cancelled',
        })
        .eq('id', organizationId)

      // Log cancelled transaction
      await supabase
        .from('subscription_history')
        .insert({
          organization_id: organizationId,
          transaction_id: pf_payment_id,
          amount: parseFloat(amount_gross),
          status: 'cancelled',
          payment_method: 'payfast',
          created_at: new Date().toISOString(),
          payfast_response: itnData,
        })

      console.log(`✗ Payment CANCELLED for organization ${organizationId}`)
    }

    // Return 200 OK to PayFast to acknowledge receipt
    return NextResponse.json(
      { success: true, message: 'ITN processed' },
      { status: 200 }
    )
  } catch (error) {
    console.error('PayFast ITN error:', error)
    return NextResponse.json(
      { error: 'ITN processing failed' },
      { status: 500 }
    )
  }
}

/**
 * GET handler for webhook verification
 * PayFast may verify webhook endpoint with GET request
 */
export async function GET() {
  return new Response(
    JSON.stringify({ status: 'PayFast ITN webhook endpoint active' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}

/**
 * Calculate next billing date (1 month from today)
 */
function getNextBillingDate(): string {
  const today = new Date()
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())
  return nextMonth.toISOString().split('T')[0] // YYYY-MM-DD
}

/**
 * Handle bolt-on credit pack purchase.
 * Provisions credits to tenant_credits after successful PayFast payment.
 */
async function handleBoltOnPayment(
  supabase: ReturnType<typeof createAdminClient>,
  organizationId: string,
  packSlug: string,
  pfPaymentId: string,
  amountGross: string,
  itnData: Record<string, string>
) {
  // Lookup the credit pack
  const { data: pack, error: packError } = await supabase
    .from('credit_packs')
    .select('*')
    .eq('slug', packSlug)
    .eq('is_active', true)
    .single()

  if (packError || !pack) {
    console.error(`[BoltOn] Credit pack not found: ${packSlug}`)
    return NextResponse.json({ error: 'Credit pack not found' }, { status: 400 })
  }

  // Validate amount matches pack price
  const expectedAmount = pack.price_zar / 100
  if (Math.abs(parseFloat(amountGross) - expectedAmount) > 0.01) {
    console.error(`[BoltOn] Amount mismatch: expected R${expectedAmount}, got R${amountGross}`)
    return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
  }

  // Calculate expiry: end of current billing period + 1 period (rollover)
  const { data: sub } = await supabase
    .from('tenant_subscriptions')
    .select('current_period_end')
    .eq('organization_id', organizationId)
    .in('status', ['active', 'trialing'])
    .single()

  // Default: 2 months from now if no subscription
  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const expiresAt = new Date(periodEnd)
  expiresAt.setMonth(expiresAt.getMonth() + 1) // +1 period rollover

  // Insert credits into tenant_credits
  const { error: creditError } = await supabase
    .from('tenant_credits')
    .insert({
      organization_id: organizationId,
      credit_pack_id: pack.id,
      dimension: pack.dimension,
      credits_purchased: pack.credit_quantity,
      credits_remaining: pack.credit_quantity,
      source: 'purchase',
      source_metadata: { pack_slug: packSlug, pf_payment_id: pfPaymentId },
      expires_at: expiresAt.toISOString(),
      payment_reference: pfPaymentId,
      status: 'active',
    })

  if (creditError) {
    console.error('[BoltOn] Failed to provision credits:', creditError)
    return NextResponse.json({ error: 'Failed to provision credits' }, { status: 500 })
  }

  // Log transaction in subscription_history
  await supabase
    .from('subscription_history')
    .insert({
      organization_id: organizationId,
      transaction_id: pfPaymentId,
      amount_gross: parseFloat(amountGross),
      amount_fee: parseFloat(itnData.amount_fee || '0'),
      amount_net: parseFloat(itnData.amount_net || amountGross),
      status: 'completed',
      payment_method: 'payfast',
      notes: `Bolt-on: ${pack.name} (${pack.credit_quantity} ${pack.dimension})`,
      payfast_response: itnData,
    })

  console.log(`[BoltOn] Credits provisioned: ${pack.credit_quantity} ${pack.dimension} for org ${organizationId}`)

  return NextResponse.json({ success: true, message: 'Bolt-on credits provisioned' }, { status: 200 })
}
