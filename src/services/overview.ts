import type { ActivityEvent, Overview } from '@/types/api'
import { request } from '@/services/client'

export function getOverview() {
  return request<Overview>('/overview')
}

export function listActivity() {
  return request<ActivityEvent[]>('/activity')
}
