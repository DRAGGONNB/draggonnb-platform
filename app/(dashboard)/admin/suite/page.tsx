import { getUserOrg } from '@/lib/auth/get-user-org'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default async function BusinessSuitePage() {
  const { data: userOrg, error } = await getUserOrg()

  if (error || !userOrg) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Business Suite</h1>
        <Card>
          <CardContent className="py-12 text-center text-sm text-red-600">
            {error || 'Unable to load user information. Please sign in again.'}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!['owner', 'admin'].includes(userOrg.role)) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Business Suite</h1>
        <Card>
          <CardContent className="py-12 text-center text-sm text-gray-500">
            You do not have permission to view this page.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Business Suite</h1>
        <p className="mt-1 text-sm text-gray-500">
          Platform overview and key performance indicators.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Revenue (MRR)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">R0</p>
            <p className="mt-1 text-xs text-gray-400">Monthly recurring revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Active Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">--</p>
            <p className="mt-1 text-xs text-gray-400">Organizations on platform</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">--</p>
            <p className="mt-1 text-xs text-gray-400">Across all clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">--%</p>
            <p className="mt-1 text-xs text-gray-400">Lead to client conversion</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-400">Chart coming soon</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Client Distribution by Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-400">Chart coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                <span className="text-sm text-green-600">+</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Platform initialized</p>
                <p className="text-xs text-gray-500">DraggonnB OS is live and operational</p>
              </div>
              <Badge variant="secondary" className="text-xs">System</Badge>
            </div>
            <div className="py-6 text-center text-sm text-gray-400">
              Activity feed will populate as clients are provisioned and modules activated.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Link
              href="/admin/clients"
              className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-gray-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <span className="text-lg">+</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Provision Client</p>
                <p className="text-xs text-gray-500">Add a new organization</p>
              </div>
            </Link>
            <Link
              href="/crm"
              className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-gray-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <span className="text-lg">@</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">View Leads</p>
                <p className="text-xs text-gray-500">Check CRM pipeline</p>
              </div>
            </Link>
            <Link
              href="/admin/pricing"
              className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-gray-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <span className="text-lg">#</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Pricing Matrix</p>
                <p className="text-xs text-gray-500">View tier comparison</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
