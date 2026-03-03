'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  ArrowLeft,
  Loader2,
  TrendingUp,
  Briefcase,
  Target,
  Building2,
  Calendar,
} from 'lucide-react'

interface Deal {
  id: string
  name: string
  value: number
  stage: string
  probability: number
  expected_close_date: string | null
  company?: string | null
  description: string | null
  contacts?: {
    first_name: string
    last_name: string
    email: string
  }
  created_at: string
}

const STAGES = [
  { value: 'lead', label: 'Lead', color: 'bg-gray-100 text-gray-700', headerBg: 'bg-gray-50 border-gray-200', dotColor: 'bg-gray-400' },
  { value: 'qualified', label: 'Qualified', color: 'bg-blue-100 text-blue-700', headerBg: 'bg-blue-50 border-blue-200', dotColor: 'bg-blue-400' },
  { value: 'proposal', label: 'Proposal', color: 'bg-yellow-100 text-yellow-700', headerBg: 'bg-yellow-50 border-yellow-200', dotColor: 'bg-yellow-400' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-100 text-orange-700', headerBg: 'bg-orange-50 border-orange-200', dotColor: 'bg-orange-400' },
  { value: 'won', label: 'Won', color: 'bg-green-100 text-green-700', headerBg: 'bg-green-50 border-green-200', dotColor: 'bg-green-500' },
  { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-700', headerBg: 'bg-red-50 border-red-200', dotColor: 'bg-red-400' },
]

const MOCK_DEALS: Deal[] = [
  { id: '1', name: 'Website Redesign', value: 45000, stage: 'lead', probability: 20, expected_close_date: '2026-04-15', company: 'TechCorp SA', description: null, created_at: '2026-02-20T10:00:00Z' },
  { id: '2', name: 'CRM Implementation', value: 120000, stage: 'lead', probability: 15, expected_close_date: '2026-05-01', company: 'BuildRight Construction', description: null, created_at: '2026-02-22T09:00:00Z' },
  { id: '3', name: 'Marketing Retainer', value: 18000, stage: 'qualified', probability: 40, expected_close_date: '2026-03-30', company: 'Innovate Group', description: null, created_at: '2026-02-15T14:00:00Z' },
  { id: '4', name: 'Email Automation Setup', value: 35000, stage: 'qualified', probability: 50, expected_close_date: '2026-04-10', company: 'SolarCape Energy', description: null, created_at: '2026-02-10T11:00:00Z' },
  { id: '5', name: 'Booking Platform Integration', value: 85000, stage: 'proposal', probability: 60, expected_close_date: '2026-03-25', company: 'Greenfields Hospitality', description: null, created_at: '2026-02-05T08:00:00Z' },
  { id: '6', name: 'Annual Support Contract', value: 60000, stage: 'proposal', probability: 55, expected_close_date: '2026-04-01', company: 'FinServe Advisory', description: null, created_at: '2026-02-08T16:00:00Z' },
  { id: '7', name: 'Mobile App Development', value: 250000, stage: 'negotiation', probability: 70, expected_close_date: '2026-03-15', company: 'BlueWave Tech', description: null, created_at: '2026-01-25T13:00:00Z' },
  { id: '8', name: 'Social Media Management', value: 24000, stage: 'negotiation', probability: 75, expected_close_date: '2026-03-10', company: 'Creative Edge Studio', description: null, created_at: '2026-02-01T10:00:00Z' },
  { id: '9', name: 'Brand Strategy Package', value: 55000, stage: 'won', probability: 100, expected_close_date: '2026-02-28', company: 'Innovate Group', description: null, created_at: '2026-01-10T10:00:00Z' },
  { id: '10', name: 'Data Analytics Dashboard', value: 95000, stage: 'won', probability: 100, expected_close_date: '2026-02-15', company: 'FinServe Advisory', description: null, created_at: '2026-01-05T10:00:00Z' },
  { id: '11', name: 'SEO Optimization', value: 15000, stage: 'lost', probability: 0, expected_close_date: '2026-02-20', company: 'BuildRight Construction', description: null, created_at: '2026-01-15T10:00:00Z' },
  { id: '12', name: 'Cloud Migration', value: 180000, stage: 'lead', probability: 10, expected_close_date: '2026-06-01', company: 'TechCorp SA', description: null, created_at: '2026-02-25T10:00:00Z' },
]

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [useMockData, setUseMockData] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    value: '',
    stage: 'lead',
    probability: '20',
    expected_close_date: '',
    description: '',
  })

  useEffect(() => {
    loadDeals()
  }, [])

  async function loadDeals() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/crm/deals')
      const data = await res.json()

      if (res.ok) {
        const fetched = data.deals || []
        if (fetched.length === 0) {
          setDeals(MOCK_DEALS)
          setUseMockData(true)
        } else {
          setDeals(fetched)
          setUseMockData(false)
        }
      }
    } catch (error) {
      console.error('Failed to load deals:', error)
      setDeals(MOCK_DEALS)
      setUseMockData(true)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setIsCreating(true)

    try {
      const res = await fetch('/api/crm/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          value: parseFloat(formData.value) || 0,
          probability: parseInt(formData.probability) || 0,
        }),
      })

      if (res.ok) {
        setIsCreateOpen(false)
        setFormData({ name: '', value: '', stage: 'lead', probability: '20', expected_close_date: '', description: '' })
        loadDeals()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create deal')
      }
    } catch (error) {
      console.error('Create error:', error)
    } finally {
      setIsCreating(false)
    }
  }

  // Calculate summary stats
  const activeDeals = deals.filter((d) => !['won', 'lost'].includes(d.stage))
  const pipelineValue = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0)
  const wonDeals = deals.filter((d) => d.stage === 'won')
  const lostDeals = deals.filter((d) => d.stage === 'lost')
  const totalClosedCount = wonDeals.length + lostDeals.length
  const winRate = totalClosedCount > 0 ? Math.round((wonDeals.length / totalClosedCount) * 100) : 0

  // Group deals by stage for Kanban
  const dealsByStage: Record<string, Deal[]> = {}
  STAGES.forEach((s) => {
    dealsByStage[s.value] = deals.filter((d) => d.stage === s.value)
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/crm">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Deals Pipeline</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {deals.length} total deals
              {useMockData && (
                <span className="ml-1 text-xs text-amber-600">(sample data)</span>
              )}
            </p>
          </div>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Deal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Deal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Deal Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Website Redesign Project"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Value (R)</Label>
                  <Input
                    id="value"
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="10000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stage">Stage</Label>
                  <Select value={formData.stage} onValueChange={(v) => setFormData({ ...formData, stage: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="probability">Probability (%)</Label>
                  <Input
                    id="probability"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expected_close_date">Expected Close</Label>
                  <Input
                    id="expected_close_date"
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Deal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-sm">
          <div className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Pipeline</p>
              <p className="text-2xl font-bold text-gray-900">R{pipelineValue.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="shadow-sm">
          <div className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50">
              <Briefcase className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Deals</p>
              <p className="text-2xl font-bold text-gray-900">{activeDeals.length}</p>
            </div>
          </div>
        </Card>
        <Card className="shadow-sm">
          <div className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-purple-50">
              <Target className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Win Rate</p>
              <p className="text-2xl font-bold text-gray-900">{winRate}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Kanban Pipeline View */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="inline-flex gap-4" style={{ minWidth: 'max-content' }}>
            {STAGES.map((stage) => {
              const stageDeals = dealsByStage[stage.value] || []
              const stageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0)

              return (
                <div
                  key={stage.value}
                  className="flex w-[280px] flex-col rounded-lg border bg-gray-50/50"
                >
                  {/* Stage Header */}
                  <div className={`flex items-center justify-between rounded-t-lg border-b p-3 ${stage.headerBg}`}>
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${stage.dotColor}`} />
                      <span className="text-sm font-semibold text-gray-700">{stage.label}</span>
                      <Badge variant="secondary" className="h-5 min-w-[20px] justify-center rounded-full px-1.5 text-[10px]">
                        {stageDeals.length}
                      </Badge>
                    </div>
                    {stageValue > 0 && (
                      <span className="text-xs font-medium text-gray-500">
                        R{stageValue >= 1000 ? `${(stageValue / 1000).toFixed(0)}k` : stageValue}
                      </span>
                    )}
                  </div>

                  {/* Deal Cards */}
                  <div className="flex flex-1 flex-col gap-2 p-2" style={{ minHeight: '120px' }}>
                    {stageDeals.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center py-6 text-center">
                        <p className="text-xs text-gray-400">No deals</p>
                      </div>
                    ) : (
                      stageDeals.map((deal) => (
                        <Card
                          key={deal.id}
                          className="cursor-pointer bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                        >
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-900 leading-snug">
                              {deal.name}
                            </h4>
                            {deal.company && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Building2 className="h-3 w-3" />
                                {deal.company}
                              </div>
                            )}
                            {deal.contacts && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Building2 className="h-3 w-3" />
                                {deal.contacts.first_name} {deal.contacts.last_name}
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-gray-900">
                                R{deal.value?.toLocaleString() || '0'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {deal.probability}%
                              </span>
                            </div>
                            {deal.expected_close_date && (
                              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                                <Calendar className="h-3 w-3" />
                                {new Date(deal.expected_close_date).toLocaleDateString('en-ZA', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </div>
                            )}
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
