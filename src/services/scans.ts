import type { Scan } from '@/types/api'
import { liveGetScan, liveListScans, liveStartScan } from '@/services/live-workspace'
import { mockRequest } from '@/services/mock/router'
import { isDemoSession, readSession } from '@/services/session-store'

export async function listScans(projectId?: string) {
  if (isDemoSession()) {
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''
    return mockRequest<Scan[]>(`/api/v1/scans${query}`, { session: readSession() })
  }
  return liveListScans(projectId)
}

export async function getScan(scanId: string) {
  if (isDemoSession()) return mockRequest<Scan>(`/api/v1/scans/${scanId}`, { session: readSession() })
  return liveGetScan(scanId)
}

export async function startScan(projectId: string) {
  if (isDemoSession()) return mockRequest<Scan>(`/api/v1/scans/${encodeURIComponent(projectId)}`, { method: 'POST', session: readSession() })
  return liveStartScan(projectId)
}
