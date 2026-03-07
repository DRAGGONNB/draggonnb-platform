import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { emitEventSchema } from '@/lib/accommodation/schemas'
import { emitBookingEvent } from '@/lib/accommodation/events/dispatcher'

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = emitEventSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { booking_id, event } = parsed.data

    // Verify booking exists and belongs to this org
    const { data: booking, error: bookingError } = await auth.supabase
      .from('accommodation_bookings')
      .select('id')
      .eq('id', booking_id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const result = await emitBookingEvent(auth.supabase, auth.organizationId, booking_id, event)

    return NextResponse.json({
      success: true,
      event,
      booking_id,
      queued: result.queued,
      errors: result.errors,
    })
  } catch (error) {
    console.error('Events POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
