'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Loader2, CheckCircle2, Circle, Lock, ChevronDown, ChevronRight,
  Camera, ScanText, Hash, Type, ShieldCheck, ArrowRight, ListChecks,
  CheckSquare, Square, Upload, X, Play
} from 'lucide-react'
import { SOP_BLOCK_META, SOP_INSTANCE_STATUS_COLORS } from '@/lib/restaurant/constants'
import type { SOPBlock, SOPBlockResponse } from '@/lib/restaurant/types'

interface BlockWithResponse extends SOPBlock {
  response: SOPBlockResponse | null
}

interface InstanceData {
  id: string
  sop_id: string
  sop_title: string
  sop_category: string | null
  shift_date: string
  status: string
  assigned_to: string | null
  started_at: string | null
  completed_at: string | null
  blocks: BlockWithResponse[]
}

export default function SOPExecutionPage() {
  const params = useParams()
  const router = useRouter()
  const instanceId = params.instanceId as string
  const supabase = createClient()

  const [data, setData] = useState<InstanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null)
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    const { data: inst } = await supabase
      .from('restaurant_sop_instances')
      .select('*')
      .eq('id', instanceId)
      .single()

    if (!inst) { setLoading(false); return }

    const { data: sop } = await supabase
      .from('restaurant_sops')
      .select('title, category')
      .eq('id', inst.sop_id)
      .single()

    const { data: blocks } = await supabase
      .from('restaurant_sop_blocks')
      .select('*')
      .eq('sop_id', inst.sop_id)
      .order('sort_order')

    const { data: responses } = await supabase
      .from('restaurant_sop_block_responses')
      .select('*')
      .eq('instance_id', instanceId)

    const respMap: Record<string, SOPBlockResponse> = {}
    responses?.forEach(r => { respMap[r.block_id] = r })

    const blocksWithResp: BlockWithResponse[] = (blocks || []).map(b => ({
      ...b,
      response: respMap[b.id] || null,
    }))

    // Find first non-completed block
    const firstPending = blocksWithResp.find(b =>
      b.response?.status === 'pending' || (!b.response)
    )

    setData({
      id: inst.id,
      sop_id: inst.sop_id,
      sop_title: sop?.title || 'Unknown',
      sop_category: sop?.category || null,
      shift_date: inst.shift_date,
      status: inst.status,
      assigned_to: inst.assigned_to,
      started_at: inst.started_at,
      completed_at: inst.completed_at,
      blocks: blocksWithResp,
    })

    setActiveBlockId(firstPending?.id || null)
    setLoading(false)
  }, [instanceId])

  useEffect(() => { fetchData() }, [fetchData])

  async function completeBlock(blockId: string, responseData: Record<string, unknown>) {
    setSubmitting(true)
    await fetch(`/api/restaurant/sops/instances/${instanceId}/blocks/${blockId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', response_data: responseData }),
    })
    await fetchData()
    setSubmitting(false)
  }

  async function skipBlock(blockId: string, reason?: string) {
    setSubmitting(true)
    await fetch(`/api/restaurant/sops/instances/${instanceId}/blocks/${blockId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'skipped', response_data: { skipped: true, skip_reason: reason || '' } }),
    })
    await fetchData()
    setSubmitting(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#0077B6]" /></div>
  }

  if (!data) {
    return <div className="text-center py-20 text-gray-400">Instance not found</div>
  }

  const completedCount = data.blocks.filter(b => b.response?.status === 'completed' || b.response?.status === 'skipped').length
  const progress = data.blocks.length > 0 ? Math.round((completedCount / data.blocks.length) * 100) : 0
  const statusStyle = SOP_INSTANCE_STATUS_COLORS[data.status] || SOP_INSTANCE_STATUS_COLORS.pending

  return (
    <div>
      {/* Back link */}
      <button onClick={() => router.push('/restaurant/sops')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to SOPs
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{data.sop_title}</h1>
            {data.sop_category && <span className="text-xs text-gray-400 mt-1">{data.sop_category}</span>}
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusStyle.bg} ${statusStyle.text}`}>
            {data.status.replace('_', ' ')}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
          <div className="h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: progress === 100 ? '#10b981' : '#0077B6' }} />
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span>{completedCount}/{data.blocks.length} blocks</span>
          <span>{progress}%</span>
          <span>{data.shift_date}</span>
        </div>
      </div>

      {/* Block stepper */}
      <div className="space-y-3">
        {data.blocks.map((block, i) => {
          const status = block.response?.status || 'pending'
          const isActive = block.id === activeBlockId
          const isCompleted = status === 'completed' || status === 'skipped'
          const isBlocked = status === 'blocked'
          const meta = SOP_BLOCK_META[block.block_type]
          const isExpanded = expandedBlock === block.id || isActive

          const borderColor = isCompleted ? 'border-l-emerald-500' : isActive ? 'border-l-[#0077B6]' : isBlocked ? 'border-l-amber-500' : 'border-l-gray-200'

          return (
            <div key={block.id} className={`bg-white rounded-xl border border-gray-200 border-l-4 ${borderColor} overflow-hidden`}>
              {/* Block header */}
              <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedBlock(isExpanded && !isActive ? null : block.id)}>
                {/* Status icon */}
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : isBlocked ? (
                  <Lock className="w-5 h-5 text-amber-500 shrink-0" />
                ) : isActive ? (
                  <Circle className="w-5 h-5 text-[#0077B6] shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 shrink-0" />
                )}

                <span className="text-xs text-gray-400 w-5">{i + 1}</span>

                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${meta?.bg} ${meta?.color}`}>
                  {meta?.label}
                </span>

                <span className={`flex-1 text-sm font-medium ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {block.label}
                </span>

                {status === 'skipped' && <span className="text-[10px] text-gray-400">skipped</span>}

                {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-gray-100 p-4">
                  {block.description && (
                    <p className="text-sm text-gray-500 mb-3">{block.description}</p>
                  )}

                  {/* Completed response view */}
                  {isCompleted && block.response && (
                    <CompletedResponseView block={block} response={block.response} />
                  )}

                  {/* Active block execution */}
                  {isActive && !isCompleted && !isBlocked && (
                    <BlockExecution
                      block={block}
                      instanceId={instanceId}
                      onComplete={(rd) => completeBlock(block.id, rd)}
                      onSkip={(reason) => skipBlock(block.id, reason)}
                      submitting={submitting}
                    />
                  )}

                  {/* Blocked message */}
                  {isBlocked && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
                      <Lock className="w-4 h-4" />
                      {(block.config as { message?: string }).message || 'Waiting for approval'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Completed banner */}
      {data.status === 'completed' && (
        <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="font-semibold text-emerald-700">SOP Completed</p>
          <p className="text-sm text-emerald-600 mt-1">All blocks have been completed</p>
        </div>
      )}
    </div>
  )
}

// ─── Block Execution Component ────────────────────────────────

function BlockExecution({ block, instanceId, onComplete, onSkip, submitting }: {
  block: BlockWithResponse
  instanceId: string
  onComplete: (data: Record<string, unknown>) => void
  onSkip: (reason?: string) => void
  submitting: boolean
}) {
  switch (block.block_type) {
    case 'action': return <ActionBlockExec onComplete={onComplete} onSkip={onSkip} submitting={submitting} />
    case 'checklist': return <ChecklistBlockExec config={block.config} onComplete={onComplete} onSkip={onSkip} submitting={submitting} />
    case 'number_input': return <NumberBlockExec config={block.config} onComplete={onComplete} onSkip={onSkip} submitting={submitting} />
    case 'text_input': return <TextBlockExec config={block.config} onComplete={onComplete} onSkip={onSkip} submitting={submitting} />
    case 'photo_upload': return <PhotoBlockExec config={block.config} instanceId={instanceId} blockId={block.id} onComplete={onComplete} onSkip={onSkip} submitting={submitting} />
    case 'ocr_scan': return <OcrBlockExec config={block.config} instanceId={instanceId} blockId={block.id} onComplete={onComplete} onSkip={onSkip} submitting={submitting} />
    case 'approval': return <ApprovalBlockExec config={block.config} onComplete={onComplete} submitting={submitting} />
    case 'sequence': return <SequenceBlockExec config={block.config} onComplete={onComplete} submitting={submitting} />
    default: return <ActionBlockExec onComplete={onComplete} onSkip={onSkip} submitting={submitting} />
  }
}

// ─── Action Block ─────────────────────────────────────────────

function ActionBlockExec({ onComplete, onSkip, submitting }: {
  onComplete: (data: Record<string, unknown>) => void; onSkip: (r?: string) => void; submitting: boolean
}) {
  return (
    <div className="flex gap-2">
      <button onClick={() => onComplete({ done: true })} disabled={submitting}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50">
        {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Mark Complete
      </button>
      <button onClick={() => onSkip()} disabled={submitting}
        className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
        Skip
      </button>
    </div>
  )
}

// ─── Checklist Block ──────────────────────────────────────────

function ChecklistBlockExec({ config, onComplete, onSkip, submitting }: {
  config: Record<string, unknown>; onComplete: (data: Record<string, unknown>) => void; onSkip: (r?: string) => void; submitting: boolean
}) {
  const items = (config.items as string[]) || []
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const allDone = items.every(item => checked[item])

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} onClick={() => setChecked(p => ({ ...p, [item]: !p[item] }))}
            className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 cursor-pointer">
            {checked[item]
              ? <CheckSquare className="w-5 h-5 text-[#0077B6] shrink-0" />
              : <Square className="w-5 h-5 text-gray-300 shrink-0" />}
            <span className={`text-sm ${checked[item] ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={() => onComplete({ items: checked })} disabled={!allDone || submitting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50">
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} All Done
        </button>
        <button onClick={() => onSkip()} disabled={submitting}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">Skip</button>
      </div>
    </div>
  )
}

// ─── Number Input Block ───────────────────────────────────────

function NumberBlockExec({ config, onComplete, onSkip, submitting }: {
  config: Record<string, unknown>; onComplete: (data: Record<string, unknown>) => void; onSkip: (r?: string) => void; submitting: boolean
}) {
  const [value, setValue] = useState('')
  const unit = (config.unit as string) || ''
  const min = config.min as number | undefined
  const max = config.max as number | undefined
  const num = parseFloat(value)
  const outOfRange = value !== '' && ((min !== undefined && num < min) || (max !== undefined && num > max))

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="Enter value..."
          className={`w-32 rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 outline-none ${outOfRange ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
        />
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
      {outOfRange && <p className="text-xs text-red-600">Out of range ({min !== undefined ? `min: ${min}` : ''}{min !== undefined && max !== undefined ? ', ' : ''}{max !== undefined ? `max: ${max}` : ''})</p>}
      <div className="flex gap-2">
        <button onClick={() => onComplete({ value: num })} disabled={!value || outOfRange || submitting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50">
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Submit
        </button>
        <button onClick={() => onSkip()} disabled={submitting}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">Skip</button>
      </div>
    </div>
  )
}

// ─── Text Input Block ─────────────────────────────────────────

function TextBlockExec({ config, onComplete, onSkip, submitting }: {
  config: Record<string, unknown>; onComplete: (data: Record<string, unknown>) => void; onSkip: (r?: string) => void; submitting: boolean
}) {
  const [value, setValue] = useState('')
  const maxLen = (config.max_length as number) || 500
  const placeholder = (config.placeholder as string) || 'Enter notes...'

  return (
    <div className="space-y-3">
      <div>
        <textarea value={value} onChange={e => setValue(e.target.value.slice(0, maxLen))} placeholder={placeholder} rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none"
        />
        <p className="text-xs text-gray-400 text-right">{value.length}/{maxLen}</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onComplete({ value })} disabled={!value.trim() || submitting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50">
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Submit
        </button>
        <button onClick={() => onSkip()} disabled={submitting}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">Skip</button>
      </div>
    </div>
  )
}

// ─── Photo Upload Block ───────────────────────────────────────

function PhotoBlockExec({ config, instanceId, blockId, onComplete, onSkip, submitting }: {
  config: Record<string, unknown>; instanceId: string; blockId: string
  onComplete: (data: Record<string, unknown>) => void; onSkip: (r?: string) => void; submitting: boolean
}) {
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [caption, setCaption] = useState('')
  const maxPhotos = (config.max_photos as number) || 1
  const requireCaption = config.require_caption as boolean

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    form.append('instance_id', instanceId)
    form.append('block_id', blockId)
    const resp = await fetch('/api/restaurant/sops/upload', { method: 'POST', body: form })
    if (resp.ok) {
      const data = await resp.json()
      setPhotos(prev => [...prev, data.url])
    }
    setUploading(false)
    e.target.value = ''
  }

  const canComplete = photos.length > 0 && (!requireCaption || caption.trim())

  return (
    <div className="space-y-3">
      {photos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {photos.map((url, i) => (
            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                className="absolute top-0.5 right-0.5 bg-black/50 rounded-full p-0.5"><X size={12} className="text-white" /></button>
            </div>
          ))}
        </div>
      )}
      {photos.length < maxPhotos && (
        <label className="flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:border-[#0077B6] transition-colors">
          {uploading ? <Loader2 size={16} className="animate-spin text-[#0077B6]" /> : <Camera size={16} className="text-gray-500" />}
          <span className="text-sm text-gray-500">{uploading ? 'Uploading...' : 'Take photo or upload'}</span>
          <input type="file" accept="image/*" capture="environment" onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      )}
      {requireCaption && (
        <input type="text" value={caption} onChange={e => setCaption(e.target.value)} placeholder="Add caption..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none"
        />
      )}
      <div className="flex gap-2">
        <button onClick={() => onComplete({ photo_urls: photos, caption })} disabled={!canComplete || submitting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50">
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Done
        </button>
        <button onClick={() => onSkip()} disabled={submitting}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">Skip</button>
      </div>
    </div>
  )
}

// ─── OCR Scan Block ───────────────────────────────────────────

function OcrBlockExec({ config, instanceId, blockId, onComplete, onSkip, submitting }: {
  config: Record<string, unknown>; instanceId: string; blockId: string
  onComplete: (data: Record<string, unknown>) => void; onSkip: (r?: string) => void; submitting: boolean
}) {
  const [photoUrl, setPhotoUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [parsedFields, setParsedFields] = useState<Record<string, unknown> | null>(null)
  const [extractedText, setExtractedText] = useState('')

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    form.append('instance_id', instanceId)
    form.append('block_id', blockId)
    const resp = await fetch('/api/restaurant/sops/upload', { method: 'POST', body: form })
    if (resp.ok) {
      const data = await resp.json()
      setPhotoUrl(data.url)
    }
    setUploading(false)
    e.target.value = ''
  }

  async function runOcr() {
    if (!photoUrl) return
    setScanning(true)
    const resp = await fetch('/api/restaurant/sops/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: photoUrl, expected_fields: config.expected_fields }),
    })
    if (resp.ok) {
      const data = await resp.json()
      setParsedFields(data.parsed_fields || {})
      setExtractedText(data.extracted_text || '')
    }
    setScanning(false)
  }

  return (
    <div className="space-y-3">
      {!photoUrl ? (
        <label className="flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:border-[#0077B6]">
          {uploading ? <Loader2 size={16} className="animate-spin text-[#0077B6]" /> : <ScanText size={16} className="text-gray-500" />}
          <span className="text-sm text-gray-500">{uploading ? 'Uploading...' : 'Take photo of document'}</span>
          <input type="file" accept="image/*" capture="environment" onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      ) : (
        <div className="space-y-3">
          <div className="w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
            <img src={photoUrl} alt="Scanned document" className="w-full h-full object-cover" />
          </div>
          {!parsedFields && (
            <button onClick={runOcr} disabled={scanning}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0077B6] text-white text-sm hover:bg-[#006299] disabled:opacity-50">
              {scanning ? <Loader2 size={14} className="animate-spin" /> : <ScanText size={14} />} Scan Document
            </button>
          )}
          {parsedFields && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-gray-600">Extracted Data</p>
              {Object.entries(parsedFields).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 capitalize w-20">{key}:</span>
                  <span className="text-gray-900 font-medium">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => onComplete({ photo_url: photoUrl, extracted_text: extractedText, parsed_fields: parsedFields })}
          disabled={!parsedFields || submitting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50">
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Confirm
        </button>
        <button onClick={() => onSkip()} disabled={submitting}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">Skip</button>
      </div>
    </div>
  )
}

// ─── Approval Block ───────────────────────────────────────────

function ApprovalBlockExec({ config, onComplete, submitting }: {
  config: Record<string, unknown>; onComplete: (data: Record<string, unknown>) => void; submitting: boolean
}) {
  const role = (config.required_role as string) || 'manager'
  const message = (config.message as string) || `${role} approval required`

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
        <ShieldCheck className="w-4 h-4" /> {message}
      </div>
      <button onClick={() => onComplete({ approved: true, approved_at: new Date().toISOString() })} disabled={submitting}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50">
        {submitting ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Approve
      </button>
    </div>
  )
}

// ─── Sequence Block ───────────────────────────────────────────

function SequenceBlockExec({ config, onComplete, submitting }: {
  config: Record<string, unknown>; onComplete: (data: Record<string, unknown>) => void; submitting: boolean
}) {
  return (
    <div>
      <button onClick={() => onComplete({ triggered: true })} disabled={submitting}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0077B6] text-white text-sm hover:bg-[#006299] disabled:opacity-50">
        {submitting ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />} Start Next SOP
      </button>
    </div>
  )
}

// ─── Completed Response Viewer ────────────────────────────────

function CompletedResponseView({ block, response }: { block: SOPBlock; response: SOPBlockResponse }) {
  const data = response.response_data || {}

  if (response.status === 'skipped') {
    return <p className="text-xs text-gray-400 italic">Skipped{data.skip_reason ? `: ${data.skip_reason}` : ''}</p>
  }

  switch (block.block_type) {
    case 'checklist': {
      const items = (data.items as Record<string, boolean>) || {}
      return (
        <div className="space-y-1">
          {Object.entries(items).map(([item, done]) => (
            <div key={item} className="flex items-center gap-2 text-sm">
              {done ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4 text-gray-300" />}
              <span className={done ? 'text-gray-400' : 'text-gray-700'}>{item}</span>
            </div>
          ))}
        </div>
      )
    }
    case 'photo_upload': {
      const urls = (data.photo_urls as string[]) || []
      return (
        <div className="flex gap-2 flex-wrap">
          {urls.map((url, i) => (
            <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
              <img src={url} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
          {data.caption ? <p className="text-xs text-gray-500 w-full">{String(data.caption)}</p> : null}
        </div>
      )
    }
    case 'number_input':
      return <p className="text-sm text-gray-700">Value: <strong>{String(data.value)}</strong> {String((block.config as { unit?: string }).unit || '')}</p>
    case 'text_input':
      return <p className="text-sm text-gray-700">{String(data.value)}</p>
    case 'ocr_scan': {
      const fields = (data.parsed_fields as Record<string, unknown>) || {}
      return (
        <div className="space-y-1">
          {Object.entries(fields).map(([k, v]) => (
            <div key={k} className="flex gap-2 text-sm">
              <span className="text-gray-500 capitalize w-20">{k}:</span>
              <span className="text-gray-900">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
            </div>
          ))}
        </div>
      )
    }
    case 'approval':
      return <p className="text-sm text-emerald-600">Approved{data.approved_at ? ` at ${new Date(String(data.approved_at)).toLocaleTimeString()}` : ''}</p>
    case 'sequence':
      return <p className="text-sm text-[#0077B6]">Triggered next SOP</p>
    default:
      return <p className="text-xs text-emerald-600">Completed</p>
  }
}
