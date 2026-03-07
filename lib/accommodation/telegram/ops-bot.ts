/**
 * Accommodation Telegram Ops Bot
 * Sends task notifications to department channels with inline action buttons.
 * Handles callback queries from staff accepting/completing tasks.
 *
 * Reuses patterns from lib/telegram/bot.ts but supports per-org bot tokens
 * and department-based channel routing.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { DailyBriefData } from '@/lib/accommodation/types'

const TELEGRAM_API_BASE = 'https://api.telegram.org'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TelegramChannelConfig {
  chat_id: string
  bot_token: string | null
  department: string
  channel_name: string | null
}

export interface HousekeepingTaskData {
  task_id: string
  unit_name: string
  property_name: string
  task_type: string
  title: string
  description: string | null
  priority: string
  due_date: string | null
  due_time: string | null
  booking_ref: string | null
  guest_name: string | null
  check_in_date: string | null
}

export interface MaintenanceRequestData {
  issue_id: string
  unit_name: string | null
  property_name: string
  title: string
  description: string | null
  priority: string
  category: string
  reported_by: string | null
  photos: string[]
}

// DailyBriefData imported from @/lib/accommodation/types

export interface CallbackData {
  action: string
  task_id?: string
  issue_id?: string
  assignment_id?: string
}

// ─── Core Send Function ─────────────────────────────────────────────────────

function getBotToken(channelConfig?: TelegramChannelConfig | null): string {
  const token = channelConfig?.bot_token || process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    throw new Error('No Telegram bot token available (channel config or TELEGRAM_BOT_TOKEN env)')
  }
  return token
}

async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
  options?: {
    parse_mode?: 'Markdown' | 'HTML'
    reply_markup?: unknown
  }
): Promise<{ ok: boolean; message_id?: number; error?: string }> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options?.parse_mode || 'HTML',
        ...( options?.reply_markup ? { reply_markup: options.reply_markup } : {}),
      }),
    })

    const result = await response.json() as { ok: boolean; result?: { message_id: number }; description?: string }

    if (!result.ok) {
      console.error('[OpsBot] Telegram send error:', result.description)
      return { ok: false, error: result.description }
    }

    return { ok: true, message_id: result.result?.message_id }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[OpsBot] Telegram send failed:', errMsg)
    return { ok: false, error: errMsg }
  }
}

async function answerCallbackQuery(
  botToken: string,
  callbackQueryId: string,
  text?: string
): Promise<void> {
  await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text || 'Updated!',
    }),
  })
}

async function editMessageReplyMarkup(
  botToken: string,
  chatId: string,
  messageId: number,
  replyMarkup?: unknown
): Promise<void> {
  await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/editMessageReplyMarkup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup || { inline_keyboard: [] },
    }),
  })
}

// ─── Channel Resolution ─────────────────────────────────────────────────────

/**
 * Look up the Telegram channel config for a department in an organization
 */
export async function getChannelConfig(
  supabase: SupabaseClient,
  organizationId: string,
  department: string
): Promise<TelegramChannelConfig | null> {
  const { data, error } = await supabase
    .from('accommodation_telegram_channels')
    .select('chat_id, bot_token, department, channel_name')
    .eq('organization_id', organizationId)
    .eq('department', department)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (error || !data) {
    console.warn(`[OpsBot] No active Telegram channel for ${department} in org ${organizationId}`)
    return null
  }

  return data
}

/**
 * Get all active channels for an organization
 */
export async function getAllChannels(
  supabase: SupabaseClient,
  organizationId: string
): Promise<TelegramChannelConfig[]> {
  const { data, error } = await supabase
    .from('accommodation_telegram_channels')
    .select('chat_id, bot_token, department, channel_name')
    .eq('organization_id', organizationId)
    .eq('is_active', true)

  if (error) {
    console.error('[OpsBot] Failed to fetch channels:', error)
    return []
  }

  return data || []
}

// ─── Priority Emoji Helpers ─────────────────────────────────────────────────

function priorityEmoji(priority: string): string {
  switch (priority) {
    case 'urgent': return '🔴'
    case 'high': return '🟠'
    case 'medium': return '🟡'
    case 'low': return '🟢'
    default: return '⚪'
  }
}

function taskTypeEmoji(taskType: string): string {
  switch (taskType) {
    case 'turnover': return '🔄'
    case 'maintenance': return '🔧'
    case 'guest_request': return '🙋'
    case 'inspection': return '🔍'
    default: return '📋'
  }
}

function categoryEmoji(category: string): string {
  switch (category) {
    case 'plumbing': return '🚿'
    case 'electrical': return '⚡'
    case 'structural': return '🏗️'
    case 'appliance': return '🔌'
    case 'furniture': return '🪑'
    case 'cleanliness': return '🧹'
    case 'pest': return '🐛'
    case 'safety': return '⚠️'
    default: return '🔧'
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ─── Task Notification Cards ────────────────────────────────────────────────

/**
 * Send a housekeeping/general task card to the appropriate department channel
 */
export async function sendHousekeepingTask(
  supabase: SupabaseClient,
  organizationId: string,
  task: HousekeepingTaskData,
  channelConfig?: TelegramChannelConfig | null
): Promise<{ ok: boolean; message_id?: number }> {
  const config = channelConfig || await getChannelConfig(supabase, organizationId, 'housekeeping')
  if (!config) {
    return { ok: false }
  }

  const botToken = getBotToken(config)

  const lines = [
    `${taskTypeEmoji(task.task_type)} <b>New Task: ${escapeHtml(task.title)}</b>`,
    '',
    `${priorityEmoji(task.priority)} <b>Priority:</b> ${task.priority.toUpperCase()}`,
    `🏠 <b>Unit:</b> ${escapeHtml(task.unit_name)}`,
    `🏨 <b>Property:</b> ${escapeHtml(task.property_name)}`,
    `📋 <b>Type:</b> ${task.task_type}`,
  ]

  if (task.description) {
    lines.push(`\n📝 ${escapeHtml(task.description)}`)
  }

  if (task.due_date) {
    const dueStr = task.due_time ? `${task.due_date} at ${task.due_time}` : task.due_date
    lines.push(`\n⏰ <b>Due:</b> ${dueStr}`)
  }

  if (task.guest_name) {
    lines.push(`👤 <b>Guest:</b> ${escapeHtml(task.guest_name)}`)
  }

  if (task.booking_ref) {
    lines.push(`🔖 <b>Booking:</b> ${escapeHtml(task.booking_ref)}`)
  }

  if (task.check_in_date) {
    lines.push(`📅 <b>Check-in:</b> ${task.check_in_date}`)
  }

  const result = await sendTelegramMessage(botToken, config.chat_id, lines.join('\n'), {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Accept', callback_data: JSON.stringify({ action: 'accept_task', task_id: task.task_id }) },
          { text: '🚫 Reject', callback_data: JSON.stringify({ action: 'reject_task', task_id: task.task_id }) },
        ],
        [
          { text: '✔️ Mark Complete', callback_data: JSON.stringify({ action: 'complete_task', task_id: task.task_id }) },
        ],
      ],
    },
  })

  // Store the Telegram message ID for later reference
  if (result.ok && result.message_id) {
    await supabase
      .from('accommodation_task_assignments')
      .update({ telegram_message_id: String(result.message_id) })
      .eq('task_id', task.task_id)
      .eq('organization_id', organizationId)
  }

  return result
}

/**
 * Send a maintenance request card to the maintenance channel
 */
export async function sendMaintenanceRequest(
  supabase: SupabaseClient,
  organizationId: string,
  request: MaintenanceRequestData,
  channelConfig?: TelegramChannelConfig | null
): Promise<{ ok: boolean; message_id?: number }> {
  const config = channelConfig || await getChannelConfig(supabase, organizationId, 'maintenance')
  if (!config) {
    return { ok: false }
  }

  const botToken = getBotToken(config)

  const lines = [
    `${categoryEmoji(request.category)} <b>Maintenance Request</b>`,
    '',
    `${priorityEmoji(request.priority)} <b>Priority:</b> ${request.priority.toUpperCase()}`,
    `📌 <b>Title:</b> ${escapeHtml(request.title)}`,
    `🏨 <b>Property:</b> ${escapeHtml(request.property_name)}`,
  ]

  if (request.unit_name) {
    lines.push(`🏠 <b>Unit:</b> ${escapeHtml(request.unit_name)}`)
  }

  lines.push(`🏷️ <b>Category:</b> ${request.category}`)

  if (request.description) {
    lines.push(`\n📝 ${escapeHtml(request.description)}`)
  }

  if (request.reported_by) {
    lines.push(`\n👤 <b>Reported by:</b> ${escapeHtml(request.reported_by)}`)
  }

  if (request.photos.length > 0) {
    lines.push(`📷 <b>Photos:</b> ${request.photos.length} attached`)
  }

  return sendTelegramMessage(botToken, config.chat_id, lines.join('\n'), {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '👍 Acknowledge', callback_data: JSON.stringify({ action: 'ack_issue', issue_id: request.issue_id }) },
          { text: '🔧 Start Work', callback_data: JSON.stringify({ action: 'start_issue', issue_id: request.issue_id }) },
        ],
        [
          { text: '✅ Resolved', callback_data: JSON.stringify({ action: 'resolve_issue', issue_id: request.issue_id }) },
        ],
      ],
    },
  })
}

/**
 * Send the daily operations brief to all department channels
 */
export async function sendDailyBrief(
  supabase: SupabaseClient,
  organizationId: string,
  brief: DailyBriefData,
  targetDepartments?: string[]
): Promise<{ sent: number; errors: string[] }> {
  const channels = await getAllChannels(supabase, organizationId)
  const filtered = targetDepartments
    ? channels.filter((c) => targetDepartments.includes(c.department))
    : channels

  if (filtered.length === 0) {
    return { sent: 0, errors: ['No active Telegram channels found'] }
  }

  const briefDate = new Date(brief.date).toLocaleDateString('en-ZA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const lines = [
    `📊 <b>Daily Operations Brief</b>`,
    `📅 ${briefDate}`,
  ]

  if (brief.property_name) {
    lines.push(`🏨 ${escapeHtml(brief.property_name)}`)
  }

  lines.push(
    '',
    `📈 <b>Occupancy:</b> ${brief.occupancy.rate_percent}% | <b>In-house:</b> ${brief.occupancy.occupied} guests`,
    `🔧 <b>Open maintenance:</b> ${brief.pending_tasks.maintenance}`,
    `🧹 <b>Housekeeping tasks:</b> ${brief.pending_tasks.housekeeping}`,
  )

  if (brief.overdue_payments > 0) {
    lines.push(`💰 <b>Overdue payments:</b> ${brief.overdue_payments}`)
  }

  // Arrivals
  if (brief.arrivals.length > 0) {
    lines.push('', `🟢 <b>Arrivals (${brief.arrivals.length}):</b>`)
    for (const arr of brief.arrivals) {
      let line = `  • ${escapeHtml(arr.guest_name)} → ${escapeHtml(arr.unit_name)}`
      line += ` (${arr.guests_count} guest${arr.guests_count !== 1 ? 's' : ''})`
      if (arr.is_vip) line += ' ⭐ VIP'
      if (arr.special_requests) {
        line += ` ⚠️ <i>${escapeHtml(arr.special_requests.slice(0, 60))}</i>`
      }
      lines.push(line)
    }
  } else {
    lines.push('', '🟢 <b>Arrivals:</b> None')
  }

  // Departures
  if (brief.departures.length > 0) {
    lines.push('', `🔴 <b>Departures (${brief.departures.length}):</b>`)
    for (const dep of brief.departures) {
      lines.push(`  • ${escapeHtml(dep.guest_name)} ← ${escapeHtml(dep.unit_name)}`)
    }
  } else {
    lines.push('', '🔴 <b>Departures:</b> None')
  }

  // Turnovers
  if (brief.turnovers_needed.length > 0) {
    lines.push('', `🔄 <b>Turnovers Needed (${brief.turnovers_needed.length}):</b>`)
    for (const tn of brief.turnovers_needed) {
      lines.push(`  • ${escapeHtml(tn.unit_name)}`)
    }
  }

  // Notes
  if (brief.notes && brief.notes.length > 0) {
    lines.push('', '📌 <b>Notes:</b>')
    for (const note of brief.notes) {
      lines.push(`  • ${escapeHtml(note)}`)
    }
  }

  let sent = 0
  const errors: string[] = []

  for (const channel of filtered) {
    const botToken = getBotToken(channel)
    const result = await sendTelegramMessage(botToken, channel.chat_id, lines.join('\n'), {
      parse_mode: 'HTML',
    })

    if (result.ok) {
      sent++
    } else {
      errors.push(`Failed to send to ${channel.department}: ${result.error}`)
    }
  }

  return { sent, errors }
}

/**
 * Send a simple notification to a specific department channel
 */
export async function sendDepartmentNotification(
  supabase: SupabaseClient,
  organizationId: string,
  department: string,
  message: string
): Promise<{ ok: boolean }> {
  const config = await getChannelConfig(supabase, organizationId, department)
  if (!config) return { ok: false }

  const botToken = getBotToken(config)
  return sendTelegramMessage(botToken, config.chat_id, message, { parse_mode: 'HTML' })
}

/**
 * Send VIP arrival alert to front desk and management
 */
export async function sendVipArrivalAlert(
  supabase: SupabaseClient,
  organizationId: string,
  data: {
    guest_name: string
    unit_name: string
    property_name: string
    check_in_date: string
    special_requests: string | null
    total_stays: number
    total_spent: number
  }
): Promise<{ sent: number }> {
  const lines = [
    `⭐ <b>VIP Guest Arriving</b>`,
    '',
    `👤 <b>Guest:</b> ${escapeHtml(data.guest_name)}`,
    `🏠 <b>Unit:</b> ${escapeHtml(data.unit_name)}`,
    `🏨 <b>Property:</b> ${escapeHtml(data.property_name)}`,
    `📅 <b>Check-in:</b> ${data.check_in_date}`,
    `🔁 <b>Previous stays:</b> ${data.total_stays}`,
    `💰 <b>Total spent:</b> R${data.total_spent.toFixed(2)}`,
  ]

  if (data.special_requests) {
    lines.push(`\n⚠️ <b>Special Requests:</b>\n${escapeHtml(data.special_requests)}`)
  }

  const message = lines.join('\n')
  let sent = 0

  for (const dept of ['front_desk', 'management']) {
    const result = await sendDepartmentNotification(supabase, organizationId, dept, message)
    if (result.ok) sent++
  }

  return { sent }
}

// ─── Callback Query Handler ─────────────────────────────────────────────────

/**
 * Parse callback_data from Telegram inline button press
 */
export function parseCallbackData(callbackData: string): CallbackData | null {
  try {
    return JSON.parse(callbackData) as CallbackData
  } catch {
    console.error('[OpsBot] Invalid callback data:', callbackData)
    return null
  }
}

/**
 * Handle Telegram callback queries from inline buttons
 * This is called from the webhook endpoint
 */
export async function handleCallback(
  supabase: SupabaseClient,
  organizationId: string,
  callbackQueryId: string,
  callbackData: string,
  fromUser: { id: number; first_name: string; username?: string },
  messageInfo: { chat_id: number; message_id: number },
  botToken?: string
): Promise<{ success: boolean; action: string }> {
  const parsed = parseCallbackData(callbackData)
  if (!parsed) {
    return { success: false, action: 'parse_error' }
  }

  const token = botToken || process.env.TELEGRAM_BOT_TOKEN!
  const staffName = fromUser.first_name + (fromUser.username ? ` (@${fromUser.username})` : '')

  switch (parsed.action) {
    // ─── Task Actions ─────────────────────────────────────────────
    case 'accept_task': {
      if (!parsed.task_id) break

      // Find staff member by telegram_chat_id or telegram_username
      const staff = await resolveStaff(supabase, organizationId, fromUser)

      // Update task assignment
      const { error } = await supabase
        .from('accommodation_task_assignments')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          staff_id: staff?.id || null,
        })
        .eq('task_id', parsed.task_id)
        .eq('organization_id', organizationId)
        .in('status', ['assigned', 'accepted'])

      if (!error) {
        // Also update the task itself
        await supabase
          .from('accommodation_tasks')
          .update({ status: 'in_progress', assigned_to: staff?.id || null })
          .eq('id', parsed.task_id)
          .eq('organization_id', organizationId)

        await answerCallbackQuery(token, callbackQueryId, `✅ Accepted by ${staffName}`)

        // Update the message buttons to show only Complete
        await editMessageReplyMarkup(token, String(messageInfo.chat_id), messageInfo.message_id, {
          inline_keyboard: [[
            { text: `✔️ Complete (${fromUser.first_name})`, callback_data: JSON.stringify({ action: 'complete_task', task_id: parsed.task_id }) },
          ]],
        })
      } else {
        await answerCallbackQuery(token, callbackQueryId, '❌ Failed to accept task')
      }
      return { success: !error, action: 'accept_task' }
    }

    case 'reject_task': {
      if (!parsed.task_id) break

      await supabase
        .from('accommodation_task_assignments')
        .update({
          status: 'rejected',
          notes: `Rejected by ${staffName}`,
        })
        .eq('task_id', parsed.task_id)
        .eq('organization_id', organizationId)

      await answerCallbackQuery(token, callbackQueryId, `🚫 Rejected by ${staffName}`)
      await editMessageReplyMarkup(token, String(messageInfo.chat_id), messageInfo.message_id, {
        inline_keyboard: [[
          { text: `🚫 Rejected by ${fromUser.first_name}`, callback_data: 'noop' },
        ]],
      })
      return { success: true, action: 'reject_task' }
    }

    case 'complete_task': {
      if (!parsed.task_id) break

      const staff = await resolveStaff(supabase, organizationId, fromUser)
      const now = new Date().toISOString()

      await supabase
        .from('accommodation_task_assignments')
        .update({
          status: 'completed',
          completed_at: now,
          staff_id: staff?.id || null,
        })
        .eq('task_id', parsed.task_id)
        .eq('organization_id', organizationId)

      // Mark the task itself as completed
      await supabase
        .from('accommodation_tasks')
        .update({
          status: 'completed',
          completed_at: now,
          completed_by: staff?.user_id || null,
        })
        .eq('id', parsed.task_id)
        .eq('organization_id', organizationId)

      await answerCallbackQuery(token, callbackQueryId, `✔️ Completed by ${staffName}`)
      await editMessageReplyMarkup(token, String(messageInfo.chat_id), messageInfo.message_id, {
        inline_keyboard: [[
          { text: `✅ Done by ${fromUser.first_name}`, callback_data: 'noop' },
        ]],
      })
      return { success: true, action: 'complete_task' }
    }

    // ─── Issue Actions ────────────────────────────────────────────
    case 'ack_issue': {
      if (!parsed.issue_id) break

      await supabase
        .from('accommodation_issues')
        .update({ status: 'in_progress' })
        .eq('id', parsed.issue_id)
        .eq('organization_id', organizationId)
        .eq('status', 'open')

      await answerCallbackQuery(token, callbackQueryId, `👍 Acknowledged by ${staffName}`)
      await editMessageReplyMarkup(token, String(messageInfo.chat_id), messageInfo.message_id, {
        inline_keyboard: [
          [
            { text: `🔧 In Progress (${fromUser.first_name})`, callback_data: 'noop' },
            { text: '✅ Resolved', callback_data: JSON.stringify({ action: 'resolve_issue', issue_id: parsed.issue_id }) },
          ],
        ],
      })
      return { success: true, action: 'ack_issue' }
    }

    case 'start_issue': {
      if (!parsed.issue_id) break

      await supabase
        .from('accommodation_issues')
        .update({ status: 'in_progress' })
        .eq('id', parsed.issue_id)
        .eq('organization_id', organizationId)

      await answerCallbackQuery(token, callbackQueryId, `🔧 Started by ${staffName}`)
      await editMessageReplyMarkup(token, String(messageInfo.chat_id), messageInfo.message_id, {
        inline_keyboard: [[
          { text: '✅ Mark Resolved', callback_data: JSON.stringify({ action: 'resolve_issue', issue_id: parsed.issue_id }) },
        ]],
      })
      return { success: true, action: 'start_issue' }
    }

    case 'resolve_issue': {
      if (!parsed.issue_id) break

      await supabase
        .from('accommodation_issues')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution_notes: `Resolved via Telegram by ${staffName}`,
        })
        .eq('id', parsed.issue_id)
        .eq('organization_id', organizationId)

      await answerCallbackQuery(token, callbackQueryId, `✅ Resolved by ${staffName}`)
      await editMessageReplyMarkup(token, String(messageInfo.chat_id), messageInfo.message_id, {
        inline_keyboard: [[
          { text: `✅ Resolved by ${fromUser.first_name}`, callback_data: 'noop' },
        ]],
      })
      return { success: true, action: 'resolve_issue' }
    }

    default:
      await answerCallbackQuery(token, callbackQueryId)
      return { success: false, action: parsed.action }
  }

  return { success: false, action: 'unknown' }
}

// ─── Staff Resolution ───────────────────────────────────────────────────────

/**
 * Resolve a Telegram user to a staff member record
 */
async function resolveStaff(
  supabase: SupabaseClient,
  organizationId: string,
  telegramUser: { id: number; username?: string }
): Promise<{ id: string; user_id: string | null } | null> {
  // Try by telegram_chat_id first
  const { data: byId } = await supabase
    .from('accommodation_staff')
    .select('id, user_id')
    .eq('organization_id', organizationId)
    .eq('telegram_chat_id', String(telegramUser.id))
    .limit(1)
    .single()

  if (byId) return byId

  // Try by telegram_username
  if (telegramUser.username) {
    const { data: byUsername } = await supabase
      .from('accommodation_staff')
      .select('id, user_id')
      .eq('organization_id', organizationId)
      .eq('telegram_username', telegramUser.username)
      .limit(1)
      .single()

    if (byUsername) return byUsername
  }

  return null
}

// ─── Escalation Notifications ───────────────────────────────────────────────

/**
 * Send escalation alert when a task has not been accepted within the threshold
 */
export async function sendEscalationAlert(
  supabase: SupabaseClient,
  organizationId: string,
  task: {
    task_id: string
    title: string
    unit_name: string
    assigned_at: string
    priority: string
    department: string
  }
): Promise<{ ok: boolean }> {
  const minutesSince = Math.round(
    (Date.now() - new Date(task.assigned_at).getTime()) / (1000 * 60)
  )

  const message = [
    `⚠️ <b>ESCALATION: Task Not Accepted</b>`,
    '',
    `📋 <b>Task:</b> ${escapeHtml(task.title)}`,
    `🏠 <b>Unit:</b> ${escapeHtml(task.unit_name)}`,
    `${priorityEmoji(task.priority)} <b>Priority:</b> ${task.priority.toUpperCase()}`,
    `⏱️ <b>Unaccepted for:</b> ${minutesSince} minutes`,
    `🏢 <b>Department:</b> ${task.department}`,
    '',
    `Please assign this task to available staff.`,
  ].join('\n')

  return sendDepartmentNotification(supabase, organizationId, 'management', message)
}
