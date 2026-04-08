'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RESTAURANT_ID, SECTION_ORDER, SECTION_META, formatZAR, elapsedMinutes } from '@/lib/restaurant/constants'
import {
  Loader2,
  Users,
  MapPin,
  ChevronDown,
  ChevronUp,
  UtensilsCrossed,
  Clock,
  CreditCard,
  X,
} from 'lucide-react'
import OpenSessionModal from './components/OpenSessionModal'

interface Session {
  id: string
  waiter_id: string | null
  party_size: number
  opened_at: string
  status: string
  waiter_name?: string
  bill_id?: string
  bill_total?: number
  bill_status?: string
}

interface Table {
  id: string
  label: string
  section: string
  capacity: number
  qr_token: string | null
  session?: Session | null
}

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [openModalTable, setOpenModalTable] = useState<Table | null>(null)
  const [closing, setClosing] = useState<string | null>(null)

  const fetchTables = useCallback(async () => {
    try {
      const supabase = createClient()

      // Get tables
      const { data: tablesData, error: err } = await supabase
        .from('restaurant_tables')
        .select('id, label, section, capacity, qr_token')
        .eq('restaurant_id', RESTAURANT_ID)
        .order('section')
        .order('label')

      if (err) throw err

      // Get active sessions with bill info
      const { data: sessions } = await supabase
        .from('table_sessions')
        .select(`
          id, table_id, waiter_id, party_size, opened_at, status,
          restaurant_staff(display_name),
          bills(id, total, status)
        `)
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('status', 'open')

      // Map sessions to tables
      const sessionMap = new Map<string, Session>()
      for (const s of sessions ?? []) {
        const staff = s.restaurant_staff as unknown as { display_name: string } | null
        const bills = s.bills as unknown as { id: string; total: number; status: string }[]
        const bill = bills?.[0]
        sessionMap.set(s.table_id, {
          id: s.id,
          waiter_id: s.waiter_id,
          party_size: s.party_size,
          opened_at: s.opened_at,
          status: s.status,
          waiter_name: staff?.display_name ?? undefined,
          bill_id: bill?.id,
          bill_total: bill?.total,
          bill_status: bill?.status,
        })
      }

      setTables(
        (tablesData ?? []).map((t) => ({
          ...t,
          session: sessionMap.get(t.id) ?? null,
        }))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tables')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTables()
    const interval = setInterval(fetchTables, 15000)
    return () => clearInterval(interval)
  }, [fetchTables])

  async function handleCloseTable(sessionId: string) {
    setClosing(sessionId)
    try {
      const res = await fetch(`/api/restaurant/sessions/${sessionId}/close`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to close table')
      }
      await fetchTables()
    } finally {
      setClosing(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0077B6]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <p className="text-red-600 font-medium">Error loading tables</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  const activeSessions = tables.filter((t) => t.session).length

  // Group by section
  const grouped: Record<string, Table[]> = {}
  for (const table of tables) {
    const section = table.section ?? 'other'
    if (!grouped[section]) grouped[section] = []
    grouped[section].push(table)
  }

  const sortedSections = Object.keys(grouped).sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a as (typeof SECTION_ORDER)[number])
    const bi = SECTION_ORDER.indexOf(b as (typeof SECTION_ORDER)[number])
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tables</h1>
          <p className="text-sm text-gray-500 mt-1">
            {tables.length} tables &middot; {activeSessions} occupied
          </p>
        </div>
      </div>

      {tables.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <UtensilsCrossed className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No tables configured yet</p>
        </div>
      ) : (
        sortedSections.map((section) => {
          const meta = SECTION_META[section] ?? {
            label: section.charAt(0).toUpperCase() + section.slice(1),
            color: 'text-gray-700',
            bg: 'bg-gray-50',
          }
          const sectionTables = grouped[section]

          return (
            <div key={section}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md ${meta.bg} ${meta.color}`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {meta.label}
                </span>
                <span className="text-xs text-gray-400">{sectionTables.length} tables</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {sectionTables.map((table) => {
                  const isExpanded = expandedId === table.id
                  const s = table.session
                  const isOccupied = !!s
                  const hasPendingPayment = s?.bill_status === 'partially_paid' || (s?.bill_total && s.bill_total > 0 && s.bill_status === 'open')

                  const dotColor = !isOccupied
                    ? 'bg-emerald-400'
                    : hasPendingPayment
                      ? 'bg-red-400'
                      : 'bg-amber-400'

                  return (
                    <button
                      key={table.id}
                      onClick={() => setExpandedId(isExpanded ? null : table.id)}
                      className={`text-left bg-white rounded-xl border transition-all ${
                        isExpanded
                          ? 'border-[#0077B6] shadow-md ring-1 ring-[#0077B6]/20'
                          : isOccupied
                            ? 'border-amber-200 bg-amber-50/30'
                            : 'border-gray-200 hover:shadow-sm'
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-gray-900">{table.label}</span>
                          <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} />
                        </div>

                        {isOccupied ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-amber-700">
                              <Users className="w-3.5 h-3.5" />
                              Party of {s.party_size}
                            </div>
                            {s.waiter_name && (
                              <p className="text-xs text-gray-500 truncate">{s.waiter_name}</p>
                            )}
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />
                              {elapsedMinutes(s.opened_at)}m
                            </div>
                            {s.bill_total !== undefined && s.bill_total > 0 && (
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                                <CreditCard className="w-3 h-3" />
                                {formatZAR(s.bill_total)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Users className="w-3.5 h-3.5" />
                            Seats {table.capacity}
                          </div>
                        )}

                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400 mt-2" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400 mt-2" />
                        )}
                      </div>

                      {isExpanded && (
                        <div
                          className="border-t border-gray-100 px-4 py-3 space-y-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isOccupied ? (
                            <>
                              <div className="text-xs text-gray-600 space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Status</span>
                                  <span className="font-medium text-amber-600">Occupied</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Bill</span>
                                  <span className="font-medium capitalize">{s.bill_status ?? 'open'}</span>
                                </div>
                              </div>
                              <div className="flex gap-2 pt-1">
                                <a
                                  href={`/restaurant/bills?session=${s.id}`}
                                  className="flex-1 text-center text-xs font-medium py-2 rounded-lg bg-[#0077B6]/10 text-[#0077B6] hover:bg-[#0077B6]/20"
                                >
                                  View Bill
                                </a>
                                <button
                                  onClick={() => handleCloseTable(s.id)}
                                  disabled={closing === s.id}
                                  className="flex-1 text-center text-xs font-medium py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                                >
                                  {closing === s.id ? 'Closing...' : 'Close Table'}
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-xs text-gray-600 space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Capacity</span>
                                  <span className="font-medium">{table.capacity} guests</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Status</span>
                                  <span className="font-medium text-emerald-600">Available</span>
                                </div>
                              </div>
                              <button
                                onClick={() => setOpenModalTable(table)}
                                className="w-full text-center text-xs font-medium py-2 rounded-lg bg-[#0077B6] text-white hover:bg-[#006399] mt-1"
                              >
                                Open Table
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })
      )}

      {openModalTable && (
        <OpenSessionModal
          table={openModalTable}
          onClose={() => setOpenModalTable(null)}
          onSuccess={() => {
            setOpenModalTable(null)
            fetchTables()
          }}
        />
      )}
    </div>
  )
}
