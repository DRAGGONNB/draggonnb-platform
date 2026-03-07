import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { updateCostCategorySchema } from '@/lib/accommodation/schemas'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth
    const { id } = await params

    const body = await request.json()
    const parsed = updateCostCategorySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await auth.supabase
      .from('accommodation_cost_categories')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update cost category' }, { status: 500 })
    }

    return NextResponse.json({ cost_category: data })
  } catch (error) {
    console.error('Cost categories PATCH error:', error)
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
      .from('accommodation_cost_categories')
      .delete()
      .eq('id', id)
      .eq('organization_id', auth.organizationId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete cost category' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cost categories DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
