import type { ConnectRepositoryInput, LookupResult, Repository } from '@/types/api'
import { request } from '@/services/client'

export function listRepositories() {
  return request<Repository[]>('/repositories')
}

export function lookupRepository(input: { url: string; branch?: string }) {
  return request<LookupResult>('/repositories/lookup', { method: 'POST', body: input })
}

export function connectRepository(input: ConnectRepositoryInput) {
  return request<Repository>('/repositories', { method: 'POST', body: input })
}
