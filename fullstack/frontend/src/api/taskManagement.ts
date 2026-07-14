import { api } from './client'
import type { Project, ProjectsResponse } from './project'

export type Role = {
  id: string
  role_name: string
  description?: string | null
  is_active: boolean
  created_at?: string | null
}

export type RolesResponse = {
  data: Role[]
  count: number
}

export type ProjectTaskNode = {
  id: string
  milestone_id: string
  parent_task_id?: string | null
  task_name: string
  task_description?: string | null
  due_date?: string | null
  milestone_status?: string | null
  core_phase_name?: string | null
  assigned_role_id?: string | null
  assigned_role_name?: string | null
  allocated_hours?: number | string | null
  completion_date?: string | null
  invoice_amount?: number | string | null
  fee_final?: number | string | null
  is_excluded: boolean
  paid_date?: string | null
  children: ProjectTaskNode[]
}

export type ProjectMilestoneNode = {
  id: string
  project_id: string
  milestone_name: string
  description_type?: string | null
  due_date?: string | null
  completion_date?: string | null
  is_complete: boolean
  display_order?: number | null
  tasks: ProjectTaskNode[]
}

export type ProjectTaskManagementResponse = {
  project_id: string
  milestones: ProjectMilestoneNode[]
}

export type ProjectTaskPayload = {
  task_name: string
  task_description?: string | null
  due_date?: string | null
  parent_task_id?: string | null
  assigned_role_id?: string | null
  allocated_hours?: number | null
  milestone_status?: string | null
  core_phase_name?: string | null
}

export type ProjectTaskUpdatePayload = Partial<ProjectTaskPayload> & {
  completion_date?: string | null
  invoice_amount?: number | null
  fee_final?: number | null
  is_excluded?: boolean | null
  paid_date?: string | null
}

export const taskManagementApi = {
  getProjects: () => api.get<ProjectsResponse>('/projects').then((res) => res.data),
  getRoles: () => api.get<RolesResponse>('/roles/').then((res) => res.data),
  getProjectTaskManagement: (projectId: string) =>
    api
      .get<ProjectTaskManagementResponse>(`/projects/${projectId}/task-management`)
      .then((res) => res.data),
  createTask: (projectId: string, milestoneId: string, payload: ProjectTaskPayload) =>
    api
      .post<ProjectTaskNode>(`/projects/${projectId}/milestones/${milestoneId}/tasks`, payload)
      .then((res) => res.data),
  updateTask: (projectId: string, taskId: string, payload: ProjectTaskUpdatePayload) =>
    api.patch<ProjectTaskNode>(`/projects/${projectId}/tasks/${taskId}`, payload).then((res) => res.data),
  deleteTask: (projectId: string, milestoneId: string, taskId: string) =>
    api.delete(`/projects/${projectId}/milestones/${milestoneId}/tasks/${taskId}`).then((res) => res.data),
}

export type ProjectTaskManagementProject = Project
