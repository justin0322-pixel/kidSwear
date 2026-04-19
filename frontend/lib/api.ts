import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

let _token: string | null = null

export function setApiToken(token: string | null): void {
  _token = token
}

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  if (_token) config.headers.Authorization = `Bearer ${_token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error: import('axios').AxiosError) => {
    const original = error.config as import('axios').InternalAxiosRequestConfig & { _retry?: boolean }
    // 不攔截 refresh 端點本身，避免無限循環
    if (original?.url?.includes('/auth/refresh')) return Promise.reject(error)

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true
      try {
        const { data } = await axios.post<{ data: { accessToken: string } }>(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        )
        const newToken = data.data.accessToken
        setApiToken(newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        setApiToken(null)
        if (typeof window !== 'undefined') {
          const path = window.location.pathname
          if (!path.startsWith('/login') && !path.startsWith('/register')) {
            window.location.href = '/login'
          }
        }
      }
    }
    return Promise.reject(error)
  },
)

export type ApiResponse<T> = { success: boolean; data: T }
export type PaginatedResponse<T> = ApiResponse<T[]> & {
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}
