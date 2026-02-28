'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  Mail,
  Share2,
  Palette,
  Bot,
  BarChart3,
  Building2,
  MessageSquare,
  CreditCard,
  Upload,
  Check,
  ChevronRight,
  ChevronLeft,
  Rocket,
  Sparkles,
  ArrowRight,
  Globe,
  Hotel,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BusinessProfile {
  companyName: string
  industry: string
  businessSize: string
  primaryGoal: string
}

interface ModuleConfig {
  crm: { enabled: boolean; importContacts: boolean }
  email: { enabled: boolean; connectDomain: string }
  social: { enabled: boolean }
  content_studio: { enabled: boolean }
  accommodation: { enabled: boolean }
  ai_agents: { enabled: boolean }
}

interface BrandingConfig {
  logoPlaceholder: boolean
  primaryColor: string
  tagline: string
}

interface IntegrationConfig {
  email: boolean
  facebook: boolean
  linkedin: boolean
  whatsapp: boolean
  payfast: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS = [
  { id: 1, label: 'Business Profile' },
  { id: 2, label: 'Modules' },
  { id: 3, label: 'Branding' },
  { id: 4, label: 'Integrations' },
  { id: 5, label: 'Launch' },
] as const

const INDUSTRIES = [
  'Accounting',
  'Hospitality',
  'Real Estate',
  'Professional Services',
  'Retail',
  'Healthcare',
  'Other',
] as const

const BUSINESS_SIZES = [
  { value: '1-5', label: '1-5 employees' },
  { value: '6-20', label: '6-20 employees' },
  { value: '21-50', label: '21-50 employees' },
  { value: '50+', label: '50+ employees' },
] as const

const PRIMARY_GOALS = [
  'Generate Leads',
  'Manage Clients',
  'Automate Marketing',
  'All of the Above',
] as const

type TierType = 'core' | 'growth' | 'scale'

const MODULE_DEFINITIONS: {
  key: keyof ModuleConfig
  name: string
  description: string
  icon: React.ElementType
  minTier: TierType
}[] = [
  {
    key: 'crm',
    name: 'CRM',
    description: 'Manage contacts, companies, and deals with a full pipeline view.',
    icon: Users,
    minTier: 'core',
  },
  {
    key: 'email',
    name: 'Email Marketing',
    description: 'Send campaigns, build sequences, and track engagement metrics.',
    icon: Mail,
    minTier: 'core',
  },
  {
    key: 'social',
    name: 'Social Media',
    description: 'Schedule posts, manage accounts, and analyze performance across platforms.',
    icon: Share2,
    minTier: 'growth',
  },
  {
    key: 'content_studio',
    name: 'Content Studio',
    description: 'Generate AI-powered content for emails, social posts, and campaigns.',
    icon: Palette,
    minTier: 'growth',
  },
  {
    key: 'accommodation',
    name: 'Accommodation',
    description: 'Manage properties, bookings, guests, and inquiries for hospitality.',
    icon: Hotel,
    minTier: 'growth',
  },
  {
    key: 'ai_agents',
    name: 'AI Agents',
    description: 'Automated lead qualification, proposals, and client onboarding.',
    icon: Bot,
    minTier: 'scale',
  },
]

const TIER_LEVELS: Record<TierType, number> = {
  core: 0,
  growth: 1,
  scale: 2,
}

const INTEGRATION_DEFINITIONS = [
  {
    key: 'email' as const,
    name: 'Email (Resend)',
    description: 'Transactional and marketing email delivery.',
    icon: Mail,
    instructions: 'We will connect your domain to Resend for reliable email delivery. You will need to add a DNS record we provide.',
  },
  {
    key: 'facebook' as const,
    name: 'Facebook',
    description: 'Publish posts and track engagement on your Facebook page.',
    icon: Share2,
    instructions: 'Connect your Facebook Business page. We will guide you through the authorization flow after launch.',
  },
  {
    key: 'linkedin' as const,
    name: 'LinkedIn',
    description: 'Share professional content and grow your network presence.',
    icon: Globe,
    instructions: 'Link your LinkedIn company page. OAuth setup will be handled during the configuration phase.',
  },
  {
    key: 'whatsapp' as const,
    name: 'WhatsApp',
    description: 'Send notifications and chat with clients via WhatsApp Business API.',
    icon: MessageSquare,
    instructions: 'We will configure WhatsApp Business API for you. You will need a verified phone number.',
  },
  {
    key: 'payfast' as const,
    name: 'Payments (PayFast)',
    description: 'Accept payments via EFT, card, and instant payment methods.',
    icon: CreditCard,
    instructions: 'Provide your PayFast Merchant ID and Key after launch. We handle the webhook integration.',
  },
]

// ---------------------------------------------------------------------------
// Mock tenant context (in production, read from middleware headers)
// ---------------------------------------------------------------------------

function useTenantContext() {
  return {
    tenantId: 'mock-tenant-id',
    tier: 'growth' as TierType,
    modules: ['crm', 'email', 'social', 'content_studio'],
  }
}

// ---------------------------------------------------------------------------
// Step Components
// ---------------------------------------------------------------------------

function StepWelcome({
  profile,
  onChange,
}: {
  profile: BusinessProfile
  onChange: (p: Partial<BusinessProfile>) => void
}) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Welcome to DraggonnB</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Let us set up your platform in just a few minutes. Tell us about your business so we can tailor the experience.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            placeholder="Your company name"
            value={profile.companyName}
            onChange={(e) => onChange({ companyName: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Select
            value={profile.industry}
            onValueChange={(v) => onChange({ industry: v })}
          >
            <SelectTrigger id="industry">
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((ind) => (
                <SelectItem key={ind} value={ind}>
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessSize">Business Size</Label>
          <Select
            value={profile.businessSize}
            onValueChange={(v) => onChange({ businessSize: v })}
          >
            <SelectTrigger id="businessSize">
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_SIZES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="primaryGoal">Primary Goal</Label>
          <Select
            value={profile.primaryGoal}
            onValueChange={(v) => onChange({ primaryGoal: v })}
          >
            <SelectTrigger id="primaryGoal">
              <SelectValue placeholder="What do you want to achieve?" />
            </SelectTrigger>
            <SelectContent>
              {PRIMARY_GOALS.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

function StepModules({
  modules,
  tier,
  onToggle,
  onConfigChange,
}: {
  modules: ModuleConfig
  tier: TierType
  onToggle: (key: keyof ModuleConfig) => void
  onConfigChange: (key: keyof ModuleConfig, field: string, value: string | boolean) => void
}) {
  const tierLevel = TIER_LEVELS[tier]

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <BarChart3 className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Configure Your Modules</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Enable the tools you need. Your <Badge variant="secondary" className="mx-1 capitalize">{tier}</Badge> plan includes access to the modules shown below.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {MODULE_DEFINITIONS.map((mod) => {
          const Icon = mod.icon
          const available = TIER_LEVELS[mod.minTier] <= tierLevel
          const moduleState = modules[mod.key]
          const enabled = moduleState.enabled

          return (
            <Card
              key={mod.key}
              className={`relative transition-all ${
                !available
                  ? 'opacity-60 border-dashed'
                  : enabled
                  ? 'border-primary/50 shadow-md'
                  : ''
              }`}
            >
              {!available && (
                <Badge className="absolute -top-2 right-3 bg-warning text-warning-foreground text-[10px]">
                  Upgrade
                </Badge>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{mod.name}</CardTitle>
                    </div>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={() => onToggle(mod.key)}
                    disabled={!available}
                    aria-label={`Toggle ${mod.name}`}
                  />
                </div>
                <CardDescription className="mt-1.5">{mod.description}</CardDescription>
              </CardHeader>

              {enabled && mod.key === 'crm' && (
                <CardContent className="pt-0">
                  <Separator className="mb-3" />
                  <div className="flex items-center justify-between">
                    <Label htmlFor="importContacts" className="text-xs text-muted-foreground">
                      Import existing contacts
                    </Label>
                    <Switch
                      id="importContacts"
                      checked={(modules.crm as { enabled: boolean; importContacts: boolean }).importContacts}
                      onCheckedChange={(v) => onConfigChange('crm', 'importContacts', v)}
                    />
                  </div>
                </CardContent>
              )}

              {enabled && mod.key === 'email' && (
                <CardContent className="pt-0">
                  <Separator className="mb-3" />
                  <div className="space-y-1.5">
                    <Label htmlFor="connectDomain" className="text-xs text-muted-foreground">
                      Sending domain
                    </Label>
                    <Input
                      id="connectDomain"
                      placeholder="e.g. mail.yourdomain.co.za"
                      className="h-8 text-sm"
                      value={(modules.email as { enabled: boolean; connectDomain: string }).connectDomain}
                      onChange={(e) =>
                        onConfigChange('email', 'connectDomain', e.target.value)
                      }
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function StepBranding({
  branding,
  companyName,
  onChange,
}: {
  branding: BrandingConfig
  companyName: string
  onChange: (b: Partial<BrandingConfig>) => void
}) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Palette className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Branding & Appearance</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Personalize your platform with your brand identity.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Logo Upload Placeholder */}
          <div className="space-y-2">
            <Label>Company Logo</Label>
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-8 transition-colors hover:border-primary/40 hover:bg-muted/50 cursor-pointer"
              onClick={() => onChange({ logoPlaceholder: true })}
            >
              {branding.logoPlaceholder ? (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Check className="h-4 w-4" />
                  Logo ready (placeholder)
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground/50" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Click to upload logo</p>
                    <p className="text-xs text-muted-foreground">SVG, PNG, or JPG (max 2MB)</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Primary Color */}
          <div className="space-y-2">
            <Label htmlFor="brandColor">Primary Brand Color</Label>
            <div className="flex items-center gap-3">
              <input
                id="brandColor"
                type="color"
                value={branding.primaryColor}
                onChange={(e) => onChange({ primaryColor: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded-md border border-input bg-transparent p-1"
              />
              <Input
                value={branding.primaryColor}
                onChange={(e) => onChange({ primaryColor: e.target.value })}
                className="flex-1 font-mono text-sm"
                placeholder="#000000"
              />
            </div>
          </div>

          {/* Tagline */}
          <div className="space-y-2">
            <Label htmlFor="tagline">Company Tagline</Label>
            <Textarea
              id="tagline"
              placeholder="Your company motto or tagline"
              value={branding.tagline}
              onChange={(e) => onChange({ tagline: e.target.value })}
              rows={2}
            />
          </div>
        </div>

        {/* Preview Card */}
        <div className="space-y-2">
          <Label>Preview</Label>
          <Card className="overflow-hidden">
            <div
              className="h-24 flex items-end px-6 pb-3"
              style={{ backgroundColor: branding.primaryColor }}
            >
              <div className="flex items-center gap-3">
                {branding.logoPlaceholder ? (
                  <div className="h-12 w-12 rounded-lg bg-white/90 flex items-center justify-center text-lg font-bold" style={{ color: branding.primaryColor }}>
                    {(companyName || 'D')[0].toUpperCase()}
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-white/70" />
                  </div>
                )}
                <div>
                  <p className="text-white font-semibold text-lg leading-tight">
                    {companyName || 'Your Company'}
                  </p>
                  {branding.tagline && (
                    <p className="text-white/80 text-xs mt-0.5">{branding.tagline}</p>
                  )}
                </div>
              </div>
            </div>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">
                This is how your brand header will appear across the platform. The color and logo will be used in emails, reports, and the dashboard.
              </p>
              <div className="mt-4 flex gap-2">
                <div
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-white"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  Primary Button
                </div>
                <div
                  className="rounded-md px-3 py-1.5 text-xs font-medium border"
                  style={{ borderColor: branding.primaryColor, color: branding.primaryColor }}
                >
                  Secondary Button
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StepIntegrations({
  integrations,
  onToggle,
}: {
  integrations: IntegrationConfig
  onToggle: (key: keyof IntegrationConfig) => void
}) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <ArrowRight className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Integrations & Automations</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Connect your tools. Toggle on the integrations you want and we will handle the setup.
        </p>
      </div>

      <div className="grid gap-4">
        {INTEGRATION_DEFINITIONS.map((integ) => {
          const Icon = integ.icon
          const active = integrations[integ.key]

          return (
            <Card
              key={integ.key}
              className={`transition-all ${active ? 'border-primary/50 shadow-sm' : ''}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-sm">{integ.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{integ.description}</p>
                      </div>
                      <Switch
                        checked={active}
                        onCheckedChange={() => onToggle(integ.key)}
                        aria-label={`Toggle ${integ.name}`}
                      />
                    </div>
                    {active && (
                      <div className="mt-3 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                        <p>{integ.instructions}</p>
                        <p className="mt-1.5 font-medium text-foreground/70">
                          We will configure this for you after launch.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function StepReview({
  profile,
  modules,
  branding,
  integrations,
  launched,
  onLaunch,
}: {
  profile: BusinessProfile
  modules: ModuleConfig
  branding: BrandingConfig
  integrations: IntegrationConfig
  launched: boolean
  onLaunch: () => void
}) {
  const enabledModules = MODULE_DEFINITIONS.filter((m) => modules[m.key].enabled)
  const enabledIntegrations = INTEGRATION_DEFINITIONS.filter((i) => integrations[i.key])

  if (launched) {
    return (
      <div className="text-center py-12 space-y-6 relative overflow-hidden">
        {/* Confetti animation */}
        <div className="confetti-container" aria-hidden="true">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="confetti-piece" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
              backgroundColor: ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#06b6d4'][i % 6],
            }} />
          ))}
        </div>

        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
          <Check className="h-10 w-10 text-success" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">You are all set!</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your platform is being configured. You will be redirected to your dashboard shortly.
          </p>
        </div>
        <Button size="lg" className="mt-4">
          Go to Dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Rocket className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Review & Launch</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Everything looks good? Review your setup and launch your platform.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Business Profile Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Business Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Company</span>
              <span className="font-medium">{profile.companyName || '--'}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Industry</span>
              <span className="font-medium">{profile.industry || '--'}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size</span>
              <span className="font-medium">{profile.businessSize || '--'}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Goal</span>
              <span className="font-medium">{profile.primaryGoal || '--'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Modules Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Active Modules
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {enabledModules.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {enabledModules.map((m) => {
                  const Icon = m.icon
                  return (
                    <Badge key={m.key} variant="secondary" className="gap-1.5 py-1">
                      <Icon className="h-3 w-3" />
                      {m.name}
                    </Badge>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No modules enabled</p>
            )}
          </CardContent>
        </Card>

        {/* Branding Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              Branding
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Brand Color</span>
              <div className="flex items-center gap-2">
                <div
                  className="h-5 w-5 rounded border"
                  style={{ backgroundColor: branding.primaryColor }}
                />
                <span className="font-mono text-xs">{branding.primaryColor}</span>
              </div>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Logo</span>
              <span className="font-medium">{branding.logoPlaceholder ? 'Uploaded' : 'Not set'}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tagline</span>
              <span className="font-medium truncate max-w-[180px]">{branding.tagline || '--'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Integrations Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              Integrations
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {enabledIntegrations.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {enabledIntegrations.map((i) => {
                  const Icon = i.icon
                  return (
                    <Badge key={i.key} variant="secondary" className="gap-1.5 py-1">
                      <Icon className="h-3 w-3" />
                      {i.name}
                    </Badge>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No integrations enabled</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="text-center pt-4">
        <Button size="lg" onClick={onLaunch} className="gap-2 px-8">
          <Rocket className="h-4 w-4" />
          Launch My Platform
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          You can always change these settings later from the Settings page.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Wizard Page
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const { tier } = useTenantContext()
  const [step, setStep] = useState(1)
  const [launched, setLaunched] = useState(false)

  const [profile, setProfile] = useState<BusinessProfile>({
    companyName: '',
    industry: '',
    businessSize: '',
    primaryGoal: '',
  })

  const [modules, setModules] = useState<ModuleConfig>({
    crm: { enabled: true, importContacts: false },
    email: { enabled: true, connectDomain: '' },
    social: { enabled: false },
    content_studio: { enabled: false },
    accommodation: { enabled: false },
    ai_agents: { enabled: false },
  })

  const [branding, setBranding] = useState<BrandingConfig>({
    logoPlaceholder: false,
    primaryColor: '#1e40af',
    tagline: '',
  })

  const [integrations, setIntegrations] = useState<IntegrationConfig>({
    email: false,
    facebook: false,
    linkedin: false,
    whatsapp: false,
    payfast: false,
  })

  const progressValue = (step / STEPS.length) * 100

  const handleProfileChange = useCallback((partial: Partial<BusinessProfile>) => {
    setProfile((prev) => ({ ...prev, ...partial }))
  }, [])

  const handleBrandingChange = useCallback((partial: Partial<BrandingConfig>) => {
    setBranding((prev) => ({ ...prev, ...partial }))
  }, [])

  const handleModuleToggle = useCallback((key: keyof ModuleConfig) => {
    setModules((prev) => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled },
    }))
  }, [])

  const handleModuleConfigChange = useCallback(
    (key: keyof ModuleConfig, field: string, value: string | boolean) => {
      setModules((prev) => ({
        ...prev,
        [key]: { ...prev[key], [field]: value },
      }))
    },
    []
  )

  const handleIntegrationToggle = useCallback((key: keyof IntegrationConfig) => {
    setIntegrations((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const handleLaunch = useCallback(() => {
    setLaunched(true)
  }, [])

  const canProceed = () => {
    if (step === 1) {
      return profile.companyName.trim().length > 0
    }
    return true
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Setup Wizard</h1>
        <p className="text-muted-foreground mt-1">
          Complete these steps to get your platform ready.
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Step {step} of {STEPS.length}: {STEPS[step - 1].label}
          </span>
          <span className="text-muted-foreground">{Math.round(progressValue)}%</span>
        </div>
        <Progress value={progressValue} className="h-2" />
        <div className="hidden sm:flex items-center justify-between">
          {STEPS.map((s) => (
            <button
              key={s.id}
              onClick={() => !launched && s.id <= step && setStep(s.id)}
              disabled={launched || s.id > step}
              className={`text-xs transition-colors ${
                s.id === step
                  ? 'text-primary font-medium'
                  : s.id < step
                  ? 'text-muted-foreground hover:text-foreground cursor-pointer'
                  : 'text-muted-foreground/40'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="p-6 sm:p-8">
        {step === 1 && (
          <StepWelcome profile={profile} onChange={handleProfileChange} />
        )}
        {step === 2 && (
          <StepModules
            modules={modules}
            tier={tier}
            onToggle={handleModuleToggle}
            onConfigChange={handleModuleConfigChange}
          />
        )}
        {step === 3 && (
          <StepBranding
            branding={branding}
            companyName={profile.companyName}
            onChange={handleBrandingChange}
          />
        )}
        {step === 4 && (
          <StepIntegrations
            integrations={integrations}
            onToggle={handleIntegrationToggle}
          />
        )}
        {step === 5 && (
          <StepReview
            profile={profile}
            modules={modules}
            branding={branding}
            integrations={integrations}
            launched={launched}
            onLaunch={handleLaunch}
          />
        )}
      </Card>

      {/* Navigation */}
      {!launched && (
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          {step < STEPS.length ? (
            <Button
              onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
              disabled={!canProceed()}
              className="gap-1"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <div />
          )}
        </div>
      )}

      {/* Confetti CSS */}
      <style jsx>{`
        .confetti-container {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .confetti-piece {
          position: absolute;
          top: -10px;
          width: 8px;
          height: 8px;
          opacity: 0;
          animation: confetti-fall linear forwards;
        }
        .confetti-piece:nth-child(odd) {
          border-radius: 50%;
        }
        .confetti-piece:nth-child(3n) {
          width: 6px;
          height: 12px;
          border-radius: 2px;
        }
        @keyframes confetti-fall {
          0% {
            opacity: 1;
            transform: translateY(0) rotate(0deg) scale(1);
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(500px) rotate(720deg) scale(0.5);
          }
        }
      `}</style>
    </div>
  )
}
