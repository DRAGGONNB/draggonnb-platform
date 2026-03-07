import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { createCostDefaultSchema } from '@/lib/accommodation/schemas'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const propertyType = searchParams.get('property_type')
    const unitType = searchParams.get('unit_type')

    let query = auth.supabase
      .from('accommodation_cost_defaults')
      .select('*, category:accommodation_cost_categories(id, name, category_type)')
      .eq('organization_id', auth.organizationId)

    if (propertyType) query = query.eq('property_type', propertyType)
    if (unitType) query = query.eq('unit_type', unitType)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch cost defaults' }, { status: 500 })
    }

    return NextResponse.json({ cost_defaults: data })
  } catch (error) {
    console.error('Cost defaults GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createCostDefaultSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await auth.supabase
      .from('accommodation_cost_defaults')
      .insert({ ...parsed.data, organization_id: auth.organizationId })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create cost default' }, { status: 500 })
    }

    return NextResponse.json({ cost_default: data }, { status: 201 })
  } catch (error) {
    console.error('Cost defaults POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
