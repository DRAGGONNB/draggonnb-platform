'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { RESTAURANT_ID, SECTION_ORDER, SECTION_META, formatZAR, elapsedMinutes } from '@/lib/restaurant/constants'
import type { FloorPlan, TableWithSession, RestaurantTable } from '@/lib/restaurant/types'
import {
  Loader2,
  Users,
  MapPin,
  ChevronDown,
  ChevronUp,
  UtensilsCrossed,
  Clock,
  CreditCard,
  LayoutGrid,
  Map,
  Pencil,
  Save,
  Link2,
  Unlink,
  RotateCw,
  Square,
  Circle,
} from 'lucide-react'
import OpenSessionModal from './components/OpenSessionModal'
import LinkTablesModal from './components/LinkTablesModal'

// Dynamic import for Konva (SSR-incompatible)
const FloorPlanCanvas = dynamic(() => import('./components/FloorPlanCanvas'), { ssr: false })

type ViewMode = 'grid' | 'floorplan'

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
  x_pos: number
  y_pos: number
  width: number
  height: number
  rotation: number
  shape: string
  linked_group_id: string | null
  session?: Session | null
}

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [openModalTable, setOpenModalTable] = useState<Table | null>(null)
  const [closing, setClosing] = useState<string | null>(null)

  // Floor plan state
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [editMode, setEditMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pendingMoves, setPendingMoves] = useState<Record<string, { x: number; y: number }>>({})

  const fetchTables = useCallback(async () => {
    try {
      const supabase = createClient()

      const { data: tablesData, error: err } = await supabase
        .from('restaurant_tables')
        .select('id, label, section, capacity, qr_token, x_pos, y_pos, width, height, rotation, shape, linked_group_id, floor_plan_id')
        .eq('restaurant_id', RESTAURANT_ID)
        .order('section')
        .order('label')

      if (err) throw err

      const { data: sessions } = await supabase
        .from('table_sessions')
        .select(`
          id, table_id, waiter_id, party_size, opened_at, status,
          restaurant_staff(display_name),
          bills(id, total, status)
        `)
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('status', 'open')

      const sessionMap: Record<string, Session> = {}
      for (const s of sessions ?? []) {
        const staff = s.restaurant_staff as unknown as { display_name: string } | null
        const bills = s.bills as unknown as { id: string; total: number; status: string }[]
        const bill = bills?.[0]
        sessionMap[s.table_id] = {
          id: s.id,
          waiter_id: s.waiter_id,
          party_size: s.party_size,
          opened_at: s.opened_at,
          status: s.status,
          waiter_name: staff?.display_name ?? undefined,
          bill_id: bill?.id,
          bill_total: bill?.total,
          bill_status: bill?.status,
        }
      }

      setTables(
        (tablesData ?? []).map((t) => ({
          ...t,
          x_pos: Number(t.x_pos) || 0,
          y_pos: Number(t.y_pos) || 0,
          width: Number(t.width) || 80,
          height: Number(t.height) || 80,
          rotation: Number(t.rotation) || 0,
          shape: t.shape || 'rect',
          session: sessionMap[t.id] ?? null,
        }))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tables')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch floor plan
  useEffect(() => {
    async function loadFloorPlan() {
      try {
        const res = await fetch('/api/restaurant/floor-plans')
        if (res.ok) {
          const plans = await res.json()
          if (plans.length) setFloorPlan(plans[0])
        }
      } catch { /* no floor plan yet */ }
    }
    loadFloorPlan()
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

  // Floor plan handlers
  function handleTableMove(id: string, x: number, y: number) {
    setPendingMoves((prev) => ({ ...prev, [id]: { x, y } }))
    setTables((prev) =>
      prev.map((t) => (t.id === id ? { ...t, x_pos: x, y_pos: y } : t))
    )
  }

  async function handleSaveLayout() {
    const moveIds = Object.keys(pendingMoves)
    if (moveIds.length === 0) { setEditMode(false); return }
    setSaving(true)

    const updates = moveIds.map((id) => {
      const pos = pendingMoves[id]
      const table = tables.find((t) => t.id === id)
      return {
        id,
        x_pos: pos.x,
        y_pos: pos.y,
        width: table?.width || 80,
        height: table?.height || 80,
        rotation: table?.rotation || 0,
        shape: table?.shape || 'rect',
      }
    })

    try {
      const res = await fetch('/api/restaurant/tables/positions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tables: updates }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Failed to save layout')
      }
    } finally {
      setSaving(false)
      setPendingMoves({})
      setEditMode(false)
    }
  }

  async function handleUnlinkGroup() {
    const table = tables.find((t) => selectedIds.includes(t.id) && t.linked_group_id)
    if (!table?.linked_group_id) return

    const res = await fetch(`/api/restaurant/tables/groups?id=${table.linked_group_id}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setSelectedIds([])
      fetchTables()
    }
  }

  function handleTableClick(id: string) {
    const table = tables.find((t) => t.id === id)
    if (!table) return

    if (table.session) {
      setExpandedId(id)
    } else {
      setOpenModalTable(table)
    }
  }

  function handleChangeShape(shape: string) {
    setTables((prev) =>
      prev.map((t) =>
        selectedIds.includes(t.id) ? { ...t, shape } : t
      )
    )
    setPendingMoves((prev) => {
      const next = { ...prev }
      selectedIds.forEach((id) => {
        const table = tables.find((t) => t.id === id)
        next[id] = { x: table?.x_pos || 0, y: table?.y_pos || 0 }
      })
      return next
    })
  }

  // Auto-create floor plan if none exists and user switches to floorplan view
  async function handleSwitchToFloorPlan() {
    setViewMode('floorplan')
    if (!floorPlan) {
      try {
        const res = await fetch('/api/restaurant/floor-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Main Floor' }),
        })
        if (res.ok) {
          const plan = await res.json()
          setFloorPlan(plan)
        }
      } catch { /* silent */ }
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
  const selectedHasGroup = selectedIds.some((id) => tables.find((t) => t.id === id)?.linked_group_id)

  // Group by section for grid view
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tables</h1>
          <p className="text-sm text-gray-500 mt-1">
            {tables.length} tables &middot; {activeSessions} occupied
          </p>
        </div>

        {/* View toggle + edit controls */}
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="inline-flex rounded-lg bg-gray-200 p-1">
            <button
              onClick={() => { setViewMode('grid'); setEditMode(false); setSelectedIds([]) }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              <LayoutGrid size={14} /> Grid
            </button>
            <button
              onClick={handleSwitchToFloorPlan}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'floorplan' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              <Map size={14} /> Floor Plan
            </button>
          </div>

          {/* Floor plan edit controls */}
          {viewMode === 'floorplan' && (
            <>
              {editMode ? (
                <div className="flex items-center gap-1.5">
                  {/* Shape tools */}
                  {selectedIds.length > 0 && (
                    <div className="flex items-center gap-1 mr-2 border-r pr-2 border-gray-300">
                      <button onClick={() => handleChangeShape('rect')} title="Rectangle"
                        className="p-1.5 rounded hover:bg-gray-100"><Square size={16} /></button>
                      <button onClick={() => handleChangeShape('circle')} title="Circle"
                        className="p-1.5 rounded hover:bg-gray-100"><Circle size={16} /></button>
                      <button onClick={() => handleChangeShape('oval')} title="Oval"
                        className="p-1.5 rounded hover:bg-gray-100">
                        <Circle size={16} className="scale-x-150" />
                      </button>
                    </div>
                  )}

                  {/* Link/unlink */}
                  {selectedIds.length >= 2 && !selectedHasGroup && (
                    <button
                      onClick={() => setShowLinkModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100"
                    >
                      <Link2 size={14} /> Link
                    </button>
                  )}
                  {selectedHasGroup && (
                    <button
                      onClick={handleUnlinkGroup}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100"
                    >
                      <Unlink size={14} /> Unlink
                    </button>
                  )}

                  <button
                    onClick={handleSaveLayout}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save Layout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200"
                >
                  <Pencil size={14} /> Edit Layout
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {tables.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <UtensilsCrossed className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No tables configured yet</p>
        </div>
      ) : viewMode === 'floorplan' ? (
        /* ─── Floor Plan View ─── */
        <div className="space-y-4">
          {editMode && (
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200">
              <Pencil size={12} />
              Drag tables to reposition. Shift+click to multi-select. Use Link to merge tables.
            </div>
          )}

          <FloorPlanCanvas
            tables={tables as unknown as TableWithSession[]}
            floorPlan={floorPlan}
            editMode={editMode}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
            onTableMove={handleTableMove}
            onTableResize={() => {}}
            onTableClick={handleTableClick}
          />

          {/* Selected table detail panel */}
          {!editMode && expandedId && (() => {
            const table = tables.find((t) => t.id === expandedId)
            if (!table) return null
            const s = table.session
            return (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{table.label}</h3>
                    <p className="text-xs text-gray-500">
                      {SECTION_META[table.section]?.label || table.section} &middot; {table.capacity} seats
                    </p>
                  </div>
                  <button onClick={() => setExpandedId(null)} className="p-1 hover:bg-gray-100 rounded">
                    <RotateCw size={14} className="text-gray-400" />
                  </button>
                </div>

                {s ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-amber-700">
                        <Users size={13} /> Party of {s.party_size}
                      </div>
                      {s.waiter_name && (
                        <div className="text-gray-600 truncate">{s.waiter_name}</div>
                      )}
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Clock size={13} /> {elapsedMinutes(s.opened_at)}min
                      </div>
                      {s.bill_total !== undefined && s.bill_total > 0 && (
                        <div className="flex items-center gap-1.5 font-semibold text-gray-700">
                          <CreditCard size={13} /> {formatZAR(s.bill_total)}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <a href={`/restaurant/bills?session=${s.id}`}
                        className="flex-1 text-center text-xs font-medium py-2 rounded-lg bg-[#0077B6]/10 text-[#0077B6] hover:bg-[#0077B6]/20">
                        View Bill
                      </a>
                      <button onClick={() => handleCloseTable(s.id)} disabled={closing === s.id}
                        className="flex-1 text-center text-xs font-medium py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50">
                        {closing === s.id ? 'Closing...' : 'Close Table'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setOpenModalTable(table)}
                    className="w-full text-center text-xs font-medium py-2.5 rounded-lg bg-[#0077B6] text-white hover:bg-[#006399]">
                    Open Table
                  </button>
                )}
              </div>
            )
          })()}
        </div>
      ) : (
        /* ─── Grid View (original) ─── */
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
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md ${meta.bg} ${meta.color}`}>
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
                  const dotColor = !isOccupied ? 'bg-emerald-400' : hasPendingPayment ? 'bg-red-400' : 'bg-amber-400'

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
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-gray-900">{table.label}</span>
                            {table.linked_group_id && (
                              <Link2 size={12} className="text-indigo-500" />
                            )}
                          </div>
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
                        <div className="border-t border-gray-100 px-4 py-3 space-y-2" onClick={(e) => e.stopPropagation()}>
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
                                <a href={`/restaurant/bills?session=${s.id}`}
                                  className="flex-1 text-center text-xs font-medium py-2 rounded-lg bg-[#0077B6]/10 text-[#0077B6] hover:bg-[#0077B6]/20">
                                  View Bill
                                </a>
                                <button onClick={() => handleCloseTable(s.id)} disabled={closing === s.id}
                                  className="flex-1 text-center text-xs font-medium py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50">
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
                              <button onClick={() => setOpenModalTable(table)}
                                className="w-full text-center text-xs font-medium py-2 rounded-lg bg-[#0077B6] text-white hover:bg-[#006399] mt-1">
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

      {/* Modals */}
      {openModalTable && (
        <OpenSessionModal
          table={openModalTable}
          onClose={() => setOpenModalTable(null)}
          onSuccess={() => { setOpenModalTable(null); fetchTables() }}
        />
      )}

      {showLinkModal && (
        <LinkTablesModal
          tables={tables as unknown as RestaurantTable[]}
          selectedIds={selectedIds}
          onClose={() => setShowLinkModal(false)}
          onLinked={() => { setSelectedIds([]); fetchTables() }}
        />
      )}
    </div>
  )
}

