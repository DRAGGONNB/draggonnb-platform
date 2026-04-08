'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RESTAURANT_ID, ORG_ID, formatZAR } from '@/lib/restaurant/constants'
import {
  Loader2,
  Plus,
  X,
  Pencil,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  BookOpenText,
} from 'lucide-react'

interface Category {
  id: string
  name: string
  description: string | null
  sort_order: number
  is_active: boolean
}

interface MenuItem {
  id: string
  category_id: string
  name: string
  description: string | null
  price: number
  is_available: boolean
  dietary_tags: string[]
  sort_order: number
}

const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Pescatarian', 'Dairy-Free', 'Halal']

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCat, setExpandedCat] = useState<string | null>(null)

  // Category modal
  const [catModal, setCatModal] = useState<{ mode: 'create' | 'edit'; cat?: Category } | null>(null)
  const [catName, setCatName] = useState('')
  const [catDesc, setCatDesc] = useState('')

  // Item modal
  const [itemModal, setItemModal] = useState<{ mode: 'create' | 'edit'; item?: MenuItem; categoryId: string } | null>(null)
  const [itemName, setItemName] = useState('')
  const [itemDesc, setItemDesc] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [itemTags, setItemTags] = useState<string[]>([])

  const [submitting, setSubmitting] = useState(false)

  async function fetchAll() {
    const supabase = createClient()
    const [{ data: cats }, { data: menuItems }] = await Promise.all([
      supabase.from('restaurant_menu_categories').select('*').eq('restaurant_id', RESTAURANT_ID).order('sort_order'),
      supabase.from('restaurant_menu_items').select('*').order('sort_order'),
    ])
    setCategories(cats ?? [])
    setItems(menuItems ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  // Category CRUD
  function openCatCreate() {
    setCatName('')
    setCatDesc('')
    setCatModal({ mode: 'create' })
  }

  function openCatEdit(cat: Category) {
    setCatName(cat.name)
    setCatDesc(cat.description ?? '')
    setCatModal({ mode: 'edit', cat })
  }

  async function saveCat() {
    setSubmitting(true)
    const supabase = createClient()

    if (catModal?.mode === 'create') {
      await supabase.from('restaurant_menu_categories').insert({
        organization_id: ORG_ID,
        restaurant_id: RESTAURANT_ID,
        name: catName,
        description: catDesc || null,
        sort_order: categories.length + 1,
        is_active: true,
      })
    } else if (catModal?.cat) {
      await supabase.from('restaurant_menu_categories')
        .update({ name: catName, description: catDesc || null })
        .eq('id', catModal.cat.id)
    }

    setCatModal(null)
    setSubmitting(false)
    fetchAll()
  }

  async function toggleCat(cat: Category) {
    const supabase = createClient()
    await supabase.from('restaurant_menu_categories').update({ is_active: !cat.is_active }).eq('id', cat.id)
    fetchAll()
  }

  // Item CRUD
  function openItemCreate(categoryId: string) {
    setItemName('')
    setItemDesc('')
    setItemPrice('')
    setItemTags([])
    setItemModal({ mode: 'create', categoryId })
  }

  function openItemEdit(item: MenuItem) {
    setItemName(item.name)
    setItemDesc(item.description ?? '')
    setItemPrice(String(item.price))
    setItemTags(item.dietary_tags ?? [])
    setItemModal({ mode: 'edit', item, categoryId: item.category_id })
  }

  async function saveItem() {
    setSubmitting(true)
    const supabase = createClient()
    const data = {
      name: itemName,
      description: itemDesc || null,
      price: parseFloat(itemPrice),
      dietary_tags: itemTags,
    }

    if (itemModal?.mode === 'create') {
      const catItems = items.filter((i) => i.category_id === itemModal.categoryId)
      await supabase.from('restaurant_menu_items').insert({
        organization_id: ORG_ID,
        category_id: itemModal.categoryId,
        ...data,
        is_available: true,
        sort_order: catItems.length + 1,
      })
    } else if (itemModal?.item) {
      await supabase.from('restaurant_menu_items').update(data).eq('id', itemModal.item.id)
    }

    setItemModal(null)
    setSubmitting(false)
    fetchAll()
  }

  async function toggleItem(item: MenuItem) {
    const supabase = createClient()
    await supabase.from('restaurant_menu_items').update({ is_available: !item.is_available }).eq('id', item.id)
    fetchAll()
  }

  function toggleTag(tag: string) {
    setItemTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0077B6]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu</h1>
          <p className="text-sm text-gray-500 mt-1">{categories.length} categories, {items.length} items</p>
        </div>
        <button
          onClick={openCatCreate}
          className="flex items-center gap-2 rounded-lg bg-[#0077B6] px-4 py-2 text-sm font-medium text-white hover:bg-[#006399]"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <BookOpenText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No menu categories yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => {
            const catItems = items.filter((i) => i.category_id === cat.id)
            const isExpanded = expandedCat === cat.id

            return (
              <div key={cat.id} className={`bg-white rounded-xl border ${cat.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
                <button
                  onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-900">{cat.name}</span>
                    <span className="text-xs text-gray-400">{catItems.length} items</span>
                    {!cat.is_active && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">Hidden</span>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {/* Category actions */}
                    <div className="px-5 py-2 flex items-center gap-2 border-b border-gray-50">
                      <button onClick={() => openCatEdit(cat)} className="text-xs text-[#0077B6] hover:underline flex items-center gap-1">
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button onClick={() => toggleCat(cat)} className="text-xs text-gray-500 hover:underline flex items-center gap-1">
                        {cat.is_active ? <><EyeOff className="w-3 h-3" /> Hide</> : <><Eye className="w-3 h-3" /> Show</>}
                      </button>
                      <div className="flex-1" />
                      <button
                        onClick={() => openItemCreate(cat.id)}
                        className="flex items-center gap-1 text-xs font-medium text-[#0077B6] hover:text-[#006399]"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Item
                      </button>
                    </div>

                    {/* Items */}
                    <div className="divide-y divide-gray-50">
                      {catItems.length === 0 ? (
                        <p className="px-5 py-4 text-xs text-gray-400">No items in this category</p>
                      ) : (
                        catItems.map((item) => (
                          <div key={item.id} className={`px-5 py-3 flex items-center justify-between ${!item.is_available ? 'opacity-50' : ''}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                                {item.dietary_tags?.length > 0 && (
                                  <div className="flex gap-1">
                                    {item.dietary_tags.map((t) => (
                                      <span key={t} className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600">{t}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {item.description && <p className="text-xs text-gray-400 truncate mt-0.5">{item.description}</p>}
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-3">
                              <span className="text-sm font-semibold text-gray-700">{formatZAR(item.price)}</span>
                              <button onClick={() => openItemEdit(item)} className="p-1 rounded hover:bg-gray-100">
                                <Pencil className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                              <button
                                onClick={() => toggleItem(item)}
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  item.is_available ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                }`}
                              >
                                {item.is_available ? 'Available' : '86\'d'}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Category Modal */}
      {catModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">{catModal.mode === 'create' ? 'New Category' : 'Edit Category'}</h2>
              <button onClick={() => setCatModal(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input value={catName} onChange={(e) => setCatName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                <input value={catDesc} onChange={(e) => setCatDesc(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setCatModal(null)} className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={saveCat} disabled={!catName || submitting} className="flex-1 rounded-lg bg-[#0077B6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#006399] disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {itemModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">{itemModal.mode === 'create' ? 'New Menu Item' : 'Edit Menu Item'}</h2>
              <button onClick={() => setItemModal(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input value={itemName} onChange={(e) => setItemName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (ZAR)</label>
                <input type="number" step="0.01" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0077B6]/30 focus:border-[#0077B6] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dietary Tags</label>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_OPTIONS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        itemTags.includes(tag) ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setItemModal(null)} className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={saveItem} disabled={!itemName || !itemPrice || submitting} className="flex-1 rounded-lg bg-[#0077B6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#006399] disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
