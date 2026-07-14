import { useState, type FormEvent } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import {
  AlertTriangle,
  Calendar,
  ChevronLeft,
  Clock,
  ExternalLink,
  Filter,
  FolderKanban,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { getApiErrorMessage } from '@/api/client'
import { taskManagementApi } from '@/api/taskManagement'
import type {
  ProjectMilestoneNode,
  ProjectTaskManagementProject,
  ProjectTaskManagementResponse,
  ProjectTaskNode,
  ProjectTaskPayload,
  ProjectTaskUpdatePayload,
  Role,
} from '@/api/taskManagement'

export const Route = createFileRoute('/_authenticated/tasks')({
  component: TaskBoard,
})

type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

interface Assignee {
  name: string
  role: string
  initials: string
  hours: number
  color: string
}

interface Task {
  id: string
  projectId: string
  milestoneId: string
  parentTaskId?: string | null
  jobNumber: string
  workflowPhase: string
  title: string
  description: string
  status: string
  priority: TaskPriority
  project: string
  assignee: string
  assignedRoleId?: string | null
  allocatedHours: number
  dueDate: string
  aiRisk?: string
  assignees?: Assignee[]
}

type TaskFormData = {
  projectId: string
  milestoneId: string
  taskName: string
  taskDescription: string
  dueDate: string
  assignedRoleId: string
  allocatedHours: string
}

type TaskEditFormData = {
  taskName: string
  taskDescription: string
  dueDate: string
  assignedRoleId: string
  allocatedHours: string
  status: string
}

const columns = [
  { id: 'todo', title: 'To Do', color: 'bg-gray-100 dark:bg-gray-800' },
  { id: 'inprogress', title: 'In Progress', color: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 'review', title: 'Review', color: 'bg-yellow-50 dark:bg-yellow-900/20' },
  { id: 'done', title: 'Done', color: 'bg-green-50 dark:bg-green-900/20' },
]

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-gray-200 text-gray-700',
  medium: 'bg-blue-200 text-blue-700',
  high: 'bg-orange-200 text-orange-700',
  critical: 'bg-red-200 text-red-700',
}

const assigneeColors = ['bg-purple-500', 'bg-blue-500', 'bg-orange-500', 'bg-green-500']

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'NA'

const normalizeTaskStatus = (status?: string | null) => {
  const normalized = (status || '').toLowerCase().replace(/[\s_-]/g, '')
  if (['done', 'complete', 'completed'].includes(normalized)) return 'done'
  if (['inprogress', 'progress', 'doing'].includes(normalized)) return 'inprogress'
  if (['review', 'qa', 'checking'].includes(normalized)) return 'review'
  return 'todo'
}

const getPriority = (dueDate?: string | null, status?: string | null): TaskPriority => {
  if (!dueDate || normalizeTaskStatus(status) === 'done') return 'medium'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'critical'
  if (diffDays < 3) return 'high'
  if (diffDays < 7) return 'medium'
  return 'low'
}

const getDueDateColor = (dueDate: string, status: string) => {
  if (!dueDate || status === 'done') return 'text-gray-500 dark:text-gray-400'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'text-red-600 font-semibold'
  if (diffDays < 3) return 'text-orange-600 font-semibold'
  if (diffDays < 7) return 'text-yellow-600 font-medium'
  if (diffDays < 14) return 'text-green-600'
  return 'text-gray-500 dark:text-gray-400'
}

const getDueDateLabel = (dueDate: string, status: string) => {
  if (!dueDate || status === 'done') return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`
  if (diffDays === 0) return 'Due today'
  if (diffDays === 1) return 'Due tomorrow'
  if (diffDays < 14) return `${diffDays} days left`
  return null
}

const getProjectName = (project: ProjectTaskManagementProject) =>
  project.project_name || project.contract_title || project.job_title || project.job_number || project.project_id

const getProjectTabLabel = (project: ProjectTaskManagementProject) =>
  project.job_number || getProjectName(project)

const toNumber = (value?: number | string | null) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

const flattenTaskNodes = (
  nodes: ProjectTaskNode[],
  project: ProjectTaskManagementProject,
  milestone: ProjectMilestoneNode,
): Task[] =>
  nodes.flatMap((node, index) => {
    const status = normalizeTaskStatus(node.milestone_status)
    const assignedRole = node.assigned_role_name || 'Unassigned'
    const allocatedHours = toNumber(node.allocated_hours)
    const task: Task = {
      id: node.id,
      projectId: project.project_id,
      milestoneId: milestone.id,
      parentTaskId: node.parent_task_id,
      jobNumber: project.job_number || project.project_id,
      workflowPhase: node.core_phase_name || milestone.milestone_name,
      title: node.task_name,
      description: node.task_description || '',
      status,
      priority: getPriority(node.due_date || milestone.due_date, status),
      project: getProjectName(project),
      assignee: assignedRole,
      assignedRoleId: node.assigned_role_id,
      allocatedHours,
      dueDate: node.due_date || milestone.due_date || '',
      assignees: node.assigned_role_name
        ? [
            {
              name: node.assigned_role_name,
              role: node.assigned_role_name,
              initials: getInitials(node.assigned_role_name),
              hours: allocatedHours,
              color: assigneeColors[index % assigneeColors.length],
            },
          ]
        : [],
    }

    return [task, ...flattenTaskNodes(node.children || [], project, milestone)]
  })

const mapTaskManagementToTasks = (
  rows: Array<{ project: ProjectTaskManagementProject; taskManagement: ProjectTaskManagementResponse }>,
) =>
  rows.flatMap(({ project, taskManagement }) =>
    taskManagement.milestones.flatMap((milestone) =>
      flattenTaskNodes(milestone.tasks || [], project, milestone),
    ),
  )

const buildMilestonesByProject = (
  rows: Array<{ project: ProjectTaskManagementProject; taskManagement: ProjectTaskManagementResponse }>,
) =>
  rows.reduce<Record<string, ProjectMilestoneNode[]>>((acc, row) => {
    acc[row.project.project_id] = row.taskManagement.milestones
    return acc
  }, {})

function TaskCard({
  task,
  isSelected,
  onClick,
}: {
  task: Task
  isSelected: boolean
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  })

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation()
          onClick()
        }
      }}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !isDragging) {
          event.preventDefault()
          onClick()
        }
      }}
      role="button"
      tabIndex={0}
      className={`bg-white dark:bg-gray-800 p-3 rounded-lg border shadow-sm hover:shadow-md transition-all cursor-pointer ${
        isDragging ? 'opacity-50' : ''
      } ${
        isSelected
          ? 'ring-2 ring-blue-500 border-blue-300 shadow-lg'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
          {task.jobNumber}
        </span>
        <span className="text-[10px] font-medium px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded">
          {task.workflowPhase}
        </span>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ml-auto ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
        <button
          type="button"
          {...listeners}
          {...attributes}
          onClick={(event) => event.stopPropagation()}
          className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          title="Drag task"
        >
          <GripVertical size={14} />
        </button>
      </div>

      <h3 className="font-medium text-gray-900 dark:text-white text-sm leading-snug">
        {task.title}
      </h3>
    </div>
  )
}

function DroppableColumn({
  column,
  tasks,
  selectedTaskId,
  onCardClick,
}: {
  column: (typeof columns)[0]
  tasks: Task[]
  selectedTaskId: string | null
  onCardClick: (task: Task) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[220px] ${column.color} rounded-lg p-3 transition-all ${
        isOver ? 'ring-2 ring-blue-400' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-bold text-gray-900 dark:text-white text-sm">{column.title}</h2>
        <span className="px-2 py-0.5 bg-white dark:bg-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300">
          {tasks.length}
        </span>
      </div>

      <div className="space-y-2 min-h-[100px]">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            isSelected={selectedTaskId === task.id}
            onClick={() => onCardClick(task)}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-6 text-gray-400 text-xs">No tasks</div>
        )}
      </div>
    </div>
  )
}

function DetailPanel({
  task,
  isSaving,
  onClose,
  onDelete,
  onMouseLeave,
  onSave,
  onStatusChange,
  roles,
}: {
  task: Task
  isSaving: boolean
  onClose: () => void
  onDelete: (task: Task) => void
  onMouseLeave: () => void
  onSave: (task: Task, formData: TaskEditFormData) => Promise<void>
  onStatusChange: (task: Task, status: string) => void
  roles: Role[]
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<TaskEditFormData>({
    taskName: task.title,
    taskDescription: task.description,
    dueDate: task.dueDate.slice(0, 10),
    assignedRoleId: task.assignedRoleId || '',
    allocatedHours: task.allocatedHours ? String(task.allocatedHours) : '',
    status: task.status,
  })
  const dueDateColor = getDueDateColor(task.dueDate, task.status)
  const dueDateLabel = getDueDateLabel(task.dueDate, task.status)
  const totalHours = task.assignees?.reduce((sum, assignee) => sum + assignee.hours, 0) || 0

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    if (!formData.taskName.trim()) {
      toast.error('Task name is required')
      return
    }
    await onSave(task, formData)
    setIsEditing(false)
  }

  return (
    <div
      onMouseLeave={isEditing ? undefined : onMouseLeave}
      className="fixed top-0 right-0 h-full w-[60%] bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 z-40 overflow-y-auto animate-in slide-in-from-right duration-300"
    >
      <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                {task.jobNumber}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded">
                {task.workflowPhase}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${priorityColors[task.priority]}`}>
                {task.priority}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{task.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/projects/$projectId"
              params={{ projectId: task.projectId }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              <ExternalLink size={14} />
              View Project
            </Link>
            <button
              onClick={() => setIsEditing((current) => !current)}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 text-sm font-medium rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
              title="Edit task"
            >
              <Pencil size={14} />
              Edit
            </button>
            <button
              onClick={() => onDelete(task)}
              disabled={isSaving}
              className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 rounded-lg transition-colors"
              title="Delete task"
            >
              <Trash2 size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {isEditing && (
          <form
            onSubmit={handleSave}
            className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-900/20"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Edit Task</h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Cancel edit
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Name *</label>
              <input
                type="text"
                value={formData.taskName}
                onChange={(event) => setFormData({ ...formData, taskName: event.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={formData.taskDescription}
                onChange={(event) => setFormData({ ...formData, taskDescription: event.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(event) => setFormData({ ...formData, status: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {columns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(event) => setFormData({ ...formData, dueDate: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned Role</label>
                <select
                  value={formData.assignedRoleId}
                  onChange={(event) => setFormData({ ...formData, assignedRoleId: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Unassigned</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.role_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Allocated Hours</label>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={formData.allocatedHours}
                  onChange={(event) => setFormData({ ...formData, allocatedHours: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="0"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}

        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Description
          </h3>
          <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {task.description || 'No description provided.'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Project
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
              <FolderKanban size={16} className="text-gray-400" />
              {task.project}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Due Date
            </h3>
            <div className={`flex items-center gap-2 text-sm ${dueDateColor}`}>
              <Calendar size={16} />
              <span>
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                {dueDateLabel && <span className="ml-1">- {dueDateLabel}</span>}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Status
          </h3>
          <select
            value={task.status}
            disabled={isSaving}
            onChange={(event) => onStatusChange(task, event.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
          >
            {columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.title}
              </option>
            ))}
          </select>
        </div>

        {task.assignees && task.assignees.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Allocated Role
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">{totalHours}h total</span>
            </div>
            <div className="space-y-2">
              {task.assignees.map((assignee) => (
                <div
                  key={`${task.id}-${assignee.role}`}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg"
                >
                  <div
                    className={`w-10 h-10 ${assignee.color} rounded-full flex items-center justify-center text-white font-bold text-sm`}
                  >
                    {assignee.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      {assignee.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{assignee.role}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {assignee.hours}h
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      allocated
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {task.aiRisk && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              AI Risk Alert
            </h3>
            <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                  {task.aiRisk}
                </div>
                <div className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                  Detected by AI risk analysis
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm">
            <User size={16} className="text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400">Role:</span>
            <span className="font-medium text-gray-900 dark:text-white">{task.assignee}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock size={16} className="text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400">Status:</span>
            <span className="font-medium text-gray-900 dark:text-white capitalize">
              {columns.find((column) => column.id === task.status)?.title || task.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ArrowTab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed top-1/2 right-0 -translate-y-1/2 z-30 bg-blue-600 hover:bg-blue-700 text-white w-8 h-20 rounded-l-lg shadow-lg flex items-center justify-center transition-all hover:w-10 group"
      title="Show task details"
    >
      <ChevronLeft size={20} className="group-hover:scale-110 transition-transform" />
    </button>
  )
}

function NewTaskModal({
  isSaving,
  milestonesByProject,
  onClose,
  onSave,
  projects,
  roles,
}: {
  isSaving: boolean
  milestonesByProject: Record<string, ProjectMilestoneNode[]>
  onClose: () => void
  onSave: (task: TaskFormData) => Promise<void>
  projects: ProjectTaskManagementProject[]
  roles: Role[]
}) {
  const firstProjectId = projects[0]?.project_id || ''
  const firstMilestoneId = milestonesByProject[firstProjectId]?.[0]?.id || ''
  const [formData, setFormData] = useState<TaskFormData>({
    projectId: firstProjectId,
    milestoneId: firstMilestoneId,
    taskName: '',
    taskDescription: '',
    dueDate: '',
    assignedRoleId: '',
    allocatedHours: '',
  })

  const selectedMilestones = milestonesByProject[formData.projectId] || []

  const handleProjectChange = (projectId: string) => {
    setFormData({
      ...formData,
      projectId,
      milestoneId: milestonesByProject[projectId]?.[0]?.id || '',
    })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!formData.taskName.trim() || !formData.projectId || !formData.milestoneId) {
      toast.error('Please choose a project, milestone, and task name')
      return
    }
    await onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Task</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project *</label>
              <select
                value={formData.projectId}
                onChange={(event) => handleProjectChange(event.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                {projects.map((project) => (
                  <option key={project.project_id} value={project.project_id}>
                    {getProjectName(project)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Milestone *</label>
              <select
                value={formData.milestoneId}
                onChange={(event) => setFormData({ ...formData, milestoneId: event.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                {selectedMilestones.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone.milestone_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Name *</label>
            <input
              type="text"
              value={formData.taskName}
              onChange={(event) => setFormData({ ...formData, taskName: event.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter task name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={formData.taskDescription}
              onChange={(event) => setFormData({ ...formData, taskDescription: event.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder="Enter task description"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(event) => setFormData({ ...formData, dueDate: event.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned Role</label>
              <select
                value={formData.assignedRoleId}
                onChange={(event) => setFormData({ ...formData, assignedRoleId: event.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Unassigned</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.role_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Allocated Hours</label>
              <input
                type="number"
                min="0"
                step="0.25"
                value={formData.allocatedHours}
                onChange={(event) => setFormData({ ...formData, allocatedHours: event.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Creating...' : 'Create Task'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TaskBoard() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewTaskModal, setShowNewTaskModal] = useState(false)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  )

  const projectsQuery = useQuery({
    queryKey: ['task-management-projects'],
    queryFn: taskManagementApi.getProjects,
  })

  const projects = projectsQuery.data?.data || []
  const projectIds = projects.map((project) => project.project_id)

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: taskManagementApi.getRoles,
  })

  const taskManagementQuery = useQuery({
    queryKey: ['task-management', projectIds],
    enabled: projects.length > 0,
    queryFn: async () =>
      Promise.all(
        projects.map(async (project) => ({
          project,
          taskManagement: await taskManagementApi.getProjectTaskManagement(project.project_id),
        })),
      ),
  })

  const taskRows = taskManagementQuery.data || []
  const tasks = mapTaskManagementToTasks(taskRows)
  const milestonesByProject = buildMilestonesByProject(taskRows)
  const roles = rolesQuery.data?.data || []

  const createTaskMutation = useMutation({
    mutationFn: ({
      milestoneId,
      payload,
      projectId,
    }: {
      milestoneId: string
      payload: ProjectTaskPayload
      projectId: string
    }) => taskManagementApi.createTask(projectId, milestoneId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-management'] })
      toast.success('Task created successfully')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const updateTaskMutation = useMutation({
    mutationFn: ({ payload, task }: { payload: ProjectTaskUpdatePayload; task: Task }) =>
      taskManagementApi.updateTask(task.projectId, task.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-management'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const deleteTaskMutation = useMutation({
    mutationFn: (task: Task) => taskManagementApi.deleteTask(task.projectId, task.milestoneId, task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-management'] })
      setSelectedTask(null)
      setPanelOpen(false)
      toast.success('Task deleted successfully')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((item) => item.id === event.active.id)
    if (task) setActiveTask(task)
  }

  const handleUpdateStatus = async (task: Task, newStatus: string) => {
    if (task.status === newStatus) return
    await updateTaskMutation.mutateAsync({ task, payload: { milestone_status: newStatus } })
    setSelectedTask((current) =>
      current?.id === task.id ? { ...current, status: newStatus } : current,
    )
    toast.success('Task updated successfully')
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return
    const task = tasks.find((item) => item.id === active.id)
    const newStatus = String(over.id)
    if (!task || !columns.find((column) => column.id === newStatus)) return
    try {
      await handleUpdateStatus(task, newStatus)
    } catch {
      // The mutation already shows an API error toast.
    }
  }

  const handleCreateTask = async (taskData: TaskFormData) => {
    const allocatedHours = Number(taskData.allocatedHours)
    const payload: ProjectTaskPayload = {
      task_name: taskData.taskName.trim(),
      task_description: taskData.taskDescription.trim() || null,
      due_date: taskData.dueDate || null,
      assigned_role_id: taskData.assignedRoleId || null,
      allocated_hours: Number.isFinite(allocatedHours) && allocatedHours > 0 ? allocatedHours : null,
      milestone_status: 'todo',
    }
    await createTaskMutation.mutateAsync({
      projectId: taskData.projectId,
      milestoneId: taskData.milestoneId,
      payload,
    })
    setShowNewTaskModal(false)
  }

  const handleSaveTask = async (task: Task, taskData: TaskEditFormData) => {
    const allocatedHours = Number(taskData.allocatedHours)
    const payload: ProjectTaskUpdatePayload = {
      task_name: taskData.taskName.trim(),
      task_description: taskData.taskDescription.trim() || null,
      due_date: taskData.dueDate || null,
      assigned_role_id: taskData.assignedRoleId || null,
      allocated_hours: Number.isFinite(allocatedHours) && allocatedHours > 0 ? allocatedHours : null,
      milestone_status: taskData.status,
    }
    await updateTaskMutation.mutateAsync({ task, payload })
    setSelectedTask((current) =>
      current?.id === task.id
        ? {
            ...current,
            title: payload.task_name || current.title,
            description: payload.task_description || '',
            dueDate: payload.due_date || '',
            assignedRoleId: payload.assigned_role_id,
            allocatedHours: payload.allocated_hours || 0,
            status: payload.milestone_status || current.status,
            assignee:
              roles.find((role) => role.id === payload.assigned_role_id)?.role_name || 'Unassigned',
          }
        : current,
    )
    toast.success('Task updated successfully')
  }

  const handleCardClick = (task: Task) => {
    setSelectedTask(task)
    setPanelOpen(true)
  }

  const handlePanelMouseLeave = () => {
    setPanelOpen(false)
  }

  const handleArrowClick = () => {
    setPanelOpen(true)
  }

  const handlePanelClose = () => {
    setPanelOpen(false)
    setSelectedTask(null)
  }

  const filteredTasks = tasks.filter((task) => {
    const normalizedSearch = searchTerm.toLowerCase()
    const matchesSearch =
      task.title.toLowerCase().includes(normalizedSearch) ||
      task.project.toLowerCase().includes(normalizedSearch) ||
      task.jobNumber.toLowerCase().includes(normalizedSearch)
    const matchesProject = selectedProject === 'all' || task.projectId === selectedProject
    return matchesSearch && matchesProject
  })

  const loading = projectsQuery.isLoading || taskManagementQuery.isLoading
  const error = projectsQuery.error || taskManagementQuery.error || rolesQuery.error

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Task Board</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and track engineering tasks across projects
          </p>
        </div>
        <button
          onClick={() => setShowNewTaskModal(true)}
          disabled={loading || projects.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          <Plus size={18} />
          New Task
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {getApiErrorMessage(error)}
        </div>
      )}

      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => setSelectedProject('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
              selectedProject === 'all'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <FolderKanban size={14} />
            All Projects
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              selectedProject === 'all' ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              {tasks.length}
            </span>
          </button>
          {projects.map((project) => {
            const count = tasks.filter((task) => task.projectId === project.project_id).length
            const isActive = selectedProject === project.project_id
            return (
              <button
                key={project.project_id}
                onClick={() => setSelectedProject(project.project_id)}
                title={getProjectName(project)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {getProjectTabLabel(project)}
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search tasks, project IDs..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white">
            <Filter size={20} />
            Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-16 text-gray-500 dark:text-gray-400">
          <Loader2 className="mr-2 animate-spin" size={20} />
          Loading tasks from backend...
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className={`flex gap-3 overflow-x-auto pb-4 transition-all duration-300 ${
            panelOpen ? 'max-w-[40%]' : 'max-w-full'
          }`}>
            {columns.map((column) => (
              <DroppableColumn
                key={column.id}
                column={column}
                tasks={filteredTasks.filter((task) => task.status === column.id)}
                selectedTaskId={selectedTask?.id || null}
                onCardClick={handleCardClick}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask && (
              <TaskCard
                task={activeTask}
                isSelected={false}
                onClick={() => {}}
              />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {!panelOpen && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl shadow-sm p-6 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">AI Task Insights</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automated dependency and risk analysis
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-red-600 mb-1">
                {tasks.filter((task) => task.priority === 'critical').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Tasks at risk of delay</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-yellow-600 mb-1">
                {tasks.filter((task) => task.status === 'review').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Tasks in review</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {tasks.filter((task) => task.status !== 'done').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Open tasks</div>
            </div>
          </div>
        </div>
      )}

      {selectedTask && panelOpen && (
        <DetailPanel
          key={selectedTask.id}
          task={selectedTask}
          isSaving={updateTaskMutation.isPending || deleteTaskMutation.isPending}
          onClose={handlePanelClose}
          onDelete={(task) => deleteTaskMutation.mutate(task)}
          onMouseLeave={handlePanelMouseLeave}
          onSave={handleSaveTask}
          onStatusChange={(task, status) => {
            handleUpdateStatus(task, status).catch(() => undefined)
          }}
          roles={roles}
        />
      )}

      {selectedTask && !panelOpen && <ArrowTab onClick={handleArrowClick} />}

      {showNewTaskModal && (
        <NewTaskModal
          isSaving={createTaskMutation.isPending}
          milestonesByProject={milestonesByProject}
          onClose={() => setShowNewTaskModal(false)}
          onSave={handleCreateTask}
          projects={projects}
          roles={roles}
        />
      )}
    </div>
  )
}
