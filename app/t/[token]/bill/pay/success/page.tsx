'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function PaymentSuccessPage() {
  const params = useParams<{ token: string }>()
  const searchParams = useSearchParams()
  const token = params.token
  const payerId = searchParams.get('payer_id')

  const [confirmed, setConfirmed] = useState(false)
  const [amount, setAmount] = useState<number | null>(null)

  useEffect(() => {
    if (!payerId) return

    // Poll payer status until confirmed paid
    const check = async () => {
      try {
        const res = await fetch(`/api/restaurant/payfast/return?payer_id=${payerId}`)
        if (!res.ok) return

        // Also check payer status directly via Supabase
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data } = await supabase
          .from('bill_payers')
          .select('status, amount_paid, tip_amount')
          .eq('id', payerId)
          .single()

        if (data?.status === 'paid') {
          setConfirmed(true)
          setAmount(Number(data.amount_paid))
        }
      } catch {}
    }

    check()
    const interval = setInterval(check, 3000)
    return () => clearInterval(interval)
  }, [payerId])

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      {confirmed ? (
        <>
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Payment Confirmed</h1>
          {amount !== null && (
            <p className="mt-2 text-lg font-semibold text-emerald-600">R {amount.toFixed(2)}</p>
          )}
          <p className="mt-2 text-sm text-stone-500">
            Thank you for dining with us!
          </p>
        </>
      ) : (
        <>
          <div className="mb-6">
            <div className="h-12 w-12 animate-spin rounded-full border-3 border-stone-200 border-t-emerald-500 mx-auto" />
          </div>
          <h1 className="text-xl font-bold text-stone-900">Confirming Payment...</h1>
          <p className="mt-2 text-sm text-stone-500">
            Please wait while we verify your payment with PayFast.
          </p>
        </>
      )}

      <div className="mt-8 space-y-3 w-full max-w-xs">
        <Link
          href={`/t/${token}/bill`}
          className="block w-full rounded-2xl border-2 border-stone-200 bg-white px-6 py-3 text-center text-sm font-semibold text-stone-700 transition-all hover:bg-stone-50"
        >
          Back to Bill
        </Link>
        <Link
          href={`/t/${token}/menu`}
          className="block w-full text-center text-sm text-[#0077B6]"
        >
          View Menu
        </Link>
      </div>
    </div>
  )
}
