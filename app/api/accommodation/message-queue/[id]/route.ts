import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { updateMessageQueueSchema } from '@/lib/accommodation/schemas'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { id } = await params
    const body = await request.json()
    const parsed = updateMessageQueueSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: message, error } = await auth.supabase
      .from('accommodation_message_queue')
      .update(parsed.data)
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single()

    if (error || !message) {
      return NextResponse.json({ error: 'Failed to update message' }, { status: 500 })
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Message queue PATCH error:', error)
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

    // Only allow deleting pending messages
    const { data: existing } = await auth.supabase
      .from('accommodation_message_queue')
      .select('status')
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    if (existing.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending messages can be deleted' }, { status: 400 })
    }

    const { error } = await auth.supabase
      .from('accommodation_message_queue')
      .delete()
      .eq('id', id)
      .eq('organization_id', auth.organizationId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Message queue DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
