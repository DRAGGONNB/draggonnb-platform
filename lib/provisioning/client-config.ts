export interface ClientModules {
  crm: boolean;
  email: boolean;
  social: boolean;
  content_studio: boolean;
  accommodation: boolean;
  ai_agents: boolean;
  analytics: boolean;
  restaurant: boolean;
  events: boolean;
  security_ops: boolean;
}

export interface ClientBranding {
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
  company_name: string;
  tagline: string;
}

export interface ClientIntegrations {
  payfast: boolean;
  resend: boolean;
  n8n: boolean;
  facebook: boolean;
  linkedin: boolean;
}

export interface ClientDeployment {
  region: 'us-east-1' | 'eu-west-1' | 'ap-southeast-1';
  custom_domain: string | null;
  supabase_plan: 'free' | 'pro' | 'team';
}

export type Tier = 'core' | 'growth' | 'scale';

export interface ClientConfig {
  client_id: string;
  client_name: string;
  tier: Tier;
  modules: ClientModules;
  branding: ClientBranding;
  integrations: ClientIntegrations;
  deployment: ClientDeployment;
}

const TIER_DEFAULTS: Record<Tier, ClientModules> = {
  core: {
    crm: true,
    email: true,
    social: false,
    content_studio: false,
    accommodation: false,
    ai_agents: false,
    analytics: true,
    restaurant: false,
    events: false,
    security_ops: false,
  },
  growth: {
    crm: true,
    email: true,
    social: true,
    content_studio: true,
    accommodation: false,
    ai_agents: false,
    analytics: true,
    restaurant: false,
    events: false,
    security_ops: false,
  },
  scale: {
    crm: true,
    email: true,
    social: true,
    content_studio: true,
    accommodation: true,
    ai_agents: true,
    analytics: true,
    restaurant: false,
    events: false,
    security_ops: false,
  },
};

const DEFAULT_BRANDING: ClientBranding = {
  primary_color: '#3B82F6',
  secondary_color: '#1E293B',
  logo_url: null,
  company_name: '',
  tagline: '',
};

const DEFAULT_DEPLOYMENT: ClientDeployment = {
  region: 'us-east-1',
  custom_domain: null,
  supabase_plan: 'free',
};

const DEFAULT_INTEGRATIONS: ClientIntegrations = {
  payfast: true,
  resend: true,
  n8n: true,
  facebook: false,
  linkedin: false,
};

export function generateClientConfig(
  clientId: string,
  clientName: string,
  tier: Tier,
  overrides?: {
    modules?: Partial<ClientModules>;
    branding?: Partial<ClientBranding>;
    integrations?: Partial<ClientIntegrations>;
    deployment?: Partial<ClientDeployment>;
  }
): ClientConfig {
  return {
    client_id: clientId,
    client_name: clientName,
    tier,
    modules: { ...TIER_DEFAULTS[tier], ...overrides?.modules },
    branding: { ...DEFAULT_BRANDING, company_name: clientName, ...overrides?.branding },
    integrations: { ...DEFAULT_INTEGRATIONS, ...overrides?.integrations },
    deployment: { ...DEFAULT_DEPLOYMENT, ...overrides?.deployment },
  };
}

export function validateClientConfig(config: ClientConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.client_id) errors.push('client_id is required');
  if (!config.client_name) errors.push('client_name is required');
  if (!['core', 'growth', 'scale'].includes(config.tier)) {
    errors.push(`Invalid tier "${config.tier}". Must be core, growth, or scale`);
  }

  // Core tier must have crm and email
  if (!config.modules.crm) errors.push('CRM module is required for all tiers');
  if (!config.modules.email) errors.push('Email module is required for all tiers');

  // Validate tier-module constraints
  if (config.tier === 'core') {
    if (config.modules.social) errors.push('Social module not available on core tier');
    if (config.modules.content_studio) errors.push('Content Studio not available on core tier');
    if (config.modules.ai_agents) errors.push('AI Agents not available on core tier');
    if (config.modules.accommodation) errors.push('Accommodation not available on core tier');
  }

  if (config.tier === 'growth') {
    if (config.modules.ai_agents) errors.push('AI Agents not available on growth tier');
    if (config.modules.accommodation) errors.push('Accommodation not available on growth tier');
  }

  // Validate branding colors
  const hexPattern = /^#[0-9A-Fa-f]{6}$/;
  if (config.branding.primary_color && !hexPattern.test(config.branding.primary_color)) {
    errors.push('primary_color must be a valid hex color (e.g. #3B82F6)');
  }
  if (config.branding.secondary_color && !hexPattern.test(config.branding.secondary_color)) {
    errors.push('secondary_color must be a valid hex color (e.g. #1E293B)');
  }

  return { valid: errors.length === 0, errors };
}

export function getEnabledModules(config: ClientConfig): string[] {
  return Object.entries(config.modules)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);
}
