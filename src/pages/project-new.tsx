import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateProject } from '@/hooks/queries'
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
      <PageHeader kicker="01  Project" title="Create project" description="A project holds one repository. You connect the source on the next step." />
      <form onSubmit={(event) => void submit(event)} className="max-w-xl space-y-4 rounded-lg border border-line bg-surface p-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Payment Gateway" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">What it does</Label>
          <Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Billing admin, refunds, and merchant invoice intake." />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="language">Language</Label>
            <select id="language" value={language} onChange={(event) => setLanguage(event.target.value)} className="h-9 w-full rounded-md border border-line bg-inset px-3 text-[13px]">
              {LANGUAGES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="framework">Framework</Label>
            <Input id="framework" value={framework} onChange={(event) => setFramework(event.target.value)} placeholder="FastAPI" />
          </div>
        </div>
        {error ? <p className="text-[13px] text-critical">{error}</p> : null}
        <div className="flex gap-2">
          <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Continue to repository'}</Button>
          <Button variant="ghost" onClick={() => navigate('/app/projects')}>Cancel</Button>
        </div>
      </form>
    </>
  )
}
