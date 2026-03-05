import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { paymentGateway, paymentStatus, paymentMode } from '@/lib/accommodation/schemas'

const createPaymentSchema = z.object({
  booking_id: z.string().uuid(),
  invoice_id: z.string().uuid().optional(),
  gateway: paymentGateway,
  gateway_reference: z.string().optional(),
  payment_mode: paymentMode.default('mode_a'),
  amount: z.number().min(0),
  currency: z.string().default('ZAR'),
  status: paymentStatus.default('pending'),
  payment_method: z.string().optional(),
  payer_email: z.string().email().optional().or(z.literal('')),
  metadata: z.record(z.unknown()).optional(),
})

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('booking_id')
    const status = searchParams.get('status')

    let query = auth.supabase
      .from('accommodation_payment_transactions')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .order('created_at', { ascending: false })

    if (bookingId) query = query.eq('booking_id', bookingId)
    if (status) query = query.eq('status', status)

    const { data: payments, error, count } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    return NextResponse.json({ payments: payments || [], total: count || 0 })
  } catch (error) {
    console.error('Payments GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createPaymentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: payment, error } = await auth.supabase
      .from('accommodation_payment_transactions')
      .insert({
        organization_id: auth.organizationId,
        ...parsed.data,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
    }

    return NextResponse.json({ payment }, { status: 201 })
  } catch (error) {
    console.error('Payments POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
