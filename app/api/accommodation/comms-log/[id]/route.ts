import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { id } = await params

    const { data: log, error } = await auth.supabase
      .from('accommodation_comms_log')
      .select('*')
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (error || !log) {
      return NextResponse.json({ error: 'Comms log entry not found' }, { status: 404 })
    }

    return NextResponse.json({ log })
  } catch (error) {
    console.error('Comms log detail GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
