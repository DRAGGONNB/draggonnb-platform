import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function getRestaurantByToken(token: string) {
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data } = await supabase
    .from('restaurant_tables')
    .select('restaurant_id, restaurants(name, slug)')
    .eq('qr_token', token)
    .single()
  const restaurants = data?.restaurants as unknown as { name: string; slug: string } | null
  return restaurants
}

export default async function TableLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const restaurant = await getRestaurantByToken(token)

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      <div className="mx-auto max-w-md">
        {restaurant && (
          <header className="border-b border-stone-200 bg-white/80 px-4 py-3 text-center backdrop-blur-sm">
            <p className="text-xs font-medium tracking-widest text-[#0077B6] uppercase">
              {restaurant.name}
            </p>
          </header>
        )}
        <main>{children}</main>
        <footer className="px-4 py-6 text-center">
          <p className="text-xs text-stone-400">
            Powered by <span className="font-semibold text-stone-500">DraggonnB</span>
          </p>
        </footer>
      </div>
    </div>
  )
}
