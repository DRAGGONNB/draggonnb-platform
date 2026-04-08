import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/restaurant/constants'
import type { AddBillItemRequest } from '@/lib/restaurant/types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: billId } = await params
  const supabase = createServiceClient()
  const body: AddBillItemRequest = await req.json()

  if (!body.menu_item_id || !body.quantity || !body.added_by) {
    return NextResponse.json(
      { error: 'menu_item_id, quantity, and added_by are required' },
      { status: 400 }
    )
  }

  // Verify bill exists and is open
  const { data: bill } = await supabase
    .from('bills')
    .select('id, status, service_charge_pct')
    .eq('id', billId)
    .single()

  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
  if (bill.status === 'closed') {
    return NextResponse.json({ error: 'Bill is closed' }, { status: 400 })
  }

  // Snapshot menu item name and price
  const { data: menuItem } = await supabase
    .from('restaurant_menu_items')
    .select('name, price')
    .eq('id', body.menu_item_id)
    .single()

  if (!menuItem) {
    return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
  }

  const lineTotal = menuItem.price * body.quantity

  // Insert bill item
  const { data: item, error: itemErr } = await supabase
    .from('bill_items')
    .insert({
      organization_id: ORG_ID,
      bill_id: billId,
      menu_item_id: body.menu_item_id,
      name: menuItem.name,
      quantity: body.quantity,
      unit_price: menuItem.price,
      line_total: lineTotal,
      modifier_notes: body.modifier_notes || null,
      added_by: body.added_by,
      voided: false,
    })
    .select()
    .single()

  if (itemErr) {
    return NextResponse.json({ error: itemErr.message }, { status: 500 })
  }

  // Recalculate bill totals
  await recalculateBill(supabase, billId, bill.service_charge_pct)

  return NextResponse.json({ item })
}

async function recalculateBill(
  supabase: ReturnType<typeof createServiceClient>,
  billId: string,
  serviceChargePct: number
) {
  const { data: items } = await supabase
    .from('bill_items')
    .select('line_total')
    .eq('bill_id', billId)
    .eq('voided', false)

  const subtotal = (items ?? []).reduce((sum, i) => sum + Number(i.line_total), 0)
  const serviceCharge = subtotal * (serviceChargePct / 100)
  const total = subtotal + serviceCharge

  await supabase
    .from('bills')
    .update({
      subtotal,
      service_charge: serviceCharge,
      total,
      updated_at: new Date().toISOString(),
    })
    .eq('id', billId)
}
