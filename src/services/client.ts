import { ApiError } from '@/services/errors'
import { mockRequest } from '@/services/mock/router'
import { readSession } from '@/services/session-store'

export const API_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'https://patchpilot-backend-production.up.railway.app'
)
  .trim()
  .replace(/\/$/, '')
  .replace(/\/api\/v1$/, '')

const API_PREFIX = '/api/v1'

function isLocalOrigin(value: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(value)
}

export function apiBase() {
  const stored = localStorage.getItem('patchpilot.apiBaseUrl')?.trim().replace(/\/$/, '').replace(/\/api\/v1$/, '') ?? ''
  if (stored && !isLocalOrigin(stored)) return stored
  return API_URL
}

export function apiPath(path: string) {
  const hashAt = path.indexOf('#')
  const hash = hashAt >= 0 ? path.slice(hashAt) : ''
  const withoutHash = hashAt >= 0 ? path.slice(0, hashAt) : path
  const queryAt = withoutHash.indexOf('?')
  const pathname = queryAt >= 0 ? withoutHash.slice(0, queryAt) : withoutHash
  const search = queryAt >= 0 ? withoutHash.slice(queryAt) : ''
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`
  const prefixed = normalized === API_PREFIX || normalized.startsWith(`${API_PREFIX}/`) ? normalized : `${API_PREFIX}${normalized}`
  return `${prefixed}${search}${hash}`
}

export function apiUrl(path: string) {
  const suffix = apiPath(path)
  const base = apiBase()
  // Railway only allows specific browser origins. Call the API through the
  // same-origin /api proxy (Vite, Netlify, or Vercel) whenever the page is
  // hosted somewhere else. The proxy target is API_URL.
  if (typeof window !== 'undefined') {
    try {
      if (new URL(base).origin !== window.location.origin) return suffix
    } catch {
      return suffix
    }
  }
  return `${base}${suffix}`
}

function errorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== 'object') return fallback
  const record = data as { message?: unknown; detail?: unknown }
  if (typeof record.message === 'string' && record.message.trim()) return record.message
  if (typeof record.detail === 'string' && record.detail.trim()) return record.detail
  if (Array.isArray(record.detail)) {
    const parts = record.detail.map((item) => {
      if (item && typeof item === 'object' && 'msg' in item) return String((item as { msg: unknown }).msg)
      return String(item)
    })
    const text = parts.filter(Boolean).join('; ')
    if (text) return text
  }
  return fallback
}

export async function request<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const base = apiBase()
  const session = readSession()
  if (!base) return mockRequest<T>(path, { ...init, session })
  const url = apiUrl(path)
  const method = init?.method ?? 'GET'
  const payload = init?.body
  const isForm = typeof FormData !== 'undefined' && payload instanceof FormData
  let response: Response
  try {
    response = await fetch(url, {
      method,
      credentials: 'omit',
      headers: {
        Accept: 'application/json',
        ...(payload !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
      },
      body: payload === undefined ? undefined : isForm ? payload : JSON.stringify(payload),
    })
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'network error'
    throw new ApiError(0, `The PatchPilot API could not be reached (${url}): ${reason}`)
  }
  if (!response.ok) {
    const fallback = response.statusText || 'Request failed.'
    const raw = await response.text()
    let message = fallback
    if (raw) {
      try {
        message = errorMessage(JSON.parse(raw), fallback)
      } catch {
        const snippet = raw.replace(/\s+/g, ' ').trim().slice(0, 180)
        message = snippet.startsWith('<') ? `${fallback} (HTTP ${response.status})` : snippet || fallback
      }
    }
    throw new ApiError(response.status, message)
  }
  if (response.status === 204) return undefined as T
  const text = await response.text()
  if (!text) return undefined as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw new ApiError(response.status, `The API returned a response that was not JSON from ${url}.`)
  }
}

export { ApiError }
