import { projectsApi, Project } from '@/api/project';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Plus,
  Building2,
  Calendar,
  MapPin,
  Clock,
  User,
  TrendingUp,
  CheckCircle2,
  Circle,
} from 'lucide-react'

export const Route = createFileRoute('/_authenticated/projects/')({
  component: Projects,
})

// Color-coded due date helper based on Harri's spec
const getDueDateColor = (dueDate: string | undefined, status: string) => {
  if (!dueDate) return 'text-gray-500 dark:text-gray-400'
  const isDone = status === 'completed & invoiced' || status === 'to be invoiced'
  if (isDone) return 'text-gray-500 dark:text-gray-400'
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

const getDueDateLabel = (dueDate: string | undefined, status: string) => {
  if (!dueDate) return null
  const isDone = status === 'completed & invoiced' || status === 'to be invoiced'
  if (isDone) return null
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


const IN_PROGRESS_STATUSES = ['prelim', 'proposal', 'design & doc', 'amendment', 'hold']
const TO_BE_INVOICED_STATUSES = ['to be invoiced']
const COMPLETED_STATUSES = ['completed & invoiced', 'Eng/QA Review', 'construction']

const getStatusColor = (status: string) => {
  switch (status) {
    case 'prelim':
    case 'proposal':
    case 'design & doc':
    case 'amendment':
    case 'hold':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'      
    case 'to be invoiced':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    case 'completed & invoiced':
    case 'Eng/QA Review':
    case 'construction':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
  }
}

const ProjectCard = ({ project }: { project: Project }) => {
  const dueDateColor = getDueDateColor(project.due_date, project.status)
  const dueDateLabel = getDueDateLabel(project.due_date, project.status)

  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.project_id }}
      className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
              {project.job_number}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(project.status)}`}>
              {project.status}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            {project.project_name}
          </h3>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Building2 size={14} className="flex-shrink-0" />
          <span className="truncate">{project.company_name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <MapPin size={14} className="flex-shrink-0" />
          <span className="truncate">{project.company_address}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <User size={14} className="flex-shrink-0" />
          <span className="truncate">{project.client_name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Calendar size={14} className="flex-shrink-0" />
          <span>{new Date(project.start_date).toLocaleDateString()}</span>
        </div>
        {project.due_date && (
          <div className={`flex items-center gap-2 text-sm ${dueDateColor}`}>
            <Clock size={14} className="flex-shrink-0" />
            <span>
              Due: {new Date(project.due_date).toLocaleDateString()}
              {dueDateLabel && <span className="ml-1">· {dueDateLabel}</span>}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Clock size={14} className="flex-shrink-0" />
          <span>{project.days_elapsed} days elapsed</span>
        </div>
      </div>

      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
          <span className="text-xs font-semibold text-gray-900 dark:text-white">{project.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              project.progress === 100
                ? 'bg-green-600'
                : project.progress > 0
                ? 'bg-blue-600'
                : 'bg-gray-400'
            }`}
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">Fee Estimate</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white">{project.fee_estimate}</span>
        </div>
      </div>
    </Link>
  )
}

function Projects() {
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAllProjects,
  });
  console.log('Fetched projects:', projectsData)
  const inProgress = projectsData?.data.filter((p) => IN_PROGRESS_STATUSES.includes(p.status)) || []
  const toBeInvoiced = projectsData?.data.filter((p) => TO_BE_INVOICED_STATUSES.includes(p.status)) || []
  const completed = projectsData?.data.filter((p) => COMPLETED_STATUSES.includes(p.status)) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage all your engineering projects
          </p>
        </div>
        <Link
          to="/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          New Project
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border-2 border-yellow-200 dark:border-yellow-800 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-400">In Progress</h3>
            <Circle className="text-yellow-600 dark:text-yellow-400" size={24} />
          </div>
          <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-400">{inProgress.length}</p>
          <p className="text-sm text-yellow-700 dark:text-yellow-500 mt-1">projects pending</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl border-2 border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-blue-900 dark:text-blue-400">To Be Invoiced</h3>
            <TrendingUp className="text-blue-600 dark:text-blue-400" size={24} />
          </div>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-400">{toBeInvoiced.length}</p>
          <p className="text-sm text-blue-700 dark:text-blue-500 mt-1">projects to be invoiced</p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/10 rounded-xl border-2 border-green-200 dark:border-green-800 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-green-900 dark:text-green-400">Completed</h3>
            <CheckCircle2 className="text-green-600 dark:text-green-400" size={24} />
          </div>
          <p className="text-3xl font-bold text-green-900 dark:text-green-400">{completed.length}</p>
          <p className="text-sm text-green-700 dark:text-green-500 mt-1">completed projects</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">In Progress</h2>
            <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">({inProgress.length})</span>
          </div>
          <div className="space-y-4">
            {inProgress.length > 0 ? (
              inProgress.map((project) => <ProjectCard key={project.job_number} project={project} />)
            ) : (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <Circle size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No projects to start</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">To be Invoiced</h2>
            <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">({toBeInvoiced.length})</span>
          </div>
          <div className="space-y-4">
            {toBeInvoiced.length > 0 ? (
              toBeInvoiced.map((project) => <ProjectCard key={project.project_id} project={project} />)
            ) : (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <TrendingUp size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No active projects</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Completed</h2>
            <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">({completed.length})</span>
          </div>
          <div className="space-y-4">
            {completed.length > 0 ? (
              completed.map((project) => <ProjectCard key={project.project_id} project={project} />)
            ) : (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <CheckCircle2 size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No completed projects</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}