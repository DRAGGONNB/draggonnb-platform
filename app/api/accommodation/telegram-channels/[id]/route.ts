import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { updateTelegramChannelSchema } from '@/lib/accommodation/schemas'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { id } = await params
    const body = await request.json()
    const parsed = updateTelegramChannelSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: channel, error } = await auth.supabase
      .from('accommodation_telegram_channels')
      .update(parsed.data)
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single()

    if (error || !channel) {
      return NextResponse.json({ error: 'Failed to update Telegram channel' }, { status: 500 })
    }

    return NextResponse.json({ channel })
  } catch (error) {
    console.error('Telegram channel PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { id } = await params

    // Soft delete — deactivate
    const { data: channel, error } = await auth.supabase
      .from('accommodation_telegram_channels')
      .update({ is_active: false })
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single()

    if (error || !channel) {
      return NextResponse.json({ error: 'Failed to deactivate Telegram channel' }, { status: 500 })
    }

    return NextResponse.json({ channel, message: 'Telegram channel deactivated' })
  } catch (error) {
    console.error('Telegram channel DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
