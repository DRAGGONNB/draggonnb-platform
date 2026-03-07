/**
 * Accommodation Event Dispatcher
 * Matches booking lifecycle events to automation rules and queues messages
 * Also dispatches staff notifications via Telegram for operational events
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  sendVipArrivalAlert,
  sendDepartmentNotification,
  getChannelConfig,
} from '@/lib/accommodation/telegram/ops-bot'

export type BookingEvent =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'guest_checked_in'
  | 'guest_checked_out'
  | 'payment_received'
  | 'deposit_due'
  | 'check_in_24h'
  | 'check_out_reminder'
  | 'review_request'
  // Staff notification events
  | 'turnover_needed'
  | 'maintenance_urgent'
  | 'vip_arrival'

interface AutomationRule {
  id: string
  channel: string
  template_id: string | null
  delay_minutes: number
  conditions: Record<string, unknown>
}

interface BookingWithGuest {
  id: string
  guest_id: string
  property_id: string
  check_in_date: string
  check_out_date: string
  adults: number
  children: number
  status: string
  source: string
  special_requests?: string | null
  guest: {
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
  }
  property: {
    name: string
    type: string
  }
}

/**
 * Emit a booking lifecycle event.
 * Looks up matching active automation rules and queues messages.
 */
export async function emitBookingEvent(
  supabase: SupabaseClient,
  organizationId: string,
  bookingId: string,
  event: BookingEvent
): Promise<{ queued: number; errors: string[] }> {
  const errors: string[] = []

  // 1. Fetch matching automation rules
  const { data: rules, error: rulesError } = await supabase
    .from('accommodation_automation_rules')
    .select('id, channel, template_id, delay_minutes, conditions')
    .eq('organization_id', organizationId)
    .eq('trigger_event', event)
    .eq('is_active', true)

  if (rulesError) {
    console.error(`[Dispatcher] Failed to fetch rules for ${event}:`, rulesError)
    return { queued: 0, errors: [rulesError.message] }
  }

  if (!rules || rules.length === 0) {
    return { queued: 0, errors: [] }
  }

  // 2. Fetch booking + guest details
  const { data: booking, error: bookingError } = await supabase
    .from('accommodation_bookings')
    .select(`
      id, guest_id, property_id, check_in_date, check_out_date,
      adults, children, status, source, special_requests,
      accommodation_guests!inner(first_name, last_name, email, phone),
      accommodation_properties!inner(name, type)
    `)
    .eq('id', bookingId)
    .eq('organization_id', organizationId)
    .single()

  if (bookingError || !booking) {
    console.error(`[Dispatcher] Failed to fetch booking ${bookingId}:`, bookingError)
    return { queued: 0, errors: [bookingError?.message || 'Booking not found'] }
  }

  // Normalize joined data
  const guest = Array.isArray(booking.accommodation_guests)
    ? booking.accommodation_guests[0]
    : booking.accommodation_guests
  const property = Array.isArray(booking.accommodation_properties)
    ? booking.accommodation_properties[0]
    : booking.accommodation_properties

  const bookingData: BookingWithGuest = {
    id: booking.id,
    guest_id: booking.guest_id,
    property_id: booking.property_id,
    check_in_date: booking.check_in_date,
    check_out_date: booking.check_out_date,
    adults: booking.adults,
    children: booking.children,
    status: booking.status,
    source: booking.source,
    guest,
    property,
  }

  // 3. Queue a message for each matching rule
  let queued = 0
  for (const rule of rules as AutomationRule[]) {
    // Check optional conditions
    if (!matchesConditions(rule.conditions, bookingData)) {
      continue
    }

    const recipient = getRecipient(rule.channel, bookingData)
    if (!recipient) {
      errors.push(`No ${rule.channel} contact for guest ${guest.first_name} ${guest.last_name}`)
      continue
    }

    const scheduledFor = new Date(Date.now() + rule.delay_minutes * 60 * 1000).toISOString()

    const templateData = buildTemplateData(bookingData, event)

    const { error: insertError } = await supabase
      .from('accommodation_message_queue')
      .insert({
        organization_id: organizationId,
        rule_id: rule.id,
        booking_id: bookingId,
        guest_id: booking.guest_id,
        channel: rule.channel,
        recipient,
        template_data: {
          ...templateData,
          template_id: rule.template_id,
          event,
        },
        scheduled_for: scheduledFor,
        status: 'pending',
      })

    if (insertError) {
      errors.push(`Failed to queue ${rule.channel} message: ${insertError.message}`)
    } else {
      queued++
    }
  }

  if (queued > 0) {
    console.log(`[Dispatcher] Queued ${queued} message(s) for event ${event} on booking ${bookingId}`)
  }

  // 4. Dispatch staff notifications for operational events
  try {
    await dispatchStaffNotifications(supabase, organizationId, event, bookingData)
  } catch (staffError) {
    console.error(`[Dispatcher] Staff notification error for ${event}:`, staffError)
    // Don't fail the main dispatch if staff notifications fail
  }

  return { queued, errors }
}

/**
 * Dispatch Telegram notifications to staff channels for operational events
 */
async function dispatchStaffNotifications(
  supabase: SupabaseClient,
  organizationId: string,
  event: BookingEvent,
  booking: BookingWithGuest
): Promise<void> {
  const guestName = `${booking.guest.first_name} ${booking.guest.last_name}`
  const unitInfo = booking.property.name

  switch (event) {
    case 'guest_checked_out': {
      // Notify housekeeping about turnover
      const hkChannel = await getChannelConfig(supabase, organizationId, 'housekeeping')
      if (hkChannel) {
        await sendDepartmentNotification(
          supabase,
          organizationId,
          'housekeeping',
          `🔄 <b>Turnover Needed</b>\n\n` +
          `Guest <b>${escapeHtml(guestName)}</b> has checked out of <b>${escapeHtml(unitInfo)}</b>.\n` +
          `Unit needs to be cleaned and prepared for next guest.`
        )
      }

      // Auto-apply default costs and decrement stock on checkout
      try {
        await applyCheckoutCosts(supabase, organizationId, booking)
      } catch (costError) {
        console.error(`[Dispatcher] Auto-cost on checkout error for booking ${booking.id}:`, costError)
      }
      break
    }

    case 'vip_arrival': {
      // Alert front desk and management about VIP
      await sendVipArrivalAlert(supabase, organizationId, {
        guest_name: guestName,
        unit_name: unitInfo,
        property_name: booking.property.name,
        check_in_date: booking.check_in_date,
        special_requests: booking.special_requests || null,
        total_stays: 0,
        total_spent: 0,
      })
      break
    }

    case 'booking_confirmed': {
      // Check if guest is VIP and dispatch VIP alert
      const { data: guest } = await supabase
        .from('accommodation_guests')
        .select('is_vip')
        .eq('id', booking.guest_id)
        .single()

      if (guest?.is_vip) {
        await sendVipArrivalAlert(supabase, organizationId, {
          guest_name: guestName,
          unit_name: unitInfo,
          property_name: booking.property.name,
          check_in_date: booking.check_in_date,
          special_requests: booking.special_requests || null,
          total_stays: 0,
          total_spent: 0,
        })
      }

      // Notify front desk of new confirmed booking
      const fdChannel = await getChannelConfig(supabase, organizationId, 'front_desk')
      if (fdChannel) {
        const checkIn = new Date(booking.check_in_date).toLocaleDateString('en-ZA', {
          weekday: 'short', day: 'numeric', month: 'short',
        })
        await sendDepartmentNotification(
          supabase,
          organizationId,
          'front_desk',
          `✅ <b>Booking Confirmed</b>\n\n` +
          `Guest: <b>${escapeHtml(guestName)}</b>\n` +
          `Property: ${escapeHtml(unitInfo)}\n` +
          `Check-in: ${checkIn}\n` +
          `Guests: ${booking.adults + booking.children}`
        )
      }
      break
    }

    case 'maintenance_urgent': {
      // Notify management about urgent maintenance
      const mgmtChannel = await getChannelConfig(supabase, organizationId, 'management')
      if (mgmtChannel) {
        await sendDepartmentNotification(
          supabase,
          organizationId,
          'management',
          `🚨 <b>Urgent Maintenance Required</b>\n\n` +
          `An urgent maintenance issue has been reported at <b>${escapeHtml(unitInfo)}</b>.\n` +
          `Please check the maintenance dashboard for details.`
        )
      }
      break
    }

    case 'check_in_24h': {
      // Notify housekeeping to prepare unit for arrival
      const prepChannel = await getChannelConfig(supabase, organizationId, 'housekeeping')
      if (prepChannel) {
        await sendDepartmentNotification(
          supabase,
          organizationId,
          'housekeeping',
          `📋 <b>Arrival Prep Required</b>\n\n` +
          `Guest <b>${escapeHtml(guestName)}</b> arriving tomorrow at <b>${escapeHtml(unitInfo)}</b>.\n` +
          `Guests: ${booking.adults + booking.children}\n` +
          `Please ensure unit is ready.`
        )
      }
      break
    }

    default:
      // No staff notification for other events
      break
  }
}

/**
 * Check if a booking matches rule conditions.
 * Conditions are optional key-value filters like { property_type: "lodge", source: "direct" }
 */
function matchesConditions(
  conditions: Record<string, unknown>,
  booking: BookingWithGuest
): boolean {
  if (!conditions || Object.keys(conditions).length === 0) return true

  for (const [key, value] of Object.entries(conditions)) {
    switch (key) {
      case 'property_type':
        if (booking.property.type !== value) return false
        break
      case 'booking_source':
        if (booking.source !== value) return false
        break
      case 'min_guests':
        if (booking.adults + booking.children < (value as number)) return false
        break
      default:
        break
    }
  }
  return true
}

/**
 * Get the recipient address based on channel type
 */
function getRecipient(channel: string, booking: BookingWithGuest): string | null {
  switch (channel) {
    case 'whatsapp':
    case 'sms':
      return booking.guest.phone || null
    case 'email':
      return booking.guest.email || null
    default:
      return null
  }
}

/**
 * Build template variables from booking data
 */
function buildTemplateData(
  booking: BookingWithGuest,
  event: BookingEvent
): Record<string, string> {
  const checkIn = new Date(booking.check_in_date)
  const checkOut = new Date(booking.check_out_date)
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))

  return {
    guest_first_name: booking.guest.first_name,
    guest_last_name: booking.guest.last_name,
    guest_full_name: `${booking.guest.first_name} ${booking.guest.last_name}`,
    property_name: booking.property.name,
    check_in_date: checkIn.toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    check_out_date: checkOut.toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    nights: String(nights),
    adults: String(booking.adults),
    children: String(booking.children),
    total_guests: String(booking.adults + booking.children),
    booking_id: booking.id,
    booking_status: booking.status,
    event_type: event,
  }
}

/**
 * Auto-apply default cost entries and decrement consumable stock on checkout.
 * Looks up cost_defaults for the unit's property_type + unit_type,
 * creates unit_cost entries, and decrements stock for standard consumables.
 */
async function applyCheckoutCosts(
  supabase: SupabaseClient,
  organizationId: string,
  booking: BookingWithGuest
): Promise<void> {
  // 1. Find the unit(s) for this booking from booking segments
  const { data: segments } = await supabase
    .from('accommodation_booking_segments')
    .select('unit_id, accommodation_units(id, type)')
    .eq('booking_id', booking.id)
    .eq('organization_id', organizationId)
    .not('unit_id', 'is', null)

  if (!segments || segments.length === 0) {
    console.log(`[AutoCost] No unit segments found for booking ${booking.id}, skipping`)
    return
  }

  const costDate = new Date().toISOString().split('T')[0]
  let totalCostsApplied = 0

  for (const segment of segments) {
    const unitId = segment.unit_id as string
    const unit = segment.accommodation_units as unknown as { id: string; type: string } | null
    const unitType = unit?.type || null
    const propertyType = booking.property.type || null

    // 2. Find matching cost defaults for this property_type + unit_type
    let defaultsQuery = supabase
      .from('accommodation_cost_defaults')
      .select('id, category_id, default_amount, accommodation_cost_categories(id, name, category_type)')
      .eq('organization_id', organizationId)

    // Match defaults: exact match on property_type/unit_type, or NULL (applies to all)
    const { data: defaults } = await defaultsQuery

    if (!defaults || defaults.length === 0) continue

    // Filter defaults that match this unit (exact match or wildcard null)
    const applicableDefaults = defaults.filter((d) => {
      const dPropType = (d as Record<string, unknown>).property_type as string | null
      const dUnitType = (d as Record<string, unknown>).unit_type as string | null
      const propMatch = !dPropType || dPropType === propertyType
      const unitMatch = !dUnitType || dUnitType === unitType
      return propMatch && unitMatch
    })

    if (applicableDefaults.length === 0) continue

    // 3. Create cost entries for each applicable default
    const costEntries = applicableDefaults.map((d) => ({
      organization_id: organizationId,
      unit_id: unitId,
      category_id: d.category_id,
      booking_id: booking.id,
      amount: d.default_amount,
      quantity: 1,
      cost_date: costDate,
      notes: `Auto-applied on checkout`,
    }))

    const { error: insertError } = await supabase
      .from('accommodation_unit_costs')
      .insert(costEntries)

    if (insertError) {
      console.error(`[AutoCost] Failed to insert costs for unit ${unitId}:`, insertError)
    } else {
      totalCostsApplied += costEntries.length
    }
  }

  // 4. Decrement standard consumable stock items (if stock tracking is set up)
  //    Look for stock items with location matching the property name or 'main store'
  const { data: consumables } = await supabase
    .from('accommodation_stock_items')
    .select('id, name, current_stock, category')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .in('category', ['toiletry', 'consumable'])
    .gt('current_stock', 0)

  if (consumables && consumables.length > 0) {
    // Decrement by 1 set per checkout (one of each consumable)
    for (const item of consumables) {
      if (item.current_stock <= 0) continue

      // Create a stock movement (issue)
      const { error: movError } = await supabase
        .from('accommodation_stock_movements')
        .insert({
          organization_id: organizationId,
          stock_item_id: item.id,
          movement_type: 'issue',
          quantity: -1,
          booking_id: booking.id,
          notes: `Auto-issued on checkout for ${booking.property.name}`,
        })

      if (!movError) {
        // Update current stock
        await supabase
          .from('accommodation_stock_items')
          .update({
            current_stock: item.current_stock - 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id)
      }
    }
  }

  if (totalCostsApplied > 0) {
    console.log(`[AutoCost] Applied ${totalCostsApplied} default cost entries for booking ${booking.id}`)
  }
}

/**
 * Escape HTML special characters for Telegram HTML parse mode
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
