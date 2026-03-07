import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { updatePaymentLinkSchema } from '@/lib/accommodation/schemas'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { id } = await params

    const { data: paymentLink, error } = await auth.supabase
      .from('accommodation_payment_links')
      .select('*')
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (error || !paymentLink) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 })
    }

    return NextResponse.json({ payment_link: paymentLink })
  } catch (error) {
    console.error('Payment link GET error:', error)
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
    const parsed = updatePaymentLinkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { ...parsed.data }

    // If marking as paid, set paid_at timestamp
    if (parsed.data.status === 'paid') {
      updateData.paid_at = new Date().toISOString()
    }

    const { data: paymentLink, error } = await auth.supabase
      .from('accommodation_payment_links')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single()

    if (error || !paymentLink) {
      return NextResponse.json({ error: 'Payment link not found or update failed' }, { status: 404 })
    }

    return NextResponse.json({ payment_link: paymentLink })
  } catch (error) {
    console.error('Payment link PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
