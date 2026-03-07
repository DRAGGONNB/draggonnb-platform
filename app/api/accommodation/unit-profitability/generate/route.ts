import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { generateProfitabilitySchema } from '@/lib/accommodation/schemas'

/**
 * POST /api/accommodation/unit-profitability/generate
 * Calculate and store profitability snapshots for units
 */
export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = generateProfitabilitySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { period_start, period_end, unit_id } = parsed.data

    // Fetch units (optionally filtered)
    let unitsQuery = auth.supabase
      .from('accommodation_units')
      .select('id, name')
      .eq('organization_id', auth.organizationId)

    if (unit_id) unitsQuery = unitsQuery.eq('id', unit_id)

    const { data: units, error: unitsError } = await unitsQuery

    if (unitsError || !units || units.length === 0) {
      return NextResponse.json({ error: 'No units found' }, { status: 404 })
    }

    const totalDays = Math.ceil(
      (new Date(period_end).getTime() - new Date(period_start).getTime()) / (1000 * 60 * 60 * 24)
    )

    const results = []

    for (const unit of units) {
      // Get revenue from bookings in this period
      const { data: bookings } = await auth.supabase
        .from('accommodation_bookings')
        .select('total_amount, check_in_date, check_out_date')
        .eq('organization_id', auth.organizationId)
        .eq('unit_id', unit.id)
        .in('status', ['confirmed', 'checked_in', 'checked_out'])
        .gte('check_in_date', period_start)
        .lte('check_in_date', period_end)

      const totalRevenue = (bookings || []).reduce((sum, b) => sum + (b.total_amount || 0), 0)
      const occupancyDays = (bookings || []).reduce((sum, b) => {
        const ci = new Date(b.check_in_date)
        const co = new Date(b.check_out_date)
        return sum + Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24))
      }, 0)

      // Get costs for this unit in this period
      const { data: costs } = await auth.supabase
        .from('accommodation_unit_costs')
        .select('amount, quantity, category:accommodation_cost_categories(name)')
        .eq('organization_id', auth.organizationId)
        .eq('unit_id', unit.id)
        .gte('cost_date', period_start)
        .lte('cost_date', period_end)

      const totalCosts = (costs || []).reduce((sum, c) => sum + c.amount * (c.quantity || 1), 0)

      // Build cost breakdown by category
      const costBreakdown: Record<string, number> = {}
      for (const cost of costs || []) {
        const catName = (cost.category as unknown as { name: string } | null)?.name || 'Other'
        costBreakdown[catName] = (costBreakdown[catName] || 0) + cost.amount * (cost.quantity || 1)
      }

      const grossMargin = totalRevenue - totalCosts
      const marginPercentage = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0
      const occupancyRate = totalDays > 0 ? (occupancyDays / totalDays) * 100 : 0
      const revPAD = totalDays > 0 ? totalRevenue / totalDays : 0

      // Upsert profitability record
      const { data: record, error: upsertError } = await auth.supabase
        .from('accommodation_unit_profitability')
        .upsert(
          {
            organization_id: auth.organizationId,
            unit_id: unit.id,
            period_start,
            period_end,
            total_revenue: Math.round(totalRevenue * 100) / 100,
            total_costs: Math.round(totalCosts * 100) / 100,
            gross_margin: Math.round(grossMargin * 100) / 100,
            margin_percentage: Math.round(marginPercentage * 100) / 100,
            occupancy_days: occupancyDays,
            total_days: totalDays,
            occupancy_rate: Math.round(occupancyRate * 100) / 100,
            revenue_per_available_day: Math.round(revPAD * 100) / 100,
            cost_breakdown: costBreakdown,
          },
          { onConflict: 'organization_id,unit_id,period_start,period_end' }
        )
        .select()
        .single()

      if (upsertError) {
        console.error(`Profitability upsert error for unit ${unit.id}:`, upsertError)
      } else {
        results.push({ ...record, unit_name: unit.name })
      }
    }

    return NextResponse.json({
      profitability: results,
      units_processed: results.length,
      period: { start: period_start, end: period_end },
    })
  } catch (error) {
    console.error('Profitability generate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
