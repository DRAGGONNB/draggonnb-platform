import { ClientConfig } from './client-config';

export interface ProvisioningJob {
  clientId: string;
  clientName: string;
  orgEmail: string;
  tier: 'starter' | 'professional' | 'enterprise' | 'core' | 'growth' | 'scale';
  clientConfig?: ClientConfig;
  createdResources?: CreatedResources;
}

export interface CreatedResources {
  // Shared DB provisioning (new)
  organizationId?: string;
  subdomain?: string;

  // Legacy: per-client Supabase (kept for backwards compat)
  supabaseProjectId?: string;
  supabaseProjectRef?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
  supabaseDatabaseUrl?: string;
  githubRepoName?: string;
  githubRepoUrl?: string;
  vercelProjectId?: string;
  vercelDeploymentUrl?: string;

  // Active: N8N + automations + onboarding
  n8nWorkflowId?: string;
  n8nWebhookUrl?: string;
  automationWorkflowIds?: string;
  onboardingEmailIds?: string;
  qaResult?: string;
}

export interface ProvisioningResult {
  success: boolean;
  step: ProvisioningStep;
  data?: Partial<CreatedResources>;
  error?: string;
}

export type ProvisioningStep =
  | 'create-org'
  | 'supabase-project'
  | 'database-schema'
  | 'github-repo'
  | 'vercel-deployment'
  | 'n8n-webhooks'
  | 'deploy-automations'
  | 'onboarding-sequence'
  | 'qa-check'
  | 'register-client'
  | 'finalize';
