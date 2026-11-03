import { motion } from 'framer-motion'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { ErrorState } from '@/components/feedback/states'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMarkApplied, usePatch } from '@/hooks/queries'
import { formatDuration } from '@/lib/format'
import { ApiError } from '@/services/errors'
import { cn } from '@/lib/utils'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'

export default function Validation() {
  const { patchId = '' } = useParams()
  const patch = usePatch(patchId)
  const apply = useMarkApplied()
  const reduced = usePrefersReducedMotion()
  if (patch.isLoading) return <Skeleton className="h-80" />
  if (patch.isError || !patch.data) return <ErrorState error={patch.error} onRetry={() => void patch.refetch()} />
  const data = patch.data
  const verified = data.status === 'verified' || data.status === 'applied'
  const passed = data.checks.filter((check) => check.status === 'passed').length

  const mark = async () => {
    try {
      await apply.mutateAsync(data.id)
      toast.success(`${data.vulnerabilityTitle} resolved`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'The finding was not marked applied.')
    }
  }

  return (
    <>
      <PageHeader
        kicker={data.filename}
        title="Patch Validation"
        description={data.vulnerabilityTitle}
        actions={<Button variant="ghost" asChild><Link to={`/app/vulnerabilities/${data.vulnerabilityId}/patch`}>Back to patch</Link></Button>}
      />
      <div className="grid max-w-3xl gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="rounded-lg border border-line bg-surface p-4">
          <svg viewBox="0 0 72 72" className="size-16" aria-hidden="true">
            <circle cx="36" cy="36" r="28" fill="none" stroke="var(--line-strong)" strokeWidth="1" />
            <motion.circle
              cx="36"
              cy="36"
              r="22"
              fill="none"
              stroke={verified ? 'var(--secure)' : 'var(--accent)'}
              strokeWidth="1.5"
              strokeDasharray="138"
              initial={reduced ? false : { strokeDashoffset: 138 }}
              animate={{ strokeDashoffset: verified ? 0 : 138 - (passed / Math.max(data.checks.length, 1)) * 138 }}
              transition={{ duration: 0.6 }}
            />
          </svg>
          <p className="mt-3 text-[12px] tracking-[0.16em] text-muted uppercase">{verified ? 'Patch verified' : data.status === 'validating' ? 'Verifying' : 'Not verified'}</p>
          <p className="mt-1 text-[13px] text-secondary">{passed} of {data.checks.length} checks held</p>
        </div>
        <ol className="overflow-hidden rounded-lg border border-line bg-surface">
          {data.checks.map((check) => (
            <li key={check.key} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0">
              <div className="flex items-center gap-3">
                <span className={cn('size-2 rounded-full', check.status === 'passed' ? 'bg-secure' : check.status === 'running' ? 'bg-accent' : check.status === 'failed' ? 'bg-critical' : 'bg-line-strong')} />
                <div>
                  <p className="text-[13px]">{check.name}</p>
                  <p className="text-[12px] text-secondary">{check.detail}</p>
                </div>
              </div>
              <span className="font-mono text-[11px] text-muted">{formatDuration(check.durationMs)}</span>
            </li>
          ))}
        </ol>
      </div>
      {verified ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => void mark()} disabled={apply.isPending || data.status === 'applied'}>
            {data.status === 'applied' ? 'Applied' : 'Mark applied'}
          </Button>
          <Button variant="secondary" asChild><Link to={`/app/vulnerabilities/${data.vulnerabilityId}`}>Return to finding</Link></Button>
        </div>
      ) : null}
    </>
  )
}
