import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { generatePaymentLinkRequestSchema } from '@/lib/accommodation/schemas'
import { generateAccommodationPaymentLink } from '@/lib/accommodation/payments/payfast-link'

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = generatePaymentLinkRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    // Fetch booking with guest and property details for the payment link
    const { data: booking, error: bookingError } = await auth.supabase
      .from('accommodation_bookings')
      .select(`
        id,
        status,
        total_price,
        deposit_amount,
        guest_id,
        unit_id
      `)
      .eq('id', parsed.data.booking_id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Fetch guest details
    const { data: guest, error: guestError } = await auth.supabase
      .from('accommodation_guests')
      .select('id, first_name, last_name, email')
      .eq('id', booking.guest_id)
      .single()

    if (guestError || !guest) {
      return NextResponse.json({ error: 'Guest not found for this booking' }, { status: 404 })
    }

    if (!guest.email) {
      return NextResponse.json({ error: 'Guest email is required for payment link generation' }, { status: 400 })
    }

    // Fetch unit and property name
    const { data: unit, error: unitError } = await auth.supabase
      .from('accommodation_units')
      .select('name, property_id')
      .eq('id', booking.unit_id)
      .single()

    let propertyName = 'Accommodation'
    if (!unitError && unit) {
      // Try to get property name
      const { data: property } = await auth.supabase
        .from('accommodation_properties')
        .select('name')
        .eq('id', unit.property_id)
        .single()
      propertyName = property?.name || unit.name || 'Accommodation'
    }

    const result = await generateAccommodationPaymentLink(auth.supabase, {
      organizationId: auth.organizationId,
      bookingId: parsed.data.booking_id,
      amount: parsed.data.amount,
      paymentType: parsed.data.payment_type,
      guestEmail: guest.email,
      guestName: `${guest.first_name || ''} ${guest.last_name || ''}`.trim() || 'Guest',
      propertyName,
      expiresInHours: parsed.data.expires_in_hours,
    })

    return NextResponse.json({
      payment_url: result.paymentUrl,
      payment_link_id: result.paymentLinkId,
      expires_at: result.expiresAt,
      guest_email: guest.email,
      amount: parsed.data.amount,
      payment_type: parsed.data.payment_type,
    }, { status: 201 })
  } catch (error) {
    console.error('Generate payment link error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
