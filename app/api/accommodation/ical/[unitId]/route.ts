/**
 * Public iCal Feed for Accommodation Units
 *
 * GET /api/accommodation/ical/[unitId]?org=<organizationId>
 *
 * This endpoint is PUBLIC (no auth) because Booking.com and Airbnb
 * need to fetch it as a URL. The organizationId is required as a
 * query parameter since there's no authenticated session.
 *
 * Returns a valid iCalendar (.ics) file with Content-Type: text/calendar.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { generateICalFeed } from '@/lib/accommodation/channel-manager'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ unitId: string }> }
) {
  try {
    const { unitId } = await params
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('org')

    if (!organizationId) {
      return new Response('Missing org parameter', { status: 400 })
    }

    // Validate UUID format (basic check)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidPattern.test(unitId) || !uuidPattern.test(organizationId)) {
      return new Response('Invalid ID format', { status: 400 })
    }

    // Use admin client since this is a public endpoint (no user session)
    const supabase = createAdminClient()

    // Verify the unit exists and belongs to the organization
    const { data: unit } = await supabase
      .from('accommodation_units')
      .select('id, name')
      .eq('id', unitId)
      .eq('organization_id', organizationId)
      .single()

    if (!unit) {
      return new Response('Unit not found', { status: 404 })
    }

    const icalContent = await generateICalFeed(supabase, organizationId, unitId)

    return new Response(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${unitId}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('iCal feed error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
