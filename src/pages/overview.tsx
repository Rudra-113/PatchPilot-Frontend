import { Link } from 'react-router'
import { ActivityFeed } from '@/components/security/activity-feed'
import { SeverityBadge, StatusText } from '@/components/security/badges'
import { ScoreRing } from '@/components/security/score-ring'
import { TrendChart } from '@/components/security/trend-chart'
import { EmptyState, ErrorState } from '@/components/feedback/states'
import { Panel } from '@/components/layout/frame'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCountUp } from '@/hooks/use-count-up'
import { useOverview } from '@/hooks/queries'
import { SEVERITY_LABEL } from '@/lib/severity'
import type { Severity } from '@/types/api'

export default function Overview() {
  const overview = useOverview()
  if (overview.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 lg:grid-cols-12">
          <Skeleton className="h-56 lg:col-span-4" />
          <Skeleton className="h-28 lg:col-span-4" />
          <Skeleton className="h-28 lg:col-span-4" />
          <Skeleton className="h-24 lg:col-span-8" />
        </div>
      </div>
    )
  }
  if (overview.isError || !overview.data) return <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />
  const data = overview.data
  if (data.projects === 0) {
    return (
      <>
        <PageHeader kicker="Workspace" title="Security Overview" description="Connect a repository and PatchPilot will read the tree, explain each sink, and hold the patch until it verifies." />
        <EmptyState
          kicker="No repositories"
          title="The workspace is empty."
          body="Create a project, point it at a GitHub URL or an upload, and start a scan. Findings, patches, and the score all come back from that run."
          action={<Button asChild><Link to="/app/projects/new">Create project</Link></Button>}
        />
      </>
    )
  }
  return (
    <>
      <PageHeader
        kicker="Workspace"
        title="Security Overview"
        description="Open risk across connected repositories. The score is the average of projects that have completed a scan."
        actions={
          <>
            {data.runningScans > 0 ? (
              <Button variant="secondary" asChild>
                <Link to="/app/scans">{data.runningScans} scan running</Link>
              </Button>
            ) : null}
            <Button asChild>
              <Link to="/app/projects">Scan a repository</Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-3 lg:grid-cols-12">
        <ScoreCard score={data.score} delta={data.scoreDelta} />
        <CriticalCard count={data.open.critical} />
        <FixedCard fixed={data.fixed} open={data.open.critical + data.open.high + data.open.medium + data.open.low} />
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line lg:col-span-8">
          {(['high', 'medium', 'low'] as Severity[]).map((severity) => (
            <Link key={severity} to={`/app/vulnerabilities?severity=${severity}&status=open`} className="bg-surface px-4 py-4 transition-colors hover:bg-elevated">
              <p className="text-[11px] tracking-[0.14em] text-muted uppercase">{SEVERITY_LABEL[severity]}</p>
              <p className="mt-2 text-[28px] font-medium tabular leading-none">{data.open[severity]}</p>
            </Link>
          ))}
        </div>
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-12">
        <Panel className="xl:col-span-7">
          <div className="flex items-center justify-between px-4 pt-4">
            <h2 className="text-[13px] font-medium">Open findings, eight weeks</h2>
            <p className="text-[11px] text-muted">Critical and high carry the stroke</p>
          </div>
          <TrendChart data={data.trend} />
        </Panel>
        <Panel className="xl:col-span-5">
          <div className="px-4 py-3">
            <h2 className="text-[13px] font-medium">Live security activity</h2>
          </div>
          <ActivityFeed events={data.activity} />
        </Panel>
      </div>
      <Panel className="mt-3">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-[13px] font-medium">Priority findings</h2>
          <Link to="/app/vulnerabilities?status=open" className="text-[12px] text-secondary hover:text-foreground">View all</Link>
        </div>
        <ul>
          {data.attention.map((item) => (
            <li key={item.id} className="border-t border-line">
              <Link to={`/app/vulnerabilities/${item.id}`} className="grid gap-2 px-4 py-3 transition-colors hover:bg-foreground/3 sm:grid-cols-[88px_minmax(0,1.2fr)_minmax(0,1fr)_120px] sm:items-center">
                <SeverityBadge severity={item.severity} short />
                <span className="truncate text-[13px]">{item.title}</span>
                <span className="truncate font-mono text-[12px] text-muted">{item.file}:{item.line}</span>
                <StatusText status={item.status} />
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  )
}

function ScoreCard({ score, delta }: { score: number; delta: number }) {
  const shown = useCountUp(score)
  const sign = delta > 0 ? '+' : ''
  return (
    <Panel className="flex items-center gap-5 p-5 lg:col-span-4 lg:row-span-1">
      <ScoreRing score={score} size={108} />
      <div>
        <p className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">PatchPilot security score</p>
        <p className="mt-2 text-[40px] leading-none font-medium tabular">{shown}</p>
        <p className="mt-2 text-[12px] text-secondary">{sign}{delta} since last week</p>
      </div>
    </Panel>
  )
}

function CriticalCard({ count }: { count: number }) {
  return (
    <Link to="/app/vulnerabilities?severity=critical&status=open" className="rounded-lg border border-line border-l-critical bg-surface p-5 transition-colors hover:border-line-strong lg:col-span-4">
      <p className="text-[11px] tracking-[0.14em] text-critical uppercase">Critical</p>
      <p className="mt-3 text-[40px] leading-none font-medium tabular">{count}</p>
      <p className="mt-2 text-[12px] text-secondary">Unresolved in connected repositories</p>
    </Link>
  )
}

function FixedCard({ fixed, open }: { fixed: number; open: number }) {
  const total = fixed + open
  const ratio = total ? Math.round((fixed / total) * 100) : 0
  return (
    <Panel className="p-5 lg:col-span-4">
      <p className="text-[11px] tracking-[0.14em] text-secure uppercase">Fixed</p>
      <p className="mt-3 text-[40px] leading-none font-medium tabular">{fixed}</p>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-foreground/8">
        <div className="h-full bg-secure" style={{ width: `${ratio}%` }} />
      </div>
      <p className="mt-2 text-[12px] text-secondary">{ratio}% of recorded findings are closed</p>
    </Panel>
  )
}
