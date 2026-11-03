import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ErrorState } from '@/components/feedback/states'
import { PageHeader } from '@/components/layout/page-header'
import { SeverityBadge, StatusText } from '@/components/security/badges'
import { ScoreRing } from '@/components/security/score-ring'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useProject, useScans, useStartScan, useVulnerabilities } from '@/hooks/queries'
import { formatRelative, formatWhen, shortSha } from '@/lib/format'
import { ApiError } from '@/services/errors'

export default function ProjectDetail() {
  const { projectId = '' } = useParams()
  const project = useProject(projectId)
  const scans = useScans(projectId)
  const vulns = useVulnerabilities({ projectId, status: 'open' })
  const start = useStartScan()
  const navigate = useNavigate()

  if (project.isLoading) return <Skeleton className="h-48" />
  if (project.isError || !project.data) return <ErrorState error={project.error} onRetry={() => void project.refetch()} />
  const data = project.data

  const scan = async () => {
    if (!data.repository) {
      navigate(`/app/repositories/connect?projectId=${data.id}`)
      return
    }
    try {
      const result = await start.mutateAsync(data.id)
      toast.success('Scan started')
      navigate(`/app/scans/${result.id}`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'The scan did not start.')
    }
  }

  return (
    <>
      <PageHeader
        kicker={data.repository?.name ?? 'No repository'}
        title={data.name}
        description={data.description || `${data.language} · ${data.framework}`}
        actions={
          <>
            {!data.repository ? <Button variant="secondary" asChild><Link to={`/app/repositories/connect?projectId=${data.id}`}>Connect repository</Link></Button> : null}
            <Button onClick={() => void scan()} disabled={start.isPending}>Scan now</Button>
          </>
        }
      />
      <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="rounded-lg border border-line bg-surface p-4">
          <ScoreRing score={data.securityScore} size={120} caption={data.scanFreshness === 'unscanned' ? '—' : String(data.securityScore)} />
          <p className="mt-3 text-[12px] text-secondary">Security score {data.scanFreshness === 'unscanned' ? 'appears after the first scan' : data.securityScore}</p>
          <dl className="mt-4 space-y-2 text-[12px]">
            <div className="flex justify-between"><dt className="text-muted">Language</dt><dd>{data.language}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Branch</dt><dd className="font-mono">{data.repository?.branch ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Last scan</dt><dd>{formatRelative(data.lastScanAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Last patch</dt><dd>{formatRelative(data.lastPatchAt)}</dd></div>
          </dl>
        </div>
        <div className="space-y-3">
          <section className="rounded-lg border border-line bg-surface">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-[13px] font-medium">Open findings</h2>
              <Link className="text-[12px] text-secondary hover:text-foreground" to={`/app/vulnerabilities?projectId=${data.id}&status=open`}>All</Link>
            </div>
            <ul>
              {vulns.data?.items.slice(0, 6).map((item) => (
                <li key={item.id} className="border-t border-line">
                  <Link to={`/app/vulnerabilities/${item.id}`} className="grid gap-2 px-4 py-2.5 sm:grid-cols-[72px_1fr_auto] sm:items-center">
                    <SeverityBadge severity={item.severity} short />
                    <span className="truncate text-[13px]">{item.title}<span className="ml-2 font-mono text-[11px] text-muted">{item.file}:{item.line}</span></span>
                    <StatusText status={item.status} />
                  </Link>
                </li>
              ))}
              {vulns.data && vulns.data.items.length === 0 ? <li className="border-t border-line px-4 py-6 text-[13px] text-secondary">No open findings.</li> : null}
            </ul>
          </section>
          <section className="rounded-lg border border-line bg-surface">
            <div className="px-4 py-3 text-[13px] font-medium">Scans</div>
            <ul>
              {scans.data?.slice(0, 4).map((scanItem) => (
                <li key={scanItem.id} className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-[13px]">
                  <Link to={`/app/scans/${scanItem.id}`} className="hover:text-accent">{scanItem.status}</Link>
                  <span className="font-mono text-[11px] text-muted">{shortSha(scanItem.commitSha)}</span>
                  <span className="text-secondary">{formatWhen(scanItem.startedAt)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  )
}
