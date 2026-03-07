/**
 * Accommodation Message Queue Processor
 * Picks up pending messages, routes to WhatsApp/Email, logs results
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { sendTemplateMessage, sendTextMessage } from '@/lib/whatsapp/client'
import { sendEmail } from '@/lib/email/resend'

interface QueuedMessage {
  id: string
  organization_id: string
  rule_id: string | null
  booking_id: string | null
  guest_id: string | null
  channel: string
  recipient: string
  template_data: {
    template_id?: string | null
    event?: string
    guest_first_name?: string
    guest_full_name?: string
    property_name?: string
    check_in_date?: string
    check_out_date?: string
    nights?: string
    [key: string]: unknown
  }
  scheduled_for: string
  status: string
}

interface ProcessResult {
  processed: number
  sent: number
  failed: number
  errors: string[]
}

/**
 * Process all pending messages that are due.
 * Called by cron (N8N workflow) or manual trigger.
 */
export async function processMessageQueue(
  supabase: SupabaseClient,
  organizationId: string,
  limit: number = 50
): Promise<ProcessResult> {
  const result: ProcessResult = { processed: 0, sent: 0, failed: 0, errors: [] }

  // 1. Pick up due messages
  const { data: messages, error: fetchError } = await supabase
    .from('accommodation_message_queue')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(limit)

  if (fetchError) {
    console.error('[Sender] Failed to fetch queue:', fetchError)
    return { ...result, errors: [fetchError.message] }
  }

  if (!messages || messages.length === 0) {
    return result
  }

  // 2. Process each message
  for (const msg of messages as QueuedMessage[]) {
    result.processed++

    try {
      const sendResult = await routeMessage(msg)

      // 3. Update queue status
      await supabase
        .from('accommodation_message_queue')
        .update({
          status: sendResult.success ? 'sent' : 'failed',
          sent_at: sendResult.success ? new Date().toISOString() : null,
          error_message: sendResult.error || null,
        })
        .eq('id', msg.id)

      // 4. Log to comms audit trail
      await supabase
        .from('accommodation_comms_log')
        .insert({
          organization_id: msg.organization_id,
          booking_id: msg.booking_id,
          guest_id: msg.guest_id,
          channel: msg.channel,
          direction: 'outbound',
          message_type: msg.template_data.event || 'manual',
          recipient: msg.recipient,
          content_summary: buildContentSummary(msg),
          external_id: sendResult.externalId || null,
          status: sendResult.success ? 'sent' : 'failed',
          metadata: {
            rule_id: msg.rule_id,
            template_id: msg.template_data.template_id,
            error: sendResult.error,
          },
        })

      if (sendResult.success) {
        result.sent++
      } else {
        result.failed++
        result.errors.push(`Message ${msg.id}: ${sendResult.error}`)
      }
    } catch (error) {
      result.failed++
      const errMsg = error instanceof Error ? error.message : 'Unknown send error'
      result.errors.push(`Message ${msg.id}: ${errMsg}`)

      // Mark as failed
      await supabase
        .from('accommodation_message_queue')
        .update({
          status: 'failed',
          error_message: errMsg,
        })
        .eq('id', msg.id)
    }
  }

  console.log(`[Sender] Processed ${result.processed}: ${result.sent} sent, ${result.failed} failed`)
  return result
}

/**
 * Route a message to the appropriate channel sender
 */
async function routeMessage(
  msg: QueuedMessage
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  switch (msg.channel) {
    case 'whatsapp':
      return sendWhatsApp(msg)
    case 'email':
      return sendEmailMessage(msg)
    default:
      return { success: false, error: `Unsupported channel: ${msg.channel}` }
  }
}

/**
 * Send via WhatsApp Cloud API
 */
async function sendWhatsApp(
  msg: QueuedMessage
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  try {
    const templateId = msg.template_data.template_id

    if (templateId) {
      // Use approved WhatsApp template
      const components = buildWhatsAppComponents(msg.template_data)
      const response = await sendTemplateMessage(
        msg.recipient,
        templateId,
        'en',
        components.length > 0 ? components : undefined
      )
      const messageId = response?.messages?.[0]?.id
      return { success: true, externalId: messageId }
    }

    // Fallback to plain text
    const text = buildPlainTextMessage(msg)
    const response = await sendTextMessage(msg.recipient, text)
    const messageId = response?.messages?.[0]?.id
    return { success: true, externalId: messageId }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'WhatsApp send failed'
    console.error(`[Sender] WhatsApp error for ${msg.id}:`, errMsg)
    return { success: false, error: errMsg }
  }
}

/**
 * Send via Resend Email
 */
async function sendEmailMessage(
  msg: QueuedMessage
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  try {
    const subject = buildEmailSubject(msg)
    const html = buildEmailHtml(msg)

    const response = await sendEmail({
      to: msg.recipient,
      subject,
      html,
      tags: ['accommodation', msg.template_data.event || 'notification'],
    })

    if (!response.success) {
      return { success: false, error: response.error || 'Email send failed' }
    }
    return { success: true, externalId: response.messageId }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Email send failed'
    console.error(`[Sender] Email error for ${msg.id}:`, errMsg)
    return { success: false, error: errMsg }
  }
}

/**
 * Build WhatsApp template components from template data
 */
function buildWhatsAppComponents(
  data: QueuedMessage['template_data']
): Array<{
  type: 'header' | 'body' | 'button'
  parameters: Array<{ type: 'text'; text: string }>
}> {
  const bodyParams: Array<{ type: 'text'; text: string }> = []

  // Standard body parameters in order
  if (data.guest_first_name) bodyParams.push({ type: 'text', text: data.guest_first_name })
  if (data.property_name) bodyParams.push({ type: 'text', text: data.property_name })
  if (data.check_in_date) bodyParams.push({ type: 'text', text: data.check_in_date })
  if (data.check_out_date) bodyParams.push({ type: 'text', text: data.check_out_date })
  if (data.nights) bodyParams.push({ type: 'text', text: data.nights })

  if (bodyParams.length === 0) return []

  return [{ type: 'body', parameters: bodyParams }]
}

/**
 * Build a plain text message for WhatsApp (when no template is configured)
 */
function buildPlainTextMessage(msg: QueuedMessage): string {
  const d = msg.template_data
  const event = d.event || 'notification'

  switch (event) {
    case 'booking_confirmed':
      return `Hi ${d.guest_first_name}, your booking at ${d.property_name} is confirmed! Check-in: ${d.check_in_date}, Check-out: ${d.check_out_date} (${d.nights} nights). We look forward to welcoming you!`
    case 'booking_cancelled':
      return `Hi ${d.guest_first_name}, your booking at ${d.property_name} has been cancelled. If this was a mistake, please contact us.`
    case 'check_in_24h':
      return `Hi ${d.guest_first_name}, just a reminder that your check-in at ${d.property_name} is tomorrow (${d.check_in_date}). We're looking forward to seeing you!`
    case 'check_out_reminder':
      return `Hi ${d.guest_first_name}, just a reminder that check-out at ${d.property_name} is today. Thank you for staying with us!`
    case 'payment_received':
      return `Hi ${d.guest_first_name}, we've received your payment for your stay at ${d.property_name}. Thank you!`
    case 'review_request':
      return `Hi ${d.guest_first_name}, thank you for staying at ${d.property_name}! We'd love to hear about your experience. Would you mind leaving us a review?`
    default:
      return `Hi ${d.guest_first_name}, you have a new notification regarding your booking at ${d.property_name}.`
  }
}

/**
 * Build email subject from event type
 */
function buildEmailSubject(msg: QueuedMessage): string {
  const d = msg.template_data
  const event = d.event || 'notification'

  switch (event) {
    case 'booking_confirmed':
      return `Booking Confirmed - ${d.property_name}`
    case 'booking_cancelled':
      return `Booking Cancelled - ${d.property_name}`
    case 'check_in_24h':
      return `Check-in Reminder - ${d.property_name}`
    case 'check_out_reminder':
      return `Check-out Reminder - ${d.property_name}`
    case 'payment_received':
      return `Payment Received - ${d.property_name}`
    case 'deposit_due':
      return `Deposit Reminder - ${d.property_name}`
    case 'review_request':
      return `How was your stay at ${d.property_name}?`
    default:
      return `Notification - ${d.property_name}`
  }
}

/**
 * Build email HTML body from template data
 */
function buildEmailHtml(msg: QueuedMessage): string {
  const d = msg.template_data
  const event = d.event || 'notification'

  // Simple styled HTML emails
  const wrapper = (content: string) => `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f8f9fa; border-radius: 8px; padding: 24px;">
        ${content}
      </div>
      <p style="color: #999; font-size: 12px; margin-top: 16px; text-align: center;">
        Sent via DraggonnB CRMM
      </p>
    </div>
  `

  switch (event) {
    case 'booking_confirmed':
      return wrapper(`
        <h2 style="color: #16a34a; margin: 0 0 16px;">Booking Confirmed</h2>
        <p>Hi ${d.guest_first_name},</p>
        <p>Great news! Your booking at <strong>${d.property_name}</strong> has been confirmed.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px 0; color: #666;">Check-in</td><td style="padding: 8px 0; font-weight: 600;">${d.check_in_date}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Check-out</td><td style="padding: 8px 0; font-weight: 600;">${d.check_out_date}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Nights</td><td style="padding: 8px 0; font-weight: 600;">${d.nights}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Guests</td><td style="padding: 8px 0; font-weight: 600;">${d.total_guests}</td></tr>
        </table>
        <p>We look forward to welcoming you!</p>
      `)
    case 'booking_cancelled':
      return wrapper(`
        <h2 style="color: #dc2626; margin: 0 0 16px;">Booking Cancelled</h2>
        <p>Hi ${d.guest_first_name},</p>
        <p>Your booking at <strong>${d.property_name}</strong> has been cancelled.</p>
        <p>If this was a mistake, please contact us to rebook.</p>
      `)
    case 'check_in_24h':
      return wrapper(`
        <h2 style="color: #2563eb; margin: 0 0 16px;">Check-in Tomorrow!</h2>
        <p>Hi ${d.guest_first_name},</p>
        <p>Just a reminder that your check-in at <strong>${d.property_name}</strong> is tomorrow, <strong>${d.check_in_date}</strong>.</p>
        <p>We're looking forward to seeing you!</p>
      `)
    case 'payment_received':
      return wrapper(`
        <h2 style="color: #16a34a; margin: 0 0 16px;">Payment Received</h2>
        <p>Hi ${d.guest_first_name},</p>
        <p>We've received your payment for your stay at <strong>${d.property_name}</strong>. Thank you!</p>
      `)
    case 'review_request':
      return wrapper(`
        <h2 style="color: #7c3aed; margin: 0 0 16px;">How Was Your Stay?</h2>
        <p>Hi ${d.guest_first_name},</p>
        <p>Thank you for staying at <strong>${d.property_name}</strong>! We hope you had a wonderful time.</p>
        <p>We'd love to hear about your experience. Your feedback helps us improve.</p>
      `)
    default:
      return wrapper(`
        <h2 style="margin: 0 0 16px;">Notification</h2>
        <p>Hi ${d.guest_first_name},</p>
        <p>You have a new notification regarding your booking at <strong>${d.property_name}</strong>.</p>
      `)
  }
}

/**
 * Build a short content summary for the comms log
 */
function buildContentSummary(msg: QueuedMessage): string {
  const event = msg.template_data.event || 'notification'
  const guestName = msg.template_data.guest_full_name || msg.recipient
  return `${event} notification sent to ${guestName} via ${msg.channel}`
}
