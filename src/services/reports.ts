import type { Report, ReportDocument } from '@/types/api'
import { request } from '@/services/client'

export function listReports() {
  return request<Report[]>('/reports')
}

export function getReport(reportId: string) {
  return request<ReportDocument>(`/reports/${reportId}`)
}

export function createReport(input: { title?: string; projectId?: string | null }) {
  return request<Report>('/reports', { method: 'POST', body: input })
}
