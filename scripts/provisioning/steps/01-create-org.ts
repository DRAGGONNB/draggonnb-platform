import { createClient } from '@supabase/supabase-js';
import { ProvisioningJob, ProvisioningResult } from '../../../lib/provisioning/types';
import { getEnabledModules as getModulesForTier } from '../../../lib/provisioning/client-config';

/**
 * Step 01: Create Organization
 * Creates the org row, initial user, usage metrics, and tenant_modules entries
 * in the shared Supabase database. Replaces per-client Supabase project creation.
 */
export async function createOrganization(
  job: ProvisioningJob
): Promise<ProvisioningResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      success: false,
      step: 'create-org',
      error: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
    };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Check if org already exists (idempotent)
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('subdomain', job.clientId)
      .single();

    if (existingOrg) {
      console.log(`Organization ${job.clientId} already exists, skipping creation`);
      return {
        success: true,
        step: 'create-org',
        data: { organizationId: existingOrg.id },
      };
    }

    // Normalize tier
    const tier = (['starter', 'core'].includes(job.tier) ? 'core'
      : ['professional', 'growth'].includes(job.tier) ? 'growth'
      : 'scale');

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: job.clientName,
        subscription_tier: tier,
        subscription_status: 'active',
        subdomain: job.clientId,
      })
      .select('id')
      .single();

    if (orgError || !org) {
      return {
        success: false,
        step: 'create-org',
        error: `Failed to create organization: ${orgError?.message || 'Unknown error'}`,
      };
    }

    // Create auth user (via Supabase Admin API)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: job.orgEmail,
      email_confirm: true,
      user_metadata: {
        full_name: `${job.clientName} Admin`,
        organization_id: org.id,
      },
    });

    if (authError) {
      // Rollback org creation
      await supabase.from('organizations').delete().eq('id', org.id);
      return {
        success: false,
        step: 'create-org',
        error: `Failed to create auth user: ${authError.message}`,
      };
    }

    // Create users table entry
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email: job.orgEmail,
        full_name: `${job.clientName} Admin`,
        role: 'admin',
        organization_id: org.id,
      });

    if (userError) {
      console.warn(`Warning: users table insert failed (may already exist): ${userError.message}`);
    }

    // Create usage metrics row
    await supabase.from('client_usage_metrics').insert({
      organization_id: org.id,
    });

    // Enable modules based on tier/config
    const enabledModules = job.clientConfig
      ? getModulesForTier(job.clientConfig)
      : getDefaultModules(tier);

    for (const moduleId of enabledModules) {
      await supabase.from('tenant_modules').insert({
        organization_id: org.id,
        module_id: moduleId,
        is_enabled: true,
      });
    }

    console.log(`Organization ${job.clientId} created: ${org.id} (${tier} tier, ${enabledModules.length} modules)`);

    return {
      success: true,
      step: 'create-org',
      data: {
        organizationId: org.id,
        subdomain: job.clientId,
      },
    };
  } catch (error) {
    return {
      success: false,
      step: 'create-org',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function getDefaultModules(tier: string): string[] {
  switch (tier) {
    case 'core':
      return ['crm', 'email', 'ai_agents', 'analytics'];
    case 'growth':
      return ['crm', 'email', 'social', 'content_studio', 'ai_agents', 'analytics'];
    case 'scale':
      return ['crm', 'email', 'social', 'content_studio', 'accommodation', 'ai_agents', 'analytics'];
    default:
      return ['crm', 'email', 'analytics'];
  }
}
