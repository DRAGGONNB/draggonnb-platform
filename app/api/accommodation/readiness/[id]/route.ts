import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

const updateReadinessSchema = z.object({
  status: z.enum(['dirty', 'cleaning', 'inspected', 'ready', 'maintenance']).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { id } = await params

    const { data: readinessStatus, error } = await auth.supabase
      .from('accommodation_readiness_status')
      .select('*, accommodation_units(name, type, property_id)')
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (error || !readinessStatus) {
      return NextResponse.json({ error: 'Readiness status not found' }, { status: 404 })
    }

    return NextResponse.json({ readinessStatus })
  } catch (error) {
    console.error('Readiness GET error:', error)
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
    const parsed = updateReadinessSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    }

    // Set last_status_change timestamp on any status change
    if (parsed.data.status) {
      updateData.last_status_change = new Date().toISOString()
    }

    const { data: readinessStatus, error } = await auth.supabase
      .from('accommodation_readiness_status')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single()

    if (error || !readinessStatus) {
      return NextResponse.json({ error: 'Failed to update readiness status' }, { status: 500 })
    }

    return NextResponse.json({ readinessStatus })
  } catch (error) {
    console.error('Readiness PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { id } = await params

    const { error } = await auth.supabase
      .from('accommodation_readiness_status')
      .delete()
      .eq('id', id)
      .eq('organization_id', auth.organizationId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete readiness status' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Readiness DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
