'use client'

import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function PaymentCancelledPage() {
  const params = useParams<{ token: string }>()
  const searchParams = useSearchParams()
  const token = params.token
  const billId = searchParams.get('bill_id')

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
        <svg className="h-10 w-10 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-stone-900">Payment Cancelled</h1>
      <p className="mt-2 text-sm text-stone-500">
        Your payment was not completed. No charges have been made.
      </p>

      <div className="mt-8 space-y-3 w-full max-w-xs">
        <Link
          href={`/t/${token}/bill`}
          className="block w-full rounded-2xl bg-emerald-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700"
        >
          Try Again
        </Link>
        <Link
          href={`/t/${token}`}
          className="block w-full text-center text-sm text-[#0077B6]"
        >
          Back to Table
        </Link>
      </div>
    </div>
  )
}
