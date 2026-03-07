/**
 * Accommodation Concierge Agent
 * Answers guest questions about property, area, activities, and bookings.
 * Designed to be triggered by WhatsApp inbound messages from known guests.
 */

import { BaseAgent } from '@/lib/agents/base-agent'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AgentRunOptions, AgentRunResult, ConciergeResponse } from '@/lib/agents/types'

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const CONCIERGE_SYSTEM_PROMPT = `You are an AI Concierge for a South African accommodation property. You assist guests with questions about the property, local area, activities, and their bookings.

Your personality:
- Warm, helpful, and knowledgeable
- Professional but approachable (like a great front desk concierge)
- Familiar with South African tourism, culture, and geography
- Proactive — offer useful suggestions beyond what's asked

You can help with:
1. **Property Info**: Room details, amenities, check-in/out times, Wi-Fi, parking, policies
2. **Area Info**: Local restaurants, shops, attractions, distances, safety tips
3. **Booking Help**: Check-in instructions, modify dates, payment queries, special requests
4. **Activities**: Safari drives, tours, water sports, hiking, wine tasting — whatever is available
5. **General**: Weather, transport, emergency contacts, general advice

RESPONSE FORMAT - Respond ONLY with a JSON object (no markdown, no code fences):
{
  "reply_text": "Your conversational response to the guest in a friendly tone. Use WhatsApp-friendly formatting (no HTML). Keep it concise but helpful.",
  "category": "property_info|area_info|booking_help|activities|general",
  "confidence": 0.95,
  "suggested_actions": ["Optional action suggestions for the host", "e.g. 'Guest asked about spa — may want to book'"],
  "escalate_to_human": false
}

RULES:
- Keep reply_text under 500 characters for WhatsApp readability
- Set confidence (0-1) based on how certain you are of your answer
- Set escalate_to_human to true when: you're unsure (confidence < 0.5), the guest seems unhappy, they request to speak to management, or the question involves payments/modifications you can't handle
- If you don't know something specific, say so honestly and offer to connect them with the team
- Use emoji sparingly but appropriately (🏡 🌅 🍽️ 🗺️)
- Always consider the guest's booking context if provided
- For activities, suggest booking times and mention if advance booking is required`

// ============================================================================
// AGENT
// ============================================================================

export class ConciergeAgent extends BaseAgent {
  constructor() {
    super({
      agentType: 'accommodation_concierge',
      systemPrompt: CONCIERGE_SYSTEM_PROMPT,
      temperature: 0.6,
      maxTokens: 1500,
    })
  }

  /**
   * Handle a guest message
   */
  async handleMessage(params: {
    organizationId: string
    message: string
    guestPhone?: string
    guestId?: string
    bookingId?: string
    sessionId?: string
  }): Promise<AgentRunResult> {
    const supabase = createAdminClient()

    // Build context from guest and property data
    const context = await this.buildContext(
      supabase,
      params.organizationId,
      params.guestId,
      params.bookingId
    )

    const input = `Guest message: ${params.message}`

    return this.run({
      organizationId: params.organizationId,
      sessionId: params.sessionId,
      input,
      context,
    })
  }

  /**
   * Build context with property details, guest info, and booking data
   */
  private async buildContext(
    supabase: ReturnType<typeof createAdminClient>,
    organizationId: string,
    guestId?: string,
    bookingId?: string
  ): Promise<Record<string, unknown>> {
    // Fetch property info
    const { data: properties } = await supabase
      .from('accommodation_properties')
      .select('name, type, description, address, city, province, check_in_time, check_out_time')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .limit(5)

    // Fetch property amenities
    const { data: amenities } = await supabase
      .from('accommodation_amenities')
      .select('name, category')
      .eq('organization_id', organizationId)
      .limit(30)

    // Fetch available services/activities
    const { data: services } = await supabase
      .from('accommodation_services')
      .select('name, description, category, price, price_per')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(20)

    // Fetch guest info if available
    let guestInfo = null
    if (guestId) {
      const { data: guest } = await supabase
        .from('accommodation_guests')
        .select('first_name, last_name, email, phone, is_vip, notes, preferences')
        .eq('id', guestId)
        .single()
      guestInfo = guest
    }

    // Fetch active booking if available
    let bookingInfo = null
    if (bookingId) {
      const { data: booking } = await supabase
        .from('accommodation_bookings')
        .select(`
          id, check_in_date, check_out_date, status, number_of_guests,
          special_requests, source, total_amount,
          unit:accommodation_units(name, unit_type, description)
        `)
        .eq('id', bookingId)
        .single()
      bookingInfo = booking
    } else if (guestId) {
      // Try to find an active/upcoming booking for this guest
      const today = new Date().toISOString().split('T')[0]
      const { data: booking } = await supabase
        .from('accommodation_bookings')
        .select(`
          id, check_in_date, check_out_date, status, number_of_guests,
          special_requests, source, total_amount,
          unit:accommodation_units(name, unit_type, description)
        `)
        .eq('guest_id', guestId)
        .eq('organization_id', organizationId)
        .gte('check_out_date', today)
        .in('status', ['confirmed', 'checked_in', 'pending_deposit'])
        .order('check_in_date', { ascending: true })
        .limit(1)
        .maybeSingle()
      bookingInfo = booking
    }

    return {
      properties: properties || [],
      amenities: (amenities || []).map((a) => `${a.name} (${a.category})`),
      services: services || [],
      guest: guestInfo,
      booking: bookingInfo,
      today: new Date().toISOString().split('T')[0],
    }
  }

  protected parseResponse(response: string): ConciergeResponse {
    let cleaned = response.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const parsed = JSON.parse(cleaned)

    if (!parsed.reply_text) {
      throw new Error('Missing "reply_text" field in concierge response')
    }

    const validCategories = ['property_info', 'area_info', 'booking_help', 'activities', 'general']
    const category = validCategories.includes(parsed.category) ? parsed.category : 'general'

    return {
      reply_text: String(parsed.reply_text),
      category,
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
      suggested_actions: Array.isArray(parsed.suggested_actions) ? parsed.suggested_actions : [],
      escalate_to_human: Boolean(parsed.escalate_to_human),
    }
  }
}
