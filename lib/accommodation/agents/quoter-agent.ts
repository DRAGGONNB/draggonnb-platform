/**
 * Accommodation Quoter Agent
 * Generates personalized accommodation quotes from inquiry details.
 * Looks up availability + rates, produces quote email body.
 */

import { BaseAgent } from '@/lib/agents/base-agent'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AgentRunOptions, AgentRunResult, QuoteResult } from '@/lib/agents/types'

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const QUOTER_SYSTEM_PROMPT = `You are an Accommodation Quoter Agent for a South African hospitality business. Your job is to analyze guest inquiry details and generate a professional, personalised quote.

You will receive:
- The inquiry text from the prospective guest
- Property/unit details with availability and rates (provided as context)
- Guest details if available (name, email, phone)
- Requested dates and guest counts

Your task:
1. Determine the best matching property/unit for the inquiry
2. Calculate the correct rate based on dates, season, guest count, and rate rules
3. Generate a warm, professional quote email that the host can send

RESPONSE FORMAT - Respond ONLY with a JSON object (no markdown, no code fences):
{
  "available": true,
  "property_name": "Name of the property",
  "unit_type": "Type of unit (e.g., Luxury Suite, Standard Room)",
  "check_in": "YYYY-MM-DD",
  "check_out": "YYYY-MM-DD",
  "nights": 3,
  "rate_per_night": 1500.00,
  "total_amount": 4500.00,
  "currency": "ZAR",
  "inclusions": ["Breakfast", "Wi-Fi", "Parking"],
  "special_notes": "Any special notes about the stay or property",
  "quote_email_subject": "Your Quote for [Property] - [Dates]",
  "quote_email_body": "Full professional email body with greeting, quote details, inclusions, and call to action"
}

If the property is NOT available for the requested dates, set "available": false and provide a helpful alternative suggestion in the email body.

GUIDELINES:
- Use warm, professional South African hospitality tone
- Prices are in ZAR (South African Rand) unless otherwise specified
- Always include deposit/payment terms if provided in context
- Mention cancellation policy if available
- Include property highlights and nearby attractions when relevant
- If dates are vague ("next weekend", "in December"), interpret reasonably based on the current date
- Round amounts to 2 decimal places`

// ============================================================================
// AGENT
// ============================================================================

export class QuoterAgent extends BaseAgent {
  constructor() {
    super({
      agentType: 'accommodation_quoter',
      systemPrompt: QUOTER_SYSTEM_PROMPT,
      temperature: 0.4,
      maxTokens: 3000,
    })
  }

  /**
   * Generate a quote from an inquiry
   */
  async generateQuote(params: {
    organizationId: string
    inquiryText: string
    guestName?: string
    guestEmail?: string
    guestPhone?: string
    checkInDate?: string
    checkOutDate?: string
    guests?: number
    propertyId?: string
    sessionId?: string
  }): Promise<AgentRunResult> {
    const supabase = createAdminClient()

    // Fetch property and rate context
    const context = await this.buildContext(
      supabase,
      params.organizationId,
      params.propertyId,
      params.checkInDate,
      params.checkOutDate
    )

    const input = `Please generate a quote for this accommodation inquiry:

Inquiry: ${params.inquiryText}
${params.guestName ? `Guest Name: ${params.guestName}` : ''}
${params.guestEmail ? `Guest Email: ${params.guestEmail}` : ''}
${params.guestPhone ? `Guest Phone: ${params.guestPhone}` : ''}
${params.checkInDate ? `Requested Check-in: ${params.checkInDate}` : ''}
${params.checkOutDate ? `Requested Check-out: ${params.checkOutDate}` : ''}
${params.guests ? `Number of Guests: ${params.guests}` : ''}
${params.propertyId ? `Requested Property ID: ${params.propertyId}` : ''}`

    return this.run({
      organizationId: params.organizationId,
      sessionId: params.sessionId,
      input,
      context,
    })
  }

  /**
   * Build context with property info, units, rates, and availability
   */
  private async buildContext(
    supabase: ReturnType<typeof createAdminClient>,
    organizationId: string,
    propertyId?: string,
    checkIn?: string,
    checkOut?: string
  ): Promise<Record<string, unknown>> {
    // Fetch properties
    let propertyQuery = supabase
      .from('accommodation_properties')
      .select('id, name, type, description, address, city, province, check_in_time, check_out_time')
      .eq('organization_id', organizationId)
      .eq('status', 'active')

    if (propertyId) {
      propertyQuery = propertyQuery.eq('id', propertyId)
    }

    const { data: properties } = await propertyQuery.limit(10)

    // Fetch units with capacities
    const propertyIds = (properties || []).map((p) => p.id)
    const { data: units } = propertyIds.length > 0
      ? await supabase
          .from('accommodation_units')
          .select('id, name, property_id, unit_type, max_guests, description, status')
          .in('property_id', propertyIds)
          .eq('status', 'active')
          .limit(50)
      : { data: [] }

    // Fetch base rates
    const unitIds = (units || []).map((u) => u.id)
    const { data: rates } = unitIds.length > 0
      ? await supabase
          .from('accommodation_rates')
          .select('id, unit_id, name, base_rate, price_basis, meal_plan, season, guest_category')
          .in('unit_id', unitIds)
          .eq('is_active', true)
          .limit(100)
      : { data: [] }

    // Check availability if dates provided
    let blockedUnits: string[] = []
    if (checkIn && checkOut && unitIds.length > 0) {
      const { data: blocks } = await supabase
        .from('accommodation_availability_blocks')
        .select('unit_id')
        .in('unit_id', unitIds)
        .lt('start_date', checkOut)
        .gt('end_date', checkIn)

      blockedUnits = (blocks || []).map((b) => b.unit_id as string)
    }

    // Fetch deposit/payment policy
    const { data: policies } = await supabase
      .from('accommodation_deposit_policies')
      .select('deposit_type, deposit_value, balance_due_days, cancellation_policy')
      .eq('organization_id', organizationId)
      .limit(5)

    return {
      properties: properties || [],
      units: units || [],
      rates: rates || [],
      blocked_unit_ids: blockedUnits,
      deposit_policies: policies || [],
      today: new Date().toISOString().split('T')[0],
    }
  }

  protected parseResponse(response: string): QuoteResult {
    let cleaned = response.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const parsed = JSON.parse(cleaned)

    if (typeof parsed.available !== 'boolean') {
      throw new Error('Missing "available" field in quote response')
    }

    return {
      available: parsed.available,
      property_name: parsed.property_name || 'Unknown Property',
      unit_type: parsed.unit_type || 'Standard',
      check_in: parsed.check_in || '',
      check_out: parsed.check_out || '',
      nights: Math.max(0, Number(parsed.nights) || 0),
      rate_per_night: Math.max(0, Number(parsed.rate_per_night) || 0),
      total_amount: Math.max(0, Number(parsed.total_amount) || 0),
      currency: parsed.currency || 'ZAR',
      inclusions: Array.isArray(parsed.inclusions) ? parsed.inclusions : [],
      special_notes: parsed.special_notes || '',
      quote_email_subject: parsed.quote_email_subject || 'Your Accommodation Quote',
      quote_email_body: parsed.quote_email_body || '',
    }
  }
}
