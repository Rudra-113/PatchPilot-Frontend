import type {
  Vulnerability,
  VulnerabilityListResponse,
  VulnerabilityQuery,
  VulnStatus,
  WorkspaceMeta,
} from '@/types/api'
import { request } from '@/services/client'

export function listVulnerabilities(query: VulnerabilityQuery = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value)
  }
  const search = params.toString()
  return request<VulnerabilityListResponse>(`/vulnerabilities${search ? `?${search}` : ''}`)
}

export function getVulnerability(vulnerabilityId: string) {
  return request<Vulnerability>(`/vulnerabilities/${vulnerabilityId}`)
}

export function updateVulnerability(vulnerabilityId: string, status: VulnStatus) {
  return request<Vulnerability>(`/vulnerabilities/${vulnerabilityId}`, {
    method: 'PATCH',
    body: { status },
  })
}

export function workspaceMeta() {
  return request<WorkspaceMeta>('/meta')
}
