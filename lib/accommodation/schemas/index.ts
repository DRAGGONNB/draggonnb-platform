import { z } from 'zod'

// ─── Shared Enums ───────────────────────────────────────────────────────────

export const propertyTypeConfig = z.enum(['game_lodge', 'guest_house', 'vacation_rental', 'lodge'])
export const propertyType = z.enum(['hotel', 'guesthouse', 'bnb', 'lodge', 'apartment', 'villa', 'resort', 'game_lodge', 'vacation_rental', 'other'])
export const propertyStatus = z.enum(['active', 'inactive', 'archived'])
export const unitType = z.enum(['room', 'suite', 'apartment', 'cottage', 'tent', 'dorm', 'house', 'chalet', 'cabin', 'villa', 'bungalow', 'other'])
export const unitStatus = z.enum(['available', 'occupied', 'maintenance', 'blocked'])
export const roomType = z.enum(['bedroom', 'suite', 'dormitory', 'other'])
export const bedConfig = z.enum(['single', 'double', 'twin', 'king', 'queen', 'bunk', 'sleeper_couch', 'other'])
export const priceBasis = z.enum(['per_person', 'per_unit', 'per_room', 'per_bedroom', 'per_group'])
export const mealPlan = z.enum(['room_only', 'bed_and_breakfast', 'half_board', 'full_board', 'all_inclusive', 'self_catering'])
export const guestCategory = z.enum(['adult', 'child', 'infant', 'teenager', 'senior', 'per_unit'])
export const season = z.enum(['low', 'standard', 'high', 'peak', 'festive'])
export const bookingStatus = z.enum(['inquiry', 'quoted', 'pending_deposit', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'])
export const bookingSource = z.enum(['direct', 'booking_com', 'airbnb', 'whatsapp', 'email', 'phone', 'website', 'agent', 'ota_other'])
export const lineItemType = z.enum(['accommodation', 'fee', 'discount', 'tax', 'addon', 'adjustment'])
export const blockType = z.enum(['booking', 'maintenance', 'owner_use', 'manual_block'])
export const paymentGateway = z.enum(['payfast', 'manual', 'eft', 'cash', 'card', 'other'])
export const paymentMode = z.enum(['mode_a', 'mode_b'])
export const paymentStatus = z.enum(['pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded', 'cancelled'])
export const readinessStatus = z.enum(['dirty', 'cleaning', 'inspected', 'ready', 'maintenance'])
export const issuePriority = z.enum(['low', 'medium', 'high', 'urgent'])
export const issueStatus = z.enum(['open', 'in_progress', 'resolved', 'closed', 'deferred'])
export const taskStatus = z.enum(['pending', 'in_progress', 'completed', 'cancelled'])

// ─── Domain 1: Inventory Schemas ────────────────────────────────────────────

export const createPropertySchema = z.object({
  name: z.string().min(1, 'Property name is required').max(200),
  type: propertyType,
  property_type_config: propertyTypeConfig.default('guest_house'),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().default('South Africa'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  timezone: z.string().default('Africa/Johannesburg'),
  currency: z.string().default('ZAR'),
  amenities: z.array(z.string()).default([]),
  check_in_time: z.string().default('14:00'),
  check_out_time: z.string().default('10:00'),
  description: z.string().optional(),
  policies: z.record(z.unknown()).default({}),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  star_rating: z.number().int().min(1).max(5).optional(),
  status: propertyStatus.default('active'),
})

export const updatePropertySchema = createPropertySchema.partial()

export const createUnitSchema = z.object({
  property_id: z.string().uuid(),
  name: z.string().min(1, 'Unit name is required').max(200),
  type: unitType,
  unit_code: z.string().optional(),
  bedrooms: z.number().int().min(0).default(1),
  bathrooms: z.number().int().min(0).default(1),
  max_guests: z.number().int().min(1).default(2),
  max_adults: z.number().int().min(1).default(2),
  max_children: z.number().int().min(0).default(0),
  max_capacity: z.number().int().min(1).default(2),
  has_rooms: z.boolean().default(false),
  size_sqm: z.number().positive().optional(),
  floor_level: z.number().int().optional(),
  base_price_per_night: z.number().min(0).default(0),
  amenities: z.array(z.string()).default([]),
  description: z.string().optional(),
  status: unitStatus.default('available'),
  sort_order: z.number().int().default(0),
})

export const updateUnitSchema = createUnitSchema.partial().omit({ property_id: true })

export const createRoomSchema = z.object({
  unit_id: z.string().uuid(),
  name: z.string().min(1, 'Room name is required').max(200),
  room_code: z.string().optional(),
  room_type: roomType.default('bedroom'),
  bed_config: bedConfig.default('double'),
  max_guests: z.number().int().min(1).default(2),
  has_ensuite: z.boolean().default(false),
  amenities: z.array(z.string()).default([]),
  description: z.string().optional(),
  status: unitStatus.default('available'),
  sort_order: z.number().int().default(0),
})

export const updateRoomSchema = createRoomSchema.partial().omit({ unit_id: true })

// ─── Domain 2: Pricing Schemas ──────────────────────────────────────────────

export const createRatePlanSchema = z.object({
  property_id: z.string().uuid(),
  name: z.string().min(1, 'Rate plan name is required').max(200),
  description: z.string().optional(),
  price_basis: priceBasis.default('per_unit'),
  meal_plan: mealPlan.default('room_only'),
  valid_from: z.string().optional(),
  valid_to: z.string().optional(),
  is_default: z.boolean().default(false),
  status: propertyStatus.default('active'),
})

export const updateRatePlanSchema = createRatePlanSchema.partial().omit({ property_id: true })

export const createRatePlanPriceSchema = z.object({
  rate_plan_id: z.string().uuid(),
  unit_id: z.string().uuid().optional(),
  guest_category: guestCategory.default('adult'),
  season: season.default('standard'),
  day_of_week: z.enum(['all', 'weekday', 'weekend', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).default('all'),
  price: z.number().min(0),
  min_nights: z.number().int().min(1).default(1),
})

export const createDiscountSchema = z.object({
  property_id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  discount_type: z.enum(['length_of_stay', 'early_bird', 'last_minute', 'promo_code', 'date_range', 'returning_guest', 'group']),
  value_type: z.enum(['percentage', 'fixed']).default('percentage'),
  value: z.number().min(0),
  promo_code: z.string().optional(),
  min_nights: z.number().int().min(1).optional(),
  min_guests: z.number().int().min(1).optional(),
  days_before_arrival: z.number().int().min(0).optional(),
  valid_from: z.string().optional(),
  valid_to: z.string().optional(),
  stackable: z.boolean().default(false),
  max_uses: z.number().int().min(1).optional(),
  status: z.enum(['active', 'inactive', 'expired']).default('active'),
})

export const createFeeSchema = z.object({
  property_id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  fee_type: z.enum(['fixed', 'percentage', 'per_person', 'per_night', 'per_person_per_night']).default('fixed'),
  amount: z.number().min(0),
  is_taxable: z.boolean().default(true),
  is_mandatory: z.boolean().default(true),
  applies_to: z.enum(['booking', 'person', 'night', 'unit']).default('booking'),
  status: z.enum(['active', 'inactive']).default('active'),
})

// ─── Domain 3: Booking Schemas ──────────────────────────────────────────────

export const createBookingSchema = z.object({
  guest_id: z.string().uuid(),
  property_id: z.string().uuid(),
  check_in_date: z.string().min(1, 'Check-in date is required'),
  check_out_date: z.string().min(1, 'Check-out date is required'),
  adults: z.number().int().min(1).default(1),
  children: z.number().int().min(0).default(0),
  infants: z.number().int().min(0).default(0),
  source: bookingSource.default('direct'),
  rate_plan_id: z.string().uuid().optional(),
  special_requests: z.string().optional(),
  internal_notes: z.string().optional(),
}).refine(data => new Date(data.check_out_date) > new Date(data.check_in_date), {
  message: 'Check-out date must be after check-in date',
  path: ['check_out_date'],
})

export const updateBookingSchema = z.object({
  status: bookingStatus.optional(),
  check_in_date: z.string().optional(),
  check_out_date: z.string().optional(),
  adults: z.number().int().min(1).optional(),
  children: z.number().int().min(0).optional(),
  infants: z.number().int().min(0).optional(),
  rate_plan_id: z.string().uuid().optional(),
  special_requests: z.string().optional(),
  internal_notes: z.string().optional(),
  cancellation_reason: z.string().optional(),
})

// ─── Domain 6: Guest Schemas ────────────────────────────────────────────────

export const createGuestSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  id_number: z.string().optional(),
  id_type: z.enum(['sa_id', 'passport', 'drivers_license', 'other']).default('sa_id'),
  date_of_birth: z.string().optional(),
  nationality: z.string().optional(),
  dietary: z.array(z.string()).default([]),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  language: z.string().default('en'),
  source: z.string().default('direct'),
  preferences: z.record(z.unknown()).default({}),
  vip_status: z.boolean().default(false),
  notes: z.string().optional(),
})

export const updateGuestSchema = createGuestSchema.partial()

// ─── Domain 7: Configuration Schemas ────────────────────────────────────────

export const createDepositPolicySchema = z.object({
  property_id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  deposit_type: z.enum(['percentage', 'fixed', 'first_night', 'full']).default('percentage'),
  value: z.number().min(0),
  due_days_before_arrival: z.number().int().min(0).default(0),
  is_default: z.boolean().default(false),
})

export const createCancellationPolicySchema = z.object({
  property_id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  tiers: z.array(z.object({
    days_before: z.number().int().min(0),
    refund_percentage: z.number().min(0).max(100),
  })).min(1),
  no_show_charge_percentage: z.number().min(0).max(100).default(100),
  is_default: z.boolean().default(false),
})

// ─── Domain 8: Email & Comms Schemas ───────────────────────────────────────

export const createEmailTemplateSchema = z.object({
  property_id: z.string().uuid().optional(),
  trigger_type: z.enum([
    'booking_confirmation', 'booking_cancellation', 'check_in_reminder',
    'check_out_reminder', 'payment_received', 'deposit_reminder',
    'review_request', 'welcome', 'access_pack', 'custom',
  ]),
  subject: z.string().min(1, 'Subject is required').max(500),
  body: z.string().min(1, 'Body is required'),
  is_active: z.boolean().default(true),
  send_days_offset: z.number().int().optional(),
})

export const createCommsTimelineSchema = z.object({
  booking_id: z.string().uuid().optional(),
  guest_id: z.string().uuid().optional(),
  channel: z.enum(['email', 'whatsapp', 'sms', 'phone', 'in_person', 'system', 'other']),
  direction: z.enum(['inbound', 'outbound', 'internal']),
  subject: z.string().max(500).optional(),
  content: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

// ─── Domain 9: Automation & Communications ──────────────────────────────────

export const automationTriggerEvent = z.enum([
  'booking_confirmed', 'booking_cancelled',
  'guest_checked_in', 'guest_checked_out',
  'payment_received', 'deposit_due',
  'check_in_24h', 'check_out_reminder', 'review_request',
])

export const automationChannel = z.enum(['whatsapp', 'email', 'sms'])
export const messageQueueStatus = z.enum(['pending', 'sent', 'failed', 'cancelled'])

export const createAutomationRuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required').max(200),
  trigger_event: automationTriggerEvent,
  channel: automationChannel,
  template_id: z.string().max(200).optional(),
  delay_minutes: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
  conditions: z.record(z.unknown()).default({}),
})

export const updateAutomationRuleSchema = createAutomationRuleSchema.partial()

export const createMessageQueueSchema = z.object({
  rule_id: z.string().uuid().optional(),
  booking_id: z.string().uuid().optional(),
  guest_id: z.string().uuid().optional(),
  channel: automationChannel,
  recipient: z.string().min(1, 'Recipient is required'),
  template_data: z.record(z.unknown()).default({}),
  scheduled_for: z.string().min(1, 'Scheduled time is required'),
  status: messageQueueStatus.default('pending'),
})

export const updateMessageQueueSchema = z.object({
  status: messageQueueStatus.optional(),
  scheduled_for: z.string().optional(),
})

export const createCommsLogSchema = z.object({
  booking_id: z.string().uuid().optional(),
  guest_id: z.string().uuid().optional(),
  channel: z.string().min(1),
  direction: z.enum(['outbound', 'inbound']).default('outbound'),
  message_type: z.string().min(1),
  recipient: z.string().optional(),
  content_summary: z.string().optional(),
  external_id: z.string().optional(),
  status: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
})

export const sendManualMessageSchema = z.object({
  booking_id: z.string().uuid().optional(),
  guest_id: z.string().uuid().optional(),
  channel: automationChannel,
  recipient: z.string().min(1, 'Recipient is required'),
  message: z.string().min(1, 'Message is required'),
  template_id: z.string().optional(),
})

export const emitEventSchema = z.object({
  booking_id: z.string().uuid(),
  event: automationTriggerEvent,
})

// ─── Domain 9: Payment Tracking & Financial ─────────────────────────────────

export const paymentLinkStatus = z.enum(['pending', 'paid', 'expired', 'cancelled'])
export const accommodationPaymentType = z.enum(['deposit', 'balance', 'additional_fee'])

export const createPaymentLinkSchema = z.object({
  booking_id: z.string().uuid(),
  amount: z.number().positive('Amount must be positive'),
  payment_type: accommodationPaymentType,
  expires_in_hours: z.number().int().min(1).max(720).default(72),
})

export const updatePaymentLinkSchema = z.object({
  status: paymentLinkStatus.optional(),
})

export const generatePaymentLinkRequestSchema = z.object({
  booking_id: z.string().uuid(),
  amount: z.number().positive('Amount must be positive'),
  payment_type: accommodationPaymentType,
  expires_in_hours: z.number().int().min(1).max(720).optional(),
})

export const generateFinancialSnapshotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format').optional(),
})

// ─── Domain 10: Staff Operations & Telegram ──────────────────────────────────

export const staffDepartment = z.enum([
  'housekeeping',
  'maintenance',
  'front_desk',
  'management',
  'kitchen',
  'security',
])

export const staffShiftPattern = z.enum(['morning', 'afternoon', 'night', 'flexible', 'split'])

export const staffPermission = z.enum([
  'manage_bookings',
  'manage_guests',
  'manage_payments',
  'manage_staff',
  'manage_units',
  'manage_rates',
  'view_reports',
  'manage_housekeeping',
  'manage_maintenance',
  'manage_telegram',
])

export const taskAssignmentStatus = z.enum([
  'assigned',
  'accepted',
  'in_progress',
  'completed',
  'rejected',
])

// ─── Staff Schemas ───────────────────────────────────────────────────────────

export const createStaffSchema = z.object({
  user_id: z.string().uuid().optional(),
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  department: staffDepartment.optional().nullable(),
  role: z.string().max(100).optional().nullable(),
  telegram_chat_id: z.string().optional().nullable(),
  telegram_username: z.string().optional().nullable(),
  permissions: z.array(staffPermission).default([]),
  shift_pattern: staffShiftPattern.optional().nullable(),
  is_active: z.boolean().default(true),
})

export const updateStaffSchema = createStaffSchema.partial()

// ─── Telegram Channel Schemas ────────────────────────────────────────────────

export const createTelegramChannelSchema = z.object({
  department: staffDepartment,
  channel_name: z.string().max(200).optional().nullable(),
  chat_id: z.string().min(1, 'Chat ID is required'),
  bot_token: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
})

export const updateTelegramChannelSchema = createTelegramChannelSchema.partial()

// ─── Task Assignment Schemas ─────────────────────────────────────────────────

export const createTaskAssignmentSchema = z.object({
  task_type: z.string().min(1, 'Task type is required'),
  task_id: z.string().uuid(),
  staff_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const updateTaskAssignmentSchema = z.object({
  staff_id: z.string().uuid().optional().nullable(),
  status: taskAssignmentStatus.optional(),
  notes: z.string().optional().nullable(),
  photo_urls: z.array(z.string().url()).optional(),
})

// ─── Daily Brief Query Schema ────────────────────────────────────────────────

export const dailyBriefQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format').optional(),
})

// ─── Domain 11: AI Agent Configuration ──────────────────────────────────────

export const accommodationAgentType = z.enum(['quoter', 'concierge', 'reviewer', 'pricer'])

export const createAIConfigSchema = z.object({
  agent_type: accommodationAgentType,
  is_enabled: z.boolean().default(false),
  config: z.record(z.unknown()).default({}),
  system_prompt_override: z.string().max(10000).optional().nullable(),
  model_override: z.string().max(100).optional().nullable(),
})

export const updateAIConfigSchema = createAIConfigSchema.partial()

// ─── AI Agent Request Schemas ───────────────────────────────────────────────

export const generateQuoteSchema = z.object({
  inquiry_text: z.string().min(1, 'Inquiry text is required'),
  guest_name: z.string().optional(),
  guest_email: z.string().email().optional(),
  guest_phone: z.string().optional(),
  check_in_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  check_out_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  guests: z.number().int().min(1).optional(),
  property_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
})

export const conciergeMessageSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  guest_phone: z.string().optional(),
  guest_id: z.string().uuid().optional(),
  booking_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
})

export const analyzeReviewSchema = z.object({
  review_text: z.string().min(1, 'Review text is required'),
  reviewer_name: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  platform: z.string().optional(),
  booking_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
})

export const pricingAnalysisSchema = z.object({
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  property_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
})

// ─── Phase 5: Per-Unit Costing & Stock/Inventory ───────────────────────────

export const createCostCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category_type: z.enum(['fixed', 'variable', 'per_guest', 'per_night']),
  default_amount: z.number().min(0).optional(),
  unit_of_measure: z.string().optional(),
  is_active: z.boolean().optional(),
})

export const updateCostCategorySchema = createCostCategorySchema.partial()

export const createUnitCostSchema = z.object({
  unit_id: z.string().uuid(),
  category_id: z.string().uuid(),
  booking_id: z.string().uuid().optional(),
  amount: z.number().min(0),
  quantity: z.number().min(0).optional(),
  cost_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  notes: z.string().optional(),
})

export const updateUnitCostSchema = createUnitCostSchema.partial()

export const createCostDefaultSchema = z.object({
  property_type: z.string().optional(),
  unit_type: z.string().optional(),
  category_id: z.string().uuid(),
  default_amount: z.number().min(0),
})

export const updateCostDefaultSchema = createCostDefaultSchema.partial()

export const createStockItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().optional(),
  category: z.enum(['linen', 'toiletry', 'cleaning', 'consumable', 'equipment']),
  unit_of_measure: z.string().min(1, 'Unit of measure is required'),
  current_stock: z.number().min(0).optional(),
  min_stock_level: z.number().min(0).optional(),
  reorder_quantity: z.number().min(0).optional(),
  unit_cost: z.number().min(0).optional(),
  supplier: z.string().optional(),
  location: z.string().optional(),
  is_active: z.boolean().optional(),
})

export const updateStockItemSchema = createStockItemSchema.partial()

export const createStockMovementSchema = z.object({
  stock_item_id: z.string().uuid(),
  movement_type: z.enum(['receipt', 'issue', 'adjustment', 'write_off', 'return']),
  quantity: z.number(),
  unit_id: z.string().uuid().optional(),
  booking_id: z.string().uuid().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

export const generateProfitabilitySchema = z.object({
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  unit_id: z.string().uuid().optional(),
})
