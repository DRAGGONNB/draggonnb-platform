'use client'

import { useEffect, useState, useCallback } from 'react'
import { BookOpen, Plus, Loader2, Search, Check, LogIn, LogOut, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Booking {
  id: string
  booking_ref: string
  status: string
  check_in_date: string
  check_out_date: string
  adults: number
  children: number
  total_amount: number | null
  source: string
  notes: string | null
  accommodation_properties?: { name: string } | null
  accommodation_guests?: { first_name: string; last_name: string } | null
  created_at: string
}

interface PropertyOption {
  id: string
  name: string
}

interface GuestOption {
  id: string
  first_name: string
  last_name: string
}

const BOOKING_STATUSES = [
  'inquiry',
  'quoted',
  'pending_deposit',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show',
]

const STATUS_COLORS: Record<string, string> = {
  inquiry: 'bg-blue-100 text-blue-700',
  quoted: 'bg-purple-100 text-purple-700',
  pending_deposit: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  checked_in: 'bg-emerald-100 text-emerald-700',
  checked_out: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-orange-100 text-orange-700',
}

const SOURCES = ['direct', 'booking_com', 'airbnb', 'whatsapp', 'email', 'phone', 'website', 'referral']

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const formatCurrency = (amount: number | null): string => {
  if (amount == null) return '-'
  return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatStatus = (status: string): string => {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Options for create form
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [guests, setGuests] = useState<GuestOption[]>([])

  const [newBooking, setNewBooking] = useState({
    property_id: '',
    guest_id: '',
    check_in_date: '',
    check_out_date: '',
    adults: 1,
    children: 0,
    source: 'direct',
    notes: '',
  })

  const fetchBookings = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (search.trim()) params.set('search', search.trim())
      const queryStr = params.toString()
      const url = queryStr
        ? `/api/accommodation/bookings?${queryStr}`
        : '/api/accommodation/bookings'
      const res = await fetch(url)
      if (res.status === 403) {
        setError('Accommodation module requires Growth tier or above.')
        return
      }
      const data = await res.json()
      setBookings(data.bookings || [])
    } catch {
      setError('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, search])

  const fetchFormOptions = async () => {
    try {
      const [propRes, guestRes] = await Promise.all([
        fetch('/api/accommodation/properties'),
        fetch('/api/accommodation/guests'),
      ])
      if (propRes.ok) {
        const propData = await propRes.json()
        setProperties(
          (propData.properties || []).map((p: PropertyOption) => ({
            id: p.id,
            name: p.name,
          }))
        )
      }
      if (guestRes.ok) {
        const guestData = await guestRes.json()
        setGuests(
          (guestData.guests || []).map((g: GuestOption) => ({
            id: g.id,
            first_name: g.first_name,
            last_name: g.last_name,
          }))
        )
      }
    } catch {
      // Silently fail - form will show empty selects
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  useEffect(() => {
    if (showCreate) {
      fetchFormOptions()
    }
  }, [showCreate])

  const handleCreate = async () => {
    if (!newBooking.property_id || !newBooking.guest_id || !newBooking.check_in_date || !newBooking.check_out_date) return
    setCreating(true)
    try {
      const res = await fetch('/api/accommodation/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newBooking,
          adults: Number(newBooking.adults),
          children: Number(newBooking.children),
          notes: newBooking.notes || null,
        }),
      })
      if (res.ok) {
        setShowCreate(false)
        setNewBooking({
          property_id: '',
          guest_id: '',
          check_in_date: '',
          check_out_date: '',
          adults: 1,
          children: 0,
          source: 'direct',
          notes: '',
        })
        fetchBookings()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create booking')
      }
    } catch {
      setError('Failed to create booking')
    } finally {
      setCreating(false)
    }
  }

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    setUpdatingId(bookingId)
    try {
      const res = await fetch(`/api/accommodation/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        fetchBookings()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update booking')
      }
    } catch {
      setError('Failed to update booking')
    } finally {
      setUpdatingId(null)
    }
  }

  const getQuickAction = (booking: Booking) => {
    const isUpdating = updatingId === booking.id

    switch (booking.status) {
      case 'inquiry':
      case 'quoted':
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateBookingStatus(booking.id, 'confirmed')}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Check className="mr-1 h-3 w-3" />
            )}
            Confirm
          </Button>
        )
      case 'confirmed':
      case 'pending_deposit':
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateBookingStatus(booking.id, 'checked_in')}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <LogIn className="mr-1 h-3 w-3" />
            )}
            Check In
          </Button>
        )
      case 'checked_in':
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateBookingStatus(booking.id, 'checked_out')}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <LogOut className="mr-1 h-3 w-3" />
            )}
            Check Out
          </Button>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            Bookings
          </h1>
          <p className="text-muted-foreground mt-2">Manage reservations and guest stays</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="mr-2 h-4 w-4" /> New Booking
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* Status Filter Pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1 rounded-full text-sm ${
            filterStatus === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}
        >
          All
        </button>
        {BOOKING_STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1 rounded-full text-sm ${
              filterStatus === status
                ? 'bg-primary text-primary-foreground'
                : STATUS_COLORS[status]
            }`}
          >
            {formatStatus(status)}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by guest name or booking ref..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Create Booking Form */}
      {showCreate && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New Booking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Property *</Label>
                <Select
                  value={newBooking.property_id}
                  onValueChange={(v) => setNewBooking({ ...newBooking, property_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Guest *</Label>
                <Select
                  value={newBooking.guest_id}
                  onValueChange={(v) => setNewBooking({ ...newBooking, guest_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select guest" />
                  </SelectTrigger>
                  <SelectContent>
                    {guests.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.first_name} {g.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select
                  value={newBooking.source}
                  onValueChange={(v) => setNewBooking({ ...newBooking, source: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, '.').replace('com', 'com')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Check-in Date *</Label>
                <Input
                  type="date"
                  value={newBooking.check_in_date}
                  onChange={(e) => setNewBooking({ ...newBooking, check_in_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Check-out Date *</Label>
                <Input
                  type="date"
                  value={newBooking.check_out_date}
                  onChange={(e) => setNewBooking({ ...newBooking, check_out_date: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Adults</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newBooking.adults}
                    onChange={(e) => setNewBooking({ ...newBooking, adults: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Children</Label>
                  <Input
                    type="number"
                    min={0}
                    value={newBooking.children}
                    onChange={(e) => setNewBooking({ ...newBooking, children: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2 max-w-2xl">
              <Label>Notes</Label>
              <Input
                value={newBooking.notes}
                onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
                placeholder="Special requests, dietary needs, etc."
              />
            </div>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create Booking
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Bookings Table */}
      {bookings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No bookings found. Create your first booking to start managing reservations.</p>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-mono text-sm">
                      {booking.booking_ref || booking.id.slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      {booking.accommodation_guests
                        ? `${booking.accommodation_guests.first_name} ${booking.accommodation_guests.last_name}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {booking.accommodation_properties?.name || '-'}
                    </TableCell>
                    <TableCell>{formatDate(booking.check_in_date)}</TableCell>
                    <TableCell>{formatDate(booking.check_out_date)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[booking.status] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {formatStatus(booking.status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(booking.total_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {getQuickAction(booking)}
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`/accommodation/bookings/${booking.id}`}>
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  )
}
