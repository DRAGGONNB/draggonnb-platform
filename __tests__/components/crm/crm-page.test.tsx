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

// Mock CRMPipelineChart since recharts does not render in jsdom
vi.mock('@/components/crm/CRMPipelineChart', () => ({
  CRMPipelineChart: ({ stageData }: { stageData: { stage: string; count: number }[] }) => (
    <div data-testid="pipeline-chart">Pipeline: {stageData.length} stages</div>
  ),
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

describe('CRMPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows error state when getUserOrg returns error', async () => {
    getUserOrgMock.mockResolvedValue({ data: null, error: 'Not authenticated' })

    const CRMPage = (await import('@/app/(dashboard)/crm/page')).default
    const jsx = await CRMPage()
    render(jsx)

    expect(screen.getByText('Unable to load CRM')).toBeInTheDocument()
    expect(screen.getByText('Sign Out & Retry')).toBeInTheDocument()
  })

  it('renders CRM Overview heading and stat cards', async () => {
    getUserOrgMock.mockResolvedValue({ data: mockUserOrg, error: null })

    const mockSupabase = createMockSupabase({
      contacts: { data: null, count: 25 },
      companies: { data: null, count: 8 },
      deals: { data: [
        { id: 'd1', name: 'Deal A', value: 5000, stage: 'lead', probability: 20, created_at: '2026-03-01' },
        { id: 'd2', name: 'Deal B', value: 10000, stage: 'qualified', probability: 50, created_at: '2026-03-02' },
        { id: 'd3', name: 'Deal C', value: 7500, stage: 'won', probability: 100, created_at: '2026-02-15' },
      ] },
    })
    createClientMock.mockResolvedValue(mockSupabase)

    const CRMPage = (await import('@/app/(dashboard)/crm/page')).default
    const jsx = await CRMPage()
    render(jsx)

    expect(screen.getByText('CRM Overview')).toBeInTheDocument()
    expect(screen.getByText('Total Contacts')).toBeInTheDocument()
    expect(screen.getByText('Companies')).toBeInTheDocument()
    expect(screen.getByText('Active Deals')).toBeInTheDocument()
  })

  it('renders Recent Contacts and Recent Deals sections', async () => {
    getUserOrgMock.mockResolvedValue({ data: mockUserOrg, error: null })

    const mockSupabase = createMockSupabase({
      contacts: { data: null, count: 5 },
      companies: { data: null, count: 2 },
      deals: { data: [] },
    })
    createClientMock.mockResolvedValue(mockSupabase)

    const CRMPage = (await import('@/app/(dashboard)/crm/page')).default
    const jsx = await CRMPage()
    render(jsx)

    expect(screen.getByText('Recent Contacts')).toBeInTheDocument()
    expect(screen.getByText('Recent Deals')).toBeInTheDocument()
  })

  it('renders pipeline chart component', async () => {
    getUserOrgMock.mockResolvedValue({ data: mockUserOrg, error: null })

    const mockSupabase = createMockSupabase({
      contacts: { data: null, count: 0 },
      companies: { data: null, count: 0 },
      deals: { data: [] },
    })
    createClientMock.mockResolvedValue(mockSupabase)

    const CRMPage = (await import('@/app/(dashboard)/crm/page')).default
    const jsx = await CRMPage()
    render(jsx)

    expect(screen.getByTestId('pipeline-chart')).toBeInTheDocument()
  })

  it('renders empty state when no contacts exist', async () => {
    getUserOrgMock.mockResolvedValue({ data: mockUserOrg, error: null })

    const mockSupabase = createMockSupabase({
      contacts: { data: null, count: 0 },
      companies: { data: null, count: 0 },
      deals: { data: [] },
    })
    createClientMock.mockResolvedValue(mockSupabase)

    const CRMPage = (await import('@/app/(dashboard)/crm/page')).default
    const jsx = await CRMPage()
    render(jsx)

    expect(screen.getByText('No contacts yet')).toBeInTheDocument()
    expect(screen.getByText('No deals yet')).toBeInTheDocument()
  })

  it('renders Add Contact and New Deal buttons', async () => {
    getUserOrgMock.mockResolvedValue({ data: mockUserOrg, error: null })

    const mockSupabase = createMockSupabase({
      contacts: { data: null, count: 0 },
      companies: { data: null, count: 0 },
      deals: { data: [] },
    })
    createClientMock.mockResolvedValue(mockSupabase)

    const CRMPage = (await import('@/app/(dashboard)/crm/page')).default
    const jsx = await CRMPage()
    render(jsx)

    expect(screen.getByText('Add Contact')).toBeInTheDocument()
    expect(screen.getByText('New Deal')).toBeInTheDocument()
  })
})
