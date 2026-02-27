import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

interface TenantContext {
  organizationId: string
  subdomain: string
  tier: string
  enabledModules: string[]
}

// In-memory cache for tenant lookups (avoids DB query on every request)
const tenantCache = new Map<string, { data: TenantContext; expires: number }>()
const CACHE_TTL = 60_000 // 60 seconds

// Module-to-route mapping for access gating
const MODULE_ROUTE_MAP: Record<string, string> = {
  '/crm': 'crm',
  '/api/crm': 'crm',
  '/email': 'email',
  '/api/email': 'email',
  '/social': 'social',
  '/api/social': 'social',
  '/content-generator': 'content_studio',
  '/api/content': 'content_studio',
  '/accommodation': 'accommodation',
  '/api/accommodation': 'accommodation',
  '/autopilot': 'ai_agents',
  '/api/autopilot': 'ai_agents',
  '/analytics': 'analytics',
  '/api/analytics': 'analytics',
}

// Hostnames that are NOT subdomains (the platform itself)
const PLATFORM_HOSTS = ['www', 'draggonnb', 'draggonnb-mvp', 'localhost']

async function resolveTenant(subdomain: string): Promise<TenantContext | null> {
  const cached = tenantCache.get(subdomain)
  if (cached && cached.expires > Date.now()) return cached.data

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: org } = await adminClient
    .from('organizations')
    .select('id, subscription_tier, subdomain')
    .eq('subdomain', subdomain)
    .single()

  if (!org) return null

  const { data: modules } = await adminClient
    .from('tenant_modules')
    .select('module_id')
    .eq('organization_id', org.id)
    .eq('is_enabled', true)

  const context: TenantContext = {
    organizationId: org.id,
    subdomain: org.subdomain,
    tier: org.subscription_tier,
    enabledModules: (modules || []).map((m: { module_id: string }) => m.module_id),
  }

  tenantCache.set(subdomain, { data: context, expires: Date.now() + CACHE_TTL })
  return context
}

function isSubdomainHost(hostname: string): string | null {
  // Skip if subdomain routing is disabled
  if (process.env.ENABLE_SUBDOMAIN_ROUTING !== 'true') return null

  const subdomain = hostname.split('.')[0]
  if (!subdomain) return null
  if (PLATFORM_HOSTS.includes(subdomain)) return null
  if (hostname.startsWith('localhost')) return null

  return subdomain
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // --- Subdomain detection and tenant resolution ---
  const hostname = request.headers.get('host') || ''
  const subdomain = isSubdomainHost(hostname)

  if (subdomain) {
    const tenant = await resolveTenant(subdomain)
    if (!tenant) {
      // Unknown subdomain -> redirect to main site
      return NextResponse.redirect(new URL('https://draggonnb.co.za'))
    }

    // Inject tenant context into headers (available in API routes via getTenantContext())
    const headers = new Headers(request.headers)
    headers.set('x-tenant-id', tenant.organizationId)
    headers.set('x-tenant-subdomain', tenant.subdomain)
    headers.set('x-tenant-tier', tenant.tier)
    headers.set('x-tenant-modules', tenant.enabledModules.join(','))

    response = NextResponse.next({
      request: { headers },
    })
  }

  // --- Supabase session management (existing logic) ---
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  // --- Webhook bypass (validate their own signatures) ---
  const webhookRoutes = ['/api/webhooks/whatsapp', '/api/webhooks/telegram', '/api/webhooks/payfast']
  const isWebhookRoute = webhookRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )
  if (isWebhookRoute) {
    return response
  }

  // --- Module access gating (subdomain requests only) ---
  if (subdomain && user) {
    const tenantModules = request.headers.get('x-tenant-modules')?.split(',').filter(Boolean) || []
    const pathname = request.nextUrl.pathname

    for (const [routePrefix, moduleId] of Object.entries(MODULE_ROUTE_MAP)) {
      if (pathname.startsWith(routePrefix) && !tenantModules.includes(moduleId)) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Module not enabled', module: moduleId },
            { status: 403 }
          )
        }
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  // --- Protected routes ---
  const protectedRoutes = ['/dashboard', '/crm', '/email', '/content-generator', '/accommodation', '/social', '/autopilot', '/analytics']
  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Auth routes (login, signup) - redirect to dashboard if already authenticated
  const authRoutes = ['/login', '/signup']
  const isAuthRoute = authRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  // If user is not authenticated and trying to access protected route
  if (isProtectedRoute && (!user || error)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If user is authenticated and trying to access auth routes (login/signup)
  if (isAuthRoute && user && !error) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}
