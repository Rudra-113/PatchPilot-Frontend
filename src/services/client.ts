import { mockRequest } from '@/services/mock/router'
import { readSession } from '@/services/session-store'
import { ApiError } from '@/services/errors'

export function apiBase() {
  const stored = localStorage.getItem('patchpilot.apiBaseUrl')?.trim()
  if (stored) return stored.replace(/\/$/, '')
  return (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '')
}

export async function request<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const base = apiBase()
  const session = readSession()
  if (!base) return mockRequest<T>(path, { ...init, session })
  let response: Response
  try {
    response = await fetch(`${base}${path}`, {
      method: init?.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
      },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    })
  } catch {
    throw new ApiError(0, 'The PatchPilot API could not be reached.')
  }
  if (!response.ok) {
    let message = response.statusText || 'Request failed.'
    try {
      const data = (await response.json()) as { message?: string; detail?: string }
      message = data.message || data.detail || message
    } catch {
      /* The body was not JSON. */
    }
    throw new ApiError(response.status, message)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export { ApiError }
