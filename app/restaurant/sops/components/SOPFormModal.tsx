'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { SOP_CATEGORIES, STAFF_ROLES } from '@/lib/restaurant/constants'
import type { SOPFormat } from '@/lib/restaurant/types'
import BlockBuilder, { type BlockDraft } from './BlockBuilder'

interface Props {
  onClose: () => void
  onCreated: () => void
}

export default function SOPFormModal({ onClose, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [sopFormat, setSopFormat] = useState<SOPFormat>('blocks')
  const [blocks, setBlocks] = useState<BlockDraft[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!title.trim()) { setError('Title is required'); return }
    if (sopFormat === 'blocks' && blocks.length === 0) { setError('Add at least one block'); return }
    if (sopFormat === 'blocks' && blocks.some(b => !b.label.trim())) { setError('All blocks need labels'); return }
    if (sopFormat === 'text' && !content.trim()) { setError('Content is required'); return }

    setError('')
    setSubmitting(true)

    try {
      const resp = await fetch('/api/restaurant/sops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: sopFormat === 'text' ? content : '',
          sop_format: sopFormat,
          category: category || null,
          visible_to_roles: roles,
          is_published: false,
          blocks: sopFormat === 'blocks' ? blocks.map(b => ({
            block_type: b.block_type,
            label: b.label.trim(),
            description: b.description || null,
            config: b.config,
            is_required: b.is_required,
          })) : undefined,
        }),
      })

      if (!resp.ok) {
        const err = await resp.json()
        setError(err.error || 'Failed to create SOP')
        setSubmitting(false)
        return
      }

      onCreated()
      onClose()
    } catch {
      setError('Network error')
      setSubmitting(false)
    }
  }

  function toggleRole(role: string) {
    setRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role])
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">New SOP</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="SOP title..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none"
            >
              <option value="">Select category...</option>
              {SOP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Roles */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Visible to roles</label>
            <div className="flex flex-wrap gap-2">
              {STAFF_ROLES.map(role => (
                <button key={role} onClick={() => toggleRole(role)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    roles.includes(role)
                      ? 'bg-[#0077B6] text-white border-[#0077B6]'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}
                >{role}</button>
              ))}
            </div>
          </div>

          {/* Format Toggle */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Format</label>
            <div className="inline-flex rounded-lg bg-gray-200 p-1">
              <button
                onClick={() => setSopFormat('blocks')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  sopFormat === 'blocks' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                }`}
              >Blocks</button>
              <button
                onClick={() => setSopFormat('text')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  sopFormat === 'text' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                }`}
              >Text</button>
            </div>
          </div>

          {/* Content: Blocks or Text */}
          {sopFormat === 'blocks' ? (
            <BlockBuilder blocks={blocks} onChange={setBlocks} />
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Content</label>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8}
                placeholder="Write SOP content..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none"
              />
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="px-4 py-2 rounded-lg bg-[#0077B6] text-white text-sm hover:bg-[#006299] disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Create SOP
          </button>
        </div>
      </div>
    </div>
  )
}
