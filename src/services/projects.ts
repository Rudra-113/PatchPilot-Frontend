import type { CreateProjectInput, ProjectSummary } from '@/types/api'
import { liveCreateProject, liveGetProject, liveListProjects } from '@/services/live-workspace'
import { mockRequest } from '@/services/mock/router'
import { isDemoSession, readSession } from '@/services/session-store'

export async function listProjects() {
  if (isDemoSession()) return mockRequest<ProjectSummary[]>('/api/v1/projects', { session: readSession() })
  return liveListProjects()
}

export async function getProject(projectId: string) {
  if (isDemoSession()) return mockRequest<ProjectSummary>(`/api/v1/projects/${projectId}`, { session: readSession() })
  return liveGetProject(projectId)
}

export async function createProject(input: CreateProjectInput) {
  if (isDemoSession()) return mockRequest<ProjectSummary>('/api/v1/projects', { method: 'POST', body: input, session: readSession() })
  return liveCreateProject(input)
}
