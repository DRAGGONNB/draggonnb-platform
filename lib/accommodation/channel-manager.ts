/**
 * Channel Manager - iCal-based sync for Booking.com, Airbnb, and other OTAs
 *
 * South African accommodation properties use iCal feeds as the standard
 * integration method with external channels:
 * - We EXPORT an iCal feed URL that Booking.com/Airbnb imports
 * - We IMPORT iCal feed URLs that Booking.com/Airbnb exports
 * - Two-way sync keeps availability consistent across all channels
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Types ──────────────────────────────────────────────────────────────────

export type ChannelSource = 'booking_com' | 'airbnb' | 'other'

export interface ICalEvent {
  uid: string
  dtstart: string    // YYYYMMDD format
  dtend: string      // YYYYMMDD format
  summary: string
  description?: string
}

export interface ChannelFeedConfig {
  source: ChannelSource
  feed_url: string
  label?: string
}

export interface ChannelSync {
  source: ChannelSource
  feed_url: string
  label?: string
  last_synced_at: string | null
  last_sync_result: {
    imported: number
    conflicts: number
    errors: string[]
  } | null
}

export interface ImportResult {
  imported: number
  conflicts: number
  errors: string[]
}

export interface SyncAllResult {
  synced: number
  errors: string[]
}

// ─── iCal Parser ────────────────────────────────────────────────────────────

/**
 * Unfold iCal content lines. Per RFC 5545 section 3.1, long lines are folded
 * by inserting a CRLF followed by a single whitespace character.
 * Lines starting with a space or tab are continuations of the previous line.
 */
function unfoldICalLines(raw: string): string[] {
  // Normalize line endings to \n
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  // Unfold continuation lines (lines starting with space or tab)
  const unfolded = normalized.replace(/\n[ \t]/g, '')
  return unfolded.split('\n').filter((line) => line.trim().length > 0)
}

/**
 * Parse a DATE or DATE-TIME value from iCal format.
 * DATE format: YYYYMMDD
 * DATE-TIME format: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
 * Returns YYYYMMDD string (date portion only).
 */
function parseICalDate(value: string): string {
  // Strip any TZID prefix like "TZID=Africa/Johannesburg:"
  const colonIdx = value.lastIndexOf(':')
  const dateStr = colonIdx !== -1 ? value.substring(colonIdx + 1) : value

  // Extract YYYYMMDD from either DATE or DATE-TIME format
  const cleaned = dateStr.replace(/[^0-9T]/g, '')
  if (cleaned.length >= 8) {
    return cleaned.substring(0, 8)
  }
  return cleaned
}

/**
 * Parse an iCal (RFC 5545) string into an array of events.
 * Handles:
 * - VCALENDAR/VEVENT structure
 * - DATE and DATE-TIME values
 * - Line folding (continuation lines)
 * - TZID parameters on date properties
 * - VALUE=DATE parameters
 */
export function parseICal(icalString: string): ICalEvent[] {
  const lines = unfoldICalLines(icalString)
  const events: ICalEvent[] = []
  let currentEvent: Partial<ICalEvent> | null = null
  let inEvent = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true
      currentEvent = {}
      continue
    }

    if (trimmed === 'END:VEVENT') {
      if (currentEvent && currentEvent.uid && currentEvent.dtstart && currentEvent.dtend) {
        events.push({
          uid: currentEvent.uid,
          dtstart: currentEvent.dtstart,
          dtend: currentEvent.dtend,
          summary: currentEvent.summary || 'Blocked',
          description: currentEvent.description,
        })
      }
      inEvent = false
      currentEvent = null
      continue
    }

    if (!inEvent || !currentEvent) continue

    // Parse property:value pairs
    // Properties can have parameters like DTSTART;VALUE=DATE:20240101
    // or DTSTART;TZID=Africa/Johannesburg:20240101T140000
    const separatorIdx = trimmed.indexOf(':')
    if (separatorIdx === -1) continue

    const propertyPart = trimmed.substring(0, separatorIdx)
    const valuePart = trimmed.substring(separatorIdx + 1)

    // Extract property name (before any ;parameters)
    const semicolonIdx = propertyPart.indexOf(';')
    const propName = semicolonIdx !== -1
      ? propertyPart.substring(0, semicolonIdx).toUpperCase()
      : propertyPart.toUpperCase()

    switch (propName) {
      case 'UID':
        currentEvent.uid = valuePart.trim()
        break
      case 'DTSTART':
        currentEvent.dtstart = parseICalDate(valuePart)
        break
      case 'DTEND':
        currentEvent.dtend = parseICalDate(valuePart)
        break
      case 'SUMMARY':
        currentEvent.summary = valuePart.trim()
        break
      case 'DESCRIPTION':
        currentEvent.description = valuePart.trim()
        break
    }
  }

  return events
}

// ─── iCal Generator ─────────────────────────────────────────────────────────

/**
 * Format a date as iCal DATE value (YYYYMMDD).
 */
function toICalDate(dateString: string): string {
  return dateString.replace(/-/g, '')
}

/**
 * Generate an iCalendar (.ics) feed for a specific unit.
 * Includes confirmed bookings and blocked dates for the next 365 days.
 *
 * External channels (Booking.com, Airbnb) import this URL to see
 * our availability and block matching dates on their side.
 */
export async function generateICalFeed(
  supabase: SupabaseClient,
  organizationId: string,
  unitId: string
): Promise<string> {
  const now = new Date()
  const oneYearLater = new Date(now)
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)

  const fromDate = now.toISOString().split('T')[0]
  const toDate = oneYearLater.toISOString().split('T')[0]

  // Fetch bookings for this unit via booking segments
  const { data: segments } = await supabase
    .from('accommodation_booking_segments')
    .select(`
      booking_id,
      start_date,
      end_date,
      accommodation_bookings!inner(
        id, status, source, check_in_date, check_out_date,
        accommodation_guests(first_name, last_name)
      )
    `)
    .eq('organization_id', organizationId)
    .eq('unit_id', unitId)
    .gte('end_date', fromDate)
    .lte('start_date', toDate)

  // Also fetch direct bookings that reference this unit's property
  // (for properties with single units where segments may not exist)
  const { data: directBookings } = await supabase
    .from('accommodation_bookings')
    .select(`
      id, status, source, check_in_date, check_out_date,
      accommodation_guests(first_name, last_name)
    `)
    .eq('organization_id', organizationId)
    .in('status', ['confirmed', 'checked_in', 'pending_deposit', 'quoted'])
    .gte('check_out_date', fromDate)
    .lte('check_in_date', toDate)

  // Build unique event set
  const eventMap = new Map<string, { id: string; startDate: string; endDate: string; summary: string; status: string }>()

  // From segments
  if (segments) {
    for (const seg of segments) {
      const booking = Array.isArray(seg.accommodation_bookings)
        ? seg.accommodation_bookings[0]
        : seg.accommodation_bookings

      if (!booking) continue

      const status = (booking as Record<string, unknown>).status as string
      if (!['confirmed', 'checked_in', 'pending_deposit', 'quoted'].includes(status)) continue

      const bookingId = (booking as Record<string, unknown>).id as string
      if (eventMap.has(bookingId)) continue

      const guest = (booking as Record<string, unknown>).accommodation_guests as unknown as
        | { first_name: string; last_name: string }
        | Array<{ first_name: string; last_name: string }>
        | null

      const guestData = Array.isArray(guest) ? guest[0] : guest
      const guestInitial = guestData
        ? `${guestData.first_name} ${guestData.last_name.charAt(0)}.`
        : 'Booked'

      const source = (booking as Record<string, unknown>).source as string

      // Use segment dates if available, otherwise fall back to booking dates
      const startDate = seg.start_date || (booking as Record<string, unknown>).check_in_date as string
      const endDate = seg.end_date || (booking as Record<string, unknown>).check_out_date as string

      eventMap.set(bookingId, {
        id: bookingId,
        startDate,
        endDate,
        summary: source === 'direct' ? guestInitial : 'Booked',
        status,
      })
    }
  }

  // From direct bookings (if not already added via segments)
  if (directBookings) {
    for (const booking of directBookings) {
      if (eventMap.has(booking.id)) continue

      const guest = Array.isArray(booking.accommodation_guests)
        ? booking.accommodation_guests[0]
        : booking.accommodation_guests

      const guestInitial = guest
        ? `${guest.first_name} ${guest.last_name.charAt(0)}.`
        : 'Booked'

      // Only show guest name for direct bookings, "Booked" for external
      const summary = booking.source === 'direct' ? guestInitial : 'Booked'

      eventMap.set(booking.id, {
        id: booking.id,
        startDate: booking.check_in_date,
        endDate: booking.check_out_date,
        summary,
        status: booking.status,
      })
    }
  }

  // Build iCal string
  const calLines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DraggonnB//Accommodation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Unit ${unitId}`,
  ]

  for (const event of eventMap.values()) {
    calLines.push(
      'BEGIN:VEVENT',
      `UID:${event.id}@draggonnb.co.za`,
      `DTSTART;VALUE=DATE:${toICalDate(event.startDate)}`,
      `DTEND;VALUE=DATE:${toICalDate(event.endDate)}`,
      `SUMMARY:${event.summary}`,
      `STATUS:${event.status === 'confirmed' || event.status === 'checked_in' ? 'CONFIRMED' : 'TENTATIVE'}`,
      'TRANSP:OPAQUE',
      `DTSTAMP:${formatICalTimestamp(now)}`,
      'END:VEVENT',
    )
  }

  calLines.push('END:VCALENDAR')

  return calLines.join('\r\n')
}

/**
 * Format a Date as iCal timestamp (YYYYMMDDTHHMMSSZ).
 */
function formatICalTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

// ─── iCal Importer ──────────────────────────────────────────────────────────

/**
 * Import an external iCal feed (from Booking.com, Airbnb, etc.) and create
 * blocked date entries for any events that don't conflict with existing bookings.
 *
 * External channels export iCal feeds containing their bookings. We import
 * these to block the same dates on our side, preventing double-bookings.
 */
export async function importICalFeed(
  supabase: SupabaseClient,
  organizationId: string,
  unitId: string,
  feedUrl: string,
  source: ChannelSource
): Promise<ImportResult> {
  const errors: string[] = []
  let imported = 0
  let conflicts = 0

  // 1. Fetch the iCal feed
  let icalContent: string
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    const response = await fetch(feedUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'DraggonnB-ChannelManager/1.0' },
    })
    clearTimeout(timeout)

    if (!response.ok) {
      return {
        imported: 0,
        conflicts: 0,
        errors: [`Failed to fetch iCal feed: HTTP ${response.status}`],
      }
    }

    icalContent = await response.text()
  } catch (fetchError) {
    const message = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'
    return { imported: 0, conflicts: 0, errors: [`Failed to fetch iCal feed: ${message}`] }
  }

  // 2. Parse the iCal content
  const events = parseICal(icalContent)
  if (events.length === 0) {
    return { imported: 0, conflicts: 0, errors: [] }
  }

  // 3. Get the unit's property_id
  const { data: unit } = await supabase
    .from('accommodation_units')
    .select('id, property_id')
    .eq('id', unitId)
    .eq('organization_id', organizationId)
    .single()

  if (!unit) {
    return { imported: 0, conflicts: 0, errors: ['Unit not found'] }
  }

  // 4. Fetch existing bookings for conflict checking
  const eventStartDates = events.map((e) => formatDateFromICal(e.dtstart))
  const eventEndDates = events.map((e) => formatDateFromICal(e.dtend))
  const minDate = eventStartDates.sort()[0]
  const maxDate = eventEndDates.sort().reverse()[0]

  const { data: existingBookings } = await supabase
    .from('accommodation_bookings')
    .select('id, check_in_date, check_out_date, status, source, metadata')
    .eq('organization_id', organizationId)
    .in('status', ['confirmed', 'checked_in', 'pending_deposit', 'quoted'])
    .lte('check_in_date', maxDate)
    .gte('check_out_date', minDate)

  // Build a set of existing external UIDs to avoid duplicates
  const existingExternalUids = new Set<string>()
  if (existingBookings) {
    for (const b of existingBookings) {
      const metadata = b.metadata as Record<string, unknown> | null
      const externalUid = metadata?.external_ical_uid as string | undefined
      if (externalUid) {
        existingExternalUids.add(externalUid)
      }
    }
  }

  // 5. Process each event
  for (const event of events) {
    // Skip if already imported (match by external UID)
    if (existingExternalUids.has(event.uid)) {
      continue
    }

    const checkInDate = formatDateFromICal(event.dtstart)
    const checkOutDate = formatDateFromICal(event.dtend)

    // Skip invalid date ranges
    if (checkInDate >= checkOutDate) {
      errors.push(`Skipped event ${event.uid}: invalid date range ${checkInDate} to ${checkOutDate}`)
      continue
    }

    // Check for date conflicts with existing bookings
    const hasConflict = existingBookings?.some((b) => {
      return b.check_in_date < checkOutDate && b.check_out_date > checkInDate
    })

    if (hasConflict) {
      conflicts++
      errors.push(`Conflict for ${checkInDate} to ${checkOutDate} (${event.summary})`)
      continue
    }

    // Determine booking source from channel
    const bookingSource = source === 'booking_com' ? 'booking_com'
      : source === 'airbnb' ? 'airbnb'
      : 'ota_other'

    const nights = Math.ceil(
      (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)
    )

    // Create a booking entry for the external block
    const bookingRef = `EXT-${source.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`

    const { error: insertError } = await supabase
      .from('accommodation_bookings')
      .insert({
        organization_id: organizationId,
        property_id: unit.property_id,
        guest_id: null, // External bookings may not have guest records
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        nights,
        status: 'confirmed',
        source: bookingSource,
        booking_ref: bookingRef,
        adults: 1,
        children: 0,
        infants: 0,
        currency: 'ZAR',
        subtotal: 0,
        discount_total: 0,
        fee_total: 0,
        tax_total: 0,
        grand_total: 0,
        amount_paid: 0,
        balance_due: 0,
        internal_notes: `Imported from ${source} iCal feed`,
        metadata: {
          external_ical_uid: event.uid,
          external_source: source,
          external_summary: event.summary,
          imported_at: new Date().toISOString(),
        },
      })

    if (insertError) {
      errors.push(`Failed to import event ${event.uid}: ${insertError.message}`)
    } else {
      imported++
    }
  }

  // 6. Update sync status on the unit's channel config
  await updateSyncTimestamp(supabase, organizationId, unitId, source, {
    imported,
    conflicts,
    errors,
  })

  return { imported, conflicts, errors }
}

/**
 * Convert YYYYMMDD iCal date to YYYY-MM-DD database format.
 */
function formatDateFromICal(icalDate: string): string {
  if (icalDate.length !== 8) return icalDate
  return `${icalDate.substring(0, 4)}-${icalDate.substring(4, 6)}-${icalDate.substring(6, 8)}`
}

// ─── Sync Status ────────────────────────────────────────────────────────────

/**
 * Get the channel sync configuration and status for a specific unit.
 * Channel feeds are stored in the unit's metadata.channel_feeds JSONB field.
 */
export async function getChannelSyncStatus(
  supabase: SupabaseClient,
  organizationId: string,
  unitId: string
): Promise<{ channels: ChannelSync[] }> {
  const { data: unit } = await supabase
    .from('accommodation_units')
    .select('id, name, metadata')
    .eq('id', unitId)
    .eq('organization_id', organizationId)
    .single()

  if (!unit) {
    return { channels: [] }
  }

  const metadata = (unit.metadata || {}) as Record<string, unknown>
  const channelFeeds = (metadata.channel_feeds || []) as Array<{
    source: ChannelSource
    feed_url: string
    label?: string
    last_synced_at?: string | null
    last_sync_result?: ImportResult | null
  }>

  const channels: ChannelSync[] = channelFeeds.map((feed) => ({
    source: feed.source,
    feed_url: feed.feed_url,
    label: feed.label,
    last_synced_at: feed.last_synced_at || null,
    last_sync_result: feed.last_sync_result || null,
  }))

  return { channels }
}

/**
 * Configure iCal feed URLs for a unit.
 * Replaces the entire channel_feeds array in the unit's metadata.
 */
export async function configureChannelFeeds(
  supabase: SupabaseClient,
  organizationId: string,
  unitId: string,
  feeds: ChannelFeedConfig[]
): Promise<{ success: boolean; error?: string }> {
  // Get existing metadata
  const { data: unit } = await supabase
    .from('accommodation_units')
    .select('id, metadata')
    .eq('id', unitId)
    .eq('organization_id', organizationId)
    .single()

  if (!unit) {
    return { success: false, error: 'Unit not found' }
  }

  const existingMetadata = (unit.metadata || {}) as Record<string, unknown>

  // Preserve existing sync timestamps when updating feeds
  const existingFeeds = (existingMetadata.channel_feeds || []) as Array<{
    source: ChannelSource
    feed_url: string
    last_synced_at?: string | null
    last_sync_result?: ImportResult | null
  }>

  const updatedFeeds = feeds.map((feed) => {
    const existing = existingFeeds.find((ef) => ef.source === feed.source)
    return {
      source: feed.source,
      feed_url: feed.feed_url,
      label: feed.label,
      last_synced_at: existing?.last_synced_at || null,
      last_sync_result: existing?.last_sync_result || null,
    }
  })

  const { error } = await supabase
    .from('accommodation_units')
    .update({
      metadata: {
        ...existingMetadata,
        channel_feeds: updatedFeeds,
      },
    })
    .eq('id', unitId)
    .eq('organization_id', organizationId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Update sync timestamp and results for a specific channel feed.
 */
async function updateSyncTimestamp(
  supabase: SupabaseClient,
  organizationId: string,
  unitId: string,
  source: ChannelSource,
  result: ImportResult
): Promise<void> {
  const { data: unit } = await supabase
    .from('accommodation_units')
    .select('id, metadata')
    .eq('id', unitId)
    .eq('organization_id', organizationId)
    .single()

  if (!unit) return

  const metadata = (unit.metadata || {}) as Record<string, unknown>
  const feeds = (metadata.channel_feeds || []) as Array<Record<string, unknown>>

  const updatedFeeds = feeds.map((feed) => {
    if (feed.source === source) {
      return {
        ...feed,
        last_synced_at: new Date().toISOString(),
        last_sync_result: result,
      }
    }
    return feed
  })

  await supabase
    .from('accommodation_units')
    .update({
      metadata: { ...metadata, channel_feeds: updatedFeeds },
    })
    .eq('id', unitId)
    .eq('organization_id', organizationId)
}

// ─── Sync Orchestrator ──────────────────────────────────────────────────────

/**
 * Sync all configured iCal channels for all units in an organization.
 * This is intended to be called by an N8N cron workflow (e.g., every 15 minutes).
 *
 * For each unit that has channel_feeds configured:
 * 1. Import from each external iCal feed
 * 2. Log the sync result
 * 3. Continue to next unit on error (don't fail the whole batch)
 */
export async function syncAllChannels(
  supabase: SupabaseClient,
  organizationId: string
): Promise<SyncAllResult> {
  const errors: string[] = []
  let synced = 0

  // Get all units with channel feeds configured
  const { data: units, error: unitsError } = await supabase
    .from('accommodation_units')
    .select('id, name, metadata')
    .eq('organization_id', organizationId)
    .eq('status', 'available')

  if (unitsError) {
    return { synced: 0, errors: [`Failed to fetch units: ${unitsError.message}`] }
  }

  if (!units || units.length === 0) {
    return { synced: 0, errors: [] }
  }

  for (const unit of units) {
    const metadata = (unit.metadata || {}) as Record<string, unknown>
    const feeds = (metadata.channel_feeds || []) as Array<{
      source: ChannelSource
      feed_url: string
    }>

    if (feeds.length === 0) continue

    for (const feed of feeds) {
      try {
        const result = await importICalFeed(
          supabase,
          organizationId,
          unit.id,
          feed.feed_url,
          feed.source
        )

        if (result.imported > 0) {
          synced += result.imported
        }

        if (result.errors.length > 0) {
          errors.push(
            `Unit ${unit.name} (${feed.source}): ${result.errors.join('; ')}`
          )
        }

        console.log(
          `[ChannelSync] Unit ${unit.name} / ${feed.source}: ` +
          `imported=${result.imported}, conflicts=${result.conflicts}, errors=${result.errors.length}`
        )
      } catch (syncError) {
        const message = syncError instanceof Error ? syncError.message : 'Unknown sync error'
        errors.push(`Unit ${unit.name} (${feed.source}): ${message}`)
      }
    }
  }

  return { synced, errors }
}

/**
 * Sync all configured iCal channels for a specific unit.
 */
export async function syncUnitChannels(
  supabase: SupabaseClient,
  organizationId: string,
  unitId: string
): Promise<SyncAllResult> {
  const errors: string[] = []
  let synced = 0

  const { data: unit } = await supabase
    .from('accommodation_units')
    .select('id, name, metadata')
    .eq('id', unitId)
    .eq('organization_id', organizationId)
    .single()

  if (!unit) {
    return { synced: 0, errors: ['Unit not found'] }
  }

  const metadata = (unit.metadata || {}) as Record<string, unknown>
  const feeds = (metadata.channel_feeds || []) as Array<{
    source: ChannelSource
    feed_url: string
  }>

  if (feeds.length === 0) {
    return { synced: 0, errors: [] }
  }

  for (const feed of feeds) {
    try {
      const result = await importICalFeed(
        supabase,
        organizationId,
        unit.id,
        feed.feed_url,
        feed.source
      )

      if (result.imported > 0) {
        synced += result.imported
      }

      if (result.errors.length > 0) {
        errors.push(`${feed.source}: ${result.errors.join('; ')}`)
      }
    } catch (syncError) {
      const message = syncError instanceof Error ? syncError.message : 'Unknown sync error'
      errors.push(`${feed.source}: ${message}`)
    }
  }

  return { synced, errors }
}
