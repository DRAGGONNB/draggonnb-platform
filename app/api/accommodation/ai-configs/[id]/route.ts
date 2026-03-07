import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { updateAIConfigSchema } from '@/lib/accommodation/schemas'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { id } = await params
    const body = await request.json()
    const parsed = updateAIConfigSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: config, error } = await auth.supabase
      .from('accommodation_ai_configs')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single()

    if (error || !config) {
      return NextResponse.json({ error: 'Failed to update AI config' }, { status: 500 })
    }

    return NextResponse.json({ config })
  } catch (error) {
    console.error('AI config PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
