import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { z } from 'zod'

const addonOrderSchema = z.object({
  booking_id: z.string().uuid(),
  service_id: z.string().uuid(),
  guest_id: z.string().uuid().optional(),
  quantity: z.number().int().min(1).default(1),
  unit_price: z.number().min(0),
  total: z.number().min(0).optional(),
  status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']).default('pending'),
  requested_date: z.string().optional(),
  requested_time: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('booking_id')
    const status = searchParams.get('status')

    if (!bookingId) {
      return NextResponse.json({ error: 'booking_id is required' }, { status: 400 })
    }

    let query = auth.supabase
      .from('accommodation_addon_orders')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data: orders, error, count } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch addon orders' }, { status: 500 })
    }

    return NextResponse.json({ orders: orders || [], total: count || 0 })
  } catch (error) {
    console.error('Addon orders GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = addonOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const insertData = {
      ...parsed.data,
      organization_id: auth.organizationId,
      total: parsed.data.total ?? parsed.data.quantity * parsed.data.unit_price,
    }

    const { data: order, error } = await auth.supabase
      .from('accommodation_addon_orders')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create addon order' }, { status: 500 })
    }

    return NextResponse.json({ order }, { status: 201 })
  } catch (error) {
    console.error('Addon orders POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
