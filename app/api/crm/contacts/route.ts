import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dispatchWebhooksForOrg } from '@/lib/webhooks/dispatcher'

// GET - List contacts
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    const organizationId = userData.organization_id
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply search filter
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
    }

    // Apply status filter
    if (status) {
      query = query.eq('status', status)
    }

    const { data: contacts, error, count } = await query

    if (error) {
      console.error('Error fetching contacts:', error)
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
    }

    return NextResponse.json({
      contacts: contacts || [],
      total: count || 0,
      limit,
      offset
    })

  } catch (error) {
    console.error('Contacts GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create contact
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    const body = await request.json()
    const { first_name, last_name, email, phone, company, job_title, status, notes, tags } = body

    // Validate required fields
    if (!first_name || !email) {
      return NextResponse.json({ error: 'First name and email are required' }, { status: 400 })
    }

    // Create contact
    const { data: contact, error } = await supabase
      .from('contacts')
      .insert({
        organization_id: userData.organization_id,
        first_name,
        last_name: last_name || '',
        email,
        phone: phone || null,
        company: company || null,
        job_title: job_title || null,
        status: status || 'active',
        notes: notes || null,
        tags: tags || [],
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating contact:', error)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Contact with this email already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
    }

    // After successful insert, dispatch webhook (fire-and-forget)
    // Skip if this contact was created via sync (has sync_origin) to prevent echo loops
    if (contact && !body.sync_origin) {
      dispatchWebhooksForOrg(userData.organization_id, 'contact.created', {
        id: contact.id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        status: contact.status,
        created_at: contact.created_at,
      }).catch((err) => console.error('[CRM] Webhook dispatch failed:', err))
    }

    return NextResponse.json({ contact }, { status: 201 })

  } catch (error) {
    console.error('Contacts POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
