import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { createAIConfigSchema } from '@/lib/accommodation/schemas'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const agentType = searchParams.get('agent_type')

    let query = auth.supabase
      .from('accommodation_ai_configs')
      .select('*')
      .eq('organization_id', auth.organizationId)
      .order('created_at', { ascending: true })

    if (agentType) query = query.eq('agent_type', agentType)

    const { data: configs, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch AI configs' }, { status: 500 })
    }

    return NextResponse.json({ configs })
  } catch (error) {
    console.error('AI configs GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createAIConfigSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: config, error } = await auth.supabase
      .from('accommodation_ai_configs')
      .insert({ ...parsed.data, organization_id: auth.organizationId })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `AI config for agent type "${parsed.data.agent_type}" already exists` },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Failed to create AI config' }, { status: 500 })
    }

    return NextResponse.json({ config }, { status: 201 })
  } catch (error) {
    console.error('AI configs POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
