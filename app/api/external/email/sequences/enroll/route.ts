/**
 * External Email Sequence Enrollment — M2M Endpoint
 *
 * Allows vertical clients (e.g., FIGARIE) to enroll contacts in
 * DraggonnB email sequences via M2M API. Uses API key auth via
 * middleware-injected headers (x-organization-id, x-api-key-scopes).
 *
 * Table: sequence_enrollments (see 02_email_automation.sql)
 * - Uses contact_email (not contact_id) as the enrollment key
 * - UNIQUE(sequence_id, contact_email) prevents duplicate enrollments
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireScopes, getOrganizationId } from '@/lib/security/scope-guard'

export async function POST(request: NextRequest) {
  try {
    // 1. Scope check — require email:write
    const scopeCheck = requireScopes(request, 'email:write')
    if (!scopeCheck.authorized) return scopeCheck.response!

    // 2. Organization context
    const organizationId = getOrganizationId(request)
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Missing organization context' },
        { status: 401 }
      )
    }

    // 3. Parse and validate body
    const body = await request.json()
    const { contact_id, sequence_id } = body

    if (!contact_id || typeof contact_id !== 'string') {
      return NextResponse.json(
        { error: 'contact_id is required' },
        { status: 400 }
      )
    }
    if (!sequence_id || typeof sequence_id !== 'string') {
      return NextResponse.json(
        { error: 'sequence_id is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // 4. Verify contact belongs to organization and get email
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, email')
      .eq('id', contact_id)
      .eq('organization_id', organizationId)
      .single()

    if (contactError || !contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    if (!contact.email) {
      return NextResponse.json(
        { error: 'Contact has no email address' },
        { status: 400 }
      )
    }

    // 5. Verify sequence belongs to organization and is active
    const { data: sequence, error: seqError } = await supabase
      .from('email_sequences')
      .select('id, name, is_active, total_enrolled')
      .eq('id', sequence_id)
      .eq('organization_id', organizationId)
      .single()

    if (seqError || !sequence) {
      return NextResponse.json(
        { error: 'Sequence not found' },
        { status: 404 }
      )
    }

    if (!sequence.is_active) {
      return NextResponse.json(
        { error: 'Sequence is not active' },
        { status: 400 }
      )
    }

    // 6. Check for existing active/paused enrollment (prevent duplicates)
    // Table: sequence_enrollments has UNIQUE(sequence_id, contact_email)
    const { data: existingEnrollment } = await supabase
      .from('sequence_enrollments')
      .select('id, status')
      .eq('contact_email', contact.email)
      .eq('sequence_id', sequence_id)
      .in('status', ['active', 'paused'])
      .maybeSingle()

    if (existingEnrollment) {
      return NextResponse.json(
        { data: existingEnrollment, message: 'Contact already enrolled' },
        { status: 200 }
      )
    }

    // 7. Create enrollment in sequence_enrollments table
    const { data: enrollment, error: enrollError } = await supabase
      .from('sequence_enrollments')
      .insert({
        organization_id: organizationId,
        sequence_id,
        contact_email: contact.email,
        status: 'active',
        current_step: 1,
        enrolled_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (enrollError) {
      console.error('[External Email] Enrollment error:', enrollError)
      // Handle unique constraint violation (duplicate completed enrollment being re-enrolled)
      if (enrollError.code === '23505') {
        return NextResponse.json(
          { error: 'Contact already enrolled in this sequence' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to enroll contact' },
        { status: 500 }
      )
    }

    // 8. Increment total_enrolled on the sequence (direct update, no RPC)
    await supabase
      .from('email_sequences')
      .update({ total_enrolled: (sequence.total_enrolled || 0) + 1 })
      .eq('id', sequence_id)

    return NextResponse.json({ data: enrollment }, { status: 201 })
  } catch (error) {
    console.error('[External Email] Enroll error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
