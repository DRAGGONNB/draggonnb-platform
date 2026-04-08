'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import TipSelector from '../components/TipSelector'

function formatPrice(amount: number): string {
  return `R ${Number(amount).toFixed(2)}`
}

export default function PayPage() {
  const params = useParams<{ token: string }>()
  const searchParams = useSearchParams()
  const token = params.token
  const billId = searchParams.get('bill_id')
  const payerId = searchParams.get('payer_id')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [amountDue, setAmountDue] = useState(0)
  const [payerName, setPayerName] = useState('')
  const [tipAmount, setTipAmount] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!billId) return
    fetch(`/api/restaurant/bills/${billId}`)
      .then(r => r.json())
      .then(data => {
        const payer = data.payers?.find((p: { id: string }) => p.id === payerId)
        if (payer) {
          setAmountDue(Number(payer.amount_due))
          setPayerName(payer.display_name)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [billId, payerId])

  async function handlePay() {
    if (!billId || !payerId) return
    setSubmitting(true)

    const res = await fetch('/api/restaurant/payfast/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bill_id: billId, payer_id: payerId, tip_amount: tipAmount }),
    })

    if (!res.ok) {
      setSubmitting(false)
      return
    }

    const { payfast_url, payfast_form_data } = await res.json()

    // Create and submit hidden form to PayFast
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = payfast_url

    Object.entries(payfast_form_data).forEach(([key, value]) => {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = key
      input.value = value as string
      form.appendChild(input)
    })

    document.body.appendChild(form)
    form.submit()
  }

  const totalPayment = amountDue + tipAmount

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-[#0077B6]" />
      </div>
    )
  }

  return (
    <div className="pb-8">
      {/* Top Bar */}
      <div className="border-b border-stone-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <Link
            href={`/t/${token}/bill/split?bill_id=${billId}`}
            className="flex items-center gap-1 text-sm font-medium text-[#0077B6]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Back
          </Link>
          <h1 className="text-lg font-bold text-stone-900">Payment</h1>
          <div className="w-12" />
        </div>
      </div>

      <div className="px-4 pt-6 space-y-6">
        {/* Amount breakdown */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 text-center">
          <p className="text-sm text-stone-500">{payerName}</p>
          <p className="mt-1 text-3xl font-bold text-stone-900">{formatPrice(amountDue)}</p>
        </div>

        {/* Tip selector */}
        <TipSelector billAmount={amountDue} onTipChange={setTipAmount} />

        {/* Total */}
        <div className="rounded-2xl bg-stone-50 p-4">
          <div className="flex justify-between text-sm text-stone-600">
            <span>Bill amount</span>
            <span>{formatPrice(amountDue)}</span>
          </div>
          {tipAmount > 0 && (
            <div className="mt-1 flex justify-between text-sm text-stone-600">
              <span>Tip</span>
              <span>{formatPrice(tipAmount)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-stone-200 pt-2 text-lg font-bold text-stone-900">
            <span>You pay</span>
            <span>{formatPrice(totalPayment)}</span>
          </div>
        </div>

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Redirecting to PayFast...
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              Pay {formatPrice(totalPayment)} with PayFast
            </>
          )}
        </button>

        <form ref={formRef} className="hidden" />

        <p className="text-center text-xs text-stone-300">
          Secured by PayFast. You&apos;ll be redirected to complete payment.
        </p>
      </div>
    </div>
  )
}
