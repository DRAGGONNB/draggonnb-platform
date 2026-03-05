import { createAdminClient } from '@/lib/supabase/admin'
import type {
  BillingInvoice,
  InvoiceLineItem,
  InvoiceStatus,
} from './types'

// SA VAT rate
const VAT_RATE = 0.15

// ---------------------------------------------------------------------------
// CREATE INVOICE
// ---------------------------------------------------------------------------

/**
 * Create a draft invoice for an organization. Auto-generates the invoice number
 * via the generate_invoice_number() DB function.
 */
export async function createInvoice(
  orgId: string,
  planId: string,
  metadata?: Record<string, unknown>
): Promise<{
  data: BillingInvoice | null
  error: string | null
}> {
  try {
    const supabase = createAdminClient()

    // Fetch the plan to calculate amounts
    const { data: plan, error: planError } = await supabase
      .from('billing_plans')
      .select('id, display_name, price_zar')
      .eq('id', planId)
      .single()

    if (planError || !plan) {
      console.error('Failed to fetch plan for invoice:', planError?.message)
      return { data: null, error: planError?.message || 'Plan not found' }
    }

    // Generate line items
    const lineItems = generateInvoiceLineItems(
      plan.display_name as string,
      plan.price_zar as number
    )

    const amountZar = plan.price_zar as number
    const taxZar = Math.round(amountZar * VAT_RATE)
    const totalZar = amountZar + taxZar

    // Generate invoice number via DB function
    const { data: invoiceNumber, error: seqError } = await supabase
      .rpc('generate_invoice_number')

    if (seqError) {
      console.error('Failed to generate invoice number:', seqError.message)
      return { data: null, error: seqError.message }
    }

    // Calculate due date (30 days from now)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)

    // Insert invoice
    const { data: invoice, error: insertError } = await supabase
      .from('billing_invoices')
      .insert({
        organization_id: orgId,
        plan_id: planId,
        invoice_number: invoiceNumber as string,
        amount_zar: amountZar,
        tax_zar: taxZar,
        total_zar: totalZar,
        status: 'draft',
        line_items: lineItems,
        due_date: dueDate.toISOString().split('T')[0],
        metadata: metadata || {},
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('Failed to create invoice:', insertError.message)
      return { data: null, error: insertError.message }
    }

    return { data: invoice as unknown as BillingInvoice, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error creating invoice'
    console.error('createInvoice error:', message)
    return { data: null, error: message }
  }
}

// ---------------------------------------------------------------------------
// GET INVOICES
// ---------------------------------------------------------------------------

/**
 * List invoices for an organization, optionally filtered by status.
 */
export async function getInvoices(
  orgId: string,
  status?: InvoiceStatus
): Promise<{
  data: BillingInvoice[] | null
  error: string | null
}> {
  try {
    const supabase = createAdminClient()

    let query = supabase
      .from('billing_invoices')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch invoices:', error.message)
      return { data: null, error: error.message }
    }

    return { data: data as unknown as BillingInvoice[], error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error fetching invoices'
    console.error('getInvoices error:', message)
    return { data: null, error: message }
  }
}

// ---------------------------------------------------------------------------
// GET SINGLE INVOICE
// ---------------------------------------------------------------------------

/**
 * Get a single invoice by ID.
 */
export async function getInvoice(invoiceId: string): Promise<{
  data: BillingInvoice | null
  error: string | null
}> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('billing_invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (error) {
      console.error('Failed to fetch invoice:', error.message)
      return { data: null, error: error.message }
    }

    return { data: data as unknown as BillingInvoice, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error fetching invoice'
    console.error('getInvoice error:', message)
    return { data: null, error: message }
  }
}

// ---------------------------------------------------------------------------
// MARK INVOICE PAID
// ---------------------------------------------------------------------------

/**
 * Mark an invoice as paid. Updates status, sets paid_at, and records the
 * PayFast payment ID.
 */
export async function markInvoicePaid(
  invoiceId: string,
  payfastPaymentId: string
): Promise<{
  data: BillingInvoice | null
  error: string | null
}> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('billing_invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payfast_payment_id: payfastPaymentId,
      })
      .eq('id', invoiceId)
      .select('*')
      .single()

    if (error) {
      console.error('Failed to mark invoice paid:', error.message)
      return { data: null, error: error.message }
    }

    return { data: data as unknown as BillingInvoice, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error marking invoice paid'
    console.error('markInvoicePaid error:', message)
    return { data: null, error: message }
  }
}

// ---------------------------------------------------------------------------
// GENERATE LINE ITEMS
// ---------------------------------------------------------------------------

/**
 * Generate standard invoice line items for a plan subscription.
 * Includes the plan fee and 15% South African VAT.
 */
export function generateInvoiceLineItems(
  planName: string,
  priceZar: number
): InvoiceLineItem[] {
  const taxZar = Math.round(priceZar * VAT_RATE)

  return [
    {
      description: `DraggonnB CRMM - ${planName} Plan (Monthly)`,
      quantity: 1,
      unit_price_zar: priceZar,
      total_zar: priceZar,
    },
    {
      description: 'VAT (15%)',
      quantity: 1,
      unit_price_zar: taxZar,
      total_zar: taxZar,
    },
  ]
}
