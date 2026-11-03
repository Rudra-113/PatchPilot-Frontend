import type { ActivityEvent, Overview } from '@/types/api'
import { liveActivity, liveOverview } from '@/services/live-workspace'
import { mockRequest } from '@/services/mock/router'
import { isDemoSession, readSession } from '@/services/session-store'

export async function getOverview() {
  if (isDemoSession()) return mockRequest<Overview>('/api/v1/overview', { session: readSession() })
  return liveOverview()
}

export async function listActivity() {
  if (isDemoSession()) return mockRequest<ActivityEvent[]>('/api/v1/activity', { session: readSession() })
  return liveActivity()
}
