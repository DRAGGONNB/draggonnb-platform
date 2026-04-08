'use client'

import { ChevronUp, ChevronDown, Trash2, Settings, CheckCircle2, ListChecks, Camera, ScanText, Hash, Type, ShieldCheck, ArrowRight } from 'lucide-react'
import { SOP_BLOCK_META } from '@/lib/restaurant/constants'
import type { SOPBlockType } from '@/lib/restaurant/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  CheckCircle2, ListChecks, Camera, ScanText, Hash, Type, ShieldCheck, ArrowRight,
}

interface BlockDraft {
  block_type: SOPBlockType
  label: string
  description: string
  config: Record<string, unknown>
  is_required: boolean
}

interface Props {
  block: BlockDraft
  index: number
  total: number
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  onConfigure: () => void
  onLabelChange: (label: string) => void
}

export default function BlockBuilderItem({
  block, index, total, onMoveUp, onMoveDown, onRemove, onConfigure, onLabelChange,
}: Props) {
  const meta = SOP_BLOCK_META[block.block_type]
  const Icon = ICON_MAP[meta?.icon || 'CheckCircle2'] || CheckCircle2

  const configSummary = getConfigSummary(block)

  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex flex-col gap-0.5">
        <button onClick={onMoveUp} disabled={index === 0} className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30">
          <ChevronUp size={14} />
        </button>
        <button onClick={onMoveDown} disabled={index === total - 1} className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30">
          <ChevronDown size={14} />
        </button>
      </div>

      <span className="text-xs text-gray-400 w-5 text-center">{index + 1}</span>

      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${meta?.bg} ${meta?.color}`}>
        <Icon size={12} />
        {meta?.label}
      </span>

      <input
        type="text"
        value={block.label}
        onChange={(e) => onLabelChange(e.target.value)}
        placeholder="Block label..."
        className="flex-1 min-w-0 rounded border border-gray-200 px-2 py-1 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none"
      />

      {configSummary && (
        <span className="text-[10px] text-gray-400 hidden sm:block">{configSummary}</span>
      )}

      <button onClick={onConfigure} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="Configure">
        <Settings size={14} />
      </button>
      <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400" title="Remove">
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function getConfigSummary(block: BlockDraft): string {
  const c = block.config
  switch (block.block_type) {
    case 'checklist': return `${(c.items as string[] || []).length} items`
    case 'photo_upload': return `max ${c.max_photos || 1} photo(s)`
    case 'number_input': return c.unit ? `${c.unit}` : ''
    case 'approval': return c.required_role ? `${c.required_role}` : ''
    case 'ocr_scan': return `${(c.expected_fields as string[] || []).length} fields`
    default: return ''
  }
}
