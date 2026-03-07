import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('booking_id')

    // If booking_id provided, return summary for that booking
    if (bookingId) {
      // Verify booking belongs to org
      const { data: booking, error: bookingError } = await auth.supabase
        .from('accommodation_bookings')
        .select('id, total_price, deposit_amount, status, guest_id')
        .eq('id', bookingId)
        .eq('organization_id', auth.organizationId)
        .single()

      if (bookingError || !booking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }

      // Get completed payments for this booking
      const { data: payments, error: paymentsError } = await auth.supabase
        .from('accommodation_payments')
        .select('id, amount, payment_type, status, payment_date')
        .eq('booking_id', bookingId)
        .eq('organization_id', auth.organizationId)
        .order('payment_date', { ascending: true })

      if (paymentsError) {
        return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
      }

      // Get active payment links
      const { data: paymentLinks, error: linksError } = await auth.supabase
        .from('accommodation_payment_links')
        .select('id, amount, payment_type, status, payment_url, expires_at')
        .eq('booking_id', bookingId)
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false })

      if (linksError) {
        return NextResponse.json({ error: 'Failed to fetch payment links' }, { status: 500 })
      }

      const totalPaid = payments
        ?.filter((p) => p.status === 'completed')
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0
      const totalPrice = Number(booking.total_price || 0)
      const outstanding = Math.max(totalPrice - totalPaid, 0)
      const depositRequired = Number(booking.deposit_amount || 0)
      const depositPaid = payments
        ?.filter((p) => p.payment_type === 'deposit' && p.status === 'completed')
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0

      return NextResponse.json({
        booking_id: bookingId,
        total_price: totalPrice,
        total_paid: totalPaid,
        outstanding,
        deposit_required: depositRequired,
        deposit_paid: depositPaid,
        deposit_outstanding: Math.max(depositRequired - depositPaid, 0),
        is_fully_paid: outstanding <= 0,
        is_deposit_paid: depositPaid >= depositRequired,
        is_overdue: outstanding > 0 && booking.status === 'confirmed',
        payments: payments || [],
        payment_links: paymentLinks || [],
      })
    }

    // Organization-wide payment summary
    const { data: bookings, error: bookingsError } = await auth.supabase
      .from('accommodation_bookings')
      .select('id, total_price, deposit_amount, status')
      .eq('organization_id', auth.organizationId)
      .in('status', ['confirmed', 'checked_in', 'pending_deposit'])

    if (bookingsError) {
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    const { data: payments, error: paymentsError } = await auth.supabase
      .from('accommodation_payments')
      .select('amount, status')
      .eq('organization_id', auth.organizationId)
      .eq('status', 'completed')

    if (paymentsError) {
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    const { data: pendingLinks, error: linksError } = await auth.supabase
      .from('accommodation_payment_links')
      .select('id, amount')
      .eq('organization_id', auth.organizationId)
      .eq('status', 'pending')

    if (linksError) {
      return NextResponse.json({ error: 'Failed to fetch payment links' }, { status: 500 })
    }

    const totalExpected = bookings?.reduce((sum, b) => sum + Number(b.total_price || 0), 0) || 0
    const totalReceived = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
    const totalPendingLinks = pendingLinks?.reduce((sum, l) => sum + Number(l.amount), 0) || 0

    return NextResponse.json({
      summary: {
        total_expected: totalExpected,
        total_received: totalReceived,
        total_outstanding: Math.max(totalExpected - totalReceived, 0),
        total_pending_payment_links: totalPendingLinks,
        active_bookings_count: bookings?.length || 0,
        pending_deposit_count: bookings?.filter((b) => b.status === 'pending_deposit').length || 0,
      },
    })
  } catch (error) {
    console.error('Payment summary GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
