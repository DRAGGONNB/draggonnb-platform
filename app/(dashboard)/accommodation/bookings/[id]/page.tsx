'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  BookOpen, ArrowLeft, Loader2, Copy, Check, ExternalLink,
  LogIn, LogOut, XCircle, Send, CreditCard, User, MapPin,
  Calendar, Users, FileText, Link2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface BookingDetail {
  id: string
  booking_ref: string
  status: string
  check_in_date: string
  check_out_date: string
  adults: number
  children: number
  total_amount: number | null
  deposit_amount: number | null
  balance_due: number | null
  source: string
  notes: string | null
  special_requests: string | null
  created_at: string
  accommodation_properties?: { id: string; name: string; type: string; address: string | null } | null
  accommodation_guests?: {
    id: string
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
    is_vip: boolean
  } | null
  accommodation_booking_segments?: { id: string; unit_id: string; accommodation_units: { name: string } | null }[]
}

interface PortalLink {
  token: string
  accessUrl: string
  portalPath: string
  expiresInDays: number
}

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

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    weekday: 'short',
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
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.id as string

  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [portalLink, setPortalLink] = useState<PortalLink | null>(null)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const fetchBooking = useCallback(async () => {
    try {
      const res = await fetch(`/api/accommodation/bookings/${bookingId}`)
      if (res.status === 404) {
        setError('Booking not found')
        return
      }
      if (res.status === 403) {
        setError('Accommodation module requires Growth tier or above.')
        return
      }
      if (!res.ok) {
        setError('Failed to load booking')
        return
      }
      const data = await res.json()
      setBooking(data.booking || data)
    } catch {
      setError('Failed to load booking')
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    fetchBooking()
  }, [fetchBooking])

  const updateStatus = async (newStatus: string) => {
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/accommodation/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        fetchBooking()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update status')
      }
    } catch {
      setError('Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const generatePortalLink = async () => {
    setGeneratingLink(true)
    try {
      const res = await fetch('/api/guest-portal/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, expiresInDays: 30 }),
      })
      if (res.ok) {
        const data = await res.json()
        setPortalLink(data)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to generate portal link')
      }
    } catch {
      setError('Failed to generate portal link')
    } finally {
      setGeneratingLink(false)
    }
  }

  const copyPortalLink = async () => {
    if (!portalLink) return
    try {
      await navigator.clipboard.writeText(portalLink.accessUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      // fallback
      const input = document.createElement('input')
      input.value = portalLink.accessUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }

  const getStatusActions = () => {
    if (!booking) return null
    const actions: { label: string; status: string; icon: React.ReactNode; variant?: 'default' | 'destructive' | 'outline' }[] = []

    switch (booking.status) {
      case 'inquiry':
        actions.push({ label: 'Mark Quoted', status: 'quoted', icon: <FileText className="mr-1 h-4 w-4" /> })
        actions.push({ label: 'Confirm', status: 'confirmed', icon: <Check className="mr-1 h-4 w-4" /> })
        break
      case 'quoted':
        actions.push({ label: 'Confirm', status: 'confirmed', icon: <Check className="mr-1 h-4 w-4" /> })
        actions.push({ label: 'Pending Deposit', status: 'pending_deposit', icon: <CreditCard className="mr-1 h-4 w-4" /> })
        break
      case 'pending_deposit':
        actions.push({ label: 'Confirm', status: 'confirmed', icon: <Check className="mr-1 h-4 w-4" /> })
        break
      case 'confirmed':
        actions.push({ label: 'Check In', status: 'checked_in', icon: <LogIn className="mr-1 h-4 w-4" /> })
        break
      case 'checked_in':
        actions.push({ label: 'Check Out', status: 'checked_out', icon: <LogOut className="mr-1 h-4 w-4" /> })
        break
    }

    if (!['cancelled', 'checked_out', 'no_show'].includes(booking.status)) {
      actions.push({ label: 'Cancel', status: 'cancelled', icon: <XCircle className="mr-1 h-4 w-4" />, variant: 'destructive' })
    }

    return actions
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !booking) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Button variant="ghost" onClick={() => router.push('/accommodation/bookings')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bookings
        </Button>
        <div className="p-6 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    )
  }

  if (!booking) return null

  const guest = booking.accommodation_guests
  const property = booking.accommodation_properties
  const segments = booking.accommodation_booking_segments || []
  const nights = Math.ceil(
    (new Date(booking.check_out_date).getTime() - new Date(booking.check_in_date).getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/accommodation/bookings')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Booking {booking.booking_ref || bookingId.slice(0, 8).toUpperCase()}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Created {formatDate(booking.created_at)}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
            STATUS_COLORS[booking.status] || 'bg-gray-100 text-gray-700'
          }`}
        >
          {formatStatus(booking.status)}
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Main details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stay Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" /> Stay Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Check-in</p>
                  <p className="font-medium mt-1">{formatDate(booking.check_in_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Check-out</p>
                  <p className="font-medium mt-1">{formatDate(booking.check_out_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Nights</p>
                  <p className="font-medium mt-1">{nights}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Source</p>
                  <p className="font-medium mt-1 capitalize">{booking.source.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Adults</p>
                  <p className="font-medium mt-1">{booking.adults}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Children</p>
                  <p className="font-medium mt-1">{booking.children}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Guests</p>
                  <p className="font-medium mt-1">{booking.adults + booking.children}</p>
                </div>
              </div>
              {segments.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Assigned Units</p>
                  <div className="flex flex-wrap gap-2">
                    {segments.map((seg) => (
                      <span key={seg.id} className="inline-flex px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                        {(seg.accommodation_units as unknown as { name: string } | null)?.name || seg.unit_id.slice(0, 8)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5" /> Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Amount</p>
                  <p className="text-xl font-bold mt-1">{formatCurrency(booking.total_amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Deposit</p>
                  <p className="text-xl font-bold mt-1">{formatCurrency(booking.deposit_amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Balance Due</p>
                  <p className="text-xl font-bold mt-1 text-orange-600">{formatCurrency(booking.balance_due)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes & Requests */}
          {(booking.notes || booking.special_requests) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" /> Notes & Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {booking.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Internal Notes</p>
                    <p className="text-sm">{booking.notes}</p>
                  </div>
                )}
                {booking.special_requests && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Guest Special Requests</p>
                    <p className="text-sm">{booking.special_requests}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column - Guest, Property, Actions */}
        <div className="space-y-6">
          {/* Guest Card */}
          {guest && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" /> Guest
                  {guest.is_vip && (
                    <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">VIP</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{guest.first_name} {guest.last_name}</p>
                {guest.email && (
                  <p className="text-sm text-muted-foreground">{guest.email}</p>
                )}
                {guest.phone && (
                  <p className="text-sm text-muted-foreground">{guest.phone}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Property Card */}
          {property && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5" /> Property
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{property.name}</p>
                <p className="text-sm text-muted-foreground capitalize">{property.type}</p>
                {property.address && (
                  <p className="text-sm text-muted-foreground">{property.address}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Status Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {getStatusActions()?.map((action) => (
                <Button
                  key={action.status}
                  variant={action.variant || 'outline'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => updateStatus(action.status)}
                  disabled={updatingStatus}
                >
                  {updatingStatus ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : action.icon}
                  {action.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Guest Portal Link */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Link2 className="h-5 w-5" /> Guest Portal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!portalLink ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={generatePortalLink}
                  disabled={generatingLink}
                >
                  {generatingLink ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Generate Access Link
                </Button>
              ) : (
                <>
                  <div className="p-2 bg-muted rounded text-xs font-mono break-all">
                    {portalLink.accessUrl}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={copyPortalLink}>
                      {linkCopied ? (
                        <Check className="mr-1 h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="mr-1 h-3 w-3" />
                      )}
                      {linkCopied ? 'Copied' : 'Copy'}
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={portalLink.portalPath} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-1 h-3 w-3" /> Open
                      </a>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Valid for {portalLink.expiresInDays} days. Share with guest via email or WhatsApp.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={generatePortalLink}
                    disabled={generatingLink}
                  >
                    Regenerate Link
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
