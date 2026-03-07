/**
 * Accommodation PayFast Payment Link Generator
 * Builds one-time payment URLs for booking deposits, balances, and additional fees
 */

import { getPayFastConfig, generatePayFastSignature } from '@/lib/payments/payfast'
import type { SupabaseClient } from '@supabase/supabase-js'

export type AccommodationPaymentType = 'deposit' | 'balance' | 'additional_fee'

interface GenerateLinkParams {
  organizationId: string
  bookingId: string
  amount: number
  paymentType: AccommodationPaymentType
  guestEmail: string
  guestName: string
  propertyName: string
  expiresInHours?: number // defaults to 72 hours
}

interface GenerateLinkResult {
  paymentUrl: string
  paymentLinkId: string
  expiresAt: string
}

/**
 * Generate a PayFast payment URL for an accommodation booking
 * Creates a record in accommodation_payment_links and returns the payment URL
 */
export async function generateAccommodationPaymentLink(
  supabase: SupabaseClient,
  params: GenerateLinkParams
): Promise<GenerateLinkResult> {
  const config = getPayFastConfig()
  const expiresInHours = params.expiresInHours ?? 72
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)

  const paymentTypeLabels: Record<AccommodationPaymentType, string> = {
    deposit: 'Deposit',
    balance: 'Balance Payment',
    additional_fee: 'Additional Fee',
  }

  // Generate unique payment reference
  const paymentRef = `ACC-${params.bookingId.substring(0, 8)}-${Date.now()}`

  const itemName = `${params.propertyName} - ${paymentTypeLabels[params.paymentType]}`
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://draggonnb-platform.vercel.app'

  // Build PayFast form data for a once-off payment
  const formData: Record<string, string> = {
    merchant_id: config.merchantId,
    merchant_key: config.merchantKey,
    return_url: `${appUrl}/accommodation/bookings/${params.bookingId}?payment=success`,
    cancel_url: `${appUrl}/accommodation/bookings/${params.bookingId}?payment=cancelled`,
    notify_url: `${appUrl}/api/webhooks/payfast/accommodation`,
    email_address: params.guestEmail,
    m_payment_id: paymentRef,
    amount: params.amount.toFixed(2),
    item_name: itemName.substring(0, 100), // PayFast limit
    item_description: `Booking payment - ${paymentTypeLabels[params.paymentType]}`,
    custom_str1: params.organizationId,
    custom_str2: params.bookingId,
    custom_str3: params.paymentType,
    name_first: params.guestName.split(' ')[0] || 'Guest',
    name_last: params.guestName.split(' ').slice(1).join(' ') || '',
  }

  // Generate MD5 signature
  const signature = generatePayFastSignature(formData, config.passphrase)
  formData.signature = signature

  // Build payment URL with query params
  const paymentUrl = `${config.baseUrl}?${Object.entries(formData)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')}`

  // Store payment link in database
  const { data: paymentLink, error } = await supabase
    .from('accommodation_payment_links')
    .insert({
      organization_id: params.organizationId,
      booking_id: params.bookingId,
      amount: params.amount,
      currency: 'ZAR',
      payment_type: params.paymentType,
      gateway: 'payfast',
      gateway_reference: paymentRef,
      payment_url: paymentUrl,
      expires_at: expiresAt.toISOString(),
      status: 'pending',
    })
    .select('id')
    .single()

  if (error || !paymentLink) {
    throw new Error(`Failed to create payment link: ${error?.message || 'Unknown error'}`)
  }

  return {
    paymentUrl,
    paymentLinkId: paymentLink.id,
    expiresAt: expiresAt.toISOString(),
  }
}

/**
 * Mark expired payment links as expired
 * Call this periodically (e.g., daily cron)
 */
export async function expirePaymentLinks(
  supabase: SupabaseClient,
  organizationId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('accommodation_payment_links')
    .update({ status: 'expired' })
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())
    .select('id')

  if (error) {
    console.error('Failed to expire payment links:', error)
    return 0
  }

  return data?.length || 0
}
