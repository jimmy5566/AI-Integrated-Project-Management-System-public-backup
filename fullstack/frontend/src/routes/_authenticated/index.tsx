import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import {
  FolderKanban,
  CheckSquare,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Clock,
  Plus,
  ArrowRight,
  Building2,
  Users,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  Building,
} from 'lucide-react'

import { Bar, Pie } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'

import { useQuery } from "@tanstack/react-query"
import { projectsApi } from "../../api/project"
import { invoicesApi } from "../../api/invoices"
import { usersApi } from "../../api/users"

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

export const Route = createFileRoute('/_authenticated/')({
  component: Dashboard,
})

// ---------------------------------------------------------------------------
// Static data (charts + AI section — unchanged)
// ---------------------------------------------------------------------------

const projectData = [
  { month: 'Jan', completed: 4, inProgress: 8 },
  { month: 'Feb', completed: 6, inProgress: 7 },
  { month: 'Mar', completed: 8, inProgress: 9 },
  { month: 'Apr', completed: 5, inProgress: 12 },
  { month: 'May', completed: 9, inProgress: 10 },
  { month: 'Jun', completed: 7, inProgress: 11 },
]

const taskStatusData = [
  { name: 'Completed', value: 45, color: '#10b981' },
  { name: 'In Progress', value: 32, color: '#3b82f6' },
  { name: 'Pending', value: 18, color: '#f59e0b' },
  { name: 'Overdue', value: 5, color: '#ef4444' },
]

const aiAlerts = [
  {
    id: 1,
    severity: 'high',
    message: 'Soil testing deadline approaching for Highway Bridge project',
    project: 'Highway Bridge Restoration',
    action: 'Schedule with GeoCon Labs',
  },
  {
    id: 2,
    severity: 'medium',
    message: 'Milestone 3 completed but not invoiced - Downtown Office Complex',
    project: 'Downtown Office Complex',
    action: 'Generate invoice',
  },
  {
    id: 3,
    severity: 'medium',
    message: 'Timber framing order deadline in 3 days',
    project: 'Residential Tower Foundation',
    action: 'Contact supplier',
  },
]

const recentTasks = [
  { id: 1, title: 'Structural analysis review', project: 'Downtown Office Complex', due: '2026-04-02', assignee: 'Sarah Chen' },
  { id: 2, title: 'Foundation inspection', project: 'Residential Tower Foundation', due: '2026-04-03', assignee: 'Mike Rodriguez' },
  { id: 3, title: 'Submit permit application', project: 'Highway Bridge Restoration', due: '2026-04-05', assignee: 'Harri Rassias' },
]

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

type DueToggle = 'today' | 'tomorrow' | 'this_week' | 'next_week' | 'this_month' | 'next_month'

const DUE_TOGGLE_LABELS: Record<DueToggle, string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  this_week: 'This Week',
  next_week: 'Next Week',
  this_month: 'This Month',
  next_month: 'Next Month',
}

function formatDateForApi(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

function midnight(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

function getToggleRange(option: DueToggle): { rangeStart: Date; rangeEnd: Date } {
  const today = midnight(new Date())

  switch (option) {
    case 'today':
      return { rangeStart: today, rangeEnd: today }

    case 'tomorrow': {
      const d = new Date(today)
      d.setDate(d.getDate() + 1)
      return { rangeStart: d, rangeEnd: d }
    }

    case 'this_week': {
      const day = today.getDay()
      const end = new Date(today)
      end.setDate(today.getDate() + (day === 0 ? 0 : 7 - day))
      return { rangeStart: today, rangeEnd: end }
    }

    case 'next_week': {
      const day = today.getDay()
      const start = new Date(today)
      start.setDate(today.getDate() + (day === 0 ? 1 : 8 - day))
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return { rangeStart: start, rangeEnd: end }
    }

    case 'this_month': {
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { rangeStart: today, rangeEnd: end }
    }

    case 'next_month': {
      const start = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 2, 0)
      return { rangeStart: start, rangeEnd: end }
    }
  }
}

function formatCurrency(value: string | number | null | undefined): string {
  const num = parseFloat(String(value ?? '0'))
  if (isNaN(num)) return '$0'
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(num)
}

function daysOverdue(dueDateStr: string | null): number {
  if (!dueDateStr) return 0
  const due = midnight(new Date(dueDateStr))
  const today = midnight(new Date())
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86400000))
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

function Dashboard() {
  const [dueToggle, setDueToggle] = useState<DueToggle>('this_month')
  const [toggleOpen, setToggleOpen] = useState(false)

  type HoursFilter = 'all_time' | 'this_week' | 'this_month'
  const [hoursFilter, setHoursFilter] = useState<HoursFilter>('this_month')

  const HOURS_FILTER_LABELS: Record<HoursFilter, string> = {
    all_time: 'All Time',
    this_week: 'This Week',
    this_month: 'This Month',
  }

  const hoursSinceStr = useMemo(() => {
    const now = new Date()
    if (hoursFilter === 'this_month') {
      return formatDateForApi(new Date(now.getFullYear(), now.getMonth(), 1))
    }
    if (hoursFilter === 'this_week') {
      const day = now.getDay()
      const monday = new Date(now)
      monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
      monday.setHours(0, 0, 0, 0)
      return formatDateForApi(monday)
    }
    return '01-01-2000'
  }, [hoursFilter])

  const { rangeStart, rangeEnd, apiDateStr } = useMemo(() => {
    const { rangeStart, rangeEnd } = getToggleRange(dueToggle)
    return { rangeStart, rangeEnd, apiDateStr: formatDateForApi(rangeEnd) }
  }, [dueToggle])

  const { startOfMonthStr, endOfMonthStr } = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { startOfMonthStr: formatDateForApi(start), endOfMonthStr: formatDateForApi(end) }
  }, [])

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAllProjects,
  })

  const { data: dueProjectsData } = useQuery({
    queryKey: ['projectsDue', apiDateStr],
    queryFn: () => projectsApi.getProjectsExpectedByDate(apiDateStr),
  })

  const { data: overdueProjectsData, isLoading: overdueLoading } = useQuery({
    queryKey: ['overdueProjects'],
    queryFn: projectsApi.getOverdueProjects,
  })

  const { data: overdueInvoicesData } = useQuery({
    queryKey: ['invoicesFinish', startOfMonthStr],
    queryFn: () => invoicesApi.getFinishedInvoices(startOfMonthStr),
  })

  const { data: expectedInvoicesData } = useQuery({
    queryKey: ['invoicesExpected', endOfMonthStr],
    queryFn: () => invoicesApi.getExpectedInvoices(endOfMonthStr),
  })

  const [showCompanyStats, setShowCompanyStats] = useState(false)

  const { data: activeData } = useQuery({
    queryKey: ['activeCount'],
    queryFn: projectsApi.getCurrentProjectCount,
  })

  const { data: employeeHoursData, isLoading: hoursLoading } = useQuery({
    queryKey: ['employeeHours', hoursSinceStr],
    queryFn: () => usersApi.getEmployeeHours(hoursSinceStr),
  })

  const dueCount = useMemo(() => {
    if (!dueProjectsData?.data) return 0
    return dueProjectsData.data.filter(p => {
      if (!p.due_date) return false
      const d = midnight(new Date(p.due_date))
      return d >= rangeStart && d <= rangeEnd
    }).length
  }, [dueProjectsData, rangeStart, rangeEnd])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome back! Here's your project overview.</p>
        </div>
        <Link
          to="/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          New Project
        </Link>
      </div>

      {/* ── Stats Row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* 1 — Active Projects */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Projects</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {projectsData?.count ?? 0}
              </p>
              <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                <TrendingUp size={16} /> {activeData?.current_month ?? 0} this month
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <FolderKanban className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        {/* 2 — Projects Due (toggle) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">Projects Due</p>
                <div className="relative">
                  <button
                    onClick={() => setToggleOpen(o => !o)}
                    className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full"
                  >
                    {DUE_TOGGLE_LABELS[dueToggle]}
                    <ChevronDown size={12} />
                  </button>
                  {toggleOpen && (
                    <div className="absolute left-0 top-6 z-20 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1">
                      {(Object.keys(DUE_TOGGLE_LABELS) as DueToggle[]).map(key => (
                        <button
                          key={key}
                          onClick={() => { setDueToggle(key); setToggleOpen(false) }}
                          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                            dueToggle === key ? 'text-blue-600 font-medium' : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {DUE_TOGGLE_LABELS[key]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{dueCount}</p>
              <p className="text-sm text-gray-500 mt-2">projects</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calendar className="text-amber-600" size={24} />
            </div>
          </div>
        </div>

        {/* 3 — Overdue Invoices */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Overdue Invoices</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {overdueInvoicesData?.count ?? 0}
              </p>
              <p className="text-sm text-red-600 mt-2">
                {formatCurrency(overdueInvoicesData?.total)} outstanding
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="text-red-600" size={24} />
            </div>
          </div>
        </div>

        {/* 4 — Expected to Invoice This Month */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">To Invoice This Month</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {expectedInvoicesData?.count ?? 0}
              </p>
              <p className="text-sm text-emerald-600 mt-2">
                {formatCurrency(expectedInvoicesData?.total)} expected
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
              <FileText className="text-emerald-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Company Overall Statistics Dropdown ───────────────────────────────── */}
      {/* <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => setShowCompanyStats(!showCompanyStats)}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
              <Building className="text-indigo-600" size={20} />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Company Overall Statistics</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Click to view company-wide metrics</p>
            </div>
          </div>
          {showCompanyStats ? (
            <ChevronUp className="text-gray-400" size={24} />
          ) : (
            <ChevronDown className="text-gray-400" size={24} />
          )}
        </button>

        {showCompanyStats && (
          <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-lg p-5 border border-indigo-100 dark:border-indigo-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Company Projects</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">47</p>
                  <p className="text-sm text-indigo-600 mt-2 flex items-center gap-1">
                    <TrendingUp size={16} /> +8 this quarter
                  </p>
                </div>
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                  <FolderKanban className="text-indigo-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-5 border border-red-100 dark:border-red-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">At-Risk Projects</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">12</p>
                  <p className="text-sm text-red-600 mt-2">Across all teams</p>
                </div>
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="text-red-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-5 border border-green-100 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Team Utilization</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">87%</p>
                  <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                    <TrendingUp size={16} /> +5% vs last month
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <Users className="text-green-600" size={24} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div> */}
      
      {/* ── Overdue Projects List ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={18} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Overdue Projects</h2>
            {overdueProjectsData?.data && overdueProjectsData.data.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                {overdueProjectsData.data.length}
              </span>
            )}
          </div>
          <Link to="/projects" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
            View All <ArrowRight size={16} />
          </Link>
        </div>

        {overdueLoading ? (
          <div className="px-6 pb-6 text-sm text-gray-500">Loading…</div>
        ) : !overdueProjectsData?.data?.length ? (
          <div className="px-6 pb-6 flex items-center gap-2 text-sm text-green-600">
            <CheckSquare size={16} /> No overdue projects — great work!
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {overdueProjectsData.data.map(project => (
              <Link
                key={project.project_id}
                to="/projects/$projectId"
                params={{ projectId: project.project_id }}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
              >
                <span className="text-xs font-mono font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded flex-shrink-0">
                  {project.job_number}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 truncate">
                    {project.project_name ?? 'Unnamed Project'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{project.client_name}</p>
                </div>

                {project.status && (
                  <span className="hidden sm:inline-flex px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                    {project.status}
                  </span>
                )}

                <div className="text-right flex-shrink-0">
                  <p className="text-sm text-red-600 font-medium flex items-center gap-1 justify-end">
                    <Clock size={13} />
                    {project.due_date ? new Date(project.due_date).toLocaleDateString('en-AU') : 'No date'}
                  </p>
                  <p className="text-xs text-red-500 mt-0.5">
                    {daysOverdue(project.due_date)} days overdue
                  </p>
                </div>

                {project.fee_estimate != null && (
                  <div className="hidden lg:block text-right flex-shrink-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(project.fee_estimate)}
                    </p>
                    <p className="text-xs text-gray-500">fee</p>
                  </div>
                )}

                <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Employee Working Hours ────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Users className="text-blue-600" size={18} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Employee Working Hours</h2>
            {employeeHoursData && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                {employeeHoursData.count}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {(Object.keys(HOURS_FILTER_LABELS) as HoursFilter[]).map(key => (
              <button
                key={key}
                onClick={() => setHoursFilter(key)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  hoursFilter === key
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {HOURS_FILTER_LABELS[key]}
              </button>
            ))}
          </div>
        </div>

        {hoursLoading ? (
          <div className="px-6 pb-6 text-sm text-gray-500">Loading…</div>
        ) : !employeeHoursData?.data?.length ? (
          <div className="px-6 pb-6 text-sm text-gray-400">No time logs recorded for this period.</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {[...employeeHoursData.data]
              .sort((a, b) => parseFloat(b.working_hours) - parseFloat(a.working_hours))
              .map(emp => (
                <div key={emp.employee_id} className="flex items-center gap-4 px-6 py-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {(emp.name ?? '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {emp.name ?? 'Unknown'}
                    </p>
                    {emp.role && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{emp.role}</p>
                    )}
                  </div>

                  <div className="flex-1 hidden sm:block">
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(100, (parseFloat(emp.working_hours) /
                            Math.max(...employeeHoursData.data.map(e => parseFloat(e.working_hours)))) * 100)}%`
                        }}
                      />
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {parseFloat(emp.working_hours).toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">hrs</span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ── AI Risk Alerts ────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl shadow-sm p-6 border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
            <AlertTriangle className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI Risk Alerts</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Proactive monitoring detected {aiAlerts.length} items requiring attention
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {aiAlerts.map((alert) => (
            <div key={alert.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      alert.severity === 'high'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{alert.project}</span>
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium">{alert.message}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Suggested: {alert.action}</p>
                </div>
                <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap">
                  Take Action
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Charts ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Project Progress Overview</h2>
          <Bar
            data={{
              labels: projectData.map((d) => d.month),
              datasets: [
                { label: 'Completed', data: projectData.map((d) => d.completed), backgroundColor: '#10b981' },
                { label: 'In Progress', data: projectData.map((d) => d.inProgress), backgroundColor: '#3b82f6' },
              ],
            }}
            options={{ responsive: true, plugins: { legend: { position: 'top' } } }}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Task Status Distribution</h2>
          <div className="flex justify-center">
            <div style={{ width: '300px', height: '300px' }}>
              <Pie
                data={{
                  labels: taskStatusData.map((d) => d.name),
                  datasets: [{
                    data: taskStatusData.map((d) => d.value),
                    backgroundColor: taskStatusData.map((d) => d.color),
                  }],
                }}
                options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Projects & Upcoming Tasks ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Projects</h2>
            <Link to="/projects" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View All <ArrowRight size={16} />
            </Link>
          </div>
          <div className="space-y-4">
            {projectsData?.data?.slice(0, 3).map((project: any) => (
              <div key={project.project_id} className="">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 size={16} className="text-gray-400" />
                      <h3 className="font-semibold text-gray-900 dark:text-white">{project.project_name}</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{project.client_name}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {project.status?.toUpperCase()}
                      </span>
                      <span className="text-gray-500 flex items-center gap-1">
                        <Clock size={14} />
                        Due {project.due_date ? new Date(project.due_date).toLocaleDateString() : 'TBD'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {project.progress ?? 0}%
                    </div>
                    <div className="text-sm text-gray-500">Complete</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${project.progress ?? 0}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Upcoming Deadlines</h2>
          <div className="space-y-3">
            {recentTasks.map((task) => (
              <div key={task.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-1">{task.title}</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{task.project}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Clock size={12} /> {new Date(task.due).toLocaleDateString()}
                  </span>
                  <span className="text-blue-600 flex items-center gap-1">
                    <Users size={12} /> {task.assignee}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="h-4" />
    </div>
  )
}
