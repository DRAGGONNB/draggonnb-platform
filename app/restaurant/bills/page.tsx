'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RESTAURANT_ID, formatZAR, elapsedMinutes, BILL_STATUS_COLORS, PAYER_STATUS_COLORS } from '@/lib/restaurant/constants'
import {
  Loader2,
  Plus,
  Search,
  X,
  Trash2,
  CreditCard,
  Users,
  Clock,
  Receipt,
} from 'lucide-react'

interface BillRow {
  id: string
  session_id: string
  subtotal: number
  service_charge: number
  total: number
  status: string
  created_at: string
  table_label?: string
  table_section?: string
  waiter_name?: string
  party_size?: number
  opened_at?: string
  items: { id: string; name: string; quantity: number; unit_price: number; line_total: number; voided: boolean; modifier_notes: string | null }[]
  payers: { id: string; display_name: string; amount_due: number; status: string }[]
}

interface MenuItem {
  id: string
  name: string
  price: number
  category_name?: string
}

export default function BillsPage() {
  const [bills, setBills] = useState<BillRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedBill, setExpandedBill] = useState<string | null>(null)

  // Add item state
  const [addingToBill, setAddingToBill] = useState<string | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuSearch, setMenuSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [addQty, setAddQty] = useState(1)
  const [addNotes, setAddNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Staff for added_by
  const [staffId, setStaffId] = useState<string | null>(null)

  const fetchBills = useCallback(async () => {
    const supabase = createClient()

    // Get open bills with sessions
    const { data: billsData } = await supabase
      .from('bills')
      .select(`
        id, session_id, subtotal, service_charge, total, status, created_at,
        table_sessions(table_id, waiter_id, party_size, opened_at,
          restaurant_tables(label, section),
          restaurant_staff(display_name)
        )
      `)
      .eq('restaurant_id', RESTAURANT_ID)
      .neq('status', 'closed')
      .order('created_at', { ascending: false })

    const rows: BillRow[] = []
    for (const b of billsData ?? []) {
      const session = b.table_sessions as unknown as {
        party_size: number; opened_at: string;
        restaurant_tables: { label: string; section: string };
        restaurant_staff: { display_name: string } | null;
      } | null

      // Get items
      const { data: items } = await supabase
        .from('bill_items')
        .select('id, name, quantity, unit_price, line_total, voided, modifier_notes')
        .eq('bill_id', b.id)
        .order('created_at')

      // Get payers
      const { data: payers } = await supabase
        .from('bill_payers')
        .select('id, display_name, amount_due, status')
        .eq('bill_id', b.id)
        .order('slot_number')

      rows.push({
        ...b,
        table_label: session?.restaurant_tables?.label,
        table_section: session?.restaurant_tables?.section,
        waiter_name: session?.restaurant_staff?.display_name ?? undefined,
        party_size: session?.party_size,
        opened_at: session?.opened_at,
        items: items ?? [],
        payers: payers ?? [],
      })
    }

    setBills(rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchBills()
    const interval = setInterval(fetchBills, 15000)
    return () => clearInterval(interval)
  }, [fetchBills])

  // Load menu items and first staff for adding items
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: items } = await supabase
        .from('restaurant_menu_items')
        .select('id, name, price, restaurant_menu_categories(name)')
        .eq('is_available', true)
        .order('name')

      setMenuItems(
        (items ?? []).map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          category_name: (i.restaurant_menu_categories as unknown as { name: string })?.name,
        }))
      )

      // Get first manager/server as default added_by
      const { data: staff } = await supabase
        .from('restaurant_staff')
        .select('id')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('is_active', true)
        .eq('role', 'manager')
        .limit(1)
        .single()

      setStaffId(staff?.id ?? null)
    }
    load()
  }, [])

  async function handleAddItem(billId: string) {
    if (!selectedItem || !staffId) return
    setSubmitting(true)

    await fetch(`/api/restaurant/bills/${billId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_item_id: selectedItem.id,
        quantity: addQty,
        modifier_notes: addNotes || undefined,
        added_by: staffId,
      }),
    })

    setAddingToBill(null)
    setSelectedItem(null)
    setAddQty(1)
    setAddNotes('')
    setMenuSearch('')
    setSubmitting(false)
    fetchBills()
  }

  async function handleVoidItem(billId: string, itemId: string) {
    if (!staffId) return
    if (!confirm('Void this item?')) return

    await fetch(`/api/restaurant/bills/${billId}/items/${itemId}/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ void_reason: 'Staff voided', voided_by: staffId }),
    })

    fetchBills()
  }

  const filteredMenu = menuSearch
    ? menuItems.filter((i) => i.name.toLowerCase().includes(menuSearch.toLowerCase()))
    : menuItems.slice(0, 10)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0077B6]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Active Bills</h1>
        <p className="text-sm text-gray-500 mt-1">{bills.length} open bills</p>
      </div>

      {bills.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No active bills. Open a table to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bills.map((bill) => {
            const isExpanded = expandedBill === bill.id
            const statusStyle = BILL_STATUS_COLORS[bill.status] ?? BILL_STATUS_COLORS.open
            const activeItems = bill.items.filter((i) => !i.voided)

            return (
              <div key={bill.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpandedBill(isExpanded ? null : bill.id)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-bold text-gray-900">
                        Table {bill.table_label ?? '?'}
                        {bill.table_section && (
                          <span className="ml-1 text-xs text-gray-400 font-normal capitalize">{bill.table_section}</span>
                        )}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {bill.waiter_name && <span>{bill.waiter_name}</span>}
                        {bill.party_size && (
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{bill.party_size}</span>
                        )}
                        {bill.opened_at && (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{elapsedMinutes(bill.opened_at)}m</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{formatZAR(bill.total)}</p>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                      {bill.status.replace('_', ' ')}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {/* Items */}
                    <div className="px-5 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase">Items ({activeItems.length})</h3>
                        <button
                          onClick={() => setAddingToBill(bill.id)}
                          className="flex items-center gap-1 text-xs font-medium text-[#0077B6] hover:text-[#006399]"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Item
                        </button>
                      </div>
                      {activeItems.length === 0 ? (
                        <p className="text-xs text-gray-400 py-2">No items yet</p>
                      ) : (
                        <div className="space-y-1">
                          {bill.items.map((item) => (
                            <div
                              key={item.id}
                              className={`flex items-center justify-between py-1.5 text-sm ${item.voided ? 'line-through opacity-40' : ''}`}
                            >
                              <div>
                                <span className="text-gray-800">{item.quantity}x {item.name}</span>
                                {item.modifier_notes && (
                                  <span className="ml-1 text-xs italic text-gray-400">({item.modifier_notes})</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-800">{formatZAR(item.line_total)}</span>
                                {!item.voided && (
                                  <button
                                    onClick={() => handleVoidItem(bill.id, item.id)}
                                    className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Payers */}
                    {bill.payers.length > 0 && (
                      <div className="px-5 py-3 border-t border-gray-100">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                          <CreditCard className="w-3.5 h-3.5 inline mr-1" />
                          Payers ({bill.payers.length})
                        </h3>
                        <div className="space-y-1">
                          {bill.payers.map((p) => {
                            const pStyle = PAYER_STATUS_COLORS[p.status] ?? PAYER_STATUS_COLORS.pending
                            return (
                              <div key={p.id} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">{p.display_name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{formatZAR(p.amount_due)}</span>
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${pStyle.bg} ${pStyle.text}`}>
                                    {p.status}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Item Modal */}
      {addingToBill && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Add Item</h2>
              <button onClick={() => { setAddingToBill(null); setSelectedItem(null); setMenuSearch('') }} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={menuSearch}
                  onChange={(e) => { setMenuSearch(e.target.value); setSelectedItem(null) }}
                  placeholder="Search menu..."
                  className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none"
                />
              </div>

              {/* Results */}
              {!selectedItem && (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredMenu.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.name}</p>
                        {item.category_name && <p className="text-xs text-gray-400">{item.category_name}</p>}
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{formatZAR(item.price)}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected item details */}
              {selectedItem && (
                <>
                  <div className="flex items-center justify-between rounded-lg bg-[#0077B6]/5 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{selectedItem.name}</p>
                      <p className="text-xs text-gray-500">{formatZAR(selectedItem.price)} each</p>
                    </div>
                    <button onClick={() => setSelectedItem(null)} className="text-xs text-[#0077B6]">Change</button>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Qty</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setAddQty(Math.max(1, addQty - 1))} className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 font-bold">-</button>
                      <span className="w-8 text-center font-bold">{addQty}</span>
                      <button onClick={() => setAddQty(addQty + 1)} className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 font-bold">+</button>
                    </div>
                    <span className="ml-auto text-sm font-semibold">{formatZAR(selectedItem.price * addQty)}</span>
                  </div>

                  <input
                    type="text"
                    value={addNotes}
                    onChange={(e) => setAddNotes(e.target.value)}
                    placeholder="Notes (e.g. no onion, extra sauce)"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none"
                  />
                </>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => { setAddingToBill(null); setSelectedItem(null); setMenuSearch('') }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddItem(addingToBill)}
                disabled={!selectedItem || submitting}
                className="flex-1 rounded-lg bg-[#0077B6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#006399] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Add to Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
