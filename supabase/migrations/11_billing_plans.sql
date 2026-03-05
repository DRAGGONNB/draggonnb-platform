-- ============================================================================
-- Migration: Billing Plans - DB-backed plan catalog and invoicing
-- Created: 2026-03-02
-- Purpose: Replace hardcoded PRICING_TIERS with DB tables, add invoicing
--          and plan change audit trail for multi-tenant billing
--
-- Dependencies:
--   - 00_initial_schema.sql (organizations, update_updated_at_column)
--   - 10_shared_db_foundation.sql (get_user_org_id)
--
-- INSTRUCTIONS:
-- 1. Login to Supabase Dashboard: https://supabase.com/dashboard/project/psqfgzbjbgqrmjskdavs
-- 2. Navigate to: SQL Editor
-- 3. Copy this entire file contents
-- 4. Paste into SQL Editor
-- 5. Click "Run" to execute
-- ============================================================================

-- ============================================================================
-- TABLE 1: BILLING_PLANS - Plan Catalog
-- ============================================================================
-- Replaces the hardcoded PRICING_TIERS constant in lib/payments/payfast.ts
-- with a DB-backed plan catalog. Prices stored in cents (ZAR).

CREATE TABLE IF NOT EXISTS billing_plans (
  id TEXT PRIMARY KEY,                 -- 'core', 'growth', 'scale'
  display_name TEXT NOT NULL,
  description TEXT,
  price_zar INTEGER NOT NULL,          -- price in cents (150000 = R1,500)
  frequency TEXT NOT NULL DEFAULT 'monthly'
    CHECK (frequency IN ('monthly', 'annual')),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]', -- array of feature strings
  limits JSONB NOT NULL DEFAULT '{}',   -- { social_posts, ai_generations, email_sends, ... }
  payfast_item_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- TABLE 2: BILLING_INVOICES - Invoice Records Per Tenant
-- ============================================================================
-- Tracks invoices issued to each organization. Amounts in cents (ZAR).

CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL,  -- 'INV-2026-0001'
  plan_id TEXT REFERENCES billing_plans(id),
  amount_zar INTEGER NOT NULL,          -- cents
  tax_zar INTEGER DEFAULT 0,            -- VAT in cents (15% in SA)
  total_zar INTEGER NOT NULL,           -- amount + tax in cents
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'issued', 'paid', 'overdue', 'cancelled', 'refunded')),
  issued_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  due_date DATE,
  payfast_payment_id TEXT,
  line_items JSONB DEFAULT '[]',        -- [{description, quantity, unit_price_zar, total_zar}]
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- TABLE 3: BILLING_PLAN_CHANGES - Audit Trail for Plan Upgrades/Downgrades
-- ============================================================================
-- Records every plan change per organization for billing audit purposes.

CREATE TABLE IF NOT EXISTS billing_plan_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_plan_id TEXT REFERENCES billing_plans(id),
  to_plan_id TEXT NOT NULL REFERENCES billing_plans(id),
  changed_by UUID REFERENCES auth.users(id),
  reason TEXT,
  effective_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SCHEMA ALTERATION: Add plan_id to organizations
-- ============================================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_id TEXT REFERENCES billing_plans(id) DEFAULT 'core';

-- ============================================================================
-- SEQUENCE + FUNCTION: Auto-incrementing invoice numbers
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('invoice_number_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION generate_invoice_number() IS
  'Generates sequential invoice numbers in the format INV-YYYY-NNNN. '
  'Uses invoice_number_seq sequence for the numeric portion.';

-- ============================================================================
-- SEED DATA: Billing Plans
-- ============================================================================
-- Matches the canonical tier definitions from lib/payments/payfast.ts

INSERT INTO billing_plans (id, display_name, description, price_zar, frequency, sort_order, features, limits, payfast_item_code) VALUES
  (
    'core',
    'Core',
    'Essential CRM, email, and social tools for small businesses',
    150000,
    'monthly',
    1,
    '[
      "Social CRM (contacts, companies, deals pipeline)",
      "Complete email management (campaigns, sequences, templates, tracking)",
      "1 custom business automation",
      "30 social posts per month",
      "50 AI content generations",
      "1,000 emails per month",
      "3 social accounts",
      "2 team users"
    ]'::jsonb,
    '{"social_posts": 30, "ai_generations": 50, "email_sends": 1000, "social_accounts": 3, "team_users": 2, "custom_automations": 1, "ai_agents": 0, "agent_invocations": 0}'::jsonb,
    'DRG-CORE'
  ),
  (
    'growth',
    'Growth',
    'Advanced automation and AI content for growing teams',
    350000,
    'monthly',
    2,
    '[
      "Everything in Core, plus:",
      "3+ business automations from template library",
      "AI content generation for all channels",
      "Advanced email automation (behavioral triggers, A/B testing, smart segmentation)",
      "Smart lead pipeline (social engagement to CRM to automated nurture)",
      "100 social posts per month",
      "200 AI content generations",
      "10,000 emails per month",
      "10 social accounts",
      "5 team users"
    ]'::jsonb,
    '{"social_posts": 100, "ai_generations": 200, "email_sends": 10000, "social_accounts": 10, "team_users": 5, "custom_automations": 3, "ai_agents": 0, "agent_invocations": 0}'::jsonb,
    'DRG-GROWTH'
  ),
  (
    'scale',
    'Scale',
    'White label platform with AI agents for agencies and enterprises',
    750000,
    'monthly',
    3,
    '[
      "Everything in Growth, plus:",
      "White label (custom domain, branding, remove DraggonnB branding)",
      "AI agents for client operations (customer support bot, lead responder, content autopilot)",
      "Unlimited social posts, AI generations, emails",
      "Unlimited social accounts and team users",
      "API access and custom integrations",
      "3 AI agents included (1,000 invocations/month)"
    ]'::jsonb,
    '{"social_posts": -1, "ai_generations": -1, "email_sends": -1, "social_accounts": -1, "team_users": -1, "custom_automations": -1, "ai_agents": 3, "agent_invocations": 1000}'::jsonb,
    'DRG-SCALE'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_billing_invoices_org
  ON billing_invoices(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_status
  ON billing_invoices(status);

CREATE INDEX IF NOT EXISTS idx_billing_plan_changes_org
  ON billing_plan_changes(organization_id, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- billing_plans: public read for authenticated, service_role write
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_plans_select" ON billing_plans
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "billing_plans_service_role" ON billing_plans
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

ALTER TABLE billing_plans FORCE ROW LEVEL SECURITY;

-- billing_invoices: org-scoped read, service_role full access
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_invoices_select" ON billing_invoices
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));

CREATE POLICY "billing_invoices_service_role" ON billing_invoices
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

ALTER TABLE billing_invoices FORCE ROW LEVEL SECURITY;

-- billing_plan_changes: org-scoped read, service_role full access
ALTER TABLE billing_plan_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_plan_changes_select" ON billing_plan_changes
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));

CREATE POLICY "billing_plan_changes_service_role" ON billing_plan_changes
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

ALTER TABLE billing_plan_changes FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_billing_plans_updated_at BEFORE UPDATE ON billing_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_invoices_updated_at BEFORE UPDATE ON billing_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  -- Verify billing_plans has 3 rows
  IF (SELECT count(*) FROM billing_plans) = 3 THEN
    RAISE NOTICE 'billing_plans seeded with 3 plans (core, growth, scale)';
  ELSE
    RAISE EXCEPTION 'billing_plans expected 3 rows, found %', (SELECT count(*) FROM billing_plans);
  END IF;

  -- Verify billing_invoices table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'billing_invoices') THEN
    RAISE NOTICE 'billing_invoices table created successfully';
  ELSE
    RAISE EXCEPTION 'billing_invoices table NOT found';
  END IF;

  -- Verify billing_plan_changes table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'billing_plan_changes') THEN
    RAISE NOTICE 'billing_plan_changes table created successfully';
  ELSE
    RAISE EXCEPTION 'billing_plan_changes table NOT found';
  END IF;

  -- Verify organizations.plan_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'plan_id'
  ) THEN
    RAISE NOTICE 'plan_id column added to organizations';
  ELSE
    RAISE EXCEPTION 'plan_id column NOT found on organizations';
  END IF;

  RAISE NOTICE 'Migration 11_billing_plans completed successfully';
END;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
