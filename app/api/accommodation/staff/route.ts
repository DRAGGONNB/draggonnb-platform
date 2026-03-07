import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { createStaffSchema } from '@/lib/accommodation/schemas'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')
    const isActive = searchParams.get('is_active')
    const hasTelegram = searchParams.get('has_telegram')

    let query = auth.supabase
      .from('accommodation_staff')
      .select('*')
      .eq('organization_id', auth.organizationId)
      .order('first_name', { ascending: true })

    if (department) query = query.eq('department', department)
    if (isActive !== null && isActive !== undefined) query = query.eq('is_active', isActive === 'true')
    if (hasTelegram === 'true') query = query.not('telegram_chat_id', 'is', null)

    const { data: staff, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
    }

    return NextResponse.json({ staff })
  } catch (error) {
    console.error('Staff GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createStaffSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: member, error } = await auth.supabase
      .from('accommodation_staff')
      .insert({ ...parsed.data, organization_id: auth.organizationId })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create staff member' }, { status: 500 })
    }

    return NextResponse.json({ staff: member }, { status: 201 })
  } catch (error) {
    console.error('Staff POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
