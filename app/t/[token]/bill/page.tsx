'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface BillItem {
  id: string
  name: string
  quantity: number
  unit_price: number
  line_total: number
  modifier_notes: string | null
}

interface BillPayer {
  id: string
  slot_number: number
  display_name: string
  amount_due: number
  amount_paid: number
  status: string
}

interface BillData {
  bill: {
    id: string
    subtotal: number
    service_charge_pct: number
    service_charge: number
    tip_total: number
    total: number
    status: string
  }
  items: BillItem[]
  payers: BillPayer[]
  session: {
    id: string
    party_size: number
    opened_at: string
    restaurant_tables: { label: string; section: string }
  } | null
}

function formatPrice(amount: number): string {
  return `R ${Number(amount).toFixed(2)}`
}

export default function BillPage() {
  const params = useParams<{ token: string }>()
  const token = params.token

  const [data, setData] = useState<BillData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBill = useCallback(async () => {
    try {
      // First get the table + active session
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { data: table } = await supabase
        .from('restaurant_tables')
        .select('id, label, section, restaurants(name, service_charge_pct)')
        .eq('qr_token', token)
        .single()

      if (!table) {
        setError('Table not found')
        setLoading(false)
        return
      }

      // Find active session
      const { data: session } = await supabase
        .from('table_sessions')
        .select('id')
        .eq('table_id', table.id)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!session) {
        setError('no_session')
        setLoading(false)
        return
      }

      // Fetch bill via API
      const { data: bill } = await supabase
        .from('bills')
        .select('id')
        .eq('session_id', session.id)
        .single()

      if (!bill) {
        setError('no_bill')
        setLoading(false)
        return
      }

      const res = await fetch(`/api/restaurant/bills/${bill.id}`)
      if (!res.ok) {
        setError('Failed to load bill')
        setLoading(false)
        return
      }

      const billData: BillData = await res.json()
      setData(billData)
      setError(null)
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchBill()
    // Poll every 10 seconds for live updates
    const interval = setInterval(fetchBill, 10000)
    return () => clearInterval(interval)
  }, [fetchBill])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-[#0077B6]" />
      </div>
    )
  }

  if (error === 'no_session') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
          <svg className="h-8 w-8 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-stone-800">No Active Bill</h1>
        <p className="mt-2 text-sm text-stone-500">
          Your server hasn&apos;t opened the table yet. Please ask them to get started.
        </p>
        <Link
          href={`/t/${token}`}
          className="mt-6 rounded-xl bg-[#0077B6] px-6 py-3 text-sm font-semibold text-white"
        >
          Back to Table
        </Link>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-semibold text-stone-800">Bill Unavailable</h1>
        <p className="mt-2 text-sm text-stone-500">{error || 'Could not load the bill.'}</p>
        <Link
          href={`/t/${token}`}
          className="mt-6 rounded-xl bg-[#0077B6] px-6 py-3 text-sm font-semibold text-white"
        >
          Back to Table
        </Link>
      </div>
    )
  }

  const { bill, items, payers } = data
  const tableInfo = data.session?.restaurant_tables
  const isPaid = bill.status === 'fully_paid' || bill.status === 'closed'
  const hasPayers = payers.length > 0

  return (
    <div className="pb-8">
      {/* Top Bar */}
      <div className="border-b border-stone-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <Link
            href={`/t/${token}`}
            className="flex items-center gap-1 text-sm font-medium text-[#0077B6]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Back
          </Link>
          <h1 className="text-lg font-bold text-stone-900">Your Bill</h1>
          <div className="w-12" />
        </div>
      </div>

      <div className="px-4 pt-6">
        {/* Table Header */}
        {tableInfo && (
          <div className="mb-6 text-center">
            <p className="text-sm font-medium text-stone-500">
              Table {tableInfo.label}
              {tableInfo.section && <span> &mdash; {tableInfo.section}</span>}
            </p>
            {isPaid && (
              <span className="mt-2 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                Paid
              </span>
            )}
          </div>
        )}

        {/* Bill Card */}
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
          {/* Line Items */}
          {items.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-stone-400">No items on your bill yet.</p>
              <p className="mt-1 text-xs text-stone-300">Your server will add items as you order.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 px-5 py-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium text-stone-800">{item.name}</p>
                    <p className="text-xs text-stone-400">
                      {item.quantity} x {formatPrice(item.unit_price)}
                    </p>
                    {item.modifier_notes && (
                      <p className="mt-0.5 text-xs italic text-stone-400">{item.modifier_notes}</p>
                    )}
                  </div>
                  <p className="font-semibold text-stone-800">
                    {formatPrice(item.line_total)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          {items.length > 0 && (
            <div className="border-t border-stone-200 px-5 py-4">
              <div className="flex justify-between text-sm text-stone-600">
                <span>Subtotal</span>
                <span>{formatPrice(bill.subtotal)}</span>
              </div>
              {bill.service_charge > 0 && (
                <div className="mt-2 flex justify-between text-sm text-stone-600">
                  <span>Service Charge ({bill.service_charge_pct}%)</span>
                  <span>{formatPrice(bill.service_charge)}</span>
                </div>
              )}
              {bill.tip_total > 0 && (
                <div className="mt-2 flex justify-between text-sm text-stone-600">
                  <span>Tips</span>
                  <span>{formatPrice(bill.tip_total)}</span>
                </div>
              )}
              <div className="mt-3 flex justify-between border-t border-stone-200 pt-3 text-lg font-bold text-stone-900">
                <span>Total</span>
                <span>{formatPrice(bill.total)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Payer Status */}
        {hasPayers && (
          <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-stone-700">Payment Status</h3>
            <div className="space-y-2">
              {payers.map((payer) => (
                <div key={payer.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${
                      payer.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-400'
                    }`} />
                    <span className="text-sm text-stone-600">{payer.display_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-stone-800">
                      {formatPrice(payer.amount_due)}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      payer.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {payer.status === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Buttons */}
        {!isPaid && items.length > 0 && (
          <div className="mt-6 space-y-3">
            <Link
              href={`/t/${token}/bill/split?bill_id=${bill.id}`}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-[0.98]"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z"
                />
              </svg>
              Pay Bill &mdash; {formatPrice(bill.total)}
            </Link>
          </div>
        )}

        {isPaid && (
          <div className="mt-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
            <p className="text-sm font-medium text-emerald-700">
              Thank you! Your bill has been settled.
            </p>
          </div>
        )}

        {/* Live update indicator */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-stone-300">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live updates
        </div>
      </div>
    </div>
  )
}
