import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth
    const { id } = await params

    const { data, error } = await auth.supabase
      .from('accommodation_stock_movements')
      .select('*, stock_item:accommodation_stock_items(id, name, category, unit_of_measure), unit:accommodation_units(name)')
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Stock movement not found' }, { status: 404 })
    }

    return NextResponse.json({ stock_movement: data })
  } catch (error) {
    console.error('Stock movement GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
