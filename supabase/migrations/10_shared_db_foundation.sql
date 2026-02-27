-- ============================================================================
-- Migration: Shared DB Foundation
-- Created: 2026-02-27
-- Purpose: Convert from per-client Supabase isolation to shared DB + RLS
--
-- What this migration does:
-- 1. Creates get_user_org_id() helper function for fast RLS evaluation
-- 2. Adds subdomain column to organizations
-- 3. Creates module_registry and tenant_modules tables
-- 4. Adds composite indexes on all org-scoped tables
-- 5. Rewrites ALL RLS policies to use optimized get_user_org_id() pattern
-- 6. Applies FORCE ROW LEVEL SECURITY on all tenant-scoped tables
--
-- IMPORTANT: Take a Supabase backup before running this migration.
-- ============================================================================

-- ============================================================================
-- STEP 1: get_user_org_id() helper function
-- ============================================================================
-- STABLE = PostgreSQL caches the result within a single query/statement
-- SECURITY DEFINER = runs with the privileges of the function creator
-- This replaces the slow subquery pattern:
--   organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
-- With the fast scalar pattern:
--   organization_id = (SELECT public.get_user_org_id())

CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_user_org_id() IS
  'Returns the organization_id for the current authenticated user. '
  'Marked STABLE so PostgreSQL caches the result within a single query. '
  'Used in all RLS policies for fast tenant isolation.';

-- ============================================================================
-- STEP 2: Add subdomain column to organizations
-- ============================================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_organizations_subdomain ON organizations(subdomain) WHERE subdomain IS NOT NULL;

-- ============================================================================
-- STEP 3: Module Registry + Tenant Modules
-- ============================================================================

-- Global module catalog (seeded, read-only for clients)
CREATE TABLE IF NOT EXISTS module_registry (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  min_tier TEXT NOT NULL DEFAULT 'core',
  routes TEXT[] NOT NULL DEFAULT '{}',
  tables TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Per-tenant module activation
CREATE TABLE IF NOT EXISTS tenant_modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL REFERENCES module_registry(id),
  is_enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  enabled_at TIMESTAMPTZ DEFAULT now(),
  disabled_at TIMESTAMPTZ,
  UNIQUE(organization_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_modules_org ON tenant_modules(organization_id);
CREATE INDEX IF NOT EXISTS idx_tenant_modules_module ON tenant_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_tenant_modules_enabled ON tenant_modules(organization_id, module_id) WHERE is_enabled = true;

-- Seed module registry
INSERT INTO module_registry (id, display_name, description, min_tier, routes, tables) VALUES
  ('crm', 'CRM', 'Contacts, companies, deals pipeline', 'core',
   ARRAY['/crm', '/api/crm'], ARRAY['contacts', 'companies', 'deals']),
  ('email', 'Email Marketing', 'Campaigns, sequences, templates', 'core',
   ARRAY['/email', '/api/email'], ARRAY['email_templates', 'email_campaigns', 'email_sequences', 'email_sends']),
  ('social', 'Social Media', 'Account management and publishing', 'growth',
   ARRAY['/social', '/api/social'], ARRAY['social_accounts', 'social_posts', 'content_queue']),
  ('content_studio', 'Content Studio', 'AI content generation and scheduling', 'growth',
   ARRAY['/content-generator', '/api/content'], ARRAY['content_queue']),
  ('accommodation', 'Accommodation', 'Property management, bookings, payments', 'growth',
   ARRAY['/accommodation', '/api/accommodation'], ARRAY['accommodation_properties', 'accommodation_units', 'accommodation_bookings']),
  ('ai_agents', 'AI Agents', 'Business autopilot and intelligent automation', 'core',
   ARRAY['/autopilot', '/api/autopilot'], ARRAY['agent_sessions', 'client_profiles']),
  ('analytics', 'Analytics', 'Performance dashboards and reports', 'core',
   ARRAY['/analytics', '/api/analytics'], ARRAY['analytics_snapshots', 'platform_metrics'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 4: Composite Indexes for org-scoped queries
-- ============================================================================
-- Pattern: (organization_id, created_at DESC) for fast "list my org's stuff"

-- Core tables
CREATE INDEX IF NOT EXISTS idx_users_org_created ON users(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_org ON client_usage_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_org_created ON social_posts(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_org_created ON analytics_snapshots(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_org_created ON platform_metrics(organization_id, created_at DESC);

-- Email tables
CREATE INDEX IF NOT EXISTS idx_email_templates_org_created ON email_templates(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_org_created ON email_campaigns(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_sequences_org_created ON email_sequences(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_sends_org_created ON email_sends(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_org_created ON sequence_enrollments(organization_id, enrolled_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_rules_org_created ON outreach_rules(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_org_created ON email_unsubscribes(organization_id, unsubscribed_at DESC);

-- CRM tables
CREATE INDEX IF NOT EXISTS idx_companies_org_created ON companies(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_org_created ON contacts(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_org_created ON deals(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_queue_org_created ON content_queue(organization_id, created_at DESC);

-- Social
CREATE INDEX IF NOT EXISTS idx_social_accounts_org_created ON social_accounts(organization_id, created_at DESC);

-- Leads & agents
CREATE INDEX IF NOT EXISTS idx_agent_sessions_org_created ON agent_sessions(organization_id, created_at DESC);

-- Autopilot
CREATE INDEX IF NOT EXISTS idx_client_profiles_org ON client_profiles(organization_id);

-- Accommodation tables
CREATE INDEX IF NOT EXISTS idx_accom_rooms_org_created ON accommodation_rooms(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accom_amenities_org ON accommodation_amenities(organization_id);
CREATE INDEX IF NOT EXISTS idx_accom_unit_amenities_org ON accommodation_unit_amenities(organization_id);
CREATE INDEX IF NOT EXISTS idx_accom_images_org_created ON accommodation_images(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accom_rate_plans_org ON accommodation_rate_plans(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accom_rate_prices_org ON accommodation_rate_plan_prices(organization_id);
CREATE INDEX IF NOT EXISTS idx_accom_discounts_org ON accommodation_discounts(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accom_fees_org ON accommodation_fees(organization_id);
CREATE INDEX IF NOT EXISTS idx_accom_cancel_policies_org ON accommodation_cancellation_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_accom_bookings_org_created ON accommodation_bookings(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accom_booking_segments_org ON accommodation_booking_segments(organization_id);
CREATE INDEX IF NOT EXISTS idx_accom_booking_party_org ON accommodation_booking_party(organization_id);
CREATE INDEX IF NOT EXISTS idx_accom_charge_items_org ON accommodation_charge_line_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_accom_avail_blocks_org ON accommodation_availability_blocks(organization_id);
CREATE INDEX IF NOT EXISTS idx_accom_invoices_org ON accommodation_invoices(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accom_payments_org ON accommodation_payment_transactions(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accom_pay_alloc_org ON accommodation_payment_allocations(organization_id);
CREATE INDEX IF NOT EXISTS idx_accom_platform_fees_org ON accommodation_platform_fees(organization_id);
CREATE INDEX IF NOT EXISTS idx_accom_op_payables_org ON accommodation_operator_payables(organization_id);
CREATE INDEX IF NOT EXISTS idx_accom_pay_provider_org ON accommodation_payment_provider_config(organization_id);
CREATE INDEX IF NOT EXISTS idx_accom_readiness_org ON accommodation_readiness_status(organization_id);
CREATE INDEX IF NOT EXISTS idx_accom_checklist_tmpl_org ON accommodation_checklist_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_accom_checklist_inst_org ON accommodation_checklist_instances(organization_id);
CREATE INDEX IF NOT EXISTS idx_accom_issues_org ON accommodation_issues(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accom_tasks_org ON accommodation_tasks(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accom_access_tmpl_org ON accommodation_access_pack_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_accom_access_inst_org ON accommodation_access_pack_instances(organization_id);
CREATE INDEX IF NOT EXISTS idx_accom_waivers_org ON accommodation_waivers(organization_id);
CREATE INDEX IF NOT EXISTS idx_accom_waiver_accept_org ON accommodation_waiver_acceptances(organization_id);
CREATE INDEX IF NOT EXISTS idx_accom_service_catalog_org ON accommodation_service_catalog(organization_id);
CREATE INDEX IF NOT EXISTS idx_accom_addon_orders_org ON accommodation_addon_orders(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accom_comms_org ON accommodation_comms_timeline(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accom_prop_config_org ON accommodation_property_config(organization_id);
CREATE INDEX IF NOT EXISTS idx_accom_deposit_pol_org ON accommodation_deposit_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_accom_email_tmpl_org ON accommodation_email_templates(organization_id);

-- ============================================================================
-- STEP 5: Rewrite ALL RLS Policies
-- ============================================================================
-- Replace slow subquery pattern with fast get_user_org_id() scalar

-- ---------------------------------------------------------------
-- 5a. ORGANIZATIONS (special: id = get_user_org_id, not organization_id)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own organization" ON organizations;
DROP POLICY IF EXISTS "Admins can update own organization" ON organizations;
DROP POLICY IF EXISTS "Service role full access to organizations" ON organizations;

CREATE POLICY "org_select" ON organizations
  FOR SELECT USING (id = (SELECT public.get_user_org_id()));

CREATE POLICY "org_update_admin" ON organizations
  FOR UPDATE USING (
    id = (SELECT public.get_user_org_id())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "org_service_role" ON organizations
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

ALTER TABLE organizations FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 5b. USERS (special: own profile update + org member view)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view org members" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage org users" ON users;
DROP POLICY IF EXISTS "Service role full access to users" ON users;

CREATE POLICY "users_select" ON users
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));

CREATE POLICY "users_update_self" ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "users_admin_manage" ON users
  FOR ALL USING (
    organization_id = (SELECT public.get_user_org_id())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "users_service_role" ON users
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 5c. CLIENT_USAGE_METRICS
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view org usage metrics" ON client_usage_metrics;
DROP POLICY IF EXISTS "Service role can update usage metrics" ON client_usage_metrics;

CREATE POLICY "usage_metrics_select" ON client_usage_metrics
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));

CREATE POLICY "usage_metrics_service_role" ON client_usage_metrics
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

ALTER TABLE client_usage_metrics FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 5d. SUBSCRIPTION_HISTORY
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view org subscription history" ON subscription_history;
DROP POLICY IF EXISTS "Service role can manage subscription history" ON subscription_history;

CREATE POLICY "subscription_history_select" ON subscription_history
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));

CREATE POLICY "subscription_history_service_role" ON subscription_history
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

ALTER TABLE subscription_history FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 5e. SOCIAL_POSTS
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view org posts" ON social_posts;
DROP POLICY IF EXISTS "Users can create org posts" ON social_posts;
DROP POLICY IF EXISTS "Users can update org posts" ON social_posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON social_posts;
DROP POLICY IF EXISTS "Service role full access to posts" ON social_posts;

CREATE POLICY "social_posts_select" ON social_posts
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));

CREATE POLICY "social_posts_insert" ON social_posts
  FOR INSERT WITH CHECK (organization_id = (SELECT public.get_user_org_id()));

CREATE POLICY "social_posts_update" ON social_posts
  FOR UPDATE USING (organization_id = (SELECT public.get_user_org_id()));

CREATE POLICY "social_posts_delete" ON social_posts
  FOR DELETE USING (
    created_by = auth.uid()
    OR (organization_id = (SELECT public.get_user_org_id())
        AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')))
  );

CREATE POLICY "social_posts_service_role" ON social_posts
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

ALTER TABLE social_posts FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 5f. ANALYTICS_SNAPSHOTS
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view org analytics" ON analytics_snapshots;
DROP POLICY IF EXISTS "Service role can manage analytics" ON analytics_snapshots;

CREATE POLICY "analytics_select" ON analytics_snapshots
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));

CREATE POLICY "analytics_service_role" ON analytics_snapshots
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

ALTER TABLE analytics_snapshots FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 5g. PLATFORM_METRICS
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view org platform metrics" ON platform_metrics;
DROP POLICY IF EXISTS "Service role can manage platform metrics" ON platform_metrics;

CREATE POLICY "platform_metrics_select" ON platform_metrics
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));

CREATE POLICY "platform_metrics_service_role" ON platform_metrics
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

ALTER TABLE platform_metrics FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 5h. EMAIL TABLES (8 tables)
-- ---------------------------------------------------------------

-- email_templates
DROP POLICY IF EXISTS "Users can view own org templates" ON email_templates;
DROP POLICY IF EXISTS "Users can create templates for own org" ON email_templates;
DROP POLICY IF EXISTS "Users can update own org templates" ON email_templates;
DROP POLICY IF EXISTS "Users can delete own org templates" ON email_templates;
DROP POLICY IF EXISTS "Service role full access templates" ON email_templates;

CREATE POLICY "email_templates_select" ON email_templates
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "email_templates_insert" ON email_templates
  FOR INSERT WITH CHECK (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "email_templates_update" ON email_templates
  FOR UPDATE USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "email_templates_delete" ON email_templates
  FOR DELETE USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "email_templates_service_role" ON email_templates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE email_templates FORCE ROW LEVEL SECURITY;

-- email_campaigns
DROP POLICY IF EXISTS "Users can view own org campaigns" ON email_campaigns;
DROP POLICY IF EXISTS "Users can create campaigns for own org" ON email_campaigns;
DROP POLICY IF EXISTS "Users can update own org campaigns" ON email_campaigns;
DROP POLICY IF EXISTS "Users can delete own org campaigns" ON email_campaigns;
DROP POLICY IF EXISTS "Service role full access campaigns" ON email_campaigns;

CREATE POLICY "email_campaigns_select" ON email_campaigns
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "email_campaigns_insert" ON email_campaigns
  FOR INSERT WITH CHECK (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "email_campaigns_update" ON email_campaigns
  FOR UPDATE USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "email_campaigns_delete" ON email_campaigns
  FOR DELETE USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "email_campaigns_service_role" ON email_campaigns
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE email_campaigns FORCE ROW LEVEL SECURITY;

-- email_sequences
DROP POLICY IF EXISTS "Users can view own org sequences" ON email_sequences;
DROP POLICY IF EXISTS "Users can create sequences for own org" ON email_sequences;
DROP POLICY IF EXISTS "Users can update own org sequences" ON email_sequences;
DROP POLICY IF EXISTS "Users can delete own org sequences" ON email_sequences;
DROP POLICY IF EXISTS "Service role full access sequences" ON email_sequences;

CREATE POLICY "email_sequences_select" ON email_sequences
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "email_sequences_insert" ON email_sequences
  FOR INSERT WITH CHECK (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "email_sequences_update" ON email_sequences
  FOR UPDATE USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "email_sequences_delete" ON email_sequences
  FOR DELETE USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "email_sequences_service_role" ON email_sequences
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE email_sequences FORCE ROW LEVEL SECURITY;

-- email_sequence_steps (joined through email_sequences)
DROP POLICY IF EXISTS "Users can view steps of own sequences" ON email_sequence_steps;
DROP POLICY IF EXISTS "Users can manage steps of own sequences" ON email_sequence_steps;
DROP POLICY IF EXISTS "Service role full access steps" ON email_sequence_steps;

CREATE POLICY "sequence_steps_select" ON email_sequence_steps
  FOR SELECT USING (sequence_id IN (
    SELECT id FROM email_sequences WHERE organization_id = (SELECT public.get_user_org_id())
  ));
CREATE POLICY "sequence_steps_all" ON email_sequence_steps
  FOR ALL USING (sequence_id IN (
    SELECT id FROM email_sequences WHERE organization_id = (SELECT public.get_user_org_id())
  ));
CREATE POLICY "sequence_steps_service_role" ON email_sequence_steps
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE email_sequence_steps FORCE ROW LEVEL SECURITY;

-- email_sends
DROP POLICY IF EXISTS "Users can view own org sends" ON email_sends;
DROP POLICY IF EXISTS "Service role full access sends" ON email_sends;

CREATE POLICY "email_sends_select" ON email_sends
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "email_sends_service_role" ON email_sends
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE email_sends FORCE ROW LEVEL SECURITY;

-- sequence_enrollments
DROP POLICY IF EXISTS "Users can view own org enrollments" ON sequence_enrollments;
DROP POLICY IF EXISTS "Service role full access enrollments" ON sequence_enrollments;

CREATE POLICY "enrollments_select" ON sequence_enrollments
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "enrollments_service_role" ON sequence_enrollments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE sequence_enrollments FORCE ROW LEVEL SECURITY;

-- outreach_rules
DROP POLICY IF EXISTS "Users can view own org rules" ON outreach_rules;
DROP POLICY IF EXISTS "Users can manage own org rules" ON outreach_rules;
DROP POLICY IF EXISTS "Service role full access rules" ON outreach_rules;

CREATE POLICY "outreach_rules_select" ON outreach_rules
  FOR SELECT USING (
    organization_id IS NULL
    OR organization_id = (SELECT public.get_user_org_id())
  );
CREATE POLICY "outreach_rules_manage" ON outreach_rules
  FOR ALL USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "outreach_rules_service_role" ON outreach_rules
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE outreach_rules FORCE ROW LEVEL SECURITY;

-- email_unsubscribes
DROP POLICY IF EXISTS "Users can view own org unsubscribes" ON email_unsubscribes;
DROP POLICY IF EXISTS "Users can manage own org unsubscribes" ON email_unsubscribes;
DROP POLICY IF EXISTS "Service role full access unsubscribes" ON email_unsubscribes;

CREATE POLICY "unsubscribes_select" ON email_unsubscribes
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "unsubscribes_manage" ON email_unsubscribes
  FOR ALL USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "unsubscribes_service_role" ON email_unsubscribes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE email_unsubscribes FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 5i. CRM TABLES (4 tables)
-- ---------------------------------------------------------------

-- companies
DROP POLICY IF EXISTS "Users can view companies in their organization" ON companies;
DROP POLICY IF EXISTS "Users can insert companies in their organization" ON companies;
DROP POLICY IF EXISTS "Users can update companies in their organization" ON companies;
DROP POLICY IF EXISTS "Users can delete companies in their organization" ON companies;
DROP POLICY IF EXISTS "Service role has full access to companies" ON companies;

CREATE POLICY "companies_select" ON companies
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "companies_insert" ON companies
  FOR INSERT WITH CHECK (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "companies_update" ON companies
  FOR UPDATE USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "companies_delete" ON companies
  FOR DELETE USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "companies_service_role" ON companies
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

ALTER TABLE companies FORCE ROW LEVEL SECURITY;

-- contacts
DROP POLICY IF EXISTS "Users can view contacts in their organization" ON contacts;
DROP POLICY IF EXISTS "Users can insert contacts in their organization" ON contacts;
DROP POLICY IF EXISTS "Users can update contacts in their organization" ON contacts;
DROP POLICY IF EXISTS "Users can delete contacts in their organization" ON contacts;
DROP POLICY IF EXISTS "Service role has full access to contacts" ON contacts;

CREATE POLICY "contacts_select" ON contacts
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "contacts_insert" ON contacts
  FOR INSERT WITH CHECK (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "contacts_update" ON contacts
  FOR UPDATE USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "contacts_delete" ON contacts
  FOR DELETE USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "contacts_service_role" ON contacts
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

ALTER TABLE contacts FORCE ROW LEVEL SECURITY;

-- deals
DROP POLICY IF EXISTS "Users can view deals in their organization" ON deals;
DROP POLICY IF EXISTS "Users can insert deals in their organization" ON deals;
DROP POLICY IF EXISTS "Users can update deals in their organization" ON deals;
DROP POLICY IF EXISTS "Users can delete deals in their organization" ON deals;
DROP POLICY IF EXISTS "Service role has full access to deals" ON deals;

CREATE POLICY "deals_select" ON deals
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "deals_insert" ON deals
  FOR INSERT WITH CHECK (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "deals_update" ON deals
  FOR UPDATE USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "deals_delete" ON deals
  FOR DELETE USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "deals_service_role" ON deals
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

ALTER TABLE deals FORCE ROW LEVEL SECURITY;

-- content_queue
DROP POLICY IF EXISTS "Users can view content_queue in their organization" ON content_queue;
DROP POLICY IF EXISTS "Users can insert content_queue in their organization" ON content_queue;
DROP POLICY IF EXISTS "Users can update content_queue in their organization" ON content_queue;
DROP POLICY IF EXISTS "Users can delete content_queue in their organization" ON content_queue;
DROP POLICY IF EXISTS "Service role has full access to content_queue" ON content_queue;

CREATE POLICY "content_queue_select" ON content_queue
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "content_queue_insert" ON content_queue
  FOR INSERT WITH CHECK (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "content_queue_update" ON content_queue
  FOR UPDATE USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "content_queue_delete" ON content_queue
  FOR DELETE USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "content_queue_service_role" ON content_queue
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

ALTER TABLE content_queue FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 5j. SOCIAL_ACCOUNTS
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Org members can select social_accounts" ON social_accounts;
DROP POLICY IF EXISTS "Org members can insert social_accounts" ON social_accounts;
DROP POLICY IF EXISTS "Org members can update social_accounts" ON social_accounts;
DROP POLICY IF EXISTS "Org members can delete social_accounts" ON social_accounts;

CREATE POLICY "social_accounts_select" ON social_accounts
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "social_accounts_insert" ON social_accounts
  FOR INSERT WITH CHECK (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "social_accounts_update" ON social_accounts
  FOR UPDATE USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "social_accounts_delete" ON social_accounts
  FOR DELETE USING (organization_id = (SELECT public.get_user_org_id()));

ALTER TABLE social_accounts FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 5k. LEADS & AGENTS
-- ---------------------------------------------------------------

-- leads: Service role only (no change needed, keep existing)
-- DROP + recreate to ensure consistency
DROP POLICY IF EXISTS "Service role has full access to leads" ON leads;
CREATE POLICY "leads_service_role" ON leads
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
ALTER TABLE leads FORCE ROW LEVEL SECURITY;

-- provisioning_jobs: Service role only
DROP POLICY IF EXISTS "Service role has full access to provisioning_jobs" ON provisioning_jobs;
CREATE POLICY "provisioning_jobs_service_role" ON provisioning_jobs
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
ALTER TABLE provisioning_jobs FORCE ROW LEVEL SECURITY;

-- agent_sessions: Users can read own org sessions, service role full access
DROP POLICY IF EXISTS "Users can view agent sessions in their organization" ON agent_sessions;
DROP POLICY IF EXISTS "Service role has full access to agent_sessions" ON agent_sessions;

CREATE POLICY "agent_sessions_select" ON agent_sessions
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "agent_sessions_service_role" ON agent_sessions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

ALTER TABLE agent_sessions FORCE ROW LEVEL SECURITY;

-- solution_templates: Public read for authenticated users
DROP POLICY IF EXISTS "Authenticated users can view active solution templates" ON solution_templates;
DROP POLICY IF EXISTS "Service role has full access to solution_templates" ON solution_templates;

CREATE POLICY "solution_templates_select" ON solution_templates
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "solution_templates_service_role" ON solution_templates
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

ALTER TABLE solution_templates FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 5l. AUTOPILOT (client_profiles)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON client_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON client_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON client_profiles;
DROP POLICY IF EXISTS "Service role full access to client_profiles" ON client_profiles;

CREATE POLICY "client_profiles_select" ON client_profiles
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "client_profiles_insert" ON client_profiles
  FOR INSERT WITH CHECK (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "client_profiles_update" ON client_profiles
  FOR UPDATE USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "client_profiles_service_role" ON client_profiles
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

ALTER TABLE client_profiles FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 5m. ACCOMMODATION TABLES (34 tables via DO block)
-- ---------------------------------------------------------------

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'accommodation_rooms',
      'accommodation_amenities',
      'accommodation_unit_amenities',
      'accommodation_images',
      'accommodation_rate_plans',
      'accommodation_rate_plan_prices',
      'accommodation_discounts',
      'accommodation_fees',
      'accommodation_cancellation_policies',
      'accommodation_bookings',
      'accommodation_booking_segments',
      'accommodation_booking_party',
      'accommodation_charge_line_items',
      'accommodation_availability_blocks',
      'accommodation_invoices',
      'accommodation_payment_transactions',
      'accommodation_payment_allocations',
      'accommodation_platform_fees',
      'accommodation_operator_payables',
      'accommodation_payment_provider_config',
      'accommodation_readiness_status',
      'accommodation_checklist_templates',
      'accommodation_checklist_instances',
      'accommodation_issues',
      'accommodation_tasks',
      'accommodation_access_pack_templates',
      'accommodation_access_pack_instances',
      'accommodation_waivers',
      'accommodation_waiver_acceptances',
      'accommodation_service_catalog',
      'accommodation_addon_orders',
      'accommodation_comms_timeline',
      'accommodation_property_config',
      'accommodation_deposit_policies',
      'accommodation_email_templates'
    ])
  LOOP
    -- Drop old policies (from migration 07)
    EXECUTE format('DROP POLICY IF EXISTS "Org members can select %s" ON %I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Org members can insert %s" ON %I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Org members can update %s" ON %I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Org members can delete %s" ON %I;', tbl, tbl);

    -- Create optimized policies
    EXECUTE format(
      'CREATE POLICY "%s_select" ON %I FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_insert" ON %I FOR INSERT WITH CHECK (organization_id = (SELECT public.get_user_org_id()));',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_update" ON %I FOR UPDATE USING (organization_id = (SELECT public.get_user_org_id()));',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_delete" ON %I FOR DELETE USING (organization_id = (SELECT public.get_user_org_id()));',
      tbl, tbl
    );

    -- Force RLS
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);
  END LOOP;
END;
$$;

-- Also handle accommodation_properties, accommodation_units, accommodation_guests, accommodation_inquiries
-- (from migration 04 which predates the accommodation_core migration)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'accommodation_properties',
      'accommodation_units',
      'accommodation_guests',
      'accommodation_inquiries'
    ])
  LOOP
    -- Drop any old policies with various naming patterns
    EXECUTE format('DROP POLICY IF EXISTS "Org members can select %s" ON %I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Org members can insert %s" ON %I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Org members can update %s" ON %I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Org members can delete %s" ON %I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Users can view %s" ON %I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Users can manage %s" ON %I;', tbl, tbl);

    -- Create optimized policies
    EXECUTE format(
      'CREATE POLICY "%s_select" ON %I FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_insert" ON %I FOR INSERT WITH CHECK (organization_id = (SELECT public.get_user_org_id()));',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_update" ON %I FOR UPDATE USING (organization_id = (SELECT public.get_user_org_id()));',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_delete" ON %I FOR DELETE USING (organization_id = (SELECT public.get_user_org_id()));',
      tbl, tbl
    );

    -- Ensure RLS enabled + forced
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------
-- 5n. MODULE REGISTRY + TENANT MODULES RLS
-- ---------------------------------------------------------------

ALTER TABLE module_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "module_registry_public_read" ON module_registry
  FOR SELECT USING (true);
CREATE POLICY "module_registry_service_role" ON module_registry
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

ALTER TABLE module_registry FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_modules_select" ON tenant_modules
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "tenant_modules_service_role" ON tenant_modules
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

ALTER TABLE tenant_modules FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 5o. OPS TABLES (service role only, no change needed)
-- ---------------------------------------------------------------
-- ops_clients, ops_client_health, ops_billing_events already have service_role-only policies
-- Just ensure FORCE RLS is applied
ALTER TABLE ops_clients FORCE ROW LEVEL SECURITY;
ALTER TABLE ops_client_health FORCE ROW LEVEL SECURITY;
ALTER TABLE ops_billing_events FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 6: Triggers for new tables
-- ============================================================================

CREATE TRIGGER update_module_registry_updated_at BEFORE UPDATE ON module_registry
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  -- Verify get_user_org_id exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_org_id') THEN
    RAISE NOTICE 'get_user_org_id() function created successfully';
  ELSE
    RAISE EXCEPTION 'get_user_org_id() function NOT found';
  END IF;

  -- Verify module_registry has data
  IF (SELECT count(*) FROM module_registry) >= 7 THEN
    RAISE NOTICE 'module_registry seeded with % modules', (SELECT count(*) FROM module_registry);
  ELSE
    RAISE EXCEPTION 'module_registry has insufficient data';
  END IF;

  -- Verify subdomain column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'subdomain'
  ) THEN
    RAISE NOTICE 'subdomain column added to organizations';
  ELSE
    RAISE EXCEPTION 'subdomain column NOT found on organizations';
  END IF;

  -- Verify tenant_modules table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_modules') THEN
    RAISE NOTICE 'tenant_modules table created successfully';
  ELSE
    RAISE EXCEPTION 'tenant_modules table NOT found';
  END IF;

  RAISE NOTICE 'Migration 10_shared_db_foundation completed successfully';
END;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
