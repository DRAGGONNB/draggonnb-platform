import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { processMessageQueue } from '@/lib/accommodation/events/sender'

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const result = await processMessageQueue(auth.supabase, auth.organizationId, limit)

    return NextResponse.json({
      success: true,
      processed: result.processed,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
    })
  } catch (error) {
    console.error('Process queue POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
