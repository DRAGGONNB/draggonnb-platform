'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Loader2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateRange(start: Date, days: number): Date[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

function formatRangeLabel(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  return `${start.toLocaleDateString('en-ZA', opts)} - ${end.toLocaleDateString('en-ZA', opts)}`
}

function getDayOfWeek(date: Date): string {
  return date.toLocaleDateString('en-ZA', { weekday: 'short' })
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function stripTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Property {
  id: string
  name: string
  type: string
}

interface Unit {
  id: string
  name: string
  type: string
  max_guests: number
}

interface Booking {
  id: string
  booking_ref: string
  check_in_date: string
  check_out_date: string
  status: string
  accommodation_guests?: { first_name: string; last_name: string } | null
}

interface BookingSegment {
  id: string
  booking_id: string
  unit_id: string | null
  check_in_date: string
  check_out_date: string
}

// A resolved calendar entry mapped to a specific unit (or unassigned)
interface CalendarEntry {
  bookingId: string
  bookingRef: string
  guestName: string
  status: string
  checkIn: Date
  checkOut: Date
  unitId: string | null
}

// ---------------------------------------------------------------------------
// Status colours
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  inquiry: 'bg-blue-200 text-blue-800 border-blue-300',
  quoted: 'bg-purple-200 text-purple-800 border-purple-300',
  pending_deposit: 'bg-yellow-200 text-yellow-800 border-yellow-300',
  confirmed: 'bg-green-200 text-green-800 border-green-300',
  checked_in: 'bg-emerald-300 text-emerald-900 border-emerald-400',
  checked_out: 'bg-gray-200 text-gray-700 border-gray-300',
  cancelled: 'bg-red-200 text-red-800 border-red-300',
  no_show: 'bg-orange-200 text-orange-800 border-orange-300',
}

const STATUS_LABELS: Record<string, string> = {
  inquiry: 'Inquiry',
  quoted: 'Quoted',
  pending_deposit: 'Pending Deposit',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  cancelled: 'Cancelled',
  no_show: 'No Show',
}

const VISIBLE_DAYS = 14

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CalendarPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [units, setUnits] = useState<Unit[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [segments, setSegments] = useState<BookingSegment[]>([])
  const [startDate, setStartDate] = useState<Date>(() => stripTime(new Date()))
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ---- Fetch properties on mount ----
  useEffect(() => {
    async function fetchProperties() {
      try {
        const res = await fetch('/api/accommodation/properties')
        if (res.status === 403) {
          setError('Accommodation module requires Growth tier or above. Upgrade to access.')
          return
        }
        const data = await res.json()
        setProperties(data.properties || [])
      } catch {
        setError('Failed to load properties')
      } finally {
        setLoading(false)
      }
    }
    fetchProperties()
  }, [])

  // ---- Fetch units + bookings + segments when property changes ----
  const fetchCalendarData = useCallback(async (propertyId: string) => {
    if (!propertyId) {
      setUnits([])
      setBookings([])
      setSegments([])
      return
    }

    setDataLoading(true)
    setError(null)

    try {
      const [unitsRes, bookingsRes] = await Promise.all([
        fetch(`/api/accommodation/units?property_id=${propertyId}`),
        fetch(`/api/accommodation/bookings?property_id=${propertyId}`),
      ])

      const [unitsData, bookingsData] = await Promise.all([
        unitsRes.json(),
        bookingsRes.json(),
      ])

      const fetchedUnits: Unit[] = unitsData.units || []
      const fetchedBookings: Booking[] = bookingsData.bookings || []

      setUnits(fetchedUnits)
      setBookings(fetchedBookings)

      // Fetch segments for all bookings to map them to units
      // We fetch in parallel batches to avoid too many concurrent requests
      if (fetchedBookings.length > 0) {
        const segmentPromises = fetchedBookings.map((b) =>
          fetch(`/api/accommodation/booking-segments?booking_id=${b.id}`)
            .then((r) => r.json())
            .then((d) => (d.segments || []) as BookingSegment[])
            .catch(() => [] as BookingSegment[])
        )
        const allSegmentArrays = await Promise.all(segmentPromises)
        setSegments(allSegmentArrays.flat())
      } else {
        setSegments([])
      }
    } catch {
      setError('Failed to load calendar data')
    } finally {
      setDataLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedPropertyId) {
      fetchCalendarData(selectedPropertyId)
    }
  }, [selectedPropertyId, fetchCalendarData])

  // ---- Derived data ----
  const dates = useMemo(() => getDateRange(startDate, VISIBLE_DAYS), [startDate])
  const today = useMemo(() => stripTime(new Date()), [])
  const endDate = useMemo(() => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + VISIBLE_DAYS - 1)
    return d
  }, [startDate])

  // Build calendar entries: map bookings to units via segments
  const calendarEntries = useMemo<CalendarEntry[]>(() => {
    const entries: CalendarEntry[] = []

    for (const booking of bookings) {
      // Skip cancelled/no-show bookings from the visual grid
      if (booking.status === 'cancelled' || booking.status === 'no_show') continue

      const guestName = booking.accommodation_guests
        ? `${booking.accommodation_guests.last_name}`
        : 'Guest'

      // Find segments for this booking
      const bookingSegments = segments.filter((s) => s.booking_id === booking.id)

      if (bookingSegments.length > 0) {
        // Use segment dates & unit assignment
        for (const seg of bookingSegments) {
          entries.push({
            bookingId: booking.id,
            bookingRef: booking.booking_ref,
            guestName,
            status: booking.status,
            checkIn: stripTime(new Date(seg.check_in_date + 'T00:00:00')),
            checkOut: stripTime(new Date(seg.check_out_date + 'T00:00:00')),
            unitId: seg.unit_id,
          })
        }
      } else {
        // No segments -- show as unassigned using booking-level dates
        entries.push({
          bookingId: booking.id,
          bookingRef: booking.booking_ref,
          guestName,
          status: booking.status,
          checkIn: stripTime(new Date(booking.check_in_date + 'T00:00:00')),
          checkOut: stripTime(new Date(booking.check_out_date + 'T00:00:00')),
          unitId: null,
        })
      }
    }

    return entries
  }, [bookings, segments])

  // Group entries by unit id for fast lookup
  const entriesByUnit = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>()
    for (const entry of calendarEntries) {
      const key = entry.unitId ?? '__unassigned__'
      const list = map.get(key) || []
      list.push(entry)
      map.set(key, list)
    }
    return map
  }, [calendarEntries])

  // Check if there are any unassigned entries
  const hasUnassigned = entriesByUnit.has('__unassigned__')

  // ---- Navigation ----
  function navigatePrev() {
    const d = new Date(startDate)
    d.setDate(d.getDate() - VISIBLE_DAYS)
    setStartDate(d)
  }

  function navigateNext() {
    const d = new Date(startDate)
    d.setDate(d.getDate() + VISIBLE_DAYS)
    setStartDate(d)
  }

  function navigateToday() {
    setStartDate(stripTime(new Date()))
  }

  // ---- Find booking for a cell ----
  function getEntryForCell(unitKey: string, date: Date): CalendarEntry | null {
    const entries = entriesByUnit.get(unitKey) || []
    const dateMs = date.getTime()
    for (const entry of entries) {
      // A booking occupies nights from check-in up to (but not including) check-out
      if (dateMs >= entry.checkIn.getTime() && dateMs < entry.checkOut.getTime()) {
        return entry
      }
    }
    return null
  }

  // Check if this cell is the first day of the booking block
  function isBlockStart(entry: CalendarEntry, date: Date): boolean {
    // The visual start is the later of the booking check-in or the first visible date
    const visibleStart = entry.checkIn.getTime() < startDate.getTime() ? startDate : entry.checkIn
    return isSameDay(visibleStart, date)
  }

  // Calculate the visual span of a booking block
  function getBlockSpan(entry: CalendarEntry, date: Date): number {
    const rangeEnd = new Date(startDate)
    rangeEnd.setDate(rangeEnd.getDate() + VISIBLE_DAYS)
    const visibleEnd = entry.checkOut.getTime() > rangeEnd.getTime() ? rangeEnd : entry.checkOut
    const span = Math.round((visibleEnd.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(1, span)
  }

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && properties.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="p-6 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    )
  }

  // ---- Build rows: one per unit + optional unassigned row ----
  type GridRow = { key: string; label: string; sublabel: string }
  const gridRows: GridRow[] = units.map((u) => ({
    key: u.id,
    label: u.name,
    sublabel: `${u.type}${u.max_guests ? ` - ${u.max_guests} guests` : ''}`,
  }))
  if (hasUnassigned) {
    gridRows.push({ key: '__unassigned__', label: 'Unassigned', sublabel: 'No unit allocated' })
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-[1600px]">
      {/* ---- Header ---- */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calendar className="h-8 w-8 text-primary" />
          Availability Calendar
        </h1>
        <p className="text-muted-foreground mt-2">
          View unit availability and bookings across dates
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* ---- Controls Bar ---- */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {/* Property selector */}
            <div className="w-full md:w-72">
              <Select
                value={selectedPropertyId}
                onValueChange={(v) => setSelectedPropertyId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a property" />
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

            {/* Date navigation */}
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="outline" size="icon" onClick={navigatePrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[200px] text-center">
                {formatRangeLabel(startDate, endDate)}
              </span>
              <Button variant="outline" size="icon" onClick={navigateNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={navigateToday}>
                Today
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---- Main Grid ---- */}
      {!selectedPropertyId ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Select a property to view the availability calendar</p>
        </div>
      ) : dataLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : gridRows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No units found for this property</p>
          <p className="text-sm mt-1">Add units to this property to see the availability grid</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  {/* Day-of-week row */}
                  <tr className="border-b">
                    <th className="sticky left-0 z-20 bg-background min-w-[160px] p-2 text-left border-r" />
                    {dates.map((date) => {
                      const isToday = isSameDay(date, today)
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6
                      return (
                        <th
                          key={`dow-${formatDate(date)}`}
                          className={`min-w-[80px] p-1 text-center text-xs font-medium border-r ${
                            isToday
                              ? 'bg-primary/10 text-primary'
                              : isWeekend
                                ? 'bg-muted/50 text-muted-foreground'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {getDayOfWeek(date)}
                        </th>
                      )
                    })}
                  </tr>
                  {/* Date row */}
                  <tr className="border-b">
                    <th className="sticky left-0 z-20 bg-background min-w-[160px] p-2 text-left text-xs font-semibold text-muted-foreground border-r">
                      Unit
                    </th>
                    {dates.map((date) => {
                      const isToday = isSameDay(date, today)
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6
                      return (
                        <th
                          key={`date-${formatDate(date)}`}
                          className={`min-w-[80px] p-1 text-center text-xs font-semibold border-r ${
                            isToday
                              ? 'bg-primary/10 text-primary border-primary/30'
                              : isWeekend
                                ? 'bg-muted/50'
                                : ''
                          }`}
                        >
                          {formatShortDate(date)}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {gridRows.map((row) => (
                    <tr key={row.key} className="border-b last:border-b-0 group/row">
                      {/* Unit name - sticky */}
                      <td className="sticky left-0 z-10 bg-background min-w-[160px] p-2 border-r">
                        <div className="text-sm font-medium truncate max-w-[150px]">
                          {row.label}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize truncate max-w-[150px]">
                          {row.sublabel}
                        </div>
                      </td>
                      {/* Date cells */}
                      {dates.map((date, colIdx) => {
                        const isToday = isSameDay(date, today)
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6
                        const entry = getEntryForCell(row.key, date)

                        if (entry) {
                          const blockStart = isBlockStart(entry, date)
                          const span = blockStart ? getBlockSpan(entry, date) : 0
                          const statusColor = STATUS_COLORS[entry.status] || 'bg-gray-100 text-gray-600 border-gray-200'

                          if (blockStart) {
                            // Render the booking block spanning multiple cells
                            const clampedSpan = Math.min(span, VISIBLE_DAYS - colIdx)
                            return (
                              <td
                                key={`cell-${row.key}-${formatDate(date)}`}
                                colSpan={clampedSpan}
                                className={`min-w-[80px] p-0.5 border-r relative ${
                                  isToday ? 'border-l-2 border-l-primary' : ''
                                }`}
                              >
                                <div
                                  className={`rounded px-1.5 py-1 text-xs font-medium truncate border ${statusColor} cursor-default`}
                                  title={`${entry.bookingRef} - ${entry.guestName} (${STATUS_LABELS[entry.status] || entry.status})`}
                                >
                                  {entry.guestName}
                                </div>
                              </td>
                            )
                          }

                          // This cell is part of a block that started earlier -- skip rendering
                          // (it is covered by the colSpan of the block start cell)
                          return null
                        }

                        // Empty / available cell
                        return (
                          <td
                            key={`cell-${row.key}-${formatDate(date)}`}
                            className={`min-w-[80px] p-0.5 border-r transition-colors ${
                              isToday
                                ? 'bg-primary/5 border-l-2 border-l-primary'
                                : isWeekend
                                  ? 'bg-muted/30'
                                  : ''
                            } hover:bg-green-50`}
                          />
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- Legend ---- */}
      {selectedPropertyId && !dataLoading && gridRows.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(STATUS_LABELS).map(([status, label]) => {
                const color = STATUS_COLORS[status] || ''
                return (
                  <div key={status} className="flex items-center gap-1.5">
                    <div className={`w-4 h-4 rounded border ${color}`} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                )
              })}
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded border bg-green-50 border-green-200" />
                <span className="text-xs text-muted-foreground">Available</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
