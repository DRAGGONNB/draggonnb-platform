'use client'

export default function CRMError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 max-w-md">
        <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
        <p className="mt-2 text-sm text-red-600">
          The CRM page encountered an error while loading. This is usually temporary.
        </p>
        <div className="mt-4 flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90"
          >
            Try Again
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
