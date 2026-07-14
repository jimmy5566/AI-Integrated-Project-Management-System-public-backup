import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import {
  Building2,
  CalendarDays,
  TrendingDown,
  TrendingUp,
  FolderKanban,
  CheckSquare,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react"
import { projectsApi, type ProjectSummary } from "../../api/project"

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminProjects,
  head: () => ({
    meta: [{ title: "Admin Dashboard - GAMA FLOW" }],
  }),
})

function formatCurrency(value: string | number | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0)
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  const pct = pctChange(current, previous)
  if (pct === null) return null
  const up = pct >= 0
  return (
    <div className={`flex flex-col items-end ${up ? "text-emerald-500" : "text-red-400"}`}>
      {up ? <TrendingUp className="ml-auto size-8" /> : <TrendingDown className="ml-auto size-8" />}
      <p className="mt-1 text-2xl font-semibold">{up ? "+" : ""}{pct}%</p>
    </div>
  )
}

function ProjectRow({ project }: { project: ProjectSummary }) {
  return (
    <div className="grid grid-cols-[1.5fr_1fr_1fr_auto] items-center gap-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <Link
        to="/projects/$projectId"
        params={{ projectId: project.project_id }}
        className="text-base font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate"
      >
        {project.project_name ?? "Untitled Project"}
      </Link>
      <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 truncate">
        <Building2 className="size-4 shrink-0" />
        {project.client_name ?? "—"}
      </p>
      <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 truncate">
        <CalendarDays className="size-4 shrink-0" />
        {project.days_since_started != null ? `${project.days_since_started} days` : "—"}
      </p>
      <Link
        to="/projects/$projectId"
        params={{ projectId: project.project_id }}
        className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        <ArrowRight className="size-4 text-gray-500 dark:text-gray-400" />
      </Link>
    </div>
  )
}

function AdminProjects() {
  const { data: activeCount } = useQuery({
    queryKey: ["admin", "current-project-num"],
    queryFn: projectsApi.getCurrentProjectCount,
  })

  const { data: completedCount } = useQuery({
    queryKey: ["admin", "completed-project"],
    queryFn: projectsApi.getCompletedProjectCount,
  })

  const { data: invoiceBill } = useQuery({
    queryKey: ["admin", "invoice-bill"],
    queryFn: projectsApi.getInvoiceBill,
  })

  const { data: allProjectsData, isLoading: allLoading } = useQuery({
    queryKey: ["admin", "all-projects"],
    queryFn: projectsApi.getAllActiveProjects,
  })

  const { data: delayedData, isLoading: delayedLoading } = useQuery({
    queryKey: ["admin", "delayed-projects"],
    queryFn: projectsApi.getDelayedProjects,
  })

  const currentActive = activeCount?.current_month ?? 0
  const previousActive = activeCount?.previous_month ?? 0
  const currentCompleted = completedCount?.current_month ?? 0
  const previousCompleted = completedCount?.previous_month ?? 0
  const currentInvoice = invoiceBill?.current_month_total ?? "0"
  const previousInvoice = invoiceBill?.previous_month_total ?? "0"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Project overview and management</p>
        </div>
        <Link
          to="/"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <LayoutDashboard size={16} />
          Switch to User View
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FolderKanban className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Projects This Month</h2>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-4xl font-bold text-gray-900 dark:text-white">{currentActive}</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">prev. month: {previousActive}</p>
            </div>
            <TrendBadge current={currentActive} previous={previousActive} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <CheckSquare className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed Projects This Month</h2>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-4xl font-bold text-gray-900 dark:text-white">{currentCompleted}</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">prev. month: {previousCompleted}</p>
            </div>
            <TrendBadge current={currentCompleted} previous={previousCompleted} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <DollarSign className="size-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Invoiced This Month</h2>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(currentInvoice)}</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">prev. month: {formatCurrency(previousInvoice)}</p>
            </div>
            <TrendBadge
              current={parseFloat(currentInvoice)}
              previous={parseFloat(previousInvoice)}
            />
          </div>
        </div>
      </div>

      {/* All active projects */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderKanban className="size-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Active Projects
              {allProjectsData && (
                <span className="ml-2 text-sm font-normal text-gray-400">({allProjectsData.count})</span>
              )}
            </h3>
          </div>
        </div>

        {allLoading ? (
          <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {(allProjectsData?.data ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No active projects found.</p>
            ) : (
              (allProjectsData?.data ?? []).map((project) => (
                <ProjectRow key={project.project_id} project={project} />
              ))
            )}
          </div>
        )}
      </div>

      {/* Delayed projects */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="size-5 text-amber-500" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Delayed Projects
            {delayedData && (
              <span className="ml-2 text-sm font-normal text-gray-400">({delayedData.count})</span>
            )}
          </h3>
        </div>

        {delayedLoading ? (
          <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {(delayedData?.data ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No delayed projects.</p>
            ) : (
              (delayedData?.data ?? []).map((project) => (
                <ProjectRow key={project.project_id} project={project} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
