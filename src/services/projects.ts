import type { CreateProjectInput, ProjectSummary } from '@/types/api'
import { request } from '@/services/client'

export function listProjects() {
  return request<ProjectSummary[]>('/api/v1/projects')
}

export function getProject(projectId: string) {
  return request<ProjectSummary>(`/api/v1/projects/${projectId}`)
}

export function createProject(input: CreateProjectInput) {
  return request<ProjectSummary>('/api/v1/projects', { method: 'POST', body: input })
}
