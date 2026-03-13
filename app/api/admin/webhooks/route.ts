import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgId } from '@/lib/auth/get-user-org'

const WEBHOOK_EVENTS = [
  'contact.created',
  'contact.updated',
  'contact.deleted',
  'deal.created',
  'deal.updated',
  'deal.deleted',
  'company.created',
  'company.updated',
  'company.deleted',
  'booking.created',
  'booking.updated',
  'booking.cancelled',
  'payment.received',
] as const

const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  description: z.string().max(500).optional(),
})

/**
 * Generate a random webhook signing secret.
 */
function generateSecret(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return 'whsec_' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// GET - List webhooks for the org
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

    // Use admin client because webhook_registrations RLS only allows service_role
    const adminSupabase = createAdminClient()

    const { data: webhooks, error } = await adminSupabase
      .from('webhook_registrations')
      .select('id, url, events, is_active, description, created_at, updated_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching webhooks:', error)
      return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 })
    }

    return NextResponse.json({ webhooks: webhooks || [], available_events: WEBHOOK_EVENTS })
  } catch (error) {
    console.error('Webhooks GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new webhook
export async function POST(request: Request) {
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

    const body = await request.json()
    const parsed = createWebhookSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { url, events, description } = parsed.data
    const secret = generateSecret()

    const adminSupabase = createAdminClient()

    const { data: webhook, error } = await adminSupabase
      .from('webhook_registrations')
      .insert({
        organization_id: organizationId,
        url,
        events,
        secret,
        description: description || null,
        is_active: true,
      })
      .select('id, url, events, is_active, description, created_at')
      .single()

    if (error) {
      console.error('Error creating webhook:', error)
      return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 })
    }

    // Return secret ONCE so admin can configure their receiving server
    return NextResponse.json({
      webhook: {
        ...webhook,
        secret,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Webhooks POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
