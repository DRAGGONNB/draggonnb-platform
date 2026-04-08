import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest) {
  // PayFast redirects here after cancelled payment
  // The cancel_url in PayFast initiate already points to /t/[token]/bill/pay/cancelled
  // This is a fallback
  return NextResponse.json({
    status: 'cancelled',
    message: 'Payment was cancelled',
  })
}
