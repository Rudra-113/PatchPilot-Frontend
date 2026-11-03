import type { Severity, SeverityCounts, VulnStatus } from '@/types/api'

export const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low']

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const SEVERITY_SHORT: Record<Severity, string> = {
  critical: 'CRIT',
  high: 'HIGH',
  medium: 'MED',
  low: 'LOW',
}

export const STATUS_LABEL: Record<VulnStatus | 'open', string> = {
  open: 'Open',
  unresolved: 'Unresolved',
  in_review: 'In review',
  patch_ready: 'Patch ready',
  validating: 'Validating',
  verified: 'Verified',
  fixed: 'Fixed',
  accepted_risk: 'Accepted risk',
}

export function emptyCounts(): SeverityCounts {
  return { critical: 0, high: 0, medium: 0, low: 0 }
}

export function computeScore(open: SeverityCounts) {
  const penalty = open.critical * 9 + open.high * 4 + open.medium * 2 + open.low * 0.5
  return Math.max(38, Math.min(99, Math.round(100 - penalty)))
}

export function severityRank(severity: Severity) {
  return SEVERITY_ORDER.indexOf(severity)
}

export function isOpenStatus(status: VulnStatus) {
  return status !== 'fixed' && status !== 'accepted_risk'
}

export function toneForScore(score: number) {
  if (score >= 85) return 'secure' as const
  if (score >= 70) return 'accent' as const
  if (score >= 55) return 'warning' as const
  return 'critical' as const
}
