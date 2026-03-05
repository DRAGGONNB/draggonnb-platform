'use client'

import { PostPreviewCard } from './PostPreviewCard'

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

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const CHANNELS = ['linkedin', 'facebook', 'instagram', 'twitter', 'email']
const CHANNEL_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'Twitter/X',
  email: 'Email',
}

function getDayFromDate(dateStr: string): string {
  const date = new Date(dateStr)
  const day = date.getDay()
  // getDay: 0=Sun, 1=Mon, ...
  return DAYS[day === 0 ? 6 : day - 1]
}

interface CalendarGridProps {
  entries: ContentQueueItem[]
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onEdit?: (id: string) => void
  onItemClick?: (item: ContentQueueItem) => void
}

export function CalendarGrid({ entries, onApprove, onReject, onEdit, onItemClick }: CalendarGridProps) {
  // Build a lookup: channel -> day -> items
  const grid: Record<string, Record<string, ContentQueueItem[]>> = {}

  for (const channel of CHANNELS) {
    grid[channel] = {}
    for (const day of DAYS) {
      grid[channel][day] = []
    }
  }

  for (const entry of entries) {
    const day = entry.publish_at ? getDayFromDate(entry.publish_at) : 'monday'
    const channel = entry.platform || 'linkedin'
    if (grid[channel]?.[day]) {
      grid[channel][day].push(entry)
    }
  }

  // Filter to only show channels that have entries
  const activeChannels = CHANNELS.filter((ch) =>
    DAYS.some((day) => grid[ch][day].length > 0)
  )

  if (activeChannels.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg font-medium mb-2">No content this week</p>
        <p className="text-sm">Click &quot;Generate This Week&quot; to create your content calendar</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[900px]">
        {/* Header row: day labels */}
        <div className="grid gap-1" style={{ gridTemplateColumns: `120px repeat(${DAYS.length}, 1fr)` }}>
          <div className="p-2" />
          {DAY_LABELS.map((label) => (
            <div key={label} className="p-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {label}
            </div>
          ))}
        </div>

        {/* Channel rows */}
        {activeChannels.map((channel) => (
          <div
            key={channel}
            className="grid gap-1 border-t"
            style={{ gridTemplateColumns: `120px repeat(${DAYS.length}, 1fr)` }}
          >
            <div className="p-2 flex items-start">
              <span className="text-xs font-medium text-gray-600 mt-1">
                {CHANNEL_LABELS[channel] || channel}
              </span>
            </div>
            {DAYS.map((day) => (
              <div key={day} className="p-1 min-h-[100px]">
                <div className="space-y-1">
                  {grid[channel][day].map((item) => (
                    <PostPreviewCard
                      key={item.id}
                      item={item}
                      onApprove={onApprove}
                      onReject={onReject}
                      onEdit={onEdit}
                      onClick={onItemClick}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
