import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { createFeeSchema } from '@/lib/accommodation/schemas'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('property_id')
    const status = searchParams.get('status')

    let query = auth.supabase
      .from('accommodation_fees')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .order('created_at', { ascending: false })

    if (propertyId) query = query.eq('property_id', propertyId)
    if (status) query = query.eq('status', status)

    const { data: fees, error, count } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch fees' }, { status: 500 })
    }

    return NextResponse.json({ fees: fees || [], total: count || 0 })
  } catch (error) {
    console.error('Fees GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createFeeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data: fee, error } = await auth.supabase
      .from('accommodation_fees')
      .insert({ ...parsed.data, organization_id: auth.organizationId })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create fee' }, { status: 500 })
    }

    return NextResponse.json({ fee }, { status: 201 })
  } catch (error) {
    console.error('Fees POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
