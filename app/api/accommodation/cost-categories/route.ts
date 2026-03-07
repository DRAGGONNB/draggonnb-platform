import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { createCostCategorySchema } from '@/lib/accommodation/schemas'

export async function GET() {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { data, error } = await auth.supabase
      .from('accommodation_cost_categories')
      .select('*')
      .eq('organization_id', auth.organizationId)
      .order('name')

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch cost categories' }, { status: 500 })
    }

    return NextResponse.json({ cost_categories: data })
  } catch (error) {
    console.error('Cost categories GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createCostCategorySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await auth.supabase
      .from('accommodation_cost_categories')
      .insert({ ...parsed.data, organization_id: auth.organizationId })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create cost category' }, { status: 500 })
    }

    return NextResponse.json({ cost_category: data }, { status: 201 })
  } catch (error) {
    console.error('Cost categories POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
