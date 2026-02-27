import { Octokit } from 'octokit';
import { createClient } from '@supabase/supabase-js';
import { CreatedResources } from '@/lib/provisioning/types';

export const rollbackActions = {
  async organization(organizationId: string): Promise<void> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey || !organizationId) return;

    console.log(`Rolling back: Deleting organization ${organizationId}`);
    try {
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      // CASCADE will delete users, tenant_modules, usage_metrics, etc.
      await supabase.from('organizations').delete().eq('id', organizationId);
    } catch (error) {
      console.error(`Failed to rollback organization: ${error}`);
    }
  },

  async supabase(projectId: string): Promise<void> {
    const token = process.env.SUPABASE_MANAGEMENT_TOKEN;
    if (!token || !projectId) return;

    console.log(`Rolling back: Deleting Supabase project ${projectId}`);
    try {
      await fetch(`https://api.supabase.com/v1/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error(`Failed to rollback Supabase project: ${error}`);
    }
  },

  async github(repoName: string): Promise<void> {
    const token = process.env.GITHUB_TOKEN;
    const org = process.env.GITHUB_ORG;
    if (!token || !org || !repoName) return;

    console.log(`Rolling back: Deleting GitHub repo ${repoName}`);
    try {
      const octokit = new Octokit({ auth: token });
      await octokit.rest.repos.delete({ owner: org, repo: repoName });
    } catch (error) {
      console.error(`Failed to rollback GitHub repo: ${error}`);
    }
  },

  async vercel(projectId: string): Promise<void> {
    const token = process.env.VERCEL_TOKEN;
    const teamId = process.env.VERCEL_TEAM_ID;
    if (!token || !projectId) return;

    const teamQuery = teamId ? `?teamId=${teamId}` : '';
    console.log(`Rolling back: Deleting Vercel project ${projectId}`);
    try {
      await fetch(`https://api.vercel.com/v9/projects/${projectId}${teamQuery}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error(`Failed to rollback Vercel project: ${error}`);
    }
  },

  async n8n(workflowId: string): Promise<void> {
    const apiKey = process.env.N8N_API_KEY;
    const host = process.env.N8N_HOST || 'n8n.srv1114684.hstgr.cloud';
    if (!apiKey || !workflowId) return;

    console.log(`Rolling back: Deleting N8N workflow ${workflowId}`);
    try {
      await fetch(`https://${host}/api/v1/workflows/${workflowId}`, {
        method: 'DELETE',
        headers: { 'X-N8N-API-KEY': apiKey }
      });
    } catch (error) {
      console.error(`Failed to rollback N8N workflow: ${error}`);
    }
  }
};

export async function rollbackProvisioning(resources: CreatedResources): Promise<void> {
  console.log('Starting rollback...');

  // Reverse order: N8N -> Organization (cascades) -> Legacy infra
  if (resources.n8nWorkflowId) {
    await rollbackActions.n8n(resources.n8nWorkflowId);
  }

  // Shared DB rollback (org deletion cascades to users, modules, etc.)
  if (resources.organizationId) {
    await rollbackActions.organization(resources.organizationId);
  }

  // Legacy: per-client infrastructure (for existing pre-migration clients)
  if (resources.vercelProjectId) {
    await rollbackActions.vercel(resources.vercelProjectId);
  }
  if (resources.githubRepoName) {
    await rollbackActions.github(resources.githubRepoName);
  }
  if (resources.supabaseProjectId) {
    await rollbackActions.supabase(resources.supabaseProjectId);
  }

  console.log('Rollback complete');
}
