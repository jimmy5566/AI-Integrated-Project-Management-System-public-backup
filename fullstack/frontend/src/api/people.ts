import { api } from "./client"

export type EmployeeDirectoryItem = {
  id: string
  first_name: string
  last_name: string
  full_name?: string | null
  email?: string | null
  phone?: string | null
  role_title?: string | null
  role_id?: string | null
  role_name?: string | null
  is_active?: boolean
  created_at?: string | null
  updated_at?: string | null
}

export type EmployeesDirectoryResponse = {
  data: EmployeeDirectoryItem[]
  count: number
}

export type CustomerDirectoryItem = {
  id: string
  contact_name?: string | null
  email?: string | null
  current_status?: string | null
  remarks?: string | null
  order_type_id?: string | null
  executed_at?: string | null
  created_at?: string | null
}

export type CustomersDirectoryResponse = {
  data: CustomerDirectoryItem[]
  count: number
}

export const peopleApi = {
  getEmployees: () =>
    api.get<EmployeesDirectoryResponse>("/employees/").then((res) => res.data),

  getCustomers: () =>
    api.get<CustomersDirectoryResponse>("/customers/").then((res) => res.data),
}
