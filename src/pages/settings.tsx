import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/feedback/states'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useTheme } from '@/context/theme'
import { useSettings, useUpdateSettings } from '@/hooks/queries'
import { apiBase } from '@/services/client'
import { ApiError } from '@/services/errors'
import type { Settings } from '@/types/api'

export default function SettingsPage() {
  const settings = useSettings()
  const update = useUpdateSettings()
  const { setTheme } = useTheme()
  const [draft, setDraft] = useState<Settings | null>(null)

  useEffect(() => {
    if (settings.data) setDraft(settings.data)
  }, [settings.data])

  if (settings.isLoading) return <Skeleton className="h-64" />
  if (settings.isError || !settings.data || !draft) {
    if (!settings.data) return <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />
    return <Skeleton className="h-64" />
  }

  const save = async () => {
    try {
      const next = await update.mutateAsync(draft)
      setTheme(next.theme)
      toast.success('Settings saved')
      if ((next.apiBaseUrl || '') !== (apiBase() || '') && next.apiBaseUrl) {
        window.location.reload()
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Settings were not saved.')
    }
  }

  return (
    <>
      <PageHeader kicker="Workspace" title="Settings" description="Appearance, scanners, and where API calls are sent." />
      <div className="max-w-xl space-y-6">
        <section className="rounded-lg border border-line bg-surface p-4">
          <h2 className="text-[13px] font-medium">Appearance</h2>
          <div className="mt-3 flex gap-2">
            {(['dark', 'light'] as const).map((mode) => (
              <Button key={mode} variant={draft.theme === mode ? 'primary' : 'secondary'} onClick={() => setDraft({ ...draft, theme: mode })}>
                {mode === 'dark' ? 'Dark' : 'Light'}
              </Button>
            ))}
          </div>
        </section>
        <section className="space-y-3 rounded-lg border border-line bg-surface p-4">
          <Toggle label="Email alerts" checked={draft.emailAlerts} onChange={(emailAlerts) => setDraft({ ...draft, emailAlerts })} />
          <Toggle label="Scan on push" checked={draft.scanOnPush} onChange={(scanOnPush) => setDraft({ ...draft, scanOnPush })} />
          {Object.entries(draft.scanners).map(([key, enabled]) => (
            <Toggle
              key={key}
              label={key}
              checked={enabled}
              onChange={(value) => setDraft({ ...draft, scanners: { ...draft.scanners, [key]: value } })}
            />
          ))}
        </section>
        <section className="rounded-lg border border-line bg-surface p-4">
          <Label htmlFor="api">API base URL</Label>
          <Input id="api" className="mt-1.5" value={draft.apiBaseUrl} onChange={(event) => setDraft({ ...draft, apiBaseUrl: event.target.value })} placeholder="http://127.0.0.1:8000" />
          <p className="mt-2 text-[12px] leading-relaxed text-muted">Leave this blank to use the local workspace. A value is stored in the browser and used on the next load. The FastAPI service should expose the routes documented in the README.</p>
        </section>
        <Button onClick={() => void save()} disabled={update.isPending}>Save settings</Button>
      </div>
    </>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] capitalize">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  )
}
