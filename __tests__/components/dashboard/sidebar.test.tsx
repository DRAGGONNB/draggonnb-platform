/** @vitest-environment jsdom */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Sidebar } from '@/components/dashboard/Sidebar'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}))

describe('Sidebar', () => {
  it('renders the DraggonnB logo text', () => {
    render(<Sidebar />)
    // Logo text is split: "DRAGONN" + "NB" + "OS" across spans
    expect(screen.getByText('NB')).toBeInTheDocument()
    expect(screen.getByText('OS')).toBeInTheDocument()
  })

  it('renders Main navigation items', () => {
    render(<Sidebar />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Autopilot')).toBeInTheDocument()
    expect(screen.getByText('CRM')).toBeInTheDocument()
    expect(screen.getByText('Email Hub')).toBeInTheDocument()
  })

  it('renders Email Marketing section with items', () => {
    render(<Sidebar />)
    expect(screen.getByText('Email Marketing')).toBeInTheDocument()
    expect(screen.getByText('Campaigns')).toBeInTheDocument()
    expect(screen.getByText('Sequences')).toBeInTheDocument()
    expect(screen.getByText('Templates')).toBeInTheDocument()
    expect(screen.getByText('Outreach')).toBeInTheDocument()
    // Analytics appears in both Main nav and Email Marketing
    expect(screen.getAllByText('Analytics')).toHaveLength(2)
  })

  it('renders Content Studio section', () => {
    render(<Sidebar />)
    // "Content Studio" appears in both section header and nav item
    expect(screen.getAllByText('Content Studio').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Email Content')).toBeInTheDocument()
    expect(screen.getByText('Social Content')).toBeInTheDocument()
  })

  it('renders Accommodation section', () => {
    render(<Sidebar />)
    expect(screen.getByText('Accommodation')).toBeInTheDocument()
    expect(screen.getByText('Properties')).toBeInTheDocument()
    expect(screen.getByText('Inquiries')).toBeInTheDocument()
    expect(screen.getByText('Guests')).toBeInTheDocument()
  })

  it('renders correct navigation hrefs', () => {
    render(<Sidebar />)
    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/dashboard')
    expect(screen.getByText('CRM').closest('a')).toHaveAttribute('href', '/crm')
    expect(screen.getByText('Campaigns').closest('a')).toHaveAttribute('href', '/email/campaigns')
    expect(screen.getByText('Properties').closest('a')).toHaveAttribute('href', '/accommodation/properties')
  })

  it('renders NEW badges on multiple sections', () => {
    render(<Sidebar />)
    const badges = screen.getAllByText('NEW')
    // Analytics, Lead Scoring, Social Media, Accommodation Overview, Elijah, Integrations
    expect(badges).toHaveLength(6)
  })

  it('renders usage progress bars with default values', () => {
    render(<Sidebar />)
    expect(screen.getByText('Posts This Month')).toBeInTheDocument()
    expect(screen.getByText('AI Generations')).toBeInTheDocument()
    expect(screen.getByText('23 / 30')).toBeInTheDocument()
    expect(screen.getByText('45 / 50')).toBeInTheDocument()
  })

  it('renders usage stats when provided', () => {
    render(
      <Sidebar
        usageStats={{
          postsUsed: 10,
          postsLimit: 100,
          aiGenerationsUsed: 25,
          aiGenerationsLimit: 200,
        }}
      />
    )
    expect(screen.getByText('10 / 100')).toBeInTheDocument()
    expect(screen.getByText('25 / 200')).toBeInTheDocument()
  })

  it('renders Upgrade Plan link', () => {
    render(<Sidebar />)
    expect(screen.getByText('Upgrade Plan')).toBeInTheDocument()
    expect(screen.getByText('Upgrade Plan').closest('a')).toHaveAttribute('href', '/pricing')
  })
})
