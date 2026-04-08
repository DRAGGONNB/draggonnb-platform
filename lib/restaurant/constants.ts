// ─── IDs ───────────────────────────────────────────────────────

export const RESTAURANT_ID = '0e1c61c5-42c7-4703-9047-ed3dcdf35e15'
export const ORG_ID = '678634bd-0f62-423d-a828-b7a1394580b5'

// ─── PayFast ───────────────────────────────────────────────────

export const PAYFAST_SANDBOX_URL = 'https://sandbox.payfast.co.za/eng/process'
export const PAYFAST_LIVE_URL = 'https://www.payfast.co.za/eng/process'
export const PAYFAST_URL = process.env.NODE_ENV === 'production'
  ? PAYFAST_LIVE_URL
  : PAYFAST_SANDBOX_URL

// Valid PayFast source IPs for ITN validation
export const PAYFAST_VALID_IPS = [
  '197.97.145.144',
  '197.97.145.145',
  '197.97.145.146',
  '197.97.145.147',
  '41.74.179.194',
  '41.74.179.195',
  '41.74.179.196',
  '41.74.179.197',
]

// ─── Table Sections ────────────────────────────────────────────

export const SECTION_ORDER = ['deck', 'indoor', 'bar', 'private'] as const
export type SectionKey = (typeof SECTION_ORDER)[number]

export const SECTION_META: Record<string, { label: string; color: string; bg: string }> = {
  deck: { label: 'Deck', color: 'text-sky-700', bg: 'bg-sky-50' },
  indoor: { label: 'Indoor', color: 'text-amber-700', bg: 'bg-amber-50' },
  bar: { label: 'Bar', color: 'text-purple-700', bg: 'bg-purple-50' },
  private: { label: 'Private', color: 'text-rose-700', bg: 'bg-rose-50' },
}

// ─── Status Colors ─────────────────────────────────────────────

export const SESSION_STATUS_COLORS: Record<string, { text: string; bg: string; dot: string }> = {
  available: { text: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  occupied: { text: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  pending_payment: { text: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-500' },
}

export const BILL_STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  open: { text: 'text-blue-700', bg: 'bg-blue-50' },
  partially_paid: { text: 'text-amber-700', bg: 'bg-amber-50' },
  fully_paid: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
  closed: { text: 'text-gray-500', bg: 'bg-gray-100' },
}

export const PAYER_STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  pending: { text: 'text-amber-700', bg: 'bg-amber-50' },
  paid: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
  refunded: { text: 'text-gray-500', bg: 'bg-gray-100' },
}

export const RESERVATION_STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  pending: { text: 'text-amber-700', bg: 'bg-amber-50' },
  confirmed: { text: 'text-blue-700', bg: 'bg-blue-50' },
  seated: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
  completed: { text: 'text-gray-500', bg: 'bg-gray-100' },
  cancelled: { text: 'text-red-700', bg: 'bg-red-50' },
  no_show: { text: 'text-red-700', bg: 'bg-red-50' },
}

export const STAFF_ROLE_COLORS: Record<string, { text: string; bg: string }> = {
  manager: { text: 'text-purple-700', bg: 'bg-purple-50' },
  server: { text: 'text-blue-700', bg: 'bg-blue-50' },
  bartender: { text: 'text-amber-700', bg: 'bg-amber-50' },
  chef: { text: 'text-red-700', bg: 'bg-red-50' },
  host: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
}

// ─── SOP Block System ─────────────────────────────────────────

export const SOP_BLOCK_TYPES = [
  'action', 'checklist', 'photo_upload', 'ocr_scan',
  'number_input', 'text_input', 'approval', 'sequence',
] as const

export const SOP_BLOCK_META: Record<string, {
  label: string; icon: string; color: string; bg: string; description: string
}> = {
  action:       { label: 'Action',    icon: 'CheckCircle2', color: 'text-emerald-700', bg: 'bg-emerald-50', description: 'Simple task to complete or skip' },
  checklist:    { label: 'Checklist', icon: 'ListChecks',   color: 'text-blue-700',    bg: 'bg-blue-50',    description: 'Multi-item tick list' },
  photo_upload: { label: 'Photo',     icon: 'Camera',       color: 'text-purple-700',  bg: 'bg-purple-50',  description: 'Camera capture or file upload' },
  ocr_scan:     { label: 'OCR Scan',  icon: 'ScanText',     color: 'text-amber-700',   bg: 'bg-amber-50',   description: 'Photo + AI text extraction' },
  number_input: { label: 'Number',    icon: 'Hash',         color: 'text-red-700',     bg: 'bg-red-50',     description: 'Numeric entry with validation' },
  text_input:   { label: 'Text',      icon: 'Type',         color: 'text-sky-700',     bg: 'bg-sky-50',     description: 'Free text notes' },
  approval:     { label: 'Approval',  icon: 'ShieldCheck',  color: 'text-orange-700',  bg: 'bg-orange-50',  description: 'Role-gated sign-off' },
  sequence:     { label: 'Sequence',  icon: 'ArrowRight',   color: 'text-indigo-700',  bg: 'bg-indigo-50',  description: 'Trigger another SOP' },
}

export const SOP_INSTANCE_STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  pending:     { text: 'text-gray-500',    bg: 'bg-gray-100' },
  in_progress: { text: 'text-blue-700',    bg: 'bg-blue-50' },
  completed:   { text: 'text-emerald-700', bg: 'bg-emerald-50' },
  blocked:     { text: 'text-amber-700',   bg: 'bg-amber-50' },
}

export const SOP_CATEGORIES = ['Service', 'Kitchen', 'Safety', 'Hygiene', 'HR', 'General'] as const
export const STAFF_ROLES = ['manager', 'server', 'bartender', 'chef', 'host'] as const
export const CHECKLIST_TYPES = ['opening', 'closing', 'cleaning', 'food_prep'] as const

// ─── Helpers ───────────────────────────────────────────────────

export function formatZAR(amount: number): string {
  return `R ${amount.toFixed(2)}`
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function elapsedMinutes(from: string): number {
  return Math.floor((Date.now() - new Date(from).getTime()) / 60000)
}
