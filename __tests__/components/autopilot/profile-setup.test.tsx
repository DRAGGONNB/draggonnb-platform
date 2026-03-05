/** @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProfileSetup } from '@/components/autopilot/ProfileSetup'
import { mockFetch } from '@/__tests__/helpers/component-test-utils'

describe('ProfileSetup', () => {
  const onComplete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the setup heading', () => {
    render(<ProfileSetup onComplete={onComplete} />)
    expect(screen.getByText('Set Up Your Business Autopilot')).toBeInTheDocument()
  })

  it('renders Business Identity section with required fields', () => {
    render(<ProfileSetup onComplete={onComplete} />)
    expect(screen.getByLabelText('Business Name *')).toBeInTheDocument()
    expect(screen.getByLabelText('Industry *')).toBeInTheDocument()
    expect(screen.getByLabelText('Target Market *')).toBeInTheDocument()
  })

  it('renders Brand Voice section', () => {
    render(<ProfileSetup onComplete={onComplete} />)
    expect(screen.getByText('Brand Voice')).toBeInTheDocument()
    expect(screen.getByLabelText('Tone')).toBeInTheDocument()
    expect(screen.getByLabelText('Tagline')).toBeInTheDocument()
  })

  it('renders platform toggle buttons', () => {
    render(<ProfileSetup onComplete={onComplete} />)
    expect(screen.getByText('LinkedIn')).toBeInTheDocument()
    expect(screen.getByText('Facebook')).toBeInTheDocument()
    expect(screen.getByText('Instagram')).toBeInTheDocument()
    expect(screen.getByText('Twitter/X')).toBeInTheDocument()
  })

  it('renders email campaign goal toggles', () => {
    render(<ProfileSetup onComplete={onComplete} />)
    expect(screen.getByText('Newsletter')).toBeInTheDocument()
    expect(screen.getByText('Promotion')).toBeInTheDocument()
    expect(screen.getByText('Follow Up')).toBeInTheDocument()
  })

  it('renders submit button with correct text', () => {
    render(<ProfileSetup onComplete={onComplete} />)
    expect(screen.getByText('Save & Activate Autopilot')).toBeInTheDocument()
  })

  it('renders industry dropdown with all options', () => {
    render(<ProfileSetup onComplete={onComplete} />)
    const industrySelect = screen.getByLabelText('Industry *') as HTMLSelectElement
    expect(industrySelect).toBeInTheDocument()
    // Check some industries exist
    expect(screen.getByText('Technology')).toBeInTheDocument()
    expect(screen.getByText('Healthcare')).toBeInTheDocument()
    expect(screen.getByText('Hospitality')).toBeInTheDocument()
  })

  it('calls onComplete after successful form submission', async () => {
    mockFetch({
      '/api/autopilot/profile': { success: true },
    })

    render(<ProfileSetup onComplete={onComplete} />)

    // Fill required fields
    fireEvent.change(screen.getByLabelText('Business Name *'), { target: { value: 'Test Corp' } })
    fireEvent.change(screen.getByLabelText('Industry *'), { target: { value: 'technology' } })
    fireEvent.change(screen.getByLabelText('Target Market *'), { target: { value: 'SMEs in SA' } })

    // Submit
    fireEvent.click(screen.getByText('Save & Activate Autopilot'))

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled()
    })
  })

  it('shows error message on failed submission', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: 'Profile save failed' }),
    })))

    render(<ProfileSetup onComplete={onComplete} />)

    // Fill required fields
    fireEvent.change(screen.getByLabelText('Business Name *'), { target: { value: 'Test' } })
    fireEvent.change(screen.getByLabelText('Industry *'), { target: { value: 'technology' } })
    fireEvent.change(screen.getByLabelText('Target Market *'), { target: { value: 'Test' } })

    fireEvent.click(screen.getByText('Save & Activate Autopilot'))

    await waitFor(() => {
      expect(screen.getByText('Profile save failed')).toBeInTheDocument()
    })
  })
})
