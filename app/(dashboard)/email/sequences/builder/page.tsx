'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Switch } from '@/components/ui/switch'
import {
  ArrowLeft,
  Loader2,
  Save,
  Plus,
  Trash2,
  Mail,
  Clock,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface TemplateOption {
  id: string
  name: string
  subject: string
}

interface SequenceStep {
  id?: string
  step_order: number
  step_type: 'email' | 'delay' | 'condition'
  template_id: string | null
  subject_override: string | null
  delay_days: number
  delay_hours: number
  delay_minutes: number
  conditions: Record<string, unknown>
  isExpanded?: boolean
  email_templates?: { id: string; name: string; subject: string } | null
}

const triggerTypes = [
  { value: 'signup', label: 'New Signup' },
  { value: 'subscription_change', label: 'Subscription Change' },
  { value: 'inactivity', label: 'User Inactivity' },
  { value: 'manual', label: 'Manual Enrollment' },
  { value: 'custom', label: 'Custom Trigger' },
]

function SequenceBuilderContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const editId = searchParams.get('edit')

  const [isLoading, setIsLoading] = useState(!!editId)
  const [isSaving, setIsSaving] = useState(false)
  const [templates, setTemplates] = useState<TemplateOption[]>([])

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerType, setTriggerType] = useState('manual')
  const [allowReenroll, setAllowReenroll] = useState(false)
  const [exitOnReply, setExitOnReply] = useState(true)
  const [steps, setSteps] = useState<SequenceStep[]>([])

  useEffect(() => {
    loadTemplates()
    if (editId) {
      loadSequence(editId)
    }
  }, [editId])

  async function loadTemplates() {
    const supabase = createClient()
    const { data } = await supabase
      .from('email_templates')
      .select('id, name, subject')
      .eq('is_active', true)
      .order('name')

    if (data) {
      setTemplates(data)
    }
  }

  async function loadSequence(id: string) {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/email/sequences/${id}`)
      if (response.ok) {
        const data = await response.json()
        const sequence = data.sequence
        setName(sequence.name)
        setDescription(sequence.description || '')
        setTriggerType(sequence.trigger_type)
        setAllowReenroll(sequence.allow_reenroll)
        setExitOnReply(sequence.exit_on_reply)

        if (sequence.email_sequence_steps) {
          setSteps(
            sequence.email_sequence_steps.map((s: SequenceStep) => ({
              ...s,
              isExpanded: true,
            }))
          )
        }
      }
    } catch (error) {
      console.error('Failed to load sequence:', error)
    }
    setIsLoading(false)
  }

  function addStep(type: 'email' | 'delay') {
    const newStep: SequenceStep = {
      step_order: steps.length + 1,
      step_type: type,
      template_id: null,
      subject_override: null,
      delay_days: type === 'delay' ? 1 : 0,
      delay_hours: 0,
      delay_minutes: 0,
      conditions: {},
      isExpanded: true,
    }
    setSteps([...steps, newStep])
  }

  function updateStep(index: number, updates: Partial<SequenceStep>) {
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, ...updates } : step))
    )
  }

  function removeStep(index: number) {
    setSteps((prev) => {
      const newSteps = prev.filter((_, i) => i !== index)
      // Reorder remaining steps
      return newSteps.map((step, i) => ({ ...step, step_order: i + 1 }))
    })
  }

  function moveStep(index: number, direction: 'up' | 'down') {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === steps.length - 1)
    ) {
      return
    }

    const newSteps = [...steps]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    ;[newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]]

    // Update step_order for both moved steps
    newSteps[index].step_order = index + 1
    newSteps[targetIndex].step_order = targetIndex + 1

    setSteps(newSteps)
  }

  async function handleSave() {
    if (!name) {
      toast({
        title: 'Error',
        description: 'Sequence name is required',
        variant: 'destructive',
      })
      return
    }

    // Validate email steps have templates
    const emailStepsWithoutTemplate = steps.filter(
      (s) => s.step_type === 'email' && !s.template_id
    )
    if (emailStepsWithoutTemplate.length > 0) {
      toast({
        title: 'Error',
        description: 'All email steps must have a template selected',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)

    try {
      const sequenceData = {
        name,
        description: description || null,
        trigger_type: triggerType,
        allow_reenroll: allowReenroll,
        exit_on_reply: exitOnReply,
        steps: steps.map((s) => ({
          id: s.id,
          step_order: s.step_order,
          step_type: s.step_type,
          template_id: s.template_id,
          subject_override: s.subject_override,
          delay_days: s.delay_days,
          delay_hours: s.delay_hours,
          delay_minutes: s.delay_minutes,
          conditions: s.conditions,
        })),
      }

      let response
      if (editId) {
        // Update existing sequence
        response = await fetch(`/api/email/sequences/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sequenceData),
        })

        if (response.ok) {
          // Update steps separately
          await fetch(`/api/email/sequences/${editId}/steps`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ steps: sequenceData.steps }),
          })
        }
      } else {
        // Create new sequence with steps
        response = await fetch('/api/email/sequences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sequenceData),
        })
      }

      if (!response.ok) {
        throw new Error('Failed to save sequence')
      }

      toast({
        title: 'Success',
        description: editId ? 'Sequence updated' : 'Sequence created',
      })

      router.push('/email/sequences')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/email/sequences">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">
            {editId ? 'Edit Sequence' : 'Create Sequence'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Build your automated email drip campaign
          </p>
        </div>
      </div>

      {/* Sequence Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Sequence Settings</CardTitle>
          <CardDescription>
            Configure when and how this sequence runs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Sequence Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Welcome Series"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trigger">Trigger Type</Label>
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger" />
                </SelectTrigger>
                <SelectContent>
                  {triggerTypes.map((trigger) => (
                    <SelectItem key={trigger.value} value={trigger.value}>
                      {trigger.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this sequence for?"
              rows={2}
            />
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="reenroll"
                checked={allowReenroll}
                onCheckedChange={setAllowReenroll}
              />
              <Label htmlFor="reenroll" className="text-sm">
                Allow re-enrollment
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="exitReply"
                checked={exitOnReply}
                onCheckedChange={setExitOnReply}
              />
              <Label htmlFor="exitReply" className="text-sm">
                Exit on reply
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sequence Steps */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sequence Steps</CardTitle>
              <CardDescription>
                Add emails and delays to build your sequence
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => addStep('delay')}>
                <Clock className="h-4 w-4 mr-2" />
                Add Delay
              </Button>
              <Button size="sm" onClick={() => addStep('email')}>
                <Mail className="h-4 w-4 mr-2" />
                Add Email
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">No steps yet</p>
              <Button onClick={() => addStep('email')}>
                <Plus className="h-4 w-4 mr-2" />
                Add first step
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="border rounded-lg overflow-hidden"
                >
                  {/* Step Header */}
                  <div
                    className={`flex items-center gap-3 p-3 ${
                      step.step_type === 'email' ? 'bg-blue-50' : 'bg-orange-50'
                    }`}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    <div className="flex-1 flex items-center gap-2">
                      {step.step_type === 'email' ? (
                        <Mail className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-orange-600" />
                      )}
                      <span className="font-medium">
                        Step {step.step_order}:{' '}
                        {step.step_type === 'email' ? 'Send Email' : 'Wait'}
                      </span>
                      {step.step_type === 'email' && step.email_templates && (
                        <span className="text-sm text-muted-foreground">
                          - {step.email_templates.name}
                        </span>
                      )}
                      {step.step_type === 'delay' && (
                        <span className="text-sm text-muted-foreground">
                          - {step.delay_days}d {step.delay_hours}h {step.delay_minutes}m
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveStep(index, 'up')}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveStep(index, 'down')}
                        disabled={index === steps.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateStep(index, { isExpanded: !step.isExpanded })
                        }
                      >
                        {step.isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeStep(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Step Content */}
                  {step.isExpanded && (
                    <div className="p-4 space-y-4">
                      {step.step_type === 'email' ? (
                        <>
                          <div className="space-y-2">
                            <Label>Email Template *</Label>
                            <Select
                              value={step.template_id || ''}
                              onValueChange={(value) =>
                                updateStep(index, { template_id: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a template" />
                              </SelectTrigger>
                              <SelectContent>
                                {templates.map((template) => (
                                  <SelectItem key={template.id} value={template.id}>
                                    {template.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {templates.length === 0 && (
                              <p className="text-sm text-muted-foreground">
                                No templates available.{' '}
                                <Link
                                  href="/email/templates/editor"
                                  className="text-primary underline"
                                >
                                  Create one first
                                </Link>
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label>Subject Override (Optional)</Label>
                            <Input
                              value={step.subject_override || ''}
                              onChange={(e) =>
                                updateStep(index, {
                                  subject_override: e.target.value || null,
                                })
                              }
                              placeholder="Leave empty to use template subject"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Days</Label>
                            <Input
                              type="number"
                              min="0"
                              value={step.delay_days}
                              onChange={(e) =>
                                updateStep(index, {
                                  delay_days: parseInt(e.target.value) || 0,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Hours</Label>
                            <Input
                              type="number"
                              min="0"
                              max="23"
                              value={step.delay_hours}
                              onChange={(e) =>
                                updateStep(index, {
                                  delay_hours: parseInt(e.target.value) || 0,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Minutes</Label>
                            <Input
                              type="number"
                              min="0"
                              max="59"
                              value={step.delay_minutes}
                              onChange={(e) =>
                                updateStep(index, {
                                  delay_minutes: parseInt(e.target.value) || 0,
                                })
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push('/email/sequences')}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Sequence
        </Button>
      </div>
    </div>
  )
}

export default function SequenceBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SequenceBuilderContent />
    </Suspense>
  )
}
