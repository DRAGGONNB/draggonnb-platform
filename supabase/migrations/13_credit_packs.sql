-- ============================================================================
-- Migration: Credit Packs / Top-Up Purchasing
-- Created: 2026-03-02
-- Purpose: Add credit/top-up pack purchasing for usage beyond plan limits
--
-- What this migration does:
-- 1. Creates credit_pack_catalog table (available packs for purchase)
-- 2. Creates credit_purchases table (per-org purchase records)
-- 3. Creates credit_ledger table (debit/credit log for pack usage)
-- 4. Creates consume_credits() RPC (FIFO consumption across packs)
-- 5. Creates get_credit_balances() RPC (active balances per metric)
-- 6. Adds indexes for performant org-scoped queries
-- 7. Applies RLS policies + FORCE ROW LEVEL SECURITY on all tables
--
-- Dependencies:
-- - organizations table (00_initial_schema)
-- - billing_plans table (migration 11)
-- - usage_events table (migration 12)
-- - get_user_org_id() function (10_shared_db_foundation)
-- ============================================================================

-- ============================================================================
-- STEP 1: credit_pack_catalog - Available credit packs for purchase
-- ============================================================================
-- Global catalog of purchasable credit packs. Read-only for clients,
-- managed by service_role. Packs map to usage metrics and have ZAR pricing.

CREATE TABLE IF NOT EXISTS credit_pack_catalog (
  id TEXT PRIMARY KEY,                  -- 'ai-50', 'posts-100', 'emails-5k'
  display_name TEXT NOT NULL,
  description TEXT,
  metric TEXT NOT NULL,                 -- 'ai_generations', 'social_posts', 'email_sends', 'agent_invocations'
  credit_amount INTEGER NOT NULL,       -- how many credits this pack gives
  price_zar INTEGER NOT NULL,           -- price in cents (ZAR)
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  min_tier TEXT,                        -- minimum tier required to purchase (NULL = any tier)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed credit pack catalog
INSERT INTO credit_pack_catalog (id, display_name, description, metric, credit_amount, price_zar, sort_order, min_tier) VALUES
  ('ai-50',      '50 AI Generations',      '50 additional AI generation credits',        'ai_generations',      50,    15000, 10, NULL),
  ('ai-200',     '200 AI Generations',      '200 additional AI generation credits',       'ai_generations',      200,   45000, 20, NULL),
  ('posts-50',   '50 Social Posts',         '50 additional social media post credits',    'social_posts',        50,    20000, 30, NULL),
  ('posts-200',  '200 Social Posts',        '200 additional social media post credits',   'social_posts',        200,   60000, 40, NULL),
  ('emails-5k',  '5,000 Emails',            '5,000 additional email send credits',        'email_sends',         5000,  25000, 50, NULL),
  ('emails-20k', '20,000 Emails',           '20,000 additional email send credits',       'email_sends',         20000, 75000, 60, NULL),
  ('agents-500', '500 Agent Invocations',   '500 additional agent invocation credits',    'agent_invocations',   500,   50000, 70, 'scale')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 2: credit_purchases - Record of purchased credit packs per org
-- ============================================================================
-- Each row represents a single pack purchase. credits_remaining decrements
-- as usage is consumed via consume_credits(). Status transitions:
-- pending -> active -> depleted (or expired/refunded)

CREATE TABLE IF NOT EXISTS credit_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL REFERENCES credit_pack_catalog(id),
  metric TEXT NOT NULL,
  credits_purchased INTEGER NOT NULL,
  credits_remaining INTEGER NOT NULL,   -- decrements as used
  price_zar INTEGER NOT NULL,
  payfast_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'depleted', 'expired', 'refunded')),
  purchased_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,               -- NULL = never expires, or set to end of billing cycle
  depleted_at TIMESTAMPTZ
);

-- ============================================================================
-- STEP 3: credit_ledger - Debit/credit log for pack usage
-- ============================================================================
-- Immutable audit trail. Every consumption or refund creates a ledger entry.
-- amount: negative = debit (usage), positive = credit (purchase/refund)

CREATE TABLE IF NOT EXISTS credit_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES credit_purchases(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  amount INTEGER NOT NULL,              -- negative = debit (usage), positive = credit (purchase/refund)
  balance_after INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- STEP 4: Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_credit_purchases_org
  ON credit_purchases(organization_id, status, metric);

CREATE INDEX IF NOT EXISTS idx_credit_purchases_active
  ON credit_purchases(organization_id, metric)
  WHERE status = 'active' AND credits_remaining > 0;

CREATE INDEX IF NOT EXISTS idx_credit_ledger_org
  ON credit_ledger(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_purchase
  ON credit_ledger(purchase_id);

-- ============================================================================
-- STEP 5: RPC function - consume_credits
-- ============================================================================
-- Called when usage exceeds plan limits but org has credit packs.
-- Consumes credits FIFO (oldest pack first), spanning multiple packs if needed.
-- Returns JSON with consumption result.

CREATE OR REPLACE FUNCTION consume_credits(
  p_org_id UUID,
  p_metric TEXT,
  p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase RECORD;
  v_to_consume INTEGER := p_quantity;
  v_consumed INTEGER := 0;
  v_remaining INTEGER;
BEGIN
  -- Find active credit packs for this metric, FIFO (oldest first)
  FOR v_purchase IN
    SELECT id, credits_remaining
    FROM credit_purchases
    WHERE organization_id = p_org_id
      AND metric = p_metric
      AND status = 'active'
      AND credits_remaining > 0
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY purchased_at ASC
  LOOP
    IF v_to_consume <= 0 THEN EXIT; END IF;

    -- Consume from this pack
    IF v_purchase.credits_remaining >= v_to_consume THEN
      -- This pack covers it fully
      UPDATE credit_purchases
        SET credits_remaining = credits_remaining - v_to_consume,
            status = CASE WHEN credits_remaining - v_to_consume = 0 THEN 'depleted' ELSE 'active' END,
            depleted_at = CASE WHEN credits_remaining - v_to_consume = 0 THEN now() ELSE NULL END
        WHERE id = v_purchase.id;

      INSERT INTO credit_ledger (organization_id, purchase_id, metric, amount, balance_after, description)
      VALUES (p_org_id, v_purchase.id, p_metric, -v_to_consume, v_purchase.credits_remaining - v_to_consume, 'Usage consumption');

      v_consumed := v_consumed + v_to_consume;
      v_to_consume := 0;
    ELSE
      -- Partial: use all remaining in this pack
      v_consumed := v_consumed + v_purchase.credits_remaining;
      v_to_consume := v_to_consume - v_purchase.credits_remaining;

      INSERT INTO credit_ledger (organization_id, purchase_id, metric, amount, balance_after, description)
      VALUES (p_org_id, v_purchase.id, p_metric, -v_purchase.credits_remaining, 0, 'Usage consumption (pack depleted)');

      UPDATE credit_purchases
        SET credits_remaining = 0,
            status = 'depleted',
            depleted_at = now()
        WHERE id = v_purchase.id;
    END IF;
  END LOOP;

  -- Get total remaining credits for this metric
  SELECT COALESCE(SUM(credits_remaining), 0) INTO v_remaining
    FROM credit_purchases
    WHERE organization_id = p_org_id
      AND metric = p_metric
      AND status = 'active';

  RETURN jsonb_build_object(
    'consumed', v_consumed > 0,
    'credits_used', v_consumed,
    'credits_requested', p_quantity,
    'remaining', v_remaining
  );
END;
$$;

COMMENT ON FUNCTION consume_credits(UUID, TEXT, INTEGER) IS
  'Consumes credit pack credits for an org/metric. FIFO across packs. '
  'Returns JSON: {consumed, credits_used, credits_requested, remaining}.';

-- ============================================================================
-- STEP 6: RPC function - get_credit_balances
-- ============================================================================
-- Returns all active credit balances per metric for an organization.
-- Used by the billing dashboard and usage enforcement middleware.

CREATE OR REPLACE FUNCTION get_credit_balances(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Group active credit purchases by metric, sum remaining credits
  SELECT COALESCE(
    jsonb_object_agg(metric, total_remaining),
    '{}'::JSONB
  ) INTO v_result
  FROM (
    SELECT metric, SUM(credits_remaining) AS total_remaining
    FROM credit_purchases
    WHERE organization_id = p_org_id
      AND status = 'active'
      AND credits_remaining > 0
      AND (expires_at IS NULL OR expires_at > now())
    GROUP BY metric
  ) AS balances;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_credit_balances(UUID) IS
  'Returns active credit balances per metric for an org. '
  'Example: {"ai_generations": 150, "email_sends": 5000}';

-- ============================================================================
-- STEP 7: RLS Policies
-- ============================================================================

-- ---------------------------------------------------------------
-- 7a. credit_pack_catalog: public read for authenticated, service_role write
-- ---------------------------------------------------------------
ALTER TABLE credit_pack_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_pack_catalog_select" ON credit_pack_catalog
  FOR SELECT USING (true);

CREATE POLICY "credit_pack_catalog_service_role" ON credit_pack_catalog
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE credit_pack_catalog FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 7b. credit_purchases: org-scoped read, service_role full access
-- ---------------------------------------------------------------
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_purchases_select" ON credit_purchases
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));

CREATE POLICY "credit_purchases_service_role" ON credit_purchases
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE credit_purchases FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 7c. credit_ledger: org-scoped read, service_role full access
-- ---------------------------------------------------------------
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_ledger_select" ON credit_ledger
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));

CREATE POLICY "credit_ledger_service_role" ON credit_ledger
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE credit_ledger FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  -- Verify credit_pack_catalog has 7 seed rows
  IF (SELECT count(*) FROM credit_pack_catalog) = 7 THEN
    RAISE NOTICE 'credit_pack_catalog seeded with 7 packs';
  ELSE
    RAISE EXCEPTION 'credit_pack_catalog expected 7 rows, got %', (SELECT count(*) FROM credit_pack_catalog);
  END IF;

  -- Verify credit_purchases table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_purchases') THEN
    RAISE NOTICE 'credit_purchases table created successfully';
  ELSE
    RAISE EXCEPTION 'credit_purchases table NOT found';
  END IF;

  -- Verify credit_ledger table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_ledger') THEN
    RAISE NOTICE 'credit_ledger table created successfully';
  ELSE
    RAISE EXCEPTION 'credit_ledger table NOT found';
  END IF;

  -- Verify consume_credits function exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'consume_credits') THEN
    RAISE NOTICE 'consume_credits() function created successfully';
  ELSE
    RAISE EXCEPTION 'consume_credits() function NOT found';
  END IF;

  -- Verify get_credit_balances function exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_credit_balances') THEN
    RAISE NOTICE 'get_credit_balances() function created successfully';
  ELSE
    RAISE EXCEPTION 'get_credit_balances() function NOT found';
  END IF;

  RAISE NOTICE 'Migration 13_credit_packs completed successfully';
END;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
