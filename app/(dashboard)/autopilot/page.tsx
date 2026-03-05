'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CalendarGrid } from '@/components/autopilot/CalendarGrid'
import { WeekSelector, getISOWeek } from '@/components/autopilot/WeekSelector'
import { ProfileSetup } from '@/components/autopilot/ProfileSetup'
import { ChatPanel } from '@/components/autopilot/ChatPanel'
import {
  Loader2,
  Sparkles,
  MessageSquare,
  Settings,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'

interface ContentQueueItem {
  id: string
  content: string
  platform: string
  status: string
  hashtags?: string[]
  publish_at?: string
  layout_data?: Record<string, unknown>
  source?: string
}

export default function AutopilotPage() {
  const [hasProfile, setHasProfile] = useState<boolean | null>(null)
  const [week, setWeek] = useState(getISOWeek(new Date()))
  const [entries, setEntries] = useState<ContentQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ContentQueueItem | null>(null)
  const [refineMode, setRefineMode] = useState(false)
  const [refineFeedback, setRefineFeedback] = useState('')
  const [refining, setRefining] = useState(false)

  const fetchEntries = useCallback(async () => {
    try {
      const [yearStr, weekStr] = week.replace('W', '').split('-')
      const res = await fetch(`/api/autopilot/generate?week=${week}&year=${yearStr}&weekNum=${weekStr}`)
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries || [])
      }
    } catch {
      // Silently fail - empty calendar is fine
    }
  }, [week])

  useEffect(() => {
    async function checkProfile() {
      try {
        const res = await fetch('/api/autopilot/profile')
        const data = await res.json()
        setHasProfile(!!data.profile)
      } catch {
        setHasProfile(false)
      } finally {
        setLoading(false)
      }
    }
    checkProfile()
  }, [])

  useEffect(() => {
    if (hasProfile) {
      fetchEntries()
    }
  }, [hasProfile, week, fetchEntries])

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/autopilot/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Generation failed')
        return
      }

      await fetchEntries()
    } catch {
      alert('Failed to generate calendar')
    } finally {
      setGenerating(false)
    }
  }

  async function handleApprove(id: string) {
    const res = await fetch(`/api/content/queue/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    })
    if (res.ok) {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: 'approved' } : e))
      )
      if (selectedItem?.id === id) {
        setSelectedItem((prev) => prev ? { ...prev, status: 'approved' } : null)
      }
    }
  }

  async function handleReject(id: string) {
    const res = await fetch(`/api/content/queue/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    })
    if (res.ok) {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: 'rejected' } : e))
      )
    }
  }

  async function handleRefine() {
    if (!selectedItem || !refineFeedback.trim()) return
    setRefining(true)

    try {
      const res = await fetch('/api/autopilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `REFINE_POST\n\nCurrent content:\n${selectedItem.content}\n\nFeedback:\n${refineFeedback}`,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        // Try to extract refined content from agent response
        let newContent = data.response
        try {
          const parsed = JSON.parse(data.response)
          if (parsed.content) newContent = parsed.content
        } catch {
          // Use raw response as content
        }

        // Update the queue item
        await fetch(`/api/content/queue/${selectedItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: newContent }),
        })

        setEntries((prev) =>
          prev.map((e) => (e.id === selectedItem.id ? { ...e, content: newContent } : e))
        )
        setSelectedItem((prev) => prev ? { ...prev, content: newContent } : null)
        setRefineMode(false)
        setRefineFeedback('')
      }
    } catch {
      alert('Refinement failed')
    } finally {
      setRefining(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!hasProfile) {
    return (
      <div className="p-6">
        <ProfileSetup onComplete={() => setHasProfile(true)} />
      </div>
    )
  }

  const stats = {
    total: entries.length,
    approved: entries.filter((e) => e.status === 'approved').length,
    pending: entries.filter((e) => e.status === 'pending_approval').length,
    emails: entries.filter((e) => e.platform === 'email').length,
  }

  const layoutData = (selectedItem?.layout_data || {}) as Record<string, unknown>
  const isEmailItem = selectedItem?.platform === 'email' || layoutData?.type === 'email'

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Business Autopilot</h1>
          <p className="text-sm text-gray-500 mt-1">
            AI-generated content calendar — review, refine, and approve
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/autopilot/settings">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-1" /> Settings
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setChatOpen(!chatOpen)}
          >
            <MessageSquare className="h-4 w-4 mr-1" /> Chat
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate This Week
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Week Selector + Stats */}
      <div className="flex items-center justify-between">
        <WeekSelector week={week} onWeekChange={setWeek} />
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">
            {stats.approved} of {stats.total} approved
          </span>
          {stats.pending > 0 && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700">
              {stats.pending} pending
            </Badge>
          )}
          {stats.emails > 0 && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700">
              {stats.emails} email draft{stats.emails !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <CalendarGrid
        entries={entries}
        onApprove={handleApprove}
        onReject={handleReject}
        onEdit={(id) => {
          const item = entries.find((e) => e.id === id)
          if (item) setSelectedItem(item)
        }}
        onItemClick={setSelectedItem}
      />

      {/* Chat Panel */}
      <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />

      {/* Post Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => { if (!open) { setSelectedItem(null); setRefineMode(false) } }}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isEmailItem ? 'Email Campaign Draft' : `${selectedItem?.platform} Post`}
              <Badge variant="outline" className="text-xs">
                {selectedItem?.status?.replace('_', ' ')}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              {/* Email-specific fields */}
              {isEmailItem && layoutData && (
                <>
                  {typeof layoutData.goal === 'string' && (
                    <div>
                      <Label className="text-xs text-gray-500">Goal</Label>
                      <Badge variant="outline" className="bg-purple-50 text-purple-600">
                        {layoutData.goal}
                      </Badge>
                    </div>
                  )}

                  {Array.isArray(layoutData.subject_lines) && (layoutData.subject_lines as string[]).length > 0 && (
                    <div>
                      <Label className="text-xs text-gray-500">Subject Line Options</Label>
                      <div className="space-y-1 mt-1">
                        {(layoutData.subject_lines as string[]).map((subj, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className="text-xs text-gray-400">{i + 1}.</span>
                            <span>{subj}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {typeof layoutData.preview_text === 'string' && (
                    <div>
                      <Label className="text-xs text-gray-500">Preview Text</Label>
                      <p className="text-sm text-gray-700">{layoutData.preview_text}</p>
                    </div>
                  )}

                  {layoutData.segment_suggestion && typeof layoutData.segment_suggestion === 'object' && (
                    <div>
                      <Label className="text-xs text-gray-500">Target Segment</Label>
                      <p className="text-sm text-gray-700">
                        {String((layoutData.segment_suggestion as Record<string, unknown>)?.description || 'All subscribers')}
                      </p>
                    </div>
                  )}

                  {layoutData.campaign_id && (
                    <Link
                      href={`/email/campaigns`}
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open in Email Editor
                    </Link>
                  )}
                </>
              )}

              {/* Content */}
              <div>
                <Label className="text-xs text-gray-500">Content</Label>
                <div className="mt-1 rounded-lg border bg-gray-50 p-4 text-sm whitespace-pre-wrap">
                  {selectedItem.content}
                </div>
              </div>

              {/* Social-specific fields */}
              {!isEmailItem && selectedItem.hashtags && selectedItem.hashtags.length > 0 && (
                <div>
                  <Label className="text-xs text-gray-500">Hashtags</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedItem.hashtags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs text-blue-600">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {typeof layoutData?.cta === 'string' && (
                <div>
                  <Label className="text-xs text-gray-500">Call to Action</Label>
                  <p className="text-sm text-gray-700">{layoutData.cta}</p>
                </div>
              )}

              {typeof layoutData?.content_pillar === 'string' && (
                <div>
                  <Label className="text-xs text-gray-500">Content Pillar</Label>
                  <Badge variant="outline" className="text-xs">{layoutData.content_pillar}</Badge>
                </div>
              )}

              {selectedItem.publish_at && (
                <div>
                  <Label className="text-xs text-gray-500">Scheduled</Label>
                  <p className="text-sm text-gray-700">
                    {new Date(selectedItem.publish_at).toLocaleString('en-ZA', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}

              {/* Refine */}
              {refineMode ? (
                <div className="space-y-2">
                  <Label>What should the Autopilot change?</Label>
                  <Textarea
                    value={refineFeedback}
                    onChange={(e) => setRefineFeedback(e.target.value)}
                    placeholder="e.g., Make it more casual, add a question at the end"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleRefine} disabled={refining || !refineFeedback.trim()}>
                      {refining ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                      Refine
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setRefineMode(false); setRefineFeedback('') }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setRefineMode(true)}>
                  <Sparkles className="h-4 w-4 mr-1" /> Ask Autopilot to Refine
                </Button>
              )}

              {/* Actions */}
              {selectedItem.status === 'pending_approval' && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleApprove(selectedItem.id)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => handleReject(selectedItem.id)}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
