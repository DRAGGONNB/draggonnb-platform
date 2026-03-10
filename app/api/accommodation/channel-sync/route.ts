/**
 * Channel Sync API - Organization-wide operations
 *
 * POST /api/accommodation/channel-sync - Trigger sync for all channels
 * GET  /api/accommodation/channel-sync - Get sync status for all units
 *
 * Supports dual auth: user session OR service key (for N8N cron calls).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkFeatureAccess } from '@/lib/tier/feature-gate'
import { syncAllChannels, getChannelSyncStatus } from '@/lib/accommodation/channel-manager'
import type { SupabaseClient } from '@supabase/supabase-js'

interface DualAuthResult {
  supabase: SupabaseClient
  organizationId: string
}

/**
 * Dual auth: accepts either a user session or a service key with org_id header.
 * Service key auth is for N8N cron workflows that call this endpoint.
 */
async function getDualAuth(request: Request): Promise<DualAuthResult | NextResponse> {
  // Check for service key auth (N8N cron)
  const serviceKey = request.headers.get('x-service-key')
  const headerOrgId = request.headers.get('x-organization-id')

  if (serviceKey && headerOrgId) {
    const expectedKey = process.env.CHANNEL_SYNC_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceKey !== expectedKey) {
      return NextResponse.json({ error: 'Invalid service key' }, { status: 401 })
    }
    return {
      supabase: createAdminClient(),
      organizationId: headerOrgId,
    }
  }

  // Fall back to user session auth
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData?.organization_id) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_tier')
    .eq('id', userData.organization_id)
    .single()

  const access = checkFeatureAccess(org?.subscription_tier || 'core', 'accommodation_module')
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason }, { status: 403 })
  }

  return {
    supabase,
    organizationId: userData.organization_id,
  }
}

/**
 * POST: Trigger iCal sync for all configured channels across all units.
 */
export async function POST(request: Request) {
  try {
    const auth = await getDualAuth(request)
    if (auth instanceof NextResponse) return auth

    const result = await syncAllChannels(auth.supabase, auth.organizationId)

    return NextResponse.json({
      synced: result.synced,
      errors: result.errors,
      synced_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Channel sync POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET: Get sync status for all units in the organization.
 */
export async function GET(request: Request) {
  try {
    const auth = await getDualAuth(request)
    if (auth instanceof NextResponse) return auth

    // Fetch all units with their sync config
    const { data: units, error: unitsError } = await auth.supabase
      .from('accommodation_units')
      .select('id, name, metadata')
      .eq('organization_id', auth.organizationId)
      .order('name')

    if (unitsError) {
      return NextResponse.json({ error: 'Failed to fetch units' }, { status: 500 })
    }

    const unitStatuses = await Promise.all(
      (units || []).map(async (unit) => {
        const status = await getChannelSyncStatus(
          auth.supabase,
          auth.organizationId,
          unit.id
        )
        return {
          unit_id: unit.id,
          unit_name: unit.name,
          channels: status.channels,
        }
      })
    )

    // Filter to only units with configured channels
    const configuredUnits = unitStatuses.filter((u) => u.channels.length > 0)

    return NextResponse.json({
      units: configuredUnits,
      total_units: configuredUnits.length,
    })
  } catch (error) {
    console.error('Channel sync GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
