-- DraggonnB OS - Credits, Alerts & Materialized Views
-- Migration: 11_credits_and_alerts.sql
-- Date: 2026-03-01
-- Purpose: Bolt-on credit packs, FIFO credit deduction, usage alerts, materialized views

-- ============================================================================
-- CREDIT PACKS (bolt-on product definitions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS credit_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  dimension TEXT NOT NULL, -- matches plan_limits.dimension
  credit_quantity INTEGER NOT NULL,
  price_zar INTEGER NOT NULL, -- cents (2500 = R25.00)
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- TENANT CREDITS (unified ledger for bolt-ons, referrals, rewards)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  credit_pack_id UUID REFERENCES credit_packs(id), -- NULL for referral/loyalty/promo credits
  dimension TEXT NOT NULL,
  credits_purchased INTEGER NOT NULL,
  credits_remaining INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'purchase'
    CHECK (source IN ('purchase', 'referral', 'loyalty', 'promo', 'compensation')),
  source_metadata JSONB NOT NULL DEFAULT '{}',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  payment_reference TEXT, -- PayFast pf_payment_id
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'depleted', 'expired')),
  CONSTRAINT credits_remaining_nonneg CHECK (credits_remaining >= 0)
);

CREATE INDEX IF NOT EXISTS idx_tenant_credits_active
  ON tenant_credits (organization_id, dimension, status)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_tenant_credits_expires
  ON tenant_credits (expires_at)
  WHERE status = 'active';

-- ============================================================================
-- CREDIT DEDUCTIONS (links usage events to credit consumption)
-- ============================================================================

CREATE TABLE IF NOT EXISTS credit_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_credit_id UUID NOT NULL REFERENCES tenant_credits(id) ON DELETE CASCADE,
  usage_event_id UUID REFERENCES usage_events(id), -- NULL for subscription offsets
  quantity_deducted INTEGER NOT NULL,
  deducted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_deductions_credit
  ON credit_deductions (tenant_credit_id);

-- ============================================================================
-- USAGE ALERTS (threshold notifications)
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL,
  threshold_percent INTEGER NOT NULL, -- 50, 75, 90, 100
  alert_method TEXT NOT NULL DEFAULT 'whatsapp',
  is_sent BOOLEAN NOT NULL DEFAULT false,
  billing_period DATE NOT NULL, -- current_period_start date
  sent_at TIMESTAMPTZ,
  UNIQUE(organization_id, dimension, threshold_percent, billing_period)
);

CREATE INDEX IF NOT EXISTS idx_usage_alerts_unsent
  ON usage_alerts (organization_id, dimension, is_sent)
  WHERE is_sent = false;

-- ============================================================================
-- SEED CREDIT PACKS
-- ============================================================================

INSERT INTO credit_packs (slug, name, dimension, credit_quantity, price_zar)
VALUES
  -- AI generation packs
  ('ai-starter', 'AI Starter Pack', 'ai_generations', 200, 2500),
  ('ai-pro', 'AI Pro Pack', 'ai_generations', 500, 5500),
  ('ai-power', 'AI Power Pack', 'ai_generations', 1500, 13500),
  -- Agent invocation packs
  ('agent-boost', 'Agent Boost Pack', 'agent_invocations', 100, 2000),
  ('agent-pro', 'Agent Pro Pack', 'agent_invocations', 500, 8000),
  -- Social post packs
  ('social-boost', 'Social Boost Pack', 'social_posts', 50, 2000),
  ('social-pro', 'Social Pro Pack', 'social_posts', 200, 6000),
  -- Email packs
  ('email-boost', 'Email Boost Pack', 'email_sends', 5000, 5000),
  ('email-pro', 'Email Pro Pack', 'email_sends', 20000, 15000)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE credit_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_alerts ENABLE ROW LEVEL SECURITY;

-- Credit packs: readable by all authenticated (public catalog)
CREATE POLICY "credit_packs_select" ON credit_packs
  FOR SELECT TO authenticated
  USING (true);

-- Tenant credits: users see their own org's credits
CREATE POLICY "tenant_credits_select" ON tenant_credits
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = (SELECT auth.uid())
    )
  );

-- Tenant credits: service role can insert/update (purchase flow + deduction)
CREATE POLICY "tenant_credits_service_insert" ON tenant_credits
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "tenant_credits_service_update" ON tenant_credits
  FOR UPDATE TO service_role
  USING (true);

-- Credit deductions: users see their own org's deductions
CREATE POLICY "credit_deductions_select" ON credit_deductions
  FOR SELECT TO authenticated
  USING (
    tenant_credit_id IN (
      SELECT id FROM tenant_credits WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = (SELECT auth.uid())
      )
    )
  );

-- Credit deductions: service role can insert
CREATE POLICY "credit_deductions_service_insert" ON credit_deductions
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Usage alerts: users see their own org's alerts
CREATE POLICY "usage_alerts_select" ON usage_alerts
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = (SELECT auth.uid())
    )
  );

-- Usage alerts: service role can insert/update
CREATE POLICY "usage_alerts_service_all" ON usage_alerts
  FOR ALL TO service_role
  USING (true);

-- ============================================================================
-- FUNCTION: Get effective allowance (plan + bolt-on credits)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_effective_allowance(
  p_organization_id UUID,
  p_dimension TEXT
)
RETURNS TABLE (
  plan_included INTEGER,
  bolt_on_remaining INTEGER,
  total_available INTEGER,
  overage_rate_zar INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(pl.included_quantity, 0)::INTEGER AS plan_included,
    COALESCE(
      (SELECT SUM(tc.credits_remaining)::INTEGER
       FROM tenant_credits tc
       WHERE tc.organization_id = p_organization_id
         AND tc.dimension = p_dimension
         AND tc.status = 'active'
         AND tc.expires_at > now()),
      0
    )::INTEGER AS bolt_on_remaining,
    (COALESCE(pl.included_quantity, 0) + COALESCE(
      (SELECT SUM(tc.credits_remaining)::INTEGER
       FROM tenant_credits tc
       WHERE tc.organization_id = p_organization_id
         AND tc.dimension = p_dimension
         AND tc.status = 'active'
         AND tc.expires_at > now()),
      0
    ))::INTEGER AS total_available,
    COALESCE(pl.overage_rate_zar, 0)::INTEGER AS overage_rate_zar
  FROM tenant_subscriptions ts
  JOIN plan_limits pl ON pl.plan_id = ts.plan_id AND pl.dimension = p_dimension
  WHERE ts.organization_id = p_organization_id
    AND ts.status IN ('active', 'trialing');
END;
$$;

-- ============================================================================
-- MATERIALIZED VIEW: Current period usage summary
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS usage_current_period AS
SELECT
  ts.organization_id,
  ts.plan_id,
  ue.dimension,
  COALESCE(SUM(ue.quantity), 0)::INTEGER AS used,
  pl.included_quantity AS plan_included,
  COALESCE(tc_sum.credits_remaining, 0)::INTEGER AS bolt_on_remaining,
  (pl.included_quantity + COALESCE(tc_sum.credits_remaining, 0))::INTEGER AS total_available,
  GREATEST(0, COALESCE(SUM(ue.quantity), 0)::INTEGER - pl.included_quantity
    - COALESCE(tc_sum.credits_remaining, 0)::INTEGER) AS overage,
  pl.overage_rate_zar,
  GREATEST(0, COALESCE(SUM(ue.quantity), 0)::INTEGER - pl.included_quantity
    - COALESCE(tc_sum.credits_remaining, 0)::INTEGER) * pl.overage_rate_zar AS overage_cost_cents
FROM tenant_subscriptions ts
JOIN usage_events ue
  ON ue.organization_id = ts.organization_id
  AND ue.created_at >= ts.current_period_start
  AND ue.created_at < ts.current_period_end
JOIN plan_limits pl
  ON pl.plan_id = ts.plan_id AND pl.dimension = ue.dimension
LEFT JOIN (
  SELECT tenant_id_agg, dimension_agg, SUM(cr)::INTEGER AS credits_remaining
  FROM (
    SELECT organization_id AS tenant_id_agg, dimension AS dimension_agg, credits_remaining AS cr
    FROM tenant_credits
    WHERE status = 'active' AND expires_at > now()
  ) sub
  GROUP BY tenant_id_agg, dimension_agg
) tc_sum
  ON tc_sum.tenant_id_agg = ts.organization_id AND tc_sum.dimension_agg = ue.dimension
WHERE ts.status IN ('active', 'trialing')
GROUP BY ts.organization_id, ts.plan_id, ue.dimension,
         pl.included_quantity, tc_sum.credits_remaining, pl.overage_rate_zar;

CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_current_period_pk
  ON usage_current_period (organization_id, dimension);

-- ============================================================================
-- MATERIALIZED VIEW: Hourly usage aggregation
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS usage_hourly AS
SELECT
  organization_id,
  dimension,
  module,
  date_trunc('hour', created_at) AS hour,
  SUM(quantity)::INTEGER AS total_quantity,
  COUNT(*)::INTEGER AS event_count
FROM usage_events
GROUP BY organization_id, dimension, module, date_trunc('hour', created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_hourly_pk
  ON usage_hourly (organization_id, dimension, module, hour);

-- ============================================================================
-- FUNCTION: Seed usage alert rows for a new billing period
-- Called when a subscription resets its billing cycle
-- ============================================================================

CREATE OR REPLACE FUNCTION seed_usage_alerts(
  p_organization_id UUID,
  p_billing_period DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  dim_record RECORD;
BEGIN
  -- For each dimension in the org's plan, create alert rows at 50, 75, 90, 100%
  FOR dim_record IN
    SELECT pl.dimension
    FROM tenant_subscriptions ts
    JOIN plan_limits pl ON pl.plan_id = ts.plan_id
    WHERE ts.organization_id = p_organization_id
      AND ts.status IN ('active', 'trialing')
  LOOP
    INSERT INTO usage_alerts (organization_id, dimension, threshold_percent, billing_period)
    VALUES
      (p_organization_id, dim_record.dimension, 50, p_billing_period),
      (p_organization_id, dim_record.dimension, 75, p_billing_period),
      (p_organization_id, dim_record.dimension, 90, p_billing_period),
      (p_organization_id, dim_record.dimension, 100, p_billing_period)
    ON CONFLICT (organization_id, dimension, threshold_percent, billing_period) DO NOTHING;
  END LOOP;
END;
$$;

-- ============================================================================
-- END OF CREDITS AND ALERTS
-- ============================================================================
