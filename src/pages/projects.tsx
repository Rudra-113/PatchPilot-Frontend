import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { EmptyState, ErrorState } from '@/components/feedback/states'
import { PageHeader } from '@/components/layout/page-header'
import { ScoreRing } from '@/components/security/score-ring'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjects, useStartScan } from '@/hooks/queries'
import { formatRelative } from '@/lib/format'
import { ApiError } from '@/services/errors'
import type { ProjectSummary } from '@/types/api'

export default function Projects() {
  const projects = useProjects()
  const start = useStartScan()
  const navigate = useNavigate()

  const scan = async (project: ProjectSummary) => {
    if (!project.repository) {
      navigate(`/app/repositories/connect?projectId=${project.id}`)
      return
    }
    try {
      const scanResult = await start.mutateAsync(project.id)
      toast.success(`Scan started for ${project.name}`)
      navigate(`/app/scans/${scanResult.id}`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'The scan did not start.')
    }
  }

  return (
    <>
      <PageHeader
        kicker="Inventory"
        title="Projects"
        description="Each project is one repository and one security score."
        actions={<Button asChild><Link to="/app/projects/new">Create project</Link></Button>}
      />
      {projects.isLoading ? <Skeleton className="h-40" /> : null}
      {projects.isError ? <ErrorState error={projects.error} onRetry={() => void projects.refetch()} /> : null}
      {projects.data && projects.data.length === 0 ? (
        <EmptyState kicker="No projects" title="Create the first project." body="Name the service, then connect its repository. The scan is the next step, not a form field." action={<Button asChild><Link to="/app/projects/new">Create project</Link></Button>} />
      ) : null}
      <div className="grid gap-3 xl:grid-cols-2">
        {projects.data?.map((project, index) => (
          <article key={project.id} className="pp-card pp-rise rounded-lg border border-line bg-surface p-4" style={{ animationDelay: `${index * 55}ms` }}>
            <div className="flex gap-4">
              <ScoreRing score={project.securityScore} size={64} caption={project.scanFreshness === 'unscanned' ? '—' : String(project.securityScore)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/app/projects/${project.id}`} className="text-[15px] font-medium hover:text-accent">{project.name}</Link>
                    <p className="mt-0.5 text-[12px] text-secondary">{project.language} · {project.framework}</p>
                    <p className="mt-1 truncate font-mono text-[11px] text-muted">{project.repository?.name ?? 'No repository'}</p>
                  </div>
                  <Button size="sm" variant="secondary" disabled={start.isPending} onClick={() => void scan(project)}>
                    Scan now
                  </Button>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-[12px] sm:grid-cols-5">
                  <Count label="Critical" value={project.open.critical} tone="text-critical" />
                  <Count label="High" value={project.open.high} tone="text-high" />
                  <Count label="Medium" value={project.open.medium} tone="text-warning" />
                  <Count label="Fixed" value={project.fixed} tone="text-secure" />
                  <div>
                    <dt className="text-muted">Last scan</dt>
                    <dd className={project.scanFreshness === 'stale' ? 'text-warning' : 'text-foreground'}>{formatRelative(project.lastScanAt)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

function Count({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className={`tabular ${tone}`}>{value}</dd>
    </div>
  )
}
