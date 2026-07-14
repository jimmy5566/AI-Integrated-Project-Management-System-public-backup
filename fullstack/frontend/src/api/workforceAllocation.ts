import { api } from './client'

export type ProjectAssignmentWithRole = {
  employee_name?: string | null
  role_name?: string | null
  role_in_project?: string | null
}

export type ProjectDetailWithRolesResponse = {
  project_id: string
  assignments: ProjectAssignmentWithRole[]
}

export type WorkforceAllocationEntry = {
  assignment_id: string
  project_id: string
  employee_id: string | null
  employee_name: string | null
  role_id: string | null
  role_name: string | null
  created_at: string | null
}

export type WorkforceAllocationListResponse = {
  project_id: string
  assignments: WorkforceAllocationEntry[]
  count: number
}

export type WorkforceAssignmentPayload = {
  user_id: string
  role_id: string
}

export type WorkforceDeletePayload = {
  user_ids: string[]
}

export type WorkforceAssignmentResult = {
  id: string
  project_id: string
  employee_id?: string | null
  role_id?: string | null
  created_at?: string | null
}

export type WorkforceAssignResponse = {
  assigned: number
  data: WorkforceAssignmentResult[]
}

export type WorkforceRemoveResponse = {
  removed: number
  message: string
}

export const workforceAllocationApi = {
  getWorkforceAllocations: (projectId: string) =>
    api
      .get<WorkforceAllocationListResponse>(`/project/${projectId}/workforce-allocate`)
      .then((res) => res.data),

  getProjectWithRoles: (projectId: string) =>
    api
      .get<ProjectDetailWithRolesResponse>(`/projects/${projectId}/with-roles`)
      .then((res) => res.data),

  assignWorkforce: (projectId: string, payload: WorkforceAssignmentPayload[]) =>
    api
      .post<WorkforceAssignResponse>(`/project/${projectId}/workforce-allocate`, payload)
      .then((res) => res.data),

  removeWorkforce: (projectId: string, payload: WorkforceDeletePayload) =>
    api
      .delete<WorkforceRemoveResponse>(`/project/${projectId}/workforce-allocate`, {
        data: payload,
      })
      .then((res) => res.data),
}
