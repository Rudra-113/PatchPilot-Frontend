import type { ConnectRepositoryInput, LookupResult, Repository } from '@/types/api'
import { request } from '@/services/client'

export function listRepositories() {
  return request<Repository[]>('/api/v1/repositories')
}

export function lookupRepository(input: { url: string; branch?: string }) {
  return request<LookupResult>('/api/v1/repositories/lookup', { method: 'POST', body: input })
}

export function connectRepository(input: ConnectRepositoryInput) {
  return request<Repository>('/api/v1/repositories', { method: 'POST', body: input })
}
