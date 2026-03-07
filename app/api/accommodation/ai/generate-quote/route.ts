import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { generateQuoteSchema } from '@/lib/accommodation/schemas'
import { QuoterAgent } from '@/lib/accommodation/agents/quoter-agent'

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = generateQuoteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    // Check if quoter agent is enabled for this org
    const { data: config } = await auth.supabase
      .from('accommodation_ai_configs')
      .select('is_enabled, config, system_prompt_override, model_override')
      .eq('organization_id', auth.organizationId)
      .eq('agent_type', 'quoter')
      .single()

    if (config && !config.is_enabled) {
      return NextResponse.json(
        { error: 'Quoter agent is disabled for this organization' },
        { status: 403 }
      )
    }

    const agent = new QuoterAgent()
    const result = await agent.generateQuote({
      organizationId: auth.organizationId,
      inquiryText: parsed.data.inquiry_text,
      guestName: parsed.data.guest_name,
      guestEmail: parsed.data.guest_email,
      guestPhone: parsed.data.guest_phone,
      checkInDate: parsed.data.check_in_date,
      checkOutDate: parsed.data.check_out_date,
      guests: parsed.data.guests,
      propertyId: parsed.data.property_id,
      sessionId: parsed.data.session_id,
    })

    return NextResponse.json({
      session_id: result.sessionId,
      quote: result.result,
      tokens_used: result.tokensUsed,
      status: result.status,
    })
  } catch (error) {
    console.error('Generate quote error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
