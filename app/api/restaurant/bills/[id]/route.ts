import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  // Get bill
  const { data: bill, error } = await supabase
    .from('bills')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !bill) {
    return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
  }

  // Get non-voided items
  const { data: items } = await supabase
    .from('bill_items')
    .select('*')
    .eq('bill_id', id)
    .eq('voided', false)
    .order('created_at')

  // Get payers
  const { data: payers } = await supabase
    .from('bill_payers')
    .select('*')
    .eq('bill_id', id)
    .order('slot_number')

  // Get session + table info
  const { data: session } = await supabase
    .from('table_sessions')
    .select('id, table_id, waiter_id, party_size, opened_at, restaurant_tables(label, section)')
    .eq('id', bill.session_id)
    .single()

  return NextResponse.json({
    bill,
    items: items ?? [],
    payers: payers ?? [],
    session,
  })
}
