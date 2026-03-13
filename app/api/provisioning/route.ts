import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { provisionClient } from '@/scripts/provisioning/orchestrator';
import { z } from 'zod';

const provisioningSchema = z.object({
  clientId: z.string().min(1).max(50),
  clientName: z.string().min(1).max(100),
  orgEmail: z.string().email(),
  tier: z.enum(['starter', 'professional', 'enterprise', 'core', 'growth', 'scale']),
  modules: z.object({
    crm: z.boolean().optional(),
    email: z.boolean().optional(),
    social: z.boolean().optional(),
    content_studio: z.boolean().optional(),
    accommodation: z.boolean().optional(),
    ai_agents: z.boolean().optional(),
  }).optional(),
  branding: z.object({
    primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    logo_url: z.string().url().nullable().optional(),
    company_name: z.string().max(100).optional(),
    tagline: z.string().max(200).optional(),
  }).optional(),
  integrations: z.object({
    facebook: z.boolean().optional(),
    linkedin: z.boolean().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Auth check - must be authenticated admin
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Admin role check: only users with admin role can provision
    const { data: userRecord } = await supabase
      .from('organization_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!userRecord) {
      return NextResponse.json(
        { error: 'Forbidden: only admins can provision clients' },
        { status: 403 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validation = provisioningSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { clientId, clientName, orgEmail, tier, modules, branding, integrations } = validation.data;

    // Run provisioning with optional config overrides
    const overrides = { modules, branding, integrations };
    const result = await provisionClient(clientId, clientName, orgEmail, tier, overrides);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Provisioning failed', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Client provisioned successfully',
      resources: {
        organizationId: result.resources?.organizationId,
        subdomain: result.resources?.subdomain,
        n8nWebhookUrl: result.resources?.n8nWebhookUrl,
        qaResult: result.resources?.qaResult,
      }
    });

  } catch (error) {
    console.error('Provisioning API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
