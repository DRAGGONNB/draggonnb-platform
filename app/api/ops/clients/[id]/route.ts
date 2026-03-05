import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/ops/clients/:id -- Get client details with recent health checks
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const admin = createAdminClient();

    const { data: client, error } = await admin
      .from('ops_clients')
      .select('*')
      .eq('client_id', id)
      .single();

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Ops tables not provisioned. Run migration 08_ops_dashboard.sql to enable the ops dashboard.', code: 'OPS_NOT_PROVISIONED' },
          { status: 501 }
        );
      }
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }
      console.error('Error fetching ops client:', error);
      return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
    }

    // Fetch recent health checks for this client
    const { data: healthChecks } = await admin
      .from('ops_client_health')
      .select('*')
      .eq('client_id', id)
      .order('checked_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      client,
      health_checks: healthChecks || [],
    });
  } catch (error) {
    console.error('Ops client GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/ops/clients/:id -- Update client details
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const admin = createAdminClient();
    const body = await request.json();

    // Only allow updating specific fields
    const allowedFields = [
      'client_name', 'org_email', 'tier', 'modules', 'branding', 'integrations',
      'supabase_project_id', 'supabase_project_ref', 'github_repo_url',
      'vercel_project_id', 'vercel_deployment_url', 'n8n_workflow_ids',
      'billing_status', 'health_status',
    ];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: client, error } = await admin
      .from('ops_clients')
      .update(updates)
      .eq('client_id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Ops tables not provisioned. Run migration 08_ops_dashboard.sql to enable the ops dashboard.', code: 'OPS_NOT_PROVISIONED' },
          { status: 501 }
        );
      }
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }
      console.error('Error updating ops client:', error);
      return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
    }

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Ops client PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/ops/clients/:id -- Remove client from ops registry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const admin = createAdminClient();

    const { error } = await admin
      .from('ops_clients')
      .delete()
      .eq('client_id', id);

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Ops tables not provisioned. Run migration 08_ops_dashboard.sql to enable the ops dashboard.', code: 'OPS_NOT_PROVISIONED' },
          { status: 501 }
        );
      }
      console.error('Error deleting ops client:', error);
      return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ops client DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
