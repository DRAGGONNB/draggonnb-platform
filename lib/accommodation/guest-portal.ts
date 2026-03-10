/**
 * Guest Portal Token Utilities
 *
 * Generates and validates HMAC-signed tokens for unauthenticated guest access.
 * Token format: {payload_base64url}.{signature_base64url}
 * Payload: { bid: bookingId, oid: orgId, exp: expiryTimestamp }
 */

import crypto from 'crypto'

const PORTAL_SECRET = process.env.GUEST_PORTAL_SECRET || 'guest-portal-default-key'
const DEFAULT_EXPIRY_DAYS = 30

interface TokenPayload {
  bid: string
  oid: string
  exp: number
}

/**
 * Base64url encode (URL-safe, no padding)
 */
function base64urlEncode(data: string): string {
  return Buffer.from(data, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Base64url decode
 */
function base64urlDecode(data: string): string {
  // Restore standard base64
  let base64 = data.replace(/-/g, '+').replace(/_/g, '/')
  // Add padding
  while (base64.length % 4 !== 0) {
    base64 += '='
  }
  return Buffer.from(base64, 'base64').toString('utf-8')
}

/**
 * Create HMAC-SHA256 signature for a payload string
 */
function sign(payload: string): string {
  const hmac = crypto.createHmac('sha256', PORTAL_SECRET)
  hmac.update(payload)
  return hmac.digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Generate a signed guest access token.
 *
 * @param bookingId - The booking UUID
 * @param orgId - The organization UUID
 * @param expiresInDays - Token validity period (default: 30 days)
 * @returns Signed token string
 */
export function generateGuestToken(
  bookingId: string,
  orgId: string,
  expiresInDays: number = DEFAULT_EXPIRY_DAYS
): string {
  const payload: TokenPayload = {
    bid: bookingId,
    oid: orgId,
    exp: Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60,
  }

  const payloadStr = JSON.stringify(payload)
  const encodedPayload = base64urlEncode(payloadStr)
  const signature = sign(encodedPayload)

  return `${encodedPayload}.${signature}`
}

/**
 * Validate a guest access token and check it matches the given bookingId.
 *
 * @param bookingId - The booking UUID from the URL path
 * @param token - The token from the query parameter
 * @returns Validation result with orgId if valid
 */
export function validateGuestToken(
  bookingId: string,
  token: string
): { valid: boolean; orgId?: string; error?: string } {
  if (!token || !token.includes('.')) {
    return { valid: false, error: 'Invalid token format' }
  }

  const parts = token.split('.')
  if (parts.length !== 2) {
    return { valid: false, error: 'Invalid token format' }
  }

  const [encodedPayload, providedSignature] = parts

  // Verify signature
  const expectedSignature = sign(encodedPayload)
  if (providedSignature !== expectedSignature) {
    return { valid: false, error: 'Invalid token signature' }
  }

  // Decode payload
  let payload: TokenPayload
  try {
    const decoded = base64urlDecode(encodedPayload)
    payload = JSON.parse(decoded)
  } catch {
    return { valid: false, error: 'Malformed token payload' }
  }

  // Check expiry
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp < now) {
    return { valid: false, error: 'Token has expired' }
  }

  // Check bookingId matches
  if (payload.bid !== bookingId) {
    return { valid: false, error: 'Token does not match this booking' }
  }

  return { valid: true, orgId: payload.oid }
}

/**
 * Build a full guest portal URL for a booking.
 *
 * @param bookingId - The booking UUID
 * @param orgId - The organization UUID
 * @param baseUrl - The base URL of the application (e.g., https://client.draggonnb.co.za)
 * @param expiresInDays - Token validity period
 * @returns Full guest portal URL
 */
export function buildGuestPortalUrl(
  bookingId: string,
  orgId: string,
  baseUrl: string,
  expiresInDays: number = DEFAULT_EXPIRY_DAYS
): string {
  const token = generateGuestToken(bookingId, orgId, expiresInDays)
  const cleanBase = baseUrl.replace(/\/$/, '')
  return `${cleanBase}/guest/${bookingId}?token=${token}`
}
