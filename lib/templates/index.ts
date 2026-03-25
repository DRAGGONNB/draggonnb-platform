// Types and brand constants
export { BRAND } from './types'
export type {
  EmailTemplate,
  WhatsAppTemplate,
  SocialTemplate,
  BrandStyles,
} from './types'

// Email layout
export { wrapInLayout } from './email/layout'

// Email templates
export { welcomeEmail } from './email/welcome'
export { leadQualifiedEmail } from './email/lead-qualified'
export { proposalEmail } from './email/proposal'
export { invoiceEmail } from './email/invoice'

// WhatsApp templates
export { welcomeWhatsApp } from './whatsapp/welcome'
export { bookingWhatsApp } from './whatsapp/booking'

// Social templates
export {
  announcementLinkedIn,
  announcementFacebook,
  announcementInstagram,
  announcementTwitter,
} from './social/announcement'
