import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/auth/get-user-org'

// GET - List companies
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
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('companies')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(`name.ilike.%${search}%,industry.ilike.%${search}%,website.ilike.%${search}%`)
    }

    const { data: companies, error, count } = await query

    if (error) {
      console.error('Error fetching companies:', error)
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
    }

    return NextResponse.json({
      companies: companies || [],
      total: count || 0,
      limit,
      offset
    })

  } catch (error) {
    console.error('Companies GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create company
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
    const { name, industry, website, phone, address, city, country, employee_count, annual_revenue, notes } = body

    if (!name) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    const { data: company, error } = await supabase
      .from('companies')
      .insert({
        organization_id: organizationId,
        name,
        industry: industry || null,
        website: website || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        country: country || null,
        employee_count: employee_count || null,
        annual_revenue: annual_revenue || null,
        notes: notes || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating company:', error)
      return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
    }

    return NextResponse.json({ company }, { status: 201 })

  } catch (error) {
    console.error('Companies POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
