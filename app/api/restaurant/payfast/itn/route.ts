import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PAYFAST_VALID_IPS, ORG_ID } from '@/lib/restaurant/constants'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()

  // Validate source IP
  const forwardedFor = req.headers.get('x-forwarded-for')
  const sourceIp = forwardedFor?.split(',')[0]?.trim()
  if (sourceIp && !PAYFAST_VALID_IPS.includes(sourceIp)) {
    console.warn('PayFast ITN from invalid IP:', sourceIp)
    // Don't reject in sandbox mode - PayFast sandbox may use different IPs
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Invalid source' }, { status: 403 })
    }
  }

  // Parse form data
  const formData = await req.formData()
  const pfData: Record<string, string> = {}
  formData.forEach((value, key) => {
    pfData[key] = value.toString()
  })

  // Verify signature
  const restaurant = await getRestaurantFromPayment(supabase, pfData.m_payment_id)
  if (restaurant?.payfast_passphrase) {
    const paramString = Object.entries(pfData)
      .filter(([key]) => key !== 'signature')
      .map(([key, val]) => `${key}=${encodeURIComponent(val.trim()).replace(/%20/g, '+')}`)
      .join('&')

    const withPassphrase = `${paramString}&passphrase=${encodeURIComponent(restaurant.payfast_passphrase.trim()).replace(/%20/g, '+')}`
    const expectedSig = crypto.createHash('md5').update(withPassphrase).digest('hex')

    if (pfData.signature !== expectedSig) {
      console.error('PayFast ITN signature mismatch')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  }

  // Extract bill_id and payer_id from m_payment_id
  const [billId, payerId] = (pfData.m_payment_id || '').split('_')
  if (!billId || !payerId) {
    return NextResponse.json({ error: 'Invalid m_payment_id' }, { status: 400 })
  }

  // Only process COMPLETE payments
  if (pfData.payment_status !== 'COMPLETE') {
    console.log('PayFast ITN non-complete status:', pfData.payment_status)
    return new NextResponse('OK', { status: 200 })
  }

  const amountPaid = parseFloat(pfData.amount_gross || '0')

  // Get payer to determine tip
  const { data: payer } = await supabase
    .from('bill_payers')
    .select('amount_due, tip_amount')
    .eq('id', payerId)
    .single()

  const tip = payer ? amountPaid - Number(payer.amount_due) : 0

  // Record payment
  await supabase.from('bill_payments').insert({
    organization_id: ORG_ID,
    bill_id: billId,
    payer_id: payerId,
    amount: amountPaid,
    tip: Math.max(tip, 0),
    payment_method: 'payfast',
    payfast_ref: pfData.pf_payment_id || null,
    itn_payload: pfData,
  })

  // Update payer status
  await supabase
    .from('bill_payers')
    .update({
      status: 'paid',
      amount_paid: amountPaid,
      tip_amount: Math.max(tip, 0),
      paid_at: new Date().toISOString(),
    })
    .eq('id', payerId)

  // Check if all payers are paid -> update bill status
  const { data: allPayers } = await supabase
    .from('bill_payers')
    .select('status')
    .eq('bill_id', billId)

  const allPaid = allPayers?.every(p => p.status === 'paid')
  const somePaid = allPayers?.some(p => p.status === 'paid')

  await supabase
    .from('bills')
    .update({
      status: allPaid ? 'fully_paid' : somePaid ? 'partially_paid' : 'open',
      tip_total: (allPayers ?? [])
        .filter(p => p.status === 'paid')
        .reduce((sum) => sum, 0),
      updated_at: new Date().toISOString(),
    })
    .eq('id', billId)

  // Recalculate tip_total properly
  const { data: payments } = await supabase
    .from('bill_payments')
    .select('tip')
    .eq('bill_id', billId)

  const totalTips = (payments ?? []).reduce((sum, p) => sum + Number(p.tip), 0)
  await supabase.from('bills').update({ tip_total: totalTips }).eq('id', billId)

  // Fire N8N payment webhook (non-blocking)
  const webhookUrl = process.env.N8N_WEBHOOK_PAYMENT_RECEIVED
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bill_id: billId,
        payer_id: payerId,
        amount: amountPaid,
        tip,
        all_paid: allPaid,
        payfast_ref: pfData.pf_payment_id,
      }),
    }).catch(() => {})
  }

  // PayFast requires 200 OK response
  return new NextResponse('OK', { status: 200 })
}

async function getRestaurantFromPayment(
  supabase: ReturnType<typeof createServiceClient>,
  mPaymentId: string
) {
  const [billId] = (mPaymentId || '').split('_')
  if (!billId) return null

  const { data } = await supabase
    .from('bills')
    .select('restaurants(payfast_passphrase)')
    .eq('id', billId)
    .single()

  return data?.restaurants as unknown as { payfast_passphrase: string } | null
}
