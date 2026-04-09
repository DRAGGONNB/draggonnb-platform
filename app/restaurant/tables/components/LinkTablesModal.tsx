'use client'

import { useState } from 'react'
import { X, Link2, Loader2 } from 'lucide-react'
import type { RestaurantTable } from '@/lib/restaurant/types'
import { SECTION_META } from '@/lib/restaurant/constants'

interface Props {
  tables: RestaurantTable[]
  selectedIds: string[]
  onClose: () => void
  onLinked: () => void
}

export default function LinkTablesModal({ tables, selectedIds, onClose, onLinked }: Props) {
  const selected = tables.filter((t) => selectedIds.includes(t.id))
  const combinedCapacity = selected.reduce((sum, t) => sum + t.capacity, 0)
  const [name, setName] = useState(
    `${selected.map((t) => t.label).join(' + ')} (${combinedCapacity}-seater)`
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleLink() {
    if (!name.trim()) { setError('Name is required'); return }
    setError('')
    setSubmitting(true)

    try {
      const resp = await fetch('/api/restaurant/tables/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), table_ids: selectedIds }),
      })

      if (!resp.ok) {
        const err = await resp.json()
        setError(err.error || 'Failed to link tables')
        setSubmitting(false)
        return
      }

      onLinked()
      onClose()
    } catch {
      setError('Network error')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 size={18} className="text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-900">Link Tables</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Selected tables preview */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Tables to link</label>
            <div className="flex flex-wrap gap-2">
              {selected.map((t) => {
                const meta = SECTION_META[t.section]
                return (
                  <div
                    key={t.id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${meta?.bg || 'bg-gray-50'} ${meta?.color || 'text-gray-700'} border-gray-200`}
                  >
                    {t.label} ({t.capacity}s)
                  </div>
                )
              })}
            </div>
          </div>

          {/* Combined capacity */}
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-indigo-50">
            <span className="text-sm text-indigo-700 font-medium">Combined capacity:</span>
            <span className="text-lg font-bold text-indigo-900">{combinedCapacity} seats</span>
          </div>

          {/* Group name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Group name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <p className="text-xs text-gray-400">
            Linked tables share a single session when opened together.
            You can unlink them at any time from the floor plan editor.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleLink}
            disabled={submitting || selected.length < 2}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Link {selected.length} Tables
          </button>
        </div>
      </div>
    </div>
  )
}
