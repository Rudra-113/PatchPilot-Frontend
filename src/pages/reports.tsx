import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyState, ErrorState } from '@/components/feedback/states'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useCreateReport, useProjects, useReportDownload, useReports } from '@/hooks/queries'
import { formatWhen } from '@/lib/format'
import { downloadText } from '@/lib/utils'
import { ApiError } from '@/services/errors'

export default function Reports() {
  const reports = useReports()
  const projects = useProjects()
  const create = useCreateReport()
  const download = useReportDownload()
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')

  const generate = async () => {
    try {
      const report = await create.mutateAsync({ title: title || undefined, projectId: projectId || null })
      toast.success(`${report.title} created`)
      setTitle('')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'The report was not created.')
    }
  }

  const save = async (reportId: string) => {
    try {
      const document = await download.mutateAsync(reportId)
      downloadText(`${document.report.title.replaceAll(' ', '-').toLowerCase()}.md`, document.markdown, 'text/markdown')
      toast.success('Report downloaded')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'The report was not downloaded.')
    }
  }

  return (
    <>
      <PageHeader kicker="Record" title="Reports" description="Snapshots of the workspace, written as Markdown you can keep." />
      <div className="mb-4 flex flex-col gap-2 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Report title" aria-label="Report title" />
        <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="h-9 rounded-md border border-line bg-inset px-3 text-[13px]" aria-label="Project">
          <option value="">All projects</option>
          {projects.data?.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <Button onClick={() => void generate()} disabled={create.isPending}>Generate</Button>
      </div>
      {reports.isLoading ? <Skeleton className="h-32" /> : null}
      {reports.isError ? <ErrorState error={reports.error} onRetry={() => void reports.refetch()} /> : null}
      {reports.data && reports.data.length === 0 ? <EmptyState kicker="No reports" title="No reports yet." body="Generate one from the current findings." /> : null}
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {reports.data?.map((report, index) => (
          <article key={report.id} className="pp-rise pp-row flex flex-col gap-2 border-t border-line px-4 py-3 first:border-t-0 hover:bg-foreground/4 sm:flex-row sm:items-center sm:justify-between" style={{ animationDelay: `${index * 50}ms` }}>
            <div>
              <h2 className="text-[14px] font-medium">{report.title}</h2>
              <p className="text-[12px] text-secondary">{report.summary}</p>
              <p className="mt-1 font-mono text-[11px] text-muted">{formatWhen(report.createdAt)}{report.projectName ? ` · ${report.projectName}` : ''}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => void save(report.id)}>Download</Button>
          </article>
        ))}
      </div>
    </>
  )
}
