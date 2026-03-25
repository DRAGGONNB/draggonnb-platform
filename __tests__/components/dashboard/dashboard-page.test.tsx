/** @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

// Mock getUserOrg
const getUserOrgMock = vi.fn()
vi.mock('@/lib/auth/get-user-org', () => ({
  getUserOrg: (...args: unknown[]) => getUserOrgMock(...args),
}))

// Mock createClient from supabase/server
const createClientMock = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}))

function createMockSupabase(tableResponses: Record<string, unknown>) {
  return {
    from: vi.fn((table: string) => {
      const response = tableResponses[table] || { data: null, count: 0 }
      const self: Record<string, any> = {
        select: vi.fn(() => self),
        eq: vi.fn(() => self),
        order: vi.fn(() => self),
        limit: vi.fn(() => self),
        gte: vi.fn(() => self),
        single: vi.fn(() => Promise.resolve(response)),
        then: (resolve: (v: unknown) => void) => Promise.resolve(response).then(resolve),
      }
      return self
    }),
  }
}

const mockUserOrg = {
  userId: 'user-1',
  email: 'test@test.co.za',
  fullName: 'Test User',
  organizationId: 'org-1',
  role: 'admin' as const,
  organization: {
    id: 'org-1',
    name: 'Test Org',
    subscription_tier: 'growth',
    subscription_status: 'active',
  },
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows error state when getUserOrg returns error', async () => {
    getUserOrgMock.mockResolvedValue({ data: null, error: 'Not authenticated' })

    const DashboardPage = (await import('@/app/(dashboard)/dashboard/page')).default
    const jsx = await DashboardPage()
    render(jsx)

    expect(screen.getByText('Unable to load dashboard')).toBeInTheDocument()
    expect(screen.getByText('Sign Out & Retry')).toBeInTheDocument()
  })

  it('shows specific message for User not found error', async () => {
    getUserOrgMock.mockResolvedValue({ data: null, error: 'User not found' })

    const DashboardPage = (await import('@/app/(dashboard)/dashboard/page')).default
    const jsx = await DashboardPage()
    render(jsx)

    expect(screen.getByText(/account setup is incomplete/)).toBeInTheDocument()
  })

  it('renders stat cards with dashboard data', async () => {
    getUserOrgMock.mockResolvedValue({ data: mockUserOrg, error: null })

    const mockSupabase = createMockSupabase({
      client_usage_metrics: { data: { posts_published: 12, ai_generations_count: 8 } },
      contacts: { data: null, count: 42 },
      deals: { data: [
        { value: 5000, stage: 'lead' },
        { value: 10000, stage: 'qualified' },
        { value: 7500, stage: 'won' },
      ] },
      social_posts: { data: [] },
    })
    createClientMock.mockResolvedValue(mockSupabase)

    const DashboardPage = (await import('@/app/(dashboard)/dashboard/page')).default
    const jsx = await DashboardPage()
    render(jsx)

    expect(screen.getByText('Total Contacts')).toBeInTheDocument()
    expect(screen.getByText('Active Deals')).toBeInTheDocument()
    // "Posts Published" appears in both stat card and usage section
    expect(screen.getAllByText('Posts Published')).toHaveLength(2)
    expect(screen.getByText('Content Generated')).toBeInTheDocument()
  })

  it('renders welcome message with user name', async () => {
    getUserOrgMock.mockResolvedValue({ data: mockUserOrg, error: null })

    const mockSupabase = createMockSupabase({
      client_usage_metrics: { data: null },
      contacts: { data: null, count: 0 },
      deals: { data: [] },
      social_posts: { data: [] },
    })
    createClientMock.mockResolvedValue(mockSupabase)

    const DashboardPage = (await import('@/app/(dashboard)/dashboard/page')).default
    const jsx = await DashboardPage()
    render(jsx)

    expect(screen.getByText(/Welcome back, Test/)).toBeInTheDocument()
  })

  it('renders Quick Actions section', async () => {
    getUserOrgMock.mockResolvedValue({ data: mockUserOrg, error: null })

    const mockSupabase = createMockSupabase({
      client_usage_metrics: { data: null },
      contacts: { data: null, count: 0 },
      deals: { data: [] },
      social_posts: { data: [] },
    })
    createClientMock.mockResolvedValue(mockSupabase)

    const DashboardPage = (await import('@/app/(dashboard)/dashboard/page')).default
    const jsx = await DashboardPage()
    render(jsx)

    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    // "New Contact" and "New Deal" appear in both welcome banner and quick actions
    expect(screen.getAllByText('New Contact').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('New Deal').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Send Email')).toBeInTheDocument()
  })

  it('renders Pipeline Summary with stage labels', async () => {
    getUserOrgMock.mockResolvedValue({ data: mockUserOrg, error: null })

    const mockSupabase = createMockSupabase({
      client_usage_metrics: { data: null },
      contacts: { data: null, count: 0 },
      deals: { data: [
        { value: 1000, stage: 'lead' },
        { value: 2000, stage: 'qualified' },
      ] },
      social_posts: { data: [] },
    })
    createClientMock.mockResolvedValue(mockSupabase)

    const DashboardPage = (await import('@/app/(dashboard)/dashboard/page')).default
    const jsx = await DashboardPage()
    render(jsx)

    expect(screen.getByText('Pipeline Summary')).toBeInTheDocument()
    expect(screen.getByText('Lead')).toBeInTheDocument()
    expect(screen.getByText('Qualified')).toBeInTheDocument()
    expect(screen.getByText('Proposal')).toBeInTheDocument()
  })

  it('renders Modules section with module names', async () => {
    getUserOrgMock.mockResolvedValue({ data: mockUserOrg, error: null })

    const mockSupabase = createMockSupabase({
      client_usage_metrics: { data: null },
      contacts: { data: null, count: 0 },
      deals: { data: [] },
      social_posts: { data: [] },
    })
    createClientMock.mockResolvedValue(mockSupabase)

    const DashboardPage = (await import('@/app/(dashboard)/dashboard/page')).default
    const jsx = await DashboardPage()
    render(jsx)

    expect(screen.getByText('Modules')).toBeInTheDocument()
    expect(screen.getByText('CRM')).toBeInTheDocument()
    expect(screen.getByText('Email Hub')).toBeInTheDocument()
    expect(screen.getByText('Content Studio')).toBeInTheDocument()
  })
})
