import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const agentType = searchParams.get('agent_type')
    const status = searchParams.get('status')
    const limit = Math.min(100, Number(searchParams.get('limit')) || 50)
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0)

    let query = auth.supabase
      .from('agent_sessions')
      .select('id, agent_type, status, tokens_used, result, created_at, updated_at', { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .in('agent_type', [
        'accommodation_quoter',
        'accommodation_concierge',
        'accommodation_reviewer',
        'accommodation_pricer',
      ])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (agentType) {
      const fullType = agentType.startsWith('accommodation_')
        ? agentType
        : `accommodation_${agentType}`
      query = query.eq('agent_type', fullType)
    }

    if (status) query = query.eq('status', status)

    const { data: sessions, error, count } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch agent sessions' }, { status: 500 })
    }

    return NextResponse.json({
      sessions,
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error('AI sessions GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
