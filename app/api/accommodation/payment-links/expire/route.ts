import { NextResponse, type NextRequest } from 'next/server'
import { getDualAuth, isDualAuthError } from '@/lib/accommodation/api-helpers'
import { expirePaymentLinks } from '@/lib/accommodation/payments/payfast-link'

/**
 * POST /api/accommodation/payment-links/expire
 * Expires payment links that have passed their expiration time.
 * Supports dual auth: user session (UI trigger) or service key (N8N cron).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getDualAuth(request)
    if (isDualAuthError(auth)) return auth

    const expired = await expirePaymentLinks(auth.supabase, auth.organizationId)

    return NextResponse.json({ expired })
  } catch (error) {
    console.error('[API] payment-links/expire error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
