import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { updateBookingSchema } from '@/lib/accommodation/schemas'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { id } = await params

    const { data: booking, error } = await auth.supabase
      .from('accommodation_bookings')
      .select('*, accommodation_guests(*), accommodation_properties(name, type), accommodation_booking_segments(*), accommodation_charge_line_items(*)')
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    return NextResponse.json({ booking })
  } catch (error) {
    console.error('Booking GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { id } = await params
    const body = await request.json()
    const parsed = updateBookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    }

    // Set timestamps on status transitions
    if (parsed.data.status === 'confirmed') {
      updateData.confirmed_at = new Date().toISOString()
    }
    if (parsed.data.status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString()
    }

    const { data: booking, error } = await auth.supabase
      .from('accommodation_bookings')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
    }

    return NextResponse.json({ booking })
  } catch (error) {
    console.error('Booking PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { id } = await params

    // Check booking status before deletion
    const { data: existing } = await auth.supabase
      .from('accommodation_bookings')
      .select('status')
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (existing.status !== 'inquiry' && existing.status !== 'quoted') {
      return NextResponse.json({ error: 'Only bookings with status inquiry or quoted can be deleted' }, { status: 400 })
    }

    const { error } = await auth.supabase
      .from('accommodation_bookings')
      .delete()
      .eq('id', id)
      .eq('organization_id', auth.organizationId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Booking DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
