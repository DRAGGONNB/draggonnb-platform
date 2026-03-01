import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  generatePayFastSignature,
  getPayFastConfig,
} from '@/lib/payments/payfast'

/**
 * POST /api/billing/bolt-on
 *
 * Initiate a bolt-on credit pack purchase via PayFast.
 * Returns PayFast form data for redirect-based payment.
 *
 * Body: { packSlug: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get organization
    const { data: userRecord } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userRecord?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const organizationId = userRecord.organization_id

    // Parse request
    const body = await request.json()
    const { packSlug } = body

    if (!packSlug) {
      return NextResponse.json({ error: 'packSlug is required' }, { status: 400 })
    }

    // Lookup the credit pack
    const admin = createAdminClient()
    const { data: pack, error: packError } = await admin
      .from('credit_packs')
      .select('*')
      .eq('slug', packSlug)
      .eq('is_active', true)
      .single()

    if (packError || !pack) {
      return NextResponse.json({ error: 'Credit pack not found' }, { status: 404 })
    }

    // Get organization details for PayFast
    const { data: org } = await admin
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()

    // Build PayFast form data for bolt-on (once-off payment, not subscription)
    const config = getPayFastConfig()
    const paymentId = `bolton-${organizationId}-${pack.slug}-${Date.now()}`
    const amountZar = (pack.price_zar / 100).toFixed(2) // Convert cents to ZAR

    const formData: Record<string, string> = {
      merchant_id: config.merchantId,
      merchant_key: config.merchantKey,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?boltonSuccess=${pack.slug}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?boltonCancelled=true`,
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/payfast`,
      name_first: org?.name?.split(' ')[0] || 'Customer',
      name_last: org?.name?.split(' ').slice(1).join(' ') || 'Account',
      email_address: user.email || '',
      m_payment_id: paymentId,
      amount: amountZar,
      item_name: `DraggonnB - ${pack.name}`,
      item_description: `${pack.credit_quantity} ${pack.dimension.replace(/_/g, ' ')} credits`,
      // Encode bolt-on metadata in custom strings
      custom_str1: organizationId,
      custom_str2: 'bolt-on', // Signal to webhook handler this is a bolt-on
      custom_str3: pack.slug, // Pack slug for credit provisioning
    }

    const signature = generatePayFastSignature(formData, config.passphrase)
    formData.signature = signature

    return NextResponse.json({
      formData,
      paymentUrl: config.baseUrl,
      pack: {
        name: pack.name,
        dimension: pack.dimension,
        quantity: pack.credit_quantity,
        priceDisplay: `R${(pack.price_zar / 100).toLocaleString('en-ZA')}`,
      },
    })
  } catch (error) {
    console.error('[BoltOn] Purchase error:', error)
    return NextResponse.json({ error: 'Failed to initiate purchase' }, { status: 500 })
  }
}

/**
 * GET /api/billing/bolt-on
 *
 * List available credit packs for purchase.
 */
export async function GET() {
  try {
    const admin = createAdminClient()

    const { data: packs, error } = await admin
      .from('credit_packs')
      .select('slug, name, dimension, credit_quantity, price_zar')
      .eq('is_active', true)
      .order('dimension')
      .order('price_zar', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch credit packs' }, { status: 500 })
    }

    const formatted = (packs || []).map((p: Record<string, unknown>) => ({
      slug: p.slug,
      name: p.name,
      dimension: p.dimension,
      quantity: p.credit_quantity,
      priceZar: p.price_zar,
      priceDisplay: `R${((p.price_zar as number) / 100).toLocaleString('en-ZA')}`,
      perUnitCost: `R${(((p.price_zar as number) / 100) / (p.credit_quantity as number)).toFixed(3)}`,
    }))

    return NextResponse.json({ packs: formatted })
  } catch (error) {
    console.error('[BoltOn] List error:', error)
    return NextResponse.json({ error: 'Failed to list credit packs' }, { status: 500 })
  }
}
