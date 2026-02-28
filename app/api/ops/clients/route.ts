import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/ops/clients -- List all provisioned clients
// Requires service_role access (ops tables are admin-only via RLS)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const tier = searchParams.get('tier');
    const healthStatus = searchParams.get('health_status');
    const billingStatus = searchParams.get('billing_status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = admin
      .from('ops_clients')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (tier) {
      query = query.eq('tier', tier);
    }
    if (healthStatus) {
      query = query.eq('health_status', healthStatus);
    }
    if (billingStatus) {
      query = query.eq('billing_status', billingStatus);
    }

    const { data: clients, error, count } = await query;

    if (error) {
      // Table does not exist yet -- migration 08 has not been applied
      if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Ops tables not provisioned. Run migration 08_ops_dashboard.sql to enable the ops dashboard.', code: 'OPS_NOT_PROVISIONED' },
          { status: 501 }
        );
      }
      console.error('Error fetching ops clients:', error);
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
    }

    return NextResponse.json({
      clients: clients || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Ops clients GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/ops/clients -- Register a new client in the ops registry
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const body = await request.json();
    const { client_id, client_name, org_email, tier, modules, branding, integrations } = body;

    if (!client_id || !client_name || !org_email || !tier) {
      return NextResponse.json(
        { error: 'Required fields: client_id, client_name, org_email, tier' },
        { status: 400 }
      );
    }

    const validTiers = ['core', 'growth', 'scale'];
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        { error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` },
        { status: 400 }
      );
    }

    const { data: client, error } = await admin
      .from('ops_clients')
      .insert({
        client_id,
        client_name,
        org_email,
        tier,
        modules: modules || {},
        branding: branding || {},
        integrations: integrations || {},
      })
      .select()
      .single();

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Ops tables not provisioned. Run migration 08_ops_dashboard.sql to enable the ops dashboard.', code: 'OPS_NOT_PROVISIONED' },
          { status: 501 }
        );
      }
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `Client with id "${client_id}" already exists` },
          { status: 409 }
        );
      }
      console.error('Error creating ops client:', error);
      return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
    }

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error('Ops clients POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
