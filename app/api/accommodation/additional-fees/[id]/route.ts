import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

const updateFeeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  fee_type: z.enum(['fixed', 'percentage', 'per_person', 'per_night', 'per_person_per_night']).optional(),
  amount: z.number().min(0).optional(),
  is_taxable: z.boolean().optional(),
  is_mandatory: z.boolean().optional(),
  applies_to: z.enum(['booking', 'person', 'night', 'unit']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
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
    const parsed = updateFeeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data: fee, error } = await auth.supabase
      .from('accommodation_fees')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single()

    if (error || !fee) {
      return NextResponse.json({ error: 'Failed to update fee' }, { status: 500 })
    }

    return NextResponse.json({ fee })
  } catch (error) {
    console.error('Fee PATCH error:', error)
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
      .from('accommodation_fees')
      .delete()
      .eq('id', id)
      .eq('organization_id', auth.organizationId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete fee' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fee DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
