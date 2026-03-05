import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { z } from 'zod'

const serviceSchema = z.object({
  property_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.enum(['food_beverage', 'activity', 'transport', 'equipment', 'spa', 'general']).default('general'),
  price: z.number().min(0),
  price_type: z.enum(['fixed', 'per_person', 'per_hour', 'quote']).default('fixed'),
  requires_advance_booking: z.boolean().default(false),
  advance_hours: z.number().int().min(0).optional(),
  is_available: z.boolean().default(true),
  image_url: z.string().url().optional().or(z.literal('')),
  sort_order: z.number().int().default(0),
})

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('property_id')
    const category = searchParams.get('category')
    const isAvailable = searchParams.get('is_available')

    let query = auth.supabase
      .from('accommodation_service_catalog')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .order('sort_order', { ascending: true })

    if (propertyId) query = query.eq('property_id', propertyId)
    if (category) query = query.eq('category', category)
    if (isAvailable !== null && isAvailable !== undefined) {
      query = query.eq('is_available', isAvailable === 'true')
    }

    const { data: services, error, count } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
    }

    return NextResponse.json({ services: services || [], total: count || 0 })
  } catch (error) {
    console.error('Service catalog GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = serviceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data: service, error } = await auth.supabase
      .from('accommodation_service_catalog')
      .insert({ ...parsed.data, organization_id: auth.organizationId })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
    }

    return NextResponse.json({ service }, { status: 201 })
  } catch (error) {
    console.error('Service catalog POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
