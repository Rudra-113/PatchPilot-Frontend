import { motion } from 'framer-motion'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { ScanBackdrop } from '@/components/layout/scan-backdrop'
import { ScanSteps } from '@/components/layout/scan-steps'
import { PageHeader } from '@/components/layout/page-header'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateProject } from '@/hooks/queries'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/errors'

const LANGUAGES = [
  { name: 'Python', detail: 'FastAPI, Django, scripts' },
  { name: 'TypeScript', detail: 'Node services and web' },
  { name: 'Go', detail: 'Services and CLIs' },
  { name: 'Java', detail: 'Spring and the JVM' },
  { name: 'Rust', detail: 'Proxies and native tools' },
]

export default function ProjectNew() {
  const create = useCreateProject()
  const navigate = useNavigate()
  const reduced = usePrefersReducedMotion()
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
    <div className="relative -mx-4 -mt-6 min-h-[calc(100dvh-3.5rem)] overflow-hidden px-4 pt-6 pb-12 sm:-mx-6 sm:px-6">
      <ScanBackdrop />
      <div className="relative z-10">
        <PageHeader kicker="Scan repository" title="Create the project" description="One project holds one repository. The source is connected on the next step, and the scan starts only when you ask." />
        <ScanSteps current={1} />
        <div className="grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <form onSubmit={(event) => void submit(event)} className="border border-line bg-surface/95 p-5 shadow-[inset_0_2px_0_var(--accent),inset_3px_0_0_var(--complement)]">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Payment Gateway" required className="h-11 bg-inset/90" />
            </div>
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="description">What it does</Label>
              <Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Billing admin, refunds, and merchant invoice intake." className="bg-inset/90" />
            </div>
            <div className="mt-5">
              <div className="flex items-baseline justify-between gap-3">
                <Label>Language</Label>
                <span className="font-mono text-[11px] text-accent">{language}</span>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {LANGUAGES.map((item) => {
                  const selected = language === item.name
                  return (
                    <motion.button
                      key={item.name}
                      type="button"
                      onClick={() => setLanguage(item.name)}
                      whileTap={reduced ? undefined : { scale: 0.97 }}
                      className={cn(
                        'relative border px-3 py-2.5 text-left transition-colors duration-150',
                        selected ? 'border-accent bg-accent/12 text-foreground' : 'border-line bg-inset/80 text-secondary hover:border-complement/50 hover:text-foreground',
                      )}
                    >
                      {selected ? <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" /> : null}
                      <span className="block text-[13px] font-medium">{item.name}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-muted">{item.detail}</span>
                    </motion.button>
                  )
                })}
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="framework">Framework</Label>
              <Input id="framework" value={framework} onChange={(event) => setFramework(event.target.value)} placeholder="FastAPI" className="h-11 bg-inset/90" />
            </div>
            {error ? <p className="mt-3 text-[13px] text-critical">{error}</p> : null}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <motion.button
                type="submit"
                disabled={create.isPending}
                whileTap={reduced || create.isPending ? undefined : { scale: 0.985 }}
                className="group relative flex h-14 min-w-0 flex-1 items-center justify-between overflow-hidden bg-accent px-4 text-left text-accent-fg disabled:opacity-40"
              >
                <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-white/25 pp-sheen" />
                <span>
                  <span className="block font-mono text-[10px] tracking-[0.16em] uppercase opacity-70">{create.isPending ? 'Creating' : 'Step 02'}</span>
                  <span className="block text-[15px] font-medium">{create.isPending ? 'Saving the project…' : 'Continue to the repository'}</span>
                </span>
                <span className="font-mono text-[18px] transition-transform duration-200 group-hover:translate-x-1">→</span>
              </motion.button>
              <motion.button
                type="button"
                onClick={() => navigate('/app/projects')}
                whileTap={reduced ? undefined : { scale: 0.98 }}
                className="h-14 border border-line-strong bg-inset/80 px-4 text-left text-[13px] text-secondary transition-colors duration-150 hover:border-complement hover:text-foreground sm:w-36"
              >
                <span className="block font-mono text-[10px] tracking-[0.14em] text-muted uppercase">Leave</span>
                <span className="block font-medium text-foreground">Back to projects</span>
              </motion.button>
            </div>
          </form>
          <aside className="border border-complement/40 bg-surface/90 p-4 shadow-[inset_3px_0_0_var(--complement)]">
            <p className="font-mono text-[11px] tracking-[0.14em] text-complement uppercase">What this starts</p>
            <ol className="mt-4 space-y-4 text-[13px] leading-relaxed text-secondary">
              <li><span className="font-mono text-[11px] text-accent">01</span> The project is a name and a language. No repository is contacted.</li>
              <li><span className="font-mono text-[11px] text-complement">02</span> A GitHub URL is parsed locally. A zip or folder stays in this browser.</li>
              <li><span className="font-mono text-[11px] text-foreground">03</span> The scan types each stage. A patch stays unverified until you run the checks.</li>
            </ol>
          </aside>
        </div>
      </div>
    </div>
  )
}
