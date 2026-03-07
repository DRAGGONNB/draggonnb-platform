import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { createAutomationRuleSchema } from '@/lib/accommodation/schemas'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const triggerEvent = searchParams.get('trigger_event')
    const channel = searchParams.get('channel')
    const isActive = searchParams.get('is_active')

    let query = auth.supabase
      .from('accommodation_automation_rules')
      .select('*')
      .eq('organization_id', auth.organizationId)
      .order('created_at', { ascending: false })

    if (triggerEvent) query = query.eq('trigger_event', triggerEvent)
    if (channel) query = query.eq('channel', channel)
    if (isActive !== null && isActive !== undefined) query = query.eq('is_active', isActive === 'true')

    const { data: rules, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch automation rules' }, { status: 500 })
    }

    return NextResponse.json({ rules })
  } catch (error) {
    console.error('Automation rules GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createAutomationRuleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: rule, error } = await auth.supabase
      .from('accommodation_automation_rules')
      .insert({ ...parsed.data, organization_id: auth.organizationId })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create automation rule' }, { status: 500 })
    }

    return NextResponse.json({ rule }, { status: 201 })
  } catch (error) {
    console.error('Automation rules POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
