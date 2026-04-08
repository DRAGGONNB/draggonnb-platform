import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ORG_ID, RESTAURANT_ID } from '@/lib/restaurant/constants'

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()

  if (!body.sop_id) {
    return NextResponse.json({ error: 'sop_id is required' }, { status: 400 })
  }

  // Verify SOP exists and is block-based
  const { data: sop } = await supabase
    .from('restaurant_sops')
    .select('id, title, sop_format')
    .eq('id', body.sop_id)
    .single()

  if (!sop) {
    return NextResponse.json({ error: 'SOP not found' }, { status: 404 })
  }

  if (sop.sop_format !== 'blocks') {
    return NextResponse.json({ error: 'Only block-based SOPs can have instances' }, { status: 400 })
  }

  // Fetch blocks for this SOP
  const { data: blocks } = await supabase
    .from('restaurant_sop_blocks')
    .select('*')
    .eq('sop_id', body.sop_id)
    .order('sort_order')

  if (!blocks || blocks.length === 0) {
    return NextResponse.json({ error: 'SOP has no blocks' }, { status: 400 })
  }

  // Create instance
  const { data: instance, error: instErr } = await supabase
    .from('restaurant_sop_instances')
    .insert({
      organization_id: ORG_ID,
      restaurant_id: RESTAURANT_ID,
      sop_id: body.sop_id,
      shift_date: body.shift_date || new Date().toISOString().split('T')[0],
      assigned_to: body.assigned_to || null,
      status: 'pending',
    })
    .select()
    .single()

  if (instErr) {
    return NextResponse.json({ error: instErr.message }, { status: 500 })
  }

  // Create block response rows
  const responseRows = blocks.map((block) => ({
    organization_id: ORG_ID,
    instance_id: instance.id,
    block_id: block.id,
    status: block.block_type === 'approval' ? 'blocked' : 'pending',
    response_data: {},
  }))

  const { data: responses, error: respErr } = await supabase
    .from('restaurant_sop_block_responses')
    .insert(responseRows)
    .select()

  if (respErr) {
    await supabase.from('restaurant_sop_instances').delete().eq('id', instance.id)
    return NextResponse.json({ error: respErr.message }, { status: 500 })
  }

  return NextResponse.json({ instance, responses })
}
