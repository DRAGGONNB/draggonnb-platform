import { NextRequest, NextResponse } from 'next/server'
import {
  validatePayFastSignature,
  verifyPayFastPayment,
  type PayFastITNData,
} from '@/lib/payments/payfast'
import { createAdminClient } from '@/lib/supabase/admin'
import { emitBookingEvent } from '@/lib/accommodation/events/dispatcher'

/**
 * PayFast ITN Webhook for Accommodation Payments
 * Handles booking deposits, balance payments, and additional fees
 *
 * Custom field mapping:
 * - custom_str1: organizationId
 * - custom_str2: bookingId
 * - custom_str3: paymentType (deposit | balance | additional_fee)
 * - m_payment_id: gateway reference (ACC-{bookingId}-{timestamp})
 */
export async function POST(request: NextRequest) {
  try {
    // Parse ITN data from PayFast (URL-encoded form data)
    const formData = await request.formData()
    const itnData: Record<string, string> = {}

    formData.forEach((value, key) => {
      itnData[key] = value.toString()
    })

    console.log('PayFast Accommodation ITN received:', {
      payment_id: itnData.pf_payment_id,
      status: itnData.payment_status,
      amount: itnData.amount_gross,
      m_payment_id: itnData.m_payment_id,
    })

    // Step 1: Validate signature
    const passphrase = process.env.PAYFAST_PASSPHRASE
    const isValidSignature = validatePayFastSignature(itnData, passphrase)

    if (!isValidSignature) {
      console.error('Invalid PayFast accommodation ITN signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    console.log('✓ Accommodation payment signature validated')

    // Step 2: Verify payment with PayFast server
    const isValidPayment = await verifyPayFastPayment(itnData as PayFastITNData)

    if (!isValidPayment) {
      console.error('PayFast accommodation payment verification failed')
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
    }

    console.log('✓ Accommodation payment verified with PayFast server')

    // Step 3: Extract accommodation-specific data
    const {
      pf_payment_id,
      payment_status,
      amount_gross,
      amount_fee,
      amount_net,
      m_payment_id: gatewayReference,
      custom_str1: organizationId,
      custom_str2: bookingId,
      custom_str3: paymentType,
    } = itnData as PayFastITNData

    if (!organizationId || !bookingId) {
      console.error('Missing organizationId or bookingId in ITN custom fields')
      return NextResponse.json({ error: 'Missing required custom fields' }, { status: 400 })
    }

    // Initialize admin client (bypasses RLS for webhook)
    const supabase = createAdminClient()

    // Step 4: Handle payment statuses
    if (payment_status === 'COMPLETE') {
      // 4a: Update payment link status
      if (gatewayReference) {
        const { error: linkError } = await supabase
          .from('accommodation_payment_links')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
          })
          .eq('gateway_reference', gatewayReference)
          .eq('organization_id', organizationId)

        if (linkError) {
          console.error('Failed to update payment link:', linkError)
        } else {
          console.log('✓ Payment link marked as paid')
        }
      }

      // 4b: Record payment in accommodation_payments
      const { error: paymentError } = await supabase
        .from('accommodation_payments')
        .insert({
          organization_id: organizationId,
          booking_id: bookingId,
          amount: parseFloat(amount_gross),
          currency: 'ZAR',
          payment_type: paymentType || 'balance',
          payment_method: 'payfast',
          status: 'completed',
          transaction_id: pf_payment_id,
          payment_date: new Date().toISOString(),
          metadata: {
            pf_payment_id,
            amount_fee: parseFloat(amount_fee || '0'),
            amount_net: parseFloat(amount_net || amount_gross),
            gateway_reference: gatewayReference,
          },
        })

      if (paymentError) {
        console.error('Failed to record accommodation payment:', paymentError)
        // Don't return error — we still want to process the rest
      } else {
        console.log('✓ Accommodation payment recorded')
      }

      // 4c: Update booking status if deposit was received
      if (paymentType === 'deposit') {
        const { error: bookingError } = await supabase
          .from('accommodation_bookings')
          .update({ status: 'confirmed' })
          .eq('id', bookingId)
          .eq('organization_id', organizationId)
          .eq('status', 'pending_deposit')

        if (bookingError) {
          console.error('Failed to update booking status:', bookingError)
        } else {
          console.log('✓ Booking status updated to confirmed')
        }
      }

      // 4d: Emit payment_received event (triggers guest notifications)
      emitBookingEvent(supabase, organizationId, bookingId, 'payment_received').catch((err) =>
        console.error(`Failed to emit payment_received for booking ${bookingId}:`, err)
      )

      console.log(`✓ Accommodation payment processed: ${pf_payment_id} for booking ${bookingId}`)

      return NextResponse.json({ status: 'ok' })
    }

    if (payment_status === 'FAILED') {
      console.log(`Accommodation payment failed: ${pf_payment_id}`)

      // Update payment link status if applicable
      if (gatewayReference) {
        await supabase
          .from('accommodation_payment_links')
          .update({ status: 'cancelled' })
          .eq('gateway_reference', gatewayReference)
          .eq('organization_id', organizationId)
      }

      // Log failed payment
      await supabase.from('accommodation_payments').insert({
        organization_id: organizationId,
        booking_id: bookingId,
        amount: parseFloat(amount_gross),
        currency: 'ZAR',
        payment_type: paymentType || 'balance',
        payment_method: 'payfast',
        status: 'failed',
        transaction_id: pf_payment_id,
        payment_date: new Date().toISOString(),
        metadata: { pf_payment_id, reason: 'Payment failed at gateway' },
      })

      return NextResponse.json({ status: 'ok' })
    }

    if (payment_status === 'PENDING') {
      console.log(`Accommodation payment pending: ${pf_payment_id}`)
      return NextResponse.json({ status: 'ok' })
    }

    if (payment_status === 'CANCELLED') {
      console.log(`Accommodation payment cancelled: ${pf_payment_id}`)

      if (gatewayReference) {
        await supabase
          .from('accommodation_payment_links')
          .update({ status: 'cancelled' })
          .eq('gateway_reference', gatewayReference)
          .eq('organization_id', organizationId)
      }

      return NextResponse.json({ status: 'ok' })
    }

    // Unknown status
    console.warn(`Unknown PayFast payment status: ${payment_status}`)
    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('PayFast accommodation webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
