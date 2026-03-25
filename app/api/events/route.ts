import { NextResponse } from 'next/server'

/**
 * Events module stub API
 * This module is registered but not yet implemented.
 * Routes will be built when the first events client is onboarded.
 */
export async function GET() {
  return NextResponse.json({
    module: 'events',
    status: 'coming_soon',
    message: 'Events & Functions module is registered but not yet available. Contact support for early access.',
    planned_features: [
      'Event booking management',
      'Venue management',
      'Ticketing system',
      'Catering packages',
      'Attendee tracking',
    ],
  })
}
