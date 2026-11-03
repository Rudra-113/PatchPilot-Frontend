import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateProject } from '@/hooks/queries'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/errors'

const LANGUAGES = ['Python', 'TypeScript', 'Go', 'Java', 'Rust']

export default function ProjectNew() {
  const create = useCreateProject()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [language, setLanguage] = useState('Python')
  const [framework, setFramework] = useState('')
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      const project = await create.mutateAsync({ name, description, language, framework })
      toast.success(`${project.name} created`)
      navigate(`/app/repositories/connect?projectId=${project.id}`)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The project was not created.')
    }
  }

  return (
    <>
      <PageHeader kicker="Scan repository" title="Create the project" description="One project holds one repository. The source is connected on the next step, and the scan starts only when you ask." />
      <ol className="mb-6 flex max-w-3xl gap-3 font-mono text-[11px] tracking-[0.12em] uppercase">
        <li className="border border-accent/50 bg-accent/10 px-3 py-2 text-accent">01 Project</li>
        <li className="border border-line px-3 py-2 text-muted">02 Repository</li>
        <li className="border border-line px-3 py-2 text-muted">03 Scan</li>
      </ol>
      <div className="grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <form onSubmit={(event) => void submit(event)} className="border border-line bg-surface p-5 shadow-[inset_0_2px_0_var(--accent)]">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Payment Gateway" required className="h-11" />
          </div>
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="description">What it does</Label>
            <Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Billing admin, refunds, and merchant invoice intake." />
          </div>
          <div className="mt-4">
            <Label>Language</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {LANGUAGES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLanguage(item)}
                  className={cn(
                    'h-9 border px-3 text-[13px] transition-colors duration-150',
                    language === item ? 'border-accent bg-accent/15 text-foreground' : 'border-line text-secondary hover:border-line-strong hover:text-foreground',
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="framework">Framework</Label>
            <Input id="framework" value={framework} onChange={(event) => setFramework(event.target.value)} placeholder="FastAPI" className="h-11" />
          </div>
          {error ? <p className="mt-3 text-[13px] text-critical">{error}</p> : null}
          <div className="mt-5 flex gap-2">
            <Button type="submit" className="h-10" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Continue to repository'}</Button>
            <Button variant="ghost" onClick={() => navigate('/app/projects')}>Cancel</Button>
          </div>
        </form>
        <aside className="border border-complement/30 bg-complement/5 p-4">
          <p className="font-mono text-[11px] tracking-[0.14em] text-complement uppercase">What this starts</p>
          <ol className="mt-4 space-y-3 text-[13px] text-secondary">
            <li><span className="font-mono text-[11px] text-accent">01</span> The project is only a name and a language.</li>
            <li><span className="font-mono text-[11px] text-complement">02</span> GitHub is parsed from the URL. No remote is contacted.</li>
            <li><span className="font-mono text-[11px] text-foreground">03</span> The scan types each stage, then waits for you to verify any patch.</li>
          </ol>
        </aside>
      </div>
    </>
  )
}
