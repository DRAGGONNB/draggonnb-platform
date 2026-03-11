'use client'

import { useEffect, useState } from 'react'
import { Share2, Sparkles, Loader2 } from 'lucide-react'
import { ConnectedAccountCard } from '@/components/social/ConnectedAccountCard'
import { ConnectAccountDropdown } from '@/components/social/ConnectAccountButton'
import type { SocialAccount } from '@/lib/social/types'

/**
 * Embed Social Page
 *
 * Renders the social accounts management and content generator UI
 * in a minimal layout suitable for iframe embedding by vertical
 * clients (e.g., FIGARIE). No dashboard sidebar/header.
 *
 * Accessed at /embed/social (route group removes (embed) prefix).
 */
export default function EmbedSocialPage() {
  const [activeTab, setActiveTab] = useState<'accounts' | 'content'>('accounts')
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/social/accounts')
      if (!res.ok) throw new Error('Failed to fetch accounts')
      const data = await res.json()
      setAccounts(data.accounts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async (id: string) => {
    const res = await fetch(`/api/social/accounts/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to disconnect')
    setAccounts(accounts.filter((a) => a.id !== id))
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Social Media</h1>

      {/* Tab navigation */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'accounts'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Connected Accounts
          </span>
        </button>
        <button
          onClick={() => setActiveTab('content')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'content'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Content Generator
          </span>
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">
              Manage your connected social media accounts.
            </p>
            <ConnectAccountDropdown />
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Share2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No accounts connected</p>
              <p className="text-sm mt-1">
                Connect your social media accounts to start publishing content.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <ConnectedAccountCard
                  key={account.id}
                  account={account}
                  onDisconnect={handleDisconnect}
                />
              ))}
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">
              Supported Platforms
            </h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>
                <strong>Facebook</strong> - Publish to Pages (requires Page
                admin access)
              </li>
              <li>
                <strong>Instagram</strong> - Publish to Business/Creator
                accounts (via Facebook)
              </li>
              <li>
                <strong>LinkedIn</strong> - Publish to personal profiles and
                company pages
              </li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'content' && (
        <div className="space-y-4">
          <p className="text-gray-500 text-sm">
            Generate and schedule social media content with AI.
          </p>
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-blue-600 opacity-50" />
            <p className="font-medium text-gray-900">
              Social Content Generator
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Open the full content generator to create platform-optimized
              social media posts with AI.
            </p>
            <a
              href="/content-generator/social"
              target="_top"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Open Content Generator
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
