/**
 * Usage Metering Types
 * TypeScript interfaces for the usage tracking and limit enforcement system.
 *
 * Maps to DB tables: usage_events, usage_summaries (migration 12)
 * and billing_plans.limits JSONB (migration 11).
 */

// ============================================================================
// METRIC TYPES
// ============================================================================

export type UsageMetric =
  | 'social_posts'
  | 'ai_generations'
  | 'email_sends'
  | 'social_accounts'
  | 'team_users'
  | 'custom_automations'
  | 'ai_agents'
  | 'agent_invocations'

// ============================================================================
// USAGE EVENT (maps to usage_events table)
// ============================================================================

export interface UsageEvent {
  id: string
  organization_id: string
  metric: UsageMetric
  quantity: number
  metadata: Record<string, unknown>
  recorded_at: string
}

// ============================================================================
// USAGE SUMMARY (returned by get_usage_summary RPC)
// ============================================================================

export interface UsageSummary {
  metric: UsageMetric
  used: number
  limit: number
  remaining: number
  percent: number
}

// ============================================================================
// CHECK RESULT (returned by record_usage_event RPC and local checks)
// ============================================================================

export interface UsageCheckResult {
  allowed: boolean
  current: number
  limit: number
  remaining: number
}

// ============================================================================
// ALERT (generated when usage approaches or hits limits)
// ============================================================================

export interface UsageAlert {
  metric: UsageMetric
  percent: number
  threshold: 80 | 90 | 100
  message: string
}
