import { Link, useParams } from 'react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ErrorState } from '@/components/feedback/states'
import { PageHeader } from '@/components/layout/page-header'
import { AnalysisTheater } from '@/components/security/analysis-theater'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'
import { useProject, useScan } from '@/hooks/queries'
import { elapsed, formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Scan, ScanStage } from '@/types/api'

export default function ScanDetail() {
  const { scanId = '' } = useParams()
  const scan = useScan(scanId)
  const project = useProject(scan.data?.projectId ?? '')
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (scan.data?.status !== 'running') return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [scan.data?.status])

  if (scan.isLoading) return <Skeleton className="h-80" />
  if (scan.isError || !scan.data) return <ErrorState error={scan.error} onRetry={() => void scan.refetch()} />
  const data = scan.data
  const running = data.status === 'running'
  const focus = data.stages.find((stage) => stage.status === 'running') ?? [...data.stages].reverse().find((stage) => stage.status === 'completed') ?? data.stages[0]
  return (
    <>
      <PageHeader
        kicker={data.repositoryName}
        title={data.projectName}
        description={`${data.branch} · ${data.trigger} · ${running ? elapsed(data.startedAt, now) : data.completedAt ? elapsed(data.startedAt, new Date(data.completedAt).getTime()) : 'Queued'}`}
        actions={data.status === 'completed' ? <Button asChild><Link to={`/app/vulnerabilities?projectId=${data.projectId}&status=open`}>Review findings</Link></Button> : null}
      />
      <div className="mb-4 flex gap-1" aria-hidden="true">
        {data.stages.map((stage) => (
          <div key={stage.key} className="h-1 flex-1 overflow-hidden bg-foreground/10">
            <div
              className={cn('pp-glide h-full origin-left', stage.status === 'failed' ? 'bg-critical' : stage.status === 'running' ? 'bg-complement' : 'bg-secure')}
              style={{ transform: `scaleX(${stage.status === 'completed' || stage.status === 'failed' ? 1 : stage.status === 'running' ? stage.progress / 100 : 0})` }}
            />
          </div>
        ))}
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
        <div className="order-2 xl:sticky xl:top-6 xl:order-1 xl:self-start">
          <ScanTranscript scan={data} running={running} />
        </div>
        <div className="order-1 space-y-3 xl:order-2">
          {focus ? <AnalysisTheater stage={focus} branch={data.branch} language={project.data?.language} running={running && focus.status === 'running'} /> : null}
          <ol className="overflow-hidden border border-line bg-surface">
            {data.stages.map((stage, index) => (
              <StageRow key={stage.key} stage={stage} index={index} last={index === data.stages.length - 1} />
            ))}
          </ol>
        </div>
      </div>
      {data.status === 'completed' ? (
        <p className="mt-4 max-w-3xl text-[13px] text-secondary">
          Critical {data.findings.critical} · High {data.findings.high} · Medium {data.findings.medium} · Low {data.findings.low}. Verification of new patches stays a separate step.
        </p>
      ) : null}
    </>
  )
}

function StageRow({ stage, index, last }: { stage: ScanStage; index: number; last: boolean }) {
  return (
    <li
      className={cn('pp-rise px-4 py-3', !last && 'border-b border-line', stage.status === 'running' && 'bg-complement/5')}
      style={{ animationDelay: `${index * 70}ms`, boxShadow: stage.status === 'running' ? 'inset 2px 0 0 var(--complement)' : stage.status === 'completed' ? 'inset 2px 0 0 var(--secure)' : stage.status === 'failed' ? 'inset 2px 0 0 var(--critical)' : undefined }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[14px] font-medium">
          <span className="mr-2 font-mono text-[11px] text-muted">{String(index + 1).padStart(2, '0')}</span>
          {stage.name}
        </h2>
        <span className="inline-flex items-center gap-2 font-mono text-[11px] text-muted">
          <span className={cn('size-1.5 rounded-full', stage.status === 'completed' ? 'bg-secure' : stage.status === 'running' ? 'pp-live bg-complement' : stage.status === 'failed' ? 'bg-critical' : 'bg-line-strong')} />
          {formatDuration(stage.durationMs)}
        </span>
      </div>
      <p className="mt-1 text-[12px] text-secondary">{stage.scanner}{stage.resultCount != null ? ` · ${stage.resultCount}` : ''}</p>
      <p className="mt-1 text-[13px]">{stage.detail}</p>
      {stage.status === 'running' ? (
        <div className="relative mt-2 h-1 overflow-hidden bg-foreground/10">
          <div className="pp-glide relative h-full overflow-hidden bg-complement" style={{ width: `${stage.progress}%` }}>
            <span className="pp-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-white/30" />
          </div>
        </div>
      ) : null}
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {stage.steps.map((step) => (
          <li key={step.label} className="flex items-center gap-1.5 text-[12px] text-secondary">
            <span className={cn('size-1.5 rounded-full', step.status === 'completed' ? 'bg-secure' : step.status === 'running' ? 'bg-complement' : 'bg-line-strong')} />
            {step.label}
          </li>
        ))}
      </ul>
    </li>
  )
}

type TranscriptTone = 'accent' | 'complement' | 'muted' | 'critical' | 'secure'

const TONE: Record<TranscriptTone, string> = {
  accent: 'text-accent',
  complement: 'text-complement',
  muted: 'text-muted',
  critical: 'text-critical',
  secure: 'text-secure',
}

function transcriptLines(scan: Scan): Array<{ id: string; text: string; tone: TranscriptTone }> {
  const lines: Array<{ id: string; text: string; tone: TranscriptTone }> = [
    { id: 'cmd', text: `$ patchpilot scan ${scan.repositoryName} --branch ${scan.branch}`, tone: 'accent' },
    { id: 'meta', text: `${scan.commitSha.slice(0, 7)}  ${scan.trigger}`, tone: 'muted' },
  ]
  for (const stage of scan.stages) {
    if (stage.status === 'pending') break
    lines.push({ id: `${stage.key}:name`, text: stage.name, tone: 'complement' })
    for (const step of stage.steps) {
      if (step.status !== 'completed') continue
      lines.push({ id: `${stage.key}:${step.label}`, text: `ok  ${step.label}`, tone: 'muted' })
    }
    if (stage.status === 'running') {
      const active = stage.steps.find((step) => step.status === 'running')
      if (active) lines.push({ id: `${stage.key}:live:${active.label}`, text: `>>  ${active.label}`, tone: 'complement' })
    }
    if (stage.status === 'completed' || stage.status === 'failed') {
      const count = stage.resultCount != null ? `  ${stage.resultCount}` : ''
      lines.push({
        id: `${stage.key}:close`,
        text: `${stage.status === 'failed' ? 'fail' : 'done'}  ${stage.detail}${count}`,
        tone: stage.status === 'failed' ? 'critical' : 'secure',
      })
    }
  }
  if (scan.status === 'completed') {
    const findings = scan.findings
    lines.push({
      id: 'findings',
      text: `open  critical ${findings.critical} · high ${findings.high} · medium ${findings.medium} · low ${findings.low}`,
      tone: findings.critical > 0 ? 'critical' : 'secure',
    })
  }
  return lines
}

function ScanTranscript({ scan, running }: { scan: Scan; running: boolean }) {
  const reduced = usePrefersReducedMotion()
  const signature = scan.stages.map((stage) => `${stage.key}:${stage.status}:${stage.detail}:${stage.resultCount}:${stage.steps.map((step) => step.status).join('')}`).join('|')
  const lines = useMemo(() => transcriptLines(scan), [scan, signature])
  const [shown, setShown] = useState<Record<string, number>>({})
  const scroller = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (reduced) return
    const timer = window.setInterval(() => {
      setShown((current) => {
        for (const line of lines) {
          const count = current[line.id] ?? 0
          if (count < line.text.length) {
            return { ...current, [line.id]: Math.min(line.text.length, count + 2) }
          }
        }
        return current
      })
    }, 12)
    return () => window.clearInterval(timer)
  }, [lines, reduced])

  const visible = lines
    .map((line) => ({ ...line, count: reduced ? line.text.length : (shown[line.id] ?? 0) }))
    .filter((line) => line.count > 0)
  const typedChars = lines.reduce((sum, line) => sum + (reduced ? line.text.length : Math.min(line.text.length, shown[line.id] ?? 0)), 0)
  const totalChars = lines.reduce((sum, line) => sum + line.text.length, 0)
  const typing = typedChars < totalChars
  const label = running || typing ? 'scanning' : scan.status === 'failed' ? 'failed' : 'held'
  const tail = visible.at(-1)?.count ?? 0

  useEffect(() => {
    const node = scroller.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [visible.length, tail])

  return (
    <div className="border border-line bg-inset shadow-[inset_3px_0_0_var(--complement)]">
      <div className="flex items-center justify-between border-b border-line px-3 py-2 font-mono text-[11px] text-muted">
        <span className="truncate">{scan.repositoryName}</span>
        <span className={label === 'scanning' ? 'text-complement' : label === 'failed' ? 'text-critical' : 'text-secure'}>{label}</span>
      </div>
      <pre ref={scroller} className="max-h-[520px] min-h-[148px] overflow-auto px-4 py-4 font-mono text-[12px] leading-6 whitespace-pre-wrap">
        {visible.map((line, index) => {
          const text = line.text.slice(0, line.count)
          const active = typing && index === visible.length - 1
          const body = active ? text.slice(0, -1) : text
          const last = active ? text.slice(-1) : ''
          return (
            <div key={line.id} className={TONE[line.tone]}>
              {body}
              {last ? <span className="text-accent">{last}</span> : null}
              {active ? <span className="pp-caret ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-complement" /> : null}
            </div>
          )
        })}
      </pre>
      <div className="h-px bg-line">
        <div className="pp-glide h-full origin-left bg-complement" style={{ transform: `scaleX(${totalChars ? typedChars / totalChars : 0})` }} />
      </div>
    </div>
  )
}
