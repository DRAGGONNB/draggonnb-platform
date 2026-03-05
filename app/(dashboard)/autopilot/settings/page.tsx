'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Loader2, ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

const TONES = ['professional', 'casual', 'friendly', 'authoritative', 'inspirational', 'conversational']

const PLATFORMS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter/X' },
]

const EMAIL_GOALS = [
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 're_engagement', label: 'Re-engagement' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'event_invite', label: 'Event Invite' },
]

interface ProfileForm {
  business_name: string
  industry: string
  target_market: string
  business_description: string
  location: string
  website: string
  tone: string
  tagline: string
  content_pillars: string
  seo_keywords: string
  unique_selling_points: string
  brand_values: string
  brand_do: string
  brand_dont: string
  preferred_platforms: string[]
  email_campaigns_per_week: number
  preferred_email_goals: string[]
  autopilot_enabled: boolean
}

export default function AutopilotSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<ProfileForm>({
    business_name: '',
    industry: '',
    target_market: '',
    business_description: '',
    location: '',
    website: '',
    tone: 'professional',
    tagline: '',
    content_pillars: '',
    seo_keywords: '',
    unique_selling_points: '',
    brand_values: '',
    brand_do: '',
    brand_dont: '',
    preferred_platforms: ['linkedin', 'facebook'],
    email_campaigns_per_week: 1,
    preferred_email_goals: ['newsletter', 'promotion'],
    autopilot_enabled: false,
  })

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/autopilot/profile')
        const data = await res.json()
        if (data.profile) {
          const p = data.profile
          setForm({
            business_name: p.business_name || '',
            industry: p.industry || '',
            target_market: p.target_market || '',
            business_description: p.business_description || '',
            location: p.location || '',
            website: p.website || '',
            tone: p.tone || 'professional',
            tagline: p.tagline || '',
            content_pillars: (p.content_pillars || []).join(', '),
            seo_keywords: (p.seo_keywords || []).join(', '),
            unique_selling_points: (p.unique_selling_points || []).join(', '),
            brand_values: (p.brand_values || []).join(', '),
            brand_do: (p.brand_do || []).join(', '),
            brand_dont: (p.brand_dont || []).join(', '),
            preferred_platforms: p.preferred_platforms || ['linkedin', 'facebook'],
            email_campaigns_per_week: p.email_campaigns_per_week ?? 1,
            preferred_email_goals: p.preferred_email_goals || ['newsletter', 'promotion'],
            autopilot_enabled: p.autopilot_enabled || false,
          })
        }
      } catch {
        // Profile doesn't exist yet
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function togglePlatform(platform: string) {
    setForm((prev) => ({
      ...prev,
      preferred_platforms: prev.preferred_platforms.includes(platform)
        ? prev.preferred_platforms.filter((p) => p !== platform)
        : [...prev.preferred_platforms, platform],
    }))
  }

  function toggleEmailGoal(goal: string) {
    setForm((prev) => ({
      ...prev,
      preferred_email_goals: prev.preferred_email_goals.includes(goal)
        ? prev.preferred_email_goals.filter((g) => g !== goal)
        : [...prev.preferred_email_goals, goal],
    }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    setSaved(false)

    try {
      const payload = {
        ...form,
        content_pillars: form.content_pillars ? form.content_pillars.split(',').map((s) => s.trim()) : [],
        seo_keywords: form.seo_keywords ? form.seo_keywords.split(',').map((s) => s.trim()) : [],
        unique_selling_points: form.unique_selling_points ? form.unique_selling_points.split(',').map((s) => s.trim()) : [],
        brand_values: form.brand_values ? form.brand_values.split(',').map((s) => s.trim()) : [],
        brand_do: form.brand_do ? form.brand_do.split(',').map((s) => s.trim()) : [],
        brand_dont: form.brand_dont ? form.brand_dont.split(',').map((s) => s.trim()) : [],
      }

      const res = await fetch('/api/autopilot/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Save failed')
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/autopilot">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Autopilot Settings</h1>
          <p className="text-sm text-gray-500">Update your business profile and content preferences</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Business</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="business_name">Business Name *</Label>
              <Input id="business_name" value={form.business_name} onChange={(e) => setForm((p) => ({ ...p, business_name: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="industry">Industry *</Label>
              <Input id="industry" value={form.industry} onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))} required />
            </div>
          </div>
          <div>
            <Label htmlFor="target_market">Target Market *</Label>
            <Input id="target_market" value={form.target_market} onChange={(e) => setForm((p) => ({ ...p, target_market: e.target.value }))} required />
          </div>
          <div>
            <Label htmlFor="business_description">Description</Label>
            <Textarea id="business_description" value={form.business_description} onChange={(e) => setForm((p) => ({ ...p, business_description: e.target.value }))} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} />
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Brand Voice</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tone">Tone</Label>
              <select id="tone" value={form.tone} onChange={(e) => setForm((p) => ({ ...p, tone: e.target.value }))} className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm">
                {TONES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="tagline">Tagline</Label>
              <Input id="tagline" value={form.tagline} onChange={(e) => setForm((p) => ({ ...p, tagline: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label htmlFor="brand_values">Brand Values</Label>
            <Input id="brand_values" value={form.brand_values} onChange={(e) => setForm((p) => ({ ...p, brand_values: e.target.value }))} placeholder="comma-separated" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="brand_do">Voice Do&apos;s</Label>
              <Input id="brand_do" value={form.brand_do} onChange={(e) => setForm((p) => ({ ...p, brand_do: e.target.value }))} placeholder="comma-separated" />
            </div>
            <div>
              <Label htmlFor="brand_dont">Voice Don&apos;ts</Label>
              <Input id="brand_dont" value={form.brand_dont} onChange={(e) => setForm((p) => ({ ...p, brand_dont: e.target.value }))} placeholder="comma-separated" />
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Content Strategy</h3>
          <div>
            <Label htmlFor="content_pillars">Content Pillars</Label>
            <Input id="content_pillars" value={form.content_pillars} onChange={(e) => setForm((p) => ({ ...p, content_pillars: e.target.value }))} placeholder="comma-separated" />
          </div>
          <div>
            <Label htmlFor="seo_keywords">SEO Keywords</Label>
            <Input id="seo_keywords" value={form.seo_keywords} onChange={(e) => setForm((p) => ({ ...p, seo_keywords: e.target.value }))} placeholder="comma-separated" />
          </div>
          <div>
            <Label htmlFor="unique_selling_points">USPs</Label>
            <Input id="unique_selling_points" value={form.unique_selling_points} onChange={(e) => setForm((p) => ({ ...p, unique_selling_points: e.target.value }))} placeholder="comma-separated" />
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Platforms & Email</h3>
          <div>
            <Label>Social Platforms</Label>
            <div className="flex gap-2 mt-1">
              {PLATFORMS.map((p) => (
                <button key={p.value} type="button" onClick={() => togglePlatform(p.value)} className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${form.preferred_platforms.includes(p.value) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Email Campaign Goals</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {EMAIL_GOALS.map((g) => (
                <button key={g.value} type="button" onClick={() => toggleEmailGoal(g.value)} className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${form.preferred_email_goals.includes(g.value) ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500'}`}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="email_campaigns_per_week">Email Campaigns Per Week</Label>
            <select id="email_campaigns_per_week" value={form.email_campaigns_per_week} onChange={(e) => setForm((p) => ({ ...p, email_campaigns_per_week: parseInt(e.target.value) }))} className="w-32 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm">
              {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Auto-Generation (Scale Tier)</h3>
              <p className="text-xs text-gray-500 mt-1">Automatically generate content calendars every Monday</p>
            </div>
            <Switch
              checked={form.autopilot_enabled}
              onCheckedChange={(checked) => setForm((p) => ({ ...p, autopilot_enabled: checked }))}
            />
          </div>
        </Card>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{error}</div>
        )}

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {saved ? 'Saved!' : 'Save Settings'}
        </Button>
      </form>
    </div>
  )
}
