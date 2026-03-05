import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getFacebookAuthUrl } from '@/lib/social/facebook'
import { getUserOrg } from '@/lib/auth/get-user-org'

// This route uses cookies() and env vars — must be dynamic
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Verify user is authenticated
    const { data: userOrg, error } = await getUserOrg()
    if (error || !userOrg) {
      return NextResponse.redirect(new URL('/login', appUrl))
    }

    // Generate state for CSRF protection
    const state = crypto.randomUUID()

    // Store state in cookie for verification in callback
    const cookieStore = await cookies()
    cookieStore.set('fb_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    // Redirect to Facebook OAuth
    const authUrl = getFacebookAuthUrl(state)
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Facebook OAuth init error:', error)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.redirect(
      new URL('/settings/social?error=oauth_init_failed', appUrl)
    )
  }
}
