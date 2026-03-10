/**
 * POST /api/guest-portal/access
 *
 * Generate a guest access token for a booking.
 * Requires authenticated user (host/admin generating the link).
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { generateGuestToken, buildGuestPortalUrl } from '@/lib/accommodation/guest-portal'

const schema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  expiresInDays: z.number().min(1).max(365).optional().default(30),
})

export async function POST(request: Request) {
  const auth = await getAccommodationAuth()
  if (isAuthError(auth)) return auth

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { bookingId, expiresInDays } = parsed.data

  // Verify booking exists and belongs to this organization
  const { data: booking, error: bookingError } = await auth.supabase
    .from('accommodation_bookings')
    .select('id, guest_id')
    .eq('id', bookingId)
    .eq('organization_id', auth.organizationId)
    .single()

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // Generate token and URL
  const token = generateGuestToken(bookingId, auth.organizationId, expiresInDays)

  // Determine base URL from request headers
  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`

  const accessUrl = buildGuestPortalUrl(bookingId, auth.organizationId, baseUrl, expiresInDays)

  return NextResponse.json({
    token,
    accessUrl,
    portalPath: `/guest/${bookingId}?token=${token}`,
    expiresInDays,
  })
}
