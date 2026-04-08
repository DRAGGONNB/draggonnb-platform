import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface TableData {
  id: string
  label: string
  section: string
  capacity: number
  restaurants: {
    id: string
    name: string
    address: string
    phone: string
  }
}

interface ActiveSession {
  id: string
  status: string
  party_size: number
  opened_at: string
  bills: { id: string; total: number; status: string }[]
}

async function getTableByToken(token: string): Promise<TableData | null> {
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await supabase
    .from('restaurant_tables')
    .select('id, label, section, capacity, restaurants(id, name, address, phone)')
    .eq('qr_token', token)
    .single()

  if (error || !data) return null
  return data as unknown as TableData
}

async function getActiveSession(tableId: string): Promise<ActiveSession | null> {
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data } = await supabase
    .from('table_sessions')
    .select('id, status, party_size, opened_at, bills(id, total, status)')
    .eq('table_id', tableId)
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data as unknown as ActiveSession | null
}

export default async function TableLandingPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const table = await getTableByToken(token)
  const session = table ? await getActiveSession(table.id) : null
  const activeBill = session?.bills?.[0] ?? null

  if (!table) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 text-5xl">🔍</div>
        <h1 className="mb-2 text-xl font-semibold text-stone-800">Table Not Found</h1>
        <p className="text-sm text-stone-500">
          This QR code is no longer valid. Please ask your server for assistance.
        </p>
      </div>
    )
  }

  const restaurant = table.restaurants

  return (
    <div className="px-4 py-8">
      {/* Restaurant Hero */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#0077B6]/10">
          <svg
            className="h-8 w-8 text-[#0077B6]"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
            />
          </svg>
        </div>
        <h1 className="mb-1 text-2xl font-bold text-stone-900">{restaurant.name}</h1>
        <p className="text-sm text-stone-500">Plettenberg Bay</p>
      </div>

      {/* Table Info Card */}
      <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium tracking-wider text-[#0077B6] uppercase">
              Your Table
            </p>
            <p className="mt-1 text-lg font-semibold text-stone-900">
              Table {table.label}
              {table.section && (
                <span className="ml-2 text-sm font-normal text-stone-500">
                  &mdash; {table.section}
                </span>
              )}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100">
            <span className="text-sm font-medium text-stone-600">{table.capacity}</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-stone-400">
          Seats up to {table.capacity} guest{table.capacity !== 1 ? 's' : ''}
        </p>
        {session && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-700">
              Table active &mdash; Party of {session.party_size}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Link
          href={`/t/${token}/menu`}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#0077B6] px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-[#0077B6]/20 transition-all hover:bg-[#006399] active:scale-[0.98]"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
            />
          </svg>
          View Menu
        </Link>

        {session && activeBill ? (
          <Link
            href={`/t/${token}/bill`}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-6 py-4 text-lg font-semibold text-emerald-700 transition-all hover:border-emerald-300 hover:bg-emerald-100 active:scale-[0.98]"
          >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"
            />
          </svg>
          View Bill {activeBill.total > 0 && `(R ${Number(activeBill.total).toFixed(2)})`}
        </Link>
        ) : (
          <div className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-stone-200 bg-white px-6 py-4 text-lg font-semibold text-stone-400 opacity-60 cursor-not-allowed">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"
              />
            </svg>
            Waiting for server to open table
          </div>
        )}
      </div>

      {/* Restaurant Contact */}
      <div className="mt-10 text-center">
        <p className="text-xs text-stone-400">{restaurant.address}</p>
        {restaurant.phone && (
          <a href={`tel:${restaurant.phone}`} className="mt-1 block text-xs text-[#0077B6]">
            {restaurant.phone}
          </a>
        )}
      </div>
    </div>
  )
}
