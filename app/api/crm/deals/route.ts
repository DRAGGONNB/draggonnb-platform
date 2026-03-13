import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/auth/get-user-org'

// GET - List deals
export async function GET(request: Request) {
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

    // organizationId already set above
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const stage = searchParams.get('stage')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('deals')
      .select('*, contacts(first_name, last_name, email)', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (stage) {
      query = query.eq('stage', stage)
    }

    const { data: deals, error, count } = await query

    if (error) {
      console.error('Error fetching deals:', error)
      return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 })
    }

    return NextResponse.json({
      deals: deals || [],
      total: count || 0,
      limit,
      offset
    })

  } catch (error) {
    console.error('Deals GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create deal
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
    const { name, value, stage, contact_id, company_id, expected_close_date, probability, description, notes } = body

    if (!name) {
      return NextResponse.json({ error: 'Deal name is required' }, { status: 400 })
    }

    const { data: deal, error } = await supabase
      .from('deals')
      .insert({
        organization_id: organizationId,
        name,
        value: value || 0,
        stage: stage || 'lead',
        contact_id: contact_id || null,
        company_id: company_id || null,
        expected_close_date: expected_close_date || null,
        probability: probability || 0,
        description: description || null,
        notes: notes || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating deal:', error)
      return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 })
    }

    return NextResponse.json({ deal }, { status: 201 })

  } catch (error) {
    console.error('Deals POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
