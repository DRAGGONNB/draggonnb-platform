import { NextResponse } from 'next/server'
import crypto from 'crypto'
import type { WhatsAppWebhookPayload } from '@/lib/whatsapp/types'
import { routeMessage } from '@/lib/whatsapp/router'

// GET: Meta webhook verification
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// POST: Incoming messages
export async function POST(request: Request) {
  try {
    const rawBody = await request.text()

    // Verify webhook signature if app secret is configured
    const appSecret = process.env.WHATSAPP_APP_SECRET
    if (appSecret) {
      const signature = request.headers.get('x-hub-signature-256')
      if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
      }
      const expectedSig = 'sha256=' + crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex')
      if (signature !== expectedSig) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload: WhatsAppWebhookPayload = JSON.parse(rawBody)

    // Process each message
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        const messages = change.value.messages
        if (!messages) continue

        for (const message of messages) {
          let text: string | null = null

          if (message.type === 'text' && message.text?.body) {
            text = message.text.body
          } else if (message.type === 'interactive' && message.interactive?.button_reply) {
            text = message.interactive.button_reply.title
          }

          if (text) {
            await routeMessage(message.from, text, message.id)
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    return NextResponse.json({ status: 'ok' }) // Always return 200 to Meta
  }
}
