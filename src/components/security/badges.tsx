import type { Severity, VulnStatus } from '@/types/api'
import { SEVERITY_LABEL, SEVERITY_SHORT, STATUS_LABEL } from '@/lib/severity'
import { cn } from '@/lib/utils'

const severityClass: Record<Severity, string> = {
  critical: 'border-critical/30 bg-critical-dim text-critical',
  high: 'border-high/30 bg-high-dim text-high',
  medium: 'border-warning/30 bg-warning-dim text-warning',
  low: 'border-line-strong bg-elevated text-secondary',
}

const dotClass: Record<VulnStatus, string> = {
  unresolved: 'bg-critical',
  in_review: 'bg-accent',
  patch_ready: 'bg-ai',
  validating: 'bg-accent',
  verified: 'bg-secure',
  fixed: 'bg-secure',
  accepted_risk: 'bg-muted',
}

export function SeverityBadge({ severity, short = false }: { severity: Severity; short?: boolean }) {
  return (
    <span className={cn('inline-flex h-5 items-center rounded-sm border px-1.5 font-mono text-[10px] tracking-[0.12em]', severityClass[severity])}>
      {short ? SEVERITY_SHORT[severity] : SEVERITY_LABEL[severity].toUpperCase()}
    </span>
  )
}

export function StatusText({ status }: { status: VulnStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-secondary">
      <span className={cn('size-1.5 rounded-full', dotClass[status])} />
      {STATUS_LABEL[status]}
    </span>
  )
}
