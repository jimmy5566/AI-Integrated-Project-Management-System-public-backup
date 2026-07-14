import axios from "axios"

import { OpenAPI, type UserPublic, UsersService } from "@/client"

export type AdminUserDetail = {
  id: string
  email: string
  full_name?: string | null
  role?: string | null
}

type AdminUsersDetailResponse = {
  data: AdminUserDetail[]
  count: number
}

type ProjectSummary = {
  project_id: string
  project_name?: string | null
  client_name?: string | null
  project_manager_name?: string | null
  days_since_started?: number | null
}

type ProjectsListResponse = {
  data: ProjectSummary[]
  count: number
}

type MonthlyCountResponse = {
  current_month: number
  previous_month: number
}

type MonthlyInvoiceResponse = {
  current_month_total: number | string
  previous_month_total: number | string
}

export type AdminDashboardData = {
  activeProjectsCurrentMonth: number
  activeProjectsPreviousMonth: number
  completedProjectsCurrentMonth: number
  completedProjectsPreviousMonth: number
  invoiceCurrentMonth: number
  invoicePreviousMonth: number
  ongoingProjects: ProjectSummary[]
  delayedProjects: ProjectSummary[]
}

const api = axios.create({
  baseURL: OpenAPI.BASE,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

const toNumber = (value: number | string) =>
  typeof value === "number" ? value : Number(value)

export async function readAdminUsers(): Promise<AdminUsersDetailResponse> {
  const { data } = await api.get<AdminUsersDetailResponse>("/api/v1/users/all-users")
  return data
}

export async function readAdminDashboardData(): Promise<AdminDashboardData> {
  const [allProjects, delayedProjects, activeCount, completedCount, invoice] =
    await Promise.all([
      api.get<ProjectsListResponse>("/api/v1/projects/all-project"),
      api.get<ProjectsListResponse>("/api/v1/projects/delay-project"),
      api.get<MonthlyCountResponse>("/api/v1/projects/current-project-num"),
      api.get<MonthlyCountResponse>("/api/v1/projects/completed-project"),
      api.get<MonthlyInvoiceResponse>("/api/v1/projects/invoice-bill"),
    ])

  return {
    activeProjectsCurrentMonth: activeCount.data.current_month,
    activeProjectsPreviousMonth: activeCount.data.previous_month,
    completedProjectsCurrentMonth: completedCount.data.current_month,
    completedProjectsPreviousMonth: completedCount.data.previous_month,
    invoiceCurrentMonth: toNumber(invoice.data.current_month_total),
    invoicePreviousMonth: toNumber(invoice.data.previous_month_total),
    ongoingProjects: allProjects.data.data,
    delayedProjects: delayedProjects.data.data,
  }
}

export async function readUsersWithDetails() {
  const [usersPublic, usersDetail] = await Promise.all([
    UsersService.readUsers({ skip: 0, limit: 100 }),
    readAdminUsers(),
  ])

  const detailById = new Map(usersDetail.data.map((user) => [user.id, user]))

  return usersPublic.data.map((user: UserPublic) => {
    const detail = detailById.get(user.id)
    return {
      ...user,
      role_name: detail?.role ?? (user.is_superuser ? "Superuser" : "User"),
    }
  })
}
