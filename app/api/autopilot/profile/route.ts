export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { getClientProfile, upsertClientProfile } from '@/lib/autopilot/client-profile'
import type { ClientProfileUpdate } from '@/lib/autopilot/client-profile'

export async function GET() {
  const { data: userOrg, error } = await getUserOrg()
  if (!userOrg) {
    return NextResponse.json({ error: error || 'Not authenticated' }, { status: 401 })
  }

  const profile = await getClientProfile(userOrg.organizationId)

  return NextResponse.json({ profile })
}

export async function PUT(request: NextRequest) {
  const { data: userOrg, error } = await getUserOrg()
  if (!userOrg) {
    return NextResponse.json({ error: error || 'Not authenticated' }, { status: 401 })
  }

  let body: ClientProfileUpdate & { business_name?: string; industry?: string; target_market?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.business_name || !body.industry || !body.target_market) {
    return NextResponse.json(
      { error: 'business_name, industry, and target_market are required' },
      { status: 400 }
    )
  }

  try {
    const profile = await upsertClientProfile(
      userOrg.organizationId,
      body as ClientProfileUpdate & { business_name: string; industry: string; target_market: string }
    )
    return NextResponse.json({ profile })
  } catch (err) {
    console.error('Failed to upsert profile:', err)
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
  }
}
