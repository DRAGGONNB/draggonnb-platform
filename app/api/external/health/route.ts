import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/external/health
 *
 * Health check endpoint for M2M API key authentication.
 * Returns the authenticated organization ID (set by middleware).
 */
export async function GET(request: NextRequest) {
  const organizationId = request.headers.get('x-organization-id')

  return NextResponse.json({
    status: 'ok',
    organization_id: organizationId,
  })
}
