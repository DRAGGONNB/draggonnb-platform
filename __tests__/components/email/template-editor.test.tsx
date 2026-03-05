/** @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

// Track registerCallback calls
const registerCallbackMock = vi.fn()
const exportHtmlMock = vi.fn()
const loadDesignMock = vi.fn()

// Mock next/dynamic to synchronously load the component
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<unknown>, _options?: unknown) => {
    // Return a component that synchronously renders the loaded module
    let LoadedComponent: React.ComponentType<Record<string, unknown>> | null = null

    // Kick off loading
    loader().then((mod: unknown) => {
      const m = mod as { default?: React.ComponentType<Record<string, unknown>> }
      LoadedComponent = m.default || (m as unknown as React.ComponentType<Record<string, unknown>>)
    })

    return React.forwardRef(function DynamicWrapper(
      props: Record<string, unknown>,
      ref: React.Ref<unknown>
    ) {
      const [, forceRender] = React.useState(0)

      React.useEffect(() => {
        // Re-render once module is loaded
        const timer = setTimeout(() => forceRender((c) => c + 1), 0)
        return () => clearTimeout(timer)
      }, [])

      if (!LoadedComponent) {
        return <div>Loading editor...</div>
      }

      return <LoadedComponent ref={ref} {...props} />
    })
  },
}))

// Mock react-email-editor
vi.mock('react-email-editor', () => {
  const MockEmailEditor = React.forwardRef(function MockEmailEditor(
    props: { onLoad?: () => void; [key: string]: unknown },
    ref: React.Ref<unknown>
  ) {
    React.useImperativeHandle(ref, () => ({
      exportHtml: exportHtmlMock,
      registerCallback: registerCallbackMock,
      loadDesign: loadDesignMock,
    }))

    React.useEffect(() => {
      if (props.onLoad) props.onLoad()
    }, [props.onLoad])

    return <div data-testid="email-editor">Mock Email Editor</div>
  })

  return { default: MockEmailEditor }
})

describe('TemplateEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders template metadata form fields', async () => {
    const { TemplateEditor } = await import('@/components/email/TemplateEditor')
    render(<TemplateEditor onSave={vi.fn()} />)

    expect(screen.getByLabelText('Template Name *')).toBeInTheDocument()
    expect(screen.getByLabelText('Email Subject *')).toBeInTheDocument()
    // Category uses shadcn Select (not native), check by text content
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByLabelText('Description (Optional)')).toBeInTheDocument()
  })

  it('renders Save Template button', async () => {
    const { TemplateEditor } = await import('@/components/email/TemplateEditor')
    render(<TemplateEditor onSave={vi.fn()} />)

    expect(screen.getByText('Save Template')).toBeInTheDocument()
  })

  it('shows correct title for new template', async () => {
    const { TemplateEditor } = await import('@/components/email/TemplateEditor')
    render(<TemplateEditor onSave={vi.fn()} />)

    expect(screen.getByText('Create New Template')).toBeInTheDocument()
  })

  it('shows correct title for existing template', async () => {
    const { TemplateEditor } = await import('@/components/email/TemplateEditor')
    render(<TemplateEditor templateId="existing-123" onSave={vi.fn()} />)

    expect(screen.getByText('Edit Template')).toBeInTheDocument()
  })

  it('registers image upload callback on editor load (drag-drop fix)', async () => {
    const { TemplateEditor } = await import('@/components/email/TemplateEditor')
    render(<TemplateEditor onSave={vi.fn()} />)

    // Wait for dynamic import to resolve and onLoad to fire
    await waitFor(() => {
      expect(registerCallbackMock).toHaveBeenCalledWith('image', expect.any(Function))
    }, { timeout: 3000 })
  })

  it('renders merge tag documentation', async () => {
    const { TemplateEditor } = await import('@/components/email/TemplateEditor')
    render(<TemplateEditor onSave={vi.fn()} />)

    expect(screen.getByText(/variable_name/)).toBeInTheDocument()
  })
})
