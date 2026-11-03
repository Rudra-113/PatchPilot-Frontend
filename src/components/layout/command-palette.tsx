import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useProjects } from '@/hooks/queries'
import { COMMAND_ROUTES } from '@/lib/nav'

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate()
  const projects = useProjects()
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const items = useMemo(() => {
    const routes = COMMAND_ROUTES.map((item) => ({ id: item.to, label: item.label, hint: 'Navigate', to: item.to }))
    const projectItems = (projects.data ?? []).map((project) => ({
      id: project.id,
      label: project.name,
      hint: project.repository?.name ?? 'Project',
      to: `/app/projects/${project.id}`,
    }))
    const all = [...routes, ...projectItems]
    const needle = query.trim().toLowerCase()
    return needle ? all.filter((item) => `${item.label} ${item.hint}`.toLowerCase().includes(needle)) : all
  }, [projects.data, query])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Command" description="Jump to a view or a project." className="p-3">
        <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Overview, Payment Gateway, patches…" aria-label="Command" />
        <ul className="mt-3 max-h-72 overflow-auto">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-[13px] hover:bg-foreground/5"
                onClick={() => {
                  navigate(item.to)
                  onOpenChange(false)
                }}
              >
                <span>{item.label}</span>
                <span className="text-[11px] text-muted">{item.hint}</span>
              </button>
            </li>
          ))}
          {!items.length ? <li className="px-2 py-6 text-[13px] text-secondary">Nothing matches that.</li> : null}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
