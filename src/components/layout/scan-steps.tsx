import { cn } from '@/lib/utils'

const STEPS = [
  ['01', 'Project', 'Name and language'],
  ['02', 'Repository', 'URL, zip, or folder'],
  ['03', 'Scan', 'Stages, then you decide'],
] as const

export function ScanSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="mb-8 grid gap-2 sm:grid-cols-3">
      {STEPS.map(([index, title, detail], step) => {
        const active = step + 1 === current
        const done = step + 1 < current
        return (
          <li
            key={index}
            className={cn(
              'relative border px-3 py-3',
              active ? 'border-accent/70 bg-accent/10' : done ? 'border-complement/40 bg-complement/8' : 'border-line bg-surface/70',
            )}
          >
            {active ? <span className="absolute inset-x-0 top-0 h-0.5 bg-accent" /> : null}
            {done ? <span className="absolute inset-x-0 top-0 h-0.5 bg-complement" /> : null}
            <p className={cn('font-mono text-[11px] tracking-[0.14em]', active ? 'text-accent' : done ? 'text-complement' : 'text-muted')}>{index}</p>
            <p className="mt-1 text-[14px] font-medium">{title}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-secondary">{detail}</p>
          </li>
        )
      })}
    </ol>
  )
}
