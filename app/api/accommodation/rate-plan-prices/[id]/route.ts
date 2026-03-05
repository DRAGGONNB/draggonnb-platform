import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

const updateRatePlanPriceSchema = z.object({
  guest_category: z.enum(['adult', 'child', 'infant', 'teenager', 'senior', 'per_unit']).optional(),
  season: z.enum(['low', 'standard', 'high', 'peak', 'festive']).optional(),
  day_of_week: z.enum(['all', 'weekday', 'weekend', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).optional(),
  price: z.number().min(0, 'Price must be >= 0').optional(),
  min_nights: z.number().int().min(1).optional(),
  unit_id: z.string().uuid().optional().nullable(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { data: price, error } = await auth.supabase
      .from('accommodation_rate_plan_prices')
      .select('*')
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (error || !price) {
      return NextResponse.json({ error: 'Rate plan price not found' }, { status: 404 })
    }

    return NextResponse.json({ price })
  } catch (error) {
    console.error('Rate plan price GET error:', error)
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
    const parsed = updateRatePlanPriceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data: price, error } = await auth.supabase
      .from('accommodation_rate_plan_prices')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single()

    if (error || !price) {
      return NextResponse.json({ error: 'Failed to update rate plan price' }, { status: 500 })
    }

    return NextResponse.json({ price })
  } catch (error) {
    console.error('Rate plan price PATCH error:', error)
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

    const { error } = await auth.supabase
      .from('accommodation_rate_plan_prices')
      .delete()
      .eq('id', id)
      .eq('organization_id', auth.organizationId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete rate plan price' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Rate plan price DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
