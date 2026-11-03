import { Link } from 'react-router'
import { EmptyState, ErrorState } from '@/components/feedback/states'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useScans } from '@/hooks/queries'
import { elapsed, formatWhen } from '@/lib/format'
import { cn } from '@/lib/utils'

const tone: Record<string, string> = {
  running: 'text-accent',
  completed: 'text-secure',
  failed: 'text-critical',
  queued: 'text-warning',
}

export default function Scans() {
  const scans = useScans()
  return (
    <>
      <PageHeader kicker="Runs" title="Scans" description="Every run keeps its stages, duration, and finding counts." actions={<Button asChild variant="secondary"><Link to="/app/projects">Start from a project</Link></Button>} />
      {scans.isLoading ? <Skeleton className="h-40" /> : null}
      {scans.isError ? <ErrorState error={scans.error} onRetry={() => void scans.refetch()} /> : null}
      {scans.data && scans.data.length === 0 ? <EmptyState kicker="No scans" title="Nothing has been scanned." body="Open a project and start a scan. The pipeline stays on screen while it runs." /> : null}
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {scans.data?.map((scan, index) => (
          <Link key={scan.id} to={`/app/scans/${scan.id}`} className="pp-rise pp-row grid gap-1 border-t border-line px-4 py-3 first:border-t-0 hover:bg-foreground/4 md:grid-cols-[140px_minmax(0,1fr)_120px_120px] md:items-center" style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}>
            <span className={cn('text-[12px] tracking-wide uppercase', tone[scan.status])}>{scan.status}</span>
            <span>
              <span className="text-[13px]">{scan.projectName}</span>
              <span className="mt-0.5 block font-mono text-[11px] text-muted">{scan.repositoryName} · {scan.branch}</span>
            </span>
            <span className="text-[12px] text-secondary">{formatWhen(scan.startedAt)}</span>
            <span className="font-mono text-[12px] text-muted">{scan.completedAt ? elapsed(scan.startedAt, new Date(scan.completedAt).getTime()) : 'Running'}</span>
          </Link>
        ))}
      </div>
    </>
  )
}
