import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { createPaymentLinkSchema } from '@/lib/accommodation/schemas'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('booking_id')
    const status = searchParams.get('status')
    const paymentType = searchParams.get('payment_type')

    let query = auth.supabase
      .from('accommodation_payment_links')
      .select('*')
      .eq('organization_id', auth.organizationId)
      .order('created_at', { ascending: false })

    if (bookingId) query = query.eq('booking_id', bookingId)
    if (status) query = query.eq('status', status)
    if (paymentType) query = query.eq('payment_type', paymentType)

    const { data: paymentLinks, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch payment links' }, { status: 500 })
    }

    return NextResponse.json({ payment_links: paymentLinks })
  } catch (error) {
    console.error('Payment links GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createPaymentLinkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    // Verify booking exists and belongs to this org
    const { data: booking, error: bookingError } = await auth.supabase
      .from('accommodation_bookings')
      .select('id, status')
      .eq('id', parsed.data.booking_id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const expiresInHours = parsed.data.expires_in_hours ?? 72
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)

    const { data: paymentLink, error } = await auth.supabase
      .from('accommodation_payment_links')
      .insert({
        organization_id: auth.organizationId,
        booking_id: parsed.data.booking_id,
        amount: parsed.data.amount,
        currency: 'ZAR',
        payment_type: parsed.data.payment_type,
        gateway: 'payfast',
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create payment link' }, { status: 500 })
    }

    return NextResponse.json({ payment_link: paymentLink }, { status: 201 })
  } catch (error) {
    console.error('Payment links POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
