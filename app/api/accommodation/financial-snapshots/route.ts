import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limit = parseInt(searchParams.get('limit') || '30', 10)

    let query = auth.supabase
      .from('accommodation_financial_snapshots')
      .select('*')
      .eq('organization_id', auth.organizationId)
      .order('snapshot_date', { ascending: false })
      .limit(Math.min(limit, 365))

    if (startDate) query = query.gte('snapshot_date', startDate)
    if (endDate) query = query.lte('snapshot_date', endDate)

    const { data: snapshots, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch financial snapshots' }, { status: 500 })
    }

    return NextResponse.json({ snapshots })
  } catch (error) {
    console.error('Financial snapshots GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
