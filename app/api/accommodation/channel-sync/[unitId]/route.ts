/**
 * Channel Sync API - Per-unit operations
 *
 * POST /api/accommodation/channel-sync/[unitId]  - Trigger sync for this unit
 * GET  /api/accommodation/channel-sync/[unitId]  - Get sync status for this unit
 * PUT  /api/accommodation/channel-sync/[unitId]  - Configure iCal feed URLs
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import {
  syncUnitChannels,
  getChannelSyncStatus,
  configureChannelFeeds,
} from '@/lib/accommodation/channel-manager'

const channelFeedSchema = z.object({
  feeds: z.array(
    z.object({
      source: z.enum(['booking_com', 'airbnb', 'other']),
      feed_url: z.string().url('Invalid feed URL'),
      label: z.string().max(100).optional(),
    })
  ).max(10, 'Maximum 10 channel feeds per unit'),
})

/**
 * POST: Trigger iCal sync for all configured channels on this unit.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ unitId: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { unitId } = await params

    // Verify the unit belongs to this organization
    const { data: unit } = await auth.supabase
      .from('accommodation_units')
      .select('id, name')
      .eq('id', unitId)
      .eq('organization_id', auth.organizationId)
      .single()

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
    }

    const result = await syncUnitChannels(auth.supabase, auth.organizationId, unitId)

    return NextResponse.json({
      unit_id: unitId,
      unit_name: unit.name,
      synced: result.synced,
      errors: result.errors,
      synced_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Channel sync unit POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET: Get sync status and iCal export URL for this unit.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ unitId: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { unitId } = await params

    // Verify the unit belongs to this organization
    const { data: unit } = await auth.supabase
      .from('accommodation_units')
      .select('id, name')
      .eq('id', unitId)
      .eq('organization_id', auth.organizationId)
      .single()

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
    }

    const status = await getChannelSyncStatus(auth.supabase, auth.organizationId, unitId)

    // Build the iCal export URL for this unit
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://draggonnb-platform.vercel.app'
    const icalExportUrl = `${baseUrl}/api/accommodation/ical/${unitId}?org=${auth.organizationId}`

    return NextResponse.json({
      unit_id: unitId,
      unit_name: unit.name,
      ical_export_url: icalExportUrl,
      channels: status.channels,
    })
  } catch (error) {
    console.error('Channel sync unit GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT: Configure iCal feed URLs for this unit.
 *
 * Body: { feeds: [{ source: "booking_com", feed_url: "https://...", label?: "..." }] }
 *
 * This sets the external iCal URLs that we import FROM.
 * The iCal URL that channels import FROM us is served at GET /api/accommodation/ical/[unitId].
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ unitId: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { unitId } = await params

    // Validate body
    const body = await request.json()
    const parsed = channelFeedSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Verify the unit belongs to this organization
    const { data: unit } = await auth.supabase
      .from('accommodation_units')
      .select('id, name')
      .eq('id', unitId)
      .eq('organization_id', auth.organizationId)
      .single()

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
    }

    const result = await configureChannelFeeds(
      auth.supabase,
      auth.organizationId,
      unitId,
      parsed.data.feeds
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Return updated status including the export URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://draggonnb-platform.vercel.app'
    const icalExportUrl = `${baseUrl}/api/accommodation/ical/${unitId}?org=${auth.organizationId}`

    const status = await getChannelSyncStatus(auth.supabase, auth.organizationId, unitId)

    return NextResponse.json({
      unit_id: unitId,
      unit_name: unit.name,
      ical_export_url: icalExportUrl,
      channels: status.channels,
      message: `Configured ${parsed.data.feeds.length} channel feed(s)`,
    })
  } catch (error) {
    console.error('Channel sync unit PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
