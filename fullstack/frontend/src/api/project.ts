import { api } from './client'

api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export type ProjectSummary = {
  project_id: string
  project_name: string | null
  client_name: string | null
  project_manager_name: string | null
  days_since_started: number | null
}

export type ProjectSummaryResponse = {
  data: ProjectSummary[]
  count: number
}

export type MonthlyCountResponse = {
  current_month: number
  previous_month: number
}

export type MonthlyInvoiceResponse = {
  current_month_total: string
  previous_month_total: string
}

export type Project = {
  job_number: string
  project_id: string
  project_name: string
  contract_title?: string | null
  job_title?: string | null
  company_name: string
  company_address: string
  client_name: string
  status: string
  start_date: string
  due_date: string
  days_elapsed: number
  progress: number | 100
  fee_estimate: string | ""
}

export type ProjectsResponse = {
  data: Project[];
  count: number;
};

export type ProjectTaskManagementMilestone = {
  id: string
  project_id: string
  milestone_name: string
  description_type?: string | null
  due_date?: string | null
  completion_date?: string | null
  is_complete: boolean
  progress: number
  display_order?: number | null
}

export type ProjectTaskManagementResponse = {
  project_id: string
  milestones: ProjectTaskManagementMilestone[]
}

export type ProjectMilestonePayload = {
  milestone_name?: string
  description_type?: string | null
  due_date?: string | null
  completion_date?: string | null
  is_complete?: boolean
  progress?: number
  display_order?: number | null
}



// src/api/projects.ts
export const projectsApi = {
  //  @router.get("/current-project-num")
  getCurrentProjectCount: () => api.get<MonthlyCountResponse>('/projects/current-project-num').then(res => res.data),

  //  @router.get("") 
  getAllProjects: () => api.get<ProjectsResponse>('/projects').then(res => res.data),

  // @router.get("?status={status}")
  getProjectsByStatus: (status: string) => api.get<ProjectsResponse>(`/projects?status=${status}`).then(res => res.data),
  

  // @router.get("/{project_id}")
  getProjectById: (projectId: string) => api.get<Project>(`/projects/${projectId}`).then(res => res.data),
  
  // @router.get("/completed-project")
  getCompletedProjectCount: () => api.get<MonthlyCountResponse>('/projects/completed-project').then(res => res.data),

  //  @router.get("/delay-project")
  getDelayedProjects: () => api.get<ProjectSummaryResponse>('/projects/delay-project').then(res => res.data),

  // @router.get("/statuses")
  getProjectStatuses: () => api.get<string[]>('/statuses').then(res => res.data),

  // @router.get("/all-project") superuser only
  getAllActiveProjects: () => api.get<ProjectSummaryResponse>('/projects/all-project').then(res => res.data),

  getProjectTaskManagement: (projectId: string) =>
    api.get<ProjectTaskManagementResponse>(`/projects/${projectId}/task-management`).then(res => res.data),

  createProjectMilestone: (projectId: string, payload: ProjectMilestonePayload) =>
    api.post<ProjectTaskManagementMilestone>(`/projects/${projectId}/milestones`, payload).then(res => res.data),

  updateProjectMilestone: (projectId: string, milestoneId: string, payload: ProjectMilestonePayload) =>
    api.patch<ProjectTaskManagementMilestone>(`/projects/${projectId}/milestones/${milestoneId}`, payload).then(res => res.data),

  deleteProjectMilestone: (projectId: string, milestoneId: string) =>
    api.delete(`/projects/${projectId}/milestones/${milestoneId}`).then(res => res.data),

  // @router.get("/invoice-bill") superuser only
  getInvoiceBill: () => api.get<MonthlyInvoiceResponse>('/projects/invoice-bill').then(res => res.data),

  // @router.get("/overdue")
  getOverdueProjects: () => api.get<ProjectsResponse>('/projects/overdue').then(res => res.data),

  // @router.get("/expected-to-finish/{date}")
  getProjectsExpectedByDate: (date: string) =>
    api.get<ProjectsResponse>(`/projects/expected-to-finish/${date}`).then(res => res.data),
};
