import type { DiffDownload, Patch, PullRequestDraft } from '@/types/api'
import {
  liveApplyPatch,
  liveDownloadPatch,
  liveGeneratePatch,
  liveGetPatch,
  liveListPatches,
  livePatchForVulnerability,
  livePreparePullRequest,
  liveStartValidation,
} from '@/services/live-workspace'
import { mockRequest } from '@/services/mock/router'
import { isDemoSession, readSession } from '@/services/session-store'

export async function listPatches(vulnerabilityId?: string) {
  if (isDemoSession()) {
    const query = vulnerabilityId ? `?vulnerabilityId=${encodeURIComponent(vulnerabilityId)}` : ''
    return mockRequest<Patch[]>(`/api/v1/patches${query}`, { session: readSession() })
  }
  return liveListPatches(vulnerabilityId)
}

export async function getPatch(patchId: string) {
  if (isDemoSession()) return mockRequest<Patch>(`/api/v1/patches/${patchId}`, { session: readSession() })
  return liveGetPatch(patchId)
}

export async function getPatchForVulnerability(vulnerabilityId: string) {
  if (isDemoSession()) return mockRequest<Patch>(`/api/v1/vulnerabilities/${vulnerabilityId}/patch`, { session: readSession() })
  return livePatchForVulnerability(vulnerabilityId)
}

export async function generatePatch(vulnerabilityId: string) {
  if (isDemoSession()) return mockRequest<Patch>(`/api/v1/vulnerabilities/${vulnerabilityId}/patches`, { method: 'POST', session: readSession() })
  return liveGeneratePatch(vulnerabilityId)
}

export async function startValidation(patchId: string) {
  if (isDemoSession()) return mockRequest<Patch>(`/api/v1/patches/${patchId}/validation`, { method: 'POST', session: readSession() })
  return liveStartValidation(patchId)
}

export async function downloadPatch(patchId: string) {
  if (isDemoSession()) return mockRequest<DiffDownload>(`/api/v1/patches/${patchId}/apply`, { method: 'POST', body: { action: 'download' }, session: readSession() })
  return liveDownloadPatch(patchId)
}

export async function preparePullRequest(patchId: string) {
  if (isDemoSession()) {
    return mockRequest<PullRequestDraft>(`/api/v1/patches/${patchId}/apply`, { method: 'POST', body: { action: 'pull_request' }, session: readSession() })
  }
  return livePreparePullRequest(patchId)
}

export async function markPatchApplied(patchId: string) {
  if (isDemoSession()) return mockRequest<Patch>(`/api/v1/patches/${patchId}/apply`, { method: 'POST', body: { action: 'mark_applied' }, session: readSession() })
  return liveApplyPatch(patchId)
}
