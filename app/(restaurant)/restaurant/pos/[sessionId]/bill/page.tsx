'use client'
import { useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useLiveBill } from '@/hooks/use-live-bill'
import { BillSummaryCard } from '@/components/restaurant/pos/BillSummaryCard'
import { TipSelector } from '@/components/restaurant/pos/TipSelector'
import { SplitSlotRow } from '@/components/restaurant/pos/SplitSlotRow'
import { VoidItemSheet } from '@/components/restaurant/pos/VoidItemSheet'
import type { BillItem, BillPayer } from '@/lib/restaurant/types'

type VoidTarget = {
  id: string
  name: string
  quantity: number
  line_total: number
  unit_price: number
}

export default function BillPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const { bill, items, payers, session, loading, error } = useLiveBill(sessionId)

  const [tipAmount, setTipAmount] = useState(0)
  const [selectedPct, setSelectedPct] = useState<number | null>(null)
  const [voidTarget, setVoidTarget] = useState<VoidTarget | null>(null)
  const [closing, setClosing] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [cashLoading, setCashLoading] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  // Void item handler — calls DELETE /api/restaurant/bills/items
  const handleVoid = useCallback(async (itemId: string, reason: string, pin?: string) => {
    const body: Record<string, unknown> = { item_id: itemId, void_reason: reason }
    if (pin) body.manager_pin = pin

    const res = await fetch('/api/restaurant/bills/items', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? 'Failed to void item')
    }
  }, [])

  // Generate PayFast link for a payer slot and copy to clipboard
  const handleSendLink = useCallback(async (payerToken: string) => {
    if (!bill) return

    const payer = payers.find((p: BillPayer) => p.payfast_token === payerToken)
    if (!payer) return

    try {
      const res = await fetch('/api/restaurant/payment/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bill_id: bill.id,
          payer_slot: payer.slot_number,
          tip_amount: tipAmount,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        showToast(data.error ?? 'Failed to generate link')
        return
      }

      const data = await res.json() as { links: Array<{ url: string }> }
      const url = data.links?.[0]?.url
      if (url) {
        await navigator.clipboard.writeText(url)
        showToast('Link copied!')
      }
    } catch {
      showToast('Failed to generate payment link')
    }
  }, [bill, payers, tipAmount])

  // Mark payer slot as cash paid
  const handleMarkCash = useCallback(async (payerToken: string) => {
    if (!bill) return
    const payer = payers.find((p: BillPayer) => p.payfast_token === payerToken)
    if (!payer) return

    setCashLoading(true)
    try {
      const res = await fetch(`/api/restaurant/bills/${bill.id}/payers/${payer.id}/cash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        showToast(data.error ?? 'Failed to mark as cash')
      } else {
        showToast('Marked as cash paid')
      }
    } catch {
      showToast('Failed to mark as cash')
    } finally {
      setCashLoading(false)
    }
  }, [bill, payers])

  // Send full-bill PayFast link (no-split flow)
  const handleSendFullLink = useCallback(async () => {
    if (!bill) return
    try {
      const res = await fetch('/api/restaurant/payment/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bill_id: bill.id, tip_amount: tipAmount }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        showToast(data.error ?? 'Failed to generate link')
        return
      }

      const data = await res.json() as { links: Array<{ url: string }> }
      const url = data.links?.[0]?.url
      if (url) {
        await navigator.clipboard.writeText(url)
        showToast('Link copied!')
      }
    } catch {
      showToast('Failed to generate payment link')
    }
  }, [bill, tipAmount])

  // Mark entire bill as cash paid
  const handleMarkFullCash = useCallback(async () => {
    if (!bill) return
    setCashLoading(true)
    try {
      const res = await fetch(`/api/restaurant/sessions/${sessionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed', payment_method: 'cash' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        showToast(data.error ?? 'Failed to mark as paid')
      } else {
        showToast('Marked as cash paid')
        router.push('/restaurant/tables')
      }
    } catch {
      showToast('Failed to mark as paid')
    } finally {
      setCashLoading(false)
    }
  }, [bill, sessionId, router])

  // Close table
  async function handleCloseTable() {
    setClosing(true)
    setCloseError(null)
    try {
      const res = await fetch(`/api/restaurant/sessions/${sessionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setCloseError(data.error ?? 'Failed to close table')
      } else {
        router.push('/restaurant/tables')
      }
    } catch {
      setCloseError('Failed to close table')
    } finally {
      setClosing(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#2D2F33]">
        <div className="w-8 h-8 border-2 border-[#6B1420] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#2D2F33] gap-4 px-6">
        <p className="text-red-400 text-sm text-center">{error}</p>
        <button
          onClick={() => router.back()}
          className="bg-[#3A3C40] text-gray-300 rounded-xl px-6 py-3 text-sm"
        >
          Go Back
        </button>
      </div>
    )
  }

  const tableLabel = session?.table_id ? `Table` : 'Table'
  const splitMode = session?.split_mode ?? 'none'

  // Merge all items (including voided) for BillSummaryCard
  const allItems = items.map((i: BillItem) => ({ ...i, is_voided: i.voided }))

  // Calculate total with tip for display
  const billTotal = bill ? Number(bill.subtotal) + Number(bill.service_charge) + tipAmount : 0

  return (
    <div className="min-h-screen bg-[#2D2F33] text-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4 border-b border-white/10 bg-[#1E2023] sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#3A3C40] active:scale-95 transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M11 4L6 9L11 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <h1 className="font-semibold text-base leading-tight">{tableLabel} &mdash; Bill</h1>
          {session && (
            <p className="text-xs text-gray-500 mt-0.5">Party of {session.party_size}</p>
          )}
        </div>
      </div>

      <div className="px-4 py-5 space-y-5 max-w-xl mx-auto pb-28">
        {/* Bill summary */}
        <BillSummaryCard
          bill={bill ? {
            subtotal: bill.subtotal,
            service_charge: bill.service_charge,
            tip_amount: tipAmount,
            total: billTotal,
            status: bill.status,
          } : null}
          items={allItems}
          onVoidItem={(item) => setVoidTarget({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            line_total: item.line_total,
            unit_price: item.unit_price,
          })}
        />

        {/* Tip selector */}
        {bill && bill.status !== 'paid' && (
          <div className="bg-[#1E2023] rounded-2xl px-5 py-4">
            <h3 className="text-sm font-semibold text-white mb-3">Tip</h3>
            <TipSelector
              subtotal={Number(bill.subtotal)}
              onTipChange={setTipAmount}
              selectedPct={selectedPct}
              onPctChange={setSelectedPct}
            />
          </div>
        )}

        {/* Payment section */}
        {bill && bill.status !== 'paid' && (
          <div className="bg-[#1E2023] rounded-2xl px-5 py-4">
            <h3 className="text-sm font-semibold text-white mb-4">Payment</h3>

            {splitMode === 'equal' && payers.length > 0 ? (
              <div className="space-y-2">
                {payers.map((payer: BillPayer) => (
                  <SplitSlotRow
                    key={payer.id}
                    slot={{
                      slot_number: payer.slot_number,
                      display_name: payer.display_name || undefined,
                      share_amount: payer.amount_due ?? (Number(bill.subtotal) + Number(bill.service_charge) + tipAmount) / payers.length,
                      status: payer.status,
                      payfast_token: payer.payfast_token ?? '',
                    }}
                    onSendLink={handleSendLink}
                    onMarkCash={handleMarkCash}
                  />
                ))}
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleMarkFullCash}
                  disabled={cashLoading}
                  className="flex-1 min-h-[44px] bg-[#3A3C40] text-gray-300 rounded-xl py-3 text-sm font-medium active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {cashLoading ? (
                    <span className="w-4 h-4 border-2 border-gray-400/40 border-t-gray-300 rounded-full animate-spin" />
                  ) : null}
                  Mark as Paid &mdash; Cash
                </button>
                <button
                  onClick={handleSendFullLink}
                  className="flex-1 min-h-[44px] bg-[#6B1420] text-white rounded-xl py-3 text-sm font-semibold active:scale-95 transition-transform"
                >
                  Send PayFast Link
                </button>
              </div>
            )}
          </div>
        )}

        {/* Close error */}
        {closeError && (
          <div className="px-4 py-3 bg-red-500/15 border border-red-500/30 rounded-xl">
            <p className="text-sm text-red-400">{closeError}</p>
          </div>
        )}
      </div>

      {/* Sticky footer — Close Table */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-gradient-to-t from-[#2D2F33] via-[#2D2F33]/95 to-transparent">
        <div className="max-w-xl mx-auto">
          <button
            onClick={handleCloseTable}
            disabled={closing}
            className="w-full min-h-[52px] bg-[#6B1420] text-white rounded-2xl font-semibold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {closing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Closing...
              </>
            ) : (
              'Close Table'
            )}
          </button>
        </div>
      </div>

      {/* Void sheet overlay */}
      <VoidItemSheet
        item={voidTarget}
        onClose={() => setVoidTarget(null)}
        onVoid={handleVoid}
      />

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#3A3C40] border border-white/10 text-white text-sm px-4 py-2.5 rounded-xl shadow-xl z-50 transition-all">
          {toast}
        </div>
      )}
    </div>
  )
}
