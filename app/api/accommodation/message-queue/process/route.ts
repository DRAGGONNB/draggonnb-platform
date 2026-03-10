import { NextResponse, type NextRequest } from 'next/server'
import { getDualAuth, isDualAuthError } from '@/lib/accommodation/api-helpers'
import { processMessageQueue } from '@/lib/accommodation/events/sender'

/**
 * POST /api/accommodation/message-queue/process
 * Triggers the message queue processor to send pending messages.
 * Supports dual auth: user session (UI trigger) or service key (N8N cron).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getDualAuth(request)
    if (isDualAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const result = await processMessageQueue(
      auth.supabase,
      auth.organizationId,
      limit
    )

    return NextResponse.json({
      processed: result.processed,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
    })
  } catch (error) {
    console.error('[API] message-queue/process error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
