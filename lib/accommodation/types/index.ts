// ============================================================================
// Accommodation Module - TypeScript Types
// Mirrors the 35-table database schema across 7 domains
// ============================================================================

// ─── Common ─────────────────────────────────────────────────────────────────

export type PropertyTypeConfig = 'game_lodge' | 'guest_house' | 'vacation_rental' | 'lodge'

export type PropertyType =
  | 'hotel' | 'guesthouse' | 'bnb' | 'lodge' | 'apartment'
  | 'villa' | 'resort' | 'game_lodge' | 'vacation_rental' | 'other'

export type PropertyStatus = 'active' | 'inactive' | 'archived'

export type UnitType =
  | 'room' | 'suite' | 'apartment' | 'cottage' | 'tent'
  | 'dorm' | 'house' | 'chalet' | 'cabin' | 'villa' | 'bungalow' | 'other'

export type UnitStatus = 'available' | 'occupied' | 'maintenance' | 'blocked'

export type RoomType = 'bedroom' | 'suite' | 'dormitory' | 'other'
export type BedConfig = 'single' | 'double' | 'twin' | 'king' | 'queen' | 'bunk' | 'sleeper_couch' | 'other'

export type PriceBasis = 'per_person' | 'per_unit' | 'per_room' | 'per_bedroom' | 'per_group'
export type MealPlan = 'room_only' | 'bed_and_breakfast' | 'half_board' | 'full_board' | 'all_inclusive' | 'self_catering'
export type GuestCategory = 'adult' | 'child' | 'infant' | 'teenager' | 'senior' | 'per_unit'
export type Season = 'low' | 'standard' | 'high' | 'peak' | 'festive'
export type DayOfWeek = 'all' | 'weekday' | 'weekend' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export type DiscountType = 'length_of_stay' | 'early_bird' | 'last_minute' | 'promo_code' | 'date_range' | 'returning_guest' | 'group'
export type ValueType = 'percentage' | 'fixed'
export type FeeType = 'fixed' | 'percentage' | 'per_person' | 'per_night' | 'per_person_per_night'

export type BookingStatus = 'inquiry' | 'quoted' | 'pending_deposit' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show'
export type BookingSource = 'direct' | 'booking_com' | 'airbnb' | 'whatsapp' | 'email' | 'phone' | 'website' | 'agent' | 'ota_other'

export type LineItemType = 'accommodation' | 'fee' | 'discount' | 'tax' | 'addon' | 'adjustment'
export type BlockType = 'booking' | 'maintenance' | 'owner_use' | 'manual_block'

export type InvoiceType = 'deposit' | 'standard' | 'final' | 'credit_note'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled' | 'void'
export type PaymentGateway = 'payfast' | 'manual' | 'eft' | 'cash' | 'card' | 'other'
export type PaymentMode = 'mode_a' | 'mode_b'
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'partially_refunded' | 'cancelled'

export type ReadinessStatus = 'dirty' | 'cleaning' | 'inspected' | 'ready' | 'maintenance'
export type ChecklistType = 'turnover' | 'deep_clean' | 'inspection' | 'maintenance' | 'check_in' | 'check_out'
export type IssuePriority = 'low' | 'medium' | 'high' | 'urgent'
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'deferred'
export type IssueCategory = 'plumbing' | 'electrical' | 'structural' | 'appliance' | 'furniture' | 'cleanliness' | 'pest' | 'safety' | 'general'
export type TaskType = 'turnover' | 'maintenance' | 'guest_request' | 'inspection' | 'general'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export type CommChannel = 'email' | 'whatsapp' | 'sms' | 'telegram' | 'phone' | 'portal' | 'system'
export type CommDirection = 'inbound' | 'outbound' | 'system'

export type DepositType = 'percentage' | 'fixed' | 'first_night' | 'full'
export type EmailTrigger = 'booking_confirmed' | 'deposit_reminder' | 'balance_due' | 'pre_arrival' | 'access_pack' | 'check_in' | 'check_out' | 'review_request' | 'cancellation' | 'custom'

export type AmenityCategory = 'general' | 'bathroom' | 'bedroom' | 'kitchen' | 'outdoor' | 'entertainment' | 'safety' | 'accessibility' | 'other'
export type ImageEntityType = 'property' | 'unit' | 'room'
export type ServiceCategory = 'food_beverage' | 'activity' | 'transport' | 'equipment' | 'spa' | 'general'
export type OrderStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
export type IdType = 'sa_id' | 'passport' | 'drivers_license' | 'other'

// ─── Domain 1: Inventory ────────────────────────────────────────────────────

export interface AccommodationProperty {
  id: string
  organization_id: string
  name: string
  type: PropertyType
  property_type_config: PropertyTypeConfig
  address: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  country: string
  latitude: number | null
  longitude: number | null
  timezone: string
  currency: string
  amenities: string[]
  check_in_time: string
  check_out_time: string
  description: string | null
  policies: Record<string, unknown>
  contact_email: string | null
  contact_phone: string | null
  website: string | null
  star_rating: number | null
  total_units: number
  booking_com_id: string | null
  airbnb_id: string | null
  status: PropertyStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AccommodationUnit {
  id: string
  property_id: string
  organization_id: string
  name: string
  type: UnitType
  unit_code: string | null
  bedrooms: number
  bathrooms: number
  max_guests: number
  max_adults: number
  max_children: number
  max_capacity: number
  has_rooms: boolean
  size_sqm: number | null
  floor_level: number | null
  base_price_per_night: number
  amenities: string[]
  description: string | null
  status: UnitStatus
  sort_order: number
  created_at: string
  updated_at: string
}

export interface AccommodationRoom {
  id: string
  unit_id: string
  organization_id: string
  name: string
  room_code: string | null
  room_type: RoomType
  bed_config: BedConfig
  max_guests: number
  has_ensuite: boolean
  amenities: string[]
  description: string | null
  status: UnitStatus
  sort_order: number
  created_at: string
  updated_at: string
}

export interface AccommodationAmenity {
  id: string
  organization_id: string
  name: string
  category: AmenityCategory
  icon: string | null
  is_global: boolean
  created_at: string
}

export interface AccommodationUnitAmenity {
  id: string
  unit_id: string
  amenity_id: string
  organization_id: string
}

export interface AccommodationImage {
  id: string
  organization_id: string
  entity_type: ImageEntityType
  entity_id: string
  url: string
  alt_text: string | null
  sort_order: number
  is_primary: boolean
  created_at: string
}

// ─── Domain 2: Pricing ──────────────────────────────────────────────────────

export interface AccommodationRatePlan {
  id: string
  organization_id: string
  property_id: string
  name: string
  description: string | null
  price_basis: PriceBasis
  meal_plan: MealPlan
  valid_from: string | null
  valid_to: string | null
  is_default: boolean
  status: PropertyStatus
  created_at: string
  updated_at: string
}

export interface AccommodationRatePlanPrice {
  id: string
  organization_id: string
  rate_plan_id: string
  unit_id: string | null
  guest_category: GuestCategory
  season: Season
  day_of_week: DayOfWeek
  price: number
  min_nights: number
  created_at: string
  updated_at: string
}

export interface AccommodationDiscount {
  id: string
  organization_id: string
  property_id: string | null
  name: string
  discount_type: DiscountType
  value_type: ValueType
  value: number
  promo_code: string | null
  min_nights: number | null
  min_guests: number | null
  days_before_arrival: number | null
  valid_from: string | null
  valid_to: string | null
  stackable: boolean
  max_uses: number | null
  current_uses: number
  status: 'active' | 'inactive' | 'expired'
  created_at: string
  updated_at: string
}

export interface AccommodationFee {
  id: string
  organization_id: string
  property_id: string | null
  name: string
  fee_type: FeeType
  amount: number
  is_taxable: boolean
  is_mandatory: boolean
  applies_to: 'booking' | 'person' | 'night' | 'unit'
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface AccommodationCancellationPolicy {
  id: string
  organization_id: string
  property_id: string | null
  name: string
  description: string | null
  tiers: CancellationTier[]
  no_show_charge_percentage: number
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface CancellationTier {
  days_before: number
  refund_percentage: number
}

// ─── Domain 3: Bookings ─────────────────────────────────────────────────────

export interface AccommodationBooking {
  id: string
  organization_id: string
  booking_ref: string
  guest_id: string
  property_id: string
  status: BookingStatus
  check_in_date: string
  check_out_date: string
  nights: number
  total_guests: number
  adults: number
  children: number
  infants: number
  subtotal: number
  discount_total: number
  fee_total: number
  tax_total: number
  grand_total: number
  amount_paid: number
  balance_due: number
  currency: string
  source: BookingSource
  rate_plan_id: string | null
  cancellation_policy_id: string | null
  special_requests: string | null
  internal_notes: string | null
  created_by: string | null
  confirmed_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
}

export interface AccommodationBookingSegment {
  id: string
  organization_id: string
  booking_id: string
  property_id: string
  unit_id: string | null
  room_id: string | null
  check_in_date: string
  check_out_date: string
  segment_total: number
  sort_order: number
  created_at: string
}

export interface AccommodationBookingParty {
  id: string
  organization_id: string
  booking_id: string
  segment_id: string | null
  guest_category: GuestCategory
  count: number
  age_from: number | null
  age_to: number | null
  created_at: string
}

export interface AccommodationChargeLineItem {
  id: string
  organization_id: string
  booking_id: string
  segment_id: string | null
  line_type: LineItemType
  description: string
  quantity: number
  unit_price: number
  total: number
  metadata: Record<string, unknown>
  created_at: string
}

export interface AccommodationAvailabilityBlock {
  id: string
  organization_id: string
  unit_id: string
  room_id: string | null
  block_date: string
  booking_id: string | null
  block_type: BlockType
  notes: string | null
  created_at: string
}

// ─── Domain 4: Payments ─────────────────────────────────────────────────────

export interface AccommodationInvoice {
  id: string
  organization_id: string
  booking_id: string
  invoice_number: string
  invoice_type: InvoiceType
  subtotal: number
  tax_total: number
  grand_total: number
  amount_paid: number
  balance_due: number
  currency: string
  status: InvoiceStatus
  due_date: string | null
  sent_at: string | null
  paid_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AccommodationPaymentTransaction {
  id: string
  organization_id: string
  booking_id: string
  invoice_id: string | null
  gateway: PaymentGateway
  gateway_reference: string | null
  payment_mode: PaymentMode
  amount: number
  currency: string
  status: PaymentStatus
  payment_method: string | null
  payer_email: string | null
  metadata: Record<string, unknown>
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface AccommodationPaymentAllocation {
  id: string
  organization_id: string
  transaction_id: string
  line_item_id: string
  amount: number
  created_at: string
}

export interface AccommodationPlatformFee {
  id: string
  organization_id: string
  transaction_id: string
  fee_type: 'transaction_fee' | 'commission' | 'processing'
  percentage: number | null
  fixed_amount: number | null
  calculated_amount: number
  created_at: string
}

export interface AccommodationOperatorPayable {
  id: string
  organization_id: string
  transaction_id: string
  gross_amount: number
  platform_fee: number
  net_amount: number
  status: 'pending' | 'processing' | 'paid' | 'held'
  paid_at: string | null
  payout_reference: string | null
  created_at: string
  updated_at: string
}

export interface AccommodationPaymentProviderConfig {
  id: string
  organization_id: string
  payment_mode: PaymentMode
  provider: 'payfast' | 'stripe' | 'other'
  merchant_id: string | null
  merchant_key: string | null
  passphrase: string | null
  is_sandbox: boolean
  is_active: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ─── Domain 5: Operations ───────────────────────────────────────────────────

export interface AccommodationReadinessStatus {
  id: string
  organization_id: string
  unit_id: string
  room_id: string | null
  status: ReadinessStatus
  assigned_to: string | null
  last_status_change: string
  notes: string | null
  updated_at: string
}

export interface AccommodationChecklistTemplate {
  id: string
  organization_id: string
  property_id: string | null
  name: string
  checklist_type: ChecklistType
  items: ChecklistItem[]
  requires_photo: boolean
  estimated_minutes: number | null
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface ChecklistItem {
  label: string
  requires_photo: boolean
  order: number
}

export interface AccommodationChecklistInstance {
  id: string
  organization_id: string
  template_id: string
  unit_id: string
  room_id: string | null
  booking_id: string | null
  assigned_to: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  items_completed: ChecklistItemCompleted[]
  started_at: string | null
  completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ChecklistItemCompleted {
  label: string
  completed: boolean
  photo_url: string | null
  completed_at: string | null
}

export interface AccommodationIssue {
  id: string
  organization_id: string
  property_id: string
  unit_id: string | null
  room_id: string | null
  reported_by: string | null
  title: string
  description: string | null
  priority: IssuePriority
  status: IssueStatus
  category: IssueCategory
  photos: string[]
  sla_target_hours: number | null
  resolved_at: string | null
  resolution_notes: string | null
  created_at: string
  updated_at: string
}

export interface AccommodationTask {
  id: string
  organization_id: string
  property_id: string
  unit_id: string | null
  room_id: string | null
  booking_id: string | null
  issue_id: string | null
  task_type: TaskType
  title: string
  description: string | null
  assigned_to: string | null
  priority: IssuePriority
  status: TaskStatus
  due_date: string | null
  due_time: string | null
  completed_at: string | null
  completed_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ─── Domain 6: Guest Experience ─────────────────────────────────────────────

export interface AccommodationGuest {
  id: string
  organization_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  id_number: string | null
  id_type: IdType
  date_of_birth: string | null
  nationality: string | null
  dietary: string[]
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  language: string
  source: string
  preferences: Record<string, unknown>
  total_stays: number
  total_spent: number
  vip_status: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AccommodationAccessPackTemplate {
  id: string
  organization_id: string
  property_id: string
  wifi_network: string | null
  wifi_password: string | null
  gate_code: string | null
  directions: string | null
  house_rules: string | null
  check_in_instructions: string | null
  check_out_instructions: string | null
  emergency_contacts: Array<{ name: string; phone: string; role: string }>
  custom_sections: Array<{ title: string; content: string }>
  created_at: string
  updated_at: string
}

export interface AccommodationAccessPackInstance {
  id: string
  organization_id: string
  booking_id: string
  template_id: string
  token: string
  overrides: Record<string, unknown>
  accessible_from: string | null
  accessible_until: string | null
  first_accessed_at: string | null
  access_count: number
  created_at: string
}

export interface AccommodationWaiver {
  id: string
  organization_id: string
  property_id: string
  title: string
  content: string
  is_required: boolean
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface AccommodationWaiverAcceptance {
  id: string
  organization_id: string
  waiver_id: string
  booking_id: string
  guest_id: string
  accepted_at: string
  ip_address: string | null
  signature_data: string | null
}

export interface AccommodationServiceCatalogItem {
  id: string
  organization_id: string
  property_id: string
  name: string
  description: string | null
  category: ServiceCategory
  price: number
  price_type: 'fixed' | 'per_person' | 'per_hour' | 'quote'
  requires_advance_booking: boolean
  advance_hours: number | null
  is_available: boolean
  image_url: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface AccommodationAddonOrder {
  id: string
  organization_id: string
  booking_id: string
  service_id: string
  guest_id: string | null
  quantity: number
  unit_price: number
  total: number
  status: OrderStatus
  requested_date: string | null
  requested_time: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AccommodationCommsTimeline {
  id: string
  organization_id: string
  booking_id: string | null
  guest_id: string | null
  channel: CommChannel
  direction: CommDirection
  subject: string | null
  content: string | null
  sent_by: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// ─── Domain 7: Configuration ────────────────────────────────────────────────

export interface AccommodationPropertyConfig {
  id: string
  organization_id: string
  property_id: string
  config_key: string
  config_value: unknown
  created_at: string
  updated_at: string
}

export interface AccommodationDepositPolicy {
  id: string
  organization_id: string
  property_id: string | null
  name: string
  deposit_type: DepositType
  value: number
  due_days_before_arrival: number
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface AccommodationEmailTemplate {
  id: string
  organization_id: string
  property_id: string | null
  trigger_type: EmailTrigger
  subject: string
  body: string
  is_active: boolean
  send_days_offset: number
  created_at: string
  updated_at: string
}

// ─── Computed / UI Types ────────────────────────────────────────────────────

export interface PropertyWithUnits extends AccommodationProperty {
  units: AccommodationUnit[]
}

export interface UnitWithRooms extends AccommodationUnit {
  rooms: AccommodationRoom[]
}

export interface BookingWithDetails extends AccommodationBooking {
  guest: AccommodationGuest
  property: AccommodationProperty
  segments: AccommodationBookingSegment[]
  line_items: AccommodationChargeLineItem[]
}

export interface PropertyConfigMap {
  price_basis: PriceBasis
  has_room_layer: boolean
  has_room_assignment: boolean
  age_bands: GuestCategory[]
  waiver_required: boolean
  default_meal_plan: MealPlan
  features: Record<string, boolean>
}

// ─── Domain 8: Automation & Communications ──────────────────────────────────

export type AutomationTriggerEvent =
  | 'booking_confirmed' | 'booking_cancelled'
  | 'guest_checked_in' | 'guest_checked_out'
  | 'payment_received' | 'deposit_due'
  | 'check_in_24h' | 'check_out_reminder' | 'review_request'

export type AutomationChannel = 'whatsapp' | 'email' | 'sms'
export type MessageQueueStatus = 'pending' | 'sent' | 'failed' | 'cancelled'

export interface AccommodationAutomationRule {
  id: string
  organization_id: string
  name: string
  trigger_event: AutomationTriggerEvent
  channel: AutomationChannel
  template_id: string | null
  delay_minutes: number
  is_active: boolean
  conditions: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AccommodationMessageQueue {
  id: string
  organization_id: string
  rule_id: string | null
  booking_id: string | null
  guest_id: string | null
  channel: AutomationChannel
  recipient: string
  template_data: Record<string, unknown>
  scheduled_for: string
  status: MessageQueueStatus
  sent_at: string | null
  error_message: string | null
  created_at: string
}

export interface AccommodationCommsLog {
  id: string
  organization_id: string
  booking_id: string | null
  guest_id: string | null
  channel: string
  direction: 'outbound' | 'inbound'
  message_type: string
  recipient: string | null
  content_summary: string | null
  external_id: string | null
  status: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// ─── Domain 9: Payment Tracking & Financial ─────────────────────────────────

export type PaymentLinkStatus = 'pending' | 'paid' | 'expired' | 'cancelled'
export type AccommodationPaymentType = 'deposit' | 'balance' | 'additional_fee'

export interface AccommodationPaymentLink {
  id: string
  organization_id: string
  booking_id: string | null
  amount: number
  currency: string
  payment_type: AccommodationPaymentType
  gateway: string
  gateway_reference: string | null
  payment_url: string | null
  expires_at: string | null
  status: PaymentLinkStatus
  paid_at: string | null
  created_at: string
}

export interface AccommodationFinancialSnapshot {
  id: string
  organization_id: string
  snapshot_date: string
  total_revenue: number
  total_outstanding: number
  total_deposits_received: number
  bookings_count: number
  occupancy_rate: number
  avg_daily_rate: number
  metadata: Record<string, unknown>
  created_at: string
}

// ─── Domain 10: Staff Operations & Telegram ──────────────────────────────────

export type StaffDepartment = 'housekeeping' | 'maintenance' | 'front_desk' | 'management' | 'kitchen' | 'security'
export type StaffShiftPattern = 'morning' | 'afternoon' | 'night' | 'flexible' | 'split'
export type StaffPermission =
  | 'manage_bookings'
  | 'manage_guests'
  | 'manage_payments'
  | 'manage_staff'
  | 'manage_units'
  | 'manage_rates'
  | 'view_reports'
  | 'manage_housekeeping'
  | 'manage_maintenance'
  | 'manage_telegram'

export interface AccommodationStaff {
  id: string
  organization_id: string
  user_id: string | null
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  department: StaffDepartment | null
  role: string | null
  telegram_chat_id: string | null
  telegram_username: string | null
  permissions: StaffPermission[]
  shift_pattern: StaffShiftPattern | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AccommodationTelegramChannel {
  id: string
  organization_id: string
  department: StaffDepartment
  channel_name: string | null
  chat_id: string
  bot_token: string | null
  is_active: boolean
  created_at: string
}

export type TaskAssignmentStatus = 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'rejected'

export interface AccommodationTaskAssignment {
  id: string
  organization_id: string
  task_type: string
  task_id: string
  staff_id: string | null
  assigned_by: string | null
  assigned_at: string
  accepted_at: string | null
  started_at: string | null
  completed_at: string | null
  status: TaskAssignmentStatus
  notes: string | null
  photo_urls: string[]
  telegram_message_id: string | null
}

// ─── Daily Brief Data ────────────────────────────────────────────────────────

export interface DailyBriefData {
  date: string
  property_name?: string
  arrivals: Array<{
    guest_name: string
    unit_name: string
    check_in_date: string
    guests_count: number
    special_requests?: string
    is_vip?: boolean
  }>
  departures: Array<{
    guest_name: string
    unit_name: string
    check_out_date: string
  }>
  turnovers_needed: Array<{
    unit_name: string
    checkout_time?: string
    next_checkin_time?: string
  }>
  occupancy: {
    total_units: number
    occupied: number
    arriving: number
    departing: number
    rate_percent: number
  }
  pending_tasks: {
    housekeeping: number
    maintenance: number
  }
  overdue_payments: number
  notes?: string[]
}

// ─── Domain 11: AI Agent Configuration ──────────────────────────────────────

export type AccommodationAgentType = 'quoter' | 'concierge' | 'reviewer' | 'pricer'

export interface AccommodationAIConfig {
  id: string
  organization_id: string
  agent_type: AccommodationAgentType
  is_enabled: boolean
  config: Record<string, unknown>
  system_prompt_override: string | null
  model_override: string | null
  created_at: string
  updated_at: string
}

// ─── Domain 12: Per-Unit Costing & Stock/Inventory ───────────────────────────

export type CostCategoryType = 'fixed' | 'variable' | 'per_guest' | 'per_night'

export interface AccommodationCostCategory {
  id: string
  organization_id: string
  name: string
  category_type: CostCategoryType
  default_amount: number | null
  unit_of_measure: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AccommodationUnitCost {
  id: string
  organization_id: string
  unit_id: string
  category_id: string
  booking_id: string | null
  amount: number
  quantity: number
  cost_date: string
  notes: string | null
  recorded_by: string | null
  created_at: string
  // Joined
  category?: AccommodationCostCategory
  unit?: { name: string }
}

export interface AccommodationCostDefault {
  id: string
  organization_id: string
  property_type: string | null
  unit_type: string | null
  category_id: string
  default_amount: number
  created_at: string
  // Joined
  category?: AccommodationCostCategory
}

export type StockCategory = 'linen' | 'toiletry' | 'cleaning' | 'consumable' | 'equipment'
export type StockMovementType = 'receipt' | 'issue' | 'adjustment' | 'write_off' | 'return'

export interface AccommodationStockItem {
  id: string
  organization_id: string
  name: string
  sku: string | null
  category: StockCategory
  unit_of_measure: string
  current_stock: number
  min_stock_level: number
  reorder_quantity: number | null
  unit_cost: number | null
  supplier: string | null
  location: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AccommodationStockMovement {
  id: string
  organization_id: string
  stock_item_id: string
  movement_type: StockMovementType
  quantity: number
  unit_id: string | null
  booking_id: string | null
  reference: string | null
  notes: string | null
  recorded_by: string | null
  created_at: string
  // Joined
  stock_item?: AccommodationStockItem
  unit?: { name: string }
}

export interface AccommodationUnitProfitability {
  id: string
  organization_id: string
  unit_id: string
  period_start: string
  period_end: string
  total_revenue: number
  total_costs: number
  gross_margin: number
  margin_percentage: number
  occupancy_days: number
  total_days: number
  occupancy_rate: number
  revenue_per_available_day: number
  cost_breakdown: Record<string, number>
  created_at: string
  // Joined
  unit?: { name: string }
}
