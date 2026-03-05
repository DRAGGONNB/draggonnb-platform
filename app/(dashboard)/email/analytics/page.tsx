'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Send,
  Eye,
  MousePointer,
  AlertTriangle,
  TrendingUp,
  Users,
  CheckCircle,
  Mail,
  Target,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'

interface OverviewStats {
  total_sent: number
  total_opened: number
  total_clicked: number
  total_bounced: number
  total_failed: number
  open_rate: number
  click_rate: number
  bounce_rate: number
  campaigns_sent: number
  sequence_enrolled: number
  sequence_completed: number
}

interface TimelineData {
  date: string
  sent: number
  opened: number
  clicked: number
  bounced: number
}

interface CampaignData {
  id: string
  name: string
  subject: string
  status: string
  stats: { sent: number; opened: number; clicked: number; bounced: number } | null
  created_at: string
}

interface SequenceData {
  id: string
  name: string
  is_active: boolean
  total_enrolled: number
  total_completed: number
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30d')
  const [isLoading, setIsLoading] = useState(true)
  const [overview, setOverview] = useState<OverviewStats | null>(null)
  const [timeline, setTimeline] = useState<TimelineData[]>([])
  const [campaigns, setCampaigns] = useState<CampaignData[]>([])
  const [sequences, setSequences] = useState<SequenceData[]>([])

  useEffect(() => {
    loadAnalytics()
  }, [period])

  async function loadAnalytics() {
    setIsLoading(true)
    try {
      // Load all analytics data in parallel
      const [overviewRes, timelineRes, campaignsRes, sequencesRes] = await Promise.all([
        fetch(`/api/email/analytics?period=${period}&type=overview`),
        fetch(`/api/email/analytics?period=${period}&type=timeline`),
        fetch(`/api/email/analytics?period=${period}&type=campaigns`),
        fetch(`/api/email/analytics?period=${period}&type=sequences`),
      ])

      if (overviewRes.ok) {
        const data = await overviewRes.json()
        setOverview(data.overview)
      }
      if (timelineRes.ok) {
        const data = await timelineRes.json()
        setTimeline(data.timeline || [])
      }
      if (campaignsRes.ok) {
        const data = await campaignsRes.json()
        setCampaigns(data.campaigns || [])
      }
      if (sequencesRes.ok) {
        const data = await sequencesRes.json()
        setSequences(data.sequences || [])
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    }
    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track your email marketing performance
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Send className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Emails Sent</p>
                <p className="text-2xl font-bold">{overview?.total_sent || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open Rate</p>
                <p className="text-2xl font-bold">{overview?.open_rate || 0}%</p>
                <p className="text-xs text-muted-foreground">
                  {overview?.total_opened || 0} opens
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MousePointer className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Click Rate</p>
                <p className="text-2xl font-bold">{overview?.click_rate || 0}%</p>
                <p className="text-xs text-muted-foreground">
                  {overview?.total_clicked || 0} clicks
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bounce Rate</p>
                <p className="text-2xl font-bold">{overview?.bounce_rate || 0}%</p>
                <p className="text-xs text-muted-foreground">
                  {overview?.total_bounced || 0} bounced
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Mail className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Campaigns Sent</p>
                <p className="text-2xl font-bold">{overview?.campaigns_sent || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <Users className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sequence Enrollments</p>
                <p className="text-2xl font-bold">{overview?.sequence_enrolled || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sequences Completed</p>
                <p className="text-2xl font-bold">{overview?.sequence_completed || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Email Activity</CardTitle>
          <CardDescription>Sends, opens, and clicks over time</CardDescription>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No data available for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) =>
                    new Date(date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  }
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(date) =>
                    new Date(date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })
                  }
                />
                <Area
                  type="monotone"
                  dataKey="sent"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#93c5fd"
                  name="Sent"
                />
                <Area
                  type="monotone"
                  dataKey="opened"
                  stackId="2"
                  stroke="#22c55e"
                  fill="#86efac"
                  name="Opened"
                />
                <Area
                  type="monotone"
                  dataKey="clicked"
                  stackId="3"
                  stroke="#a855f7"
                  fill="#d8b4fe"
                  name="Clicked"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Campaigns</CardTitle>
            <CardDescription>Performance of your latest campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Mail className="h-8 w-8 mb-2 opacity-50" />
                <p>No campaigns sent yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => {
                  const stats = campaign.stats || { sent: 0, opened: 0, clicked: 0 }
                  const openRate =
                    stats.sent > 0 ? Math.round((stats.opened / stats.sent) * 100) : 0
                  const clickRate =
                    stats.sent > 0 ? Math.round((stats.clicked / stats.sent) * 100) : 0

                  return (
                    <div key={campaign.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {campaign.subject}
                          </p>
                        </div>
                        <Badge
                          variant={campaign.status === 'sent' ? 'default' : 'secondary'}
                        >
                          {campaign.status}
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Sent:</span>{' '}
                          <span className="font-medium">{stats.sent}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Opens:</span>{' '}
                          <span className="font-medium text-green-600">{openRate}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Clicks:</span>{' '}
                          <span className="font-medium text-purple-600">{clickRate}%</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Sequences */}
        <Card>
          <CardHeader>
            <CardTitle>Active Sequences</CardTitle>
            <CardDescription>Your automated email sequences</CardDescription>
          </CardHeader>
          <CardContent>
            {sequences.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Target className="h-8 w-8 mb-2 opacity-50" />
                <p>No sequences created yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sequences.map((sequence) => {
                  const completionRate =
                    sequence.total_enrolled > 0
                      ? Math.round(
                          (sequence.total_completed / sequence.total_enrolled) * 100
                        )
                      : 0

                  return (
                    <div key={sequence.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{sequence.name}</p>
                        <Badge
                          variant={sequence.is_active ? 'default' : 'secondary'}
                          className={
                            sequence.is_active
                              ? 'bg-green-500/10 text-green-600'
                              : ''
                          }
                        >
                          {sequence.is_active ? 'Active' : 'Paused'}
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Enrolled:</span>{' '}
                          <span className="font-medium">{sequence.total_enrolled}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Completed:</span>{' '}
                          <span className="font-medium">{sequence.total_completed}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Rate:</span>{' '}
                          <span className="font-medium text-blue-600">
                            {completionRate}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
