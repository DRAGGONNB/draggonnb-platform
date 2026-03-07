import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

/**
 * GET /api/accommodation/stock-valuation
 * Total stock value and breakdown by category
 */
export async function GET() {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { data: items, error } = await auth.supabase
      .from('accommodation_stock_items')
      .select('id, name, category, current_stock, unit_cost, unit_of_measure')
      .eq('organization_id', auth.organizationId)
      .eq('is_active', true)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch stock valuation' }, { status: 500 })
    }

    let totalValue = 0
    const byCategory: Record<string, { count: number; value: number }> = {}
    const valuedItems = []

    for (const item of items || []) {
      const itemValue = (item.current_stock || 0) * (item.unit_cost || 0)
      totalValue += itemValue

      if (!byCategory[item.category]) {
        byCategory[item.category] = { count: 0, value: 0 }
      }
      byCategory[item.category].count++
      byCategory[item.category].value += itemValue

      valuedItems.push({
        id: item.id,
        name: item.name,
        category: item.category,
        current_stock: item.current_stock,
        unit_cost: item.unit_cost,
        unit_of_measure: item.unit_of_measure,
        total_value: Math.round(itemValue * 100) / 100,
      })
    }

    return NextResponse.json({
      total_value: Math.round(totalValue * 100) / 100,
      total_items: (items || []).length,
      by_category: Object.entries(byCategory).map(([category, data]) => ({
        category,
        ...data,
        value: Math.round(data.value * 100) / 100,
      })),
      items: valuedItems.sort((a, b) => b.total_value - a.total_value),
    })
  } catch (error) {
    console.error('Stock valuation GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
