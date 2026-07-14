import { api } from './client'


api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});




export type Material = {
    id: string,
    name: string,
    ordered_date: string | null,
    status: string,
    subcontractor_id: string | null,
    project_id: string
}

export type CreateMaterialRequest = {
  project_id: string
  name: string
  status: string
  subcontractor_id: string | null
  ordered_date: string | null
}


export const materialsApi = {
    getOrders: () => api.get<Material[]>('/materials').then(res => res.data),
    getUnreceivedOrders: () => api.get<Material[]>('/materials?status=ordered').then(res => res.data),

    createOrder: (
    projectId: string,
    data: CreateMaterialRequest
  ) =>
    api
      .post<Material>(`/projects/${projectId}/materials`, data)
      .then(res => res.data),
}
