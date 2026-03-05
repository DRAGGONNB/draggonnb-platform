import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { createBookingSchema } from '@/lib/accommodation/schemas'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('property_id')
    const status = searchParams.get('status')
    const guestId = searchParams.get('guest_id')
    const checkInFrom = searchParams.get('check_in_from')
    const checkInTo = searchParams.get('check_in_to')

    let query = auth.supabase
      .from('accommodation_bookings')
      .select('*, accommodation_guests(first_name, last_name, email), accommodation_properties(name)', { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .order('check_in_date', { ascending: false })

    if (propertyId) query = query.eq('property_id', propertyId)
    if (status) query = query.eq('status', status)
    if (guestId) query = query.eq('guest_id', guestId)
    if (checkInFrom) query = query.gte('check_in_date', checkInFrom)
    if (checkInTo) query = query.lte('check_in_date', checkInTo)

    const { data: bookings, error, count } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    return NextResponse.json({ bookings: bookings || [], total: count || 0 })
  } catch (error) {
    console.error('Bookings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createBookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { check_in_date, check_out_date } = parsed.data
    const checkIn = new Date(check_in_date)
    const checkOut = new Date(check_out_date)
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))

    const bookingRef = `BK-${Date.now().toString(36).toUpperCase()}`

    const { data: booking, error } = await auth.supabase
      .from('accommodation_bookings')
      .insert({
        organization_id: auth.organizationId,
        ...parsed.data,
        booking_ref: bookingRef,
        status: 'inquiry',
        nights,
        currency: 'ZAR',
        subtotal: 0,
        discount_total: 0,
        fee_total: 0,
        tax_total: 0,
        grand_total: 0,
        amount_paid: 0,
        balance_due: 0,
        created_by: auth.userId,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }

    return NextResponse.json({ booking }, { status: 201 })
  } catch (error) {
    console.error('Bookings POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
