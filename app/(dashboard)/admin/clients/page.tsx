'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Users,
  Search,
  Plus,
  Eye,
  Settings,
  Loader2,
  AlertCircle,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Client {
  id: string
  name: string
  subdomain: string | null
  tier: string
  status: string
  users: number
  modules: number
  created_at: string
}

const TIER_FILTERS = ['All', 'core', 'growth', 'scale'] as const

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
    case 'trial':
    case 'pending':
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Pending</Badge>
    case 'suspended':
    case 'cancelled':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Suspended</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getTierBadge(tier: string) {
  switch (tier) {
    case 'core':
    case 'starter':
      return <Badge variant="secondary">Core</Badge>
    case 'growth':
    case 'professional':
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Growth</Badge>
    case 'scale':
    case 'enterprise':
      return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Scale</Badge>
    default:
      return <Badge variant="secondary">{tier}</Badge>
  }
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<string>('All')

  const fetchClients = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/admin/clients')
      if (!res.ok) throw new Error('Failed to fetch clients')
      const data = await res.json()
      setClients(data.clients || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const filtered = clients.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.subdomain && c.subdomain.toLowerCase().includes(search.toLowerCase()))

    const matchTier =
      tierFilter === 'All' ||
      c.tier === tierFilter ||
      (tierFilter === 'core' && c.tier === 'starter') ||
      (tierFilter === 'growth' && c.tier === 'professional') ||
      (tierFilter === 'scale' && c.tier === 'enterprise')

    return matchSearch && matchTier
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage all organizations on the platform.
          </p>
        </div>
        <Button size="sm" className="bg-red-600 hover:bg-red-700">
          <Plus className="mr-2 h-4 w-4" />
          Provision New Client
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Clients</p>
              <p className="text-2xl font-bold">{clients.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold">
                {clients.filter((c) => c.status === 'active').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
              <Users className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Trial/Pending</p>
              <p className="text-2xl font-bold">
                {clients.filter((c) => ['trial', 'pending'].includes(c.status)).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-2xl font-bold">
                {clients.reduce((sum, c) => sum + c.users, 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg">Organizations</CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by name or subdomain..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64 pl-10"
              />
            </div>
            <div className="flex gap-1">
              {TIER_FILTERS.map((tier) => (
                <Button
                  key={tier}
                  variant={tierFilter === tier ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTierFilter(tier)}
                  className={tierFilter === tier ? 'bg-gray-900' : ''}
                >
                  {tier === 'All' ? 'All' : tier.charAt(0).toUpperCase() + tier.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              {search || tierFilter !== 'All'
                ? 'No clients match your filters.'
                : 'No clients found.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Subdomain</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Modules</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>
                      {client.subdomain ? (
                        <code className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                          {client.subdomain}.draggonnb.co.za
                        </code>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </TableCell>
                    <TableCell>{getTierBadge(client.tier)}</TableCell>
                    <TableCell>
                      <span className="text-sm">{client.modules}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{client.users}</span>
                    </TableCell>
                    <TableCell>{getStatusBadge(client.status)}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(client.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Edit Modules">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
