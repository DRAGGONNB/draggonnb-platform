/**
 * External CRM Contacts — List & Create
 *
 * M2M endpoints for vertical clients (e.g., FIGARIE) to read and create
 * contacts in DraggonnB. Uses API key auth via middleware-injected headers
 * (x-organization-id, x-api-key-scopes). No session auth.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireScopes, getOrganizationId } from '@/lib/security/scope-guard'

// Allowed fields for contact creation
const ALLOWED_INSERT_FIELDS = [
  'first_name',
  'last_name',
  'email',
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
 * GET /api/external/crm/contacts
 *
 * List contacts scoped to the authenticated organization.
 * Supports: ?search=, ?status=, ?limit= (default 50, max 200), ?offset=
 */
export async function GET(request: NextRequest) {
  try {
    // Scope check
    const scopeCheck = requireScopes(request, 'contacts:read')
    if (!scopeCheck.authorized) return scopeCheck.response!

    // Organization context
    const organizationId = getOrganizationId(request)
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Missing organization context' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const rawLimit = parseInt(searchParams.get('limit') || '50', 10)
    const limit = Math.min(Math.max(1, rawLimit), 200) // Clamp 1..200
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10))

    const supabase = createAdminClient()

    // Build query
    let query = supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Search across first_name, last_name, email
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
      )
    }

    // Status filter
    if (status) {
      query = query.eq('status', status)
    }

    const { data: contacts, error, count } = await query

    if (error) {
      console.error('[External CRM] Error fetching contacts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch contacts' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: contacts || [],
      count: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('[External CRM] Contacts GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/external/crm/contacts
 *
 * Create a contact in the authenticated organization.
 * Requires: email OR (first_name AND last_name)
 */
export async function POST(request: NextRequest) {
  try {
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

    // Validate: email OR (first_name AND last_name) required
    const hasEmail = body.email && typeof body.email === 'string' && body.email.trim()
    const hasFullName =
      body.first_name &&
      typeof body.first_name === 'string' &&
      body.first_name.trim() &&
      body.last_name &&
      typeof body.last_name === 'string' &&
      body.last_name.trim()

    if (!hasEmail && !hasFullName) {
      return NextResponse.json(
        { error: 'Either email or both first_name and last_name are required' },
        { status: 400 }
      )
    }

    // Pick only allowed fields from body (prevent injection of organization_id, id, etc.)
    const insertData: Record<string, unknown> = {
      organization_id: organizationId,
    }

    for (const field of ALLOWED_INSERT_FIELDS) {
      if (body[field] !== undefined) {
        insertData[field] = body[field]
      }
    }

    const supabase = createAdminClient()

    const { data: contact, error } = await supabase
      .from('contacts')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('[External CRM] Error creating contact:', error)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Contact with this email already exists' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to create contact' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: contact }, { status: 201 })
  } catch (error) {
    console.error('[External CRM] Contacts POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
