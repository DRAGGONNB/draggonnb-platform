import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { createTaskAssignmentSchema } from '@/lib/accommodation/schemas'
import { sendHousekeepingTask, sendMaintenanceRequest, getChannelConfig } from '@/lib/accommodation/telegram/ops-bot'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const taskType = searchParams.get('task_type')
    const staffId = searchParams.get('staff_id')
    const taskId = searchParams.get('task_id')

    let query = auth.supabase
      .from('accommodation_task_assignments')
      .select('*, staff:accommodation_staff(id, first_name, last_name, department)')
      .eq('organization_id', auth.organizationId)
      .order('assigned_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (taskType) query = query.eq('task_type', taskType)
    if (staffId) query = query.eq('staff_id', staffId)
    if (taskId) query = query.eq('task_id', taskId)

    const { data: assignments, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch task assignments' }, { status: 500 })
    }

    return NextResponse.json({ assignments })
  } catch (error) {
    console.error('Task assignments GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createTaskAssignmentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    // Create assignment
    const { data: assignment, error } = await auth.supabase
      .from('accommodation_task_assignments')
      .insert({
        ...parsed.data,
        organization_id: auth.organizationId,
        assigned_by: auth.userId,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create task assignment' }, { status: 500 })
    }

    // Send Telegram notification to appropriate department channel
    const adminClient = createAdminClient()
    try {
      if (parsed.data.task_type === 'housekeeping' || parsed.data.task_type === 'turnover') {
        // Fetch the task details for the notification
        const { data: task } = await adminClient
          .from('accommodation_tasks')
          .select('*, unit:accommodation_units(name), room:accommodation_rooms(name)')
          .eq('id', parsed.data.task_id)
          .single()

        if (task) {
          const channel = await getChannelConfig(adminClient, auth.organizationId, 'housekeeping')
          if (channel) {
            await sendHousekeepingTask(adminClient, auth.organizationId, {
              task_id: task.id,
              unit_name: task.unit?.name || 'Unknown',
              property_name: '',
              task_type: task.task_type || 'housekeeping',
              title: task.title,
              description: task.description || null,
              priority: task.priority || 'medium',
              due_date: null,
              due_time: task.due_time || null,
              booking_ref: null,
              guest_name: null,
              check_in_date: null,
            }, channel)
          }
        }
      } else if (parsed.data.task_type === 'maintenance') {
        const { data: issue } = await adminClient
          .from('accommodation_maintenance_issues')
          .select('*, unit:accommodation_units(name), room:accommodation_rooms(name)')
          .eq('id', parsed.data.task_id)
          .single()

        if (issue) {
          const channel = await getChannelConfig(adminClient, auth.organizationId, 'maintenance')
          if (channel) {
            await sendMaintenanceRequest(adminClient, auth.organizationId, {
              issue_id: issue.id,
              unit_name: issue.unit?.name || null,
              property_name: '',
              title: issue.title,
              description: issue.description || null,
              priority: issue.priority || 'medium',
              category: issue.category || 'general',
              reported_by: issue.reported_by_name || null,
              photos: [],
            }, channel)
          }
        }
      }
    } catch (telegramError) {
      // Don't fail the assignment if Telegram notification fails
      console.error('Failed to send Telegram notification for task assignment:', telegramError)
    }

    return NextResponse.json({ assignment }, { status: 201 })
  } catch (error) {
    console.error('Task assignments POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
