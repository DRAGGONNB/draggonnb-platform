import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

const createSegmentSchema = z.object({
  booking_id: z.string().uuid(),
  property_id: z.string().uuid(),
  unit_id: z.string().uuid().optional(),
  room_id: z.string().uuid().optional(),
  check_in_date: z.string().min(1, 'Check-in date is required'),
  check_out_date: z.string().min(1, 'Check-out date is required'),
  segment_total: z.number().min(0).optional(),
  sort_order: z.number().int().min(0).optional(),
})

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('booking_id')

    if (!bookingId) {
      return NextResponse.json({ error: 'booking_id is required' }, { status: 400 })
    }

    const { data: segments, error } = await auth.supabase
      .from('accommodation_booking_segments')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('organization_id', auth.organizationId)
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch segments' }, { status: 500 })
    }

    return NextResponse.json({ segments: segments || [] })
  } catch (error) {
    console.error('Booking segments GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createSegmentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    // Verify booking exists and belongs to this organization
    const { data: booking } = await auth.supabase
      .from('accommodation_bookings')
      .select('id')
      .eq('id', parsed.data.booking_id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Verify property exists and belongs to this organization
    const { data: property } = await auth.supabase
      .from('accommodation_properties')
      .select('id')
      .eq('id', parsed.data.property_id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const { data: segment, error } = await auth.supabase
      .from('accommodation_booking_segments')
      .insert({
        organization_id: auth.organizationId,
        ...parsed.data,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create segment' }, { status: 500 })
    }

    return NextResponse.json({ segment }, { status: 201 })
  } catch (error) {
    console.error('Booking segments POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
