import { ProvisioningJob, ProvisioningResult } from '../../../lib/provisioning/types';
import { createAdminClient } from '../../../lib/supabase/admin';

export async function setupBilling(job: ProvisioningJob): Promise<ProvisioningResult> {
  try {
    const supabase = createAdminClient();

    // Map tier to plan slug
    const tierToSlug: Record<string, string> = {
      starter: 'core',
      core: 'core',
      professional: 'growth',
      growth: 'growth',
      enterprise: 'scale',
      scale: 'scale',
    };
    const planSlug = tierToSlug[job.tier] || 'core';

    // Look up the billing plan
    const { data: plan, error: planError } = await supabase
      .from('billing_plans')
      .select('id')
      .eq('slug', planSlug)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return {
        success: false,
        step: 'billing-setup',
        error: `Billing plan '${planSlug}' not found: ${planError?.message || 'not found'}`,
      };
    }

    // Check for existing subscription (idempotency)
    const { data: existing } = await supabase
      .from('tenant_subscriptions')
      .select('id')
      .eq('organization_id', job.clientId)
      .single();

    if (existing) {
      console.log(`  Billing: Subscription already exists for ${job.clientId}`);
      return {
        success: true,
        step: 'billing-setup',
        data: { billingSubscriptionId: existing.id },
      };
    }

    // Create subscription
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());

    const { data: subscription, error: subError } = await supabase
      .from('tenant_subscriptions')
      .insert({
        organization_id: job.clientId,
        plan_id: plan.id,
        status: 'active',
        current_period_start: today.toISOString().split('T')[0],
        current_period_end: nextMonth.toISOString().split('T')[0],
      })
      .select('id')
      .single();

    if (subError) {
      return {
        success: false,
        step: 'billing-setup',
        error: `Failed to create subscription: ${subError.message}`,
      };
    }

    console.log(`  Billing: Subscription created (${planSlug} plan)`);

    // Seed usage alerts for the first billing period
    await supabase.rpc('seed_usage_alerts', {
      p_organization_id: job.clientId,
      p_billing_period: today.toISOString().split('T')[0],
    }).catch((err: Error) => {
      console.warn('  Billing: Failed to seed usage alerts (non-fatal):', err.message);
    });

    console.log(`  Billing: Usage alerts seeded`);

    return {
      success: true,
      step: 'billing-setup',
      data: { billingSubscriptionId: subscription.id },
    };
  } catch (error) {
    return {
      success: false,
      step: 'billing-setup',
      error: error instanceof Error ? error.message : 'Unknown billing setup error',
    };
  }
}
