import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { updateRatePlanSchema } from '@/lib/accommodation/schemas'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { data: ratePlan, error } = await auth.supabase
      .from('accommodation_rate_plans')
      .select('*')
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (error || !ratePlan) {
      return NextResponse.json({ error: 'Rate plan not found' }, { status: 404 })
    }

    return NextResponse.json({ ratePlan })
  } catch (error) {
    console.error('Rate plan GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = updateRatePlanSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data: ratePlan, error } = await auth.supabase
      .from('accommodation_rate_plans')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single()

    if (error || !ratePlan) {
      return NextResponse.json({ error: 'Failed to update rate plan' }, { status: 500 })
    }

    return NextResponse.json({ ratePlan })
  } catch (error) {
    console.error('Rate plan PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    // Soft check: do not delete if active bookings reference this rate plan
    const { count: bookingCount } = await auth.supabase
      .from('accommodation_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('rate_plan_id', id)
      .eq('organization_id', auth.organizationId)
      .in('status', ['confirmed', 'checked_in', 'pending_deposit', 'quoted'])

    if (bookingCount && bookingCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete rate plan with active bookings' },
        { status: 409 }
      )
    }

    const { error } = await auth.supabase
      .from('accommodation_rate_plans')
      .delete()
      .eq('id', id)
      .eq('organization_id', auth.organizationId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete rate plan' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Rate plan DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
