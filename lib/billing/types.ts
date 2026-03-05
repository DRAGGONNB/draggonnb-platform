/**
 * Billing System Types
 * Matches billing_plans, billing_invoices, billing_plan_changes,
 * credit_pack_catalog, credit_purchases, and credit_ledger DB tables.
 * All monetary amounts in ZAR cents (150000 = R1,500).
 */

// ---------------------------------------------------------------------------
// Enums / Union Types
// ---------------------------------------------------------------------------

export type SubscriptionStatus =
  | 'pending'
  | 'active'
  | 'payment_failed'
  | 'payment_pending'
  | 'cancelled'
  | 'suspended'

export type InvoiceStatus =
  | 'draft'
  | 'issued'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'refunded'

export type PlanChangeDirection = 'upgrade' | 'downgrade' | 'same'

// ---------------------------------------------------------------------------
// billing_plans
// ---------------------------------------------------------------------------

export interface BillingPlan {
  id: string
  display_name: string
  description: string | null
  price_zar: number
  frequency: 'monthly' | 'annual'
  is_active: boolean
  sort_order: number
  features: string[]
  limits: Record<string, number>
  payfast_item_code: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// billing_invoices
// ---------------------------------------------------------------------------

export interface InvoiceLineItem {
  description: string
  quantity: number
  unit_price_zar: number
  total_zar: number
}

export interface BillingInvoice {
  id: string
  organization_id: string
  invoice_number: string
  plan_id: string | null
  amount_zar: number
  tax_zar: number
  total_zar: number
  status: InvoiceStatus
  issued_at: string | null
  paid_at: string | null
  due_date: string | null
  payfast_payment_id: string | null
  line_items: InvoiceLineItem[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// billing_plan_changes
// ---------------------------------------------------------------------------

export interface PlanChange {
  id: string
  organization_id: string
  from_plan_id: string | null
  to_plan_id: string
  changed_by: string | null
  reason: string | null
  effective_at: string
  created_at: string
}

// ---------------------------------------------------------------------------
// credit_pack_catalog
// ---------------------------------------------------------------------------

export interface CreditPack {
  id: string
  display_name: string
  description: string | null
  metric: string
  credit_amount: number
  price_zar: number
  is_active: boolean
  sort_order: number
  min_tier: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// credit_purchases
// ---------------------------------------------------------------------------

export interface CreditPurchase {
  id: string
  organization_id: string
  pack_id: string
  metric: string
  credits_purchased: number
  credits_remaining: number
  price_zar: number
  payfast_payment_id: string | null
  status: 'pending' | 'active' | 'depleted' | 'expired' | 'refunded'
  purchased_at: string
  expires_at: string | null
  depleted_at: string | null
}

// ---------------------------------------------------------------------------
// Credit balance (computed via get_credit_balances RPC)
// ---------------------------------------------------------------------------

export interface CreditBalance {
  metric: string
  remaining: number
}

// ---------------------------------------------------------------------------
// Subscription info (computed from organizations table)
// ---------------------------------------------------------------------------

export interface SubscriptionInfo {
  organization_id: string
  plan_id: string | null
  subscription_status: SubscriptionStatus
  next_billing_date: string | null
  payfast_subscription_token: string | null
  plan: BillingPlan | null
}

// ---------------------------------------------------------------------------
// Payment event data (from PayFast ITN)
// ---------------------------------------------------------------------------

export interface PaymentEventData {
  pf_payment_id: string
  payment_status: string
  amount_gross: string
  amount_fee: string
  amount_net: string
  billing_date?: string
}
