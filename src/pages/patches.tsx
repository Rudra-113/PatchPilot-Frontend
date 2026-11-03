import { Link } from 'react-router'
import { EmptyState, ErrorState } from '@/components/feedback/states'
import { PageHeader } from '@/components/layout/page-header'
import { SeverityBadge } from '@/components/security/badges'
import { Skeleton } from '@/components/ui/skeleton'
import { usePatches } from '@/hooks/queries'
import { formatRelative } from '@/lib/format'

export default function Patches() {
  const patches = usePatches()
  return (
    <>
      <PageHeader kicker="Remediation" title="Patches" description="Generated diffs and their verification state." />
      {patches.isLoading ? <Skeleton className="h-40" /> : null}
      {patches.isError ? <ErrorState error={patches.error} onRetry={() => void patches.refetch()} /> : null}
      {patches.data && patches.data.length === 0 ? <EmptyState kicker="No patches" title="No patches yet." body="Open a finding and generate a patch, or run a scan on a new repository." /> : null}
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {patches.data?.map((patch) => (
          <div key={patch.id} className="grid gap-2 border-t border-line px-4 py-3 first:border-t-0 md:grid-cols-[88px_minmax(0,1.2fr)_minmax(0,1fr)_110px_auto] md:items-center">
            <SeverityBadge severity={patch.severity} short />
            <div>
              <Link to={`/app/vulnerabilities/${patch.vulnerabilityId}/patch`} className="text-[13px] hover:text-accent">{patch.vulnerabilityTitle}</Link>
              <p className="truncate font-mono text-[11px] text-muted">{patch.filename}</p>
            </div>
            <p className="text-[12px] text-secondary">{patch.projectName}</p>
            <p className="text-[12px] capitalize text-secondary">{patch.status.replaceAll('_', ' ')} · {formatRelative(patch.generatedAt)}</p>
            <Link to={`/app/patches/${patch.id}/validate`} className="text-[12px] text-secondary hover:text-foreground">Validation</Link>
          </div>
        ))}
      </div>
    </>
  )
}
