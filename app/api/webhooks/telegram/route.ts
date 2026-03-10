import { NextResponse } from 'next/server'
import { getOpsClient } from '@/lib/ops/config'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendMessage } from '@/lib/telegram/bot'
import { sendTextMessage } from '@/lib/whatsapp/client'
import { handleCallback as handleAccommodationCallback, parseCallbackData } from '@/lib/accommodation/telegram/ops-bot'

// Accommodation callback actions that we route to the ops-bot handler
const ACCOMMODATION_ACTIONS = new Set([
  'accept_task', 'reject_task', 'complete_task',
  'ack_issue', 'start_issue', 'resolve_issue',
])

export async function POST(request: Request) {
  try {
    // Verify Telegram secret token
    const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET
    if (secretToken) {
      const headerToken = request.headers.get('x-telegram-bot-api-secret-token')
      if (headerToken !== secretToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await request.json()

    // Handle callback queries (button presses)
    const callbackQuery = body.callback_query
    if (!callbackQuery) {
      return NextResponse.json({ status: 'ok' })
    }

    const rawData = callbackQuery.data as string
    if (!rawData) {
      return NextResponse.json({ status: 'ok' })
    }

    // --- Try accommodation callback routing first (JSON-encoded data) ---
    const accommodationResult = await tryAccommodationCallback(callbackQuery, rawData)
    if (accommodationResult.handled) {
      return NextResponse.json({ status: 'ok' })
    }

    // --- Fall back to ops lead callback routing (colon-separated data) ---
    const [action, leadId] = rawData.split(':')

    if (!action || !leadId) {
      return NextResponse.json({ status: 'ok' })
    }

    const supabase = getOpsClient()

    // Get the lead
    const { data: lead, error: leadError } = await supabase
      .from('ops_leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      await answerCallback(callbackQuery.id, 'Lead not found')
      return NextResponse.json({ status: 'ok' })
    }

    // Prevent double-action
    if (['approved', 'provisioning', 'provisioned'].includes(lead.qualification_status)) {
      await answerCallback(callbackQuery.id, 'Already approved')
      return NextResponse.json({ status: 'ok' })
    }

    if (lead.qualification_status === 'rejected') {
      await answerCallback(callbackQuery.id, 'Already rejected')
      return NextResponse.json({ status: 'ok' })
    }

    if (action === 'approve') {
      // Update lead status
      await supabase
        .from('ops_leads')
        .update({ qualification_status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', leadId)

      // Create provisioning job
      const { data: job } = await supabase
        .from('provisioning_jobs')
        .insert({
          ops_lead_id: leadId,
          status: 'pending',
          current_step: 'awaiting_start',
        })
        .select()
        .single()

      // Log activity
      await supabase.from('ops_activity_log').insert({
        event_type: 'lead_approved',
        ops_lead_id: leadId,
        provisioning_job_id: job?.id,
        details: { approved_by: 'telegram_operator' },
      })

      // Update lead to provisioning
      await supabase
        .from('ops_leads')
        .update({ qualification_status: 'provisioning' })
        .eq('id', leadId)

      // Trigger provisioning
      try {
        const { provisionClient } = await import('@/scripts/provisioning/orchestrator')
        const qualResult = lead.qualification_result as Record<string, unknown>
        const validTiers = ['core', 'growth', 'scale'] as const
        const rawTier = String(qualResult?.recommended_tier || 'core')
        const tier = (validTiers as readonly string[]).includes(rawTier)
          ? (rawTier as 'core' | 'growth' | 'scale')
          : 'core'

        await supabase
          .from('provisioning_jobs')
          .update({ status: 'running', current_step: 'provisioning' })
          .eq('id', job?.id)

        const result = await provisionClient(
          leadId,
          lead.business_name || 'Unknown Business',
          lead.email || '',
          tier
        )

        if (result.success) {
          await supabase
            .from('provisioning_jobs')
            .update({
              status: 'completed',
              current_step: 'done',
              created_resources: result.resources,
            })
            .eq('id', job?.id)

          await supabase
            .from('ops_leads')
            .update({ qualification_status: 'provisioned' })
            .eq('id', leadId)

          await sendMessage(`Provisioning complete for ${lead.business_name}`)

          if (lead.phone_number) {
            await sendTextMessage(
              lead.phone_number,
              `Great news! Your DraggonnB platform is being set up. You'll receive an email at ${lead.email} with login details shortly!`
            )
          }
        } else {
          await supabase
            .from('provisioning_jobs')
            .update({ status: 'failed', error_message: result.error })
            .eq('id', job?.id)

          await sendMessage(`Provisioning failed for ${lead.business_name}: ${result.error}`)
        }
      } catch (provError) {
        console.error('Provisioning trigger error:', provError)
        await sendMessage(`Provisioning error: ${provError instanceof Error ? provError.message : 'Unknown error'}`)
      }

      await answerCallback(callbackQuery.id, 'Approved! Provisioning started.')
    } else if (action === 'reject') {
      await supabase
        .from('ops_leads')
        .update({ qualification_status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', leadId)

      await supabase.from('ops_activity_log').insert({
        event_type: 'lead_rejected',
        ops_lead_id: leadId,
        details: { rejected_by: 'telegram_operator' },
      })

      if (lead.phone_number) {
        await sendTextMessage(
          lead.phone_number,
          "Thanks for your interest in DraggonnB! At this time, we don't have a solution that fits your needs perfectly. We'll keep your info on file and reach out if that changes."
        )
      }

      await sendMessage(`Lead ${lead.business_name} has been rejected.`)
      await answerCallback(callbackQuery.id, 'Lead rejected')
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json({ status: 'ok' })
  }
}

/**
 * Try to handle the callback as an accommodation ops-bot callback.
 * Accommodation callbacks use JSON-encoded callback_data with an "action" field.
 * Returns { handled: true } if this was an accommodation callback.
 */
async function tryAccommodationCallback(
  callbackQuery: {
    id: string
    data: string
    from: { id: number; first_name: string; username?: string }
    message?: { chat: { id: number }; message_id: number }
  },
  rawData: string
): Promise<{ handled: boolean }> {
  // Accommodation callbacks are JSON-encoded
  const parsed = parseCallbackData(rawData)
  if (!parsed || !parsed.action) {
    return { handled: false }
  }

  // Check if this is a known accommodation action
  if (!ACCOMMODATION_ACTIONS.has(parsed.action)) {
    return { handled: false }
  }

  // Resolve organization_id from the task or issue in the callback
  const supabase = createAdminClient()
  let organizationId: string | null = null

  if (parsed.task_id) {
    const { data: task } = await supabase
      .from('accommodation_tasks')
      .select('organization_id')
      .eq('id', parsed.task_id)
      .single()
    organizationId = task?.organization_id || null
  } else if (parsed.issue_id) {
    const { data: issue } = await supabase
      .from('accommodation_issues')
      .select('organization_id')
      .eq('id', parsed.issue_id)
      .single()
    organizationId = issue?.organization_id || null
  }

  if (!organizationId) {
    console.error('[Telegram Webhook] Could not resolve organization for accommodation callback:', rawData)
    return { handled: false }
  }

  const chatId = callbackQuery.message?.chat?.id || 0
  const messageId = callbackQuery.message?.message_id || 0

  try {
    const result = await handleAccommodationCallback(
      supabase,
      organizationId,
      callbackQuery.id,
      rawData,
      {
        id: callbackQuery.from.id,
        first_name: callbackQuery.from.first_name,
        username: callbackQuery.from.username,
      },
      {
        chat_id: chatId,
        message_id: messageId,
      }
    )
    console.log(`[Telegram Webhook] Accommodation callback handled: ${result.action} (success: ${result.success})`)
  } catch (error) {
    console.error('[Telegram Webhook] Accommodation callback error:', error)
    // Answer the callback to avoid Telegram showing a loading indicator
    await answerCallback(callbackQuery.id, 'Error processing request')
  }

  return { handled: true }
}

async function answerCallback(callbackQueryId: string, text: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) return

  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
    }),
  })
}
