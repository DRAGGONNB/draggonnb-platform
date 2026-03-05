import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { createRatePlanPriceSchema } from '@/lib/accommodation/schemas'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const ratePlanId = searchParams.get('rate_plan_id')

    if (!ratePlanId) {
      return NextResponse.json(
        { error: 'rate_plan_id query parameter is required' },
        { status: 400 }
      )
    }

    const { data: prices, error } = await auth.supabase
      .from('accommodation_rate_plan_prices')
      .select('*')
      .eq('rate_plan_id', ratePlanId)
      .eq('organization_id', auth.organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch rate plan prices' }, { status: 500 })
    }

    return NextResponse.json({ prices: prices || [] })
  } catch (error) {
    console.error('Rate plan prices GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createRatePlanPriceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data: price, error } = await auth.supabase
      .from('accommodation_rate_plan_prices')
      .insert({ ...parsed.data, organization_id: auth.organizationId })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create rate plan price' }, { status: 500 })
    }

    return NextResponse.json({ price }, { status: 201 })
  } catch (error) {
    console.error('Rate plan prices POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
