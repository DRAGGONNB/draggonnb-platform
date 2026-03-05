'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Wrench,
  Plus,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Clock,
  ClipboardCheck,
  Circle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// --- Types ---

type TaskType = 'turnover' | 'maintenance' | 'guest_request' | 'inspection' | 'general'
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
type IssuePriority = 'low' | 'medium' | 'high' | 'urgent'
type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'deferred'
type IssueCategory =
  | 'plumbing'
  | 'electrical'
  | 'structural'
  | 'appliance'
  | 'furniture'
  | 'cleanliness'
  | 'pest'
  | 'safety'
  | 'general'
type ReadinessStatus = 'dirty' | 'cleaning' | 'inspected' | 'ready' | 'maintenance'

interface Task {
  id: string
  title: string
  task_type: TaskType
  status: TaskStatus
  priority: IssuePriority
  assigned_to: string | null
  property_id: string | null
  unit_id: string | null
  notes: string | null
  completed_at: string | null
  created_at: string
}

interface Issue {
  id: string
  title: string
  description: string | null
  category: IssueCategory
  priority: IssuePriority
  status: IssueStatus
  created_at: string
}

interface ReadinessUnit {
  id: string
  unit_name: string
  property_name: string | null
  status: ReadinessStatus
}

// --- Constants ---

const TASK_TYPES: TaskType[] = ['turnover', 'maintenance', 'guest_request', 'inspection', 'general']
const ISSUE_CATEGORIES: IssueCategory[] = [
  'plumbing',
  'electrical',
  'structural',
  'appliance',
  'furniture',
  'cleanliness',
  'pest',
  'safety',
  'general',
]
const PRIORITIES: IssuePriority[] = ['low', 'medium', 'high', 'urgent']

const PRIORITY_COLORS: Record<IssuePriority, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-yellow-100 text-yellow-700',
  urgent: 'bg-red-100 text-red-700',
}

const TASK_TYPE_COLORS: Record<TaskType, string> = {
  turnover: 'bg-purple-100 text-purple-700',
  maintenance: 'bg-orange-100 text-orange-700',
  guest_request: 'bg-blue-100 text-blue-700',
  inspection: 'bg-green-100 text-green-700',
  general: 'bg-gray-100 text-gray-700',
}

const READINESS_COLORS: Record<ReadinessStatus, string> = {
  ready: 'text-green-500',
  inspected: 'text-blue-500',
  cleaning: 'text-yellow-500',
  dirty: 'text-red-500',
  maintenance: 'text-orange-500',
}

const READINESS_CYCLE: ReadinessStatus[] = ['dirty', 'cleaning', 'inspected', 'ready', 'maintenance']

const PRIORITY_ORDER: Record<IssuePriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

// --- Helpers ---

function formatLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

// --- Component ---

export default function OperationsPage() {
  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [creatingTask, setCreatingTask] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    task_type: 'general' as TaskType,
    priority: 'medium' as IssuePriority,
    property_id: '',
    unit_id: '',
    notes: '',
  })

  // Issues state
  const [issues, setIssues] = useState<Issue[]>([])
  const [issuesLoading, setIssuesLoading] = useState(true)
  const [showCreateIssue, setShowCreateIssue] = useState(false)
  const [creatingIssue, setCreatingIssue] = useState(false)
  const [newIssue, setNewIssue] = useState({
    title: '',
    category: 'general' as IssueCategory,
    priority: 'medium' as IssuePriority,
    description: '',
  })

  // Readiness state
  const [units, setUnits] = useState<ReadinessUnit[]>([])
  const [unitsLoading, setUnitsLoading] = useState(true)

  // Shared state
  const [error, setError] = useState<string | null>(null)

  // --- Data Fetching ---

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/accommodation/tasks')
      if (res.status === 403) {
        setError('Accommodation module requires Growth tier or above.')
        return
      }
      const data = await res.json()
      setTasks(data.tasks || [])
    } catch {
      setError('Failed to load tasks')
    } finally {
      setTasksLoading(false)
    }
  }, [])

  const fetchIssues = useCallback(async () => {
    try {
      const res = await fetch('/api/accommodation/issues')
      if (res.status === 403) {
        setError('Accommodation module requires Growth tier or above.')
        return
      }
      const data = await res.json()
      setIssues(data.issues || [])
    } catch {
      setError('Failed to load issues')
    } finally {
      setIssuesLoading(false)
    }
  }, [])

  const fetchReadiness = useCallback(async () => {
    try {
      const res = await fetch('/api/accommodation/readiness')
      if (res.status === 403) {
        setError('Accommodation module requires Growth tier or above.')
        return
      }
      const data = await res.json()
      setUnits(data.units || [])
    } catch {
      setError('Failed to load unit readiness')
    } finally {
      setUnitsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
    fetchIssues()
    fetchReadiness()
  }, [fetchTasks, fetchIssues, fetchReadiness])

  // --- Task Actions ---

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return
    setCreatingTask(true)
    try {
      const body: Record<string, string> = {
        title: newTask.title,
        task_type: newTask.task_type,
        priority: newTask.priority,
      }
      if (newTask.property_id.trim()) body.property_id = newTask.property_id
      if (newTask.unit_id.trim()) body.unit_id = newTask.unit_id
      if (newTask.notes.trim()) body.notes = newTask.notes

      const res = await fetch('/api/accommodation/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setShowCreateTask(false)
        setNewTask({
          title: '',
          task_type: 'general',
          priority: 'medium',
          property_id: '',
          unit_id: '',
          notes: '',
        })
        fetchTasks()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create task')
      }
    } catch {
      setError('Failed to create task')
    } finally {
      setCreatingTask(false)
    }
  }

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    try {
      const res = await fetch(`/api/accommodation/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        fetchTasks()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update task')
      }
    } catch {
      setError('Failed to update task')
    }
  }

  // --- Issue Actions ---

  const handleCreateIssue = async () => {
    if (!newIssue.title.trim()) return
    setCreatingIssue(true)
    try {
      const body: Record<string, string> = {
        title: newIssue.title,
        category: newIssue.category,
        priority: newIssue.priority,
      }
      if (newIssue.description.trim()) body.description = newIssue.description

      const res = await fetch('/api/accommodation/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setShowCreateIssue(false)
        setNewIssue({ title: '', category: 'general', priority: 'medium', description: '' })
        fetchIssues()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to report issue')
      }
    } catch {
      setError('Failed to report issue')
    } finally {
      setCreatingIssue(false)
    }
  }

  const updateIssueStatus = async (issueId: string, status: IssueStatus) => {
    try {
      const res = await fetch(`/api/accommodation/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        fetchIssues()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update issue')
      }
    } catch {
      setError('Failed to update issue')
    }
  }

  // --- Readiness Actions ---

  const cycleReadiness = async (unit: ReadinessUnit) => {
    const currentIndex = READINESS_CYCLE.indexOf(unit.status)
    const nextIndex = (currentIndex + 1) % READINESS_CYCLE.length
    const nextStatus = READINESS_CYCLE[nextIndex]

    try {
      const res = await fetch(`/api/accommodation/readiness/${unit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (res.ok) {
        fetchReadiness()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update readiness')
      }
    } catch {
      setError('Failed to update readiness')
    }
  }

  // --- Computed Values ---

  const pendingTaskCount = tasks.filter((t) => t.status === 'pending').length
  const openIssueCount = issues.filter((i) => i.status === 'open').length
  const readyUnitCount = units.filter((u) => u.status === 'ready').length
  const completedTodayCount = tasks.filter(
    (t) => t.status === 'completed' && isToday(t.completed_at)
  ).length

  const activeTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress')
  const pendingTasks = activeTasks.filter((t) => t.status === 'pending')
  const inProgressTasks = activeTasks.filter((t) => t.status === 'in_progress')

  const sortedIssues = [...issues]
    .filter((i) => i.status !== 'closed' && i.status !== 'resolved')
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])

  // --- Loading State ---

  const allLoading = tasksLoading && issuesLoading && unitsLoading

  if (allLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wrench className="h-8 w-8 text-primary" />
          Operations
        </h1>
        <p className="text-muted-foreground mt-2">
          Housekeeping, maintenance, and unit readiness
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-destructive text-sm">{error}</p>
          <button
            className="text-xs text-destructive underline mt-1"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTaskCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openIssueCount}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Units Ready</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{readyUnitCount}</div>
            <p className="text-xs text-muted-foreground">
              of {units.length} total units
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTodayCount}</div>
            <p className="text-xs text-muted-foreground">Tasks finished today</p>
          </CardContent>
        </Card>
      </div>

      {/* Three-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column A - Tasks Board */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Tasks</CardTitle>
            <Button size="sm" onClick={() => setShowCreateTask(!showCreateTask)}>
              <Plus className="mr-1 h-4 w-4" />
              Add Task
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Create Task Form */}
            {showCreateTask && (
              <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    placeholder="Task title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={newTask.task_type}
                      onValueChange={(v) =>
                        setNewTask({ ...newTask, task_type: v as TaskType })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {formatLabel(t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(v) =>
                        setNewTask({ ...newTask, priority: v as IssuePriority })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {formatLabel(p)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Property ID</Label>
                    <Input
                      placeholder="Optional"
                      value={newTask.property_id}
                      onChange={(e) =>
                        setNewTask({ ...newTask, property_id: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit ID</Label>
                    <Input
                      placeholder="Optional"
                      value={newTask.unit_id}
                      onChange={(e) =>
                        setNewTask({ ...newTask, unit_id: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    placeholder="Additional notes"
                    value={newTask.notes}
                    onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleCreateTask}
                  disabled={creatingTask || !newTask.title.trim()}
                  className="w-full"
                >
                  {creatingTask ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Create Task
                </Button>
              </div>
            )}

            {/* Pending Tasks */}
            {pendingTasks.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Pending ({pendingTasks.length})
                </p>
                <div className="space-y-2">
                  {pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 border rounded-lg space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm leading-tight">
                          {task.title}
                        </span>
                        <Circle
                          className={`h-3 w-3 flex-shrink-0 mt-0.5 fill-current ${
                            PRIORITY_COLORS[task.priority].includes('red')
                              ? 'text-red-500'
                              : PRIORITY_COLORS[task.priority].includes('yellow')
                              ? 'text-yellow-500'
                              : PRIORITY_COLORS[task.priority].includes('blue')
                              ? 'text-blue-500'
                              : 'text-gray-400'
                          }`}
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={TASK_TYPE_COLORS[task.task_type]}
                        >
                          {formatLabel(task.task_type)}
                        </Badge>
                        {task.assigned_to && (
                          <span className="text-xs text-muted-foreground">
                            {task.assigned_to}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => updateTaskStatus(task.id, 'in_progress')}
                        >
                          Start
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => updateTaskStatus(task.id, 'completed')}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Complete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* In Progress Tasks */}
            {inProgressTasks.length > 0 && (
              <div>
                {pendingTasks.length > 0 && <Separator className="my-3" />}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  In Progress ({inProgressTasks.length})
                </p>
                <div className="space-y-2">
                  {inProgressTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 border rounded-lg border-blue-200 bg-blue-50/30 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm leading-tight">
                          {task.title}
                        </span>
                        <Circle
                          className={`h-3 w-3 flex-shrink-0 mt-0.5 fill-current ${
                            PRIORITY_COLORS[task.priority].includes('red')
                              ? 'text-red-500'
                              : PRIORITY_COLORS[task.priority].includes('yellow')
                              ? 'text-yellow-500'
                              : PRIORITY_COLORS[task.priority].includes('blue')
                              ? 'text-blue-500'
                              : 'text-gray-400'
                          }`}
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={TASK_TYPE_COLORS[task.task_type]}
                        >
                          {formatLabel(task.task_type)}
                        </Badge>
                        {task.assigned_to && (
                          <span className="text-xs text-muted-foreground">
                            {task.assigned_to}
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => updateTaskStatus(task.id, 'completed')}
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Mark Complete
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {activeTasks.length === 0 && !showCreateTask && (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No active tasks</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Column B - Issues */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Issues</CardTitle>
            <Button size="sm" onClick={() => setShowCreateIssue(!showCreateIssue)}>
              <Plus className="mr-1 h-4 w-4" />
              Report Issue
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Create Issue Form */}
            {showCreateIssue && (
              <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    placeholder="Issue title"
                    value={newIssue.title}
                    onChange={(e) =>
                      setNewIssue({ ...newIssue, title: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={newIssue.category}
                      onValueChange={(v) =>
                        setNewIssue({ ...newIssue, category: v as IssueCategory })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ISSUE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {formatLabel(c)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={newIssue.priority}
                      onValueChange={(v) =>
                        setNewIssue({ ...newIssue, priority: v as IssuePriority })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {formatLabel(p)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Describe the issue"
                    value={newIssue.description}
                    onChange={(e) =>
                      setNewIssue({ ...newIssue, description: e.target.value })
                    }
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleCreateIssue}
                  disabled={creatingIssue || !newIssue.title.trim()}
                  className="w-full"
                >
                  {creatingIssue ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Report Issue
                </Button>
              </div>
            )}

            {/* Issues List */}
            {sortedIssues.length > 0 ? (
              <div className="space-y-2">
                {sortedIssues.map((issue) => (
                  <div key={issue.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-sm leading-tight">
                        {issue.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="secondary"
                        className={PRIORITY_COLORS[issue.priority]}
                      >
                        {formatLabel(issue.priority)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {formatLabel(issue.category)}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={
                          issue.status === 'open'
                            ? 'bg-red-50 text-red-600'
                            : issue.status === 'in_progress'
                            ? 'bg-blue-50 text-blue-600'
                            : issue.status === 'deferred'
                            ? 'bg-gray-50 text-gray-600'
                            : 'bg-green-50 text-green-600'
                        }
                      >
                        {formatLabel(issue.status)}
                      </Badge>
                    </div>
                    {issue.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {issue.description}
                      </p>
                    )}
                    <div className="flex gap-2">
                      {issue.status === 'open' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => updateIssueStatus(issue.id, 'in_progress')}
                        >
                          Start Work
                        </Button>
                      )}
                      {issue.status === 'in_progress' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => updateIssueStatus(issue.id, 'resolved')}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Resolve
                        </Button>
                      )}
                      {(issue.status === 'open' || issue.status === 'in_progress') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7"
                          onClick={() => updateIssueStatus(issue.id, 'deferred')}
                        >
                          Defer
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !showCreateIssue && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No open issues</p>
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* Column C - Unit Readiness */}
        <Card>
          <CardHeader>
            <CardTitle>Readiness</CardTitle>
          </CardHeader>
          <CardContent>
            {units.length > 0 ? (
              <div className="space-y-2">
                {units.map((unit) => (
                  <button
                    key={unit.id}
                    className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors text-left"
                    onClick={() => cycleReadiness(unit)}
                  >
                    <Circle
                      className={`h-4 w-4 flex-shrink-0 fill-current ${READINESS_COLORS[unit.status]}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {unit.unit_name}
                      </p>
                      {unit.property_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {unit.property_name}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium capitalize flex-shrink-0 ${
                        unit.status === 'ready'
                          ? 'text-green-600'
                          : unit.status === 'inspected'
                          ? 'text-blue-600'
                          : unit.status === 'cleaning'
                          ? 'text-yellow-600'
                          : unit.status === 'dirty'
                          ? 'text-red-600'
                          : 'text-orange-600'
                      }`}
                    >
                      {formatLabel(unit.status)}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No units configured</p>
              </div>
            )}

            {/* Readiness Legend */}
            {units.length > 0 && (
              <>
                <Separator className="my-4" />
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {READINESS_CYCLE.map((status) => (
                    <div key={status} className="flex items-center gap-1">
                      <Circle
                        className={`h-2.5 w-2.5 fill-current ${READINESS_COLORS[status]}`}
                      />
                      <span className="capitalize">{status}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Click a unit to cycle its status
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
