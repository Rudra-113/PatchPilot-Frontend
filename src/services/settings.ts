import type { Settings } from '@/types/api'
import { liveGetSettings, liveUpdateSettings } from '@/services/live-workspace'
import { mockRequest } from '@/services/mock/router'
import { isDemoSession, readSession } from '@/services/session-store'

export async function getSettings() {
  if (isDemoSession()) return mockRequest<Settings>('/api/v1/settings', { session: readSession() })
  return liveGetSettings()
}

export async function updateSettings(patch: Partial<Settings>) {
  if (isDemoSession()) return mockRequest<Settings>('/api/v1/settings', { method: 'PUT', body: patch, session: readSession() })
  return liveUpdateSettings(patch)
}