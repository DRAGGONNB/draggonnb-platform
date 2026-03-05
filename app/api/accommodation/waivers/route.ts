import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { z } from 'zod'

const waiverSchema = z.object({
  property_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  is_required: z.boolean().default(true),
  status: z.enum(['active', 'inactive']).default('active'),
})

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('property_id')
    const status = searchParams.get('status')

    let query = auth.supabase
      .from('accommodation_waivers')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .order('created_at', { ascending: false })

    if (propertyId) query = query.eq('property_id', propertyId)
    if (status) query = query.eq('status', status)

    const { data: waivers, error, count } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch waivers' }, { status: 500 })
    }

    return NextResponse.json({ waivers: waivers || [], total: count || 0 })
  } catch (error) {
    console.error('Waivers GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = waiverSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data: waiver, error } = await auth.supabase
      .from('accommodation_waivers')
      .insert({ ...parsed.data, organization_id: auth.organizationId })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create waiver' }, { status: 500 })
    }

    return NextResponse.json({ waiver }, { status: 201 })
  } catch (error) {
    console.error('Waivers POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
