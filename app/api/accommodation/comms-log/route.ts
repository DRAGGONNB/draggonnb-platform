import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('booking_id')
    const guestId = searchParams.get('guest_id')
    const channel = searchParams.get('channel')
    const direction = searchParams.get('direction')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = auth.supabase
      .from('accommodation_comms_log')
      .select('*')
      .eq('organization_id', auth.organizationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (bookingId) query = query.eq('booking_id', bookingId)
    if (guestId) query = query.eq('guest_id', guestId)
    if (channel) query = query.eq('channel', channel)
    if (direction) query = query.eq('direction', direction)

    const { data: logs, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch comms log' }, { status: 500 })
    }

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Comms log GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
