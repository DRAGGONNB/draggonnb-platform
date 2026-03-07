import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { generateFinancialSnapshotSchema } from '@/lib/accommodation/schemas'

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = generateFinancialSnapshotSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const snapshotDate = parsed.data.date || new Date().toISOString().split('T')[0]

    // Fetch bookings data for the snapshot date range (current month or specific date)
    const { data: bookings, error: bookingsError } = await auth.supabase
      .from('accommodation_bookings')
      .select('id, status, total_price, deposit_amount, check_in_date, check_out_date')
      .eq('organization_id', auth.organizationId)
      .not('status', 'in', '("cancelled","no_show")')

    if (bookingsError) {
      return NextResponse.json({ error: 'Failed to fetch bookings data' }, { status: 500 })
    }

    // Fetch payments received
    const { data: payments, error: paymentsError } = await auth.supabase
      .from('accommodation_payments')
      .select('amount, payment_type, status')
      .eq('organization_id', auth.organizationId)
      .eq('status', 'completed')

    if (paymentsError) {
      return NextResponse.json({ error: 'Failed to fetch payments data' }, { status: 500 })
    }

    // Fetch total units for occupancy calculation
    const { count: totalUnits, error: unitsError } = await auth.supabase
      .from('accommodation_units')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', auth.organizationId)
      .eq('status', 'active')

    if (unitsError) {
      return NextResponse.json({ error: 'Failed to fetch units data' }, { status: 500 })
    }

    // Calculate financial metrics
    const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
    const totalDepositsReceived = payments
      ?.filter((p) => p.payment_type === 'deposit')
      .reduce((sum, p) => sum + Number(p.amount), 0) || 0

    const activeBookings = bookings?.filter((b) =>
      ['confirmed', 'checked_in'].includes(b.status)
    ) || []

    const totalBookingValue = activeBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0)
    const totalOutstanding = totalBookingValue - totalRevenue

    // Simple occupancy: bookings with check_in <= today <= check_out
    const today = snapshotDate
    const occupiedUnits = bookings?.filter((b) =>
      b.check_in_date && b.check_out_date &&
      b.check_in_date <= today && b.check_out_date >= today &&
      ['confirmed', 'checked_in'].includes(b.status)
    ).length || 0

    const occupancyRate = totalUnits ? (occupiedUnits / totalUnits) * 100 : 0
    const avgDailyRate = activeBookings.length > 0
      ? totalBookingValue / activeBookings.length
      : 0

    // Upsert snapshot (unique on org + date)
    const { data: snapshot, error: upsertError } = await auth.supabase
      .from('accommodation_financial_snapshots')
      .upsert(
        {
          organization_id: auth.organizationId,
          snapshot_date: snapshotDate,
          total_revenue: totalRevenue,
          total_outstanding: Math.max(totalOutstanding, 0),
          total_deposits_received: totalDepositsReceived,
          bookings_count: activeBookings.length,
          occupancy_rate: Math.round(occupancyRate * 100) / 100,
          avg_daily_rate: Math.round(avgDailyRate * 100) / 100,
          metadata: {
            total_units: totalUnits || 0,
            occupied_units: occupiedUnits,
            total_payments_count: payments?.length || 0,
            generated_at: new Date().toISOString(),
          },
        },
        { onConflict: 'organization_id,snapshot_date' }
      )
      .select()
      .single()

    if (upsertError) {
      return NextResponse.json({ error: 'Failed to generate snapshot' }, { status: 500 })
    }

    return NextResponse.json({ snapshot }, { status: 201 })
  } catch (error) {
    console.error('Financial snapshot generate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
