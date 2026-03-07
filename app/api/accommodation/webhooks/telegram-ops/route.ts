import { NextRequest, NextResponse } from 'next/server'
import { handleCallback } from '@/lib/accommodation/telegram/ops-bot'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Telegram Webhook for Accommodation Ops Bot
 *
 * Receives callback_query updates from Telegram when staff press
 * inline keyboard buttons on task/maintenance notifications.
 *
 * Setup: Configure via Telegram Bot API setWebhook:
 * POST https://api.telegram.org/bot<TOKEN>/setWebhook
 * { "url": "https://draggonnb-platform.vercel.app/api/accommodation/webhooks/telegram-ops" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Telegram sends various update types — we only handle callback_query
    if (!body.callback_query) {
      // Acknowledge non-callback updates (e.g., messages) silently
      return NextResponse.json({ ok: true })
    }

    const callbackQuery = body.callback_query

    // Validate callback data exists
    if (!callbackQuery.data || !callbackQuery.from) {
      return NextResponse.json({ ok: true })
    }

    // Parse callback data — our ops bot stores JSON in callback_data
    let callbackData: { action: string; id: string; org: string }
    try {
      callbackData = JSON.parse(callbackQuery.data)
    } catch {
      console.error('Invalid callback data format:', callbackQuery.data)
      return NextResponse.json({ ok: true })
    }

    if (!callbackData.org) {
      console.error('Missing organization_id in callback data')
      return NextResponse.json({ ok: true })
    }

    // Process the callback using admin client (webhook bypasses RLS)
    const supabase = createAdminClient()

    const messageInfo = callbackQuery.message
      ? {
          chat_id: callbackQuery.message.chat.id as number,
          message_id: callbackQuery.message.message_id as number,
        }
      : { chat_id: 0, message_id: 0 }

    await handleCallback(
      supabase,
      callbackData.org,
      callbackQuery.id,
      callbackQuery.data,
      {
        id: callbackQuery.from.id,
        first_name: callbackQuery.from.first_name,
        username: callbackQuery.from.username,
      },
      messageInfo
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Telegram ops webhook error:', error)
    // Always return 200 to prevent Telegram from retrying
    return NextResponse.json({ ok: true })
  }
}
