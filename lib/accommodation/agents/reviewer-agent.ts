/**
 * Accommodation Reviewer Agent
 * Analyzes guest reviews, extracts sentiment and themes,
 * generates professional response drafts.
 */

import { BaseAgent } from '@/lib/agents/base-agent'
import type { AgentRunResult, ReviewAnalysis } from '@/lib/agents/types'

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const REVIEWER_SYSTEM_PROMPT = `You are a Review Analysis Agent for a South African accommodation business. You analyze guest reviews to extract sentiment, identify key themes, suggest actionable improvements, and draft professional responses.

You will receive:
- The full review text from the guest
- The reviewer's name (if available)
- Their rating (1-5 stars, if available)
- The platform (Google, Booking.com, Airbnb, TripAdvisor, etc.)
- Booking context (if available)

Your tasks:
1. **Sentiment Analysis**: Determine overall sentiment and score
2. **Theme Extraction**: Identify key themes mentioned (cleanliness, location, service, value, food, etc.)
3. **Action Items**: List specific operational improvements based on the feedback
4. **Response Draft**: Write a professional, personalised response to the review
5. **Priority**: Determine how urgently this review needs attention

RESPONSE FORMAT - Respond ONLY with a JSON object (no markdown, no code fences):
{
  "sentiment": "positive|neutral|negative",
  "sentiment_score": 0.85,
  "key_themes": ["cleanliness", "friendly staff", "beautiful location"],
  "action_items": ["Consider upgrading bathroom amenities", "Review check-in process timing"],
  "response_draft": "Dear [Guest Name], thank you so much for your wonderful review! We're thrilled...",
  "priority": "low|medium|high"
}

GUIDELINES:
- sentiment_score ranges from -1 (very negative) to 1 (very positive)
- key_themes should be specific and actionable (not just "good" or "bad")
- action_items should be concrete operational tasks, not vague suggestions
- response_draft should:
  - Address the guest by name if available
  - Thank them for their feedback
  - Acknowledge specific points they raised (both positive and negative)
  - For negative points: acknowledge, apologize sincerely, describe corrective action
  - For positive points: show genuine appreciation, mention the team
  - End with an invitation to return
  - Be appropriate for the review platform (Google, Airbnb, etc.)
  - Keep under 200 words
- Priority assignment:
  - HIGH: Negative reviews (score < -0.3), mentions of safety/health/hygiene issues, rating ≤ 2
  - MEDIUM: Mixed reviews, specific complaints, rating = 3
  - LOW: Positive reviews (score > 0.3), no complaints, rating ≥ 4
- Use warm South African hospitality tone in response drafts
- Consider cultural context in interpretation`

// ============================================================================
// AGENT
// ============================================================================

export class ReviewerAgent extends BaseAgent {
  constructor() {
    super({
      agentType: 'accommodation_reviewer',
      systemPrompt: REVIEWER_SYSTEM_PROMPT,
      temperature: 0.4,
      maxTokens: 2000,
    })
  }

  /**
   * Analyze a guest review
   */
  async analyzeReview(params: {
    organizationId: string
    reviewText: string
    reviewerName?: string
    rating?: number
    platform?: string
    bookingId?: string
    sessionId?: string
  }): Promise<AgentRunResult> {
    const input = `Please analyze this guest review:

Review Text: "${params.reviewText}"
${params.reviewerName ? `Reviewer: ${params.reviewerName}` : 'Reviewer: Anonymous'}
${params.rating ? `Rating: ${params.rating}/5 stars` : 'Rating: Not provided'}
${params.platform ? `Platform: ${params.platform}` : 'Platform: Not specified'}
${params.bookingId ? `Booking Reference: ${params.bookingId}` : ''}`

    return this.run({
      organizationId: params.organizationId,
      sessionId: params.sessionId,
      input,
    })
  }

  protected parseResponse(response: string): ReviewAnalysis {
    let cleaned = response.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const parsed = JSON.parse(cleaned)

    if (!parsed.sentiment || !parsed.response_draft) {
      throw new Error('Missing required fields in review analysis response')
    }

    const validSentiments = ['positive', 'neutral', 'negative']
    const sentiment = validSentiments.includes(parsed.sentiment)
      ? parsed.sentiment as 'positive' | 'neutral' | 'negative'
      : 'neutral'

    const validPriorities = ['low', 'medium', 'high']
    const priority = validPriorities.includes(parsed.priority)
      ? parsed.priority as 'low' | 'medium' | 'high'
      : 'medium'

    return {
      sentiment,
      sentiment_score: Math.min(1, Math.max(-1, Number(parsed.sentiment_score) || 0)),
      key_themes: Array.isArray(parsed.key_themes) ? parsed.key_themes : [],
      action_items: Array.isArray(parsed.action_items) ? parsed.action_items : [],
      response_draft: String(parsed.response_draft),
      priority,
    }
  }
}
