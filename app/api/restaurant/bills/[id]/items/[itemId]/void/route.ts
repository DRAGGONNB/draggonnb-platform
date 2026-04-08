import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { VoidBillItemRequest } from '@/lib/restaurant/types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id: billId, itemId } = await params
  const supabase = createServiceClient()
  const body: VoidBillItemRequest = await req.json()

  if (!body.void_reason || !body.voided_by) {
    return NextResponse.json(
      { error: 'void_reason and voided_by are required' },
      { status: 400 }
    )
  }

  // Verify item belongs to this bill
  const { data: item } = await supabase
    .from('bill_items')
    .select('id, bill_id, voided')
    .eq('id', itemId)
    .eq('bill_id', billId)
    .single()

  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  if (item.voided) return NextResponse.json({ error: 'Item already voided' }, { status: 400 })

  // Void the item
  await supabase
    .from('bill_items')
    .update({
      voided: true,
      void_reason: body.void_reason,
      voided_by: body.voided_by,
    })
    .eq('id', itemId)

  // Recalculate bill totals
  const { data: bill } = await supabase
    .from('bills')
    .select('service_charge_pct')
    .eq('id', billId)
    .single()

  const { data: items } = await supabase
    .from('bill_items')
    .select('line_total')
    .eq('bill_id', billId)
    .eq('voided', false)

  const subtotal = (items ?? []).reduce((sum, i) => sum + Number(i.line_total), 0)
  const serviceChargePct = bill?.service_charge_pct ?? 0
  const serviceCharge = subtotal * (serviceChargePct / 100)
  const total = subtotal + serviceCharge

  await supabase
    .from('bills')
    .update({ subtotal, service_charge: serviceCharge, total, updated_at: new Date().toISOString() })
    .eq('id', billId)

  return NextResponse.json({ success: true })
}
