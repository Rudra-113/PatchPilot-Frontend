import { Link, useParams } from 'react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ErrorState } from '@/components/feedback/states'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'
import { useScan } from '@/hooks/queries'
import { elapsed, formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Scan, ScanStage } from '@/types/api'

export default function ScanDetail() {
  const { scanId = '' } = useParams()
  const scan = useScan(scanId)
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
  return (
    <>
      <PageHeader
        kicker={data.repositoryName}
        title={data.projectName}
        description={`${data.branch} · ${data.trigger} · ${running ? elapsed(data.startedAt, now) : data.completedAt ? elapsed(data.startedAt, new Date(data.completedAt).getTime()) : 'Queued'}`}
        actions={data.status === 'completed' ? <Button asChild><Link to={`/app/vulnerabilities?projectId=${data.projectId}&status=open`}>Review findings</Link></Button> : null}
      />
      <div className="grid max-w-5xl items-start gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <ScanTranscript scan={data} running={running} />
        <ol className="overflow-hidden border border-line bg-surface">
          {data.stages.map((stage, index) => (
            <StageRow key={stage.key} stage={stage} last={index === data.stages.length - 1} />
          ))}
        </ol>
      </div>
      {data.status === 'completed' ? (
        <p className="mt-4 max-w-3xl text-[13px] text-secondary">
          Critical {data.findings.critical} · High {data.findings.high} · Medium {data.findings.medium} · Low {data.findings.low}. Verification of new patches stays a separate step.
        </p>
      ) : null}
    </>
  )
}

function StageRow({ stage, last }: { stage: ScanStage; last: boolean }) {
  return (
    <li className={cn('grid grid-cols-[20px_minmax(0,1fr)] gap-3 px-4 py-4', !last && 'border-b border-line')}>
      <span className="pt-1">
        <span className={cn('block size-2 rounded-full', stage.status === 'completed' ? 'bg-secure' : stage.status === 'running' ? 'pp-live bg-complement' : stage.status === 'failed' ? 'bg-critical' : 'bg-line-strong')} />
      </span>
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[14px] font-medium">{stage.name}</h2>
          <span className="font-mono text-[11px] text-muted">{formatDuration(stage.durationMs)}</span>
        </div>
        <p className="mt-0.5 text-[12px] text-secondary">{stage.scanner}{stage.resultCount != null ? ` · ${stage.resultCount}` : ''}</p>
        <p className="mt-1 text-[13px] text-foreground">{stage.detail}</p>
        {stage.status === 'running' ? (
          <div className="mt-2 h-px overflow-hidden bg-foreground/10">
            <div className="h-full bg-complement transition-[width] duration-300" style={{ width: `${stage.progress}%` }} />
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
      </div>
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
        <div className="h-full bg-complement transition-[width] duration-75" style={{ width: `${totalChars ? (typedChars / totalChars) * 100 : 0}%` }} />
      </div>
    </div>
  )
}
