import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { GithubMark } from '@/components/brand/github-mark'
import { ScanBackdrop } from '@/components/layout/scan-backdrop'
import { ScanSteps } from '@/components/layout/scan-steps'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useConnectRepository, useLookupRepository, useProjects, useStartScan } from '@/hooks/queries'
import { formatWhen, shortSha } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/errors'
import type { LookupResult, RepoProvider } from '@/types/api'

export default function ConnectRepository() {
  const [params] = useSearchParams()
  const projects = useProjects()
  const [projectId, setProjectId] = useState(params.get('projectId') ?? '')
  const lookup = useLookupRepository()
  const connect = useConnectRepository()
  const start = useStartScan()
  const navigate = useNavigate()
  const [url, setUrl] = useState('https://github.com/')
  const [branch, setBranch] = useState('main')
  const [resolved, setResolved] = useState<LookupResult | null>(null)
  const [fileName, setFileName] = useState('')
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [folderFiles, setFolderFiles] = useState<File[]>([])
  const [error, setError] = useState('')
  const [mode, setMode] = useState<RepoProvider>('github')

  const resolve = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      const result = await lookup.mutateAsync({ url, branch })
      setResolved(result)
    } catch (caught) {
      setResolved(null)
      setError(caught instanceof ApiError ? caught.message : 'The URL could not be parsed.')
    }
  }

  const begin = async (provider: RepoProvider) => {
    if (!projectId) {
      setError('Choose a project first.')
      return
    }
    setError('')
    try {
      const project = projects.data?.find((item) => item.id === projectId)
      await connect.mutateAsync({
        projectId,
        provider,
        url: provider === 'github' ? resolved?.url : undefined,
        branch: provider === 'github' ? resolved?.branch : 'main',
        name: provider === 'github' ? resolved?.name : fileName,
        fileName,
        language: project?.language,
        file: provider === 'zip' ? zipFile ?? undefined : undefined,
        files: provider === 'upload' ? folderFiles : undefined,
      })
      const scan = await start.mutateAsync(projectId)
      toast.success('Security scan started')
      navigate(`/app/scans/${scan.id}`)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The repository was not connected.')
    }
  }

  return (
    <div className="relative -mx-4 -mt-6 min-h-[calc(100dvh-3.5rem)] overflow-hidden px-4 pt-6 pb-12 sm:-mx-6 sm:px-6">
      <ScanBackdrop />
      <div className="relative z-10">
      <PageHeader kicker="Scan repository" title="Connect the source" description="GitHub URLs are parsed here. No remote is contacted. Commit metadata is filled locally until the PatchPilot API is connected." />
      <ScanSteps current={2} />
      <div className="max-w-3xl space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="project">Project</Label>
          <select id="project" value={projectId} onChange={(event) => setProjectId(event.target.value)} className="h-11 w-full border border-line bg-inset px-3 text-[13px]">
            <option value="">Select a project</option>
            {projects.data?.map((project) => (
              <option key={project.id} value={project.id} disabled={Boolean(project.repository)}>
                {project.name}{project.repository ? ' · already connected' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {([
            ['github', 'GitHub', 'Parse a repository URL. Nothing is fetched.'],
            ['zip', 'ZIP archive', 'A .zip export. It stays in this browser.'],
            ['upload', 'Folder', 'The working tree. Files are not uploaded.'],
          ] as const).map(([key, title, body]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={cn(
                'border p-3 text-left transition-colors duration-150',
                mode === key ? 'border-accent bg-accent/10 shadow-[inset_0_2px_0_var(--accent)]' : 'border-line bg-surface hover:border-line-strong',
              )}
            >
              <span className="flex items-center gap-2 text-[14px] font-medium">
                {key === 'github' ? <GithubMark /> : null}
                {title}
              </span>
              <span className="mt-1 block text-[12px] leading-relaxed text-secondary">{body}</span>
            </button>
          ))}
        </div>
        {mode === 'github' ? (
          <div className="border border-line bg-surface p-4 shadow-[inset_3px_0_0_var(--complement)]">
            <form onSubmit={(event) => void resolve(event)} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="url">Repository URL</Label>
                <Input id="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://github.com/northline/payment-gateway" className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="branch">Branch</Label>
                <Input id="branch" value={branch} onChange={(event) => setBranch(event.target.value)} className="h-11" />
              </div>
              <Button type="submit" variant="secondary" disabled={lookup.isPending}>{lookup.isPending ? 'Resolving…' : 'Resolve URL'}</Button>
            </form>
            {resolved ? (
              <div className="mt-4 border border-accent/40 bg-inset p-4 text-[13px]">
                <p className="font-mono text-[11px] tracking-[0.14em] text-accent uppercase">Resolved locally</p>
                <p className="mt-1 text-[16px] font-medium">{resolved.name}</p>
                <p className="mt-1 font-mono text-[12px] text-muted">{resolved.url}</p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                  <div><dt className="text-muted">Branch</dt><dd>{resolved.branch}</dd></div>
                  <div><dt className="text-muted">Visibility</dt><dd>{resolved.visibility}</dd></div>
                  <div className="col-span-2"><dt className="text-muted">Last commit</dt><dd>{resolved.lastCommit ? `${shortSha(resolved.lastCommit.sha)} · ${resolved.lastCommit.message} · ${formatWhen(resolved.lastCommit.committedAt)}` : 'Not fetched. The API will fill this when GitHub is connected.'}</dd></div>
                </dl>
                <Button className="mt-4 h-10" disabled={connect.isPending || start.isPending} onClick={() => void begin('github')}>
                  Start Security Scan
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
        {mode === 'zip' ? (
          <div className="border border-line bg-surface p-4 shadow-[inset_3px_0_0_var(--accent)]">
            <Label htmlFor="zip">ZIP archive</Label>
            <Input id="zip" className="mt-1.5 h-11" type="file" accept=".zip,application/zip" onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              setZipFile(file)
              setFileName(file?.name ?? '')
            }} />
            <p className="mt-2 text-[12px] text-muted">{fileName || 'Choose a .zip export of the repository.'}</p>
            <Button className="mt-4 h-10" disabled={!fileName || connect.isPending} onClick={() => void begin('zip')}>Start Security Scan</Button>
          </div>
        ) : null}
        {mode === 'upload' ? (
          <div className="border border-line bg-surface p-4 shadow-[inset_3px_0_0_var(--complement)]">
            <Label htmlFor="folder">Repository directory</Label>
            <Input id="folder" className="mt-1.5 h-11" type="file" multiple onChange={(event) => {
              const files = Array.from(event.target.files ?? [])
              setFolderFiles(files)
              setFileName(files[0]?.webkitRelativePath?.split('/')[0] || files[0]?.name || '')
            }} {...{ webkitdirectory: '', directory: '' }} />
            <p className="mt-2 text-[12px] text-muted">{fileName ? `Selected ${fileName}` : 'Choose the repository root. Files stay in the browser.'}</p>
            <Button className="mt-4 h-10" disabled={!fileName || connect.isPending} onClick={() => void begin('upload')}>Start Security Scan</Button>
          </div>
        ) : null}
        {error ? <p className="text-[13px] text-critical">{error}</p> : null}
      </div>
      </div>
    </div>
  )
}
