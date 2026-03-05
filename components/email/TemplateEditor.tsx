'use client'

import { useRef, useCallback, useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, Eye, Loader2 } from 'lucide-react'
import type { TemplateCategory } from '@/lib/email/types'

// Dynamically import EmailEditor to avoid SSR issues
const EmailEditor = dynamic(() => import('react-email-editor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px] bg-muted rounded-lg">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
})

interface TemplateEditorProps {
  templateId?: string
  initialData?: {
    name: string
    subject: string
    description?: string
    category: TemplateCategory
    editor_json?: Record<string, unknown>
  }
  onSave: (data: {
    name: string
    subject: string
    description?: string
    category: TemplateCategory
    html_content: string
    editor_json: Record<string, unknown>
  }) => Promise<void>
  onPreview?: (html: string) => void
}

export function TemplateEditor({
  templateId,
  initialData,
  onSave,
  onPreview,
}: TemplateEditorProps) {
  const emailEditorRef = useRef<{ exportHtml: (callback: (data: { design: Record<string, unknown>; html: string }) => void) => void } | null>(null)

  const [name, setName] = useState(initialData?.name || '')
  const [subject, setSubject] = useState(initialData?.subject || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [category, setCategory] = useState<TemplateCategory>(initialData?.category || 'general')
  const [isSaving, setIsSaving] = useState(false)
  const [isEditorReady, setIsEditorReady] = useState(false)

  const onEditorLoad = useCallback(() => {
    setIsEditorReady(true)

    // Load initial design if editing existing template
    if (initialData?.editor_json && emailEditorRef.current) {
      // Type assertion for loadDesign method
      const editor = emailEditorRef.current as unknown as {
        loadDesign: (design: Record<string, unknown>) => void
        registerCallback: (type: string, callback: (...args: unknown[]) => void) => void
      }
      editor.loadDesign(initialData.editor_json)
    }

    // Register custom image upload handler to prevent browser default drag-drop
    if (emailEditorRef.current) {
      const editor = emailEditorRef.current as unknown as {
        registerCallback: (type: string, callback: (...args: unknown[]) => void) => void
      }
      editor.registerCallback('image', (file: unknown, done: unknown) => {
        const fileData = file as { attachments: File[] }
        const doneCb = done as (data: { progress: number; url?: string }) => void

        if (!fileData.attachments || fileData.attachments.length === 0) {
          return
        }

        const attachment = fileData.attachments[0]
        const reader = new FileReader()

        reader.onload = () => {
          // Use base64 data URL as the image source
          doneCb({ progress: 100, url: reader.result as string })
        }

        reader.readAsDataURL(attachment)
      })
    }
  }, [initialData?.editor_json])

  const handleSave = useCallback(async () => {
    if (!emailEditorRef.current || !name || !subject) {
      return
    }

    setIsSaving(true)

    emailEditorRef.current.exportHtml(async ({ design, html }) => {
      try {
        await onSave({
          name,
          subject,
          description,
          category,
          html_content: html,
          editor_json: design,
        })
      } catch (error) {
        console.error('Failed to save template:', error)
      } finally {
        setIsSaving(false)
      }
    })
  }, [name, subject, description, category, onSave])

  const handlePreview = useCallback(() => {
    if (!emailEditorRef.current || !onPreview) {
      return
    }

    emailEditorRef.current.exportHtml(({ html }) => {
      onPreview(html)
    })
  }, [onPreview])

  return (
    <div className="space-y-6">
      {/* Template Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>{templateId ? 'Edit Template' : 'Create New Template'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Welcome Email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TemplateCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="welcome">Welcome</SelectItem>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                  <SelectItem value="promotional">Promotional</SelectItem>
                  <SelectItem value="transactional">Transactional</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="subject">Email Subject *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Welcome to {{company_name}}!"
              />
              <p className="text-sm text-muted-foreground">
                Use {'{{variable_name}}'} for dynamic content
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of when to use this template..."
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Editor */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Email Content</CardTitle>
          <div className="flex gap-2">
            {onPreview && (
              <Button variant="outline" onClick={handlePreview} disabled={!isEditorReady}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!isEditorReady || !name || !subject || isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Template
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border rounded-b-lg overflow-hidden">
            <EmailEditor
              ref={emailEditorRef as React.RefObject<never>}
              onLoad={onEditorLoad}
              minHeight={600}
              options={{
                displayMode: 'email',
                features: {
                  textEditor: {
                    tables: true,
                    cleanPaste: true,
                  },
                },
                tools: {
                  button: { enabled: true },
                  text: { enabled: true },
                  image: { enabled: true },
                  divider: { enabled: true },
                  social: { enabled: true },
                  html: { enabled: true },
                  heading: { enabled: true },
                  menu: { enabled: true },
                  video: { enabled: true },
                },
                mergeTags: {
                  first_name: { name: 'First Name', value: '{{first_name}}' },
                  last_name: { name: 'Last Name', value: '{{last_name}}' },
                  full_name: { name: 'Full Name', value: '{{full_name}}' },
                  email: { name: 'Email', value: '{{email}}' },
                  company_name: { name: 'Company Name', value: '{{company_name}}' },
                  subscription_tier: { name: 'Subscription Tier', value: '{{subscription_tier}}' },
                  unsubscribe_url: { name: 'Unsubscribe URL', value: '{{unsubscribe_url}}' },
                  preferences_url: { name: 'Preferences URL', value: '{{preferences_url}}' },
                  current_year: { name: 'Current Year', value: '{{current_year}}' },
                },
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
