import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <span className="pointer-events-none absolute top-0 left-0 size-2.5 border-t border-l border-foreground/25" />
      <span className="pointer-events-none absolute top-0 right-0 size-2.5 border-t border-r border-foreground/25" />
      <span className="pointer-events-none absolute bottom-0 left-0 size-2.5 border-b border-l border-foreground/25" />
      <span className="pointer-events-none absolute right-0 bottom-0 size-2.5 border-r border-b border-foreground/25" />
      {children}
    </div>
  )
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-lg border border-line bg-surface', className)}>{children}</section>
}
