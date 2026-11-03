import { motion } from 'framer-motion'
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
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'
import { useOverview } from '@/hooks/queries'
import { SEVERITY_LABEL } from '@/lib/severity'
import { cn } from '@/lib/utils'
import type { Severity, SeverityCounts, VulnerabilityListItem } from '@/types/api'

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
        <SeverityBand open={data.open} />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-12">
        <Panel className="xl:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
            <h2 className="text-[13px] font-medium">Open findings, eight weeks</h2>
            <div className="flex items-center gap-3 text-[11px] text-muted">
              <Legend swatch="bg-critical" label="Critical" />
              <Legend swatch="bg-high" label="High" />
              <Legend swatch="bg-warning" label="Medium" />
              <Legend swatch="bg-muted" label="Low" />
            </div>
          </div>
          <TrendChart data={data.trend} />
        </Panel>
        <Panel className="xl:col-span-5">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-[13px] font-medium">Live security activity</h2>
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-complement uppercase">
              <span className="size-1.5 rounded-full bg-complement pp-live" />
              Live
            </span>
          </div>
          <ActivityFeed events={data.activity} />
        </Panel>
      </div>
      <PriorityList items={data.attention} />
    </>
  )
}

const rise = [0.22, 1, 0.36, 1] as const

function ScoreCard({ score, delta }: { score: number; delta: number }) {
  const shown = useCountUp(score, 900)
  const reduced = usePrefersReducedMotion()
  const sign = delta > 0 ? '+' : ''
  return (
    <motion.div className="lg:col-span-4" {...enter(0, reduced)}>
      <Panel className="flex h-full flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:gap-5">
        <ScoreRing
          score={score}
          size={124}
          center={
            <span className="text-center">
              <span className="block text-[32px] leading-none font-medium tabular">{shown}</span>
              <span className="mt-1 block font-mono text-[9px] tracking-[0.16em] text-muted uppercase">/ 100</span>
            </span>
          }
        />
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">PatchPilot security score</p>
          <p className="mt-3 text-[13px] leading-5 text-secondary">Mean of projects with a completed scan.</p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-inset px-2.5 py-1 font-mono text-[11px] text-accent">
            <span className="size-1.5 rounded-full bg-secure" />
            {sign}{delta} since last week
          </p>
        </div>
      </Panel>
    </motion.div>
  )
}

function CriticalCard({ count }: { count: number }) {
  const shown = useCountUp(count, 640)
  const reduced = usePrefersReducedMotion()
  const marks = Math.min(8, Math.max(count, 4))
  return (
    <motion.div className="lg:col-span-4" {...enter(0.08, reduced)}>
      <Link to="/app/vulnerabilities?severity=critical&status=open" className="flex h-full flex-col rounded-lg border border-line bg-surface p-5 transition-colors hover:border-line-strong">
        <p className="text-[11px] tracking-[0.14em] text-critical uppercase">Critical</p>
        <p className="mt-3 text-[40px] leading-none font-medium tabular">{shown}</p>
        <div className="mt-4 flex h-8 items-end gap-1" aria-hidden="true">
          {Array.from({ length: marks }, (_, index) => {
            const crest = [0.58, 1, 0.74, 0.9, 0.66, 0.96, 0.7, 0.84][index] ?? 0.8
            return (
              <motion.span
                key={index}
                className="h-full flex-1 origin-bottom rounded-[1px] bg-critical"
                initial={reduced ? false : { scaleY: 0.12, opacity: 0.3 }}
                animate={{ scaleY: index < count ? crest : 0.18, opacity: index < count ? 1 : 0.22 }}
                transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : 0.12 + index * 0.07, ease: rise }}
              />
            )
          })}
        </div>
        <p className="mt-3 text-[12px] text-secondary">Unresolved in connected repositories</p>
      </Link>
    </motion.div>
  )
}

function FixedCard({ fixed, open }: { fixed: number; open: number }) {
  const shown = useCountUp(fixed, 900)
  const reduced = usePrefersReducedMotion()
  const total = fixed + open
  const ratio = total ? Math.round((fixed / total) * 100) : 0
  const ratioShown = useCountUp(ratio, 900)
  return (
    <motion.div className="lg:col-span-4" {...enter(0.16, reduced)}>
      <Panel className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] tracking-[0.14em] text-secure uppercase">Fixed</p>
          <p className="font-mono text-[22px] leading-none text-secure tabular">{ratioShown}%</p>
        </div>
        <p className="mt-3 text-[40px] leading-none font-medium tabular">{shown}</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-foreground/8">
          <motion.div
            className="h-full w-full origin-left rounded-full bg-secure"
            initial={{ scaleX: reduced ? ratio / 100 : 0 }}
            animate={{ scaleX: ratio / 100 }}
            transition={{ duration: reduced ? 0 : 0.9, delay: reduced ? 0 : 0.2, ease: rise }}
          />
        </div>
        <p className="mt-3 text-[12px] text-secondary">{ratio}% of recorded findings are closed</p>
      </Panel>
    </motion.div>
  )
}

const meterTone: Record<Severity, string> = {
  critical: 'bg-critical',
  high: 'bg-high',
  medium: 'bg-warning',
  low: 'bg-muted',
}

function SeverityBand({ open }: { open: SeverityCounts }) {
  const reduced = usePrefersReducedMotion()
  const order: Severity[] = ['critical', 'high', 'medium', 'low']
  const total = order.reduce((sum, key) => sum + open[key], 0)
  const peak = Math.max(...order.map((key) => open[key]), 1)
  return (
    <motion.div className="lg:col-span-12" {...enter(0.22, reduced)}>
      <Panel className="overflow-hidden">
        <div className="flex h-2 w-full bg-inset" aria-hidden="true">
          {order.map((severity, index) => (
            <motion.span
              key={severity}
              className={meterTone[severity]}
              initial={{ width: reduced ? `${total ? (open[severity] / total) * 100 : 0}%` : '0%' }}
              animate={{ width: `${total ? (open[severity] / total) * 100 : 0}%` }}
              transition={{ duration: reduced ? 0 : 0.7, delay: reduced ? 0 : 0.15 + index * 0.08, ease: rise }}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-4 sm:divide-y-0">
          {order.map((severity) => (
            <MeterLink key={severity} severity={severity} value={open[severity]} peak={peak} total={total} />
          ))}
        </div>
      </Panel>
    </motion.div>
  )
}

function MeterLink({ severity, value, peak, total }: { severity: Severity; value: number; peak: number; total: number }) {
  const shown = useCountUp(value, 700)
  const reduced = usePrefersReducedMotion()
  const share = total ? Math.round((value / total) * 100) : 0
  return (
    <Link
      to={`/app/vulnerabilities?severity=${severity}&status=open`}
      className="px-4 py-4 transition-colors hover:bg-elevated"
    >
      <p className="text-[11px] tracking-[0.14em] text-muted uppercase">{SEVERITY_LABEL[severity]}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-[28px] leading-none font-medium tabular">{shown}</p>
        <p className="pb-0.5 font-mono text-[11px] text-muted tabular">{share}%</p>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-foreground/8">
        <motion.span
          className={cn('block h-full w-full origin-left rounded-full', meterTone[severity])}
          initial={{ scaleX: reduced ? value / peak : 0 }}
          animate={{ scaleX: value / peak }}
          transition={{ duration: reduced ? 0 : 0.7, delay: reduced ? 0 : 0.25, ease: rise }}
        />
      </div>
    </Link>
  )
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('size-1.5 rounded-full', swatch)} />
      {label}
    </span>
  )
}

function PriorityList({ items }: { items: VulnerabilityListItem[] }) {
  const reduced = usePrefersReducedMotion()
  return (
    <Panel className="mt-3">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-[13px] font-medium">Priority findings</h2>
        <Link to="/app/vulnerabilities?status=open" className="text-[12px] text-secondary hover:text-foreground">View all</Link>
      </div>
      <ul>
        {items.map((item, index) => (
          <motion.li
            key={item.id}
            className="border-t border-line"
            initial={reduced ? false : { opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reduced ? 0 : 0.35, delay: reduced ? 0 : 0.05 * index, ease: rise }}
          >
            <Link to={`/app/vulnerabilities/${item.id}`} className="grid gap-2 px-4 py-3 transition-colors hover:bg-foreground/3 sm:grid-cols-[88px_minmax(0,1.2fr)_minmax(0,1fr)_120px] sm:items-center">
              <SeverityBadge severity={item.severity} short />
              <span className="truncate text-[13px]">{item.title}</span>
              <span className="truncate font-mono text-[12px] text-muted">{item.file}:{item.line}</span>
              <StatusText status={item.status} />
            </Link>
          </motion.li>
        ))}
      </ul>
    </Panel>
  )
}

function enter(delay: number, reduced: boolean) {
  return {
    initial: reduced ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduced ? 0 : 0.45, delay: reduced ? 0 : delay, ease: rise },
  } as const
}
