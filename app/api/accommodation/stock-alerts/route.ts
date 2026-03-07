import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

/**
 * GET /api/accommodation/stock-alerts
 * Returns stock items that are at or below their minimum stock level
 */
export async function GET() {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { data, error } = await auth.supabase
      .from('accommodation_stock_items')
      .select('*')
      .eq('organization_id', auth.organizationId)
      .eq('is_active', true)
      .gt('min_stock_level', 0)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch stock alerts' }, { status: 500 })
    }

    // Filter items where current_stock <= min_stock_level
    const alerts = (data || []).filter(
      (item) => item.current_stock <= item.min_stock_level
    )

    return NextResponse.json({
      alerts,
      total_alerts: alerts.length,
      critical: alerts.filter((a) => a.current_stock === 0).length,
      low: alerts.filter((a) => a.current_stock > 0 && a.current_stock <= a.min_stock_level).length,
    })
  } catch (error) {
    console.error('Stock alerts GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
