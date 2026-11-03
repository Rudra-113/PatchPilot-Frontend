import type { DiffDownload, Patch, PullRequestDraft } from '@/types/api'
import { request } from '@/services/client'

export function listPatches(vulnerabilityId?: string) {
  const query = vulnerabilityId ? `?vulnerabilityId=${encodeURIComponent(vulnerabilityId)}` : ''
  return request<Patch[]>(`/patches${query}`)
}

export function getPatch(patchId: string) {
  return request<Patch>(`/patches/${patchId}`)
}

export function getPatchForVulnerability(vulnerabilityId: string) {
  return request<Patch>(`/vulnerabilities/${vulnerabilityId}/patch`)
}

export function generatePatch(vulnerabilityId: string) {
  return request<Patch>(`/vulnerabilities/${vulnerabilityId}/patches`, { method: 'POST' })
}

export function startValidation(patchId: string) {
  return request<Patch>(`/patches/${patchId}/validation`, { method: 'POST' })
}

export function downloadPatch(patchId: string) {
  return request<DiffDownload>(`/patches/${patchId}/apply`, { method: 'POST', body: { action: 'download' } })
}

export function preparePullRequest(patchId: string) {
  return request<PullRequestDraft>(`/patches/${patchId}/apply`, {
    method: 'POST',
    body: { action: 'pull_request' },
  })
}

export function markPatchApplied(patchId: string) {
  return request<Patch>(`/patches/${patchId}/apply`, { method: 'POST', body: { action: 'mark_applied' } })
}
