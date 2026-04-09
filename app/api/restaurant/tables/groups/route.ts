import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { RESTAURANT_ID, ORG_ID } from '@/lib/restaurant/constants'

// GET — list table groups with their tables
export async function GET() {
  const supabase = createServiceClient()

  const { data: groups, error } = await supabase
    .from('restaurant_table_groups')
    .select('*')
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch tables for each group
  const groupIds = groups.map((g: { id: string }) => g.id)
  const { data: tables } = await supabase
    .from('restaurant_tables')
    .select('id, label, capacity, linked_group_id')
    .in('linked_group_id', groupIds.length ? groupIds : ['__none__'])

  const tablesByGroup = (tables || []).reduce((acc: Record<string, unknown[]>, t: { linked_group_id: string }) => {
    if (!acc[t.linked_group_id]) acc[t.linked_group_id] = []
    acc[t.linked_group_id].push(t)
    return acc
  }, {} as Record<string, unknown[]>)

  const enriched = groups.map((g: { id: string }) => ({
    ...g,
    tables: tablesByGroup[g.id] || [],
  }))

  return NextResponse.json(enriched)
}

// POST — create a table group (link tables)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, table_ids } = body as { name: string; table_ids: string[] }

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Group name is required' }, { status: 400 })
  }
  if (!table_ids?.length || table_ids.length < 2) {
    return NextResponse.json({ error: 'At least 2 tables required to link' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Get table capacities
  const { data: tables, error: tErr } = await supabase
    .from('restaurant_tables')
    .select('id, capacity, linked_group_id')
    .in('id', table_ids)

  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 })
  if (!tables || tables.length !== table_ids.length) {
    return NextResponse.json({ error: 'Some tables not found' }, { status: 404 })
  }

  // Check none are already linked
  const alreadyLinked = tables.filter((t: { linked_group_id: string | null }) => t.linked_group_id)
  if (alreadyLinked.length) {
    return NextResponse.json({ error: 'Some tables are already linked to another group' }, { status: 409 })
  }

  const combinedCapacity = tables.reduce((sum: number, t: { capacity: number }) => sum + t.capacity, 0)

  // Create group
  const { data: group, error: gErr } = await supabase
    .from('restaurant_table_groups')
    .insert({
      organization_id: ORG_ID,
      restaurant_id: RESTAURANT_ID,
      name: name.trim(),
      combined_capacity: combinedCapacity,
    })
    .select()
    .single()

  if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 })

  // Link tables to group
  const { error: uErr } = await supabase
    .from('restaurant_tables')
    .update({ linked_group_id: group.id })
    .in('id', table_ids)

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

  return NextResponse.json({ ...group, tables }, { status: 201 })
}

// DELETE — unlink a table group
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const groupId = searchParams.get('id')
  if (!groupId) return NextResponse.json({ error: 'Group ID required' }, { status: 400 })

  const supabase = createServiceClient()

  // Unlink all tables first
  await supabase
    .from('restaurant_tables')
    .update({ linked_group_id: null })
    .eq('linked_group_id', groupId)

  // Soft-delete the group
  const { error } = await supabase
    .from('restaurant_table_groups')
    .update({ is_active: false })
    .eq('id', groupId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
