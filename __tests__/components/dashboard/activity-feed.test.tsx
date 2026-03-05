/** @vitest-environment jsdom */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'

describe('ActivityFeed', () => {
  it('renders empty state when no activities provided', () => {
    render(<ActivityFeed />)
    expect(screen.getByText('No activity yet')).toBeInTheDocument()
    expect(screen.getByText('Team actions will appear here')).toBeInTheDocument()
  })

  it('renders empty state when activities array is empty', () => {
    render(<ActivityFeed activities={[]} />)
    expect(screen.getByText('No activity yet')).toBeInTheDocument()
  })

  it('renders activity list with user names and actions', () => {
    const activities = [
      { id: '1', user: 'John Doe', initials: 'JD', action: 'created a new contact', timestamp: '2 min ago' },
      { id: '2', user: 'Jane Smith', initials: 'JS', action: 'closed a deal', timestamp: '5 min ago' },
    ]

    render(<ActivityFeed activities={activities} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('created a new contact')).toBeInTheDocument()
    expect(screen.getByText('2 min ago')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('closed a deal')).toBeInTheDocument()
  })

  it('renders initials in avatar circles', () => {
    const activities = [
      { id: '1', user: 'John Doe', initials: 'JD', action: 'test', timestamp: 'now' },
    ]

    render(<ActivityFeed activities={activities} />)
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('renders timestamps for each activity', () => {
    const activities = [
      { id: '1', user: 'User', initials: 'U', action: 'did something', timestamp: '3 hours ago' },
    ]

    render(<ActivityFeed activities={activities} />)
    expect(screen.getByText('3 hours ago')).toBeInTheDocument()
  })
})
