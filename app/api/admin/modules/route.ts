import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgId } from '@/lib/auth/get-user-org'

/**
 * GET /api/admin/modules
 * List all modules from module_registry with tenant activation counts.
 * Also returns per-client module activation details.
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

    // Get all modules from registry
    const { data: modules, error: modulesError } = await admin
      .from('module_registry')
      .select('*')
      .order('name', { ascending: true })

    if (modulesError) {
      return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 })
    }

    // Get tenant module activations with org names
    const { data: activations } = await admin
      .from('tenant_modules')
      .select('id, organization_id, module_id, is_enabled, config, updated_at, organizations(name)')

    // Count tenants per module
    const tenantCountMap: Record<string, number> = {}
    for (const row of activations || []) {
      if (row.is_enabled) {
        tenantCountMap[row.module_id] = (tenantCountMap[row.module_id] || 0) + 1
      }
    }

    // Build module list with counts
    const moduleList = (modules || []).map((mod) => ({
      id: mod.id,
      name: mod.name,
      description: mod.description,
      min_tier: mod.min_tier,
      is_global_enabled: mod.is_enabled ?? true,
      tenant_count: tenantCountMap[mod.id] || 0,
    }))

    // Build per-client activation list
    const clientModules = (activations || []).map((act) => {
      const org = Array.isArray(act.organizations) ? act.organizations[0] : act.organizations
      return {
        id: act.id,
        organization_id: act.organization_id,
        organization_name: (org as unknown as { name: string } | null)?.name || 'Unknown',
        module_id: act.module_id,
        is_enabled: act.is_enabled,
        config: act.config,
        updated_at: act.updated_at,
      }
    })

    return NextResponse.json({ modules: moduleList, client_modules: clientModules })
  } catch (error) {
    console.error('GET /api/admin/modules error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
