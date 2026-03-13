import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/auth/get-user-org'

/**
 * SHA-256 hash using Web Crypto API (Edge-compatible).
 */
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate a cryptographically random API key.
 */
function generateApiKey(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const key = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `dgb_${key}`
}

const createKeySchema = z.object({
  name: z.string().min(1).max(255),
  scopes: z.array(z.string()).default([]),
  expires_at: z.string().datetime().optional(),
})

// GET - List API keys for the org (masked, never returns plaintext)
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = await getOrgId(supabase, user.id)
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('id, name, scopes, last_used_at, expires_at, created_at, revoked_at, key_hash')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching API keys:', error)
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
    }

    // Mask key_hash to show only prefix for identification
    const masked = (keys || []).map(({ key_hash, ...rest }) => ({
      ...rest,
      key_prefix: key_hash ? key_hash.substring(0, 8) + '...' : null,
    }))

    return NextResponse.json({ keys: masked })
  } catch (error) {
    console.error('API Keys GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Generate a new API key (returns plaintext ONCE)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = await getOrgId(supabase, user.id)
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = createKeySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { name, scopes, expires_at } = parsed.data

    // Generate plaintext key and hash it
    const plaintextKey = generateApiKey()
    const keyHash = await sha256(plaintextKey)

    const { data: key, error } = await supabase
      .from('api_keys')
      .insert({
        organization_id: organizationId,
        key_hash: keyHash,
        name,
        scopes,
        expires_at: expires_at || null,
      })
      .select('id, name, scopes, expires_at, created_at')
      .single()

    if (error) {
      console.error('Error creating API key:', error)
      return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
    }

    // Return the plaintext key ONCE -- it cannot be retrieved again
    return NextResponse.json({
      key: {
        ...key,
        plaintext_key: plaintextKey,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('API Keys POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
