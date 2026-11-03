import type { Scan } from '@/types/api'
import { request } from '@/services/client'

export function listScans(projectId?: string) {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''
  return request<Scan[]>(`/api/v1/scans${query}`)
}

export function getScan(scanId: string) {
  return request<Scan>(`/api/v1/scans/${scanId}`)
}

export function startScan(projectId: string) {
  return request<Scan>(`/api/v1/scans/${encodeURIComponent(projectId)}`, { method: 'POST' })
}
