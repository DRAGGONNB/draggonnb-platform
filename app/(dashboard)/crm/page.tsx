import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/server'
import { getUserOrg } from '@/lib/auth/get-user-org'
import {
  Users,
  Building2,
  Briefcase,
  ArrowRight,
  Plus,
  TrendingUp,
  UserPlus,
  Calendar,
} from 'lucide-react'
import { CRMPipelineChart } from '@/components/crm/CRMPipelineChart'

interface RecentContact {
  id: string
  first_name: string
  last_name: string
  email: string
  company: string | null
  status: string
  created_at: string
}

interface RecentDeal {
  id: string
  name: string
  value: number
  stage: string
  probability: number
  created_at: string
}

async function getCRMData(organizationId: string) {
  const supabase = await createClient()

  try {
    const contactsCountQuery = supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    const companiesCountQuery = supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    const dealsQuery = supabase
      .from('deals')
      .select('id, name, value, stage, probability, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    const recentContactsQuery = supabase
      .from('contacts')
      .select('id, first_name, last_name, email, company, status, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(5)

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const newContactsQuery = supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', weekAgo.toISOString())

    const [
      { count: contactsCount },
      { count: companiesCount },
      { data: allDeals },
      { data: recentContacts },
      { count: newContactsCount },
    ] = await Promise.all([
      contactsCountQuery,
      companiesCountQuery,
      dealsQuery,
      recentContactsQuery,
      newContactsQuery,
    ])

    const deals = (allDeals || []) as RecentDeal[]
    const activeDeals = deals.filter((d) => !['won', 'lost'].includes(d.stage))
    const pipelineValue = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0)

    const stageData = [
      { stage: 'Lead', count: deals.filter((d) => d.stage === 'lead').length, value: deals.filter((d) => d.stage === 'lead').reduce((s, d) => s + (d.value || 0), 0) },
      { stage: 'Qualified', count: deals.filter((d) => d.stage === 'qualified').length, value: deals.filter((d) => d.stage === 'qualified').reduce((s, d) => s + (d.value || 0), 0) },
      { stage: 'Proposal', count: deals.filter((d) => d.stage === 'proposal').length, value: deals.filter((d) => d.stage === 'proposal').reduce((s, d) => s + (d.value || 0), 0) },
      { stage: 'Negotiation', count: deals.filter((d) => d.stage === 'negotiation').length, value: deals.filter((d) => d.stage === 'negotiation').reduce((s, d) => s + (d.value || 0), 0) },
      { stage: 'Won', count: deals.filter((d) => d.stage === 'won').length, value: deals.filter((d) => d.stage === 'won').reduce((s, d) => s + (d.value || 0), 0) },
      { stage: 'Lost', count: deals.filter((d) => d.stage === 'lost').length, value: deals.filter((d) => d.stage === 'lost').reduce((s, d) => s + (d.value || 0), 0) },
    ]

    return {
      contacts: contactsCount || 0,
      companies: companiesCount || 0,
      deals: activeDeals.length,
      pipelineValue,
      newContacts: newContactsCount || 0,
      recentContacts: (recentContacts || []) as RecentContact[],
      recentDeals: deals.slice(0, 5) as RecentDeal[],
      stageData,
    }
  } catch (error) {
    console.error('CRM data fetch error:', error)
    return {
      contacts: 0,
      companies: 0,
      deals: 0,
      pipelineValue: 0,
      newContacts: 0,
      recentContacts: [] as RecentContact[],
      recentDeals: [] as RecentDeal[],
      stageData: [
        { stage: 'Lead', count: 0, value: 0 },
        { stage: 'Qualified', count: 0, value: 0 },
        { stage: 'Proposal', count: 0, value: 0 },
        { stage: 'Negotiation', count: 0, value: 0 },
        { stage: 'Won', count: 0, value: 0 },
        { stage: 'Lost', count: 0, value: 0 },
      ],
    }
  }
}

const STAGE_COLORS: Record<string, string> = {
  lead: 'bg-gray-100 text-gray-700',
  qualified: 'bg-blue-100 text-blue-700',
  proposal: 'bg-yellow-100 text-yellow-700',
  negotiation: 'bg-orange-100 text-orange-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
}

const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  lead: 'bg-blue-50 text-blue-700',
  customer: 'bg-purple-50 text-purple-700',
}

export default async function CRMPage() {
  const { data: userOrg, error } = await getUserOrg()

  if (error || !userOrg) {
    console.error('getUserOrg failed on CRM page:', error)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-800">Unable to load CRM</h2>
          <p className="mt-2 text-sm text-red-600">
            {error === 'User not found' || error === 'No organization found for user'
              ? 'Your account setup is incomplete. Please contact support or try signing out and back in.'
              : 'There was a problem loading your account data. Please try refreshing the page.'}
          </p>
          <div className="mt-4 flex gap-3 justify-center">
            <a
              href="/api/auth/signout"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Sign Out & Retry
            </a>
          </div>
        </div>
      </div>
    )
  }

  const stats = await getCRMData(userOrg.organizationId)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM Overview</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your contacts, companies, and sales pipeline
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/crm/contacts?action=new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4" />
            Add Contact
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

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/crm/contacts" className="group">
          <Card className="shadow-sm transition-shadow group-hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Contacts</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{stats.contacts}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              {stats.newContacts > 0 && (
                <div className="mt-3 flex items-center text-xs">
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                  <span className="font-medium text-green-600">+{stats.newContacts} this week</span>
                </div>
              )}
              <div className="mt-2 flex items-center text-xs font-medium text-primary group-hover:underline">
                View contacts <ArrowRight className="ml-1 h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/crm/companies" className="group">
          <Card className="shadow-sm transition-shadow group-hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Companies</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{stats.companies}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50">
                  <Building2 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-5 flex items-center text-xs font-medium text-primary group-hover:underline">
                View companies <ArrowRight className="ml-1 h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/crm/deals" className="group">
          <Card className="shadow-sm transition-shadow group-hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active Deals</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{stats.deals}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50">
                  <Briefcase className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                R{stats.pipelineValue.toLocaleString()} in pipeline
              </div>
              <div className="mt-2 flex items-center text-xs font-medium text-primary group-hover:underline">
                View deals <ArrowRight className="ml-1 h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Pipeline Chart */}
      <CRMPipelineChart stageData={stats.stageData} />

      {/* Recent Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Contacts */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-900">
                Recent Contacts
              </CardTitle>
              <Link
                href="/crm/contacts"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats.recentContacts.length > 0 ? (
              <div className="divide-y">
                {stats.recentContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                      {contact.first_name?.[0]}{contact.last_name?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {contact.first_name} {contact.last_name}
                      </p>
                      <p className="truncate text-xs text-gray-500">{contact.email}</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={STATUS_COLORS[contact.status] || STATUS_COLORS.active}
                    >
                      {contact.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">No contacts yet</p>
                <p className="text-xs text-gray-400">Add your first contact to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Deals */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-900">
                Recent Deals
              </CardTitle>
              <Link
                href="/crm/deals"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats.recentDeals.length > 0 ? (
              <div className="divide-y">
                {stats.recentDeals.map((deal) => (
                  <div key={deal.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                      <Briefcase className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{deal.name}</p>
                      <p className="text-xs text-gray-500">R{deal.value?.toLocaleString() || '0'}</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={STAGE_COLORS[deal.stage] || STAGE_COLORS.lead}
                    >
                      {STAGE_LABELS[deal.stage] || deal.stage}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Briefcase className="mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">No deals yet</p>
                <p className="text-xs text-gray-400">Create a deal to track your pipeline</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
