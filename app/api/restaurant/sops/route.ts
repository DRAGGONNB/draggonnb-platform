import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ORG_ID, RESTAURANT_ID } from '@/lib/restaurant/constants'

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()

  if (!body.title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const sopFormat = body.sop_format || 'text'

  if (sopFormat === 'blocks' && (!body.blocks || !Array.isArray(body.blocks) || body.blocks.length === 0)) {
    return NextResponse.json({ error: 'blocks array is required for block-based SOPs' }, { status: 400 })
  }

  // Create the SOP
  const { data: sop, error: sopErr } = await supabase
    .from('restaurant_sops')
    .insert({
      organization_id: ORG_ID,
      restaurant_id: RESTAURANT_ID,
      title: body.title,
      content: body.content || '',
      sop_format: sopFormat,
      category: body.category || null,
      visible_to_roles: body.visible_to_roles || [],
      is_published: body.is_published ?? false,
    })
    .select()
    .single()

  if (sopErr) {
    return NextResponse.json({ error: sopErr.message }, { status: 500 })
  }

  // If block-based, insert blocks
  let blocks = null
  if (sopFormat === 'blocks') {
    const blockRows = body.blocks.map((b: Record<string, unknown>, i: number) => ({
      organization_id: ORG_ID,
      sop_id: sop.id,
      sort_order: i,
      block_type: b.block_type,
      label: b.label,
      description: b.description || null,
      config: b.config || {},
      is_required: b.is_required ?? true,
    }))

    const { data: insertedBlocks, error: blockErr } = await supabase
      .from('restaurant_sop_blocks')
      .insert(blockRows)
      .select()

    if (blockErr) {
      // Rollback SOP
      await supabase.from('restaurant_sops').delete().eq('id', sop.id)
      return NextResponse.json({ error: blockErr.message }, { status: 500 })
    }

    blocks = insertedBlocks
  }

  // Fire N8N webhook (non-blocking)
  const webhookUrl = process.env.N8N_WEBHOOK_SOP_CREATED
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sop_id: sop.id,
        title: sop.title,
        category: sop.category,
        sop_format: sopFormat,
        block_count: blocks?.length ?? 0,
      }),
    }).catch(() => {})
  }

  return NextResponse.json({ sop, blocks })
}
