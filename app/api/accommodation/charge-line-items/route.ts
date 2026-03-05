import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { lineItemType } from '@/lib/accommodation/schemas'

const createLineItemSchema = z.object({
  booking_id: z.string().uuid(),
  segment_id: z.string().uuid().optional(),
  line_type: lineItemType,
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(0).default(1),
  unit_price: z.number().min(0).default(0),
  total: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('booking_id')

    if (!bookingId) {
      return NextResponse.json({ error: 'booking_id is required' }, { status: 400 })
    }

    const { data: lineItems, error } = await auth.supabase
      .from('accommodation_charge_line_items')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('organization_id', auth.organizationId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch line items' }, { status: 500 })
    }

    return NextResponse.json({ lineItems: lineItems || [] })
  } catch (error) {
    console.error('Charge line items GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createLineItemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    // Auto-calculate total if not provided
    const total = parsed.data.total ?? parsed.data.quantity * parsed.data.unit_price

    const { data: lineItem, error } = await auth.supabase
      .from('accommodation_charge_line_items')
      .insert({
        organization_id: auth.organizationId,
        ...parsed.data,
        total,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create line item' }, { status: 500 })
    }

    return NextResponse.json({ lineItem }, { status: 201 })
  } catch (error) {
    console.error('Charge line items POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
