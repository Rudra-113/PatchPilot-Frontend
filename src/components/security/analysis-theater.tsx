import { useEffect, useState } from 'react'
import { Frame } from '@/components/layout/frame'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'
import { cn } from '@/lib/utils'
import type { ScanStage } from '@/types/api'

const DURATION = 4600

const PHASES = [
  { label: 'Acquire', until: 0.2 },
  { label: 'Sweep', until: 0.52 },
  { label: 'Trace', until: 0.74 },
  { label: 'Verdict', until: 1 },
] as const

type Mark = 'source' | 'sink' | 'fix'
type Tone = 'critical' | 'secure' | 'accent' | 'complement'

type Lens = {
  file: string
  lines: Array<{ n: string; text: string; mark?: Mark }>
  trace: [string, string, string]
  verdict: string
  rule: string
  tone: Tone
}

const INDEX: Record<ScanStage['key'], string> = {
  repository: '01',
  static: '02',
  ai: '03',
  patch: '04',
  validation: '05',
}

const PYTHON: Lens = {
  file: 'app/api/users.py',
  lines: [
    { n: '38', text: 'def find_user(' },
    { n: '39', text: 'email: str = Query(min_length=3),', mark: 'source' },
    { n: '40', text: 'principal: str = Depends(require_analyst),' },
    { n: '41', text: ') -> JSONResponse:' },
    { n: '42', text: "statement = f\"... email = '{email}'\"", mark: 'sink' },
  ],
  trace: ['Query', 'f-string', 'execute'],
  verdict: 'CWE-89  SQL injection',
  rule: 'semgrep · formatted-sql-query',
  tone: 'critical',
}

const TYPESCRIPT: Lens = {
  file: 'web/src/billing/InvoiceNote.tsx',
  lines: [
    { n: '12', text: 'export function InvoiceNote({ note }) {' },
    { n: '13', text: 'note: string', mark: 'source' },
    { n: '14', text: 'return (' },
    { n: '15', text: '<div dangerouslySetInnerHTML={{ __html: note }} />', mark: 'sink' },
    { n: '16', text: ')' },
  ],
  trace: ['prop', 'html', 'DOM'],
  verdict: 'CWE-79  Cross-site scripting',
  rule: 'codeql · xss',
  tone: 'critical',
}

const GO: Lens = {
  file: 'internal/tokens/verify.go',
  lines: [
    { n: '08', text: 'func Verify(token string, key []byte) {' },
    { n: '09', text: 'token from the request', mark: 'source' },
    { n: '10', text: 'parsed, err := jwt.Parse(token, func(...) {' },
    { n: '11', text: 'return key, nil', mark: 'sink' },
    { n: '12', text: '})' },
  ],
  trace: ['header', 'key', 'parse'],
  verdict: 'CWE-347  algorithm not pinned',
  rule: 'gosec · jwt',
  tone: 'critical',
}

const JAVA: Lens = {
  file: 'src/main/java/io/northline/ledger/ExportController.java',
  lines: [
    { n: '14', text: 'public byte[] export(String name) {' },
    { n: '15', text: 'name from the request', mark: 'source' },
    { n: '16', text: 'Path ROOT = Paths.get("/var/ledger/exports")' },
    { n: '17', text: 'return Files.readAllBytes(ROOT.resolve(name))', mark: 'sink' },
    { n: '18', text: '}' },
  ],
  trace: ['param', 'resolve', 'read'],
  verdict: 'CWE-22  Path traversal',
  rule: 'semgrep · path-traversal',
  tone: 'critical',
}

const RUST: Lens = {
  file: 'src/upstream.rs',
  lines: [
    { n: '04', text: 'pub fn origin_client() -> Result<Client> {' },
    { n: '05', text: 'origin certificate', mark: 'source' },
    { n: '06', text: 'Client::builder()' },
    { n: '07', text: '.danger_accept_invalid_certs(true)', mark: 'sink' },
    { n: '08', text: '.build()' },
  ],
  trace: ['origin', 'cert', 'accept'],
  verdict: 'CWE-295  TLS verification off',
  rule: 'semgrep · danger-accept-invalid-certs',
  tone: 'critical',
}

function codeLens(language: string | undefined) {
  if (language === 'TypeScript') return TYPESCRIPT
  if (language === 'Go') return GO
  if (language === 'Java') return JAVA
  if (language === 'Rust') return RUST
  return PYTHON
}

function lensFor(stage: ScanStage['key'], language: string | undefined, branch: string): Lens {
  const code = codeLens(language)
  if (stage === 'static') return code
  if (stage === 'ai') {
    return { ...code, verdict: 'Root cause written', rule: 'analyst · source to sink', tone: 'complement' }
  }
  if (stage === 'repository') {
    return {
      file: code.file,
      lines: [
        { n: '01', text: `refs/heads/${branch}` },
        { n: '02', text: 'walking the tree' },
        { n: '03', text: code.file },
        { n: '04', text: 'reading the lockfile', mark: 'source' },
        { n: '05', text: 'writing the index', mark: 'fix' },
      ],
      trace: ['ref', 'tree', 'pins'],
      verdict: 'Tree indexed',
      rule: 'resolver · default branch',
      tone: 'secure',
    }
  }
  if (stage === 'patch') {
    const sink = code.lines.find((line) => line.mark === 'sink')
    return {
      file: code.file,
      lines: [
        { n: '−', text: sink?.text ?? 'concatenated input', mark: 'sink' },
        { n: '+', text: 'bound parameter, call sites unchanged', mark: 'fix' },
        { n: '·', text: 'handler and response shape held' },
        { n: '·', text: 'no merge until verification' },
        { n: '·', text: 'patch stays generated' },
      ],
      trace: ['remove', 'bind', 'hold'],
      verdict: 'Diff drafted · not verified',
      rule: 'patcher · hold the merge',
      tone: 'accent',
    }
  }
  return {
    file: 'verifier',
    lines: [
      { n: '01', text: 'syntax check · queued' },
      { n: '02', text: 'build check · queued' },
      { n: '03', text: 'unit tests · queued' },
      { n: '04', text: 'security scan · queued' },
      { n: '05', text: 'regression · you decide' },
    ],
    trace: ['syntax', 'build', 'hold'],
    verdict: 'Held until you verify',
    rule: 'verifier · not applied',
    tone: 'accent',
  }
}

const TONE: Record<Tone, string> = {
  critical: 'text-critical',
  secure: 'text-secure',
  accent: 'text-accent',
  complement: 'text-complement',
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

export function AnalysisTheater({
  stage,
  branch,
  language,
  running,
}: {
  stage: ScanStage
  branch: string
  language?: string
  running: boolean
}) {
  const reduced = usePrefersReducedMotion()
  const lens = lensFor(stage.key, language, branch)
  const [clock, setClock] = useState({ key: stage.key, running, elapsed: reduced || !running ? DURATION : 0 })
  if (clock.key !== stage.key || clock.running !== running || (reduced && clock.elapsed < DURATION)) {
    setClock({ key: stage.key, running, elapsed: reduced || !running ? DURATION : 0 })
  }

  useEffect(() => {
    if (reduced || !running) return
    const started = performance.now()
    const timer = window.setInterval(() => {
      const next = Math.min(DURATION, performance.now() - started)
      setClock((current) => (current.key === stage.key ? { ...current, elapsed: next } : current))
      if (next >= DURATION) window.clearInterval(timer)
    }, 40)
    return () => window.clearInterval(timer)
  }, [stage.key, running, reduced])

  const elapsed = clock.elapsed
  const progress = elapsed / DURATION
  const sweep = clamp01((progress - 0.18) / 0.34)
  const trace = clamp01((progress - 0.5) / 0.24)
  const verdictProgress = clamp01((progress - 0.72) / 0.28)
  const beamOn = running && !reduced && progress > 0.16 && progress < 0.56
  const sourceAt = lens.lines.findIndex((line) => line.mark === 'source')
  const sinkAt = lens.lines.findIndex((line) => line.mark === 'sink')
  const activeLine = Math.min(lens.lines.length - 1, Math.floor(sweep * lens.lines.length))
  const verdict = lens.verdict.slice(0, Math.ceil(lens.verdict.length * verdictProgress))
  const phase = PHASES.findIndex((item) => progress <= item.until)

  return (
    <Frame>
      <div className="overflow-hidden border border-line bg-inset shadow-[inset_0_2px_0_var(--accent)]">
        <div className="h-0.5 bg-foreground/10">
          <div className="h-full bg-complement transition-[width] duration-75" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="flex items-start justify-between gap-3 border-b border-line px-3 py-2.5">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">
              {INDEX[stage.key]} {stage.name}
            </p>
            <p className="mt-1 truncate font-mono text-[12px] text-foreground">
              {stage.scanner}
              <span className="text-muted"> · {lens.file}</span>
            </p>
          </div>
          <p className={cn('shrink-0 font-mono text-[12px] tabular', running ? 'text-complement' : 'text-secure')}>
            {(elapsed / 1000).toFixed(1)}s
          </p>
        </div>
        <div className="relative px-3 py-3">
          {beamOn ? (
            <div
              className="pointer-events-none absolute inset-x-3 z-10 h-px bg-complement"
              style={{ top: `${18 + sweep * 78}%` }}
            />
          ) : null}
          <ol className="relative">
            {sourceAt >= 0 && sinkAt > sourceAt ? (
              <span
                aria-hidden="true"
                className="absolute left-[52px] w-px origin-top bg-complement"
                style={{
                  top: 8 + sourceAt * 28,
                  height: (sinkAt - sourceAt) * 28,
                  transform: `scaleY(${trace})`,
                }}
              />
            ) : null}
            {lens.lines.map((line, index) => {
              const revealed = reduced || !running || progress > index * 0.035
              const onBeam = beamOn && index === activeLine
              const marked = line.mark === 'sink' ? trace > 0.72 : line.mark === 'source' ? trace > 0.08 : line.mark === 'fix' ? trace > 0.45 : false
              return (
                <li
                  key={`${line.n}-${line.text}`}
                  className={cn(
                    'grid h-7 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2 font-mono text-[12px]',
                    revealed ? 'opacity-100' : 'opacity-0',
                    onBeam && 'bg-complement/10',
                    marked && line.mark === 'sink' && 'bg-critical/15 text-critical',
                    marked && line.mark === 'source' && 'text-accent',
                    marked && line.mark === 'fix' && 'text-secure',
                    !marked && !onBeam && 'text-secondary',
                  )}
                >
                  <span className="text-right text-muted tabular">{line.n}</span>
                  <span className="truncate">{line.text}</span>
                  <span className="w-10 text-[10px] tracking-[0.12em] uppercase">
                    {marked && line.mark === 'source' ? 'src' : null}
                    {marked && line.mark === 'sink' ? 'sink' : null}
                    {marked && line.mark === 'fix' ? 'fix' : null}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
        <div className="border-t border-line px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            {lens.trace.map((part, index) => (
              <span key={part} className="inline-flex items-center gap-2">
                {index > 0 ? <span className="text-muted">→</span> : null}
                <span className={trace > index / lens.trace.length ? 'text-foreground' : 'text-muted'}>{part}</span>
              </span>
            ))}
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className={cn('min-h-5 font-mono text-[13px]', TONE[lens.tone])}>
              {verdict}
              {running && verdictProgress > 0 && verdictProgress < 1 ? <span className="pp-caret ml-1 inline-block h-3.5 w-1.5 translate-y-0.5 bg-complement" /> : null}
            </p>
            <p className={cn('text-right font-mono text-[10px] text-muted', verdictProgress > 0.4 && 'text-secondary')}>{verdictProgress > 0.15 ? lens.rule : ' '}</p>
          </div>
        </div>
        <div className="flex border-t border-line">
          {PHASES.map((item, index) => (
            <span
              key={item.label}
              className={cn(
                'flex-1 px-2 py-1.5 text-center font-mono text-[10px] tracking-[0.14em] uppercase',
                index === phase ? 'bg-complement/10 text-complement' : index < phase ? 'text-secondary' : 'text-muted',
              )}
            >
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </Frame>
  )
}
