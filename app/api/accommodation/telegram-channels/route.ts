import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { createTelegramChannelSchema } from '@/lib/accommodation/schemas'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')
    const isActive = searchParams.get('is_active')

    let query = auth.supabase
      .from('accommodation_telegram_channels')
      .select('*')
      .eq('organization_id', auth.organizationId)
      .order('department', { ascending: true })

    if (department) query = query.eq('department', department)
    if (isActive !== null && isActive !== undefined) query = query.eq('is_active', isActive === 'true')

    const { data: channels, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch Telegram channels' }, { status: 500 })
    }

    return NextResponse.json({ channels })
  } catch (error) {
    console.error('Telegram channels GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createTelegramChannelSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    // Check for existing channel with same department
    const { data: existing } = await auth.supabase
      .from('accommodation_telegram_channels')
      .select('id')
      .eq('organization_id', auth.organizationId)
      .eq('department', parsed.data.department)
      .eq('is_active', true)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: `An active channel already exists for ${parsed.data.department}. Deactivate it first or update it.` },
        { status: 409 }
      )
    }

    const { data: channel, error } = await auth.supabase
      .from('accommodation_telegram_channels')
      .insert({ ...parsed.data, organization_id: auth.organizationId })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create Telegram channel' }, { status: 500 })
    }

    return NextResponse.json({ channel }, { status: 201 })
  } catch (error) {
    console.error('Telegram channels POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
