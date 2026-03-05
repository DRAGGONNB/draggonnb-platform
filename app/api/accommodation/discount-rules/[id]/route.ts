import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

const updateDiscountSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  discount_type: z.enum(['length_of_stay', 'early_bird', 'last_minute', 'promo_code', 'date_range', 'returning_guest', 'group']).optional(),
  value_type: z.enum(['percentage', 'fixed']).optional(),
  value: z.number().min(0).optional(),
  promo_code: z.string().optional().nullable(),
  min_nights: z.number().int().min(1).optional().nullable(),
  min_guests: z.number().int().min(1).optional().nullable(),
  days_before_arrival: z.number().int().min(0).optional().nullable(),
  valid_from: z.string().optional().nullable(),
  valid_to: z.string().optional().nullable(),
  stackable: z.boolean().optional(),
  max_uses: z.number().int().min(1).optional().nullable(),
  status: z.enum(['active', 'inactive', 'expired']).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = updateDiscountSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data: discount, error } = await auth.supabase
      .from('accommodation_discounts')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single()

    if (error || !discount) {
      return NextResponse.json({ error: 'Failed to update discount' }, { status: 500 })
    }

    return NextResponse.json({ discount })
  } catch (error) {
    console.error('Discount PATCH error:', error)
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
      .from('accommodation_discounts')
      .delete()
      .eq('id', id)
      .eq('organization_id', auth.organizationId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete discount' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Discount DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
