import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { RESTAURANT_ID, ORG_ID } from '@/lib/restaurant/constants'

// GET — list floor plans
export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('restaurant_floor_plans')
    .select('*')
    .eq('restaurant_id', RESTAURANT_ID)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — create floor plan
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, canvas_width, canvas_height } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // If this is the first floor plan, make it default
  const { count } = await supabase
    .from('restaurant_floor_plans')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', RESTAURANT_ID)

  const { data, error } = await supabase
    .from('restaurant_floor_plans')
    .insert({
      organization_id: ORG_ID,
      restaurant_id: RESTAURANT_ID,
      name: name.trim(),
      canvas_width: canvas_width || 1200,
      canvas_height: canvas_height || 800,
      is_default: (count ?? 0) === 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
