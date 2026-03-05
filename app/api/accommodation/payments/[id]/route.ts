import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { paymentStatus } from '@/lib/accommodation/schemas'

const updatePaymentSchema = z.object({
  status: paymentStatus.optional(),
  gateway_reference: z.string().optional(),
  payment_method: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { id } = await params

    const { data: payment, error } = await auth.supabase
      .from('accommodation_payment_transactions')
      .select('*')
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (error || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    return NextResponse.json({ payment })
  } catch (error) {
    console.error('Payment GET error:', error)
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
    const parsed = updatePaymentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    }

    // Set completed_at when status transitions to completed
    if (parsed.data.status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { data: payment, error } = await auth.supabase
      .from('accommodation_payment_transactions')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single()

    if (error || !payment) {
      return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 })
    }

    return NextResponse.json({ payment })
  } catch (error) {
    console.error('Payment PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
