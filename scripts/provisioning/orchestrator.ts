import { ProvisioningJob, CreatedResources, ProvisioningResult } from '../../lib/provisioning/types';
import { validateProvisioningEnv } from '../../lib/provisioning/config';
import { ClientConfig, ClientModules, ClientBranding, ClientIntegrations, ClientDeployment, generateClientConfig, validateClientConfig, Tier } from '../../lib/provisioning/client-config';
import { createSupabaseProject } from './steps/01-supabase';
import { cloneSchemaToProject } from './steps/02-database';
import { createGitHubRepo } from './steps/03-github';
import { createVercelProject } from './steps/04-vercel';
import { createN8NWorkflow } from './steps/05-n8n';
import { deployAutomations } from './steps/06-automations';
import { sendOnboardingSequence } from './steps/07-onboarding';
import { runQAChecks } from './steps/08-qa-check';
import { setupBilling } from './steps/09-billing';
import { rollbackProvisioning } from './rollback';

export interface ProvisioningOrchestrator {
  job: ProvisioningJob;
  createdResources: CreatedResources;
}

export async function provisionClient(
  clientId: string,
  clientName: string,
  orgEmail: string,
  tier: 'starter' | 'professional' | 'enterprise' | 'core' | 'growth' | 'scale',
  clientConfig?: {
    modules?: Partial<ClientModules>;
    branding?: Partial<ClientBranding>;
    integrations?: Partial<ClientIntegrations>;
    deployment?: Partial<ClientDeployment>;
  }
): Promise<{ success: boolean; resources?: CreatedResources; error?: string }> {
  // Validate env vars first
  const envCheck = validateProvisioningEnv();
  if (!envCheck.valid) {
    return {
      success: false,
      error: `Missing environment variables: ${envCheck.missing.join(', ')}`
    };
  }

  // Normalize tier for config generation
  const normalizedTier: Tier = (['starter', 'core'].includes(tier) ? 'core'
    : ['professional', 'growth'].includes(tier) ? 'growth'
    : 'scale') as Tier;

  // Generate and validate client config
  const config = generateClientConfig(clientId, clientName, normalizedTier, clientConfig);
  const validation = validateClientConfig(config);
  if (!validation.valid) {
    return { success: false, error: `Invalid client config: ${validation.errors.join(', ')}` };
  }

  const job: ProvisioningJob = {
    clientId,
    clientName,
    orgEmail,
    tier,
    clientConfig: config,
    createdResources: {}
  };

  const resources: CreatedResources = {};

  try {
    // Step 1: Create Supabase project
    console.log('Step 1/9: Creating Supabase project...');
    const supabaseResult = await createSupabaseProject(job);
    if (!supabaseResult.success) {
      throw new Error(`Supabase creation failed: ${supabaseResult.error}`);
    }
    Object.assign(resources, supabaseResult.data);
    job.createdResources = { ...resources };

    // Step 2: Clone database schema
    console.log('Step 2/9: Cloning database schema...');
    if (resources.supabaseDatabaseUrl) {
      const schemaResult = await cloneSchemaToProject(
        resources.supabaseDatabaseUrl,
        resources.supabaseProjectRef || ''
      );
      if (!schemaResult.success) {
        throw new Error(`Schema cloning failed: ${schemaResult.error}`);
      }
    }

    // Step 3: Create GitHub repo
    console.log('Step 3/9: Creating GitHub repository...');
    const githubResult = await createGitHubRepo(job);
    if (!githubResult.success) {
      throw new Error(`GitHub creation failed: ${githubResult.error}`);
    }
    Object.assign(resources, githubResult.data);
    job.createdResources = { ...resources };

    // Step 4: Create Vercel deployment
    console.log('Step 4/9: Creating Vercel deployment...');
    const vercelResult = await createVercelProject(job, resources);
    if (!vercelResult.success) {
      throw new Error(`Vercel creation failed: ${vercelResult.error}`);
    }
    Object.assign(resources, vercelResult.data);
    job.createdResources = { ...resources };

    // Step 5: Configure N8N webhooks
    console.log('Step 5/9: Configuring N8N webhooks...');
    const n8nResult = await createN8NWorkflow(job);
    if (!n8nResult.success) {
      throw new Error(`N8N configuration failed: ${n8nResult.error}`);
    }
    Object.assign(resources, n8nResult.data);
    job.createdResources = { ...resources };

    // Step 6: Deploy client-specific automations (non-fatal)
    console.log('Step 6/9: Deploying client automations...');
    try {
      const automationResult = await deployAutomations(job);
      if (automationResult.data) {
        Object.assign(resources, automationResult.data);
      }
      job.createdResources = { ...resources };
    } catch (automationError) {
      console.warn('Step 6 warning (non-fatal):', automationError);
    }

    // Step 7: Send onboarding email sequence (non-fatal)
    console.log('Step 7/9: Sending onboarding emails...');
    try {
      const onboardingResult = await sendOnboardingSequence(job);
      if (onboardingResult.data) {
        Object.assign(resources, onboardingResult.data);
      }
      job.createdResources = { ...resources };
    } catch (emailError) {
      console.warn('Step 7 warning (non-fatal):', emailError);
    }

    // Step 8: QA health checks (non-fatal, reports results)
    console.log('Step 8/9: Running QA checks...');
    try {
      const qaResult = await runQAChecks(job, resources);
      if (qaResult.data) {
        Object.assign(resources, qaResult.data);
      }
      if (resources.qaResult) {
        const checks = JSON.parse(resources.qaResult);
        if (!checks.all_passed) {
          console.warn('QA checks completed with failures -- review needed:', resources.qaResult);
        }
      }
    } catch (qaError) {
      console.warn('Step 8 warning (non-fatal):', qaError);
    }

    // Step 9: Setup billing subscription (non-fatal)
    console.log('Step 9/9: Setting up billing...');
    try {
      const billingResult = await setupBilling(job);
      if (billingResult.data) {
        Object.assign(resources, billingResult.data);
      }
      job.createdResources = { ...resources };
    } catch (billingError) {
      console.warn('Step 9 warning (non-fatal):', billingError);
    }

    console.log('Provisioning complete!');
    return { success: true, resources };

  } catch (error) {
    console.error('Provisioning failed:', error);

    // Saga rollback
    await rollbackProvisioning(resources);

    return {
      success: false,
      resources,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
