/** @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { mockFetch } from '@/__tests__/helpers/component-test-utils'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/autopilot',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock sub-components that fetch their own data
vi.mock('@/components/autopilot/CalendarGrid', () => ({
  CalendarGrid: ({ entries }: { entries: unknown[] }) => (
    <div data-testid="calendar-grid">Calendar ({entries.length} entries)</div>
  ),
}))

vi.mock('@/components/autopilot/WeekSelector', () => ({
  WeekSelector: ({ week }: { week: string }) => <div data-testid="week-selector">Week: {week}</div>,
  getISOWeek: () => '2026-W10',
}))

vi.mock('@/components/autopilot/ChatPanel', () => ({
  ChatPanel: () => <div data-testid="chat-panel" />,
}))

describe('AutopilotPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows loading spinner on initial render', async () => {
    // Delay profile response to keep loading state
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))

    const AutopilotPage = (await import('@/app/(dashboard)/autopilot/page')).default
    render(<AutopilotPage />)

    // Should show spinner during loading
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows ProfileSetup when no profile exists', async () => {
    mockFetch({
      '/api/autopilot/profile': { profile: null },
    })

    const AutopilotPage = (await import('@/app/(dashboard)/autopilot/page')).default
    render(<AutopilotPage />)

    await waitFor(() => {
      expect(screen.getByText('Set Up Your Business Autopilot')).toBeInTheDocument()
    })
  })

  it('shows Business Autopilot heading when profile exists', async () => {
    mockFetch({
      '/api/autopilot/profile': { profile: { business_name: 'Test Biz', industry: 'tech' } },
      '/api/autopilot/generate': { entries: [] },
    })

    const AutopilotPage = (await import('@/app/(dashboard)/autopilot/page')).default
    render(<AutopilotPage />)

    await waitFor(() => {
      expect(screen.getByText('Business Autopilot')).toBeInTheDocument()
    })
  })

  it('shows Generate This Week button when profile exists', async () => {
    mockFetch({
      '/api/autopilot/profile': { profile: { business_name: 'Test Biz' } },
      '/api/autopilot/generate': { entries: [] },
    })

    const AutopilotPage = (await import('@/app/(dashboard)/autopilot/page')).default
    render(<AutopilotPage />)

    await waitFor(() => {
      expect(screen.getByText('Generate This Week')).toBeInTheDocument()
    })
  })

  it('NEVER shows "User not found" text (regression test)', async () => {
    // Test with profile
    mockFetch({
      '/api/autopilot/profile': { profile: { business_name: 'Test' } },
      '/api/autopilot/generate': { entries: [] },
    })

    const AutopilotPage = (await import('@/app/(dashboard)/autopilot/page')).default
    const { container } = render(<AutopilotPage />)

    await waitFor(() => {
      expect(screen.getByText('Business Autopilot')).toBeInTheDocument()
    })

    expect(container.textContent).not.toContain('User not found')
  })

  it('NEVER shows "User not found" when profile fetch fails (regression test)', async () => {
    mockFetch({
      '/api/autopilot/profile': { profile: null },
    })

    const AutopilotPage = (await import('@/app/(dashboard)/autopilot/page')).default
    const { container } = render(<AutopilotPage />)

    await waitFor(() => {
      expect(screen.getByText('Set Up Your Business Autopilot')).toBeInTheDocument()
    })

    expect(container.textContent).not.toContain('User not found')
  })

  it('renders Settings and Chat buttons when profile exists', async () => {
    mockFetch({
      '/api/autopilot/profile': { profile: { business_name: 'Test' } },
      '/api/autopilot/generate': { entries: [] },
    })

    const AutopilotPage = (await import('@/app/(dashboard)/autopilot/page')).default
    render(<AutopilotPage />)

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByText('Chat')).toBeInTheDocument()
    })
  })
})
