import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage')
    const propertyId = searchParams.get('property_id')

    let query = auth.supabase
      .from('accommodation_inquiries')
      .select('*, accommodation_properties(name), accommodation_units(name)', { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .order('created_at', { ascending: false })

    if (stage) query = query.eq('stage', stage)
    if (propertyId) query = query.eq('property_id', propertyId)

    const { data: inquiries, error, count } = await query
    if (error) return NextResponse.json({ error: 'Failed to fetch inquiries' }, { status: 500 })

    return NextResponse.json({ inquiries: inquiries || [], total: count || 0 })
  } catch (error) {
    console.error('Inquiries GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const { property_id, unit_id, guest_name, guest_email, guest_phone, check_in_date, check_out_date, guests_count, quoted_price, source, special_requests } = body

    if (!guest_name) {
      return NextResponse.json({ error: 'Guest name is required' }, { status: 400 })
    }

    const { data: inquiry, error } = await auth.supabase
      .from('accommodation_inquiries')
      .insert({
        organization_id: auth.organizationId,
        property_id: property_id || null,
        unit_id: unit_id || null,
        guest_name,
        guest_email: guest_email || null,
        guest_phone: guest_phone || null,
        check_in_date: check_in_date || null,
        check_out_date: check_out_date || null,
        guests_count: guests_count || 1,
        quoted_price: quoted_price || null,
        source: source || 'direct',
        special_requests: special_requests || null,
        created_by: auth.userId,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Failed to create inquiry' }, { status: 500 })

    return NextResponse.json({ inquiry }, { status: 201 })
  } catch (error) {
    console.error('Inquiries POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
