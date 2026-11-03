import type { ReactNode } from 'react'

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="font-mono text-[10px] tracking-[0.18em] text-muted uppercase">{kicker}</p>
        <h1 className="mt-1 text-[22px] font-medium tracking-tight">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-secondary">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
