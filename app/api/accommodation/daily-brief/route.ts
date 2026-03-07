import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { dailyBriefQuerySchema } from '@/lib/accommodation/schemas'
import { sendDailyBrief, getAllChannels } from '@/lib/accommodation/telegram/ops-bot'
import { createAdminClient } from '@/lib/supabase/admin'
import type { DailyBriefData } from '@/lib/accommodation/types'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const parsed = dailyBriefQuerySchema.safeParse({
      date: searchParams.get('date') || undefined,
    })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const targetDate = parsed.data.date || new Date().toISOString().split('T')[0]
    const brief = await generateBriefData(auth.supabase, auth.organizationId, targetDate)

    // Optionally send to Telegram channels
    const sendToTelegram = searchParams.get('send') === 'true'
    if (sendToTelegram) {
      const adminClient = createAdminClient()
      const channels = await getAllChannels(adminClient, auth.organizationId)
      if (channels.length > 0) {
        await sendDailyBrief(adminClient, auth.organizationId, brief)
      }
    }

    return NextResponse.json({ brief })
  } catch (error) {
    console.error('Daily brief GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function generateBriefData(
  supabase: ReturnType<typeof createAdminClient>,
  organizationId: string,
  date: string
): Promise<DailyBriefData> {
  // Fetch arrivals (check-in today)
  const { data: arrivalsRaw } = await supabase
    .from('accommodation_bookings')
    .select(`
      id, check_in_date, check_out_date, number_of_guests, special_requests,
      guest:accommodation_guests(first_name, last_name, is_vip),
      unit:accommodation_units(name)
    `)
    .eq('organization_id', organizationId)
    .eq('check_in_date', date)
    .in('status', ['confirmed', 'pending_deposit'])

  // Fetch departures (check-out today)
  const { data: departuresRaw } = await supabase
    .from('accommodation_bookings')
    .select(`
      id, check_out_date,
      guest:accommodation_guests(first_name, last_name),
      unit:accommodation_units(name)
    `)
    .eq('organization_id', organizationId)
    .eq('check_out_date', date)
    .in('status', ['confirmed', 'checked_in'])

  // Total active units
  const { count: totalUnits } = await supabase
    .from('accommodation_units')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'active')

  // Currently occupied (check_in <= today AND check_out > today)
  const { count: occupiedCount } = await supabase
    .from('accommodation_bookings')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .lte('check_in_date', date)
    .gt('check_out_date', date)
    .in('status', ['confirmed', 'checked_in'])

  // Pending housekeeping tasks
  const { count: housekeepingPending } = await supabase
    .from('accommodation_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .in('status', ['pending', 'assigned'])
    .in('task_type', ['housekeeping', 'turnover', 'inspection'])

  // Pending maintenance issues
  const { count: maintenancePending } = await supabase
    .from('accommodation_maintenance_issues')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .in('status', ['reported', 'in_progress'])

  // Overdue payments
  const { count: overduePayments } = await supabase
    .from('accommodation_payment_links')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())

  const arrivals = (arrivalsRaw || []).map((b: Record<string, unknown>) => {
    const guest = b.guest as Record<string, unknown> | null
    const unit = b.unit as Record<string, unknown> | null
    return {
      guest_name: guest ? `${guest.first_name} ${guest.last_name}` : 'Unknown',
      unit_name: (unit?.name as string) || 'Unassigned',
      check_in_date: b.check_in_date as string,
      guests_count: (b.number_of_guests as number) || 1,
      special_requests: b.special_requests as string | undefined,
      is_vip: (guest?.is_vip as boolean) || false,
    }
  })

  const departures = (departuresRaw || []).map((b: Record<string, unknown>) => {
    const guest = b.guest as Record<string, unknown> | null
    const unit = b.unit as Record<string, unknown> | null
    return {
      guest_name: guest ? `${guest.first_name} ${guest.last_name}` : 'Unknown',
      unit_name: (unit?.name as string) || 'Unknown',
      check_out_date: b.check_out_date as string,
    }
  })

  // Turnovers = units with both checkout AND checkin today
  const departureUnits = departures.map((d) => d.unit_name)
  const turnovers = arrivals
    .filter((a) => departureUnits.includes(a.unit_name))
    .map((a) => ({
      unit_name: a.unit_name,
    }))

  const total = totalUnits || 0
  const occupied = occupiedCount || 0

  return {
    date,
    arrivals,
    departures,
    turnovers_needed: turnovers,
    occupancy: {
      total_units: total,
      occupied,
      arriving: arrivals.length,
      departing: departures.length,
      rate_percent: total > 0 ? Math.round((occupied / total) * 100) : 0,
    },
    pending_tasks: {
      housekeeping: housekeepingPending || 0,
      maintenance: maintenancePending || 0,
    },
    overdue_payments: overduePayments || 0,
  }
}
