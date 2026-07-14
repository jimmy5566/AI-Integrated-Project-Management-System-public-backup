
import { api } from './client'


api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


export type Subcontractor = {
    id: string
    company_name: string
    contact_email: string | null
    phone: string | null
    specialty?: string | null
}

export const subcontractorsApi = {
    getSubcontractors: () => api.get<Subcontractor[]>('/subcontractors').then(res => res.data),
    createSubcontractor: (subcontractor: Omit<Subcontractor, 'id'>) => api.post<Subcontractor>('/subcontractors', subcontractor).then(res => res.data)
}
