import { cn } from '@/lib/utils'

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-5', className)} aria-hidden="true">
      <rect width="24" height="24" rx="3" fill="currentColor" />
      <path d="M7.4 17.4V6.6h5.15c2.05 0 3.35 1.2 3.35 3s-1.3 3-3.35 3H7.4" fill="none" stroke="var(--bg)" strokeWidth="1.8" strokeLinejoin="miter" />
    </svg>
  )
}

export function Wordmark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5 text-foreground', className)}>
      <Mark className="text-accent" />
      {compact ? <span className="sr-only">PatchPilot</span> : <span className="text-[13px] font-medium tracking-[0.18em]">PATCHPILOT</span>}
    </span>
  )
}
