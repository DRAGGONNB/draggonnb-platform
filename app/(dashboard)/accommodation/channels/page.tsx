'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Globe, Loader2, RefreshCw, Settings, Plus, Trash2,
  CheckCircle, AlertCircle, Clock, ExternalLink, Copy, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Unit {
  id: string
  name: string
  type: string
  property_name: string
}

interface ChannelFeed {
  source: string
  feed_url: string
  label?: string
  last_synced_at?: string
  last_sync_result?: {
    imported: number
    conflicts: number
    errors: string[]
  }
}

interface UnitSyncStatus {
  unit_id: string
  unit_name: string
  property_name: string
  feeds: ChannelFeed[]
  ical_export_url: string
}

const SOURCE_LABELS: Record<string, string> = {
  booking_com: 'Booking.com',
  airbnb: 'Airbnb',
  other: 'Other OTA',
}

const SOURCE_COLORS: Record<string, string> = {
  booking_com: 'bg-blue-100 text-blue-700',
  airbnb: 'bg-rose-100 text-rose-700',
  other: 'bg-gray-100 text-gray-700',
}

export default function ChannelManagerPage() {
  const [units, setUnits] = useState<Unit[]>([])
  const [syncStatuses, setSyncStatuses] = useState<UnitSyncStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [syncAllRunning, setSyncAllRunning] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Configure feed state
  const [configUnit, setConfigUnit] = useState<string | null>(null)
  const [newFeedSource, setNewFeedSource] = useState('booking_com')
  const [newFeedUrl, setNewFeedUrl] = useState('')
  const [newFeedLabel, setNewFeedLabel] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchUnits = useCallback(async () => {
    try {
      const res = await fetch('/api/accommodation/units')
      if (res.status === 403) {
        setError('Accommodation module requires Growth tier or above.')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setUnits(data.units || [])
      }
    } catch {
      setError('Failed to load units')
    }
  }, [])

  const fetchSyncStatuses = useCallback(async () => {
    try {
      const res = await fetch('/api/accommodation/channel-sync')
      if (res.ok) {
        const data = await res.json()
        setSyncStatuses(data.units || [])
      }
    } catch {
      // non-fatal
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchUnits(), fetchSyncStatuses()]).finally(() => setLoading(false))
  }, [fetchUnits, fetchSyncStatuses])

  const syncUnit = async (unitId: string) => {
    setSyncing(unitId)
    try {
      const res = await fetch(`/api/accommodation/channel-sync/${unitId}`, { method: 'POST' })
      if (res.ok) {
        await fetchSyncStatuses()
      } else {
        const data = await res.json()
        setError(data.error || 'Sync failed')
      }
    } catch {
      setError('Sync failed')
    } finally {
      setSyncing(null)
    }
  }

  const syncAll = async () => {
    setSyncAllRunning(true)
    try {
      const res = await fetch('/api/accommodation/channel-sync', { method: 'POST' })
      if (res.ok) {
        await fetchSyncStatuses()
      } else {
        const data = await res.json()
        setError(data.error || 'Sync failed')
      }
    } catch {
      setError('Sync all failed')
    } finally {
      setSyncAllRunning(false)
    }
  }

  const addFeed = async () => {
    if (!configUnit || !newFeedUrl.trim()) return
    setSaving(true)
    try {
      // Get existing feeds for this unit
      const statusRes = await fetch(`/api/accommodation/channel-sync/${configUnit}`)
      let existingFeeds: ChannelFeed[] = []
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        existingFeeds = statusData.feeds || []
      }

      const updatedFeeds = [
        ...existingFeeds,
        {
          source: newFeedSource,
          feed_url: newFeedUrl.trim(),
          label: newFeedLabel.trim() || undefined,
        },
      ]

      const res = await fetch(`/api/accommodation/channel-sync/${configUnit}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeds: updatedFeeds }),
      })

      if (res.ok) {
        setNewFeedUrl('')
        setNewFeedLabel('')
        setConfigUnit(null)
        await fetchSyncStatuses()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to add feed')
      }
    } catch {
      setError('Failed to add feed')
    } finally {
      setSaving(false)
    }
  }

  const removeFeed = async (unitId: string, feedIndex: number) => {
    try {
      const statusRes = await fetch(`/api/accommodation/channel-sync/${unitId}`)
      if (!statusRes.ok) return
      const statusData = await statusRes.json()
      const feeds = (statusData.feeds || []).filter((_: ChannelFeed, i: number) => i !== feedIndex)

      const res = await fetch(`/api/accommodation/channel-sync/${unitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeds }),
      })

      if (res.ok) {
        await fetchSyncStatuses()
      }
    } catch {
      setError('Failed to remove feed')
    }
  }

  const copyExportUrl = async (unitId: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    setCopiedId(unitId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatSyncTime = (isoStr?: string): string => {
    if (!isoStr) return 'Never'
    const d = new Date(isoStr)
    const now = new Date()
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000)
    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`
    return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="h-8 w-8 text-primary" />
            Channel Manager
          </h1>
          <p className="text-muted-foreground mt-2">
            Sync availability with Booking.com, Airbnb, and other OTAs via iCal feeds
          </p>
        </div>
        <Button onClick={syncAll} disabled={syncAllRunning}>
          {syncAllRunning ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sync All Channels
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-destructive text-sm">{error}</p>
          <button onClick={() => setError(null)} className="text-xs underline mt-1">Dismiss</button>
        </div>
      )}

      {/* Units Channel Overview */}
      {units.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No accommodation units found. Add properties and units first.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {units.map((unit) => {
            const status = syncStatuses.find((s) => s.unit_id === unit.id)
            const feeds = status?.feeds || []
            const exportUrl = status?.ical_export_url || `${window.location.origin}/api/accommodation/ical/${unit.id}`

            return (
              <Card key={unit.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {unit.name}
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        {unit.property_name} - {unit.type}
                      </span>
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfigUnit(configUnit === unit.id ? null : unit.id)}
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add Feed
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => syncUnit(unit.id)}
                        disabled={syncing === unit.id}
                      >
                        {syncing === unit.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-1 h-3 w-3" />
                        )}
                        Sync
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* iCal Export URL */}
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                          iCal Export URL (share with OTAs)
                        </p>
                        <p className="text-xs font-mono text-muted-foreground break-all">{exportUrl}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyExportUrl(unit.id, exportUrl)}
                      >
                        {copiedId === unit.id ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Add Feed Form */}
                  {configUnit === unit.id && (
                    <div className="mb-4 p-4 border rounded-lg bg-background">
                      <p className="text-sm font-medium mb-3">Add iCal Import Feed</p>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Source</Label>
                          <Select value={newFeedSource} onValueChange={setNewFeedSource}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="booking_com">Booking.com</SelectItem>
                              <SelectItem value="airbnb">Airbnb</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <Label className="text-xs">iCal Feed URL</Label>
                          <Input
                            placeholder="https://admin.booking.com/ical/..."
                            value={newFeedUrl}
                            onChange={(e) => setNewFeedUrl(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Label (optional)</Label>
                          <Input
                            placeholder="e.g. Main listing"
                            value={newFeedLabel}
                            onChange={(e) => setNewFeedLabel(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" onClick={addFeed} disabled={saving || !newFeedUrl.trim()}>
                          {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
                          Add Feed
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfigUnit(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Feeds Table */}
                  {feeds.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Source</TableHead>
                          <TableHead>Feed URL</TableHead>
                          <TableHead>Last Sync</TableHead>
                          <TableHead>Result</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {feeds.map((feed, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLORS[feed.source] || SOURCE_COLORS.other}`}>
                                {SOURCE_LABELS[feed.source] || feed.source}
                              </span>
                              {feed.label && (
                                <span className="ml-1 text-xs text-muted-foreground">{feed.label}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px] block">
                                {feed.feed_url}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                {formatSyncTime(feed.last_synced_at)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {feed.last_sync_result ? (
                                <div className="flex items-center gap-2 text-xs">
                                  {feed.last_sync_result.errors.length === 0 ? (
                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <AlertCircle className="h-3 w-3 text-orange-500" />
                                  )}
                                  <span>
                                    {feed.last_sync_result.imported} imported
                                    {feed.last_sync_result.conflicts > 0 && `, ${feed.last_sync_result.conflicts} conflicts`}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Not synced</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(feed.feed_url, '_blank')}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFeed(unit.id, idx)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No iCal feeds configured. Add a Booking.com or Airbnb feed to start syncing.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
