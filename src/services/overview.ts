import type { ActivityEvent, Overview } from '@/types/api'
import { request } from '@/services/client'

export function getOverview() {
  return request<Overview>('/api/v1/overview')
}

export function listActivity() {
  return request<ActivityEvent[]>('/api/v1/activity')
}
