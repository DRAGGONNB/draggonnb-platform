import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { updateStockItemSchema } from '@/lib/accommodation/schemas'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth
    const { id } = await params

    const { data, error } = await auth.supabase
      .from('accommodation_stock_items')
      .select('*')
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Stock item not found' }, { status: 404 })
    }

    return NextResponse.json({ stock_item: data })
  } catch (error) {
    console.error('Stock item GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth
    const { id } = await params

    const body = await request.json()
    const parsed = updateStockItemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await auth.supabase
      .from('accommodation_stock_items')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update stock item' }, { status: 500 })
    }

    return NextResponse.json({ stock_item: data })
  } catch (error) {
    console.error('Stock item PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth
    const { id } = await params

    const { error } = await auth.supabase
      .from('accommodation_stock_items')
      .delete()
      .eq('id', id)
      .eq('organization_id', auth.organizationId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete stock item' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Stock item DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
