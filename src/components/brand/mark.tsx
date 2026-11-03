import { cn } from '@/lib/utils'

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-5', className)} aria-hidden="true">
      <path d="M5 8V5h3M16 5h3v3M19 16v3h-3M8 19H5v-3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.5 12h3.2l1.6-2.2 1.8 4.4 1.5-2.2H17" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function Wordmark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2 text-foreground', className)}>
      <Mark className="text-accent" />
      {compact ? <span className="sr-only">PatchPilot</span> : <span className="text-[13px] font-medium tracking-[0.16em]">PATCHPILOT</span>}
    </span>
  )
}
