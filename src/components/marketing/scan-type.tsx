import { motion, useInView } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'

const LINES = [
  { tone: 'accent', text: '$ patchpilot scan northline/payment-gateway --branch main' },
  { tone: 'complement', text: 'reading origin/main · 1,284 files · lockfiles included' },
  { tone: 'muted', text: 'semgrep · codeql · bandit · trivy · gitleaks' },
  { tone: 'critical', text: 'semgrep   app/api/users.py:42   CWE-89   critical' },
  { tone: 'critical', text: 'codeql    app/webhooks/fetch.py:16   CWE-918   critical' },
  { tone: 'complement', text: 'analysis  confidence 96   the email parameter reaches the statement' },
  { tone: 'accent', text: 'patch     + bound parameter    − interpolated email' },
  { tone: 'secure', text: 'holding   the finding stays open until validation holds' },
] as const

const TONE = {
  accent: 'text-accent',
  complement: 'text-complement',
  muted: 'text-muted',
  critical: 'text-critical',
  secure: 'text-secure',
} as const

export function ScanType() {
  const reduced = usePrefersReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })
  const full = LINES.map((line) => line.text).join('\n')
  const [count, setCount] = useState(reduced ? full.length : 0)

  useEffect(() => {
    if (reduced || !inView || count >= full.length) return
    const timer = window.setTimeout(() => setCount((value) => value + 1), 14)
    return () => window.clearTimeout(timer)
  }, [count, full.length, inView, reduced])

  const typed = reduced ? full.length : count
  let remaining = typed
  const visible = LINES.map((line) => {
    const take = Math.min(line.text.length, Math.max(0, remaining))
    remaining -= line.text.length + 1
    return { ...line, shown: line.text.slice(0, take) }
  }).filter((line) => line.shown.length > 0)
  const typing = typed < full.length

  return (
    <motion.section
      id="scan"
      ref={ref}
      className="scroll-mt-16 border-t border-line"
      initial={reduced ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mx-auto grid w-full max-w-6xl items-start gap-10 px-5 py-20 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:py-28">
        <div>
          <p className="font-mono text-[11px] tracking-[0.18em] text-complement uppercase">Live scan</p>
          <h2 className="mt-3 max-w-[12em] text-[32px] leading-[1.05] font-medium tracking-[-0.03em] sm:text-[42px]">The repository is read before anything is changed.</h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-secondary">
            Branch, lockfiles, then the scanners. The sink is named in the file it lives in. Nothing is executed.
          </p>
        </div>
        <div className="border border-line bg-inset shadow-[inset_3px_0_0_var(--complement)]">
          <div className="flex items-center justify-between border-b border-line px-3 py-2 font-mono text-[11px] text-muted">
            <span>payment-gateway · main</span>
            <span className={typing ? 'text-complement' : 'text-secure'}>{typing ? 'scanning' : 'held'}</span>
          </div>
          <pre className="min-h-[240px] overflow-x-auto px-4 py-4 font-mono text-[12.5px] leading-7 whitespace-pre-wrap">
            {visible.map((line, index) => {
              const active = typing && index === visible.length - 1
              const body = active ? line.shown.slice(0, -1) : line.shown
              const last = active ? line.shown.slice(-1) : ''
              return (
                <div key={line.text} className={TONE[line.tone]}>
                  {body}
                  {last ? <span className="text-accent">{last}</span> : null}
                  {active ? <span className="pp-caret ml-0.5 inline-block h-4 w-2 translate-y-0.5 bg-complement" /> : null}
                </div>
              )
            })}
          </pre>
          <div className="h-px bg-line">
            <div className="h-full bg-complement transition-[width] duration-75" style={{ width: `${full.length ? (typed / full.length) * 100 : 0}%` }} />
          </div>
        </div>
      </div>
    </motion.section>
  )
}
