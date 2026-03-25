import { NextResponse } from 'next/server'

/**
 * Security Operations module stub API
 * This module is registered but not yet implemented.
 * Routes will be built when the first security client is onboarded.
 */
export async function GET() {
  return NextResponse.json({
    module: 'security_ops',
    status: 'coming_soon',
    message: 'Security Operations module is registered but not yet available. Contact support for early access.',
    planned_features: [
      'Guard scheduling',
      'Patrol tracking',
      'Incident reporting',
      'Access control logs',
      'Security zone management',
    ],
  })
}
