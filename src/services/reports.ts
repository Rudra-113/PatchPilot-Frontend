import type { Report, ReportDocument } from '@/types/api'
import { liveCreateReport, liveGetReport, liveListReports } from '@/services/live-workspace'
import { mockRequest } from '@/services/mock/router'
import { isDemoSession, readSession } from '@/services/session-store'

export async function listReports() {
  if (isDemoSession()) return mockRequest<Report[]>('/api/v1/reports', { session: readSession() })
  return liveListReports()
}

export async function getReport(reportId: string) {
  if (isDemoSession()) return mockRequest<ReportDocument>(`/api/v1/reports/${reportId}`, { session: readSession() })
  return liveGetReport(reportId)
}

export async function createReport(input: { title?: string; projectId?: string | null }) {
  if (isDemoSession()) return mockRequest<Report>('/api/v1/reports', { method: 'POST', body: input, session: readSession() })
  return liveCreateReport(input)
}
