import { Link, useParams } from 'react-router'
import { useEffect, useState } from 'react'
import { ErrorState } from '@/components/feedback/states'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useScan } from '@/hooks/queries'
import { elapsed, formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ScanStage } from '@/types/api'

export default function ScanDetail() {
  const { scanId = '' } = useParams()
  const scan = useScan(scanId)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (scan.data?.status !== 'running') return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [scan.data?.status])

  if (scan.isLoading) return <Skeleton className="h-80" />
  if (scan.isError || !scan.data) return <ErrorState error={scan.error} onRetry={() => void scan.refetch()} />
  const data = scan.data
  const running = data.status === 'running'
  return (
    <>
      <PageHeader
        kicker={data.repositoryName}
        title={data.projectName}
        description={`${data.branch} · ${data.trigger} · ${running ? elapsed(data.startedAt, now) : data.completedAt ? elapsed(data.startedAt, new Date(data.completedAt).getTime()) : 'Queued'}`}
        actions={data.status === 'completed' ? <Button asChild><Link to={`/app/vulnerabilities?projectId=${data.projectId}&status=open`}>Review findings</Link></Button> : null}
      />
      <ol className="max-w-3xl overflow-hidden rounded-lg border border-line bg-surface">
        {data.stages.map((stage, index) => (
          <StageRow key={stage.key} stage={stage} last={index === data.stages.length - 1} />
        ))}
      </ol>
      {data.status === 'completed' ? (
        <p className="mt-4 max-w-3xl text-[13px] text-secondary">
          Critical {data.findings.critical} · High {data.findings.high} · Medium {data.findings.medium} · Low {data.findings.low}. Verification of new patches stays a separate step.
        </p>
      ) : null}
    </>
  )
}

function StageRow({ stage, last }: { stage: ScanStage; last: boolean }) {
  return (
    <li className={cn('grid grid-cols-[20px_minmax(0,1fr)] gap-3 px-4 py-4', !last && 'border-b border-line')}>
      <span className="pt-1">
        <span className={cn('block size-2 rounded-full', stage.status === 'completed' ? 'bg-secure' : stage.status === 'running' ? 'bg-accent' : stage.status === 'failed' ? 'bg-critical' : 'bg-line-strong')} />
      </span>
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[14px] font-medium">{stage.name}</h2>
          <span className="font-mono text-[11px] text-muted">{formatDuration(stage.durationMs)}</span>
        </div>
        <p className="mt-0.5 text-[12px] text-secondary">{stage.scanner}{stage.resultCount != null ? ` · ${stage.resultCount}` : ''}</p>
        <p className="mt-1 text-[13px] text-foreground">{stage.detail}</p>
        {stage.status === 'running' ? (
          <div className="mt-2 h-px overflow-hidden bg-foreground/10">
            <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${stage.progress}%` }} />
          </div>
        ) : null}
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {stage.steps.map((step) => (
            <li key={step.label} className="flex items-center gap-1.5 text-[12px] text-secondary">
              <span className={cn('size-1.5 rounded-full', step.status === 'completed' ? 'bg-secure' : step.status === 'running' ? 'bg-accent' : 'bg-line-strong')} />
              {step.label}
            </li>
          ))}
        </ul>
      </div>
    </li>
  )
}
