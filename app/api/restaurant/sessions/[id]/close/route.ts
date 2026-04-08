import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  // Get session with bill
  const { data: session } = await supabase
    .from('table_sessions')
    .select('id, status')
    .eq('id', id)
    .single()

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  if (session.status === 'closed') {
    return NextResponse.json({ error: 'Session already closed' }, { status: 400 })
  }

  // Check bill payment status
  const { data: bill } = await supabase
    .from('bills')
    .select('id, status, total')
    .eq('session_id', id)
    .single()

  if (bill && bill.total > 0 && bill.status !== 'fully_paid' && bill.status !== 'closed') {
    // Check if there are unpaid payers
    const { count } = await supabase
      .from('bill_payers')
      .select('*', { count: 'exact', head: true })
      .eq('bill_id', bill.id)
      .eq('status', 'pending')

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Cannot close session with unpaid bill payers' },
        { status: 400 }
      )
    }
  }

  // Close session
  const now = new Date().toISOString()
  await supabase
    .from('table_sessions')
    .update({ status: 'closed', closed_at: now })
    .eq('id', id)

  // Close bill
  if (bill) {
    await supabase
      .from('bills')
      .update({ status: 'closed', updated_at: now })
      .eq('id', bill.id)
  }

  return NextResponse.json({ success: true })
}
