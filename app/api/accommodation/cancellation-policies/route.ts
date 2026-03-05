import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { createCancellationPolicySchema } from '@/lib/accommodation/schemas'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('property_id')

    let query = auth.supabase
      .from('accommodation_cancellation_policies')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .order('created_at', { ascending: false })

    if (propertyId) query = query.eq('property_id', propertyId)

    const { data: policies, error, count } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch cancellation policies' }, { status: 500 })
    }

    return NextResponse.json({ policies: policies || [], total: count || 0 })
  } catch (error) {
    console.error('Cancellation policies GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createCancellationPolicySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: policy, error } = await auth.supabase
      .from('accommodation_cancellation_policies')
      .insert({
        organization_id: auth.organizationId,
        ...parsed.data,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create cancellation policy' }, { status: 500 })
    }

    return NextResponse.json({ policy }, { status: 201 })
  } catch (error) {
    console.error('Cancellation policies POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
