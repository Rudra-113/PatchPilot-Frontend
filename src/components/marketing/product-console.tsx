import { AnimatePresence, motion } from 'framer-motion'
import { SeverityBadge, StatusText } from '@/components/security/badges'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'
import { cn } from '@/lib/utils'

export type ConsoleStage = 'detected' | 'analysis' | 'patch' | 'verified'

const FINDINGS = [
  { title: 'SQL Injection', file: 'app/api/users.py:42', severity: 'critical' as const, active: true },
  { title: 'Server-side request forgery', file: 'app/webhooks/fetch.py:16', severity: 'critical' as const, active: false },
  { title: 'Command injection', file: 'app/workers/export.py:9', severity: 'critical' as const, active: false },
  { title: 'Missing authorization', file: 'app/api/refunds.py:14', severity: 'high' as const, active: false },
]

const SINK = "statement = f\"SELECT id, email, plan, region FROM users WHERE email = '{email}'\""
const BOUND = 'statement = "SELECT id, email, plan, region FROM users WHERE email = ?"'

const CODE = [
  ['40', '@router.get("/users")', false],
  ['41', 'def find_user(email: str):', false],
  ['42', SINK, true],
  ['43', 'row = opened.execute(statement).fetchone()', false],
] as const

export function ProductConsole({ stage, compact = false, className }: { stage: ConsoleStage; compact?: boolean; className?: string }) {
  const reduced = usePrefersReducedMotion()
  const status = stage === 'verified' ? 'fixed' : stage === 'patch' ? 'patch_ready' : stage === 'analysis' ? 'in_review' : 'unresolved'
  const showList = !compact && (stage === 'detected' || stage === 'analysis')

  return (
    <div className={cn('border border-line bg-surface text-left shadow-[inset_0_2px_0_var(--accent),inset_3px_0_0_var(--complement)]', className)}>
      <div className="flex h-9 items-center gap-3 border-b border-line px-3 font-mono text-[11px] text-muted">
        <span className="text-foreground">northline/payment-gateway</span>
        <span>main</span>
        <span className="hidden sm:inline">a4c91e2</span>
        <span className="ml-auto">score 72</span>
      </div>
      <div className={cn('grid', showList && 'lg:grid-cols-[220px_minmax(0,1fr)]')}>
        {showList ? (
          <aside className="hidden border-b border-line lg:block lg:border-r lg:border-b-0">
            <p className="px-3 pt-3 pb-2 font-mono text-[10px] tracking-[0.16em] text-muted uppercase">Findings</p>
            <ul>
              {FINDINGS.map((item) => (
                <li key={item.file} className={cn('border-t border-line px-3 py-2.5', item.active && 'bg-foreground/4')}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('truncate text-[12px]', item.active ? 'text-foreground' : 'text-secondary')}>{item.title}</span>
                    <SeverityBadge severity={item.severity} short />
                  </div>
                  <p className="mt-1 truncate font-mono text-[10px] text-muted">{item.file}</p>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-3 py-2.5">
            <SeverityBadge severity="critical" short />
            <p className="text-[13px]">SQL Injection</p>
            <p className="font-mono text-[11px] text-muted">CWE-89 · Semgrep · 96%</p>
            <span className="ml-auto">
              <StatusText status={status} />
            </span>
          </div>
          <div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={stage}
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduced ? undefined : { opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.22 }}
                className="overflow-x-auto"
              >
                {stage === 'detected' ? <Detected /> : null}
                {stage === 'analysis' ? <Analysis /> : null}
                {stage === 'patch' ? <Patch /> : null}
                {stage === 'verified' ? <Verified /> : null}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

function Detected() {
  return (
    <div className="px-3 py-3">
      <p className="mb-2 font-mono text-[10px] text-muted">app/api/users.py</p>
      <pre className="font-mono text-[12px] leading-6">
        {CODE.map(([line, source, sink]) => (
          <div key={line} className={cn('grid grid-cols-[28px_minmax(0,1fr)] gap-3', sink && 'bg-critical/10 text-foreground shadow-[inset_2px_0_0_var(--critical)]')}>
            <span className={cn('text-right', sink ? 'text-critical' : 'text-muted')}>{line}</span>
            <span className={cn('overflow-x-auto', sink ? 'text-foreground' : 'text-secondary')}>{source}</span>
          </div>
        ))}
      </pre>
      <p className="mt-3 text-[12px] text-secondary">Semgrep matched a formatted SQL statement built from the email query parameter.</p>
    </div>
  )
}

function Analysis() {
  const blocks = [
    ['Root cause', 'find_user interpolates email into the SELECT. require_analyst proves the caller is an operator. It does not constrain the string.'],
    ['Impact', 'A closed quote appends arbitrary SQL. The billing connection can read every subscriber row, not just the requested address.'],
    ['Attack', "GET /v1/users?email=' UNION SELECT id, email, plan, region FROM users--"],
    ['Fix', 'Bind email as a parameter. Leave the handler and the response shape alone.'],
  ]
  return (
    <div>
      {blocks.map(([title, body]) => (
        <section key={title} className="border-b border-line px-4 py-3.5 last:border-b-0">
          <h3 className="font-mono text-[10px] tracking-[0.14em] text-muted uppercase">{title}</h3>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-secondary">{body}</p>
        </section>
      ))}
    </div>
  )
}

function Patch() {
  const lines = [
    ['-', SINK],
    ['-', 'row = opened.execute(statement).fetchone()'],
    ['+', BOUND],
    ['+', 'row = opened.execute(statement, (email,)).fetchone()'],
  ]
  return (
    <div className="px-4 py-4">
      <p className="mb-3 font-mono text-[11px] text-muted">app/api/users.py · 2 additions · 2 deletions</p>
      <pre className="overflow-x-auto font-mono text-[12.5px] leading-7 whitespace-pre">
        {lines.map(([mark, source]) => (
          <div key={mark + source} className={cn(mark === '-' ? 'text-critical' : 'text-secure')}>
            {mark} {source}
          </div>
        ))}
      </pre>
    </div>
  )
}

function Verified() {
  const checks = ['Syntax', 'Build', 'Unit tests', 'Security scan', 'Regression']
  return (
    <div className="px-3 py-3">
      <ul>
        {checks.map((name) => (
          <li key={name} className="flex items-center justify-between border-b border-line py-3 text-[13px] last:border-b-0">
            <span>{name}</span>
            <span className="font-mono text-[10px] tracking-[0.14em] text-secure uppercase">Held</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] text-secondary">Rescan did not match the sink. The finding can close.</p>
    </div>
  )
}
