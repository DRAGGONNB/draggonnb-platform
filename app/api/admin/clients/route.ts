import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgId } from '@/lib/auth/get-user-org'

/**
 * GET /api/admin/clients
 * List all organizations with user counts and module counts.
 * Admin-only endpoint (requires owner/admin role).
 */
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

    // Verify admin role
    const admin = createAdminClient()
    const { data: membership } = await admin
      .from('organization_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all organizations
    const { data: orgs, error: orgsError } = await admin
      .from('organizations')
      .select('id, name, subdomain, subscription_tier, subscription_status, created_at')
      .order('created_at', { ascending: false })

    if (orgsError) {
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
    }

    // Get user counts per org
    const { data: userCounts } = await admin
      .from('organization_users')
      .select('organization_id')
      .eq('is_active', true)

    const userCountMap: Record<string, number> = {}
    for (const row of userCounts || []) {
      userCountMap[row.organization_id] = (userCountMap[row.organization_id] || 0) + 1
    }

    // Get module counts per org
    const { data: moduleCounts } = await admin
      .from('tenant_modules')
      .select('organization_id')
      .eq('is_enabled', true)

    const moduleCountMap: Record<string, number> = {}
    for (const row of moduleCounts || []) {
      moduleCountMap[row.organization_id] = (moduleCountMap[row.organization_id] || 0) + 1
    }

    // Combine data
    const clients = (orgs || []).map((org) => ({
      id: org.id,
      name: org.name,
      subdomain: org.subdomain || null,
      tier: org.subscription_tier,
      status: org.subscription_status,
      users: userCountMap[org.id] || 0,
      modules: moduleCountMap[org.id] || 0,
      created_at: org.created_at,
    }))

    return NextResponse.json({ clients })
  } catch (error) {
    console.error('GET /api/admin/clients error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
