-- ============================================================================
-- Migration: Accommodation Module - RLS Policies
-- All new tables get org-scoped CRUD policies for authenticated users
-- ============================================================================
-- NOTE: RLS for accommodation_properties, accommodation_units,
-- accommodation_guests, accommodation_inquiries already exists in
-- 04_accommodation_module.sql. This covers all new tables.
-- ============================================================================

-- Helper: Macro for enabling RLS + creating standard org-scoped policies
-- We'll apply the same pattern: organization_id must match the user's org

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
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);

    -- Drop existing policies (idempotent)
    EXECUTE format('DROP POLICY IF EXISTS "Org members can select %s" ON %I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Org members can insert %s" ON %I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Org members can update %s" ON %I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Org members can delete %s" ON %I;', tbl, tbl);

    -- SELECT
    EXECUTE format(
      'CREATE POLICY "Org members can select %s" ON %I FOR SELECT TO authenticated USING (organization_id = get_user_org_id());',
      tbl, tbl
    );

    -- INSERT
    EXECUTE format(
      'CREATE POLICY "Org members can insert %s" ON %I FOR INSERT TO authenticated WITH CHECK (organization_id = get_user_org_id());',
      tbl, tbl
    );

    -- UPDATE
    EXECUTE format(
      'CREATE POLICY "Org members can update %s" ON %I FOR UPDATE TO authenticated USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());',
      tbl, tbl
    );

    -- DELETE
    EXECUTE format(
      'CREATE POLICY "Org members can delete %s" ON %I FOR DELETE TO authenticated USING (organization_id = get_user_org_id());',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- ============================================================================
-- Special: Guest portal access (service role bypass)
-- The guest portal uses createAdminClient() which bypasses RLS.
-- Access pack instances are accessed by token, validated in application code.
-- No additional RLS policies needed for guest portal access.
-- ============================================================================
