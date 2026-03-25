import type { WhatsAppTemplate } from '../types'

interface BookingData {
  guestName: string
  propertyName: string
  checkInDate: string
  checkOutDate: string
  bookingRef: string
  portalUrl: string
}

export function bookingWhatsApp(data: BookingData): WhatsAppTemplate {
  return {
    body: `Booking Confirmed!

Guest: ${data.guestName}
Property: ${data.propertyName}
Check-in: ${data.checkInDate}
Check-out: ${data.checkOutDate}
Ref: ${data.bookingRef}

Access your guest portal: ${data.portalUrl}`,
    buttons: [
      {
        type: 'url',
        text: 'Guest Portal',
        url: data.portalUrl,
      },
    ],
  }
}
