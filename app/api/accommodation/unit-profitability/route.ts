import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

/**
 * GET /api/accommodation/unit-profitability
 * Returns profitability reports for units
 */
export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const unitId = searchParams.get('unit_id')
    const periodStart = searchParams.get('period_start')
    const periodEnd = searchParams.get('period_end')

    let query = auth.supabase
      .from('accommodation_unit_profitability')
      .select('*, unit:accommodation_units(name)')
      .eq('organization_id', auth.organizationId)
      .order('period_start', { ascending: false })

    if (unitId) query = query.eq('unit_id', unitId)
    if (periodStart) query = query.gte('period_start', periodStart)
    if (periodEnd) query = query.lte('period_end', periodEnd)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch profitability data' }, { status: 500 })
    }

    return NextResponse.json({ profitability: data })
  } catch (error) {
    console.error('Unit profitability GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
