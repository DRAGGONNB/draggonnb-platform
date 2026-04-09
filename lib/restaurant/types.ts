// ─── Restaurant Core ───────────────────────────────────────────

export type EquipmentType = 'fridge' | 'freezer' | 'hot_hold' | 'cooking' | 'ambient'
export type TempStatus = 'ok' | 'warning' | 'critical'

export interface Restaurant {
  id: string
  organization_id: string
  name: string
  address: string | null
  phone: string | null
  slug: string | null
  timezone: string
  is_active: boolean
  telegram_bot_token: string | null
  telegram_channel_id: string | null
  telegram_manager_id: string | null
  payfast_merchant_id: string | null
  payfast_merchant_key: string | null
  payfast_passphrase: string | null
  service_charge_pct: number
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type TableShape = 'rect' | 'circle' | 'oval'

export interface RestaurantTable {
  id: string
  organization_id: string
  restaurant_id: string
  label: string
  section: string
  capacity: number
  qr_code_url: string | null
  qr_token: string | null
  is_active: boolean
  floor_plan_id: string | null
  x_pos: number
  y_pos: number
  width: number
  height: number
  rotation: number
  shape: TableShape
  linked_group_id: string | null
  created_at: string
}

export interface FloorPlan {
  id: string
  organization_id: string
  restaurant_id: string
  name: string
  canvas_width: number
  canvas_height: number
  background_image_url: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface TableGroup {
  id: string
  organization_id: string
  restaurant_id: string
  name: string
  combined_capacity: number
  is_active: boolean
  created_at: string
}

// ─── Sessions & Billing ────────────────────────────────────────

export type SessionStatus = 'open' | 'bill_requested' | 'partially_paid' | 'closed' | 'voided'
export type BillStatus = 'open' | 'paid' | 'partially_paid' | 'fully_paid' | 'closed'
export type PayerStatus = 'pending' | 'paid' | 'refunded'
export type SplitMode = 'none' | 'equal' | 'custom'

export interface TableSession {
  id: string
  organization_id: string
  restaurant_id: string
  table_id: string
  waiter_id: string | null
  status: SessionStatus
  party_size: number
  split_mode: SplitMode
  guest_whatsapp: string | null
  opened_at: string
  closed_at: string | null
  notes: string | null
  created_at: string
}

export interface Bill {
  id: string
  organization_id: string
  session_id: string
  restaurant_id: string
  subtotal: number
  service_charge_pct: number
  service_charge: number
  tip_total: number
  total: number
  currency: string
  status: BillStatus
  payfast_m_payment_id: string | null
  created_at: string
  updated_at: string
}

export interface BillItem {
  id: string
  organization_id: string
  bill_id: string
  menu_item_id: string | null
  name: string
  quantity: number
  unit_price: number
  line_total: number
  modifier_notes: string | null
  added_by: string | null
  voided: boolean
  void_reason: string | null
  voided_by: string | null
  created_at: string
}

export interface BillPayer {
  id: string
  organization_id: string
  bill_id: string
  slot_number: number
  whatsapp_number: string | null
  display_name: string
  amount_due: number
  amount_paid: number
  tip_amount: number
  status: PayerStatus
  payfast_token: string | null
  paid_at: string | null
}

export interface BillPayment {
  id: string
  organization_id: string
  bill_id: string
  payer_id: string | null
  amount: number
  tip: number
  payment_method: string | null
  payfast_ref: string | null
  itn_payload: Record<string, unknown> | null
  created_at: string
}

// ─── Menu ──────────────────────────────────────────────────────

export interface MenuCategory {
  id: string
  organization_id: string
  restaurant_id: string
  name: string
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface MenuItem {
  id: string
  organization_id: string
  category_id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_available: boolean
  dietary_tags: string[]
  sort_order: number
  created_at: string
}

// ─── Staff ─────────────────────────────────────────────────────

export type StaffRole = 'manager' | 'server' | 'bartender' | 'chef' | 'host'

export interface RestaurantStaff {
  id: string
  organization_id: string
  user_id: string | null
  restaurant_id: string | null
  display_name: string
  role: string
  hourly_rate: number | null
  employment_type: string
  phone: string | null
  telegram_chat_id: string | null
  whatsapp_number: string | null
  pin_hash: string | null
  is_active: boolean
  created_at: string
}

// ─── Reservations ──────────────────────────────────────────────

export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show'

export interface Reservation {
  id: string
  organization_id: string
  restaurant_id: string
  guest_name: string
  guest_phone: string | null
  guest_email: string | null
  party_size: number
  reservation_date: string
  reservation_time: string
  status: ReservationStatus
  special_requests: string | null
  reminder_sent: boolean
  contact_id: string | null
  created_at: string
}

// ─── Compliance ────────────────────────────────────────────────

export interface Equipment {
  id: string
  organization_id: string
  restaurant_id: string
  name: string
  type: string
  location: string | null
  min_temp: number | null
  max_temp: number | null
  is_active: boolean
  created_at: string
}

export interface TemperatureLog {
  id: string
  organization_id: string
  equipment_id: string
  temperature: number
  is_in_range: boolean
  recorded_by: string | null
  corrective_action: string | null
  recorded_at: string
}

// ─── Checklists & SOPs ────────────────────────────────────────

export interface ChecklistTemplate {
  id: string
  organization_id: string
  restaurant_id: string
  name: string
  type: string
  items: unknown[]
  assigned_role: string | null
  is_active: boolean
  created_at: string
}

export interface ChecklistInstance {
  id: string
  organization_id: string
  template_id: string
  shift_date: string
  assigned_to: string | null
  status: string
  due_at: string | null
  completed_at: string | null
  completed_by: string | null
  created_at: string
}

export type SOPFormat = 'text' | 'blocks'

export interface SOP {
  id: string
  organization_id: string
  restaurant_id: string
  title: string
  content: string
  sop_format: SOPFormat
  category: string | null
  visible_to_roles: string[]
  is_published: boolean
  created_at: string
  updated_at: string
}

// ─── Block-Based SOP System ──────────────────────────────────

export type SOPBlockType =
  | 'action' | 'checklist' | 'photo_upload' | 'ocr_scan'
  | 'number_input' | 'text_input' | 'approval' | 'sequence'

export interface SOPBlock {
  id: string
  organization_id: string
  sop_id: string
  sort_order: number
  block_type: SOPBlockType
  label: string
  description: string | null
  config: Record<string, unknown>
  is_required: boolean
  created_at: string
}

export type SOPInstanceStatus = 'pending' | 'in_progress' | 'completed' | 'blocked'

export interface SOPInstance {
  id: string
  organization_id: string
  restaurant_id: string
  sop_id: string
  shift_date: string
  assigned_to: string | null
  status: SOPInstanceStatus
  started_at: string | null
  completed_at: string | null
  completed_by: string | null
  created_at: string
}

export type BlockResponseStatus = 'pending' | 'completed' | 'skipped' | 'blocked'

export interface SOPBlockResponse {
  id: string
  organization_id: string
  instance_id: string
  block_id: string
  status: BlockResponseStatus
  response_data: Record<string, unknown>
  completed_by: string | null
  completed_at: string | null
  created_at: string
}

// Block config types
export interface ChecklistBlockConfig { items: string[] }
export interface PhotoUploadBlockConfig { max_photos: number; require_caption: boolean; label_hint?: string }
export interface OcrScanBlockConfig { expected_fields: string[]; label_hint?: string }
export interface NumberInputBlockConfig { unit: string; min?: number; max?: number }
export interface TextInputBlockConfig { placeholder?: string; max_length?: number }
export interface ApprovalBlockConfig { required_role: string; message?: string }
export interface SequenceBlockConfig { target_sop_id: string }

// Enriched types
export interface SOPWithBlocks extends SOP {
  blocks: SOPBlock[]
}

export interface SOPInstanceWithDetails extends SOPInstance {
  sop_title: string
  sop_category: string | null
  blocks: (SOPBlock & { response?: SOPBlockResponse })[]
  progress: number
}

// ─── API Request/Response Types ────────────────────────────────

export interface OpenSessionRequest {
  table_id: string
  waiter_id?: string
  party_size: number
  guest_whatsapp?: string
  split_mode?: SplitMode
}

export interface AddBillItemRequest {
  menu_item_id: string
  quantity: number
  modifier_notes?: string
  added_by: string
}

export interface VoidBillItemRequest {
  void_reason: string
  voided_by: string
}

export interface SplitBillRequest {
  mode: 'equal' | 'custom'
  payer_count?: number
  payers?: { display_name: string; amount_due: number }[]
}

export interface InitiatePaymentRequest {
  bill_id: string
  payer_id: string
  tip_amount?: number
}

// ─── Enriched types (with joins) ───────────────────────────────

export interface BillWithItems extends Bill {
  items: BillItem[]
  payers: BillPayer[]
}

export interface TableWithSession extends RestaurantTable {
  active_session?: TableSession & {
    waiter?: { display_name: string } | null
    bill?: Bill | null
  }
}

export interface FloorPlanWithTables extends FloorPlan {
  tables: TableWithSession[]
}

export interface TableGroupWithTables extends TableGroup {
  tables: RestaurantTable[]
}
