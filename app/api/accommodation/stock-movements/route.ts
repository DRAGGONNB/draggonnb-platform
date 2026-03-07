import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { createStockMovementSchema } from '@/lib/accommodation/schemas'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const stockItemId = searchParams.get('stock_item_id')
    const movementType = searchParams.get('movement_type')
    const unitId = searchParams.get('unit_id')

    let query = auth.supabase
      .from('accommodation_stock_movements')
      .select('*, stock_item:accommodation_stock_items(id, name, category, unit_of_measure), unit:accommodation_units(name)')
      .eq('organization_id', auth.organizationId)
      .order('created_at', { ascending: false })

    if (stockItemId) query = query.eq('stock_item_id', stockItemId)
    if (movementType) query = query.eq('movement_type', movementType)
    if (unitId) query = query.eq('unit_id', unitId)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch stock movements' }, { status: 500 })
    }

    return NextResponse.json({ stock_movements: data })
  } catch (error) {
    console.error('Stock movements GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createStockMovementSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    // Create the movement record
    const { data: movement, error: moveError } = await auth.supabase
      .from('accommodation_stock_movements')
      .insert({
        ...parsed.data,
        organization_id: auth.organizationId,
        recorded_by: auth.userId,
      })
      .select()
      .single()

    if (moveError) {
      return NextResponse.json({ error: 'Failed to create stock movement' }, { status: 500 })
    }

    // Update current_stock on the stock item
    const { data: currentItem } = await auth.supabase
      .from('accommodation_stock_items')
      .select('current_stock')
      .eq('id', parsed.data.stock_item_id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (currentItem) {
      const newStock = (currentItem.current_stock || 0) + parsed.data.quantity
      await auth.supabase
        .from('accommodation_stock_items')
        .update({ current_stock: Math.max(0, newStock), updated_at: new Date().toISOString() })
        .eq('id', parsed.data.stock_item_id)
        .eq('organization_id', auth.organizationId)
    }

    return NextResponse.json({ stock_movement: movement }, { status: 201 })
  } catch (error) {
    console.error('Stock movements POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
