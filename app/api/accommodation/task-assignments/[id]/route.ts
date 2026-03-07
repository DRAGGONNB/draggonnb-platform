import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { updateTaskAssignmentSchema } from '@/lib/accommodation/schemas'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { id } = await params
    const body = await request.json()
    const parsed = updateTaskAssignmentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    // Build update object with timestamp tracking
    const updateData: Record<string, unknown> = { ...parsed.data }
    const now = new Date().toISOString()

    if (parsed.data.status === 'accepted') {
      updateData.accepted_at = now
    } else if (parsed.data.status === 'in_progress') {
      updateData.started_at = now
    } else if (parsed.data.status === 'completed') {
      updateData.completed_at = now
    }

    const { data: assignment, error } = await auth.supabase
      .from('accommodation_task_assignments')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .select('*, staff:accommodation_staff(id, first_name, last_name, department)')
      .single()

    if (error || !assignment) {
      return NextResponse.json({ error: 'Failed to update task assignment' }, { status: 500 })
    }

    return NextResponse.json({ assignment })
  } catch (error) {
    console.error('Task assignment PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
