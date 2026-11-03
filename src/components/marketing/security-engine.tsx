import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Frame } from '@/components/layout/frame'
import { Mark } from '@/components/brand/mark'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'
import { cn } from '@/lib/utils'

const PHASES = [
  { key: 'repository', label: 'Repository', node: null, copy: 'The default branch and lockfiles are read. Nothing is executed.' },
  { key: 'detect', label: 'Threat Detection', node: 'scan', copy: 'Static rules trace untrusted input into a dangerous sink.' },
  { key: 'analyze', label: 'AI Analysis', node: 'analyze', copy: 'The model writes the data flow, the impact, and a confidence score.' },
  { key: 'patch', label: 'Patch Generation', node: 'patch', copy: 'A minimal diff is drafted against the vulnerable lines.' },
  { key: 'validate', label: 'Validation', node: 'validate', copy: 'The patch is built and scanned again in isolation.' },
  { key: 'secure', label: 'Secure', node: null, copy: 'The finding closes only after verification holds.' },
] as const

const NODES = [
  { id: 'scan', label: 'SCAN', x: 50, y: 14 },
  { id: 'analyze', label: 'ANALYZE', x: 86, y: 50 },
  { id: 'patch', label: 'PATCH', x: 50, y: 86 },
  { id: 'validate', label: 'VALIDATE', x: 14, y: 50 },
]

export function SecurityEngine() {
  const reduced = usePrefersReducedMotion()
  const [index, setIndex] = useState(0)
  const [pinned, setPinned] = useState<number | null>(null)
  const active = pinned ?? index
  const phase = PHASES[active]

  useEffect(() => {
    if (reduced || pinned !== null) return
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % PHASES.length), 3200)
    return () => window.clearInterval(timer)
  }, [reduced, pinned])

  return (
    <Frame className="border border-line bg-inset/90 p-4 sm:p-5">
      <div className="grid items-center gap-5 lg:grid-cols-[168px_minmax(0,1fr)]">
        <ol className="relative space-y-1">
          {PHASES.map((item, itemIndex) => {
            const selected = itemIndex === active
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => setPinned(itemIndex === pinned ? null : itemIndex)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors duration-150',
                    selected ? 'bg-foreground/5 text-foreground' : 'text-secondary hover:text-foreground',
                  )}
                >
                  <span className={cn('size-1.5 rounded-full', selected ? (item.key === 'secure' ? 'bg-secure' : 'bg-accent') : 'bg-line-strong')} />
                  <span className="font-mono text-[10px] text-muted">{String(itemIndex + 1).padStart(2, '0')}</span>
                  {item.label}
                </button>
              </li>
            )
          })}
        </ol>
        <div className="relative mx-auto aspect-square w-full max-w-[420px]">
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
            {NODES.map((node) => (
              <line key={node.id} x1="50" y1="50" x2={node.x} y2={node.y} stroke="currentColor" strokeOpacity={phase.node === node.id ? 0.55 : 0.16} />
            ))}
            {!reduced
              ? [0, 1, 2].map((particle) => (
                  <motion.circle
                    key={particle}
                    r="0.9"
                    fill="var(--accent)"
                    initial={{ opacity: 0.2 }}
                    animate={{
                      cx: [50, 50, 86, 50, 14, 50],
                      cy: [50, 14, 50, 86, 50, 50],
                      opacity: [0.15, 0.8, 0.8, 0.8, 0.8, 0.15],
                    }}
                    transition={{ duration: 11, repeat: Infinity, ease: 'linear', delay: particle * 2.4 }}
                  />
                ))
              : null}
          </svg>
          <div
            className={cn(
              'absolute top-1/2 left-1/2 grid size-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg border bg-surface text-center transition-colors duration-300',
              phase.key === 'secure' ? 'border-secure/50' : 'border-line-strong',
            )}
          >
            <div>
              <Mark className={cn('mx-auto', phase.key === 'secure' ? 'text-secure' : 'text-accent')} />
              <p className="mt-1 text-[10px] tracking-[0.16em] text-muted">CORE</p>
            </div>
          </div>
          {NODES.map((node) => {
            const selected = phase.node === node.id
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => {
                  const next = PHASES.findIndex((item) => item.node === node.id)
                  setPinned(next === pinned ? null : next)
                }}
                className={cn(
                  'absolute -translate-x-1/2 -translate-y-1/2 border px-2 py-1 font-mono text-[10px] tracking-[0.14em] transition-colors duration-150',
                  selected ? 'border-accent bg-surface text-foreground' : 'border-line bg-surface/90 text-secondary hover:border-line-strong hover:text-foreground',
                )}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
              >
                {node.label}
              </button>
            )
          })}
        </div>
      </div>
      <p className="mt-4 border-t border-line pt-3 text-[13px] leading-relaxed text-secondary">{phase.copy}</p>
    </Frame>
  )
}
