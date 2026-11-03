import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { DiffView } from '@/components/code/code-viewer'
import { ErrorState } from '@/components/feedback/states'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useState } from 'react'
import { usePreparePullRequest, useStartValidation, useVulnerabilityPatch } from '@/hooks/queries'
import { downloadPatch } from '@/services/patches'
import { downloadText, copyText } from '@/lib/utils'
import { ApiError } from '@/services/errors'
import type { PullRequestDraft } from '@/types/api'

export default function PatchView() {
  const { vulnerabilityId = '' } = useParams()
  const patch = useVulnerabilityPatch(vulnerabilityId, Boolean(vulnerabilityId))
  const validate = useStartValidation()
  const prepare = usePreparePullRequest()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<PullRequestDraft | null>(null)

  if (patch.isLoading) return <Skeleton className="h-96" />
  if (patch.isError || !patch.data) return <ErrorState error={patch.error} onRetry={() => void patch.refetch()} />
  const data = patch.data

  const runValidation = async () => {
    try {
      await validate.mutateAsync(data.id)
      navigate(`/app/patches/${data.id}/validate`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Validation did not start.')
    }
  }

  const download = async () => {
    try {
      const file = await downloadPatch(data.id)
      downloadText(file.filename, file.diff, 'text/x-diff')
      toast.success('Diff downloaded')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'The diff was not downloaded.')
    }
  }

  const pullRequest = async () => {
    try {
      setDraft(await prepare.mutateAsync(data.id))
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'The pull request was not prepared.')
    }
  }

  return (
    <>
      <PageHeader
        kicker={`${data.projectName} · ${data.additions} additions · ${data.deletions} deletions`}
        title="AI Generated Patch"
        description={data.filename}
        actions={
          <>
            <Button variant="ghost" asChild><Link to={`/app/vulnerabilities/${data.vulnerabilityId}`}>Finding</Link></Button>
            <Button variant="secondary" onClick={() => void download()}>Download diff</Button>
            <Button variant="secondary" onClick={() => void pullRequest()}>Prepare pull request</Button>
            <Button onClick={() => void runValidation()} disabled={validate.isPending || data.status === 'validating'}>
              {data.status === 'verified' || data.status === 'applied' ? 'Re-validate patch' : 'Validate patch'}
            </Button>
          </>
        }
      />
      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface px-4 py-3">
          <p className="text-[11px] tracking-[0.14em] text-critical uppercase">Before</p>
          <p className="mt-1 text-[13px] text-secondary">Vulnerable source on the left.</p>
        </div>
        <div className="rounded-lg border border-line bg-surface px-4 py-3">
          <p className="text-[11px] tracking-[0.14em] text-secure uppercase">After</p>
          <p className="mt-1 text-[13px] text-secondary">Patched source on the right, or below on a narrow screen.</p>
        </div>
      </div>
      <DiffView filename={data.filename} before={data.before} after={data.after} />
      <section className="mt-3 max-w-3xl rounded-lg border border-line bg-surface p-4">
        <h2 className="text-[13px] font-medium">Why this fixes the vulnerability</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-secondary">{data.explanation}</p>
        <p className="mt-3 font-mono text-[11px] text-muted">{data.model}</p>
      </section>
      <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent title="Pull request prepared" description={draft?.detail}>
          {draft ? (
            <div className="space-y-3 text-[13px]">
              <p><span className="text-muted">Branch </span><span className="font-mono">{draft.branch}</span> → {draft.base}</p>
              <p className="font-medium">{draft.title}</p>
              <pre className="max-h-48 overflow-auto rounded-md bg-inset p-3 font-mono text-[12px] whitespace-pre-wrap text-secondary">{draft.body}</pre>
              <Button
                variant="secondary"
                onClick={() => {
                  void copyText(`${draft.title}\n\n${draft.body}`).then(() => toast.success('Pull request text copied'))
                }}
              >
                Copy request
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
