import type { Vulnerability, VulnerabilityListResponse, VulnerabilityQuery, VulnStatus, WorkspaceMeta } from '@/types/api'
import { liveGetVulnerability, liveListVulnerabilities, liveMeta, liveUpdateVulnerability } from '@/services/live-workspace'
import { mockRequest } from '@/services/mock/router'
import { isDemoSession, readSession } from '@/services/session-store'

function search(query: VulnerabilityQuery) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value)
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}

export async function listVulnerabilities(query: VulnerabilityQuery = {}) {
  if (isDemoSession()) return mockRequest<VulnerabilityListResponse>(`/api/v1/vulnerabilities${search(query)}`, { session: readSession() })
  return liveListVulnerabilities(query)
}

export async function getVulnerability(vulnerabilityId: string) {
  if (isDemoSession()) return mockRequest<Vulnerability>(`/api/v1/vulnerabilities/${vulnerabilityId}`, { session: readSession() })
  return liveGetVulnerability(vulnerabilityId)
}

export async function updateVulnerability(vulnerabilityId: string, status: VulnStatus) {
  if (isDemoSession()) {
    return mockRequest<Vulnerability>(`/api/v1/vulnerabilities/${vulnerabilityId}`, { method: 'PATCH', body: { status }, session: readSession() })
  }
  return liveUpdateVulnerability(vulnerabilityId, status)
}

export async function workspaceMeta() {
  if (isDemoSession()) return mockRequest<WorkspaceMeta>('/api/v1/meta', { session: readSession() })
  return liveMeta()
}
