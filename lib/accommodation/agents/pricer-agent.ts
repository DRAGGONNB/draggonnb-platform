/**
 * Accommodation Pricer Agent
 * Analyzes occupancy patterns and market data to recommend
 * dynamic rate adjustments for accommodation units.
 */

import { BaseAgent } from '@/lib/agents/base-agent'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AgentRunResult, PricingAnalysisResult, PricingRecommendation } from '@/lib/agents/types'

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const PRICER_SYSTEM_PROMPT = `You are a Revenue Management AI for a South African accommodation business. You analyze occupancy data, booking patterns, and seasonal trends to recommend optimal pricing strategies.

You will receive:
- Current occupancy data per unit
- Existing rate configurations
- Recent booking history (volume, lead time, source mix)
- Financial performance snapshots
- Analysis period dates

Your tasks:
1. Analyze occupancy patterns for the period
2. Identify underperforming and high-demand units
3. Recommend rate adjustments for each unit
4. Provide market insights and revenue impact estimates

RESPONSE FORMAT - Respond ONLY with a JSON object (no markdown, no code fences):
{
  "analysis_period": "2024-04-01 to 2024-04-30",
  "overall_occupancy": 72.5,
  "recommendations": [
    {
      "unit_id": "uuid",
      "unit_name": "Sunset Suite",
      "current_rate": 2500.00,
      "recommended_rate": 2800.00,
      "change_percent": 12.0,
      "reason": "High demand + low availability for this period. Occupancy at 95% — room for premium pricing.",
      "confidence": 0.85,
      "period_start": "2024-04-01",
      "period_end": "2024-04-30"
    }
  ],
  "market_insights": [
    "Weekend demand is 40% higher than weekdays — consider weekend surcharge",
    "Booking lead time averaging 14 days — last-minute pricing opportunity exists"
  ],
  "revenue_impact_estimate": 15000.00,
  "summary": "Overall assessment and key recommendations in 2-3 sentences"
}

PRICING PRINCIPLES:
- South African accommodation market context (ZAR pricing)
- Consider seasonality: Dec-Jan (peak/festive), Easter, school holidays, June-July (winter special)
- Public holidays in SA drive short breaks (Heritage Day, Freedom Day, etc.)
- International events (rugby, cricket, conferences) can spike demand
- Rate changes should be gradual — suggest max 15-20% adjustments per period
- Consider value perception — drastic price drops can signal quality issues
- Always factor in competitor landscape if data is available
- Revenue per available room (RevPAR) is the key metric, not just rate or occupancy
- If occupancy is below 50%, consider promotional pricing
- If occupancy is above 85%, there's room for rate increases
- Weekend vs weekday differentiation is common and expected
- Long-stay discounts should protect minimum daily rate

CONFIDENCE LEVELS:
- 0.8-1.0: Strong data support, clear pattern
- 0.6-0.8: Moderate data, reasonable inference
- 0.4-0.6: Limited data, directional recommendation
- Below 0.4: Insufficient data, flag for human review`

// ============================================================================
// AGENT
// ============================================================================

export class PricerAgent extends BaseAgent {
  constructor() {
    super({
      agentType: 'accommodation_pricer',
      systemPrompt: PRICER_SYSTEM_PROMPT,
      temperature: 0.3,
      maxTokens: 4000,
    })
  }

  /**
   * Run pricing analysis for a period
   */
  async analyzePricing(params: {
    organizationId: string
    periodStart?: string
    periodEnd?: string
    propertyId?: string
    sessionId?: string
  }): Promise<AgentRunResult> {
    const supabase = createAdminClient()

    // Default to next 30 days if no period specified
    const start = params.periodStart || new Date().toISOString().split('T')[0]
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 30)
    const end = params.periodEnd || endDate.toISOString().split('T')[0]

    const context = await this.buildContext(
      supabase,
      params.organizationId,
      start,
      end,
      params.propertyId
    )

    const input = `Please analyze pricing for the period ${start} to ${end} and provide rate recommendations for each unit.`

    return this.run({
      organizationId: params.organizationId,
      sessionId: params.sessionId,
      input,
      context,
    })
  }

  /**
   * Build comprehensive context for pricing analysis
   */
  private async buildContext(
    supabase: ReturnType<typeof createAdminClient>,
    organizationId: string,
    periodStart: string,
    periodEnd: string,
    propertyId?: string
  ): Promise<Record<string, unknown>> {
    // Fetch units
    let unitQuery = supabase
      .from('accommodation_units')
      .select('id, name, property_id, unit_type, max_guests, status')
      .eq('organization_id', organizationId)
      .eq('status', 'active')

    if (propertyId) {
      unitQuery = unitQuery.eq('property_id', propertyId)
    }

    const { data: units } = await unitQuery.limit(50)
    const unitIds = (units || []).map((u) => u.id)

    // Fetch current rates
    const { data: rates } = unitIds.length > 0
      ? await supabase
          .from('accommodation_rates')
          .select('unit_id, name, base_rate, price_basis, meal_plan, season, guest_category')
          .in('unit_id', unitIds)
          .eq('is_active', true)
          .limit(200)
      : { data: [] }

    // Fetch bookings in the period for occupancy calculation
    const { data: bookings } = await supabase
      .from('accommodation_bookings')
      .select('id, unit_id, check_in_date, check_out_date, status, source, total_amount, number_of_guests')
      .eq('organization_id', organizationId)
      .in('status', ['confirmed', 'checked_in', 'checked_out'])
      .lt('check_in_date', periodEnd)
      .gt('check_out_date', periodStart)
      .limit(500)

    // Fetch recent booking history (last 90 days) for pattern analysis
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const { data: recentBookings } = await supabase
      .from('accommodation_bookings')
      .select('unit_id, check_in_date, check_out_date, source, total_amount, created_at')
      .eq('organization_id', organizationId)
      .in('status', ['confirmed', 'checked_in', 'checked_out'])
      .gte('check_in_date', ninetyDaysAgo.toISOString().split('T')[0])
      .limit(500)

    // Fetch availability blocks
    const { data: blocks } = unitIds.length > 0
      ? await supabase
          .from('accommodation_availability_blocks')
          .select('unit_id, start_date, end_date, block_type')
          .in('unit_id', unitIds)
          .lt('start_date', periodEnd)
          .gt('end_date', periodStart)
          .limit(200)
      : { data: [] }

    // Fetch financial snapshots for trend data
    const { data: snapshots } = await supabase
      .from('accommodation_financial_snapshots')
      .select('snapshot_date, total_revenue, occupancy_rate, avg_daily_rate')
      .eq('organization_id', organizationId)
      .gte('snapshot_date', ninetyDaysAgo.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: true })
      .limit(90)

    // Calculate per-unit occupancy for the period
    const periodDays = Math.ceil(
      (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / (1000 * 60 * 60 * 24)
    )

    const unitOccupancy = (units || []).map((unit) => {
      const unitBookings = (bookings || []).filter((b) => b.unit_id === unit.id)
      let bookedNights = 0
      for (const b of unitBookings) {
        const bStart = new Date(Math.max(new Date(b.check_in_date).getTime(), new Date(periodStart).getTime()))
        const bEnd = new Date(Math.min(new Date(b.check_out_date).getTime(), new Date(periodEnd).getTime()))
        bookedNights += Math.max(0, Math.ceil((bEnd.getTime() - bStart.getTime()) / (1000 * 60 * 60 * 24)))
      }
      return {
        unit_id: unit.id,
        unit_name: unit.name,
        unit_type: unit.unit_type,
        occupancy_percent: periodDays > 0 ? Math.round((bookedNights / periodDays) * 100) : 0,
        booked_nights: bookedNights,
        total_nights: periodDays,
      }
    })

    return {
      units: units || [],
      current_rates: rates || [],
      period_bookings: (bookings || []).length,
      unit_occupancy: unitOccupancy,
      booking_sources: this.aggregateSources(bookings || []),
      recent_booking_count: (recentBookings || []).length,
      availability_blocks: (blocks || []).length,
      financial_trend: snapshots || [],
      period_start: periodStart,
      period_end: periodEnd,
      period_days: periodDays,
      today: new Date().toISOString().split('T')[0],
    }
  }

  /**
   * Aggregate booking sources for analysis
   */
  private aggregateSources(bookings: Array<{ source: string }>): Record<string, number> {
    const sources: Record<string, number> = {}
    for (const b of bookings) {
      sources[b.source] = (sources[b.source] || 0) + 1
    }
    return sources
  }

  protected parseResponse(response: string): PricingAnalysisResult {
    let cleaned = response.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const parsed = JSON.parse(cleaned)

    if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
      throw new Error('Missing "recommendations" array in pricing analysis response')
    }

    const recommendations: PricingRecommendation[] = parsed.recommendations.map(
      (r: Record<string, unknown>) => ({
        unit_id: String(r.unit_id || ''),
        unit_name: String(r.unit_name || ''),
        current_rate: Math.max(0, Number(r.current_rate) || 0),
        recommended_rate: Math.max(0, Number(r.recommended_rate) || 0),
        change_percent: Number(r.change_percent) || 0,
        reason: String(r.reason || ''),
        confidence: Math.min(1, Math.max(0, Number(r.confidence) || 0.5)),
        period_start: String(r.period_start || ''),
        period_end: String(r.period_end || ''),
      })
    )

    return {
      analysis_period: String(parsed.analysis_period || ''),
      overall_occupancy: Math.min(100, Math.max(0, Number(parsed.overall_occupancy) || 0)),
      recommendations,
      market_insights: Array.isArray(parsed.market_insights) ? parsed.market_insights : [],
      revenue_impact_estimate: Number(parsed.revenue_impact_estimate) || 0,
      summary: String(parsed.summary || ''),
    }
  }
}
