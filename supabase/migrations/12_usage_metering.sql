-- ============================================================================
-- Migration: Usage Metering Infrastructure
-- Created: 2026-03-02
-- Purpose: Granular usage event tracking, limit enforcement, and monthly
--          aggregation for billing and plan gating.
--
-- What this migration does:
-- 1. Creates usage_events table (append-only event log)
-- 2. Creates usage_summaries table (pre-aggregated monthly snapshots)
-- 3. Creates record_usage_event() RPC (check limit + insert atomically)
-- 4. Creates get_usage_summary() RPC (current month usage for an org)
-- 5. Creates aggregate_monthly_usage() RPC (cron/N8N end-of-month snapshot)
-- 6. Adds indexes for fast lookups
-- 7. Applies RLS on both tables
--
-- Dependencies: organizations table, billing_plans table (migration 11),
--               get_user_org_id() function (migration 10)
-- ============================================================================

-- ============================================================================
-- STEP 1: usage_events - Granular usage event log (append-only)
-- ============================================================================
-- Every metered action records an event here. The record_usage_event() RPC
-- checks plan limits before inserting.
--
-- Partition hint: Consider partitioning by month when usage_events exceeds
-- 1M rows. Use PARTITION BY RANGE (recorded_at) with monthly partitions.

CREATE TABLE IF NOT EXISTS usage_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric TEXT NOT NULL, -- 'social_post', 'ai_generation', 'email_send', 'agent_invocation'
  quantity INTEGER NOT NULL DEFAULT 1,
  metadata JSONB DEFAULT '{}', -- context: {campaign_id, agent_id, etc}
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- STEP 2: usage_summaries - Pre-aggregated monthly summaries per org per metric
-- ============================================================================
-- Populated by aggregate_monthly_usage() at end of month via cron/N8N.
-- Used for billing history, invoicing, and dashboard charts.

CREATE TABLE IF NOT EXISTS usage_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  period_start DATE NOT NULL, -- first day of month
  period_end DATE NOT NULL, -- last day of month
  total_used INTEGER NOT NULL DEFAULT 0,
  limit_value INTEGER NOT NULL DEFAULT 0, -- -1 = unlimited
  overage INTEGER NOT NULL DEFAULT 0, -- amount over limit
  UNIQUE(organization_id, metric, period_start)
);

-- ============================================================================
-- STEP 3: Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_usage_events_org_metric
  ON usage_events(organization_id, metric, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_events_recorded
  ON usage_events(recorded_at);

CREATE INDEX IF NOT EXISTS idx_usage_summaries_org
  ON usage_summaries(organization_id, period_start DESC);

-- ============================================================================
-- STEP 4: RPC - record_usage_event
-- ============================================================================
-- Atomically checks the org's plan limit for the given metric, and if under
-- the limit (or unlimited), inserts the event. Returns a JSONB result with
-- allowed/current/limit/remaining fields.
--
-- Called by API routes and N8N webhooks via service_role.

CREATE OR REPLACE FUNCTION record_usage_event(
  p_org_id UUID,
  p_metric TEXT,
  p_quantity INTEGER DEFAULT 1,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER;
  v_current INTEGER;
  v_plan_id TEXT;
  v_result JSONB;
BEGIN
  -- Get the org's plan_id
  SELECT o.plan_id INTO v_plan_id FROM organizations o WHERE o.id = p_org_id;

  -- Look up the limit for this metric from billing_plans
  SELECT (bp.limits->>p_metric)::INTEGER INTO v_limit
    FROM billing_plans bp WHERE bp.id = COALESCE(v_plan_id, 'core');

  -- NULL limit means metric not defined in plan; default to 0
  IF v_limit IS NULL THEN v_limit := 0; END IF;

  -- Get current month usage for this org + metric
  SELECT COALESCE(SUM(quantity), 0) INTO v_current
    FROM usage_events
    WHERE organization_id = p_org_id
      AND metric = p_metric
      AND recorded_at >= date_trunc('month', now())
      AND recorded_at < date_trunc('month', now()) + interval '1 month';

  -- Check if allowed: -1 = unlimited, otherwise must be under limit
  IF v_limit = -1 OR (v_current + p_quantity) <= v_limit THEN
    -- Record the event
    INSERT INTO usage_events (organization_id, metric, quantity, metadata)
    VALUES (p_org_id, p_metric, p_quantity, p_metadata);

    v_result := jsonb_build_object(
      'allowed', true,
      'current', v_current + p_quantity,
      'limit', v_limit,
      'remaining', CASE WHEN v_limit = -1 THEN -1 ELSE v_limit - (v_current + p_quantity) END
    );
  ELSE
    v_result := jsonb_build_object(
      'allowed', false,
      'current', v_current,
      'limit', v_limit,
      'remaining', GREATEST(0, v_limit - v_current)
    );
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- STEP 5: RPC - get_usage_summary
-- ============================================================================
-- Returns current month usage for all metrics defined in the org's plan.
-- Each metric key contains: used, limit, remaining, percent.

CREATE OR REPLACE FUNCTION get_usage_summary(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id TEXT;
  v_limits JSONB;
  v_result JSONB := '{}';
  v_metric TEXT;
  v_current INTEGER;
  v_limit INTEGER;
BEGIN
  -- Get the org's plan and its limits JSONB
  SELECT o.plan_id, bp.limits INTO v_plan_id, v_limits
    FROM organizations o
    LEFT JOIN billing_plans bp ON bp.id = o.plan_id
    WHERE o.id = p_org_id;

  IF v_limits IS NULL THEN v_limits := '{}'; END IF;

  -- Iterate each metric defined in the plan's limits
  FOR v_metric IN SELECT jsonb_object_keys(v_limits)
  LOOP
    SELECT COALESCE(SUM(quantity), 0) INTO v_current
      FROM usage_events
      WHERE organization_id = p_org_id
        AND metric = v_metric
        AND recorded_at >= date_trunc('month', now())
        AND recorded_at < date_trunc('month', now()) + interval '1 month';

    v_limit := (v_limits->>v_metric)::INTEGER;

    v_result := v_result || jsonb_build_object(
      v_metric, jsonb_build_object(
        'used', v_current,
        'limit', v_limit,
        'remaining', CASE WHEN v_limit = -1 THEN -1 ELSE GREATEST(0, v_limit - v_current) END,
        'percent', CASE WHEN v_limit <= 0 THEN 0 ELSE LEAST(100, ROUND((v_current::NUMERIC / v_limit) * 100)) END
      )
    );
  END LOOP;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- STEP 6: RPC - aggregate_monthly_usage
-- ============================================================================
-- Called by cron/N8N at end of month to snapshot usage_events into
-- usage_summaries. Idempotent via UPSERT. Pass NULL for current month.

CREATE OR REPLACE FUNCTION aggregate_monthly_usage(p_period_start DATE DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start DATE;
  v_end DATE;
  v_count INTEGER := 0;
BEGIN
  -- Default to current month if not specified
  v_start := COALESCE(p_period_start, date_trunc('month', now())::DATE);
  v_end := (v_start + interval '1 month' - interval '1 day')::DATE;

  -- Upsert aggregated rows: one per org per metric for the period
  INSERT INTO usage_summaries (organization_id, metric, period_start, period_end, total_used, limit_value, overage)
  SELECT
    ue.organization_id,
    ue.metric,
    v_start,
    v_end,
    SUM(ue.quantity),
    COALESCE((bp.limits->>ue.metric)::INTEGER, 0),
    GREATEST(0, SUM(ue.quantity) - COALESCE((bp.limits->>ue.metric)::INTEGER, 0))
  FROM usage_events ue
  JOIN organizations o ON o.id = ue.organization_id
  LEFT JOIN billing_plans bp ON bp.id = o.plan_id
  WHERE ue.recorded_at >= v_start::TIMESTAMPTZ
    AND ue.recorded_at < (v_end + interval '1 day')::TIMESTAMPTZ
  GROUP BY ue.organization_id, ue.metric, bp.limits
  ON CONFLICT (organization_id, metric, period_start) DO UPDATE SET
    total_used = EXCLUDED.total_used,
    limit_value = EXCLUDED.limit_value,
    overage = EXCLUDED.overage;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================================
-- STEP 7: Row Level Security
-- ============================================================================

-- ---------------------------------------------------------------
-- 7a. usage_events
-- ---------------------------------------------------------------
-- Users can read their own org's events. Inserts happen via
-- record_usage_event() RPC (SECURITY DEFINER), not direct INSERT.

ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_events_select" ON usage_events
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));

CREATE POLICY "usage_events_service_role" ON usage_events
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

ALTER TABLE usage_events FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 7b. usage_summaries
-- ---------------------------------------------------------------
-- Users can read their own org's summaries. Writes happen via
-- aggregate_monthly_usage() RPC (SECURITY DEFINER).

ALTER TABLE usage_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_summaries_select" ON usage_summaries
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));

CREATE POLICY "usage_summaries_service_role" ON usage_summaries
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

ALTER TABLE usage_summaries FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  -- Verify usage_events table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usage_events') THEN
    RAISE NOTICE 'usage_events table created successfully';
  ELSE
    RAISE EXCEPTION 'usage_events table NOT found';
  END IF;

  -- Verify usage_summaries table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usage_summaries') THEN
    RAISE NOTICE 'usage_summaries table created successfully';
  ELSE
    RAISE EXCEPTION 'usage_summaries table NOT found';
  END IF;

  -- Verify record_usage_event function
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'record_usage_event') THEN
    RAISE NOTICE 'record_usage_event() function created successfully';
  ELSE
    RAISE EXCEPTION 'record_usage_event() function NOT found';
  END IF;

  -- Verify get_usage_summary function
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_usage_summary') THEN
    RAISE NOTICE 'get_usage_summary() function created successfully';
  ELSE
    RAISE EXCEPTION 'get_usage_summary() function NOT found';
  END IF;

  RAISE NOTICE 'Migration 12_usage_metering completed successfully';
END;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
