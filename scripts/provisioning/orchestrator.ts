import { ProvisioningJob, CreatedResources } from '../../lib/provisioning/types';
import { validateProvisioningEnv } from '../../lib/provisioning/config';
import { ClientModules, ClientBranding, ClientIntegrations, ClientDeployment, generateClientConfig, validateClientConfig, Tier } from '../../lib/provisioning/client-config';
import { createOrganization } from './steps/01-create-org';
import { createN8NWorkflow } from './steps/05-n8n';
import { deployAutomations } from './steps/06-automations';
import { sendOnboardingSequence } from './steps/07-onboarding';
import { runQAChecks } from './steps/08-qa-check';
import { rollbackProvisioning } from './rollback';

export interface ProvisioningOrchestrator {
  job: ProvisioningJob;
  createdResources: CreatedResources;
}

/**
 * Provision a new client in the shared database.
 *
 * Simplified flow (shared DB architecture):
 * Step 1: Create organization row + user + modules (replaces per-client Supabase)
 * Step 2: Configure N8N webhooks
 * Step 3: Deploy client-specific automations (non-fatal)
 * Step 4: Send onboarding sequence (non-fatal)
 * Step 5: Run QA checks (non-fatal)
 */
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
  // Validate env vars
  const envCheck = validateProvisioningEnv();
  if (!envCheck.valid) {
    return {
      success: false,
      error: `Missing environment variables: ${envCheck.missing.join(', ')}`
    };
  }

  // Normalize tier
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
    // Step 1: Create organization + user + modules in shared DB
    console.log('Step 1/5: Creating organization...');
    const orgResult = await createOrganization(job);
    if (!orgResult.success) {
      throw new Error(`Organization creation failed: ${orgResult.error}`);
    }
    Object.assign(resources, orgResult.data);
    job.createdResources = { ...resources };

    // Step 2: Configure N8N webhooks
    console.log('Step 2/5: Configuring N8N webhooks...');
    const n8nResult = await createN8NWorkflow(job);
    if (!n8nResult.success) {
      throw new Error(`N8N configuration failed: ${n8nResult.error}`);
    }
    Object.assign(resources, n8nResult.data);
    job.createdResources = { ...resources };

    // Step 3: Deploy client-specific automations (non-fatal)
    console.log('Step 3/5: Deploying client automations...');
    try {
      const automationResult = await deployAutomations(job);
      if (automationResult.data) {
        Object.assign(resources, automationResult.data);
      }
      job.createdResources = { ...resources };
    } catch (automationError) {
      console.warn('Step 3 warning (non-fatal):', automationError);
    }

    // Step 4: Send onboarding email sequence (non-fatal)
    console.log('Step 4/5: Sending onboarding emails...');
    try {
      const onboardingResult = await sendOnboardingSequence(job);
      if (onboardingResult.data) {
        Object.assign(resources, onboardingResult.data);
      }
      job.createdResources = { ...resources };
    } catch (emailError) {
      console.warn('Step 4 warning (non-fatal):', emailError);
    }

    // Step 5: QA health checks (non-fatal)
    console.log('Step 5/5: Running QA checks...');
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
      console.warn('Step 5 warning (non-fatal):', qaError);
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
