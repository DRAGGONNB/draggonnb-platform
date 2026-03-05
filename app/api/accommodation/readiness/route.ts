import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

const readinessSchema = z.object({
  unit_id: z.string().uuid(),
  room_id: z.string().uuid().optional(),
  status: z.enum(['dirty', 'cleaning', 'inspected', 'ready', 'maintenance']).default('dirty'),
  assigned_to: z.string().uuid().optional(),
  notes: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('property_id')
    const status = searchParams.get('status')

    let query = auth.supabase
      .from('accommodation_readiness_status')
      .select('*, accommodation_units(name, type, property_id)', { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .order('status', { ascending: true })

    if (propertyId) {
      query = query.eq('accommodation_units.property_id', propertyId)
    }
    if (status) query = query.eq('status', status)

    const { data: readinessStatuses, error, count } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch readiness statuses' }, { status: 500 })
    }

    // If filtering by property_id via join, filter out null joins
    const filtered = propertyId
      ? (readinessStatuses || []).filter((r: Record<string, unknown>) => r.accommodation_units !== null)
      : readinessStatuses || []

    return NextResponse.json({ readinessStatuses: filtered, total: propertyId ? filtered.length : (count || 0) })
  } catch (error) {
    console.error('Readiness GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = readinessSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: readinessStatus, error } = await auth.supabase
      .from('accommodation_readiness_status')
      .upsert(
        {
          organization_id: auth.organizationId,
          ...parsed.data,
          last_status_change: new Date().toISOString(),
        },
        { onConflict: 'unit_id' }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create readiness status' }, { status: 500 })
    }

    return NextResponse.json({ readinessStatus }, { status: 201 })
  } catch (error) {
    console.error('Readiness POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
