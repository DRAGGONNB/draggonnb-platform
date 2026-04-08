'use client'

import { useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function formatPrice(amount: number): string {
  return `R ${Number(amount).toFixed(2)}`
}

export default function SplitBillPage() {
  const params = useParams<{ token: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = params.token
  const billId = searchParams.get('bill_id')

  const [mode, setMode] = useState<'full' | 'equal' | null>(null)
  const [splitCount, setSplitCount] = useState(2)
  const [loading, setLoading] = useState(false)
  const [billTotal, setBillTotal] = useState<number | null>(null)
  const [payers, setPayers] = useState<{ id: string; slot_number: number; display_name: string; amount_due: number }[]>([])

  // Fetch bill total on mount
  useState(() => {
    if (!billId) return
    fetch(`/api/restaurant/bills/${billId}`)
      .then(r => r.json())
      .then(data => setBillTotal(data.bill?.total ?? 0))
      .catch(() => {})
  })

  async function handleSplit() {
    if (!billId) return
    setLoading(true)

    const body = mode === 'full'
      ? { mode: 'equal' as const, payer_count: 1 }
      : { mode: 'equal' as const, payer_count: splitCount }

    const res = await fetch(`/api/restaurant/bills/${billId}/split`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const data = await res.json()
      setPayers(data.payers)

      // If paying full amount, go straight to pay
      if (mode === 'full' && data.payers.length === 1) {
        router.push(`/t/${token}/bill/pay?bill_id=${billId}&payer_id=${data.payers[0].id}`)
        return
      }
    }
    setLoading(false)
  }

  if (!billId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <p className="text-stone-500">No bill found. Please go back.</p>
        <Link href={`/t/${token}/bill`} className="mt-4 text-sm text-[#0077B6]">Back to Bill</Link>
      </div>
    )
  }

  return (
    <div className="pb-8">
      {/* Top Bar */}
      <div className="border-b border-stone-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href={`/t/${token}/bill`} className="flex items-center gap-1 text-sm font-medium text-[#0077B6]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Back
          </Link>
          <h1 className="text-lg font-bold text-stone-900">Pay Bill</h1>
          <div className="w-12" />
        </div>
      </div>

      <div className="px-4 pt-6">
        {billTotal !== null && (
          <div className="mb-6 text-center">
            <p className="text-sm text-stone-500">Bill Total</p>
            <p className="text-3xl font-bold text-stone-900">{formatPrice(billTotal)}</p>
          </div>
        )}

        {payers.length === 0 ? (
          /* Split selection */
          <div className="space-y-3">
            <button
              onClick={() => { setMode('full'); }}
              className={`w-full rounded-2xl border-2 p-5 text-left transition-all ${
                mode === 'full' ? 'border-[#0077B6] bg-[#0077B6]/5' : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <p className="font-semibold text-stone-800">Pay Full Amount</p>
              <p className="mt-1 text-sm text-stone-500">One person pays the entire bill</p>
            </button>

            <button
              onClick={() => { setMode('equal'); }}
              className={`w-full rounded-2xl border-2 p-5 text-left transition-all ${
                mode === 'equal' ? 'border-[#0077B6] bg-[#0077B6]/5' : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <p className="font-semibold text-stone-800">Split Equally</p>
              <p className="mt-1 text-sm text-stone-500">Divide the bill evenly between guests</p>
            </button>

            {mode === 'equal' && (
              <div className="flex items-center justify-center gap-4 rounded-xl bg-stone-50 p-4">
                <button
                  onClick={() => setSplitCount(Math.max(2, splitCount - 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 text-lg font-bold text-stone-600"
                >
                  -
                </button>
                <div className="text-center">
                  <p className="text-2xl font-bold text-stone-800">{splitCount}</p>
                  <p className="text-xs text-stone-400">guests</p>
                </div>
                <button
                  onClick={() => setSplitCount(Math.min(20, splitCount + 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 text-lg font-bold text-stone-600"
                >
                  +
                </button>
                {billTotal !== null && (
                  <p className="ml-4 text-sm text-stone-500">
                    {formatPrice(billTotal / splitCount)} each
                  </p>
                )}
              </div>
            )}

            {mode && (
              <button
                onClick={handleSplit}
                disabled={loading}
                className="w-full rounded-2xl bg-emerald-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Processing...' : mode === 'full' ? 'Continue to Payment' : `Split ${splitCount} Ways`}
              </button>
            )}
          </div>
        ) : (
          /* Payer list */
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-stone-700">Choose your share to pay:</h2>
            {payers.map((payer) => (
              <Link
                key={payer.id}
                href={`/t/${token}/bill/pay?bill_id=${billId}&payer_id=${payer.id}`}
                className="flex w-full items-center justify-between rounded-2xl border-2 border-stone-200 bg-white p-5 transition-all hover:border-[#0077B6] hover:bg-[#0077B6]/5"
              >
                <div>
                  <p className="font-semibold text-stone-800">{payer.display_name}</p>
                  <p className="text-xs text-stone-400">Slot {payer.slot_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-stone-800">{formatPrice(payer.amount_due)}</p>
                  <p className="text-xs text-[#0077B6]">Tap to pay</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
