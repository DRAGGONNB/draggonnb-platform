'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  FileText, Plus, X, ChevronDown, ChevronRight, Eye, EyeOff,
  CheckCircle2, Loader2, BookOpen, Search, ClipboardList,
  CheckSquare, Square, Trash2, Calendar, ListChecks, Link2,
  Play, Blocks
} from 'lucide-react'
import { RESTAURANT_ID, ORG_ID, SOP_CATEGORIES as CATEGORIES, STAFF_ROLES as ROLES, CHECKLIST_TYPES, SOP_BLOCK_META, SOP_INSTANCE_STATUS_COLORS } from '@/lib/restaurant/constants'
import type { SOPBlock, SOPInstance } from '@/lib/restaurant/types'
import SOPFormModal from './components/SOPFormModal'

interface SOP {
  id: string
  title: string
  content: string
  sop_format?: string
  category: string
  visible_to_roles: string[]
  is_published: boolean
  created_at: string
  updated_at: string
  ack_count?: number
  blocks?: SOPBlock[]
}

interface Template {
  id: string
  name: string
  type: string
  items: { label: string }[]
  assigned_role: string
  is_active: boolean
}

interface ChecklistItem {
  id: string
  item_label: string
  is_completed: boolean
  completed_at: string | null
  notes: string | null
}

interface Instance {
  id: string
  template_id: string
  shift_date: string
  status: string
  completed_at: string | null
  template_name?: string
  template_type?: string
  items?: ChecklistItem[]
}

export default function SOPsPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'sops' | 'checklists' | 'today'>('sops')
  const [sops, setSops] = useState<SOP[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [instances, setInstances] = useState<Instance[]>([])
  const [sopInstances, setSopInstances] = useState<(SOPInstance & { sop_title: string; block_count: number; completed_count: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedInstance, setExpandedInstance] = useState<string | null>(null)
  const [showSopForm, setShowSopForm] = useState(false)
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')

  const [sopForm, setSopForm] = useState({
    title: '', content: '', category: 'General', visible_to_roles: [] as string[],
    linked_checklist: '' as string,
  })
  const [templateForm, setTemplateForm] = useState({
    name: '', type: 'opening', assigned_role: 'manager', items: [''] as string[],
  })

  const today = new Date().toISOString().split('T')[0]

  const fetchSOPs = useCallback(async () => {
    const { data: sopData } = await supabase
      .from('restaurant_sops')
      .select('*')
      .eq('restaurant_id', RESTAURANT_ID)
      .order('category')
      .order('title')

    if (sopData) {
      const { data: ackData } = await supabase
        .from('restaurant_sop_acknowledgments')
        .select('sop_id')
        .in('sop_id', sopData.map(s => s.id))

      const ackCounts: Record<string, number> = {}
      ackData?.forEach(a => { ackCounts[a.sop_id] = (ackCounts[a.sop_id] || 0) + 1 })

      // Fetch blocks for block-based SOPs
      const blockSopIds = sopData.filter(s => s.sop_format === 'blocks').map(s => s.id)
      let blocksMap: Record<string, SOPBlock[]> = {}
      if (blockSopIds.length > 0) {
        const { data: blocksData } = await supabase
          .from('restaurant_sop_blocks')
          .select('*')
          .in('sop_id', blockSopIds)
          .order('sort_order')
        if (blocksData) {
          blocksData.forEach(b => {
            if (!blocksMap[b.sop_id]) blocksMap[b.sop_id] = []
            blocksMap[b.sop_id].push(b)
          })
        }
      }

      setSops(sopData.map(s => ({
        ...s,
        ack_count: ackCounts[s.id] || 0,
        blocks: blocksMap[s.id] || undefined,
      })))
    }
  }, [])

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from('restaurant_checklist_templates')
      .select('*')
      .eq('restaurant_id', RESTAURANT_ID)
      .order('name')
    if (data) setTemplates(data)
  }, [])

  const fetchInstances = useCallback(async () => {
    const { data: instData } = await supabase
      .from('restaurant_checklist_instances')
      .select('*')
      .eq('shift_date', today)
      .eq('organization_id', ORG_ID)
      .order('created_at', { ascending: false })

    if (instData && instData.length > 0) {
      const templateIds = [...new Set(instData.map(i => i.template_id))]
      const { data: tData } = await supabase
        .from('restaurant_checklist_templates')
        .select('id, name, type')
        .in('id', templateIds)
      const tMap: Record<string, { name: string; type: string }> = {}
      tData?.forEach(t => { tMap[t.id] = { name: t.name, type: t.type } })

      const { data: itemsData } = await supabase
        .from('restaurant_checklist_items')
        .select('*')
        .in('instance_id', instData.map(i => i.id))
        .order('id')
      const itemsMap: Record<string, ChecklistItem[]> = {}
      itemsData?.forEach(item => {
        if (!itemsMap[item.instance_id]) itemsMap[item.instance_id] = []
        itemsMap[item.instance_id].push(item)
      })

      setInstances(instData.map(i => ({
        ...i,
        template_name: tMap[i.template_id]?.name || 'Unknown',
        template_type: tMap[i.template_id]?.type || '',
        items: itemsMap[i.id] || [],
      })))
    } else {
      setInstances([])
    }
  }, [today])

  const fetchSopInstances = useCallback(async () => {
    const { data: instData } = await supabase
      .from('restaurant_sop_instances')
      .select('*')
      .eq('shift_date', today)
      .eq('organization_id', ORG_ID)
      .order('created_at', { ascending: false })

    if (instData && instData.length > 0) {
      const sopIds = [...new Set(instData.map(i => i.sop_id))]
      const { data: sopData } = await supabase
        .from('restaurant_sops')
        .select('id, title')
        .in('id', sopIds)
      const sopMap: Record<string, string> = {}
      sopData?.forEach(s => { sopMap[s.id] = s.title })

      const { data: respData } = await supabase
        .from('restaurant_sop_block_responses')
        .select('instance_id, status')
        .in('instance_id', instData.map(i => i.id))

      const countMap: Record<string, { total: number; done: number }> = {}
      respData?.forEach(r => {
        if (!countMap[r.instance_id]) countMap[r.instance_id] = { total: 0, done: 0 }
        countMap[r.instance_id].total++
        if (r.status === 'completed' || r.status === 'skipped') countMap[r.instance_id].done++
      })

      setSopInstances(instData.map(i => ({
        ...i,
        sop_title: sopMap[i.sop_id] || 'Unknown',
        block_count: countMap[i.id]?.total || 0,
        completed_count: countMap[i.id]?.done || 0,
      })))
    } else {
      setSopInstances([])
    }
  }, [today])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchSOPs(), fetchTemplates(), fetchInstances(), fetchSopInstances()]).then(() => setLoading(false))
  }, [fetchSOPs, fetchTemplates, fetchInstances, fetchSopInstances])

  const handleCreateSOP = async () => {
    // Legacy text SOP creation (kept for backward compat)
    if (!sopForm.title.trim() || !sopForm.content.trim()) return
    setSaving(true)
    await supabase.from('restaurant_sops').insert({
      organization_id: ORG_ID, restaurant_id: RESTAURANT_ID,
      title: sopForm.title, content: sopForm.content,
      category: sopForm.category, visible_to_roles: sopForm.visible_to_roles,
      is_published: false,
    })
    setSopForm({ title: '', content: '', category: 'General', visible_to_roles: [], linked_checklist: '' })
    setShowSopForm(false)
    setSaving(false)
    fetchSOPs()
  }

  const runSopToday = async (sopId: string) => {
    try {
      const resp = await fetch('/api/restaurant/sops/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sop_id: sopId }),
      })
      if (resp.ok) {
        fetchSopInstances()
        setTab('today')
      }
    } catch {}
  }

  const handleCreateTemplate = async () => {
    const validItems = templateForm.items.filter(i => i.trim())
    if (!templateForm.name.trim() || validItems.length === 0) return
    setSaving(true)
    await supabase.from('restaurant_checklist_templates').insert({
      organization_id: ORG_ID, restaurant_id: RESTAURANT_ID,
      name: templateForm.name, type: templateForm.type,
      items: validItems.map(label => ({ label })),
      assigned_role: templateForm.assigned_role, is_active: true,
    })
    setTemplateForm({ name: '', type: 'opening', assigned_role: 'manager', items: [''] })
    setShowTemplateForm(false)
    setSaving(false)
    fetchTemplates()
  }

  const createFromTemplate = async (template: Template) => {
    const { data: inst } = await supabase
      .from('restaurant_checklist_instances')
      .insert({ organization_id: ORG_ID, template_id: template.id, shift_date: today, status: 'pending' })
      .select().single()
    if (inst) {
      await supabase.from('restaurant_checklist_items').insert(
        template.items.map(item => ({
          organization_id: ORG_ID, instance_id: inst.id, item_label: item.label, is_completed: false,
        }))
      )
    }
    fetchInstances()
    setTab('today')
  }

  const toggleItem = async (item: ChecklistItem) => {
    await supabase.from('restaurant_checklist_items').update({
      is_completed: !item.is_completed,
      completed_at: !item.is_completed ? new Date().toISOString() : null,
    }).eq('id', item.id)
    fetchInstances()
  }

  const togglePublish = async (sop: SOP) => {
    await supabase.from('restaurant_sops')
      .update({ is_published: !sop.is_published, updated_at: new Date().toISOString() })
      .eq('id', sop.id)
    fetchSOPs()
  }

  const toggleRole = (role: string) => {
    setSopForm(prev => ({
      ...prev,
      visible_to_roles: prev.visible_to_roles.includes(role)
        ? prev.visible_to_roles.filter(r => r !== role)
        : [...prev.visible_to_roles, role]
    }))
  }

  const getProgress = (items?: ChecklistItem[]) => {
    if (!items || items.length === 0) return 0
    return Math.round((items.filter(i => i.is_completed).length / items.length) * 100)
  }

  const typeBadge = (type: string) => {
    const m: Record<string, string> = {
      opening: 'bg-blue-50 text-blue-700', closing: 'bg-purple-50 text-purple-700',
      cleaning: 'bg-emerald-50 text-emerald-700', food_prep: 'bg-orange-50 text-orange-700',
    }
    return m[type] || 'bg-gray-50 text-gray-700'
  }

  const filtered = sops.filter(s => {
    if (filterCategory !== 'all' && s.category !== filterCategory) return false
    if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const grouped = filtered.reduce<Record<string, SOP[]>>((acc, sop) => {
    const cat = sop.category || 'General'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(sop)
    return acc
  }, {})

  // Match templates to SOPs by category keyword
  const getLinkedTemplates = (sop: SOP) => {
    const sopWords = [sop.title.toLowerCase(), sop.category.toLowerCase()]
    return templates.filter(t => {
      const tName = t.name.toLowerCase()
      const tType = t.type.toLowerCase()
      return sopWords.some(w => tName.includes(w) || tType.includes(w) || w.includes(tType))
        || tName.includes(sop.category.toLowerCase())
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#0077B6]" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-[#0077B6]" />
          <h1 className="text-2xl font-bold text-gray-900">SOPs & Checklists</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-200 rounded-lg p-1 mb-6 w-fit">
        {[
          { key: 'sops' as const, label: 'SOPs', icon: BookOpen },
          { key: 'checklists' as const, label: 'Templates', icon: ListChecks },
          { key: 'today' as const, label: "Today's Checklists", icon: Calendar },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ==================== SOPs TAB ==================== */}
      {tab === 'sops' && (
        <div>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text" placeholder="Search SOPs..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6]"
              />
            </div>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0077B6]/30">
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => setShowSopForm(true)}
              className="flex items-center gap-2 bg-[#0077B6] text-white px-4 py-2 rounded-lg hover:bg-[#005f8f] transition-colors whitespace-nowrap">
              <Plus className="w-4 h-4" /> New SOP
            </button>
          </div>

          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg">No SOPs found</p>
              <p className="text-sm mt-1">Create your first SOP to get started</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, items]) => (
                <div key={category}>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{category}</h2>
                  <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                    {items.map(sop => {
                      const linked = getLinkedTemplates(sop)
                      return (
                        <div key={sop.id}>
                          <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => setExpandedId(expandedId === sop.id ? null : sop.id)}>
                            {expandedId === sop.id
                              ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                              : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                            {sop.sop_format === 'blocks'
                              ? <Blocks className="w-4 h-4 text-[#0077B6] shrink-0" />
                              : <FileText className="w-4 h-4 text-[#0077B6] shrink-0" />}
                            <span className="font-medium text-gray-900 flex-1">{sop.title}</span>
                            {sop.sop_format === 'blocks' && (
                              <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">{sop.blocks?.length || 0} blocks</span>
                            )}
                            <div className="flex items-center gap-3">
                              {linked.length > 0 && (
                                <span className="flex items-center gap-1 text-xs text-[#0077B6]">
                                  <Link2 className="w-3.5 h-3.5" /> {linked.length} checklist{linked.length > 1 ? 's' : ''}
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <CheckCircle2 className="w-3.5 h-3.5" /> {sop.ack_count}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                sop.is_published ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                              }`}>
                                {sop.is_published ? 'Published' : 'Draft'}
                              </span>
                              <button onClick={e => { e.stopPropagation(); togglePublish(sop) }}
                                className="text-gray-400 hover:text-[#0077B6] transition-colors">
                                {sop.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          {expandedId === sop.id && (
                            <div className="px-12 pb-4 space-y-3">
                              {/* Block preview or legacy content */}
                              {sop.sop_format === 'blocks' && sop.blocks ? (
                                <div className="space-y-2">
                                  {sop.blocks.map((block, bi) => {
                                    const bMeta = SOP_BLOCK_META[block.block_type]
                                    return (
                                      <div key={block.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                        <span className="text-xs text-gray-400 w-5">{bi + 1}</span>
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${bMeta?.bg} ${bMeta?.color}`}>
                                          {bMeta?.label}
                                        </span>
                                        <span className="text-sm text-gray-700 flex-1">{block.label}</span>
                                        {!block.is_required && <span className="text-[10px] text-gray-400">optional</span>}
                                      </div>
                                    )
                                  })}
                                  <button onClick={() => runSopToday(sop.id)}
                                    className="flex items-center gap-1.5 text-sm text-[#0077B6] hover:text-[#005f8f] font-medium mt-2">
                                    <Play className="w-4 h-4" /> Run Today
                                  </button>
                                </div>
                              ) : (
                                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                  {sop.content}
                                </div>
                              )}
                              {sop.visible_to_roles?.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">Visible to:</span>
                                  {sop.visible_to_roles.map(r => (
                                    <span key={r} className="text-xs bg-blue-50 text-[#0077B6] px-2 py-0.5 rounded-full capitalize">{r}</span>
                                  ))}
                                </div>
                              )}
                              {/* Linked Checklists */}
                              {linked.length > 0 && (
                                <div className="border border-[#0077B6]/20 bg-[#0077B6]/5 rounded-lg p-3">
                                  <p className="text-xs font-semibold text-[#0077B6] mb-2 flex items-center gap-1.5">
                                    <ClipboardList className="w-3.5 h-3.5" /> Linked Checklists
                                  </p>
                                  <div className="space-y-2">
                                    {linked.map(t => (
                                      <div key={t.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-sm text-gray-900">{t.name}</span>
                                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${typeBadge(t.type)}`}>
                                            {t.type.replace('_', ' ')}
                                          </span>
                                          <span className="text-xs text-gray-400">{t.items.length} items</span>
                                        </div>
                                        <button onClick={() => createFromTemplate(t)}
                                          className="text-xs text-[#0077B6] hover:text-[#005f8f] font-medium">
                                          + Run Today
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== TEMPLATES TAB ==================== */}
      {tab === 'checklists' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowTemplateForm(true)}
              className="flex items-center gap-2 bg-[#0077B6] text-white px-4 py-2 rounded-lg hover:bg-[#005f8f] transition-colors">
              <Plus className="w-4 h-4" /> New Template
            </button>
          </div>
          {templates.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ListChecks className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No templates yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {templates.map(t => (
                <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{t.name}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${typeBadge(t.type)}`}>
                          {t.type.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-400 capitalize">{t.assigned_role}</span>
                        <span className="text-xs text-gray-400">{t.items.length} items</span>
                      </div>
                    </div>
                    <button onClick={() => createFromTemplate(t)}
                      className="flex items-center gap-1.5 text-sm text-[#0077B6] hover:text-[#005f8f] font-medium transition-colors">
                      <Plus className="w-4 h-4" /> Create for Today
                    </button>
                  </div>
                  {/* Show items preview */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {t.items.slice(0, 5).map((item, i) => (
                      <span key={i} className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded">
                        {item.label}
                      </span>
                    ))}
                    {t.items.length > 5 && (
                      <span className="text-xs text-gray-400 px-2 py-1">+{t.items.length - 5} more</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== TODAY TAB ==================== */}
      {tab === 'today' && (
        <div>
          {/* SOP Instances */}
          {sopInstances.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Blocks className="w-4 h-4" /> SOP Procedures
              </h2>
              <div className="space-y-3">
                {sopInstances.map(inst => {
                  const progress = inst.block_count > 0 ? Math.round((inst.completed_count / inst.block_count) * 100) : 0
                  const statusStyle = SOP_INSTANCE_STATUS_COLORS[inst.status] || SOP_INSTANCE_STATUS_COLORS.pending
                  return (
                    <a key={inst.id} href={`/restaurant/sops/${inst.id}`}
                      className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{inst.sop_title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusStyle.bg} ${statusStyle.text}`}>
                          {inst.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                        <div className="h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%`, backgroundColor: progress === 100 ? '#10b981' : '#0077B6' }} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{inst.completed_count}/{inst.block_count} blocks done</span>
                        <span>{progress}%</span>
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {/* Legacy Checklist Instances */}
          {instances.length === 0 && sopInstances.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg">No checklists or SOPs for today</p>
              <p className="text-sm mt-1 mb-4">Create one from a template or run an SOP</p>
              <button onClick={() => setTab('checklists')}
                className="text-[#0077B6] hover:text-[#005f8f] font-medium text-sm">
                Go to Templates <ChevronRight className="w-4 h-4 inline" />
              </button>
            </div>
          ) : instances.length > 0 ? (
            <div className="space-y-4">
              {instances.map(inst => {
                const progress = getProgress(inst.items)
                const isExpanded = expandedInstance === inst.id
                return (
                  <div key={inst.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedInstance(isExpanded ? null : inst.id)}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{inst.template_name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${typeBadge(inst.template_type || '')}`}>
                            {inst.template_type?.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-500">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%`, backgroundColor: progress === 100 ? '#10b981' : '#0077B6' }} />
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>{inst.items?.filter(i => i.is_completed).length}/{inst.items?.length} done</span>
                        <span className={`capitalize px-2 py-0.5 rounded-full ${
                          inst.status === 'completed' ? 'bg-green-50 text-green-700' :
                          inst.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>{inst.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                    {isExpanded && inst.items && (
                      <div className="border-t border-gray-100 px-4 py-3 space-y-1">
                        {inst.items.map(item => (
                          <div key={item.id} onClick={() => toggleItem(item)}
                            className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                            {item.is_completed
                              ? <CheckSquare className="w-5 h-5 text-[#0077B6] shrink-0" />
                              : <Square className="w-5 h-5 text-gray-300 shrink-0" />}
                            <span className={`text-sm ${item.is_completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                              {item.item_label}
                            </span>
                            {item.completed_at && (
                              <span className="text-xs text-gray-300 ml-auto">
                                {new Date(item.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      )}

      {/* ==================== SOP FORM MODAL ==================== */}
      {showSopForm && (
        <SOPFormModal onClose={() => setShowSopForm(false)} onCreated={fetchSOPs} />
      )}

      {/* ==================== TEMPLATE FORM MODAL ==================== */}
      {showTemplateForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold text-gray-900">New Checklist Template</h2>
              <button onClick={() => setShowTemplateForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={templateForm.name} onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6]"
                  placeholder="e.g. Kitchen Opening Checklist" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={templateForm.type} onChange={e => setTemplateForm({ ...templateForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0077B6]/30">
                    {CHECKLIST_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Role</label>
                  <select value={templateForm.assigned_role} onChange={e => setTemplateForm({ ...templateForm, assigned_role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0077B6]/30">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Checklist Items</label>
                <div className="space-y-2">
                  {templateForm.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input type="text" value={item}
                        onChange={e => {
                          const next = [...templateForm.items]; next[idx] = e.target.value
                          setTemplateForm({ ...templateForm, items: next })
                        }}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] text-sm"
                        placeholder={`Item ${idx + 1}`} />
                      {templateForm.items.length > 1 && (
                        <button onClick={() => setTemplateForm({ ...templateForm, items: templateForm.items.filter((_, i) => i !== idx) })}
                          className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => setTemplateForm({ ...templateForm, items: [...templateForm.items, ''] })}
                  className="mt-2 text-sm text-[#0077B6] hover:text-[#005f8f] font-medium">+ Add item</button>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t">
              <button onClick={() => setShowTemplateForm(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleCreateTemplate}
                disabled={saving || !templateForm.name.trim() || templateForm.items.filter(i => i.trim()).length === 0}
                className="flex items-center gap-2 bg-[#0077B6] text-white px-5 py-2 rounded-lg hover:bg-[#005f8f] disabled:opacity-50 transition-colors">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
