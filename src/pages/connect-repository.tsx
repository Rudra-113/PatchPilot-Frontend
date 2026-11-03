import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { GithubMark } from '@/components/brand/github-mark'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useConnectRepository, useLookupRepository, useProjects, useStartScan } from '@/hooks/queries'
import { formatWhen, shortSha } from '@/lib/format'
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
  const [error, setError] = useState('')

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
      })
      const scan = await start.mutateAsync(projectId)
      toast.success('Security scan started')
      navigate(`/app/scans/${scan.id}`)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The repository was not connected.')
    }
  }

  return (
    <>
      <PageHeader kicker="02  Repository" title="Connect repository" description="GitHub URLs are parsed in this workspace. Commit metadata is filled locally until the PatchPilot API is connected." />
      <div className="max-w-2xl space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="project">Project</Label>
          <select id="project" value={projectId} onChange={(event) => setProjectId(event.target.value)} className="h-9 w-full rounded-md border border-line bg-inset px-3 text-[13px]">
            <option value="">Select a project</option>
            {projects.data?.map((project) => (
              <option key={project.id} value={project.id} disabled={Boolean(project.repository)}>
                {project.name}{project.repository ? ' · already connected' : ''}
              </option>
            ))}
          </select>
        </div>
        <Tabs defaultValue="github">
          <TabsList>
            <TabsTrigger value="github">GitHub</TabsTrigger>
            <TabsTrigger value="zip">Upload ZIP</TabsTrigger>
            <TabsTrigger value="upload">Upload repository</TabsTrigger>
          </TabsList>
          <TabsContent value="github" className="mt-4 rounded-lg border border-line bg-surface p-4">
            <form onSubmit={(event) => void resolve(event)} className="space-y-3">
              <div className="flex items-center gap-2 text-[13px]">
                <GithubMark />
                Connect GitHub
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="url">Repository URL</Label>
                <Input id="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://github.com/northline/payment-gateway" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="branch">Branch</Label>
                <Input id="branch" value={branch} onChange={(event) => setBranch(event.target.value)} />
              </div>
              <Button type="submit" variant="secondary" disabled={lookup.isPending}>{lookup.isPending ? 'Resolving…' : 'Resolve URL'}</Button>
            </form>
            {resolved ? (
              <div className="mt-4 rounded-md border border-line bg-inset p-3 text-[13px]">
                <p className="font-medium">{resolved.name}</p>
                <p className="mt-1 font-mono text-[12px] text-muted">{resolved.url}</p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                  <div><dt className="text-muted">Branch</dt><dd>{resolved.branch}</dd></div>
                  <div><dt className="text-muted">Visibility</dt><dd>{resolved.visibility}</dd></div>
                  <div className="col-span-2"><dt className="text-muted">Last commit</dt><dd>{resolved.lastCommit ? `${shortSha(resolved.lastCommit.sha)} · ${resolved.lastCommit.message} · ${formatWhen(resolved.lastCommit.committedAt)}` : 'Not fetched. The API will fill this when GitHub is connected.'}</dd></div>
                </dl>
                <Button className="mt-3" disabled={connect.isPending || start.isPending} onClick={() => void begin('github')}>
                  Start Security Scan
                </Button>
              </div>
            ) : null}
          </TabsContent>
          <TabsContent value="zip" className="mt-4 rounded-lg border border-line bg-surface p-4">
            <Label htmlFor="zip">ZIP archive</Label>
            <Input id="zip" className="mt-1.5" type="file" accept=".zip,application/zip" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? '')} />
            <p className="mt-2 text-[12px] text-muted">{fileName || 'Choose a .zip export of the repository.'}</p>
            <Button className="mt-3" disabled={!fileName || connect.isPending} onClick={() => void begin('zip')}>Start Security Scan</Button>
          </TabsContent>
          <TabsContent value="upload" className="mt-4 rounded-lg border border-line bg-surface p-4">
            <Label htmlFor="folder">Repository directory</Label>
            <Input id="folder" className="mt-1.5" type="file" multiple onChange={(event) => setFileName(event.target.files?.[0]?.webkitRelativePath?.split('/')[0] || event.target.files?.[0]?.name || '')} {...{ webkitdirectory: '', directory: '' }} />
            <p className="mt-2 text-[12px] text-muted">{fileName ? `Selected ${fileName}` : 'Choose the repository root. Files stay in the browser.'}</p>
            <Button className="mt-3" disabled={!fileName || connect.isPending} onClick={() => void begin('upload')}>Start Security Scan</Button>
          </TabsContent>
        </Tabs>
        {error ? <p className="text-[13px] text-critical">{error}</p> : null}
      </div>
    </>
  )
}
