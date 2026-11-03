import type { Settings } from '@/types/api'
import { request } from '@/services/client'

export function getSettings() {
  return request<Settings>('/api/v1/settings')
}

export function updateSettings(patch: Partial<Settings>) {
  return request<Settings>('/api/v1/settings', { method: 'PUT', body: patch })
}
