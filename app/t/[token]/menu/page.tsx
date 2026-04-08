import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_available: boolean
  dietary_tags: string[] | null
  sort_order: number
}

interface MenuCategory {
  id: string
  name: string
  description: string | null
  sort_order: number
  restaurant_menu_items: MenuItem[]
}

const dietaryColors: Record<string, { bg: string; text: string }> = {
  vegetarian: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  vegan: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'gluten-free': { bg: 'bg-amber-100', text: 'text-amber-700' },
  pescatarian: { bg: 'bg-sky-100', text: 'text-sky-700' },
}

function formatPrice(price: number): string {
  return `R ${price.toFixed(2)}`
}

async function getRestaurantIdByToken(token: string): Promise<string | null> {
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data } = await supabase
    .from('restaurant_tables')
    .select('restaurant_id')
    .eq('qr_token', token)
    .single()
  return data?.restaurant_id ?? null
}

async function getMenu(restaurantId: string): Promise<MenuCategory[]> {
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data } = await supabase
    .from('restaurant_menu_categories')
    .select(
      `
      id, name, description, sort_order,
      restaurant_menu_items(id, name, description, price, image_url, is_available, dietary_tags, sort_order)
    `
    )
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (!data) return []

  return (data as unknown as MenuCategory[]).map((cat) => ({
    ...cat,
    restaurant_menu_items: cat.restaurant_menu_items
      .filter((item) => item.is_available)
      .sort((a, b) => a.sort_order - b.sort_order),
  }))
}

export default async function MenuPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const restaurantId = await getRestaurantIdByToken(token)

  if (!restaurantId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-semibold text-stone-800">Menu Unavailable</h1>
        <p className="mt-2 text-sm text-stone-500">We could not load the menu for this table.</p>
      </div>
    )
  }

  const categories = await getMenu(restaurantId)

  return (
    <div className="pb-8">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <Link
            href={`/t/${token}`}
            className="flex items-center gap-1 text-sm font-medium text-[#0077B6]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Back
          </Link>
          <h1 className="text-lg font-bold text-stone-900">Menu</h1>
          <div className="w-12" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Category Quick Nav */}
      {categories.length > 1 && (
        <div className="sticky top-[53px] z-10 border-b border-stone-100 bg-white/90 backdrop-blur-sm">
          <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide">
            {categories.map((cat) => (
              <a
                key={cat.id}
                href={`#cat-${cat.id}`}
                className="shrink-0 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600 transition-colors hover:bg-[#0077B6]/10 hover:text-[#0077B6]"
              >
                {cat.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Menu Sections */}
      {categories.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <p className="text-stone-500">The menu is being updated. Please check back shortly.</p>
        </div>
      ) : (
        <div className="space-y-6 pt-4">
          {categories.map((category) => (
            <section key={category.id} id={`cat-${category.id}`} className="scroll-mt-28">
              {/* Category Header */}
              <div className="sticky top-[95px] z-[5] border-b border-stone-100 bg-stone-50/95 px-4 py-3 backdrop-blur-sm">
                <h2 className="text-lg font-bold text-stone-900">{category.name}</h2>
                {category.description && (
                  <p className="mt-0.5 text-xs text-stone-500">{category.description}</p>
                )}
              </div>

              {/* Items */}
              <div className="space-y-1 px-4 pt-2">
                {category.restaurant_menu_items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-stone-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-stone-900">{item.name}</h3>
                        {item.description && (
                          <p className="mt-1 text-sm leading-relaxed text-stone-500">
                            {item.description}
                          </p>
                        )}
                        {/* Dietary Tags */}
                        {item.dietary_tags && item.dietary_tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.dietary_tags.map((tag) => {
                              const colors = dietaryColors[tag.toLowerCase()] ?? {
                                bg: 'bg-stone-100',
                                text: 'text-stone-600',
                              }
                              return (
                                <span
                                  key={tag}
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${colors.bg} ${colors.text}`}
                                >
                                  {tag}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      <p className="shrink-0 text-base font-bold text-[#0077B6]">
                        {formatPrice(item.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
