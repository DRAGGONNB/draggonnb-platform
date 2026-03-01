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
  supabaseProjectId?: string;
  supabaseProjectRef?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
  supabaseDatabaseUrl?: string;
  githubRepoName?: string;
  githubRepoUrl?: string;
  vercelProjectId?: string;
  vercelDeploymentUrl?: string;
  n8nWorkflowId?: string;
  n8nWebhookUrl?: string;
  automationWorkflowIds?: string;
  onboardingEmailIds?: string;
  qaResult?: string;
  billingSubscriptionId?: string;
}

export interface ProvisioningResult {
  success: boolean;
  step: ProvisioningStep;
  data?: Partial<CreatedResources>;
  error?: string;
}

export type ProvisioningStep =
  | 'supabase-project'
  | 'database-schema'
  | 'github-repo'
  | 'vercel-deployment'
  | 'n8n-webhooks'
  | 'deploy-automations'
  | 'onboarding-sequence'
  | 'qa-check'
  | 'billing-setup'
  | 'register-client'
  | 'finalize';
