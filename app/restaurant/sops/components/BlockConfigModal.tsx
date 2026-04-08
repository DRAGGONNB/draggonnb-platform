'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { SOP_BLOCK_META, STAFF_ROLES } from '@/lib/restaurant/constants'
import type { SOPBlockType } from '@/lib/restaurant/types'
import { createClient } from '@/lib/supabase/client'
import { RESTAURANT_ID } from '@/lib/restaurant/constants'

interface BlockDraft {
  block_type: SOPBlockType
  label: string
  description: string
  config: Record<string, unknown>
  is_required: boolean
}

interface Props {
  block: BlockDraft
  onSave: (updated: BlockDraft) => void
  onClose: () => void
}

export default function BlockConfigModal({ block, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<BlockDraft>({ ...block, config: { ...block.config } })
  const [sops, setSops] = useState<{ id: string; title: string }[]>([])
  const meta = SOP_BLOCK_META[block.block_type]

  useEffect(() => {
    if (block.block_type === 'sequence') {
      const supabase = createClient()
      supabase
        .from('restaurant_sops')
        .select('id, title')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('sop_format', 'blocks')
        .order('title')
        .then(({ data }) => setSops(data || []))
    }
  }, [block.block_type])

  function updateConfig(key: string, value: unknown) {
    setDraft(d => ({ ...d, config: { ...d.config, [key]: value } }))
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Configure {meta?.label} Block</h2>
            <p className="text-xs text-gray-500 mt-0.5">{meta?.description}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Common: description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft(d => ({ ...d, description: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none"
              placeholder="Instructions for staff..."
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.is_required}
              onChange={(e) => setDraft(d => ({ ...d, is_required: e.target.checked }))}
              className="rounded border-gray-300"
            />
            Required step
          </label>

          {/* Type-specific config */}
          {block.block_type === 'checklist' && (
            <ChecklistConfig items={(draft.config.items as string[]) || []} onChange={(items) => updateConfig('items', items)} />
          )}

          {block.block_type === 'photo_upload' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max photos</label>
                <input type="number" min={1} max={10} value={Number(draft.config.max_photos) || 1}
                  onChange={(e) => updateConfig('max_photos', parseInt(e.target.value) || 1)}
                  className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!draft.config.require_caption}
                  onChange={(e) => updateConfig('require_caption', e.target.checked)}
                  className="rounded border-gray-300"
                />
                Require caption
              </label>
            </div>
          )}

          {block.block_type === 'number_input' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                <input type="text" value={String(draft.config.unit || '')} placeholder="e.g. °C, kg, ml"
                  onChange={(e) => updateConfig('unit', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Min</label>
                  <input type="number" value={draft.config.min !== undefined ? Number(draft.config.min) : ''}
                    onChange={(e) => updateConfig('min', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Max</label>
                  <input type="number" value={draft.config.max !== undefined ? Number(draft.config.max) : ''}
                    onChange={(e) => updateConfig('max', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {block.block_type === 'text_input' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Placeholder</label>
                <input type="text" value={String(draft.config.placeholder || '')}
                  onChange={(e) => updateConfig('placeholder', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max length</label>
                <input type="number" min={1} value={Number(draft.config.max_length) || 500}
                  onChange={(e) => updateConfig('max_length', parseInt(e.target.value) || 500)}
                  className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none"
                />
              </div>
            </div>
          )}

          {block.block_type === 'approval' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Required role</label>
              <select value={String(draft.config.required_role || '')}
                onChange={(e) => updateConfig('required_role', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none"
              >
                <option value="">Select role...</option>
                {STAFF_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Approval message</label>
                <input type="text" value={String(draft.config.message || '')} placeholder="Manager sign-off required"
                  onChange={(e) => updateConfig('message', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none"
                />
              </div>
            </div>
          )}

          {block.block_type === 'sequence' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Target SOP</label>
              <select value={String(draft.config.target_sop_id || '')}
                onChange={(e) => updateConfig('target_sop_id', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none"
              >
                <option value="">Select SOP...</option>
                {sops.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
          )}

          {block.block_type === 'ocr_scan' && (
            <ChecklistConfig
              items={(draft.config.expected_fields as string[]) || ['supplier', 'date', 'items', 'total']}
              onChange={(fields) => updateConfig('expected_fields', fields)}
              label="Expected fields"
              placeholder="e.g. supplier"
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={() => onSave(draft)} className="px-4 py-2 rounded-lg bg-[#0077B6] text-white text-sm hover:bg-[#006299]">Save</button>
        </div>
      </div>
    </div>
  )
}

function ChecklistConfig({ items, onChange, label = 'Items', placeholder = 'Item label...' }: {
  items: string[]; onChange: (items: string[]) => void; label?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input type="text" value={item} placeholder={placeholder}
              onChange={(e) => { const n = [...items]; n[i] = e.target.value; onChange(n) }}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none"
            />
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="p-2 rounded-lg hover:bg-red-50 text-red-400">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button onClick={() => onChange([...items, ''])} className="flex items-center gap-1 text-xs text-[#0077B6] hover:underline">
          <Plus size={12} /> Add {label.toLowerCase().replace(/s$/, '')}
        </button>
      </div>
    </div>
  )
}
