import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Lightweight org lookup for API routes that already have an authenticated user.
 * Queries the organization_users junction table (the correct auth pattern).
 */
export async function getOrgId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('organization_users')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .single()
  return data?.organization_id ?? null
}

export interface UserOrg {
  userId: string
  email: string
  fullName: string
  organizationId: string
  role: string
  organization: {
    id: string
    name: string
    subscription_tier: string
    subscription_status: string
  }
}

export interface GetUserOrgResult {
  data: UserOrg | null
  error: string | null
}

/**
 * Auto-create user records (organization_users + user_profiles) when missing.
 * Uses admin client to bypass RLS (user is already authenticated via auth.getUser).
 */
async function ensureUserRecord(
  authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }
): Promise<{ organizationId: string | null; error: string | null }> {
  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch (e) {
    console.error('ensureUserRecord: admin client unavailable:', e)
    return { organizationId: null, error: 'Service configuration error' }
  }

  const email = authUser.email || ''
  const fullName = (authUser.user_metadata?.full_name as string) || email.split('@')[0]

  // Check if user already has an organization_users row
  const { data: existingMembership } = await admin
    .from('organization_users')
    .select('organization_id')
    .eq('user_id', authUser.id)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (existingMembership?.organization_id) {
    // Ensure user_profiles row exists
    await admin
      .from('user_profiles')
      .upsert({ id: authUser.id, full_name: fullName, updated_at: new Date().toISOString() }, { onConflict: 'id' })

    return { organizationId: existingMembership.organization_id, error: null }
  }

  // No membership found — check if there's an org where account_manager_id matches
  const { data: managedOrg } = await admin
    .from('organizations')
    .select('id')
    .eq('account_manager_id', authUser.id)
    .limit(1)
    .single()

  if (managedOrg) {
    // Link user to the org they manage
    await admin.from('organization_users').insert({
      organization_id: managedOrg.id,
      user_id: authUser.id,
      role: 'admin',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    await admin
      .from('user_profiles')
      .upsert({ id: authUser.id, full_name: fullName, updated_at: new Date().toISOString() }, { onConflict: 'id' })

    return { organizationId: managedOrg.id, error: null }
  }

  // Last resort: create a default organization for the user
  const { data: newOrg, error: newOrgError } = await admin
    .from('organizations')
    .insert({
      name: fullName + "'s Organization",
      subscription_tier: 'starter',
      subscription_status: 'trial',
      account_manager_id: authUser.id,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (newOrgError || !newOrg) {
    console.error('ensureUserRecord: failed to create fallback org:', newOrgError)
    return { organizationId: null, error: 'No organization found for user' }
  }

  // Create organization_users membership
  await admin.from('organization_users').insert({
    organization_id: newOrg.id,
    user_id: authUser.id,
    role: 'admin',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  // Create user_profiles row
  await admin
    .from('user_profiles')
    .upsert({ id: authUser.id, full_name: fullName, updated_at: new Date().toISOString() }, { onConflict: 'id' })

  return { organizationId: newOrg.id, error: null }
}

/**
 * Get the current authenticated user and their organization.
 * This function should be used in server components and API routes.
 *
 * Schema: organization_users (junction) + user_profiles + organizations
 */
export async function getUserOrg(): Promise<GetUserOrgResult> {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { data: null, error: 'Not authenticated' }
    }

    // Query organization_users with joined organization data
    // Try user client first, fall back to admin if RLS blocks
    type Membership = {
      organization_id: string
      role: string
      organizations: { id: string; name: string; subscription_tier: string; subscription_status: string } | { id: string; name: string; subscription_tier: string; subscription_status: string }[] | null
    }
    let membership: Membership | null = null

    const MEMBERSHIP_SELECT = `
      organization_id,
      role,
      organizations (
        id,
        name,
        subscription_tier,
        subscription_status
      )
    `

    const { data: memberData, error: memberError } = await supabase
      .from('organization_users')
      .select(MEMBERSHIP_SELECT)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (memberData && !memberError) {
      membership = memberData as unknown as Membership
    }

    // Fall back to admin client if RLS blocked
    if (!membership) {
      try {
        const admin = createAdminClient()
        const { data: adminData } = await admin
          .from('organization_users')
          .select(MEMBERSHIP_SELECT)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .single()

        if (adminData) {
          membership = adminData as unknown as Membership
        }
      } catch {
        // Admin client not available, continue with auto-create path
      }
    }

    // Auto-create if still missing
    if (!membership && user.email) {
      console.warn('User record missing for authenticated user, attempting auto-create:', user.id)
      const autoResult = await ensureUserRecord(user)

      if (autoResult.error) {
        console.error('Auto-create failed:', autoResult.error)
        return { data: null, error: autoResult.error }
      }

      // Re-fetch with admin client
      try {
        const admin = createAdminClient()
        const { data: refetchData } = await admin
          .from('organization_users')
          .select(MEMBERSHIP_SELECT)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .single()

        if (refetchData) {
          membership = refetchData as unknown as Membership
        }
      } catch {
        // Fall back to user client
        const { data: refetchData } = await supabase
          .from('organization_users')
          .select(MEMBERSHIP_SELECT)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .single()

        if (refetchData) {
          membership = refetchData as unknown as Membership
        }
      }
    }

    if (!membership) {
      return { data: null, error: 'User not found' }
    }

    // Get organization data (handle Supabase join returning array or object)
    const org = Array.isArray(membership.organizations)
      ? membership.organizations[0]
      : membership.organizations

    if (!org) {
      return { data: null, error: 'Organization not found' }
    }

    // Get user profile for display name
    let fullName = user.user_metadata?.full_name as string || user.email?.split('@')[0] || ''
    try {
      const admin = createAdminClient()
      const { data: profile } = await admin
        .from('user_profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      if (profile?.full_name) {
        fullName = profile.full_name
      }
    } catch {
      // Use auth metadata fallback
    }

    return {
      data: {
        userId: user.id,
        email: user.email || '',
        fullName,
        organizationId: membership.organization_id,
        role: membership.role,
        organization: {
          id: org.id,
          name: org.name,
          subscription_tier: org.subscription_tier,
          subscription_status: org.subscription_status,
        },
      },
      error: null,
    }
  } catch (error) {
    console.error('Unexpected error in getUserOrg:', error)
    return { data: null, error: 'Internal error' }
  }
}
