'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Play,
  Pause,
  Trash2,
  Eye,
  Loader2,
  Send,
  Calendar,
} from 'lucide-react'
import type { EmailCampaign, CampaignStatus } from '@/lib/email/types'

const statusColors: Record<CampaignStatus, string> = {
  draft: 'bg-gray-500/10 text-gray-500',
  scheduled: 'bg-blue-500/10 text-blue-500',
  sending: 'bg-yellow-500/10 text-yellow-500',
  sent: 'bg-green-500/10 text-green-500',
  paused: 'bg-orange-500/10 text-orange-500',
  cancelled: 'bg-red-500/10 text-red-500',
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadCampaigns()
  }, [])

  async function loadCampaigns() {
    setIsLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('email_campaigns')
      .select('*, email_templates(name)')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setCampaigns(data)
    }
    setIsLoading(false)
  }

  async function deleteCampaign(id: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('email_campaigns')
      .delete()
      .eq('id', id)

    if (!error) {
      setCampaigns((prev) => prev.filter((c) => c.id !== id))
    }
  }

  async function sendCampaign(id: string) {
    const response = await fetch(`/api/email/campaigns/${id}/send`, {
      method: 'POST',
    })

    if (response.ok) {
      loadCampaigns()
    }
  }

  const filteredCampaigns = campaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage email marketing campaigns
          </p>
        </div>
        <Link href="/email/campaigns/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Campaigns</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-12">
              <Send className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'No campaigns match your search' : 'No campaigns yet'}
              </p>
              {!searchQuery && (
                <Link href="/email/campaigns/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first campaign
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {campaign.subject}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statusColors[campaign.status]}
                      >
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{campaign.recipient_count || '-'}</TableCell>
                    <TableCell>
                      {campaign.stats && campaign.stats.sent > 0 ? (
                        <div className="text-sm">
                          <span className="text-green-600">
                            {Math.round((campaign.stats.opened / campaign.stats.sent) * 100)}%
                          </span>{' '}
                          opens
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {campaign.scheduled_for ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(campaign.scheduled_for).toLocaleDateString()}
                        </div>
                      ) : (
                        new Date(campaign.created_at).toLocaleDateString()
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/email/campaigns/${campaign.id}`}>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                          </Link>
                          {campaign.status === 'draft' && (
                            <>
                              <Link href={`/email/campaigns/new?edit=${campaign.id}`}>
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuItem onClick={() => sendCampaign(campaign.id)}>
                                <Play className="h-4 w-4 mr-2" />
                                Send Now
                              </DropdownMenuItem>
                            </>
                          )}
                          {campaign.status === 'sending' && (
                            <DropdownMenuItem>
                              <Pause className="h-4 w-4 mr-2" />
                              Pause
                            </DropdownMenuItem>
                          )}
                          {campaign.status !== 'sending' && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteCampaign(campaign.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
