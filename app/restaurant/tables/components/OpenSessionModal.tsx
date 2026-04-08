'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RESTAURANT_ID } from '@/lib/restaurant/constants'
import { X, Loader2 } from 'lucide-react'

interface Props {
  table: { id: string; label: string; section: string; capacity: number }
  onClose: () => void
  onSuccess: () => void
}

interface Staff {
  id: string
  display_name: string
  role: string
}

export default function OpenSessionModal({ table, onClose, onSuccess }: Props) {
  const [staff, setStaff] = useState<Staff[]>([])
  const [partySize, setPartySize] = useState(2)
  const [waiterId, setWaiterId] = useState('')
  const [guestWhatsapp, setGuestWhatsapp] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadStaff() {
      const supabase = createClient()
      const { data } = await supabase
        .from('restaurant_staff')
        .select('id, display_name, role')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('is_active', true)
        .in('role', ['server', 'manager', 'bartender'])
        .order('display_name')
      setStaff(data ?? [])
    }
    loadStaff()
  }, [])

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)

    const res = await fetch('/api/restaurant/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table_id: table.id,
        waiter_id: waiterId || undefined,
        party_size: partySize,
        guest_whatsapp: guestWhatsapp || undefined,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to open table')
      setSubmitting(false)
      return
    }

    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            Open Table {table.label}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Party Size</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPartySize(Math.max(1, partySize - 1))}
                className="w-10 h-10 rounded-lg border border-gray-300 text-lg font-bold text-gray-600 hover:bg-gray-50"
              >
                -
              </button>
              <span className="text-xl font-bold text-gray-900 w-8 text-center">{partySize}</span>
              <button
                onClick={() => setPartySize(Math.min(table.capacity * 2, partySize + 1))}
                className="w-10 h-10 rounded-lg border border-gray-300 text-lg font-bold text-gray-600 hover:bg-gray-50"
              >
                +
              </button>
              <span className="text-xs text-gray-400 ml-2">/ {table.capacity} seats</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Waiter</label>
            <select
              value={waiterId}
              onChange={(e) => setWaiterId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none"
            >
              <option value="">Select waiter...</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name} ({s.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Guest WhatsApp <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="tel"
              value={guestWhatsapp}
              onChange={(e) => setGuestWhatsapp(e.target.value)}
              placeholder="+27..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-lg bg-[#0077B6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#006399] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Open Table
          </button>
        </div>
      </div>
    </div>
  )
}
