import { NextResponse } from 'next/server'

/**
 * Restaurant module stub API
 * This module is registered but not yet implemented.
 * Routes will be built when the first restaurant client is onboarded.
 */
export async function GET() {
  return NextResponse.json({
    module: 'restaurant',
    status: 'coming_soon',
    message: 'Restaurant Management module is registered but not yet available. Contact support for early access.',
    planned_features: [
      'Menu management',
      'Table reservations',
      'Order tracking',
      'Kitchen display system',
      'Inventory management',
    ],
  })
}
