import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Public endpoint — returns only id + display_name for the PIN login screen.
// No sensitive data exposed. restaurant_id required to scope results.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const restaurantId = searchParams.get('restaurant_id')
  if (!restaurantId) return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('restaurant_staff')
    .select('id, display_name, role')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('display_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ staff: data ?? [] })
}
