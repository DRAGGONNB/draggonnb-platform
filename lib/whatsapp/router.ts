import { createClient } from '@supabase/supabase-js'
import { handleIncomingMessage as handleIntakeMessage } from './intake-flow'
import { sendTextMessage, markAsRead } from './client'
import { ConciergeAgent } from '@/lib/accommodation/agents/concierge-agent'

type RouteResult = 'intake' | 'support' | 'booking_status' | 'unknown'

interface RouteContext {
  phone: string
  messageText: string
  messageId: string
  route: RouteResult
  organizationId?: string
}

const BOOKING_REF_PATTERN = /\b(BK|BOOK|REF)[-\s]?(\w{6,})\b/i

/**
 * Routes incoming WhatsApp messages to the appropriate handler.
 *
 * Priority:
 * 1. Booking reference in message -> booking status lookup
 * 2. Known org member (phone in users/contacts) -> support flow
 * 3. Unknown number -> lead intake flow
 */
export async function routeMessage(
  phone: string,
  messageText: string,
  messageId: string
): Promise<RouteContext> {
  // Mark message as read immediately
  try {
    await markAsRead(messageId)
  } catch {
    // Non-fatal
  }

  // Check for booking reference
  const bookingMatch = messageText.match(BOOKING_REF_PATTERN)
  if (bookingMatch) {
    const refId = bookingMatch[2]
    const handled = await handleBookingLookup(phone, refId)
    if (handled) {
      return { phone, messageText, messageId, route: 'booking_status' }
    }
  }

  // Check if phone belongs to a known org member or contact
  const orgContext = await lookupPhoneInOrg(phone)
  if (orgContext) {
    await handleSupportMessage(phone, messageText, orgContext.organizationId, orgContext.guestId)
    return { phone, messageText, messageId, route: 'support', organizationId: orgContext.organizationId }
  }

  // Default: intake flow for unknown numbers
  await handleIntakeMessage(phone, messageText, messageId)
  return { phone, messageText, messageId, route: 'intake' }
}

async function lookupPhoneInOrg(phone: string): Promise<{ organizationId: string; guestId?: string } | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Normalize phone: strip leading + and spaces
  const normalizedPhone = phone.replace(/[\s+\-()]/g, '')

  // Check accommodation guests first (for concierge routing)
  const { data: guest } = await supabase
    .from('accommodation_guests')
    .select('id, organization_id')
    .eq('phone', normalizedPhone)
    .limit(1)
    .single()

  if (guest) return { organizationId: guest.organization_id, guestId: guest.id }

  // Check contacts table
  const { data: contact } = await supabase
    .from('contacts')
    .select('organization_id')
    .or(`phone.eq.${normalizedPhone},mobile.eq.${normalizedPhone}`)
    .limit(1)
    .single()

  if (contact) return { organizationId: contact.organization_id }

  return null
}

async function handleBookingLookup(phone: string, refId: string): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return false

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Look up booking by confirmation_code or id prefix
  const { data: booking } = await supabase
    .from('accommodation_bookings')
    .select('id, status, check_in, check_out, total_amount, currency')
    .or(`confirmation_code.eq.${refId},id.like.${refId}%`)
    .limit(1)
    .single()

  if (!booking) {
    await sendTextMessage(phone,
      `Sorry, I couldn't find a booking with reference "${refId}". Please double-check and try again, or contact us for help.`
    )
    return true
  }

  const checkIn = booking.check_in ? new Date(booking.check_in).toLocaleDateString('en-ZA') : 'TBD'
  const checkOut = booking.check_out ? new Date(booking.check_out).toLocaleDateString('en-ZA') : 'TBD'
  const amount = booking.total_amount
    ? `${booking.currency || 'ZAR'} ${Number(booking.total_amount).toFixed(2)}`
    : 'TBD'

  const statusEmoji: Record<string, string> = {
    confirmed: 'Confirmed',
    pending: 'Pending',
    checked_in: 'Checked In',
    checked_out: 'Checked Out',
    cancelled: 'Cancelled',
  }

  await sendTextMessage(phone,
    `Booking ${refId}\n` +
    `Status: ${statusEmoji[booking.status] || booking.status}\n` +
    `Check-in: ${checkIn}\n` +
    `Check-out: ${checkOut}\n` +
    `Total: ${amount}\n\n` +
    `Need help? Reply with your question and our team will get back to you.`
  )

  return true
}

async function handleSupportMessage(
  phone: string,
  messageText: string,
  organizationId: string,
  guestId?: string
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Log inbound message to comms log
  await supabase.from('accommodation_comms_log').insert({
    organization_id: organizationId,
    channel: 'whatsapp',
    direction: 'inbound',
    message_type: 'guest_message',
    recipient: phone,
    content_summary: messageText.substring(0, 500),
    metadata: { phone, guest_id: guestId },
  }).then(() => {}, () => {})

  // Try ConciergeAgent if guest is known and agent is enabled
  if (guestId) {
    try {
      const { data: config } = await supabase
        .from('accommodation_ai_configs')
        .select('is_enabled')
        .eq('organization_id', organizationId)
        .eq('agent_type', 'concierge')
        .single()

      // Run concierge if enabled (or if no config row exists — default to enabled)
      if (!config || config.is_enabled) {
        const agent = new ConciergeAgent()
        const result = await agent.handleMessage({
          organizationId,
          message: messageText,
          guestPhone: phone,
          guestId,
        })

        const conciergeResponse = result.result as {
          reply_text?: string
          escalate_to_human?: boolean
          category?: string
        } | null

        if (conciergeResponse?.reply_text) {
          await sendTextMessage(phone, conciergeResponse.reply_text)

          // Log outbound AI response
          await supabase.from('accommodation_comms_log').insert({
            organization_id: organizationId,
            channel: 'whatsapp',
            direction: 'outbound',
            message_type: 'concierge_response',
            recipient: phone,
            content_summary: conciergeResponse.reply_text.substring(0, 500),
            metadata: {
              phone,
              guest_id: guestId,
              agent_session_id: result.sessionId,
              category: conciergeResponse.category,
              tokens_used: result.tokensUsed,
            },
          }).then(() => {}, () => {})

          // If agent flagged escalation, also notify staff
          if (conciergeResponse.escalate_to_human) {
            await sendTextMessage(phone,
              `I've also notified our team about your request. Someone will follow up with you shortly.`
            )
          }

          return // AI handled the message
        }
      }
    } catch (error) {
      console.error('ConciergeAgent error, falling back to generic response:', error)
    }
  }

  // Fallback: generic response for non-guest contacts or when concierge is disabled/fails
  await sendTextMessage(phone,
    `Thanks for your message! Our team has been notified and will get back to you shortly.\n\n` +
    `For urgent matters, please call us directly.`
  )
}
