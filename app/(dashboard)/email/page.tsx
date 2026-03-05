'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Mail,
  FileText,
  Send,
  Target,
  TrendingUp,
  Users,
  Clock,
  Plus,
  ArrowRight,
  Loader2,
} from 'lucide-react'

interface EmailStats {
  totalSent: number
  totalOpened: number
  totalClicked: number
  openRate: number
  clickRate: number
  templates: number
  campaigns: number
  sequences: number
}

export default function EmailDashboardPage() {
  const [stats, setStats] = useState<EmailStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [recentSends, setRecentSends] = useState<Array<{
    id: string
    recipient_email: string
    subject: string
    status: string
    sent_at: string
  }>>([])

  useEffect(() => {
    loadStats()
    loadRecentSends()
  }, [])

  async function loadStats() {
    const supabase = createClient()

    // Get totals from email_sends
    const { count: totalSent } = await supabase
      .from('email_sends')
      .select('*', { count: 'exact', head: true })
      .in('status', ['sent', 'delivered', 'opened', 'clicked'])

    const { count: totalOpened } = await supabase
      .from('email_sends')
      .select('*', { count: 'exact', head: true })
      .in('status', ['opened', 'clicked'])

    const { count: totalClicked } = await supabase
      .from('email_sends')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'clicked')

    const { count: templates } = await supabase
      .from('email_templates')
      .select('*', { count: 'exact', head: true })

    const { count: campaigns } = await supabase
      .from('email_campaigns')
      .select('*', { count: 'exact', head: true })

    const { count: sequences } = await supabase
      .from('email_sequences')
      .select('*', { count: 'exact', head: true })

    const sent = totalSent || 0
    const opened = totalOpened || 0
    const clicked = totalClicked || 0

    setStats({
      totalSent: sent,
      totalOpened: opened,
      totalClicked: clicked,
      openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
      clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
      templates: templates || 0,
      campaigns: campaigns || 0,
      sequences: sequences || 0,
    })
    setIsLoading(false)
  }

  async function loadRecentSends() {
    const supabase = createClient()

    const { data } = await supabase
      .from('email_sends')
      .select('id, recipient_email, subject, status, sent_at')
      .order('created_at', { ascending: false })
      .limit(5)

    if (data) {
      setRecentSends(data)
    }
  }

  const quickActions = [
    {
      title: 'Create Template',
      description: 'Design a new email template',
      icon: FileText,
      href: '/email/templates/editor',
      color: 'text-blue-500',
    },
    {
      title: 'New Campaign',
      description: 'Send emails to your audience',
      icon: Send,
      href: '/email/campaigns/new',
      color: 'text-green-500',
    },
    {
      title: 'Create Sequence',
      description: 'Set up automated email flows',
      icon: Clock,
      href: '/email/sequences/builder',
      color: 'text-purple-500',
    },
    {
      title: 'Outreach Rules',
      description: 'Configure tier-based outreach',
      icon: Target,
      href: '/email/outreach',
      color: 'text-orange-500',
    },
  ]

  const statusColors: Record<string, string> = {
    queued: 'bg-gray-100 text-gray-600',
    sent: 'bg-blue-100 text-blue-600',
    delivered: 'bg-green-100 text-green-600',
    opened: 'bg-purple-100 text-purple-600',
    clicked: 'bg-indigo-100 text-indigo-600',
    bounced: 'bg-red-100 text-red-600',
    failed: 'bg-red-100 text-red-600',
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Marketing</h1>
          <p className="text-muted-foreground mt-1">
            Manage campaigns, templates, and automated sequences
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-500/10">
                  <Mail className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Emails Sent</p>
                  <p className="text-2xl font-bold">{stats?.totalSent.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/10">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Open Rate</p>
                  <p className="text-2xl font-bold">{stats?.openRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-500/10">
                  <Users className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Click Rate</p>
                  <p className="text-2xl font-bold">{stats?.clickRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-orange-500/10">
                  <FileText className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Templates</p>
                  <p className="text-2xl font-bold">{stats?.templates}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full bg-muted ${action.color}`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{action.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Activity and Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sends */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Sends</CardTitle>
            <Link href="/email/analytics">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentSends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No emails sent yet</p>
                <p className="text-sm mt-1">Start by creating a campaign</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentSends.map((send) => (
                  <div
                    key={send.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{send.subject}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {send.recipient_email}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          statusColors[send.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {send.status}
                      </span>
                      {send.sent_at && (
                        <span className="text-sm text-muted-foreground">
                          {new Date(send.sent_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Navigation */}
        <Card>
          <CardHeader>
            <CardTitle>Navigation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/email/templates">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Templates ({stats?.templates || 0})
              </Button>
            </Link>
            <Link href="/email/campaigns">
              <Button variant="outline" className="w-full justify-start">
                <Send className="h-4 w-4 mr-2" />
                Campaigns ({stats?.campaigns || 0})
              </Button>
            </Link>
            <Link href="/email/sequences">
              <Button variant="outline" className="w-full justify-start">
                <Clock className="h-4 w-4 mr-2" />
                Sequences ({stats?.sequences || 0})
              </Button>
            </Link>
            <Link href="/email/analytics">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="h-4 w-4 mr-2" />
                Analytics
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
