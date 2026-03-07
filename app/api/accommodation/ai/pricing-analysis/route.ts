import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { pricingAnalysisSchema } from '@/lib/accommodation/schemas'
import { PricerAgent } from '@/lib/accommodation/agents/pricer-agent'

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = pricingAnalysisSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    // Check if pricer agent is enabled for this org
    const { data: config } = await auth.supabase
      .from('accommodation_ai_configs')
      .select('is_enabled, config, system_prompt_override, model_override')
      .eq('organization_id', auth.organizationId)
      .eq('agent_type', 'pricer')
      .single()

    if (config && !config.is_enabled) {
      return NextResponse.json(
        { error: 'Pricer agent is disabled for this organization' },
        { status: 403 }
      )
    }

    const agent = new PricerAgent()
    const result = await agent.analyzePricing({
      organizationId: auth.organizationId,
      periodStart: parsed.data.period_start,
      periodEnd: parsed.data.period_end,
      propertyId: parsed.data.property_id,
      sessionId: parsed.data.session_id,
    })

    return NextResponse.json({
      session_id: result.sessionId,
      pricing: result.result,
      tokens_used: result.tokensUsed,
      status: result.status,
    })
  } catch (error) {
    console.error('Pricing analysis error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
