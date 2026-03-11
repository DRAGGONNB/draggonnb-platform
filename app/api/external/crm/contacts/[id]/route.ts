/**
 * External CRM Contacts — Update by ID
 *
 * M2M endpoint for vertical clients to update an existing contact.
 * Uses dual-condition WHERE (id + organization_id) to prevent cross-tenant updates.
 * No session auth — uses middleware-injected API key context.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireScopes, getOrganizationId } from '@/lib/security/scope-guard'

// Allowed fields for contact update (email excluded — should not change via M2M)
const ALLOWED_UPDATE_FIELDS = [
  'first_name',
  'last_name',
  'phone',
  'mobile',
  'company',
  'job_title',
  'status',
  'lead_source',
  'tags',
  'notes',
  'linkedin_url',
  'twitter_handle',
  'email_opted_in',
] as const

/**
 * PATCH /api/external/crm/contacts/:id
 *
 * Update a contact by ID, scoped to the authenticated organization.
 * Returns 404 if contact not found or belongs to a different organization.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Scope check
    const scopeCheck = requireScopes(request, 'contacts:write')
    if (!scopeCheck.authorized) return scopeCheck.response!

    // Organization context
    const organizationId = getOrganizationId(request)
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Missing organization context' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Pick only allowed fields from body
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    let hasUpdates = false
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
        hasUpdates = true
      }
    }

    if (!hasUpdates) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Dual-condition: id + organization_id prevents cross-tenant updates
    const { data: contact, error } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (error) {
      // PGRST116 = "JSON object requested, multiple (or no) rows returned"
      // This means no row matched the dual-condition (not found or wrong org)
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Contact not found' },
          { status: 404 }
        )
      }
      console.error('[External CRM] Error updating contact:', error)
      return NextResponse.json(
        { error: 'Failed to update contact' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: contact })
  } catch (error) {
    console.error('[External CRM] Contact PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
