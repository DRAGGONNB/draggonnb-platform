import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/restaurant/constants'
import type { SplitBillRequest } from '@/lib/restaurant/types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: billId } = await params
  const supabase = createServiceClient()
  const body: SplitBillRequest = await req.json()

  // Get bill
  const { data: bill } = await supabase
    .from('bills')
    .select('id, total, status')
    .eq('id', billId)
    .single()

  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
  if (bill.status === 'closed') {
    return NextResponse.json({ error: 'Bill is closed' }, { status: 400 })
  }

  // Remove existing payers (re-split scenario)
  await supabase.from('bill_payers').delete().eq('bill_id', billId)

  let payers: { organization_id: string; bill_id: string; slot_number: number; display_name: string; amount_due: number; amount_paid: number; tip_amount: number; status: string }[]

  if (body.mode === 'equal') {
    const count = body.payer_count ?? 1
    const amountEach = Math.round((bill.total / count) * 100) / 100
    // Last payer gets remainder to handle rounding
    payers = Array.from({ length: count }, (_, i) => ({
      organization_id: ORG_ID,
      bill_id: billId,
      slot_number: i + 1,
      display_name: count === 1 ? 'Full Payment' : `Guest ${i + 1}`,
      amount_due: i === count - 1 ? bill.total - amountEach * (count - 1) : amountEach,
      amount_paid: 0,
      tip_amount: 0,
      status: 'pending',
    }))
  } else {
    // Custom split
    if (!body.payers?.length) {
      return NextResponse.json({ error: 'payers array required for custom split' }, { status: 400 })
    }
    payers = body.payers.map((p, i) => ({
      organization_id: ORG_ID,
      bill_id: billId,
      slot_number: i + 1,
      display_name: p.display_name,
      amount_due: p.amount_due,
      amount_paid: 0,
      tip_amount: 0,
      status: 'pending',
    }))
  }

  const { data: inserted, error } = await supabase
    .from('bill_payers')
    .insert(payers)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update bill split_mode on session
  const { data: billData } = await supabase
    .from('bills')
    .select('session_id')
    .eq('id', billId)
    .single()

  if (billData?.session_id) {
    await supabase
      .from('table_sessions')
      .update({ split_mode: body.mode === 'equal' && (body.payer_count ?? 1) > 1 ? 'equal' : body.mode })
      .eq('id', billData.session_id)
  }

  // Fire N8N split notification webhook (non-blocking)
  const webhookUrl = process.env.N8N_WEBHOOK_BILL_SPLIT
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bill_id: billId, payers: inserted }),
    }).catch(() => {})
  }

  return NextResponse.json({ payers: inserted })
}
