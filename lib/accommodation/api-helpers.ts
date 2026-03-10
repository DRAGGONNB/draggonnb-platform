import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkFeatureAccess } from '@/lib/tier/feature-gate'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface AuthContext {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  organizationId: string
}

export interface ServiceAuthContext {
  supabase: SupabaseClient
  organizationId: string
  isServiceAuth: boolean
}

/**
 * Authenticate + feature-gate for accommodation API routes.
 * Returns AuthContext on success, or a NextResponse error.
 */
export async function getAccommodationAuth(): Promise<AuthContext | NextResponse> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData?.organization_id) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_tier')
    .eq('id', userData.organization_id)
    .single()

  const access = checkFeatureAccess(org?.subscription_tier || 'core', 'accommodation_module')
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason, upgradeRequired: access.upgradeRequired }, { status: 403 })
  }

  return {
    supabase,
    userId: user.id,
    organizationId: userData.organization_id,
  }
}

/**
 * Type guard to check if auth result is an error response.
 */
export function isAuthError(result: AuthContext | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}

/**
 * Dual auth for accommodation API routes that support both:
 * - Standard user auth (from UI)
 * - Service key auth (from N8N cron / external triggers)
 *
 * Service key auth: Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}
 * Requires x-tenant-id header for organization context.
 */
export async function getDualAuth(
  request: NextRequest
): Promise<ServiceAuthContext | NextResponse> {
  const authHeader = request.headers.get('authorization')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Check for service key auth (N8N / cron)
  if (authHeader && serviceKey && authHeader === `Bearer ${serviceKey}`) {
    const orgId = request.headers.get('x-tenant-id')
    if (!orgId) {
      return NextResponse.json(
        { error: 'Missing x-tenant-id header for service auth' },
        { status: 400 }
      )
    }
    return {
      supabase: createAdminClient(),
      organizationId: orgId,
      isServiceAuth: true,
    }
  }

  // Fall back to standard user auth
  const auth = await getAccommodationAuth()
  if (isAuthError(auth)) return auth

  return {
    supabase: auth.supabase as unknown as SupabaseClient,
    organizationId: auth.organizationId,
    isServiceAuth: false,
  }
}

/**
 * Type guard for dual auth results.
 */
export function isDualAuthError(result: ServiceAuthContext | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}
