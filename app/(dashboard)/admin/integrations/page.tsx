'use client'

import { useEffect, useState, useCallback } from 'react'
import { Copy, Key, Plus, Trash2, Webhook, Loader2, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// --- Types ---

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  last_used_at: string | null
  expires_at: string | null
  created_at: string
  revoked_at: string | null
}

interface WebhookEntry {
  id: string
  url: string
  events: string[]
  is_active: boolean
  description: string | null
  created_at: string
  updated_at: string
}

const API_KEY_SCOPES = [
  'crm:read',
  'crm:write',
  'email:read',
  'email:write',
  'accommodation:read',
  'accommodation:write',
  'content:read',
  'content:write',
  'webhooks:manage',
]

// --- Main Page ---

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage API keys, webhooks, and external integrations for your organization.
        </p>
      </div>

      <Tabs defaultValue="api-keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="api-keys" className="gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys">
          <ApiKeysTab />
        </TabsContent>
        <TabsContent value="webhooks">
          <WebhooksTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// --- API Keys Tab ---

function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  const fetchKeys = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/admin/api-keys')
      if (!res.ok) throw new Error('Failed to fetch API keys')
      const data = await res.json()
      setKeys(data.keys || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  const handleRevoke = async (id: string) => {
    setRevoking(id)
    try {
      const res = await fetch(`/api/admin/api-keys/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to revoke key')
      setKeys(keys.filter((k) => k.id !== id))
    } catch {
      setError('Failed to revoke API key')
    } finally {
      setRevoking(null)
    }
  }

  const handleCreated = (key: ApiKey, secret: string) => {
    setKeys((prev) => [key, ...prev])
    setNewKeySecret(secret)
    setShowCreate(false)
  }

  const copySecret = async () => {
    if (!newKeySecret) return
    await navigator.clipboard.writeText(newKeySecret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Generate keys for external applications to access DraggonnB OS APIs.
            </CardDescription>
          </div>
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Generate Key
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {keys.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              No API keys yet. Generate one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="rounded bg-gray-100 px-2 py-1 text-xs">
                        {key.key_prefix}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(key.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {key.last_used_at
                        ? new Date(key.last_used_at).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(key.id)}
                        disabled={revoking === key.id}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        {revoking === key.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Key Dialog */}
      <CreateApiKeyDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />

      {/* Secret Display Dialog */}
      <Dialog open={!!newKeySecret} onOpenChange={() => setNewKeySecret(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy this key now. You will not be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border bg-gray-50 px-3 py-2 text-sm font-mono break-all">
              {newKeySecret}
            </code>
            <Button variant="outline" size="sm" onClick={copySecret}>
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewKeySecret(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// --- Create API Key Dialog ---

function CreateApiKeyDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (key: ApiKey, secret: string) => void
}) {
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleScope = (scope: string) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    )
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (scopes.length === 0) {
      setError('Select at least one scope')
      return
    }

    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), scopes }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create key')
      }
      const data = await res.json()
      onCreated(
        {
          id: data.key.id,
          name: data.key.name,
          key_prefix: data.key.key_prefix || data.plaintext_key?.slice(0, 12) || 'dgb_...',
          scopes: data.key.scopes,
          last_used_at: null,
          expires_at: data.key.expires_at,
          created_at: data.key.created_at,
          revoked_at: null,
        },
        data.plaintext_key
      )
      setName('')
      setScopes([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create key')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate API Key</DialogTitle>
          <DialogDescription>
            Create a new key for external application access.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          <div>
            <Label htmlFor="key-name">Name</Label>
            <Input
              id="key-name"
              placeholder="e.g. Production API"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label>Scopes</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {API_KEY_SCOPES.map((scope) => (
                <label
                  key={scope}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={scopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    className="rounded border-gray-300"
                  />
                  {scope}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- Webhooks Tab ---

function WebhooksTab() {
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([])
  const [availableEvents, setAvailableEvents] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const fetchWebhooks = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/admin/webhooks')
      if (!res.ok) throw new Error('Failed to fetch webhooks')
      const data = await res.json()
      setWebhooks(data.webhooks || [])
      setAvailableEvents(data.available_events || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load webhooks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWebhooks() }, [fetchWebhooks])

  const handleToggle = async (id: string, currentActive: boolean) => {
    setToggling(id)
    try {
      const res = await fetch(`/api/admin/webhooks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive }),
      })
      if (!res.ok) throw new Error('Failed to update webhook')
      setWebhooks((prev) =>
        prev.map((w) => (w.id === id ? { ...w, is_active: !currentActive } : w))
      )
    } catch {
      setError('Failed to toggle webhook')
    } finally {
      setToggling(null)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/webhooks/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete webhook')
      setWebhooks((prev) => prev.filter((w) => w.id !== id))
    } catch {
      setError('Failed to delete webhook')
    } finally {
      setDeleting(null)
    }
  }

  const handleCreated = (webhook: WebhookEntry) => {
    setWebhooks((prev) => [webhook, ...prev])
    setShowCreate(false)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Webhooks</CardTitle>
            <CardDescription>
              Receive real-time notifications when events occur in your organization.
            </CardDescription>
          </div>
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Webhook
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {webhooks.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              No webhooks configured. Add one to receive event notifications.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((wh) => (
                  <TableRow key={wh.id}>
                    <TableCell>
                      <div>
                        <code className="text-sm">{wh.url}</code>
                        {wh.description && (
                          <p className="mt-0.5 text-xs text-gray-400">{wh.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {wh.events.slice(0, 3).map((e) => (
                          <Badge key={e} variant="secondary" className="text-xs">
                            {e}
                          </Badge>
                        ))}
                        {wh.events.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{wh.events.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={wh.is_active}
                        onCheckedChange={() => handleToggle(wh.id, wh.is_active)}
                        disabled={toggling === wh.id}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(wh.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(wh.id)}
                        disabled={deleting === wh.id}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        {deleting === wh.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateWebhookDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
        availableEvents={availableEvents}
      />
    </>
  )
}

// --- Create Webhook Dialog ---

function CreateWebhookDialog({
  open,
  onClose,
  onCreated,
  availableEvents,
}: {
  open: boolean
  onClose: () => void
  onCreated: (webhook: WebhookEntry) => void
  availableEvents: string[]
}) {
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const toggleEvent = (event: string) => {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    )
  }

  const handleCreate = async () => {
    if (!url.trim()) {
      setError('URL is required')
      return
    }
    if (events.length === 0) {
      setError('Select at least one event')
      return
    }

    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          events,
          description: description.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create webhook')
      }
      const data = await res.json()
      setSecret(data.webhook.secret)
      onCreated({
        id: data.webhook.id,
        url: data.webhook.url,
        events: data.webhook.events,
        is_active: data.webhook.is_active ?? true,
        description: data.webhook.description,
        created_at: data.webhook.created_at,
        updated_at: data.webhook.created_at,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create webhook')
    } finally {
      setCreating(false)
    }
  }

  const copySecret = async () => {
    if (!secret) return
    await navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    setUrl('')
    setEvents([])
    setDescription('')
    setSecret(null)
    setError(null)
    onClose()
  }

  // Show secret after creation
  if (secret) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Webhook Created</DialogTitle>
            <DialogDescription>
              Copy this signing secret now. You will not be able to see it again.
              Use it to verify webhook payloads.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border bg-gray-50 px-3 py-2 text-sm font-mono break-all">
              {secret}
            </code>
            <Button variant="outline" size="sm" onClick={copySecret}>
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={handleClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Webhook</DialogTitle>
          <DialogDescription>
            Configure an endpoint to receive event notifications.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          <div>
            <Label htmlFor="webhook-url">Endpoint URL</Label>
            <Input
              id="webhook-url"
              placeholder="https://your-app.com/webhooks"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="webhook-desc">Description (optional)</Label>
            <Input
              id="webhook-desc"
              placeholder="e.g. Production CRM sync"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <Label>Events</Label>
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
              {availableEvents.map((event) => (
                <label
                  key={event}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={events.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="rounded border-gray-300"
                  />
                  {event}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
