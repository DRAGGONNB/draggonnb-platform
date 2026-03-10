import { createAdminClient } from '@/lib/supabase/admin'
import { validateGuestToken } from '@/lib/accommodation/guest-portal'
import AccessPack from './AccessPack'

interface GuestPortalProps {
  params: Promise<{ bookingId: string }>
  searchParams: Promise<{ token?: string }>
}

interface BookingData {
  id: string
  checkInDate: string
  checkOutDate: string
  nights: number
  status: string
  totalGuests: number
  totalAmount: number | null
  currency: string
  specialRequests: string | null
}

interface GuestData {
  firstName: string
  lastName: string
}

interface UnitData {
  name: string
  type: string
  maxGuests: number
  description: string | null
  amenities: string[]
}

interface PropertyData {
  name: string
  address: string
  phone: string | null
  email: string | null
  mapsUrl: string | null
  whatsappUrl: string | null
}

interface AccessPackData {
  wifi: { networkName: string | null; password: string | null }
  checkInTime: string
  checkOutTime: string
  houseRules: string[]
  directions: string | null
  emergencyContacts: Array<{ name: string; phone: string; role: string }>
  parkingInfo: string | null
}

interface PortalData {
  booking: BookingData
  guest: GuestData | null
  unit: UnitData | null
  property: PropertyData | null
  accessPack: AccessPackData
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getStatusDisplay(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    confirmed: { label: 'Confirmed', color: 'bg-teal-100 text-teal-800' },
    checked_in: { label: 'Checked In', color: 'bg-blue-100 text-blue-800' },
    checked_out: { label: 'Checked Out', color: 'bg-gray-100 text-gray-800' },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
    pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800' },
    quoted: { label: 'Quoted', color: 'bg-purple-100 text-purple-800' },
  }
  return map[status] || { label: status, color: 'bg-gray-100 text-gray-700' }
}

async function fetchBookingData(
  bookingId: string,
  orgId: string
): Promise<PortalData | null> {
  const supabase = createAdminClient()

  const { data: booking, error } = await supabase
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

  if (error || !booking) return null

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
  const metadata = (property?.metadata || {}) as Record<string, unknown>

  const checkIn = new Date(booking.check_in_date)
  const checkOut = new Date(booking.check_out_date)
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))

  let mapsUrl: string | null = null
  if (property?.latitude && property?.longitude) {
    mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`
  } else if (property?.address) {
    const addr = [property.address, property.city, property.province, property.country]
      .filter(Boolean)
      .join(', ')
    mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`
  }

  let whatsappUrl: string | null = null
  if (property?.phone) {
    const cleanPhone = property.phone.replace(/[^0-9+]/g, '')
    whatsappUrl = `https://wa.me/${cleanPhone.replace('+', '')}`
  }

  return {
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
    guest: guest
      ? { firstName: guest.first_name, lastName: guest.last_name }
      : null,
    unit: unit
      ? {
          name: unit.name,
          type: unit.unit_type,
          maxGuests: unit.max_guests,
          description: unit.description,
          amenities: unit.amenities || [],
        }
      : null,
    property: property
      ? {
          name: property.name,
          address: [property.address, property.city, property.province]
            .filter(Boolean)
            .join(', '),
          phone: property.phone,
          email: property.email,
          mapsUrl,
          whatsappUrl,
        }
      : null,
    accessPack: {
      wifi: {
        networkName: (metadata.wifi_network_name as string) || null,
        password: (metadata.wifi_password as string) || null,
      },
      checkInTime: (metadata.check_in_time as string) || '14:00',
      checkOutTime: (metadata.check_out_time as string) || '10:00',
      houseRules: (metadata.house_rules as string[]) || [],
      directions: (metadata.directions as string) || null,
      emergencyContacts:
        (metadata.emergency_contacts as Array<{
          name: string
          phone: string
          role: string
        }>) || [],
      parkingInfo: (metadata.parking_info as string) || null,
    },
  }
}

export default async function GuestPortalPage({
  params,
  searchParams,
}: GuestPortalProps) {
  const { bookingId } = await params
  const { token } = await searchParams

  // -- Token validation --
  if (!token) {
    return (
      <ErrorScreen
        title="Access Required"
        message="Please use the link provided in your booking confirmation email or message to access your booking details."
      />
    )
  }

  const validation = validateGuestToken(bookingId, token)
  if (!validation.valid) {
    const isExpired = validation.error === 'Token has expired'
    return (
      <ErrorScreen
        title={isExpired ? 'Link Expired' : 'Invalid Link'}
        message={
          isExpired
            ? 'This access link has expired. Please contact your host to receive a new one.'
            : 'This access link is invalid. Please use the link provided in your booking confirmation.'
        }
      />
    )
  }

  // -- Fetch booking data --
  const data = await fetchBookingData(bookingId, validation.orgId!)

  if (!data) {
    return (
      <ErrorScreen
        title="Booking Not Found"
        message="We could not find this booking. Please contact your host for assistance."
      />
    )
  }

  const { booking, guest, unit, property, accessPack } = data
  const statusDisplay = getStatusDisplay(booking.status)

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {property?.name || 'Your Booking'}
            </h1>
            {property?.address && (
              <p className="text-sm text-gray-500">{property.address}</p>
            )}
          </div>
        </div>
      </header>

      {/* Greeting */}
      {guest && (
        <div className="mb-6">
          <h2 className="text-lg text-gray-700">
            Welcome, {guest.firstName}!
          </h2>
        </div>
      )}

      {/* Booking Summary Card */}
      <div className="bg-gray-50 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Booking Details
          </h3>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${statusDisplay.color}`}
          >
            {statusDisplay.label}
          </span>
        </div>

        {/* Check-in / Check-out */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              Check-in
            </p>
            <p className="text-lg font-bold text-gray-900">
              {formatDate(booking.checkInDate)}
            </p>
            <p className="text-sm text-teal-600 font-medium">
              {accessPack.checkInTime}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              Check-out
            </p>
            <p className="text-lg font-bold text-gray-900">
              {formatDate(booking.checkOutDate)}
            </p>
            <p className="text-sm text-teal-600 font-medium">
              {accessPack.checkOutTime}
            </p>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="flex gap-4 pt-3 border-t border-gray-200">
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-gray-900">{booking.nights}</p>
            <p className="text-xs text-gray-500">
              {booking.nights === 1 ? 'Night' : 'Nights'}
            </p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {booking.totalGuests}
            </p>
            <p className="text-xs text-gray-500">
              {booking.totalGuests === 1 ? 'Guest' : 'Guests'}
            </p>
          </div>
          {unit && (
            <div className="flex-1 text-center">
              <p className="text-sm font-bold text-gray-900 truncate">
                {unit.name}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {unit.type.replace(/_/g, ' ')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Unit description */}
      {unit?.description && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            About Your Accommodation
          </h3>
          <p className="text-gray-700 text-sm leading-relaxed">
            {unit.description}
          </p>
        </div>
      )}

      {/* Amenities */}
      {unit?.amenities && unit.amenities.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Amenities
          </h3>
          <div className="flex flex-wrap gap-2">
            {unit.amenities.map((amenity, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium"
              >
                {amenity}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Access Pack (Client Component) */}
      <AccessPack
        accessPack={accessPack}
        property={property}
      />

      {/* Special Requests */}
      {booking.specialRequests && (
        <div className="mt-6 bg-amber-50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">
            Your Special Requests
          </h3>
          <p className="text-sm text-amber-700">{booking.specialRequests}</p>
        </div>
      )}

      {/* Contact Host */}
      <div className="mt-8 mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Contact Host
        </h3>
        <div className="flex gap-3">
          {property?.whatsappUrl && (
            <a
              href={property.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-3 text-sm font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </a>
          )}
          {property?.phone && (
            <a
              href={`tel:${property.phone}`}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-4 py-3 text-sm font-medium transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              Call
            </a>
          )}
          {property?.email && (
            <a
              href={`mailto:${property.email}`}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-4 py-3 text-sm font-medium transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Email
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function ErrorScreen({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  )
}
