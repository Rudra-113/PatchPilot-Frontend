import type { ReactNode } from 'react'
import { ApiError } from '@/services/errors'
import { Button } from '@/components/ui/button'
import { apiBase } from '@/services/client'

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'The workspace could not be loaded.'
  const base = apiBase()
  return (
    <div className="rounded-lg border border-line bg-surface px-5 py-8">
      <p className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">Request failed</p>
      <h2 className="mt-2 text-[16px] font-medium">This view did not load.</h2>
      <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-secondary">{message}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
        {base ? (
          <Button
            variant="ghost"
            onClick={() => {
              localStorage.removeItem('patchpilot.apiBaseUrl')
              window.location.reload()
            }}
          >
            Use local workspace
          </Button>
        ) : null}
      </div>
      {error instanceof ApiError && error.status === 0 ? (
        <p className="mt-3 text-[12px] text-muted">Check the API base URL in Settings, or clear it to return to the local workspace.</p>
      ) : null}
    </div>
  )
}

export function EmptyState({
  kicker,
  title,
  body,
  action,
}: {
  kicker: string
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-surface px-5 py-10">
      <p className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">{kicker}</p>
      <h2 className="mt-2 text-[16px] font-medium">{title}</h2>
      <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-secondary">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
