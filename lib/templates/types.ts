export interface EmailTemplate {
  subject: string
  preheader?: string
  body: string
  plainText: string
}

export interface WhatsAppTemplate {
  body: string
  buttons?: Array<{ type: 'url' | 'quick_reply'; text: string; url?: string }>
}

export interface SocialTemplate {
  caption: string
  hashtags: string[]
  platform: 'linkedin' | 'facebook' | 'instagram' | 'twitter'
}

export interface BrandStyles {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  logoUrl: string
  fontFamily: string
  companyName: string
  websiteUrl: string
}

export const BRAND: BrandStyles = {
  primaryColor: '#6B1420',
  secondaryColor: '#2D2F33',
  accentColor: '#C89030',
  logoUrl: '/logo.png',
  fontFamily: "'Inter', 'Space Grotesk', sans-serif",
  companyName: 'DraggonnB Business Automation',
  websiteUrl: 'https://draggonnb.online',
}
