import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PAYFAST_URL } from '@/lib/restaurant/constants'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const { bill_id, payer_id, tip_amount = 0 } = await req.json()

  if (!bill_id || !payer_id) {
    return NextResponse.json({ error: 'bill_id and payer_id required' }, { status: 400 })
  }

  // Get payer
  const { data: payer } = await supabase
    .from('bill_payers')
    .select('*')
    .eq('id', payer_id)
    .eq('bill_id', bill_id)
    .single()

  if (!payer) return NextResponse.json({ error: 'Payer not found' }, { status: 404 })
  if (payer.status === 'paid') {
    return NextResponse.json({ error: 'Already paid' }, { status: 400 })
  }

  // Get bill + restaurant PayFast config
  const { data: bill } = await supabase
    .from('bills')
    .select('id, session_id, restaurant_id, restaurants(name, payfast_merchant_id, payfast_merchant_key, payfast_passphrase)')
    .eq('id', bill_id)
    .single()

  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 })

  const restaurant = bill.restaurants as unknown as {
    name: string
    payfast_merchant_id: string
    payfast_merchant_key: string
    payfast_passphrase: string
  }

  if (!restaurant.payfast_merchant_id) {
    return NextResponse.json({ error: 'PayFast not configured for this restaurant' }, { status: 500 })
  }

  // Update tip on payer
  if (tip_amount > 0) {
    await supabase
      .from('bill_payers')
      .update({ tip_amount })
      .eq('id', payer_id)
  }

  const totalAmount = Number(payer.amount_due) + Number(tip_amount)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Get table token for redirect URLs
  const { data: session } = await supabase
    .from('table_sessions')
    .select('table_id, restaurant_tables(qr_token)')
    .eq('id', bill.session_id)
    .single()

  const qrToken = (session?.restaurant_tables as unknown as { qr_token: string })?.qr_token || ''

  // Build PayFast data in the exact order required for signature
  const pfData: Record<string, string> = {
    merchant_id: restaurant.payfast_merchant_id,
    merchant_key: restaurant.payfast_merchant_key,
    return_url: `${appUrl}/t/${qrToken}/bill/pay/success?payer_id=${payer_id}`,
    cancel_url: `${appUrl}/t/${qrToken}/bill/pay/cancelled`,
    notify_url: `${appUrl}/api/restaurant/payfast/itn`,
    m_payment_id: `${bill_id}_${payer_id}`,
    amount: totalAmount.toFixed(2),
    item_name: `${restaurant.name} - Table Bill`,
    item_description: tip_amount > 0
      ? `Bill: R${Number(payer.amount_due).toFixed(2)} + Tip: R${Number(tip_amount).toFixed(2)}`
      : `Bill payment`,
  }

  // Generate signature
  const signatureString = Object.entries(pfData)
    .map(([key, val]) => `${key}=${encodeURIComponent(val.trim()).replace(/%20/g, '+')}`)
    .join('&')

  const withPassphrase = restaurant.payfast_passphrase
    ? `${signatureString}&passphrase=${encodeURIComponent(restaurant.payfast_passphrase.trim()).replace(/%20/g, '+')}`
    : signatureString

  pfData.signature = crypto.createHash('md5').update(withPassphrase).digest('hex')

  return NextResponse.json({
    payfast_url: PAYFAST_URL,
    payfast_form_data: pfData,
  })
}
