import type { CreateProjectInput, ProjectSummary } from '@/types/api'
import { request } from '@/services/client'

export function listProjects() {
  return request<ProjectSummary[]>('/projects')
}

export function getProject(projectId: string) {
  return request<ProjectSummary>(`/projects/${projectId}`)
}

export function createProject(input: CreateProjectInput) {
  return request<ProjectSummary>('/projects', { method: 'POST', body: input })
}
