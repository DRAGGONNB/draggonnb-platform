import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// PATCH — bulk-update table positions (called on drag-end / save layout)
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { tables } = body as {
    tables: {
      id: string
      x_pos: number
      y_pos: number
      width?: number
      height?: number
      rotation?: number
      shape?: string
      floor_plan_id?: string
    }[]
  }

  if (!tables?.length) {
    return NextResponse.json({ error: 'No tables provided' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const errors: string[] = []

  // Update each table's position
  for (const t of tables) {
    const update: Record<string, unknown> = {
      x_pos: t.x_pos,
      y_pos: t.y_pos,
    }
    if (t.width !== undefined) update.width = t.width
    if (t.height !== undefined) update.height = t.height
    if (t.rotation !== undefined) update.rotation = t.rotation
    if (t.shape !== undefined) update.shape = t.shape
    if (t.floor_plan_id !== undefined) update.floor_plan_id = t.floor_plan_id

    const { error } = await supabase
      .from('restaurant_tables')
      .update(update)
      .eq('id', t.id)

    if (error) errors.push(`${t.id}: ${error.message}`)
  }

  if (errors.length) {
    return NextResponse.json({ error: 'Some updates failed', details: errors }, { status: 500 })
  }

  return NextResponse.json({ success: true, count: tables.length })
}
