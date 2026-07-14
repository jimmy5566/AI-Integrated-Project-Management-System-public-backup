import axios, { AxiosError } from 'axios'

const baseUrl = import.meta.env.VITE_API_URL

export const api = axios.create({
  baseURL: `${baseUrl}/api/v1`,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response && [401, 403].includes(error.response.status)) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export const getApiErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.map((item) => item.msg).join(', ')
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'Something went wrong'
}
