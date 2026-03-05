import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { createGuestSchema } from '@/lib/accommodation/schemas'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const vip = searchParams.get('vip')

    let query = auth.supabase
      .from('accommodation_guests')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .order('created_at', { ascending: false })

    if (search) {
      const sanitized = search.replace(/[%,.*()]/g, '')
      if (sanitized) {
        query = query.or(`first_name.ilike.%${sanitized}%,last_name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`)
      }
    }
    if (vip === 'true') query = query.eq('vip_status', true)

    const { data: guests, error, count } = await query
    if (error) return NextResponse.json({ error: 'Failed to fetch guests' }, { status: 500 })

    return NextResponse.json({ guests: guests || [], total: count || 0 })
  } catch (error) {
    console.error('Guests GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createGuestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: guest, error } = await auth.supabase
      .from('accommodation_guests')
      .insert({
        organization_id: auth.organizationId,
        ...parsed.data,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Guest with this email already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create guest' }, { status: 500 })
    }

    return NextResponse.json({ guest }, { status: 201 })
  } catch (error) {
    console.error('Guests POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
