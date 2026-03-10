/**
 * GET /api/guest-portal/[bookingId]?token=xxx
 *
 * Fetch booking details for the guest portal.
 * No authentication required -- validates HMAC token instead.
 * Uses admin client to bypass RLS (guest has no Supabase session).
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateGuestToken } from '@/lib/accommodation/guest-portal'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params

  // Extract token from query string
  const url = new URL(request.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Access token required' }, { status: 401 })
  }

  // Validate token
  const validation = validateGuestToken(bookingId, token)
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error || 'Invalid access token' },
      { status: 403 }
    )
  }

  const orgId = validation.orgId!
  const supabase = createAdminClient()

  // Fetch booking with related data
  const { data: booking, error: bookingError } = await supabase
    .from('accommodation_bookings')
    .select(`
      id,
      check_in_date,
      check_out_date,
      status,
      total_guests,
      total_amount,
      currency,
      special_requests,
      created_at,
      guest_id,
      unit_id,
      accommodation_guests (
        id,
        first_name,
        last_name,
        email,
        phone
      ),
      accommodation_units (
        id,
        name,
        unit_type,
        max_guests,
        description,
        amenities,
        property_id,
        accommodation_properties (
          id,
          name,
          address,
          city,
          province,
          country,
          latitude,
          longitude,
          metadata,
          phone,
          email
        )
      )
    `)
    .eq('id', bookingId)
    .eq('organization_id', orgId)
    .single()

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // Cast joined data (Supabase returns arrays for joins)
  const guest = booking.accommodation_guests as unknown as {
    id: string
    first_name: string
    last_name: string
    email: string
    phone: string | null
  } | null

  const unit = booking.accommodation_units as unknown as {
    id: string
    name: string
    unit_type: string
    max_guests: number
    description: string | null
    amenities: string[] | null
    property_id: string
    accommodation_properties: {
      id: string
      name: string
      address: string | null
      city: string | null
      province: string | null
      country: string | null
      latitude: number | null
      longitude: number | null
      metadata: Record<string, unknown> | null
      phone: string | null
      email: string | null
    } | null
  } | null

  const property = unit?.accommodation_properties || null

  // Extract access pack info from property metadata
  const metadata = (property?.metadata || {}) as Record<string, unknown>
  const accessPack = {
    wifi: {
      networkName: (metadata.wifi_network_name as string) || null,
      password: (metadata.wifi_password as string) || null,
    },
    checkInTime: (metadata.check_in_time as string) || '14:00',
    checkOutTime: (metadata.check_out_time as string) || '10:00',
    houseRules: (metadata.house_rules as string[]) || [],
    directions: (metadata.directions as string) || null,
    emergencyContacts: (metadata.emergency_contacts as Array<{
      name: string
      phone: string
      role: string
    }>) || [],
    parkingInfo: (metadata.parking_info as string) || null,
  }

  // Calculate nights
  const checkIn = new Date(booking.check_in_date)
  const checkOut = new Date(booking.check_out_date)
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))

  // Build Google Maps link
  let mapsUrl: string | null = null
  if (property?.latitude && property?.longitude) {
    mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`
  } else if (property?.address) {
    const addr = [property.address, property.city, property.province, property.country]
      .filter(Boolean)
      .join(', ')
    mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`
  }

  // Build WhatsApp contact link
  let whatsappUrl: string | null = null
  if (property?.phone) {
    const cleanPhone = property.phone.replace(/[^0-9+]/g, '')
    whatsappUrl = `https://wa.me/${cleanPhone.replace('+', '')}`
  }

  return NextResponse.json({
    booking: {
      id: booking.id,
      checkInDate: booking.check_in_date,
      checkOutDate: booking.check_out_date,
      nights,
      status: booking.status,
      totalGuests: booking.total_guests,
      totalAmount: booking.total_amount,
      currency: booking.currency || 'ZAR',
      specialRequests: booking.special_requests,
    },
    guest: guest ? {
      firstName: guest.first_name,
      lastName: guest.last_name,
    } : null,
    unit: unit ? {
      name: unit.name,
      type: unit.unit_type,
      maxGuests: unit.max_guests,
      description: unit.description,
      amenities: unit.amenities || [],
    } : null,
    property: property ? {
      name: property.name,
      address: [property.address, property.city, property.province].filter(Boolean).join(', '),
      phone: property.phone,
      email: property.email,
      mapsUrl,
      whatsappUrl,
    } : null,
    accessPack,
  })
}
