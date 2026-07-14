import axios from 'axios'

const baseUrl = import.meta.env.VITE_API_URL

const api = axios.create({
  baseURL: `${baseUrl}/api/v1`,
})

export type InvoiceDetail = {
  invoice_id: string
  project_id: string
  project_name: string | null
  invoice_number: string
  invoice_date: string | null
  invoice_amount: string | null
  paid_date: string | null
}

export type InvoiceListResponse = {
  data: InvoiceDetail[]
  count: number
  total: string
}

export const invoicesApi = {
  // Invoices issued since `since` that are overdue (unpaid after 14 days)
  getFinishedInvoices: (since: string) =>
    api.get<InvoiceListResponse>(`/invoices/finish/${since}`).then(res => res.data),

  // Invoices not yet issued on projects due on or before `before`
  getExpectedInvoices: (before: string) =>
    api.get<InvoiceListResponse>(`/invoices/expected/${before}`).then(res => res.data),
}
