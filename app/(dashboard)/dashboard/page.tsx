import { createClient } from '@/lib/supabase/server'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  Briefcase,
  Mail,
  FileText,
  Plus,
  ArrowRight,
  UserPlus,
  Send,
  BarChart3,
  Sparkles,
  CheckCircle2,
  XCircle,
  Calendar,
  TrendingUp,
  Building2,
  Globe,
  Bot,
  Layers,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'

async function getDashboardData(organizationId: string) {
  const supabase = await createClient()

  const usageQuery = supabase
    .from('client_usage_metrics')
    .select('*')
    .eq('organization_id', organizationId)
    .order('metric_date', { ascending: false })
    .limit(1)
    .single()

  const contactsQuery = supabase
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  const dealsQuery = supabase
    .from('deals')
    .select('value, stage')
    .eq('organization_id', organizationId)

  const postsQuery = supabase
    .from('social_posts')
    .select('id, content, status, created_at, platform')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(5)

  const [
    { data: usageData },
    { count: contactsCount },
    { data: deals },
    { data: recentPosts },
  ] = await Promise.all([usageQuery, contactsQuery, dealsQuery, postsQuery])

  const activeDeals = deals?.filter((d) => !['won', 'lost'].includes(d.stage)) || []

  return {
    usage: usageData,
    contactsCount: contactsCount || 0,
    deals: deals || [],
    activeDeals,
    recentPosts: recentPosts || [],
  }
}

export default async function DashboardPage() {
  const { data: userOrg, error } = await getUserOrg()

  if (error || !userOrg) {
    redirect('/login')
  }

  const data = await getDashboardData(userOrg.organizationId)

  const contactsCount = data.contactsCount
  const activeDealsCount = data.activeDeals.length
  const emailsSent = data.usage?.posts_published || 0
  const contentGenerated = data.usage?.ai_generations_count || 0
  const pipelineValue = data.activeDeals.reduce((sum, d) => sum + (d.value || 0), 0)
  const wonDeals = data.deals.filter((d) => d.stage === 'won')
  const totalWonValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0)

  const today = new Date()
  const dateString = today.toLocaleDateString('en-ZA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const modules = [
    { name: 'CRM', href: '/crm', icon: Users, active: true, description: 'Contacts, deals & companies' },
    { name: 'Email Hub', href: '/email', icon: Mail, active: true, description: 'Campaigns & sequences' },
    { name: 'Content Studio', href: '/content-generator', icon: Sparkles, active: true, description: 'AI-powered content' },
    { name: 'Social', href: '/settings/social', icon: Globe, active: true, description: 'Social media management' },
    { name: 'Accommodation', href: '/accommodation', icon: Building2, active: true, description: 'Property management' },
    { name: 'AI Agents', href: '/autopilot', icon: Bot, active: true, description: 'Automated workflows' },
  ]

  const quickActions = [
    { label: 'New Contact', href: '/crm/contacts?action=new', icon: UserPlus, color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
    { label: 'New Deal', href: '/crm/deals?action=new', icon: Briefcase, color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
    { label: 'Send Email', href: '/email/campaigns', icon: Send, color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
    { label: 'Generate Content', href: '/content-generator', icon: Sparkles, color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
    { label: 'View Reports', href: '/email/analytics', icon: BarChart3, color: 'bg-rose-50 text-rose-600 hover:bg-rose-100' },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {userOrg.fullName?.split(' ')[0] || 'there'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{dateString}</p>
          </div>
          <div className="mt-3 flex items-center gap-3 sm:mt-0">
            <Link
              href="/crm/contacts?action=new"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Contact
            </Link>
            <Link
              href="/crm/deals?action=new"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              New Deal
            </Link>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Contacts</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{contactsCount}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-xs text-gray-500">
              <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              <span className="font-medium text-green-600">In your CRM</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Deals</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{activeDealsCount}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50">
                <Briefcase className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-xs text-gray-500">
              <span>R{pipelineValue.toLocaleString()} pipeline value</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Posts Published</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{emailsSent}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-purple-50">
                <Mail className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-xs text-gray-500">
              <span>This month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Content Generated</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{contentGenerated}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-xs text-gray-500">
              <span>AI generations this month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Quick Actions */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {quickActions.map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className={`flex flex-col items-center gap-2 rounded-lg p-4 text-center transition-colors ${action.color}`}
                  >
                    <action.icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{action.label}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Summary */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-gray-900">Pipeline Summary</CardTitle>
                <Link
                  href="/crm/deals"
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
                {[
                  { label: 'Lead', count: data.deals.filter((d) => d.stage === 'lead').length, color: 'bg-gray-100 text-gray-700' },
                  { label: 'Qualified', count: data.deals.filter((d) => d.stage === 'qualified').length, color: 'bg-blue-100 text-blue-700' },
                  { label: 'Proposal', count: data.deals.filter((d) => d.stage === 'proposal').length, color: 'bg-yellow-100 text-yellow-700' },
                  { label: 'Negotiation', count: data.deals.filter((d) => d.stage === 'negotiation').length, color: 'bg-orange-100 text-orange-700' },
                  { label: 'Won', count: data.deals.filter((d) => d.stage === 'won').length, color: 'bg-green-100 text-green-700' },
                  { label: 'Lost', count: data.deals.filter((d) => d.stage === 'lost').length, color: 'bg-red-100 text-red-700' },
                ].map((stage) => (
                  <div key={stage.label} className="text-center">
                    <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${stage.color}`}>
                      {stage.count}
                    </div>
                    <p className="text-xs font-medium text-gray-600">{stage.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div className="text-sm">
                  <span className="text-gray-500">Total pipeline: </span>
                  <span className="font-semibold text-gray-900">R{pipelineValue.toLocaleString()}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Won value: </span>
                  <span className="font-semibold text-green-600">R{totalWonValue.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Posts Preview */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-gray-900">Recent Content</CardTitle>
                <Link
                  href="/content-generator"
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {data.recentPosts.length > 0 ? (
                <div className="divide-y">
                  {data.recentPosts.map((post) => (
                    <div key={post.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                        <FileText className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {post.content?.substring(0, 60) || 'Untitled Post'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(post.created_at).toLocaleDateString('en-ZA')}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={
                          post.status === 'published'
                            ? 'bg-green-50 text-green-700 hover:bg-green-50'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-100'
                        }
                      >
                        {post.status || 'draft'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">No content yet</p>
                  <p className="text-xs text-gray-400">Create content to see it here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Usage This Month */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900">Usage This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="text-gray-600">Posts Published</span>
                    <span className="font-medium text-gray-900">
                      {data.usage?.posts_published || 0} / 30
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${Math.min(((data.usage?.posts_published || 0) / 30) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="text-gray-600">AI Generations</span>
                    <span className="font-medium text-gray-900">
                      {data.usage?.ai_generations_count || 0} / 50
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all"
                      style={{
                        width: `${Math.min(((data.usage?.ai_generations_count || 0) / 50) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Activity */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900">Team Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed />
            </CardContent>
          </Card>

          {/* Module Status */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-gray-900">Modules</CardTitle>
                <Layers className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {modules.map((mod) => (
                  <Link
                    key={mod.name}
                    href={mod.href}
                    className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100">
                      <mod.icon className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{mod.name}</p>
                      <p className="truncate text-xs text-gray-500">{mod.description}</p>
                    </div>
                    {mod.active ? (
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 flex-shrink-0 text-gray-300" />
                    )}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
