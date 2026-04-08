import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/restaurant/constants'
import type { OpenSessionRequest } from '@/lib/restaurant/types'

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body: OpenSessionRequest = await req.json()

  // Validate required fields
  if (!body.table_id || !body.party_size) {
    return NextResponse.json({ error: 'table_id and party_size are required' }, { status: 400 })
  }

  // Check table exists and has no active session
  const { data: existingSession } = await supabase
    .from('table_sessions')
    .select('id')
    .eq('table_id', body.table_id)
    .eq('status', 'open')
    .maybeSingle()

  if (existingSession) {
    return NextResponse.json({ error: 'Table already has an active session' }, { status: 409 })
  }

  // Get restaurant info for service charge
  const { data: table } = await supabase
    .from('restaurant_tables')
    .select('restaurant_id, label, section, restaurants(name, service_charge_pct)')
    .eq('id', body.table_id)
    .single()

  if (!table) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 })
  }

  const restaurant = table.restaurants as unknown as { name: string; service_charge_pct: number }

  // Create session
  const { data: session, error: sessionErr } = await supabase
    .from('table_sessions')
    .insert({
      organization_id: ORG_ID,
      restaurant_id: table.restaurant_id,
      table_id: body.table_id,
      waiter_id: body.waiter_id || null,
      party_size: body.party_size,
      split_mode: body.split_mode || 'none',
      guest_whatsapp: body.guest_whatsapp || null,
      status: 'open',
      opened_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (sessionErr) {
    return NextResponse.json({ error: sessionErr.message }, { status: 500 })
  }

  // Create bill for this session
  const { data: bill, error: billErr } = await supabase
    .from('bills')
    .insert({
      organization_id: ORG_ID,
      session_id: session.id,
      restaurant_id: table.restaurant_id,
      subtotal: 0,
      service_charge_pct: restaurant.service_charge_pct ?? 0,
      service_charge: 0,
      tip_total: 0,
      total: 0,
      currency: 'ZAR',
      status: 'open',
    })
    .select()
    .single()

  if (billErr) {
    // Rollback session
    await supabase.from('table_sessions').delete().eq('id', session.id)
    return NextResponse.json({ error: billErr.message }, { status: 500 })
  }

  // Fire N8N webhook (non-blocking)
  const webhookUrl = process.env.N8N_WEBHOOK_SESSION_OPENED
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: session.id,
        bill_id: bill.id,
        table_label: table.label,
        table_section: table.section,
        restaurant_name: restaurant.name,
        party_size: body.party_size,
        waiter_id: body.waiter_id,
      }),
    }).catch(() => {})
  }

  return NextResponse.json({ session, bill })
}
