import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ORG_ID, RESTAURANT_ID, SOP_BLOCK_TYPES } from '@/lib/restaurant/constants'

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()

  if (!body.title || !body.blocks || !Array.isArray(body.blocks) || body.blocks.length === 0) {
    return NextResponse.json({ error: 'title and blocks array are required' }, { status: 400 })
  }

  // Validate block types
  const validTypes = SOP_BLOCK_TYPES as readonly string[]
  for (const block of body.blocks) {
    if (!block.block_type || !validTypes.includes(block.block_type)) {
      return NextResponse.json(
        { error: `Invalid block_type: ${block.block_type}` },
        { status: 400 }
      )
    }
    if (!block.label) {
      return NextResponse.json({ error: 'Each block must have a label' }, { status: 400 })
    }
  }

  // Create the SOP
  const { data: sop, error: sopErr } = await supabase
    .from('restaurant_sops')
    .insert({
      organization_id: body.organization_id || ORG_ID,
      restaurant_id: body.restaurant_id || RESTAURANT_ID,
      title: body.title,
      content: '',
      sop_format: 'blocks',
      category: body.category || null,
      visible_to_roles: body.visible_to_roles || [],
      is_published: false,
    })
    .select()
    .single()

  if (sopErr) {
    return NextResponse.json({ error: sopErr.message }, { status: 500 })
  }

  // Insert blocks
  const blockRows = body.blocks.map((b: Record<string, unknown>, i: number) => ({
    organization_id: body.organization_id || ORG_ID,
    sop_id: sop.id,
    sort_order: i,
    block_type: b.block_type,
    label: b.label,
    description: b.description || null,
    config: b.config || {},
    is_required: b.is_required ?? true,
  }))

  const { data: blocks, error: blockErr } = await supabase
    .from('restaurant_sop_blocks')
    .insert(blockRows)
    .select()

  if (blockErr) {
    await supabase.from('restaurant_sops').delete().eq('id', sop.id)
    return NextResponse.json({ error: blockErr.message }, { status: 500 })
  }

  return NextResponse.json({ sop_id: sop.id, block_count: blocks?.length ?? 0, title: sop.title })
}
