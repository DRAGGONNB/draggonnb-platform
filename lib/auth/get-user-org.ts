import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

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

const USER_SELECT = `
  id,
  email,
  full_name,
  organization_id,
  role,
  organizations (
    id,
    name,
    subscription_tier,
    subscription_status
  )
`

/**
 * Auto-create a user record from auth metadata when the users table row is missing.
 * Uses admin client to bypass RLS (user is already authenticated via auth.getUser).
 * This handles users who signed up before the signup flow was fixed to link org.
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

  // Check if user owns an organization (created during signup but user row wasn't linked)
  const { data: ownedOrg, error: orgError } = await admin
    .from('organizations')
    .select('id')
    .eq('owner_id', authUser.id)
    .limit(1)
    .single()

  if (!ownedOrg) {
    console.error('ensureUserRecord: no org with owner_id =', authUser.id, orgError)

    // Fallback: check if user has any org membership via existing users row
    const { data: existingUser } = await admin
      .from('users')
      .select('organization_id')
      .eq('id', authUser.id)
      .single()

    if (existingUser?.organization_id) {
      return { organizationId: existingUser.organization_id, error: null }
    }

    // Last resort: create a default organization for the user
    const { data: newOrg, error: newOrgError } = await admin
      .from('organizations')
      .insert({
        name: fullName + "'s Organization",
        subscription_tier: 'starter',
        subscription_status: 'trial',
        owner_id: authUser.id,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (newOrgError || !newOrg) {
      console.error('ensureUserRecord: failed to create fallback org:', newOrgError)
      return { organizationId: null, error: 'No organization found for user' }
    }

    // Create user record linked to the new org
    const { error: insertError } = await admin.from('users').insert({
      id: authUser.id,
      email,
      full_name: fullName,
      organization_id: newOrg.id,
      role: 'admin',
      created_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error('ensureUserRecord: failed to create user record:', insertError)
      return { organizationId: null, error: 'Failed to create user record' }
    }

    return { organizationId: newOrg.id, error: null }
  }

  // Check if user record already exists (might have been created without org link)
  const { data: existingUser } = await admin
    .from('users')
    .select('id')
    .eq('id', authUser.id)
    .single()

  if (existingUser) {
    // User row exists but org join failed -- update the organization_id
    await admin
      .from('users')
      .update({ organization_id: ownedOrg.id })
      .eq('id', authUser.id)

    return { organizationId: ownedOrg.id, error: null }
  }

  // Create the missing user record linked to their organization
  const { error: insertError } = await admin.from('users').insert({
    id: authUser.id,
    email,
    full_name: fullName,
    organization_id: ownedOrg.id,
    role: 'admin',
    created_at: new Date().toISOString(),
  })

  if (insertError) {
    console.error('ensureUserRecord: failed to insert user record:', insertError)
    return { organizationId: null, error: 'Failed to create user record' }
  }

  return { organizationId: ownedOrg.id, error: null }
}

/**
 * Get the current authenticated user and their organization.
 * This function should be used in server components and API routes.
 */
export async function getUserOrg(): Promise<GetUserOrgResult> {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { data: null, error: 'Not authenticated' }
    }

    // Get user record with organization
    // Try with user's client first, fall back to admin if RLS blocks
    let { data: userData, error: userError } = await supabase
      .from('users')
      .select(USER_SELECT)
      .eq('id', user.id)
      .single()

    // If user query failed (RLS or missing row), try admin client
    if (userError || !userData) {
      console.warn('User query failed with user client, trying admin. Error:', userError?.message, 'User:', user.id)

      try {
        const admin = createAdminClient()
        const adminFetch = await admin
          .from('users')
          .select(USER_SELECT)
          .eq('id', user.id)
          .single()

        if (adminFetch.data) {
          userData = adminFetch.data
          userError = null
        }
      } catch {
        // Admin client not available, continue with auto-create path
      }
    }

    // Auto-create user record if still missing
    if ((userError || !userData) && user.email) {
      console.warn('User record missing for authenticated user, attempting auto-create:', user.id)
      const autoResult = await ensureUserRecord(user)

      if (autoResult.error) {
        console.error('Auto-create failed:', autoResult.error)
        return { data: null, error: autoResult.error }
      }

      // Re-fetch with admin client (bypasses RLS)
      try {
        const admin = createAdminClient()
        const refetch = await admin
          .from('users')
          .select(USER_SELECT)
          .eq('id', user.id)
          .single()

        userData = refetch.data
        userError = refetch.error
      } catch {
        // Fall back to user client
        const refetch = await supabase
          .from('users')
          .select(USER_SELECT)
          .eq('id', user.id)
          .single()

        userData = refetch.data
        userError = refetch.error
      }
    }

    if (userError || !userData) {
      console.error('Error fetching user data:', userError)
      return { data: null, error: 'User not found' }
    }

    if (!userData.organization_id) {
      return { data: null, error: 'User has no organization' }
    }

    // Handle organizations as either an object or array
    const org = Array.isArray(userData.organizations)
      ? userData.organizations[0]
      : userData.organizations

    if (!org) {
      return { data: null, error: 'Organization not found' }
    }

    return {
      data: {
        userId: userData.id,
        email: userData.email,
        fullName: userData.full_name,
        organizationId: userData.organization_id,
        role: userData.role,
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
