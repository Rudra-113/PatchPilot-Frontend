import { Link } from 'react-router'
import { EmptyState, ErrorState } from '@/components/feedback/states'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjects, useRepositories } from '@/hooks/queries'
import { formatRelative, shortSha } from '@/lib/format'

export default function Repositories() {
  const repositories = useRepositories()
  const projects = useProjects()
  return (
    <>
      <PageHeader kicker="Sources" title="Repositories" description="One connected source per project." actions={<Button asChild><Link to="/app/repositories/connect">Connect repository</Link></Button>} />
      {repositories.isLoading ? <Skeleton className="h-32" /> : null}
      {repositories.isError ? <ErrorState error={repositories.error} onRetry={() => void repositories.refetch()} /> : null}
      {repositories.data && repositories.data.length === 0 ? (
        <EmptyState kicker="Nothing connected" title="No repositories yet." body="Connect GitHub, a ZIP, or a directory from a project." action={<Button asChild><Link to="/app/projects/new">Create project</Link></Button>} />
      ) : null}
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {repositories.data?.map((repository) => {
          const project = projects.data?.find((item) => item.id === repository.projectId)
          return (
            <article key={repository.id} className="grid gap-2 border-t border-line px-4 py-3 first:border-t-0 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_140px_auto] md:items-center">
              <div>
                <p className="text-[13px] font-medium">{repository.name}</p>
                <p className="truncate font-mono text-[11px] text-muted">{repository.url}</p>
              </div>
              <div className="text-[12px] text-secondary">
                <p>{project?.name ?? 'Unassigned'}</p>
                <p className="font-mono text-[11px] text-muted">{repository.branch}{repository.lastCommit ? ` · ${shortSha(repository.lastCommit.sha)}` : ''}</p>
              </div>
              <p className="text-[12px] text-muted">{formatRelative(repository.connectedAt)}</p>
              {project ? <Button size="sm" variant="secondary" asChild><Link to={`/app/projects/${project.id}`}>Open</Link></Button> : null}
            </article>
          )
        })}
      </div>
    </>
  )
}
