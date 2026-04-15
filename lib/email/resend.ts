/**
 * Resend Email Provider Integration
 * Handles all email sending via Resend API
 */

import { Resend } from 'resend'
import type {
  SendEmailRequest,
  SendEmailResponse,
  EmailProviderConfig,
  TemplateVariables,
} from './types'
import { DEFAULT_VARIABLES } from './types'
import {
  generateUnsubscribeToken,
  isEmailTrackingSecretConfigured,
} from '@/lib/security/email-tokens'

// ============================================================================
// CONFIGURATION
// ============================================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY
const DEFAULT_FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@draggonnb.online'
const DEFAULT_FROM_NAME = process.env.EMAIL_FROM_NAME || 'DraggonnB'
const REPLY_TO_EMAIL = process.env.EMAIL_REPLY_TO || 'info@draggonnb.online'

// Base URL for tracking pixels and links
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// ============================================================================
// RESEND CLIENT
// ============================================================================

let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }
    resendClient = new Resend(RESEND_API_KEY)
  }
  return resendClient
}

// ============================================================================
// SEND EMAIL
// ============================================================================

/**
 * Send a single email via Resend
 */
export async function sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
  try {
    const resend = getResendClient()

    const { data, error } = await resend.emails.send({
      from: request.fromName
        ? `${request.fromName} <${request.from || DEFAULT_FROM_EMAIL}>`
        : request.from || DEFAULT_FROM_EMAIL,
      to: Array.isArray(request.to) ? request.to : [request.to],
      subject: request.subject,
      html: request.html,
      text: request.text,
      reply_to: request.replyTo || REPLY_TO_EMAIL,
      tags: request.tags?.map(tag => ({ name: tag, value: 'true' })),
    })

    if (error) {
      console.error('Resend send error:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      messageId: data?.id,
    }
  } catch (error) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending email',
    }
  }
}

/**
 * Send a batch of emails via Resend
 * More efficient for campaigns
 */
export async function sendBatchEmails(
  requests: SendEmailRequest[]
): Promise<SendEmailResponse[]> {
  // Check if Resend is configured
  if (!RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured. Logging emails instead of sending.')
    console.log(`[Email] Would send ${requests.length} emails:`)
    requests.forEach((req, i) => {
      console.log(`  [${i + 1}] To: ${Array.isArray(req.to) ? req.to.join(', ') : req.to}`)
      console.log(`       Subject: ${req.subject}`)
    })
    // Return success for all (simulated send)
    return requests.map((_, index) => ({
      success: true,
      messageId: `dev-${Date.now()}-${index}`,
    }))
  }

  const resend = getResendClient()

  const batchPayload = requests.map(request => ({
    from: request.fromName
      ? `${request.fromName} <${request.from || DEFAULT_FROM_EMAIL}>`
      : request.from || DEFAULT_FROM_EMAIL,
    to: Array.isArray(request.to) ? request.to : [request.to],
    subject: request.subject,
    html: request.html,
    text: request.text,
    reply_to: request.replyTo || REPLY_TO_EMAIL,
  }))

  try {
    const response = await resend.batch.send(batchPayload)

    if (response.error) {
      console.error('Resend batch error:', response.error)
      return requests.map(() => ({
        success: false,
        error: response.error?.message || 'Batch send failed',
      }))
    }

    // Type assertion for batch response data (Resend returns array of {id: string})
    const results = (response.data as unknown as Array<{ id: string }>) || []
    return results.map((result) => ({
      success: true,
      messageId: result.id,
    }))
  } catch (error) {
    console.error('Batch email error:', error)
    return requests.map(() => ({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }))
  }
}

// ============================================================================
// TEMPLATE RENDERING
// ============================================================================

/**
 * Replace template variables with actual values
 * Supports {{variable_name}} syntax
 */
export function renderTemplate(
  template: string,
  variables: TemplateVariables
): string {
  // Merge with default variables
  const allVariables = {
    ...DEFAULT_VARIABLES,
    ...variables,
  }

  // Replace all {{variable}} patterns
  return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    const value = allVariables[varName]
    return value !== undefined ? value : match
  })
}

/**
 * Extract variable names from a template
 */
export function extractTemplateVariables(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g) || []
  const variables = matches.map(match => match.replace(/\{\{|\}\}/g, ''))
  return [...new Set(variables)] // Remove duplicates
}

// ============================================================================
// TRACKING
// ============================================================================

/**
 * Add tracking pixel to HTML email
 */
export function addTrackingPixel(
  html: string,
  emailSendId: string
): string {
  const trackingPixel = `<img src="${APP_URL}/api/email/track/open?id=${emailSendId}" width="1" height="1" style="display:none" alt="" />`

  // Add before closing body tag, or at end
  if (html.includes('</body>')) {
    return html.replace('</body>', `${trackingPixel}</body>`)
  }
  return html + trackingPixel
}

/**
 * Wrap links for click tracking
 */
export function wrapLinksForTracking(
  html: string,
  emailSendId: string
): string {
  // Match href="..." in anchor tags
  const linkRegex = /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi

  return html.replace(linkRegex, (match, before, url, after) => {
    // Skip tracking for unsubscribe and special links
    if (url.includes('unsubscribe') || url.includes('mailto:') || url.startsWith('#')) {
      return match
    }

    // Encode the original URL and create tracking URL
    const encodedUrl = encodeURIComponent(url)
    const trackingUrl = `${APP_URL}/api/email/track/click?id=${emailSendId}&url=${encodedUrl}`

    return `<a ${before}href="${trackingUrl}"${after}>`
  })
}

/**
 * Add all tracking to an email
 */
export function addEmailTracking(
  html: string,
  emailSendId: string
): string {
  let trackedHtml = html

  // Add open tracking pixel
  trackedHtml = addTrackingPixel(trackedHtml, emailSendId)

  // Add click tracking
  trackedHtml = wrapLinksForTracking(trackedHtml, emailSendId)

  return trackedHtml
}

// ============================================================================
// UNSUBSCRIBE
// ============================================================================

/**
 * Generate unsubscribe URL for an organization
 *
 * Uses HMAC-signed tokens when EMAIL_TRACKING_SECRET is configured.
 * Falls back to plain base64 (with warning) if secret is not set.
 */
export function generateUnsubscribeUrl(
  organizationId: string,
  email: string,
  type: 'all' | 'marketing' | 'sequence' = 'all'
): string {
  // Use HMAC-signed token if secret is configured
  if (isEmailTrackingSecretConfigured()) {
    try {
      // Include type in the emailSendId parameter for context
      const contextId = `${organizationId}:${type}`
      const token = generateUnsubscribeToken(contextId, email)
      return `${APP_URL}/unsubscribe?token=${token}`
    } catch (error) {
      console.error('Failed to generate HMAC token:', error)
      // Fall through to fallback
    }
  }

  // Fallback: plain base64 (less secure, log warning)
  console.warn(
    '[Email Security] EMAIL_TRACKING_SECRET not configured. Using insecure plain base64 tokens. ' +
    'Set EMAIL_TRACKING_SECRET env var for HMAC-signed tokens.'
  )
  const token = Buffer.from(JSON.stringify({
    org: organizationId,
    email,
    type,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  })).toString('base64')

  return `${APP_URL}/unsubscribe?token=${token}`
}

/**
 * Generate email preferences URL
 *
 * Uses HMAC-signed tokens when EMAIL_TRACKING_SECRET is configured.
 * Falls back to plain base64 (with warning) if secret is not set.
 */
export function generatePreferencesUrl(
  organizationId: string,
  email: string
): string {
  // Use HMAC-signed token if secret is configured
  if (isEmailTrackingSecretConfigured()) {
    try {
      // Use 'preferences' as type context
      const contextId = `${organizationId}:preferences`
      const token = generateUnsubscribeToken(contextId, email)
      return `${APP_URL}/email-preferences?token=${token}`
    } catch (error) {
      console.error('Failed to generate HMAC token:', error)
      // Fall through to fallback
    }
  }

  // Fallback: plain base64 (less secure, log warning)
  console.warn(
    '[Email Security] EMAIL_TRACKING_SECRET not configured. Using insecure plain base64 tokens. ' +
    'Set EMAIL_TRACKING_SECRET env var for HMAC-signed tokens.'
  )
  const token = Buffer.from(JSON.stringify({
    org: organizationId,
    email,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  })).toString('base64')

  return `${APP_URL}/email-preferences?token=${token}`
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate an email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate plain text version from HTML
 */
export function htmlToPlainText(html: string): string {
  return html
    // Remove style and script tags with content
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    // Replace line breaks and paragraphs
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    // Replace links with text and URL
    .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi, '$2 ($1)')
    // Remove remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    // Clean up whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Get provider configuration
 */
export function getProviderConfig(): EmailProviderConfig {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  return {
    apiKey: RESEND_API_KEY,
    defaultFrom: DEFAULT_FROM_EMAIL,
    defaultFromName: DEFAULT_FROM_NAME,
    replyTo: REPLY_TO_EMAIL,
  }
}

/**
 * Check if email provider is configured
 */
export function isProviderConfigured(): boolean {
  return !!RESEND_API_KEY
}
