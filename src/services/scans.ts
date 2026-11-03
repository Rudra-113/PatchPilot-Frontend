import type { Scan } from '@/types/api'
import { request } from '@/services/client'

export function listScans(projectId?: string) {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''
  return request<Scan[]>(`/scans${query}`)
}

export function getScan(scanId: string) {
  return request<Scan>(`/scans/${scanId}`)
}

export function startScan(projectId: string) {
  return request<Scan>('/scans', { method: 'POST', body: { projectId } })
}
