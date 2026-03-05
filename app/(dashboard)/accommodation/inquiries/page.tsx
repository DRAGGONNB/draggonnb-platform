'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, Plus, Loader2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Inquiry {
  id: string
  guest_name: string
  guest_email: string | null
  guest_phone: string | null
  stage: string
  check_in_date: string | null
  check_out_date: string | null
  guests_count: number
  quoted_price: number | null
  source: string
  special_requests: string | null
  accommodation_properties?: { name: string } | null
  created_at: string
}

const STAGES = ['new', 'contacted', 'quoted', 'confirmed', 'checked_in', 'checked_out', 'closed', 'cancelled']
const STAGE_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  quoted: 'bg-purple-100 text-purple-700',
  confirmed: 'bg-green-100 text-green-700',
  checked_in: 'bg-emerald-100 text-emerald-700',
  checked_out: 'bg-gray-100 text-gray-700',
  closed: 'bg-gray-200 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterStage, setFilterStage] = useState<string>('all')
  const [newInquiry, setNewInquiry] = useState({ guest_name: '', guest_email: '', guest_phone: '', source: 'direct' })

  const fetchInquiries = async () => {
    try {
      const url = filterStage !== 'all'
        ? `/api/accommodation/inquiries?stage=${filterStage}`
        : '/api/accommodation/inquiries'
      const res = await fetch(url)
      if (res.status === 403) {
        setError('Accommodation module requires Growth tier or above.')
        return
      }
      const data = await res.json()
      setInquiries(data.inquiries || [])
    } catch {
      setError('Failed to load inquiries')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchInquiries() }, [filterStage])

  const handleCreate = async () => {
    if (!newInquiry.guest_name.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/accommodation/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInquiry),
      })
      if (res.ok) {
        setShowCreate(false)
        setNewInquiry({ guest_name: '', guest_email: '', guest_phone: '', source: 'direct' })
        fetchInquiries()
      }
    } catch {
      setError('Failed to create inquiry')
    } finally {
      setCreating(false)
    }
  }

  const advanceStage = async (inquiryId: string, currentStage: string) => {
    const currentIdx = STAGES.indexOf(currentStage)
    if (currentIdx === -1 || currentIdx >= STAGES.length - 1) return
    const nextStage = STAGES[currentIdx + 1]

    try {
      await fetch(`/api/accommodation/inquiries/${inquiryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: nextStage }),
      })
      fetchInquiries()
    } catch {
      setError('Failed to update inquiry')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-8 w-8 text-primary" />
            Inquiries
          </h1>
          <p className="text-muted-foreground mt-2">Track guest inquiries through your booking pipeline</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="mr-2 h-4 w-4" /> New Inquiry
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* Stage Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilterStage('all')}
          className={`px-3 py-1 rounded-full text-sm ${filterStage === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
        >
          All
        </button>
        {STAGES.map((stage) => (
          <button
            key={stage}
            onClick={() => setFilterStage(stage)}
            className={`px-3 py-1 rounded-full text-sm capitalize ${filterStage === stage ? 'bg-primary text-primary-foreground' : STAGE_COLORS[stage]}`}
          >
            {stage.replace('_', ' ')}
          </button>
        ))}
      </div>

      {showCreate && (
        <Card className="mb-6">
          <CardHeader><CardTitle>New Inquiry</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Guest Name *</Label>
                <Input value={newInquiry.guest_name} onChange={(e) => setNewInquiry({ ...newInquiry, guest_name: e.target.value })} placeholder="John Smith" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={newInquiry.guest_email} onChange={(e) => setNewInquiry({ ...newInquiry, guest_email: e.target.value })} placeholder="john@email.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={newInquiry.guest_phone} onChange={(e) => setNewInquiry({ ...newInquiry, guest_phone: e.target.value })} placeholder="+27..." />
              </div>
            </div>
            <div className="space-y-2 max-w-xs">
              <Label>Source</Label>
              <Select value={newInquiry.source} onValueChange={(v) => setNewInquiry({ ...newInquiry, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['direct', 'booking_com', 'airbnb', 'whatsapp', 'email', 'phone', 'website'].map((s) => (
                    <SelectItem key={s} value={s}>{s.replace('_', '.').replace('com', 'com')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create Inquiry
            </Button>
          </CardContent>
        </Card>
      )}

      {inquiries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No inquiries yet. Create your first inquiry to start tracking bookings.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inquiry) => (
            <Card key={inquiry.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{inquiry.guest_name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${STAGE_COLORS[inquiry.stage]}`}>
                      {inquiry.stage.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">{inquiry.source.replace('_', '.')}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {inquiry.guest_email && <span className="mr-3">{inquiry.guest_email}</span>}
                    {inquiry.check_in_date && <span>Check-in: {inquiry.check_in_date}</span>}
                    {inquiry.quoted_price && <span className="ml-3">R{inquiry.quoted_price}</span>}
                  </div>
                </div>
                {!['closed', 'cancelled', 'checked_out'].includes(inquiry.stage) && (
                  <Button variant="ghost" size="sm" onClick={() => advanceStage(inquiry.id, inquiry.stage)}>
                    Next <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
