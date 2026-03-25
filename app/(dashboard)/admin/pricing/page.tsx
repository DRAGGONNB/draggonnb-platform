import { getUserOrg } from '@/lib/auth/get-user-org'
import { TIER_LIMITS } from '@/lib/tier/feature-gate'
import type { Feature } from '@/lib/tier/feature-gate'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Feature definitions for the pricing matrix
const FEATURE_MIN_TIER: Record<Feature, string> = {
  social_posts: 'core',
  ai_generations: 'core',
  email_sends: 'core',
  social_accounts: 'core',
  team_users: 'core',
  custom_automations: 'core',
  ab_testing: 'growth',
  smart_segmentation: 'growth',
  lead_pipeline: 'growth',
  advanced_analytics: 'growth',
  white_label: 'scale',
  ai_agents: 'core',
  business_autopilot: 'core',
  api_access: 'scale',
  custom_integrations: 'scale',
  accommodation_module: 'growth',
  restaurant_module: 'growth',
  events_module: 'growth',
  security_ops_module: 'core',
}

const TIER_HIERARCHY: Record<string, number> = {
  core: 1,
  growth: 2,
  scale: 3,
}

type FeatureCategory = {
  name: string
  features: {
    label: string
    core: string
    growth: string
    scale: string
  }[]
}

const categories: FeatureCategory[] = [
  {
    name: 'Core Features',
    features: [
      {
        label: 'Social Posts / Month',
        core: `${TIER_LIMITS.core.social_posts}`,
        growth: `${TIER_LIMITS.growth.social_posts}`,
        scale: 'Unlimited',
      },
      {
        label: 'AI Generations / Month',
        core: `${TIER_LIMITS.core.ai_generations}`,
        growth: `${TIER_LIMITS.growth.ai_generations}`,
        scale: 'Unlimited',
      },
      {
        label: 'Email Sends / Month',
        core: `${TIER_LIMITS.core.email_sends.toLocaleString()}`,
        growth: `${TIER_LIMITS.growth.email_sends.toLocaleString()}`,
        scale: 'Unlimited',
      },
      {
        label: 'Social Accounts',
        core: checkAccess('social_accounts', 'core'),
        growth: checkAccess('social_accounts', 'growth'),
        scale: checkAccess('social_accounts', 'scale'),
      },
      {
        label: 'Team Users',
        core: checkAccess('team_users', 'core'),
        growth: checkAccess('team_users', 'growth'),
        scale: checkAccess('team_users', 'scale'),
      },
    ],
  },
  {
    name: 'Usage Limits',
    features: [
      {
        label: 'Agent Invocations / Month',
        core: `${TIER_LIMITS.core.agent_invocations}`,
        growth: `${TIER_LIMITS.growth.agent_invocations}`,
        scale: `${TIER_LIMITS.scale.agent_invocations.toLocaleString()}`,
      },
      {
        label: 'Autopilot Runs / Month',
        core: `${TIER_LIMITS.core.autopilot_runs}`,
        growth: `${TIER_LIMITS.growth.autopilot_runs}`,
        scale: 'Unlimited',
      },
      {
        label: 'Custom Automations',
        core: '1',
        growth: '3+',
        scale: 'Unlimited',
      },
    ],
  },
  {
    name: 'Advanced Features',
    features: [
      {
        label: 'A/B Testing',
        core: checkAccess('ab_testing', 'core'),
        growth: checkAccess('ab_testing', 'growth'),
        scale: checkAccess('ab_testing', 'scale'),
      },
      {
        label: 'Smart Segmentation',
        core: checkAccess('smart_segmentation', 'core'),
        growth: checkAccess('smart_segmentation', 'growth'),
        scale: checkAccess('smart_segmentation', 'scale'),
      },
      {
        label: 'Lead Pipeline',
        core: checkAccess('lead_pipeline', 'core'),
        growth: checkAccess('lead_pipeline', 'growth'),
        scale: checkAccess('lead_pipeline', 'scale'),
      },
      {
        label: 'Advanced Analytics',
        core: checkAccess('advanced_analytics', 'core'),
        growth: checkAccess('advanced_analytics', 'growth'),
        scale: checkAccess('advanced_analytics', 'scale'),
      },
      {
        label: 'AI Agents',
        core: checkAccess('ai_agents', 'core'),
        growth: checkAccess('ai_agents', 'growth'),
        scale: checkAccess('ai_agents', 'scale'),
      },
      {
        label: 'Business Autopilot',
        core: checkAccess('business_autopilot', 'core'),
        growth: checkAccess('business_autopilot', 'growth'),
        scale: checkAccess('business_autopilot', 'scale'),
      },
      {
        label: 'Accommodation Module',
        core: checkAccess('accommodation_module', 'core'),
        growth: checkAccess('accommodation_module', 'growth'),
        scale: checkAccess('accommodation_module', 'scale'),
      },
    ],
  },
  {
    name: 'Enterprise Features',
    features: [
      {
        label: 'White Label',
        core: checkAccess('white_label', 'core'),
        growth: checkAccess('white_label', 'growth'),
        scale: checkAccess('white_label', 'scale'),
      },
      {
        label: 'API Access',
        core: checkAccess('api_access', 'core'),
        growth: checkAccess('api_access', 'growth'),
        scale: checkAccess('api_access', 'scale'),
      },
      {
        label: 'Custom Integrations',
        core: checkAccess('custom_integrations', 'core'),
        growth: checkAccess('custom_integrations', 'growth'),
        scale: checkAccess('custom_integrations', 'scale'),
      },
    ],
  },
]

function checkAccess(feature: Feature, tier: string): string {
  const requiredTier = FEATURE_MIN_TIER[feature]
  const tierLevel = TIER_HIERARCHY[tier] || 0
  const requiredLevel = TIER_HIERARCHY[requiredTier] || 0
  return tierLevel >= requiredLevel ? 'yes' : 'no'
}

function FeatureCell({ value }: { value: string }) {
  if (value === 'yes') {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    )
  }
  if (value === 'no') {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    )
  }
  return <span className="text-sm font-medium text-gray-900">{value}</span>
}

export default async function PricingMatrixPage() {
  const { data: userOrg, error } = await getUserOrg()

  if (error || !userOrg) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Pricing Matrix</h1>
        <Card>
          <CardContent className="py-12 text-center text-sm text-red-600">
            {error || 'Unable to load user information. Please sign in again.'}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tier Comparison Matrix</h1>
        <p className="mt-1 text-sm text-gray-500">
          Full feature and limit comparison across subscription tiers.
        </p>
      </div>

      {/* Tier Header Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-gray-200">
          <CardHeader className="pb-2 text-center">
            <Badge variant="secondary" className="mx-auto mb-2 w-fit">Core</Badge>
            <CardTitle className="text-2xl">R1,500<span className="text-sm font-normal text-gray-500">/mo</span></CardTitle>
          </CardHeader>
          <CardContent className="text-center text-xs text-gray-500">
            Essential tools for small businesses
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-2 text-center">
            <Badge className="mx-auto mb-2 w-fit bg-blue-100 text-blue-700 hover:bg-blue-100">Growth</Badge>
            <CardTitle className="text-2xl">R3,500<span className="text-sm font-normal text-gray-500">/mo</span></CardTitle>
          </CardHeader>
          <CardContent className="text-center text-xs text-gray-500">
            Advanced features for scaling teams
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader className="pb-2 text-center">
            <Badge className="mx-auto mb-2 w-fit bg-purple-100 text-purple-700 hover:bg-purple-100">Scale</Badge>
            <CardTitle className="text-2xl">R7,500<span className="text-sm font-normal text-gray-500">/mo</span></CardTitle>
          </CardHeader>
          <CardContent className="text-center text-xs text-gray-500">
            Unlimited power for enterprise needs
          </CardContent>
        </Card>
      </div>

      {/* Feature Matrix */}
      {categories.map((category) => (
        <Card key={category.name}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{category.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-left text-sm font-medium text-gray-500">Feature</th>
                    <th className="pb-3 text-center text-sm font-medium text-gray-500">Core</th>
                    <th className="pb-3 text-center text-sm font-medium text-blue-600">Growth</th>
                    <th className="pb-3 text-center text-sm font-medium text-purple-600">Scale</th>
                  </tr>
                </thead>
                <tbody>
                  {category.features.map((feature) => (
                    <tr key={feature.label} className="border-b last:border-b-0">
                      <td className="py-3 text-sm text-gray-700">{feature.label}</td>
                      <td className="py-3 text-center">
                        <FeatureCell value={feature.core} />
                      </td>
                      <td className="py-3 text-center">
                        <FeatureCell value={feature.growth} />
                      </td>
                      <td className="py-3 text-center">
                        <FeatureCell value={feature.scale} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
