'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Boxes,
  Loader2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Check,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ModuleInfo {
  id: string
  name: string
  description: string | null
  min_tier: string | null
  is_global_enabled: boolean
  tenant_count: number
}

interface ClientModule {
  id: string
  organization_id: string
  organization_name: string
  module_id: string
  is_enabled: boolean
  config: Record<string, unknown> | null
  updated_at: string
}

function getTierBadge(tier: string | null) {
  switch (tier) {
    case 'core':
      return <Badge variant="secondary">Core+</Badge>
    case 'growth':
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Growth+</Badge>
    case 'scale':
      return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Scale</Badge>
    default:
      return <Badge variant="secondary">Any</Badge>
  }
}

export default function ModulesPage() {
  const [modules, setModules] = useState<ModuleInfo[]>([])
  const [clientModules, setClientModules] = useState<ClientModule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const fetchModules = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/admin/modules')
      if (!res.ok) throw new Error('Failed to fetch modules')
      const data = await res.json()
      setModules(data.modules || [])
      setClientModules(data.client_modules || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load modules')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchModules()
  }, [fetchModules])

  const handleToggle = async (orgId: string, moduleId: string, currentEnabled: boolean) => {
    const key = `${orgId}-${moduleId}`
    setToggling(key)
    try {
      const res = await fetch(`/api/admin/modules/${orgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_id: moduleId, is_enabled: !currentEnabled }),
      })
      if (!res.ok) throw new Error('Failed to toggle module')

      setClientModules((prev) =>
        prev.map((cm) =>
          cm.organization_id === orgId && cm.module_id === moduleId
            ? { ...cm, is_enabled: !currentEnabled }
            : cm
        )
      )
    } catch {
      setError('Failed to toggle module')
    } finally {
      setToggling(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Module Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage platform modules and per-client activations.
          </p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Module Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage platform modules and per-client activations.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Module Registry Grid */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Module Registry</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => (
            <Card key={mod.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                      <Boxes className="h-4 w-4 text-gray-600" />
                    </div>
                    <CardTitle className="text-base">{mod.name}</CardTitle>
                  </div>
                  {getTierBadge(mod.min_tier)}
                </div>
                <CardDescription className="text-xs">
                  {mod.description || 'No description available'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Active tenants</span>
                  <span className="font-semibold">{mod.tenant_count}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  {mod.is_global_enabled ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                      Enabled
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                      Disabled
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Per-Client Module Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Per-Client Module Status</CardTitle>
          <CardDescription>
            Enable or disable modules for individual clients.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientModules.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              No module activations found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Config</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientModules.map((cm) => {
                  const key = `${cm.organization_id}-${cm.module_id}`
                  return (
                    <TableRow key={cm.id}>
                      <TableCell className="font-medium">
                        {cm.organization_name}
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                          {cm.module_id}
                        </code>
                      </TableCell>
                      <TableCell>
                        {cm.is_enabled ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            <Check className="mr-1 h-3 w-3" /> Yes
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100">
                            <X className="mr-1 h-3 w-3" /> No
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {cm.config ? (
                          <code className="block max-w-[200px] truncate rounded bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
                            {JSON.stringify(cm.config)}
                          </code>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {cm.updated_at
                          ? new Date(cm.updated_at).toLocaleDateString()
                          : '--'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleToggle(cm.organization_id, cm.module_id, cm.is_enabled)
                          }
                          disabled={toggling === key}
                          title={cm.is_enabled ? 'Disable module' : 'Enable module'}
                        >
                          {toggling === key ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : cm.is_enabled ? (
                            <ToggleRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
