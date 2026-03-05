/**
 * Usage Metering System
 *
 * Central module for tracking, enforcing, and querying usage limits
 * across the DraggonnB OS platform.
 *
 * Entry points:
 * - recordUsage() -- call after any metered action completes
 * - canPerformAction() -- call before attempting a metered action
 * - getUsageAlerts() -- call to populate dashboard warning banners
 */

// Types
export type {
  UsageMetric,
  UsageEvent,
  UsageSummary,
  UsageCheckResult,
  UsageAlert,
} from './types'

// Core metering
export {
  recordUsage,
  checkUsage,
  getUsageSummary,
} from './meter'

// Limit enforcement
export {
  canPerformAction,
  getUsageAlerts,
  getRemainingQuota,
  isUnlimited,
} from './limits'
