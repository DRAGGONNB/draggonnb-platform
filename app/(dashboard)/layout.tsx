export const dynamic = 'force-dynamic'

import { Sidebar } from '@/components/dashboard/Sidebar'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { createClient } from '@/lib/supabase/server'
import { getUserOrg } from '@/lib/auth/get-user-org'

async function getUsageStats(organizationId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('client_usage_metrics')
    .select('posts_published, ai_generations_count')
    .eq('organization_id', organizationId)
    .order('metric_date', { ascending: false })
    .limit(1)
    .single()

  return {
    postsUsed: data?.posts_published || 0,
    postsLimit: 30,
    aiGenerationsUsed: data?.ai_generations_count || 0,
    aiGenerationsLimit: 50,
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: userOrg } = await getUserOrg()
  const usageStats = userOrg ? await getUsageStats(userOrg.organizationId) : undefined

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar usageStats={usageStats} />

      {/* Header */}
      <DashboardHeader />

      {/* Main Content */}
      <main className="ml-64 mt-18 px-8 py-12">
        {children}
      </main>
    </div>
  )
}
