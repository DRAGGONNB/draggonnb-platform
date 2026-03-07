import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { createStockItemSchema } from '@/lib/accommodation/schemas'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const activeOnly = searchParams.get('active') !== 'false'

    let query = auth.supabase
      .from('accommodation_stock_items')
      .select('*')
      .eq('organization_id', auth.organizationId)
      .order('name')

    if (category) query = query.eq('category', category)
    if (activeOnly) query = query.eq('is_active', true)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch stock items' }, { status: 500 })
    }

    return NextResponse.json({ stock_items: data })
  } catch (error) {
    console.error('Stock items GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createStockItemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await auth.supabase
      .from('accommodation_stock_items')
      .insert({ ...parsed.data, organization_id: auth.organizationId })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create stock item' }, { status: 500 })
    }

    return NextResponse.json({ stock_item: data }, { status: 201 })
  } catch (error) {
    console.error('Stock items POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
