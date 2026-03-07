import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

/**
 * GET /api/accommodation/cost-summary
 * Dashboard data: costs grouped by category for a date range
 */
export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const unitId = searchParams.get('unit_id')

    // Default to current month
    const now = new Date()
    const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const defaultEnd = now.toISOString().split('T')[0]

    let query = auth.supabase
      .from('accommodation_unit_costs')
      .select('amount, quantity, cost_date, category:accommodation_cost_categories(id, name, category_type), unit:accommodation_units(id, name)')
      .eq('organization_id', auth.organizationId)
      .gte('cost_date', startDate || defaultStart)
      .lte('cost_date', endDate || defaultEnd)

    if (unitId) query = query.eq('unit_id', unitId)

    const { data: costs, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch cost summary' }, { status: 500 })
    }

    // Aggregate by category
    const byCategory: Record<string, { name: string; total: number; count: number }> = {}
    let totalCosts = 0

    for (const cost of costs || []) {
      const catName = (cost.category as unknown as { name: string } | null)?.name || 'Uncategorized'
      const catId = (cost.category as unknown as { id: string } | null)?.id || 'unknown'
      const lineTotal = cost.amount * (cost.quantity || 1)

      if (!byCategory[catId]) {
        byCategory[catId] = { name: catName, total: 0, count: 0 }
      }
      byCategory[catId].total += lineTotal
      byCategory[catId].count++
      totalCosts += lineTotal
    }

    // Aggregate by unit
    const byUnit: Record<string, { name: string; total: number }> = {}
    for (const cost of costs || []) {
      const unitName = (cost.unit as unknown as { name: string } | null)?.name || 'Unknown'
      const uId = (cost.unit as unknown as { id: string } | null)?.id || 'unknown'
      const lineTotal = cost.amount * (cost.quantity || 1)

      if (!byUnit[uId]) {
        byUnit[uId] = { name: unitName, total: 0 }
      }
      byUnit[uId].total += lineTotal
    }

    return NextResponse.json({
      period: {
        start: startDate || defaultStart,
        end: endDate || defaultEnd,
      },
      total_costs: Math.round(totalCosts * 100) / 100,
      by_category: Object.entries(byCategory).map(([id, data]) => ({
        category_id: id,
        ...data,
        total: Math.round(data.total * 100) / 100,
      })),
      by_unit: Object.entries(byUnit).map(([id, data]) => ({
        unit_id: id,
        ...data,
        total: Math.round(data.total * 100) / 100,
      })),
      entries_count: (costs || []).length,
    })
  } catch (error) {
    console.error('Cost summary GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
