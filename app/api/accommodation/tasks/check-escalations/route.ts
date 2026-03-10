import { NextResponse, type NextRequest } from 'next/server'
import { getDualAuth, isDualAuthError } from '@/lib/accommodation/api-helpers'
import { sendEscalationAlert } from '@/lib/accommodation/telegram/ops-bot'

// Default escalation thresholds in minutes per priority
const ESCALATION_THRESHOLDS: Record<string, number> = {
  urgent: 15,
  high: 30,
  medium: 60,
  low: 120,
}

/**
 * POST /api/accommodation/tasks/check-escalations
 * Checks for unaccepted tasks past their SLA time and sends escalation alerts.
 * Supports dual auth: user session (UI trigger) or service key (N8N cron).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getDualAuth(request)
    if (isDualAuthError(auth)) return auth

    // Get all task assignments that are still in "assigned" status
    const { data: assignments, error } = await auth.supabase
      .from('accommodation_task_assignments')
      .select(`
        id, task_id, assigned_at, department,
        accommodation_tasks(title, priority, task_type,
          accommodation_units(name)
        )
      `)
      .eq('organization_id', auth.organizationId)
      .eq('status', 'assigned')

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch task assignments' }, { status: 500 })
    }

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ escalated: 0, message: 'No pending assignments' })
    }

    let escalated = 0
    const now = Date.now()

    for (const assignment of assignments) {
      const task = assignment.accommodation_tasks as unknown as {
        title: string
        priority: string
        task_type: string
        accommodation_units: { name: string } | { name: string }[] | null
      } | null

      if (!task) continue

      const priority = task.priority || 'medium'
      const threshold = ESCALATION_THRESHOLDS[priority] || 60
      const assignedAt = new Date(assignment.assigned_at).getTime()
      const minutesSince = (now - assignedAt) / (1000 * 60)

      if (minutesSince < threshold) continue

      // Resolve unit name from joined data
      const unitData = task.accommodation_units
      let unitName = 'Unknown'
      if (Array.isArray(unitData) && unitData.length > 0) {
        unitName = unitData[0].name
      } else if (unitData && !Array.isArray(unitData)) {
        unitName = unitData.name
      }

      await sendEscalationAlert(auth.supabase, auth.organizationId, {
        task_id: assignment.task_id,
        title: task.title,
        unit_name: unitName,
        assigned_at: assignment.assigned_at,
        priority,
        department: assignment.department || 'general',
      })

      // Mark the assignment as escalated to prevent repeated alerts
      await auth.supabase
        .from('accommodation_task_assignments')
        .update({ status: 'escalated' })
        .eq('id', assignment.id)

      escalated++
    }

    return NextResponse.json({ escalated })
  } catch (error) {
    console.error('[API] tasks/check-escalations error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
