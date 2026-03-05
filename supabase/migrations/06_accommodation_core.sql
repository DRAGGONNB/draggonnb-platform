-- ============================================================================
-- Migration: Accommodation Module - Extended Schema
-- 35 tables across 7 domains: Inventory, Pricing, Bookings, Payments,
-- Operations, Guest Experience, Configuration
-- ============================================================================
-- NOTE: accommodation_properties, accommodation_units, accommodation_guests,
-- and accommodation_inquiries already exist from 04_accommodation_module.sql.
-- This migration ALTERs those + creates ~31 new tables.
-- ============================================================================

-- ============================================================================
-- DOMAIN 1: INVENTORY (ALTER 2 existing + 4 new)
-- ============================================================================

-- 1a. ALTER accommodation_properties — add geo, timezone, currency, policies
ALTER TABLE accommodation_properties
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Africa/Johannesburg',
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ZAR',
  ADD COLUMN IF NOT EXISTS property_type_config TEXT DEFAULT 'guest_house'
    CHECK (property_type_config IN ('game_lodge', 'guest_house', 'vacation_rental', 'lodge')),
  ADD COLUMN IF NOT EXISTS policies JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS star_rating SMALLINT CHECK (star_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS total_units INTEGER DEFAULT 0;

-- Update type CHECK constraint to include new property types
-- (Must drop and re-add since ALTER CHECK not supported directly)
ALTER TABLE accommodation_properties DROP CONSTRAINT IF EXISTS accommodation_properties_type_check;
ALTER TABLE accommodation_properties ADD CONSTRAINT accommodation_properties_type_check
  CHECK (type IN ('hotel', 'guesthouse', 'bnb', 'lodge', 'apartment', 'villa', 'resort', 'game_lodge', 'vacation_rental', 'other'));

-- 1b. ALTER accommodation_units — add unit_code, bedroom/bathroom counts, room support
ALTER TABLE accommodation_units
  ADD COLUMN IF NOT EXISTS unit_code TEXT,
  ADD COLUMN IF NOT EXISTS bedrooms INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS bathrooms INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_adults INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS max_children INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS has_rooms BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS size_sqm DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS floor_level INTEGER,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Update unit type constraint to include more options
ALTER TABLE accommodation_units DROP CONSTRAINT IF EXISTS accommodation_units_type_check;
ALTER TABLE accommodation_units ADD CONSTRAINT accommodation_units_type_check
  CHECK (type IN ('room', 'suite', 'apartment', 'cottage', 'tent', 'dorm', 'house', 'chalet', 'cabin', 'villa', 'bungalow', 'other'));

-- 1c. NEW: accommodation_rooms — sub-units for game lodges (room within a house/chalet)
CREATE TABLE IF NOT EXISTS accommodation_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES accommodation_units(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  room_code TEXT,
  room_type TEXT NOT NULL DEFAULT 'bedroom'
    CHECK (room_type IN ('bedroom', 'suite', 'dormitory', 'other')),
  bed_config TEXT DEFAULT 'double'
    CHECK (bed_config IN ('single', 'double', 'twin', 'king', 'queen', 'bunk', 'sleeper_couch', 'other')),
  max_guests INTEGER NOT NULL DEFAULT 2,
  has_ensuite BOOLEAN DEFAULT false,
  amenities TEXT[] DEFAULT '{}',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'occupied', 'maintenance', 'blocked')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accommodation_rooms_unit ON accommodation_rooms(unit_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_rooms_org ON accommodation_rooms(organization_id);

-- 1d. NEW: accommodation_amenities — lookup table
CREATE TABLE IF NOT EXISTS accommodation_amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('general', 'bathroom', 'bedroom', 'kitchen', 'outdoor', 'entertainment', 'safety', 'accessibility', 'other')),
  icon TEXT,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accommodation_amenities_org ON accommodation_amenities(organization_id);

-- 1e. NEW: accommodation_unit_amenities — join table
CREATE TABLE IF NOT EXISTS accommodation_unit_amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES accommodation_units(id) ON DELETE CASCADE,
  amenity_id UUID NOT NULL REFERENCES accommodation_amenities(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE(unit_id, amenity_id)
);

CREATE INDEX IF NOT EXISTS idx_accommodation_unit_amenities_unit ON accommodation_unit_amenities(unit_id);

-- 1f. NEW: accommodation_images — polymorphic images for property/unit/room
CREATE TABLE IF NOT EXISTS accommodation_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('property', 'unit', 'room')),
  entity_id UUID NOT NULL,
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accommodation_images_entity ON accommodation_images(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_images_org ON accommodation_images(organization_id);


-- ============================================================================
-- DOMAIN 2: PRICING (5 new tables)
-- ============================================================================

-- 2a. accommodation_rate_plans
CREATE TABLE IF NOT EXISTS accommodation_rate_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES accommodation_properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_basis TEXT NOT NULL DEFAULT 'per_unit'
    CHECK (price_basis IN ('per_person', 'per_unit', 'per_room', 'per_bedroom', 'per_group')),
  meal_plan TEXT DEFAULT 'room_only'
    CHECK (meal_plan IN ('room_only', 'bed_and_breakfast', 'half_board', 'full_board', 'all_inclusive', 'self_catering')),
  valid_from DATE,
  valid_to DATE,
  is_default BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accommodation_rate_plans_property ON accommodation_rate_plans(property_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_rate_plans_org ON accommodation_rate_plans(organization_id);

-- 2b. accommodation_rate_plan_prices — price matrix
CREATE TABLE IF NOT EXISTS accommodation_rate_plan_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rate_plan_id UUID NOT NULL REFERENCES accommodation_rate_plans(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES accommodation_units(id) ON DELETE CASCADE,
  guest_category TEXT NOT NULL DEFAULT 'adult'
    CHECK (guest_category IN ('adult', 'child', 'infant', 'teenager', 'senior', 'per_unit')),
  season TEXT DEFAULT 'standard'
    CHECK (season IN ('low', 'standard', 'high', 'peak', 'festive')),
  day_of_week TEXT DEFAULT 'all'
    CHECK (day_of_week IN ('all', 'weekday', 'weekend', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_nights INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accommodation_rate_prices_plan ON accommodation_rate_plan_prices(rate_plan_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_rate_prices_unit ON accommodation_rate_plan_prices(unit_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_rate_prices_org ON accommodation_rate_plan_prices(organization_id);

-- 2c. accommodation_discounts
CREATE TABLE IF NOT EXISTS accommodation_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES accommodation_properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  discount_type TEXT NOT NULL
    CHECK (discount_type IN ('length_of_stay', 'early_bird', 'last_minute', 'promo_code', 'date_range', 'returning_guest', 'group')),
  value_type TEXT NOT NULL DEFAULT 'percentage' CHECK (value_type IN ('percentage', 'fixed')),
  value DECIMAL(10,2) NOT NULL,
  promo_code TEXT,
  min_nights INTEGER,
  min_guests INTEGER,
  days_before_arrival INTEGER,
  valid_from DATE,
  valid_to DATE,
  stackable BOOLEAN DEFAULT false,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accommodation_discounts_property ON accommodation_discounts(property_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_discounts_org ON accommodation_discounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_discounts_promo ON accommodation_discounts(promo_code) WHERE promo_code IS NOT NULL;

-- 2d. accommodation_fees
CREATE TABLE IF NOT EXISTS accommodation_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES accommodation_properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fee_type TEXT NOT NULL DEFAULT 'fixed'
    CHECK (fee_type IN ('fixed', 'percentage', 'per_person', 'per_night', 'per_person_per_night')),
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_taxable BOOLEAN DEFAULT true,
  is_mandatory BOOLEAN DEFAULT true,
  applies_to TEXT DEFAULT 'booking' CHECK (applies_to IN ('booking', 'person', 'night', 'unit')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accommodation_fees_property ON accommodation_fees(property_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_fees_org ON accommodation_fees(organization_id);

-- 2e. accommodation_cancellation_policies
CREATE TABLE IF NOT EXISTS accommodation_cancellation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES accommodation_properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tiers JSONB NOT NULL DEFAULT '[]',
  -- tiers format: [{ "days_before": 30, "refund_percentage": 100 }, { "days_before": 14, "refund_percentage": 50 }, { "days_before": 0, "refund_percentage": 0 }]
  no_show_charge_percentage DECIMAL(5,2) DEFAULT 100,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accommodation_cancel_policies_org ON accommodation_cancellation_policies(organization_id);


-- ============================================================================
-- DOMAIN 3: BOOKINGS (5 new tables)
-- ============================================================================

-- 3a. accommodation_bookings — header record
CREATE TABLE IF NOT EXISTS accommodation_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_ref TEXT NOT NULL,
  guest_id UUID NOT NULL REFERENCES accommodation_guests(id),
  property_id UUID NOT NULL REFERENCES accommodation_properties(id),
  status TEXT NOT NULL DEFAULT 'inquiry'
    CHECK (status IN ('inquiry', 'quoted', 'pending_deposit', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  nights INTEGER GENERATED ALWAYS AS (check_out_date - check_in_date) STORED,
  total_guests INTEGER NOT NULL DEFAULT 1,
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER DEFAULT 0,
  infants INTEGER DEFAULT 0,
  subtotal DECIMAL(10,2) DEFAULT 0,
  discount_total DECIMAL(10,2) DEFAULT 0,
  fee_total DECIMAL(10,2) DEFAULT 0,
  tax_total DECIMAL(10,2) DEFAULT 0,
  grand_total DECIMAL(10,2) DEFAULT 0,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  balance_due DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'ZAR',
  source TEXT DEFAULT 'direct'
    CHECK (source IN ('direct', 'booking_com', 'airbnb', 'whatsapp', 'email', 'phone', 'website', 'agent', 'ota_other')),
  rate_plan_id UUID REFERENCES accommodation_rate_plans(id),
  cancellation_policy_id UUID REFERENCES accommodation_cancellation_policies(id),
  special_requests TEXT,
  internal_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT check_dates CHECK (check_out_date > check_in_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_accommodation_bookings_ref ON accommodation_bookings(organization_id, booking_ref);
CREATE INDEX IF NOT EXISTS idx_accommodation_bookings_org ON accommodation_bookings(organization_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_bookings_guest ON accommodation_bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_bookings_property ON accommodation_bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_bookings_dates ON accommodation_bookings(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_accommodation_bookings_status ON accommodation_bookings(status);

-- 3b. accommodation_booking_segments — multi-location itinerary
CREATE TABLE IF NOT EXISTS accommodation_booking_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES accommodation_bookings(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES accommodation_properties(id),
  unit_id UUID REFERENCES accommodation_units(id),
  room_id UUID REFERENCES accommodation_rooms(id),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  segment_total DECIMAL(10,2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT check_segment_dates CHECK (check_out_date > check_in_date)
);

CREATE INDEX IF NOT EXISTS idx_accommodation_booking_segments_booking ON accommodation_booking_segments(booking_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_booking_segments_unit ON accommodation_booking_segments(unit_id);

-- 3c. accommodation_booking_party — guest composition per segment
CREATE TABLE IF NOT EXISTS accommodation_booking_party (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES accommodation_bookings(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES accommodation_booking_segments(id) ON DELETE CASCADE,
  guest_category TEXT NOT NULL DEFAULT 'adult'
    CHECK (guest_category IN ('adult', 'child', 'infant', 'teenager', 'senior')),
  count INTEGER NOT NULL DEFAULT 1,
  age_from INTEGER,
  age_to INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accommodation_booking_party_booking ON accommodation_booking_party(booking_id);

-- 3d. accommodation_charge_line_items — deterministic pricing output
CREATE TABLE IF NOT EXISTS accommodation_charge_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES accommodation_bookings(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES accommodation_booking_segments(id) ON DELETE CASCADE,
  line_type TEXT NOT NULL
    CHECK (line_type IN ('accommodation', 'fee', 'discount', 'tax', 'addon', 'adjustment')),
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accommodation_charge_items_booking ON accommodation_charge_line_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_charge_items_org ON accommodation_charge_line_items(organization_id);

-- 3e. accommodation_availability_blocks — prevents double-booking at DB level
CREATE TABLE IF NOT EXISTS accommodation_availability_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES accommodation_units(id) ON DELETE CASCADE,
  room_id UUID REFERENCES accommodation_rooms(id) ON DELETE CASCADE,
  block_date DATE NOT NULL,
  booking_id UUID REFERENCES accommodation_bookings(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL DEFAULT 'booking'
    CHECK (block_type IN ('booking', 'maintenance', 'owner_use', 'manual_block')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(unit_id, room_id, block_date)
);

CREATE INDEX IF NOT EXISTS idx_accommodation_avail_blocks_unit ON accommodation_availability_blocks(unit_id, block_date);
CREATE INDEX IF NOT EXISTS idx_accommodation_avail_blocks_booking ON accommodation_availability_blocks(booking_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_avail_blocks_org ON accommodation_availability_blocks(organization_id);


-- ============================================================================
-- DOMAIN 4: PAYMENTS (6 new tables)
-- ============================================================================

-- 4a. accommodation_invoices
CREATE TABLE IF NOT EXISTS accommodation_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES accommodation_bookings(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  invoice_type TEXT NOT NULL DEFAULT 'standard'
    CHECK (invoice_type IN ('deposit', 'standard', 'final', 'credit_note')),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_total DECIMAL(10,2) DEFAULT 0,
  grand_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  balance_due DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'ZAR',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'void')),
  due_date DATE,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_accommodation_invoices_number ON accommodation_invoices(organization_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_accommodation_invoices_booking ON accommodation_invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_invoices_org ON accommodation_invoices(organization_id);

-- 4b. accommodation_payment_transactions
CREATE TABLE IF NOT EXISTS accommodation_payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES accommodation_bookings(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES accommodation_invoices(id),
  gateway TEXT NOT NULL DEFAULT 'payfast' CHECK (gateway IN ('payfast', 'manual', 'eft', 'cash', 'card', 'other')),
  gateway_reference TEXT,
  payment_mode TEXT NOT NULL DEFAULT 'mode_a' CHECK (payment_mode IN ('mode_a', 'mode_b')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'ZAR',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded', 'cancelled')),
  payment_method TEXT,
  payer_email TEXT,
  metadata JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accommodation_payments_booking ON accommodation_payment_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_payments_org ON accommodation_payment_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_payments_gateway_ref ON accommodation_payment_transactions(gateway_reference) WHERE gateway_reference IS NOT NULL;

-- 4c. accommodation_payment_allocations — links payments to line items
CREATE TABLE IF NOT EXISTS accommodation_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES accommodation_payment_transactions(id) ON DELETE CASCADE,
  line_item_id UUID NOT NULL REFERENCES accommodation_charge_line_items(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accommodation_pay_alloc_txn ON accommodation_payment_allocations(transaction_id);

-- 4d. accommodation_platform_fees — Mode B: platform commission
CREATE TABLE IF NOT EXISTS accommodation_platform_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES accommodation_payment_transactions(id) ON DELETE CASCADE,
  fee_type TEXT NOT NULL CHECK (fee_type IN ('transaction_fee', 'commission', 'processing')),
  percentage DECIMAL(5,2),
  fixed_amount DECIMAL(10,2),
  calculated_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accommodation_platform_fees_txn ON accommodation_platform_fees(transaction_id);

-- 4e. accommodation_operator_payables — net owed to operator
CREATE TABLE IF NOT EXISTS accommodation_operator_payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES accommodation_payment_transactions(id) ON DELETE CASCADE,
  gross_amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'held')),
  paid_at TIMESTAMPTZ,
  payout_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accommodation_op_payables_org ON accommodation_operator_payables(organization_id);

-- 4f. accommodation_payment_provider_config — per-org payment mode + credentials
CREATE TABLE IF NOT EXISTS accommodation_payment_provider_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payment_mode TEXT NOT NULL DEFAULT 'mode_a' CHECK (payment_mode IN ('mode_a', 'mode_b')),
  provider TEXT NOT NULL DEFAULT 'payfast' CHECK (provider IN ('payfast', 'stripe', 'other')),
  merchant_id TEXT,
  merchant_key TEXT,
  passphrase TEXT,
  is_sandbox BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_accommodation_pay_provider_org ON accommodation_payment_provider_config(organization_id);


-- ============================================================================
-- DOMAIN 5: OPERATIONS (5 new tables)
-- ============================================================================

-- 5a. accommodation_readiness_status
CREATE TABLE IF NOT EXISTS accommodation_readiness_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES accommodation_units(id) ON DELETE CASCADE,
  room_id UUID REFERENCES accommodation_rooms(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'dirty'
    CHECK (status IN ('dirty', 'cleaning', 'inspected', 'ready', 'maintenance')),
  assigned_to UUID REFERENCES auth.users(id),
  last_status_change TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(unit_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_accommodation_readiness_unit ON accommodation_readiness_status(unit_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_readiness_org ON accommodation_readiness_status(organization_id);

-- 5b. accommodation_checklist_templates
CREATE TABLE IF NOT EXISTS accommodation_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES accommodation_properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  checklist_type TEXT NOT NULL DEFAULT 'turnover'
    CHECK (checklist_type IN ('turnover', 'deep_clean', 'inspection', 'maintenance', 'check_in', 'check_out')),
  items JSONB NOT NULL DEFAULT '[]',
  -- items format: [{ "label": "Strip beds", "requires_photo": false, "order": 1 }]
  requires_photo BOOLEAN DEFAULT false,
  estimated_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accommodation_checklist_tmpl_org ON accommodation_checklist_templates(organization_id);

-- 5c. accommodation_checklist_instances
CREATE TABLE IF NOT EXISTS accommodation_checklist_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES accommodation_checklist_templates(id),
  unit_id UUID NOT NULL REFERENCES accommodation_units(id),
  room_id UUID REFERENCES accommodation_rooms(id),
  booking_id UUID REFERENCES accommodation_bookings(id),
  assigned_to UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  items_completed JSONB DEFAULT '[]',
  -- items_completed format: [{ "label": "Strip beds", "completed": true, "photo_url": null, "completed_at": "..." }]
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accommodation_checklist_inst_org ON accommodation_checklist_instances(organization_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_checklist_inst_unit ON accommodation_checklist_instances(unit_id);

-- 5d. accommodation_issues — fault reports
CREATE TABLE IF NOT EXISTS accommodation_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES accommodation_properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES accommodation_units(id),
  room_id UUID REFERENCES accommodation_rooms(id),
  reported_by UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'deferred')),
  category TEXT DEFAULT 'general'
    CHECK (category IN ('plumbing', 'electrical', 'structural', 'appliance', 'furniture', 'cleanliness', 'pest', 'safety', 'general')),
  photos TEXT[] DEFAULT '{}',
  sla_target_hours INTEGER,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accommodation_issues_property ON accommodation_issues(property_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_issues_org ON accommodation_issues(organization_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_issues_status ON accommodation_issues(status);

-- 5e. accommodation_tasks
CREATE TABLE IF NOT EXISTS accommodation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES accommodation_properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES accommodation_units(id),
  room_id UUID REFERENCES accommodation_rooms(id),
  booking_id UUID REFERENCES accommodation_bookings(id),
  issue_id UUID REFERENCES accommodation_issues(id),
  task_type TEXT NOT NULL DEFAULT 'general'
    CHECK (task_type IN ('turnover', 'maintenance', 'guest_request', 'inspection', 'general')),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date DATE,
  due_time TIME,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accommodation_tasks_property ON accommodation_tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_tasks_org ON accommodation_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_tasks_assigned ON accommodation_tasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accommodation_tasks_status ON accommodation_tasks(status);


-- ============================================================================
-- DOMAIN 6: GUEST EXPERIENCE (6 new tables + ALTER 1 existing)
-- ============================================================================

-- 6a. ALTER accommodation_guests — add more guest details
ALTER TABLE accommodation_guests
  ADD COLUMN IF NOT EXISTS id_type TEXT DEFAULT 'sa_id'
    CHECK (id_type IN ('sa_id', 'passport', 'drivers_license', 'other')),
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS dietary TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct';

-- 6b. accommodation_access_pack_templates
CREATE TABLE IF NOT EXISTS accommodation_access_pack_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES accommodation_properties(id) ON DELETE CASCADE,
  wifi_network TEXT,
  wifi_password TEXT,
  gate_code TEXT,
  directions TEXT,
  house_rules TEXT,
  check_in_instructions TEXT,
  check_out_instructions TEXT,
  emergency_contacts JSONB DEFAULT '[]',
  custom_sections JSONB DEFAULT '[]',
  -- custom_sections: [{ "title": "Game Drive Times", "content": "..." }]
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accommodation_access_tmpl_property ON accommodation_access_pack_templates(property_id);

-- 6c. accommodation_access_pack_instances — per booking, token-based
CREATE TABLE IF NOT EXISTS accommodation_access_pack_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES accommodation_bookings(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES accommodation_access_pack_templates(id),
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  overrides JSONB DEFAULT '{}',
  accessible_from TIMESTAMPTZ,
  accessible_until TIMESTAMPTZ,
  first_accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(token)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_accommodation_access_pack_token ON accommodation_access_pack_instances(token);
CREATE INDEX IF NOT EXISTS idx_accommodation_access_pack_booking ON accommodation_access_pack_instances(booking_id);

-- 6d. accommodation_waivers
CREATE TABLE IF NOT EXISTS accommodation_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES accommodation_properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_required BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accommodation_waivers_property ON accommodation_waivers(property_id);

-- 6e. accommodation_waiver_acceptances — per booking
CREATE TABLE IF NOT EXISTS accommodation_waiver_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  waiver_id UUID NOT NULL REFERENCES accommodation_waivers(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES accommodation_bookings(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES accommodation_guests(id),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  signature_data TEXT,
  UNIQUE(waiver_id, booking_id, guest_id)
);

CREATE INDEX IF NOT EXISTS idx_accommodation_waiver_accept_booking ON accommodation_waiver_acceptances(booking_id);

-- 6f. accommodation_service_catalog — add-ons per property
CREATE TABLE IF NOT EXISTS accommodation_service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES accommodation_properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general'
    CHECK (category IN ('food_beverage', 'activity', 'transport', 'equipment', 'spa', 'general')),
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_type TEXT DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'per_person', 'per_hour', 'quote')),
  requires_advance_booking BOOLEAN DEFAULT false,
  advance_hours INTEGER,
  is_available BOOLEAN DEFAULT true,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accommodation_service_catalog_property ON accommodation_service_catalog(property_id);

-- 6g. accommodation_addon_orders — guest orders
CREATE TABLE IF NOT EXISTS accommodation_addon_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES accommodation_bookings(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES accommodation_service_catalog(id),
  guest_id UUID REFERENCES accommodation_guests(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  requested_date DATE,
  requested_time TIME,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accommodation_addon_orders_booking ON accommodation_addon_orders(booking_id);

-- 6h. accommodation_comms_timeline — all messages logged
CREATE TABLE IF NOT EXISTS accommodation_comms_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES accommodation_bookings(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES accommodation_guests(id),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms', 'telegram', 'phone', 'portal', 'system')),
  direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound', 'system')),
  subject TEXT,
  content TEXT,
  sent_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accommodation_comms_booking ON accommodation_comms_timeline(booking_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_comms_guest ON accommodation_comms_timeline(guest_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_comms_org ON accommodation_comms_timeline(organization_id);


-- ============================================================================
-- DOMAIN 7: CONFIGURATION (3 new tables)
-- ============================================================================

-- 7a. accommodation_property_config — per-property feature toggles
CREATE TABLE IF NOT EXISTS accommodation_property_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES accommodation_properties(id) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(property_id, config_key)
);

CREATE INDEX IF NOT EXISTS idx_accommodation_prop_config_property ON accommodation_property_config(property_id);

-- 7b. accommodation_deposit_policies
CREATE TABLE IF NOT EXISTS accommodation_deposit_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES accommodation_properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  deposit_type TEXT NOT NULL DEFAULT 'percentage'
    CHECK (deposit_type IN ('percentage', 'fixed', 'first_night', 'full')),
  value DECIMAL(10,2) NOT NULL DEFAULT 0,
  due_days_before_arrival INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accommodation_deposit_pol_org ON accommodation_deposit_policies(organization_id);

-- 7c. accommodation_email_templates — trigger-based templates
CREATE TABLE IF NOT EXISTS accommodation_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES accommodation_properties(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL
    CHECK (trigger_type IN ('booking_confirmed', 'deposit_reminder', 'balance_due', 'pre_arrival', 'access_pack', 'check_in', 'check_out', 'review_request', 'cancellation', 'custom')),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  send_days_offset INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, property_id, trigger_type)
);

CREATE INDEX IF NOT EXISTS idx_accommodation_email_tmpl_org ON accommodation_email_templates(organization_id);


-- ============================================================================
-- HELPER: Updated-at trigger function (reusable)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_accommodation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all new tables with updated_at column
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'accommodation_rooms', 'accommodation_rate_plans', 'accommodation_rate_plan_prices',
      'accommodation_discounts', 'accommodation_fees', 'accommodation_cancellation_policies',
      'accommodation_bookings', 'accommodation_invoices', 'accommodation_payment_transactions',
      'accommodation_operator_payables', 'accommodation_readiness_status',
      'accommodation_checklist_templates', 'accommodation_checklist_instances',
      'accommodation_issues', 'accommodation_tasks', 'accommodation_access_pack_templates',
      'accommodation_waivers', 'accommodation_service_catalog', 'accommodation_addon_orders',
      'accommodation_deposit_policies', 'accommodation_email_templates',
      'accommodation_payment_provider_config'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I; CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_accommodation_updated_at();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END;
$$;
