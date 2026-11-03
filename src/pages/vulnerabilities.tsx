import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { EmptyState, ErrorState } from '@/components/feedback/states'
import { PageHeader } from '@/components/layout/page-header'
import { SeverityBadge, StatusText } from '@/components/security/badges'
import { Input } from '@/components/ui/input'
import { SelectMenu } from '@/components/ui/select-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useDebounced } from '@/hooks/use-debounced'
import { useMeta, useVulnerabilities } from '@/hooks/queries'
import { STATUS_LABEL } from '@/lib/severity'
import type { Severity, VulnStatus, VulnerabilityQuery } from '@/types/api'

const SEVERITIES = ['', 'critical', 'high', 'medium', 'low']
const STATUSES = ['open', 'unresolved', 'in_review', 'patch_ready', 'validating', 'verified', 'fixed', 'accepted_risk', '']

export default function Vulnerabilities() {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') ?? '')
  const debounced = useDebounced(search)
  const meta = useMeta()

  useEffect(() => {
    const next = new URLSearchParams(params)
    if (debounced) next.set('q', debounced)
    else next.delete('q')
    if (next.toString() !== params.toString()) setParams(next, { replace: true })
  }, [debounced, params, setParams])

  const query = useMemo<VulnerabilityQuery>(() => ({
    q: params.get('q') ?? '',
    severity: (params.get('severity') ?? '') as Severity | '',
    scanner: params.get('scanner') ?? '',
    language: params.get('language') ?? '',
    status: (params.get('status') ?? 'open') as VulnerabilityQuery['status'],
    projectId: params.get('projectId') ?? '',
    scanId: params.get('scanId') ?? '',
  }), [params])

  const vulns = useVulnerabilities(query)
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <>
      <PageHeader
        kicker="Findings"
        title="Vulnerabilities"
        description={vulns.data ? `${vulns.data.matched} shown · ${vulns.data.total} recorded` : 'Severity, sink, and status for every recorded finding.'}
      />
      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, file, CWE" aria-label="Search vulnerabilities" className="lg:max-w-xs" />
        <div className="flex flex-wrap gap-2">
          <SelectMenu label="Severity" value={query.severity ?? ''} onChange={(value) => setFilter('severity', value)} options={SEVERITIES.map((value) => ({ value, label: value ? value : 'Any' }))} />
          <SelectMenu label="Scanner" value={query.scanner ?? ''} onChange={(value) => setFilter('scanner', value)} options={[{ value: '', label: 'Any' }, ...(meta.data?.scanners ?? []).map((value) => ({ value, label: value }))]} />
          <SelectMenu label="Language" value={query.language ?? ''} onChange={(value) => setFilter('language', value)} options={[{ value: '', label: 'Any' }, ...(meta.data?.languages ?? []).map((value) => ({ value, label: value }))]} />
          <SelectMenu label="Status" value={query.status || ''} onChange={(value) => setFilter('status', value)} options={STATUSES.map((value) => ({ value, label: value ? STATUS_LABEL[value as VulnStatus | 'open'] : 'Any' }))} />
        </div>
      </div>
      {vulns.isLoading ? <Skeleton className="h-64" /> : null}
      {vulns.isError ? <ErrorState error={vulns.error} onRetry={() => void vulns.refetch()} /> : null}
      {vulns.data && vulns.data.items.length === 0 ? (
        <EmptyState kicker="No matches" title="No findings for these filters." body="Clear a filter or switch status to All. Fixed findings are hidden while status is Open." action={null} />
      ) : null}
      {vulns.data && vulns.data.items.length > 0 ? (
        <>
          <div className="space-y-2 lg:hidden">
            {vulns.data.items.map((item, index) => (
              <Link key={item.id} to={`/app/vulnerabilities/${item.id}`} className="pp-card pp-rise block rounded-lg border border-line bg-surface p-3" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
                <div className="flex items-center justify-between gap-2">
                  <SeverityBadge severity={item.severity} short />
                  <StatusText status={item.status} />
                </div>
                <p className="mt-2 text-[14px]">{item.title}</p>
                <p className="mt-1 font-mono text-[11px] text-muted">{item.file}:{item.line}</p>
                <p className="mt-1 text-[12px] text-secondary">{item.cwe} · {item.scanner} · {item.projectName}</p>
              </Link>
            ))}
          </div>
          <FindingTable items={vulns.data.items} />
        </>
      ) : null}
    </>
  )
}

function FindingTable({ items }: { items: Array<{ id: string; severity: Severity; title: string; file: string; line: number; cwe: string; scanner: string; status: VulnStatus; projectName: string }> }) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  })
  return (
    <div ref={parentRef} className="hidden max-h-[calc(100vh-240px)] overflow-auto rounded-lg border border-line bg-surface lg:block">
      <div className="sticky top-0 z-10 grid grid-cols-[76px_minmax(180px,1.3fr)_minmax(160px,1fr)_64px_88px_96px_120px] gap-2 border-b border-line bg-elevated px-3 py-2 text-[10px] tracking-[0.14em] text-muted uppercase">
        <span>Severity</span><span>Vulnerability</span><span>File</span><span>Line</span><span>CWE</span><span>Scanner</span><span>Status</span>
      </div>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtual) => {
          const item = items[virtual.index]
          return (
            <Link
              key={item.id}
              to={`/app/vulnerabilities/${item.id}`}
              className="pp-row absolute right-0 left-0 grid grid-cols-[76px_minmax(180px,1.3fr)_minmax(160px,1fr)_64px_88px_96px_120px] items-center gap-2 border-b border-line px-3 text-[13px] hover:bg-foreground/4"
              style={{ height: virtual.size, transform: `translateY(${virtual.start}px)` }}
            >
              <SeverityBadge severity={item.severity} short />
              <span className="truncate">{item.title}<span className="ml-2 text-[11px] text-muted">{item.projectName}</span></span>
              <span className="truncate font-mono text-[12px] text-secondary">{item.file}</span>
              <span className="font-mono text-[12px] tabular">{item.line}</span>
              <span className="font-mono text-[12px] text-secondary">{item.cwe}</span>
              <span className="text-[12px] text-secondary">{item.scanner}</span>
              <StatusText status={item.status} />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
