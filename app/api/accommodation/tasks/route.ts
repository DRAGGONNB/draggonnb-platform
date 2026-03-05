import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

const taskSchema = z.object({
  property_id: z.string().uuid(),
  unit_id: z.string().uuid().optional(),
  room_id: z.string().uuid().optional(),
  booking_id: z.string().uuid().optional(),
  issue_id: z.string().uuid().optional(),
  task_type: z.enum(['turnover', 'maintenance', 'guest_request', 'inspection', 'general']).default('general'),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
  due_date: z.string().optional(),
  due_time: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('property_id')
    const unitId = searchParams.get('unit_id')
    const status = searchParams.get('status')
    const taskType = searchParams.get('task_type')
    const priority = searchParams.get('priority')
    const assignedTo = searchParams.get('assigned_to')

    let query = auth.supabase
      .from('accommodation_tasks')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true })

    if (propertyId) query = query.eq('property_id', propertyId)
    if (unitId) query = query.eq('unit_id', unitId)
    if (status) query = query.eq('status', status)
    if (taskType) query = query.eq('task_type', taskType)
    if (priority) query = query.eq('priority', priority)
    if (assignedTo) query = query.eq('assigned_to', assignedTo)

    const { data: tasks, error, count } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    return NextResponse.json({ tasks: tasks || [], total: count || 0 })
  } catch (error) {
    console.error('Tasks GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = taskSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: task, error } = await auth.supabase
      .from('accommodation_tasks')
      .insert({
        organization_id: auth.organizationId,
        ...parsed.data,
        created_by: auth.userId,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error('Tasks POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
