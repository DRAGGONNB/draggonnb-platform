/**
 * M2M API Key Authentication
 *
 * Provides API key verification for external service-to-service calls
 * (e.g., FIGARIE vertical client -> DraggonnB platform).
 *
 * Uses Web Crypto API (SubtleCrypto) for SHA-256 hashing so it works
 * in both Edge Runtime (middleware) and Node.js (API routes).
 */

import { createClient } from '@supabase/supabase-js'

interface ApiKeyResult {
  organization_id: string
  scopes: string[]
}

/**
 * SHA-256 hash a string using Web Crypto API (Edge-compatible).
 */
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Verify an API key against the api_keys table.
 *
 * @param apiKey - The raw API key (Bearer token) from the request
 * @returns The organization_id and scopes if valid, null otherwise
 */
export async function verifyApiKey(
  apiKey: string
): Promise<ApiKeyResult | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  const keyHash = await sha256(apiKey)

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await supabase
    .from('api_keys')
    .select('organization_id, scopes, expires_at, revoked_at')
    .eq('key_hash', keyHash)
    .single()

  if (error || !data) {
    return null
  }

  // Check if key is revoked
  if (data.revoked_at) {
    return null
  }

  // Check if key is expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null
  }

  // Update last_used_at (fire-and-forget, don't block the response)
  supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_hash', keyHash)
    .then(() => {})

  return {
    organization_id: data.organization_id,
    scopes: data.scopes || [],
  }
}
