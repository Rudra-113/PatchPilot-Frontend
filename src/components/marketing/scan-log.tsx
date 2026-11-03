import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'

const COMMAND = 'patchpilot scan northline/payment-gateway --branch main'

const RESULTS = [
  { tone: 'muted', text: 'reading origin/main · 1,284 files · lockfiles included' },
  { tone: 'critical', text: 'semgrep   app/api/users.py:42   CWE-89   critical' },
  { tone: 'ai', text: 'analysis  confidence 96   sink is an f-string in the SQL statement' },
  { tone: 'foreground', text: 'patch     + parameterized statement   − interpolated email' },
  { tone: 'secure', text: 'verified  syntax · build · tests · rescan · regression' },
] as const

export function ScanLog() {
  const reduced = usePrefersReducedMotion()
  const [count, setCount] = useState(reduced ? COMMAND.length : 0)

  useEffect(() => {
    if (reduced || count >= COMMAND.length) return
    const timer = window.setTimeout(() => setCount((value) => value + 1), 16)
    return () => window.clearTimeout(timer)
  }, [count, reduced])

  const done = count >= COMMAND.length

  return (
    <div className="overflow-hidden border border-line bg-inset">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <span className="size-1.5 rounded-full bg-critical/80" />
        <span className="size-1.5 rounded-full bg-warning/80" />
        <span className="size-1.5 rounded-full bg-secure/80" />
        <span className="ml-2 font-mono text-[11px] text-muted">payment-gateway · main</span>
      </div>
      <pre className="min-h-[196px] px-4 py-4 font-mono text-[12px] leading-6 text-secondary">
        <div className="text-foreground">
          <span className="text-accent">$</span> {COMMAND.slice(0, count)}
          {done ? null : <span className="ml-px inline-block h-3.5 w-1.5 translate-y-0.5 bg-accent" />}
        </div>
        {done
          ? RESULTS.map((line, index) => (
              <motion.div
                key={line.text}
                initial={reduced ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: reduced ? 0 : index * 0.12 }}
                className={
                  line.tone === 'critical'
                    ? 'text-critical'
                    : line.tone === 'ai'
                      ? 'text-ai'
                      : line.tone === 'secure'
                        ? 'text-secure'
                        : line.tone === 'foreground'
                          ? 'text-foreground'
                          : 'text-muted'
                }
              >
                {line.text}
              </motion.div>
            ))
          : null}
      </pre>
    </div>
  )
}
