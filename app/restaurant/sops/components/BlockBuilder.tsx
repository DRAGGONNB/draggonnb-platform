'use client'

import { useState } from 'react'
import { Plus, CheckCircle2, ListChecks, Camera, ScanText, Hash, Type, ShieldCheck, ArrowRight } from 'lucide-react'
import { SOP_BLOCK_META, SOP_BLOCK_TYPES } from '@/lib/restaurant/constants'
import type { SOPBlockType } from '@/lib/restaurant/types'
import BlockBuilderItem from './BlockBuilderItem'
import BlockConfigModal from './BlockConfigModal'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  CheckCircle2, ListChecks, Camera, ScanText, Hash, Type, ShieldCheck, ArrowRight,
}

export interface BlockDraft {
  block_type: SOPBlockType
  label: string
  description: string
  config: Record<string, unknown>
  is_required: boolean
}

interface Props {
  blocks: BlockDraft[]
  onChange: (blocks: BlockDraft[]) => void
}

export default function BlockBuilder({ blocks, onChange }: Props) {
  const [showPicker, setShowPicker] = useState(false)
  const [configIndex, setConfigIndex] = useState<number | null>(null)

  function addBlock(type: SOPBlockType) {
    const defaults = getDefaultConfig(type)
    onChange([...blocks, {
      block_type: type,
      label: '',
      description: '',
      config: defaults,
      is_required: true,
    }])
    setShowPicker(false)
  }

  function moveBlock(from: number, dir: -1 | 1) {
    const to = from + dir
    if (to < 0 || to >= blocks.length) return
    const arr = [...blocks]
    ;[arr[from], arr[to]] = [arr[to], arr[from]]
    onChange(arr)
  }

  function removeBlock(index: number) {
    onChange(blocks.filter((_, i) => i !== index))
  }

  function updateLabel(index: number, label: string) {
    const arr = [...blocks]
    arr[index] = { ...arr[index], label }
    onChange(arr)
  }

  function saveConfig(index: number, updated: BlockDraft) {
    const arr = [...blocks]
    arr[index] = updated
    onChange(arr)
    setConfigIndex(null)
  }

  return (
    <div className="space-y-2">
      {blocks.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">No blocks yet. Add your first block below.</p>
      )}

      {blocks.map((block, i) => (
        <BlockBuilderItem
          key={i}
          block={block}
          index={i}
          total={blocks.length}
          onMoveUp={() => moveBlock(i, -1)}
          onMoveDown={() => moveBlock(i, 1)}
          onRemove={() => removeBlock(i)}
          onConfigure={() => setConfigIndex(i)}
          onLabelChange={(label) => updateLabel(i, label)}
        />
      ))}

      {/* Add Block Button */}
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="w-full flex items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm text-gray-500 hover:border-[#0077B6] hover:text-[#0077B6] transition-colors"
      >
        <Plus size={16} /> Add Block
      </button>

      {/* Block Type Picker */}
      {showPicker && (
        <div className="grid grid-cols-2 gap-2 p-3 rounded-xl border border-gray-200 bg-gray-50">
          {SOP_BLOCK_TYPES.map((type) => {
            const meta = SOP_BLOCK_META[type]
            const Icon = ICON_MAP[meta.icon] || CheckCircle2
            return (
              <button
                key={type}
                onClick={() => addBlock(type)}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2.5 text-left hover:border-[#0077B6] hover:shadow-sm transition-all"
              >
                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${meta.bg}`}>
                  <Icon size={16} className={meta.color} />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-gray-900">{meta.label}</div>
                  <div className="text-[10px] text-gray-400 truncate">{meta.description}</div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Config Modal */}
      {configIndex !== null && blocks[configIndex] && (
        <BlockConfigModal
          block={blocks[configIndex]}
          onSave={(updated) => saveConfig(configIndex, updated)}
          onClose={() => setConfigIndex(null)}
        />
      )}
    </div>
  )
}

function getDefaultConfig(type: SOPBlockType): Record<string, unknown> {
  switch (type) {
    case 'checklist': return { items: [''] }
    case 'photo_upload': return { max_photos: 1, require_caption: false }
    case 'ocr_scan': return { expected_fields: ['supplier', 'date', 'items', 'total'] }
    case 'number_input': return { unit: '', min: undefined, max: undefined }
    case 'text_input': return { placeholder: '', max_length: 500 }
    case 'approval': return { required_role: 'manager', message: '' }
    case 'sequence': return { target_sop_id: '' }
    default: return {}
  }
}
