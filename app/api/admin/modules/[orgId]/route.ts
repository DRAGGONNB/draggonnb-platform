import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgId } from '@/lib/auth/get-user-org'

const updateSchema = z.object({
  module_id: z.string().min(1),
  is_enabled: z.boolean(),
})

/**
 * PUT /api/admin/modules/[orgId]
 * Enable or disable a module for a specific organization.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params
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

    // Validate body
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { module_id, is_enabled } = parsed.data

    // Verify the target org exists
    const { data: targetOrg } = await admin
      .from('organizations')
      .select('id')
      .eq('id', orgId)
      .single()

    if (!targetOrg) {
      return NextResponse.json({ error: 'Target organization not found' }, { status: 404 })
    }

    // Upsert the tenant_modules row
    const { data: result, error: upsertError } = await admin
      .from('tenant_modules')
      .upsert(
        {
          organization_id: orgId,
          module_id,
          is_enabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id,module_id' }
      )
      .select()
      .single()

    if (upsertError) {
      console.error('Module toggle error:', upsertError)
      return NextResponse.json({ error: 'Failed to update module' }, { status: 500 })
    }

    return NextResponse.json({ module: result })
  } catch (error) {
    console.error('PUT /api/admin/modules/[orgId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
