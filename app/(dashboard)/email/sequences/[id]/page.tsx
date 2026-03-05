'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  ArrowLeft,
  Loader2,
  Edit,
  Mail,
  Clock,
  Users,
  CheckCircle,
  Play,
  Pause,
  GitBranch,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface SequenceStep {
  id: string
  step_order: number
  step_type: string
  template_id: string | null
  subject_override: string | null
  delay_days: number
  delay_hours: number
  delay_minutes: number
  conditions: Record<string, unknown>
  stats: { sent: number; opened: number; clicked: number }
  email_templates: { id: string; name: string; subject: string } | null
}

interface Sequence {
  id: string
  name: string
  description: string | null
  trigger_type: string
  trigger_rules: Record<string, unknown>
  is_active: boolean
  allow_reenroll: boolean
  exit_on_reply: boolean
  total_enrolled: number
  total_completed: number
  created_at: string
  updated_at: string
  email_sequence_steps: SequenceStep[]
}

const triggerTypeLabels: Record<string, string> = {
  signup: 'New Signup',
  subscription_change: 'Subscription Change',
  inactivity: 'User Inactivity',
  manual: 'Manual Enrollment',
  custom: 'Custom Trigger',
}

export default function SequenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [sequence, setSequence] = useState<Sequence | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSequence()
  }, [id])

  async function loadSequence() {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/email/sequences/${id}`)
      if (response.ok) {
        const data = await response.json()
        setSequence(data.sequence)
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load sequence',
          variant: 'destructive',
        })
        router.push('/email/sequences')
      }
    } catch (error) {
      console.error('Error loading sequence:', error)
    }
    setIsLoading(false)
  }

  async function toggleActive() {
    if (!sequence) return

    const response = await fetch(`/api/email/sequences/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !sequence.is_active }),
    })

    if (response.ok) {
      setSequence((prev) => (prev ? { ...prev, is_active: !prev.is_active } : null))
      toast({
        title: 'Success',
        description: `Sequence ${!sequence.is_active ? 'activated' : 'deactivated'}`,
      })
    }
  }

  if (isLoading || !sequence) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const completionRate =
    sequence.total_enrolled > 0
      ? Math.round((sequence.total_completed / sequence.total_enrolled) * 100)
      : 0

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/email/sequences">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{sequence.name}</h1>
            {sequence.description && (
              <p className="text-muted-foreground mt-1">{sequence.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch checked={sequence.is_active} onCheckedChange={toggleActive} />
            <span className="text-sm">
              {sequence.is_active ? (
                <span className="text-green-600 flex items-center gap-1">
                  <Play className="h-3 w-3" />
                  Active
                </span>
              ) : (
                <span className="text-muted-foreground flex items-center gap-1">
                  <Pause className="h-3 w-3" />
                  Paused
                </span>
              )}
            </span>
          </div>
          <Link href={`/email/sequences/builder?edit=${sequence.id}`}>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <GitBranch className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Steps</p>
                <p className="text-2xl font-bold">
                  {sequence.email_sequence_steps?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Enrolled</p>
                <p className="text-2xl font-bold">{sequence.total_enrolled}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{sequence.total_completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">{completionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Sequence Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Trigger</p>
              <Badge variant="outline" className="mt-1">
                {triggerTypeLabels[sequence.trigger_type] || sequence.trigger_type}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Allow Re-enrollment</p>
              <p className="font-medium mt-1">
                {sequence.allow_reenroll ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Exit on Reply</p>
              <p className="font-medium mt-1">
                {sequence.exit_on_reply ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium mt-1">
                {new Date(sequence.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Sequence Steps</CardTitle>
          <CardDescription>
            {sequence.email_sequence_steps?.length || 0} steps in this sequence
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sequence.email_sequence_steps?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No steps configured.{' '}
              <Link
                href={`/email/sequences/builder?edit=${sequence.id}`}
                className="text-primary underline"
              >
                Add steps
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sequence.email_sequence_steps?.map((step, index) => (
                <div
                  key={step.id}
                  className={`border rounded-lg p-4 ${
                    step.step_type === 'email' ? 'bg-blue-50/50' : 'bg-orange-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          step.step_type === 'email' ? 'bg-blue-100' : 'bg-orange-100'
                        }`}
                      >
                        {step.step_type === 'email' ? (
                          <Mail className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-orange-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          Step {step.step_order}:{' '}
                          {step.step_type === 'email' ? 'Send Email' : 'Wait'}
                        </p>
                        {step.step_type === 'email' && step.email_templates && (
                          <p className="text-sm text-muted-foreground">
                            Template: {step.email_templates.name}
                          </p>
                        )}
                        {step.step_type === 'delay' && (
                          <p className="text-sm text-muted-foreground">
                            Wait {step.delay_days} days, {step.delay_hours} hours,{' '}
                            {step.delay_minutes} minutes
                          </p>
                        )}
                      </div>
                    </div>

                    {step.step_type === 'email' && step.stats && (
                      <div className="flex gap-4 text-sm">
                        <div className="text-center">
                          <p className="font-medium">{step.stats.sent}</p>
                          <p className="text-muted-foreground">Sent</p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium text-green-600">
                            {step.stats.sent > 0
                              ? Math.round((step.stats.opened / step.stats.sent) * 100)
                              : 0}
                            %
                          </p>
                          <p className="text-muted-foreground">Opens</p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium text-blue-600">
                            {step.stats.sent > 0
                              ? Math.round((step.stats.clicked / step.stats.sent) * 100)
                              : 0}
                            %
                          </p>
                          <p className="text-muted-foreground">Clicks</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
