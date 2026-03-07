import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { conciergeMessageSchema } from '@/lib/accommodation/schemas'
import { ConciergeAgent } from '@/lib/accommodation/agents/concierge-agent'

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = conciergeMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    // Check if concierge agent is enabled for this org
    const { data: config } = await auth.supabase
      .from('accommodation_ai_configs')
      .select('is_enabled, config, system_prompt_override, model_override')
      .eq('organization_id', auth.organizationId)
      .eq('agent_type', 'concierge')
      .single()

    if (config && !config.is_enabled) {
      return NextResponse.json(
        { error: 'Concierge agent is disabled for this organization' },
        { status: 403 }
      )
    }

    const agent = new ConciergeAgent()
    const result = await agent.handleMessage({
      organizationId: auth.organizationId,
      message: parsed.data.message,
      guestPhone: parsed.data.guest_phone,
      guestId: parsed.data.guest_id,
      bookingId: parsed.data.booking_id,
      sessionId: parsed.data.session_id,
    })

    return NextResponse.json({
      session_id: result.sessionId,
      concierge: result.result,
      tokens_used: result.tokensUsed,
      status: result.status,
    })
  } catch (error) {
    console.error('Concierge error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
