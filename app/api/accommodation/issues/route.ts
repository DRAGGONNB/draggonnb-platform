import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

const issueSchema = z.object({
  property_id: z.string().uuid(),
  unit_id: z.string().uuid().optional(),
  room_id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed', 'deferred']).default('open'),
  category: z.enum(['plumbing', 'electrical', 'structural', 'appliance', 'furniture', 'cleanliness', 'pest', 'safety', 'general']).default('general'),
  photos: z.array(z.string()).default([]),
  sla_target_hours: z.number().int().min(0).optional(),
})

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('property_id')
    const unitId = searchParams.get('unit_id')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const category = searchParams.get('category')

    let query = auth.supabase
      .from('accommodation_issues')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (propertyId) query = query.eq('property_id', propertyId)
    if (unitId) query = query.eq('unit_id', unitId)
    if (status) query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)
    if (category) query = query.eq('category', category)

    const { data: issues, error, count } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 })
    }

    return NextResponse.json({ issues: issues || [], total: count || 0 })
  } catch (error) {
    console.error('Issues GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = issueSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: issue, error } = await auth.supabase
      .from('accommodation_issues')
      .insert({
        organization_id: auth.organizationId,
        ...parsed.data,
        reported_by: auth.userId,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 })
    }

    return NextResponse.json({ issue }, { status: 201 })
  } catch (error) {
    console.error('Issues POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
