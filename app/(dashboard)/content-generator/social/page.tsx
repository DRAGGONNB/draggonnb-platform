'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Share2, Loader2, Copy, Check, CalendarPlus, Send, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { SocialGenerationInput, SocialGenerationOutput, SocialPlatformOutput } from '@/lib/content-studio/types'

interface SocialAccountInfo {
  id: string
  platform: string
  platform_username: string | null
  platform_display_name: string | null
  page_name: string | null
  status: string
}

interface PublishedInfo {
  platform: string
  accountName: string
  timestamp: string
}

const PLATFORMS = [
  { value: 'linkedin' as const, label: 'LinkedIn', icon: '💼' },
  { value: 'facebook' as const, label: 'Facebook', icon: '👥' },
  { value: 'instagram' as const, label: 'Instagram', icon: '📸' },
  { value: 'twitter' as const, label: 'Twitter/X', icon: '🐦' },
]

export default function SocialContentPage() {
  const [input, setInput] = useState<SocialGenerationInput>({
    platforms: ['linkedin'],
    goal: 'awareness',
    tone: 'professional',
    audience: '',
    topic: '',
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<SocialGenerationOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<{ current: number; limit: number } | null>(null)
  const [activeTab, setActiveTab] = useState('linkedin')
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null)
  const [queuedIdx, setQueuedIdx] = useState<Set<string>>(new Set())
  const [accounts, setAccounts] = useState<Record<string, SocialAccountInfo[]>>({})
  const [publishingIdx, setPublishingIdx] = useState<Set<string>>(new Set())
  const [publishedIdx, setPublishedIdx] = useState<Map<string, PublishedInfo>>(new Map())

  const goals = [
    { value: 'awareness', label: 'Brand Awareness' },
    { value: 'engagement', label: 'Engagement' },
    { value: 'traffic', label: 'Drive Traffic' },
    { value: 'leads', label: 'Lead Generation' },
    { value: 'sales', label: 'Sales' },
    { value: 'community', label: 'Community Building' },
  ]

  const tones = [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'authoritative', label: 'Authoritative' },
    { value: 'inspirational', label: 'Inspirational' },
    { value: 'humorous', label: 'Humorous' },
  ]

  const togglePlatform = (platform: typeof input.platforms[number]) => {
    setInput(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform],
    }))
  }

  const handleGenerate = async () => {
    if (!input.topic.trim() || !input.audience.trim()) {
      setError('Please enter a topic and target audience')
      return
    }
    if (input.platforms.length === 0) {
      setError('Please select at least one platform')
      return
    }

    setIsGenerating(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/content/generate/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate social content')
      }

      if (data.success && data.data) {
        setResult(data.data)
        setUsage(data.usage || null)
        if (data.data.platforms?.length > 0) {
          setActiveTab(data.data.platforms[0].platform)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedIdx(key)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  // Fetch connected social accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch('/api/social/accounts')
        if (!res.ok) return
        const data = await res.json()
        const grouped: Record<string, SocialAccountInfo[]> = {}
        for (const acct of (data.accounts || []) as SocialAccountInfo[]) {
          if (acct.status !== 'active') continue
          if (!grouped[acct.platform]) grouped[acct.platform] = []
          grouped[acct.platform].push(acct)
        }
        setAccounts(grouped)
      } catch {
        // Silent fail -- publish button will show "Connect" fallback
      }
    }
    fetchAccounts()
  }, [])

  const handlePublish = async (platform: string, content: string, accountId: string, variantKey: string) => {
    setPublishingIdx(prev => new Set(prev).add(variantKey))
    setError(null)
    try {
      const res = await fetch(`/api/social/publish/${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, account_id: accountId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Publish failed')
      }
      // Find account name for display
      const acct = accounts[platform]?.find(a => a.id === accountId)
      const accountName = acct?.page_name || acct?.platform_display_name || acct?.platform_username || platform
      setPublishedIdx(prev => {
        const next = new Map(prev)
        next.set(variantKey, {
          platform,
          accountName,
          timestamp: new Date().toLocaleTimeString(),
        })
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish')
    } finally {
      setPublishingIdx(prev => {
        const next = new Set(prev)
        next.delete(variantKey)
        return next
      })
    }
  }

  const saveToQueue = async (content: string, platform: string, key: string) => {
    try {
      const response = await fetch('/api/content/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, platform, status: 'pending_approval' }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save to queue')
      }
      setQueuedIdx(prev => new Set(prev).add(key))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save to queue')
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Share2 className="h-8 w-8 text-primary" />
          Social Content Generator
        </h1>
        <p className="text-muted-foreground mt-2">
          Generate platform-optimized social media content with 3 variants per platform
        </p>
      </div>

      {usage && (
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <p className="text-sm">
            AI Generations this month: <strong>{usage.current}</strong> / {usage.limit}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Social Media Configuration</CardTitle>
              <CardDescription>Choose platforms and define your content goals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Platform Selection */}
              <div className="space-y-2">
                <Label>Platforms *</Label>
                <div className="grid grid-cols-2 gap-3">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => togglePlatform(p.value)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        input.platforms.includes(p.value)
                          ? 'border-primary bg-primary/10'
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{p.icon}</span>
                        <span className="font-medium text-sm">{p.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Topic *</Label>
                <Input
                  placeholder="e.g., How AI is transforming small business marketing in SA"
                  value={input.topic}
                  onChange={(e) => setInput({ ...input, topic: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Goal</Label>
                <Select value={input.goal} onValueChange={(v) => setInput({ ...input, goal: v as SocialGenerationInput['goal'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {goals.map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={input.tone} onValueChange={(v) => setInput({ ...input, tone: v as SocialGenerationInput['tone'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {tones.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Audience *</Label>
                <Input
                  placeholder="e.g., SA SME owners and marketing managers"
                  value={input.audience}
                  onChange={(e) => setInput({ ...input, audience: e.target.value })}
                />
              </div>

              {/* Advanced Options */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-primary hover:underline"
              >
                {showAdvanced ? 'Hide' : 'Show'} Advanced Options
              </button>

              {showAdvanced && (
                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label>Link</Label>
                    <Input
                      placeholder="https://draggonnb.online"
                      value={input.link || ''}
                      onChange={(e) => setInput({ ...input, link: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Event Date</Label>
                    <Input
                      type="date"
                      value={input.eventDate || ''}
                      onChange={(e) => setInput({ ...input, eventDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      placeholder="e.g., Cape Town, South Africa"
                      value={input.location || ''}
                      onChange={(e) => setInput({ ...input, location: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred Hashtags (comma-separated)</Label>
                    <Input
                      placeholder="e.g., #DraggonnB, #SABusiness"
                      value={input.hashtagPreferences?.join(', ') || ''}
                      onChange={(e) => setInput({ ...input, hashtagPreferences: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    />
                  </div>
                </div>
              )}

              <Button onClick={handleGenerate} disabled={isGenerating} className="w-full" size="lg">
                {isGenerating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Generate Social Content</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Generated Content</CardTitle>
              <CardDescription>3 variants per platform, ready to post</CardDescription>
            </CardHeader>
            <CardContent>
              {!result ? (
                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                  <Share2 className="h-12 w-12 mb-4 opacity-50" />
                  <p>Generated content will appear here</p>
                  <p className="text-sm mt-2">Configure and click Generate</p>
                </div>
              ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full">
                    {result.platforms.map((p) => {
                      const platformInfo = PLATFORMS.find(pl => pl.value === p.platform)
                      return (
                        <TabsTrigger key={p.platform} value={p.platform} className="flex-1">
                          <span className="mr-1">{platformInfo?.icon}</span>
                          {platformInfo?.label || p.platform}
                        </TabsTrigger>
                      )
                    })}
                  </TabsList>

                  {result.platforms.map((p: SocialPlatformOutput) => (
                    <TabsContent key={p.platform} value={p.platform} className="space-y-4 mt-4">
                      {p.variants.map((variant, idx) => {
                        const variantKey = `${p.platform}-${idx}`
                        const isPublishing = publishingIdx.has(variantKey)
                        const published = publishedIdx.get(variantKey)
                        const platformAccounts = accounts[p.platform] || []
                        const platformInfo = PLATFORMS.find(pl => pl.value === p.platform)

                        return (
                        <div key={idx} className="space-y-2 relative">
                          {published && (
                            <Badge variant="default" className="absolute -top-2 -right-2 bg-green-600 text-white z-10">
                              <Check className="h-3 w-3 mr-1" /> Published
                            </Badge>
                          )}
                          <div className="flex items-center justify-between">
                            <Label>Variant {idx + 1}</Label>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(variant, variantKey)}
                                title="Copy to clipboard"
                              >
                                {copiedIdx === variantKey ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => saveToQueue(variant, p.platform, variantKey)}
                                disabled={queuedIdx.has(variantKey)}
                                title="Save to content queue"
                              >
                                {queuedIdx.has(variantKey) ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <CalendarPlus className="h-4 w-4" />
                                )}
                              </Button>
                              {published ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled
                                  title={`Published to ${published.accountName} at ${published.timestamp}`}
                                  className="text-green-600"
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  <span className="text-xs">Published</span>
                                </Button>
                              ) : platformAccounts.length > 0 ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      size="sm"
                                      disabled={isPublishing}
                                      title="Publish now"
                                      className="bg-[#6B1420] hover:bg-[#6B1420]/90 text-white"
                                    >
                                      {isPublishing ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                      ) : (
                                        <Send className="h-4 w-4 mr-1" />
                                      )}
                                      <span className="text-xs">Publish Now</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {platformAccounts.map((acct) => (
                                      <DropdownMenuItem
                                        key={acct.id}
                                        onClick={() => handlePublish(p.platform, variant, acct.id, variantKey)}
                                      >
                                        <span className="mr-2">{platformInfo?.icon}</span>
                                        {acct.page_name || acct.platform_display_name || acct.platform_username || 'Account'}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                  title={`Connect ${platformInfo?.label || p.platform}`}
                                >
                                  <a href="/settings/social">
                                    <ExternalLink className="h-4 w-4 mr-1" />
                                    <span className="text-xs">Connect {platformInfo?.label || p.platform}</span>
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                          <Textarea value={variant} rows={4} readOnly className="font-mono text-sm" />
                          {published && (
                            <p className="text-xs text-green-600">
                              Published to {published.accountName} at {published.timestamp}
                            </p>
                          )}
                        </div>
                        )
                      })}

                      {p.hashtags.length > 0 && (
                        <div className="space-y-2">
                          <Label>Hashtags</Label>
                          <div className="flex flex-wrap gap-2">
                            {p.hashtags.map((tag, idx) => (
                              <span key={idx} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {p.imagePrompt && (
                        <div className="space-y-2">
                          <Label>Image Prompt</Label>
                          <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">{p.imagePrompt}</p>
                        </div>
                      )}

                      {p.ctaSuggestion && (
                        <div className="space-y-2">
                          <Label>CTA Suggestion</Label>
                          <p className="text-sm text-muted-foreground">{p.ctaSuggestion}</p>
                        </div>
                      )}

                      {p.bestPostTime && (
                        <div className="space-y-2">
                          <Label>Best Post Time</Label>
                          <p className="text-sm text-muted-foreground">{p.bestPostTime}</p>
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
