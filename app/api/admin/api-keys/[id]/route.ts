import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/auth/get-user-org'

const updateKeySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  scopes: z.array(z.string()).optional(),
})

// PATCH - Update API key name/scopes
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = await getOrgId(supabase, user.id)
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = updateKeySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: key, error } = await supabase
      .from('api_keys')
      .update(parsed.data)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select('id, name, scopes, last_used_at, expires_at, created_at, revoked_at')
      .single()

    if (error) {
      console.error('Error updating API key:', error)
      return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 })
    }

    if (!key) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    return NextResponse.json({ key })
  } catch (error) {
    console.error('API Key PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Revoke API key (soft delete via revoked_at)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = await getOrgId(supabase, user.id)
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    const { data: key, error } = await supabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('revoked_at', null)
      .select('id')
      .single()

    if (error || !key) {
      return NextResponse.json({ error: 'API key not found or already revoked' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API Key DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
