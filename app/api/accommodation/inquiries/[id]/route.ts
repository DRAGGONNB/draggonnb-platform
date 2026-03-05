import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const { stage, guest_name, guest_email, guest_phone, check_in_date, check_out_date, guests_count, quoted_price, special_requests, notes } = body

    const { data: inquiry, error } = await auth.supabase
      .from('accommodation_inquiries')
      .update({ stage, guest_name, guest_email, guest_phone, check_in_date, check_out_date, guests_count, quoted_price, special_requests, notes, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single()

    if (error || !inquiry) return NextResponse.json({ error: 'Failed to update inquiry' }, { status: 500 })

    return NextResponse.json({ inquiry })
  } catch (error) {
    console.error('Inquiry PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
