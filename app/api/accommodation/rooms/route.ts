import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { createRoomSchema } from '@/lib/accommodation/schemas'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const unitId = searchParams.get('unit_id')

    let query = auth.supabase
      .from('accommodation_rooms')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .order('sort_order', { ascending: true })

    if (unitId) query = query.eq('unit_id', unitId)

    const { data: rooms, error, count } = await query
    if (error) return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 })

    return NextResponse.json({ rooms: rooms || [], total: count || 0 })
  } catch (error) {
    console.error('Rooms GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createRoomSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: room, error } = await auth.supabase
      .from('accommodation_rooms')
      .insert({
        organization_id: auth.organizationId,
        ...parsed.data,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })

    return NextResponse.json({ room }, { status: 201 })
  } catch (error) {
    console.error('Rooms POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
