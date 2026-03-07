import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { sendManualMessageSchema } from '@/lib/accommodation/schemas'
import { sendTextMessage } from '@/lib/whatsapp/client'
import { sendEmail, renderTemplate } from '@/lib/email/resend'

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = sendManualMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { channel, recipient, message, booking_id, guest_id, template_id } = parsed.data
    let externalId: string | undefined
    let sendStatus = 'sent'
    let errorMessage: string | undefined

    try {
      if (channel === 'whatsapp') {
        const result = await sendTextMessage(recipient, message)
        externalId = result?.messages?.[0]?.id
      } else if (channel === 'email') {
        const html = template_id
          ? renderTemplate(template_id, { message })
          : `<div style="font-family:sans-serif;padding:20px;">${message.replace(/\n/g, '<br>')}</div>`

        const result = await sendEmail({
          to: recipient,
          subject: 'Message from your host',
          html,
        })
        if (result.success) {
          externalId = result.messageId
        } else {
          sendStatus = 'failed'
          errorMessage = result.error
        }
      } else {
        return NextResponse.json({ error: `Channel '${channel}' not yet supported` }, { status: 400 })
      }
    } catch (sendError) {
      sendStatus = 'failed'
      errorMessage = sendError instanceof Error ? sendError.message : 'Send failed'
    }

    // Log to comms_log
    const { data: logEntry, error: logError } = await auth.supabase
      .from('accommodation_comms_log')
      .insert({
        organization_id: auth.organizationId,
        booking_id: booking_id || null,
        guest_id: guest_id || null,
        channel,
        direction: 'outbound',
        message_type: 'manual',
        recipient,
        content_summary: message.substring(0, 500),
        external_id: externalId || null,
        status: sendStatus,
        metadata: { template_id: template_id || null, error: errorMessage || null },
      })
      .select()
      .single()

    if (logError) {
      console.error('Failed to log message:', logError)
    }

    if (sendStatus === 'failed') {
      return NextResponse.json(
        { error: 'Message send failed', details: errorMessage, log: logEntry },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      external_id: externalId,
      log: logEntry,
    })
  } catch (error) {
    console.error('Send message POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
