import { headers } from 'next/headers'

export interface TenantContext {
  organizationId: string
  subdomain: string
  tier: string
  enabledModules: string[]
}

/**
 * Get tenant context from middleware-injected headers.
 * Only available for subdomain requests (e.g., swa-zulu.draggonnb.co.za).
 * Returns null for platform requests (draggonnb-mvp.vercel.app).
 *
 * Headers are set by lib/supabase/middleware.ts during subdomain resolution.
 */
export async function getTenantContext(): Promise<TenantContext | null> {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) return null

  return {
    organizationId: tenantId,
    subdomain: headersList.get('x-tenant-subdomain') || '',
    tier: headersList.get('x-tenant-tier') || 'core',
    enabledModules: (headersList.get('x-tenant-modules') || '').split(',').filter(Boolean),
  }
}
