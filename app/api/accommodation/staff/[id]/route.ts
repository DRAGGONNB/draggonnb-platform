import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { updateStaffSchema } from '@/lib/accommodation/schemas'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { id } = await params

    const { data: member, error } = await auth.supabase
      .from('accommodation_staff')
      .select('*')
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (error || !member) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    return NextResponse.json({ staff: member })
  } catch (error) {
    console.error('Staff GET error:', error)
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
    const parsed = updateStaffSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: member, error } = await auth.supabase
      .from('accommodation_staff')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single()

    if (error || !member) {
      return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 })
    }

    return NextResponse.json({ staff: member })
  } catch (error) {
    console.error('Staff PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { id } = await params

    // Soft delete — deactivate rather than remove
    const { data: member, error } = await auth.supabase
      .from('accommodation_staff')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single()

    if (error || !member) {
      return NextResponse.json({ error: 'Failed to deactivate staff member' }, { status: 500 })
    }

    return NextResponse.json({ staff: member, message: 'Staff member deactivated' })
  } catch (error) {
    console.error('Staff DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
