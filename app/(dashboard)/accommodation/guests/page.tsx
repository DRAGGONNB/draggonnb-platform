'use client'

import { useEffect, useState } from 'react'
import { Users, Plus, Loader2, Star, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Guest {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  nationality: string | null
  total_stays: number
  total_spent: number
  vip_status: boolean
  notes: string | null
  created_at: string
}

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [newGuest, setNewGuest] = useState({ first_name: '', last_name: '', email: '', phone: '' })

  const fetchGuests = async () => {
    try {
      const url = search
        ? `/api/accommodation/guests?search=${encodeURIComponent(search)}`
        : '/api/accommodation/guests'
      const res = await fetch(url)
      if (res.status === 403) {
        setError('Accommodation module requires Growth tier or above.')
        return
      }
      const data = await res.json()
      setGuests(data.guests || [])
    } catch {
      setError('Failed to load guests')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchGuests() }, [search])

  const handleCreate = async () => {
    if (!newGuest.first_name.trim() || !newGuest.last_name.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/accommodation/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGuest),
      })
      if (res.ok) {
        setShowCreate(false)
        setNewGuest({ first_name: '', last_name: '', email: '', phone: '' })
        fetchGuests()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create guest')
      }
    } catch {
      setError('Failed to create guest')
    } finally {
      setCreating(false)
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
            <Users className="h-8 w-8 text-primary" />
            Guest Directory
          </h1>
          <p className="text-muted-foreground mt-2">Manage your guest database</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="mr-2 h-4 w-4" /> Add Guest
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* Search */}
      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search guests..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {showCreate && (
        <Card className="mb-6">
          <CardHeader><CardTitle>New Guest</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input value={newGuest.first_name} onChange={(e) => setNewGuest({ ...newGuest, first_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input value={newGuest.last_name} onChange={(e) => setNewGuest({ ...newGuest, last_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={newGuest.email} onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={newGuest.phone} onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })} />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add Guest
            </Button>
          </CardContent>
        </Card>
      )}

      {guests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No guests yet. Add your first guest to build your directory.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {guests.map((guest) => (
            <Card key={guest.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{guest.first_name} {guest.last_name}</span>
                  {guest.vip_status && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  {guest.email && <div>{guest.email}</div>}
                  {guest.phone && <div>{guest.phone}</div>}
                  <div className="flex gap-4 mt-2">
                    <span>{guest.total_stays} stays</span>
                    <span>R{guest.total_spent?.toFixed(2) || '0.00'} spent</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
