-- ============================================================================
-- Migration: Accommodation Standalone Subscription Tiers
-- Adds accommodation-specific tier values to organizations table.
-- Supports single-Supabase multi-tenant model for accommodation clients.
-- ============================================================================

-- Expand subscription_tier to include accommodation standalone tiers
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_subscription_tier_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_subscription_tier_check
  CHECK (subscription_tier IN (
    -- Legacy CRMM tiers
    'starter', 'professional', 'enterprise',
    -- Canonical CRMM tiers
    'core', 'growth', 'scale',
    -- Accommodation standalone tiers
    'accommodation_starter',   -- R399/mo: 1 property, 5 units, 50 bookings/mo
    'accommodation_growth',    -- R699/mo: 3 properties, 15 units, 200 bookings/mo
    'accommodation_safari'     -- R1,299/mo: 10 properties, 50 units, unlimited bookings
  ));

-- Add accommodation-specific usage tracking columns to client_usage_metrics
ALTER TABLE client_usage_metrics
  ADD COLUMN IF NOT EXISTS bookings_monthly INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS properties_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS units_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS whatsapp_messages_monthly INTEGER NOT NULL DEFAULT 0;
