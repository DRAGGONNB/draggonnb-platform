import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const bookingId = searchParams.get('booking_id')
    const channel = searchParams.get('channel')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = auth.supabase
      .from('accommodation_message_queue')
      .select('*, accommodation_automation_rules(name, trigger_event)')
      .eq('organization_id', auth.organizationId)
      .order('scheduled_for', { ascending: false })
      .limit(limit)

    if (status) query = query.eq('status', status)
    if (bookingId) query = query.eq('booking_id', bookingId)
    if (channel) query = query.eq('channel', channel)

    const { data: messages, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch message queue' }, { status: 500 })
    }

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Message queue GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
