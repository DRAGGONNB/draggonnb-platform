import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { createUnitCostSchema } from '@/lib/accommodation/schemas'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const unitId = searchParams.get('unit_id')
    const bookingId = searchParams.get('booking_id')
    const categoryId = searchParams.get('category_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = auth.supabase
      .from('accommodation_unit_costs')
      .select('*, category:accommodation_cost_categories(id, name, category_type), unit:accommodation_units(name)')
      .eq('organization_id', auth.organizationId)
      .order('cost_date', { ascending: false })

    if (unitId) query = query.eq('unit_id', unitId)
    if (bookingId) query = query.eq('booking_id', bookingId)
    if (categoryId) query = query.eq('category_id', categoryId)
    if (startDate) query = query.gte('cost_date', startDate)
    if (endDate) query = query.lte('cost_date', endDate)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch unit costs' }, { status: 500 })
    }

    return NextResponse.json({ unit_costs: data })
  } catch (error) {
    console.error('Unit costs GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createUnitCostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await auth.supabase
      .from('accommodation_unit_costs')
      .insert({
        ...parsed.data,
        organization_id: auth.organizationId,
        recorded_by: auth.userId,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create unit cost' }, { status: 500 })
    }

    return NextResponse.json({ unit_cost: data }, { status: 201 })
  } catch (error) {
    console.error('Unit costs POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
