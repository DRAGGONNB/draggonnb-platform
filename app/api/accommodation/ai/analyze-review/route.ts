import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { analyzeReviewSchema } from '@/lib/accommodation/schemas'
import { ReviewerAgent } from '@/lib/accommodation/agents/reviewer-agent'

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = analyzeReviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    // Check if reviewer agent is enabled for this org
    const { data: config } = await auth.supabase
      .from('accommodation_ai_configs')
      .select('is_enabled, config, system_prompt_override, model_override')
      .eq('organization_id', auth.organizationId)
      .eq('agent_type', 'reviewer')
      .single()

    if (config && !config.is_enabled) {
      return NextResponse.json(
        { error: 'Reviewer agent is disabled for this organization' },
        { status: 403 }
      )
    }

    const agent = new ReviewerAgent()
    const result = await agent.analyzeReview({
      organizationId: auth.organizationId,
      reviewText: parsed.data.review_text,
      reviewerName: parsed.data.reviewer_name,
      rating: parsed.data.rating,
      platform: parsed.data.platform,
      bookingId: parsed.data.booking_id,
      sessionId: parsed.data.session_id,
    })

    return NextResponse.json({
      session_id: result.sessionId,
      analysis: result.result,
      tokens_used: result.tokensUsed,
      status: result.status,
    })
  } catch (error) {
    console.error('Analyze review error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
