import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ORG_ID, RESTAURANT_ID } from '@/lib/restaurant/constants'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ instanceId: string; blockId: string }> }
) {
  const { instanceId, blockId } = await params
  const supabase = createServiceClient()
  const body = await req.json()

  if (!body.status) {
    return NextResponse.json({ error: 'status is required' }, { status: 400 })
  }

  // Get the block to check type
  const { data: block } = await supabase
    .from('restaurant_sop_blocks')
    .select('*')
    .eq('id', blockId)
    .single()

  if (!block) {
    return NextResponse.json({ error: 'Block not found' }, { status: 404 })
  }

  // For approval blocks, validate the user has the required role
  if (block.block_type === 'approval' && body.status === 'completed' && body.completed_by) {
    const config = block.config as { required_role?: string }
    if (config.required_role) {
      const { data: staff } = await supabase
        .from('restaurant_staff')
        .select('role')
        .eq('id', body.completed_by)
        .single()

      if (!staff || staff.role !== config.required_role) {
        return NextResponse.json(
          { error: `Only ${config.required_role} role can approve this block` },
          { status: 403 }
        )
      }
    }
  }

  // Update block response
  const { data: response, error: respErr } = await supabase
    .from('restaurant_sop_block_responses')
    .update({
      status: body.status,
      response_data: body.response_data || {},
      completed_by: body.completed_by || null,
      completed_at: body.status === 'completed' || body.status === 'skipped'
        ? new Date().toISOString()
        : null,
    })
    .eq('instance_id', instanceId)
    .eq('block_id', blockId)
    .select()
    .single()

  if (respErr) {
    return NextResponse.json({ error: respErr.message }, { status: 500 })
  }

  // If sequence block completed, spawn target SOP instance
  if (block.block_type === 'sequence' && body.status === 'completed') {
    const config = block.config as { target_sop_id?: string }
    if (config.target_sop_id) {
      const { data: newInst } = await supabase
        .from('restaurant_sop_instances')
        .insert({
          organization_id: ORG_ID,
          restaurant_id: RESTAURANT_ID,
          sop_id: config.target_sop_id,
          shift_date: new Date().toISOString().split('T')[0],
          status: 'pending',
        })
        .select()
        .single()

      if (newInst) {
        // Create block responses for the new instance
        const { data: targetBlocks } = await supabase
          .from('restaurant_sop_blocks')
          .select('*')
          .eq('sop_id', config.target_sop_id)
          .order('sort_order')

        if (targetBlocks && targetBlocks.length > 0) {
          await supabase.from('restaurant_sop_block_responses').insert(
            targetBlocks.map((b) => ({
              organization_id: ORG_ID,
              instance_id: newInst.id,
              block_id: b.id,
              status: b.block_type === 'approval' ? 'blocked' : 'pending',
              response_data: {},
            }))
          )
        }

        // Update the sequence block response with the triggered instance ID
        await supabase
          .from('restaurant_sop_block_responses')
          .update({
            response_data: {
              ...(body.response_data || {}),
              triggered_instance_id: newInst.id,
            },
          })
          .eq('instance_id', instanceId)
          .eq('block_id', blockId)
      }
    }
  }

  // Check if all required blocks are done -> auto-complete instance
  const { data: allResponses } = await supabase
    .from('restaurant_sop_block_responses')
    .select('status, block_id')
    .eq('instance_id', instanceId)

  const { data: allBlocks } = await supabase
    .from('restaurant_sop_blocks')
    .select('id, is_required, sort_order, block_type')
    .eq('sop_id', block.sop_id)
    .order('sort_order')

  if (allResponses && allBlocks) {
    const responseMap = new Map(allResponses.map(r => [r.block_id, r.status]))
    const allRequiredDone = allBlocks
      .filter(b => b.is_required)
      .every(b => {
        const s = responseMap.get(b.id)
        return s === 'completed' || s === 'skipped'
      })

    // Update instance status
    const hasAnyCompleted = allResponses.some(r => r.status === 'completed' || r.status === 'skipped')

    let newStatus = 'pending'
    if (allRequiredDone) {
      newStatus = 'completed'
    } else if (hasAnyCompleted) {
      newStatus = 'in_progress'
    }

    const updateData: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'in_progress' && !body._already_started) {
      updateData.started_at = new Date().toISOString()
    }
    if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString()
      updateData.completed_by = body.completed_by || null
    }

    await supabase
      .from('restaurant_sop_instances')
      .update(updateData)
      .eq('id', instanceId)

    // Unblock next approval block if current block was before it
    if (body.status === 'completed') {
      const currentIdx = allBlocks.findIndex(b => b.id === blockId)
      for (let i = currentIdx + 1; i < allBlocks.length; i++) {
        const nextBlock = allBlocks[i]
        const nextStatus = responseMap.get(nextBlock.id)
        if (nextBlock.block_type === 'approval' && nextStatus === 'blocked') {
          await supabase
            .from('restaurant_sop_block_responses')
            .update({ status: 'pending' })
            .eq('instance_id', instanceId)
            .eq('block_id', nextBlock.id)
          break
        }
        if (nextStatus === 'pending') break
      }
    }
  }

  return NextResponse.json({ response })
}
