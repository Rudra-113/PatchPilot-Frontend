import type { Settings } from '@/types/api'
import { request } from '@/services/client'

export function getSettings() {
  return request<Settings>('/settings')
}

export function updateSettings(patch: Partial<Settings>) {
  return request<Settings>('/settings', { method: 'PUT', body: patch })
}
