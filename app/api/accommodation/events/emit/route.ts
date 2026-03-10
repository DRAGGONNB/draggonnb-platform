import { NextResponse, type NextRequest } from 'next/server'
import { getDualAuth, isDualAuthError } from '@/lib/accommodation/api-helpers'
import { emitBookingEvent, type BookingEvent } from '@/lib/accommodation/events/dispatcher'
import { z } from 'zod'

const emitSchema = z.object({
  bookingId: z.string().uuid(),
  event: z.enum([
    'booking_confirmed', 'booking_cancelled', 'guest_checked_in', 'guest_checked_out',
    'payment_received', 'deposit_due', 'check_in_24h', 'check_out_reminder',
    'review_request', 'turnover_needed', 'maintenance_urgent', 'vip_arrival',
  ]),
})

/**
 * POST /api/accommodation/events/emit
 * Emits a booking lifecycle event, triggering automation rules and staff notifications.
 * Supports dual auth: user session (UI trigger) or service key (N8N cron).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getDualAuth(request)
    if (isDualAuthError(auth)) return auth

    const body = await request.json()
    const parsed = emitSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { bookingId, event } = parsed.data

    // Verify booking exists and belongs to this org
    const { data: booking, error: bookingError } = await auth.supabase
      .from('accommodation_bookings')
      .select('id')
      .eq('id', bookingId)
      .eq('organization_id', auth.organizationId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const result = await emitBookingEvent(
      auth.supabase,
      auth.organizationId,
      bookingId,
      event as BookingEvent
    )

    return NextResponse.json({
      success: true,
      event,
      bookingId,
      queued: result.queued,
      errors: result.errors,
    })
  } catch (error) {
    console.error('[API] events/emit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
