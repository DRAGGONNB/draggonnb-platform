/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase SSR
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    },
  })),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

describe('Auth Protection Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.stubEnv('ENABLE_SUBDOMAIN_ROUTING', 'false')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key')
  })

  const protectedRoutes = [
    '/dashboard',
    '/crm',
    '/crm/contacts',
    '/crm/deals',
    '/email',
    '/email/campaigns',
    '/content-generator',
    '/content-generator/social',
    '/accommodation',
    '/accommodation/properties',
    '/social',
    '/autopilot',
    '/autopilot/settings',
    '/analytics',
  ]

  const publicRoutes = [
    '/',
    '/pricing',
    '/qualify',
    '/checkout',
    '/payment/success',
  ]

  const authRoutes = [
    '/login',
    '/signup',
  ]

  describe('protected routes redirect unauthenticated users', () => {
    for (const route of protectedRoutes) {
      it(`${route} redirects to /login`, async () => {
        const { createServerClient } = await import('@supabase/ssr')
        vi.mocked(createServerClient).mockReturnValue({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: null },
              error: new Error('Not authenticated'),
            }),
          },
        } as any)

        const { updateSession } = await import('@/lib/supabase/middleware')
        const request = createMockRequest(`https://app.test${route}`)
        const response = await updateSession(request)

        // Should redirect
        expect([307, 308]).toContain(response.status)
        const location = response.headers.get('location') || ''
        expect(location).toContain('/login')
      })
    }
  })

  describe('protected routes include redirect param', () => {
    it('/dashboard redirect includes ?redirect=/dashboard', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      vi.mocked(createServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Not authenticated'),
          }),
        },
      } as any)

      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest('https://app.test/dashboard')
      const response = await updateSession(request)

      if (response.status === 307 || response.status === 308) {
        const location = response.headers.get('location') || ''
        expect(location).toContain('redirect=')
        expect(location).toContain('dashboard')
      }
    })
  })

  describe('auth routes redirect authenticated users to dashboard', () => {
    for (const route of authRoutes) {
      it(`${route} redirects authenticated user to /dashboard`, async () => {
        const { createServerClient } = await import('@supabase/ssr')
        vi.mocked(createServerClient).mockReturnValue({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: 'user-1', email: 'test@test.co.za' } },
              error: null,
            }),
          },
        } as any)

        const { updateSession } = await import('@/lib/supabase/middleware')
        const request = createMockRequest(`https://app.test${route}`)
        const response = await updateSession(request)

        expect([307, 308]).toContain(response.status)
        const location = response.headers.get('location') || ''
        expect(location).toContain('/dashboard')
      })
    }
  })

  describe('public routes do not redirect', () => {
    for (const route of publicRoutes) {
      it(`${route} is accessible without auth`, async () => {
        const { createServerClient } = await import('@supabase/ssr')
        vi.mocked(createServerClient).mockReturnValue({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: null },
              error: null,
            }),
          },
        } as any)

        const { updateSession } = await import('@/lib/supabase/middleware')
        const request = createMockRequest(`https://app.test${route}`)
        const response = await updateSession(request)

        // Should NOT redirect to login
        if (response.status === 307 || response.status === 308) {
          const location = response.headers.get('location') || ''
          expect(location).not.toContain('/login')
        }
      })
    }
  })
})

function createMockRequest(url: string, method: string = 'GET') {
  const parsedUrl = new URL(url)
  return {
    headers: new Headers({ host: parsedUrl.host }),
    cookies: { get: vi.fn(() => undefined), set: vi.fn() },
    nextUrl: {
      pathname: parsedUrl.pathname,
      searchParams: parsedUrl.searchParams,
    },
    url,
    method,
  } as any
}
