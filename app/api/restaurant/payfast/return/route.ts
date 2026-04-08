import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  // PayFast redirects here after successful payment
  // We just need to show the success page - the payer_id is in the URL
  const url = new URL(req.url)
  const payerId = url.searchParams.get('payer_id')

  // This route is set as return_url in PayFast, which includes the full path
  // The actual success page is at /t/[token]/bill/pay/success
  // Since PayFast return_url already points to the success page, this route
  // acts as a fallback if the direct URL doesn't work
  return NextResponse.json({
    status: 'success',
    message: 'Payment processing',
    payer_id: payerId,
  })
}
