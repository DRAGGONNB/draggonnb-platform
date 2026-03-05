import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

const updateIssueSchema = z.object({
  unit_id: z.string().uuid().optional(),
  room_id: z.string().uuid().optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed', 'deferred']).optional(),
  category: z.enum(['plumbing', 'electrical', 'structural', 'appliance', 'furniture', 'cleanliness', 'pest', 'safety', 'general']).optional(),
  photos: z.array(z.string()).optional(),
  resolution_notes: z.string().nullable().optional(),
  sla_target_hours: z.number().int().min(0).nullable().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { id } = await params

    const { data: issue, error } = await auth.supabase
      .from('accommodation_issues')
      .select('*')
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (error || !issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    return NextResponse.json({ issue })
  } catch (error) {
    console.error('Issue GET error:', error)
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
    const parsed = updateIssueSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    }

    // Set resolved timestamp when status changes to resolved
    if (parsed.data.status === 'resolved') {
      updateData.resolved_at = new Date().toISOString()
    }

    const { data: issue, error } = await auth.supabase
      .from('accommodation_issues')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single()

    if (error || !issue) {
      return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 })
    }

    return NextResponse.json({ issue })
  } catch (error) {
    console.error('Issue PATCH error:', error)
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
      .from('accommodation_issues')
      .delete()
      .eq('id', id)
      .eq('organization_id', auth.organizationId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete issue' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Issue DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
