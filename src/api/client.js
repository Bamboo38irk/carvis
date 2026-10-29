import axios from 'axios'
import { localAdapter } from './localAdapter.js'

const TOKEN_KEY = 'carvis.token'

export const tokenStorage = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      return
    }
  },
}

export const http = axios.create({ adapter: localAdapter })

http.interceptors.request.use((request) => {
  const token = tokenStorage.get()
  if (token) {
    request.headers.Authorization = `Bearer ${token}`
  }
  return request
})

let onUnauthorized = null

export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler
}

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const payload = error.response?.data?.error
    const isAuthCall = error.config?.url?.includes('/auth/login')

    if (status === 401 && onUnauthorized && !isAuthCall) {
      onUnauthorized()
    }

    const normalized = new Error(payload?.message ?? 'Не удалось выполнить запрос')
    normalized.status = status
    normalized.details = payload?.details ?? null
    normalized.payload = error.response?.data ?? null
    return Promise.reject(normalized)
  },
)
