import type { ConnectRepositoryInput, LookupResult, Repository } from '@/types/api'
import { liveConnectRepository, liveListRepositories, liveLookupRepository } from '@/services/live-workspace'
import { mockRequest } from '@/services/mock/router'
import { isDemoSession, readSession } from '@/services/session-store'

export async function listRepositories() {
  if (isDemoSession()) return mockRequest<Repository[]>('/api/v1/repositories', { session: readSession() })
  return liveListRepositories()
}

export async function lookupRepository(input: { url: string; branch?: string }) {
  if (isDemoSession()) return mockRequest<LookupResult>('/api/v1/repositories/lookup', { method: 'POST', body: input, session: readSession() })
  return liveLookupRepository(input)
}

export async function connectRepository(input: ConnectRepositoryInput) {
  if (isDemoSession()) return mockRequest<Repository>('/api/v1/repositories', { method: 'POST', body: input, session: readSession() })
  return liveConnectRepository(input)
}
