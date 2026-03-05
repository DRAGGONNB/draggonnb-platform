/** @vitest-environment jsdom */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CRMPipelineChart } from '@/components/crm/CRMPipelineChart'

const mockStageData = [
  { stage: 'Lead', count: 5, value: 50000 },
  { stage: 'Qualified', count: 3, value: 30000 },
  { stage: 'Proposal', count: 2, value: 25000 },
  { stage: 'Negotiation', count: 1, value: 15000 },
  { stage: 'Won', count: 4, value: 100000 },
  { stage: 'Lost', count: 2, value: 20000 },
]

const emptyStageData = [
  { stage: 'Lead', count: 0, value: 0 },
  { stage: 'Qualified', count: 0, value: 0 },
  { stage: 'Proposal', count: 0, value: 0 },
  { stage: 'Negotiation', count: 0, value: 0 },
  { stage: 'Won', count: 0, value: 0 },
  { stage: 'Lost', count: 0, value: 0 },
]

describe('CRMPipelineChart', () => {
  it('renders "Pipeline Overview" card title', () => {
    render(<CRMPipelineChart stageData={mockStageData} />)
    expect(screen.getByText('Pipeline Overview')).toBeInTheDocument()
  })

  it('renders chart container when data has non-zero counts', () => {
    const { container } = render(<CRMPipelineChart stageData={mockStageData} />)
    // recharts renders inside a ResponsiveContainer with a div wrapper
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
  })

  it('renders empty state when all counts are zero', () => {
    render(<CRMPipelineChart stageData={emptyStageData} />)
    expect(screen.getByText('No pipeline data yet')).toBeInTheDocument()
    expect(screen.getByText('Create deals to see your pipeline visualized here')).toBeInTheDocument()
  })

  it('does not crash with empty stageData array', () => {
    render(<CRMPipelineChart stageData={[]} />)
    expect(screen.getByText('Pipeline Overview')).toBeInTheDocument()
    expect(screen.getByText('No pipeline data yet')).toBeInTheDocument()
  })
})
