import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { updateGuestSchema } from '@/lib/accommodation/schemas'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { data: guest, error } = await auth.supabase
      .from('accommodation_guests')
      .select('*, accommodation_bookings(id, booking_ref, status, check_in_date, check_out_date, grand_total, property:accommodation_properties(name))')
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (error || !guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
    }

    return NextResponse.json({ guest })
  } catch (error) {
    console.error('Guest GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = updateGuestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data: guest, error } = await auth.supabase
      .from('accommodation_guests')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single()

    if (error || !guest) {
      return NextResponse.json({ error: 'Failed to update guest' }, { status: 500 })
    }

    return NextResponse.json({ guest })
  } catch (error) {
    console.error('Guest PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    // Check for active bookings before deleting
    const { count: bookingCount } = await auth.supabase
      .from('accommodation_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('guest_id', id)
      .eq('organization_id', auth.organizationId)
      .in('status', ['confirmed', 'checked_in', 'pending_deposit', 'quoted'])

    if (bookingCount && bookingCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete guest with active bookings' },
        { status: 409 }
      )
    }

    const { error } = await auth.supabase
      .from('accommodation_guests')
      .delete()
      .eq('id', id)
      .eq('organization_id', auth.organizationId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete guest' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Guest DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
