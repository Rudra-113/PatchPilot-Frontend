import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useRef } from 'react'
import { Link, useNavigate } from 'react-router'
import { Parallax, Reveal } from '@/components/marketing/reveal'
import { ScanLog } from '@/components/marketing/scan-log'
import { SiteHeader } from '@/components/marketing/site-header'
import { SecurityEngine } from '@/components/marketing/security-engine'
import { SeverityBadge } from '@/components/security/badges'
import { Button } from '@/components/ui/button'
import { useSession } from '@/context/session'
import { useCountUp } from '@/hooks/use-count-up'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'

const STAGES = [
  ['01', 'Repository', 'Read the branch, lockfiles, and the files a scanner can actually reach.', '1,284 files indexed'],
  ['02', 'Threat detection', 'Run Semgrep, CodeQL, Bandit, Trivy, and Gitleaks against the tree.', '3 critical sinks'],
  ['03', 'AI analysis', 'Explain the sink, the impact, and the confidence in plain language.', 'Confidence 96'],
  ['04', 'Patch generation', 'Draft a minimal diff that changes the vulnerable lines and little else.', '2 lines changed'],
  ['05', 'Validation', 'Build, test, and rescan the patch in isolation before anyone is asked to merge it.', '5 checks held'],
  ['06', 'Secure', 'Close the finding only when verification holds.', 'Finding closed'],
]

const CHECKS = [
  ['Syntax check', 'The patched file parses.'],
  ['Build check', 'The project still compiles.'],
  ['Unit tests', 'Existing tests hold.'],
  ['Security scan', 'The sink is gone on rescan.'],
  ['Regression check', 'Neighboring behavior stays put.'],
]

export default function Landing() {
  const { session, enterDemoWorkspace } = useSession()
  const navigate = useNavigate()
  const reduced = usePrefersReducedMotion()
  const scanTo = session ? '/app/projects/new' : '/login?next=/app/projects/new'
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const gridY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 90])

  const viewDemo = async () => {
    if (session?.workspace === 'demo') {
      navigate('/app')
      return
    }
    await enterDemoWorkspace()
    navigate('/app')
  }

  return (
    <div id="top" className="relative min-h-screen scroll-smooth">
      <SiteHeader scanTo={scanTo} />
      <motion.div style={{ y: gridY }} className="technical-grid is-drift pointer-events-none absolute inset-x-0 top-0 h-[860px]" />
      <div className="pointer-events-none absolute top-24 left-1/2 h-px w-[min(720px,70vw)] -translate-x-1/2 bg-linear-to-r from-transparent via-accent/30 to-transparent" />

      <main>
        <section ref={heroRef} className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pt-28 pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] lg:pt-36 lg:pb-28">
          <div>
            <Reveal>
              <p className="font-mono text-[11px] tracking-[0.2em] text-accent uppercase">PatchPilot AI</p>
              <h1 className="mt-4 max-w-xl text-[40px] leading-[1.05] font-medium tracking-tight text-balance sm:text-[56px]">
                Autonomous vulnerability remediation for modern codebases.
              </h1>
              <p className="mt-5 max-w-md text-[16px] leading-relaxed text-secondary">
                Detect vulnerabilities. Understand the root cause. Generate secure patches. Validate the fix.
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="mt-8 flex flex-wrap gap-2">
                <Button size="lg" className="h-11 px-4" asChild>
                  <Link to={scanTo}>
                    Scan Repository
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="secondary" className="h-11 px-4" onClick={() => void viewDemo()}>
                  View Demo
                </Button>
              </div>
            </Reveal>
            <Reveal delay={0.14}>
              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-line pt-6">
                <Stat value={96} suffix="%" label="Confidence on the SQL sink" />
                <Stat value={5} suffix="" label="Checks before a merge" />
                <Stat value={2} suffix="" label="Lines in the patch" />
              </dl>
              <p className="mt-5 font-mono text-[11px] tracking-wide text-muted">Semgrep · CodeQL · Bandit · Trivy · Gitleaks</p>
            </Reveal>
          </div>
          <Parallax distance={reduced ? 0 : 28}>
            <SecurityEngine />
          </Parallax>
        </section>

        <section id="method" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-24 lg:grid-cols-[280px_minmax(0,1fr)] lg:py-32">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">Method</p>
              <h2 className="mt-3 text-[32px] leading-tight font-medium tracking-tight">From the repository to a verified patch.</h2>
              <p className="mt-4 text-[14px] leading-relaxed text-secondary">Six stages. The finding stays open until the last one holds.</p>
            </div>
            <MethodList />
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-24 lg:grid-cols-2 lg:py-32">
            <Reveal>
              <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">Detection</p>
              <h2 className="mt-3 text-[32px] leading-tight font-medium tracking-tight">The scanner names the sink. The model has to explain it.</h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-secondary">
                A rule match is the start of the record, not the end. PatchPilot keeps the file, the line, the CWE, and the data flow in one place.
              </p>
            </Reveal>
            <Parallax distance={18}>
              <ScanLog />
            </Parallax>
          </div>
        </section>

        <section id="finding" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto grid w-full max-w-6xl items-start gap-12 px-5 py-24 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:py-32">
            <Reveal>
              <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">A finding</p>
              <h2 className="mt-3 text-[32px] leading-tight font-medium tracking-tight">The sink, the cause, the diff.</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-secondary">
                Analysts stay in one view from the vulnerable line to a verified patch. The highlighted line is the control that fails, not a wash of red.
              </p>
              <div className="mt-8 space-y-4 text-[14px] leading-relaxed text-secondary">
                <p><span className="text-foreground">Root cause.</span> The email filter is interpolated into the statement. Authentication does not make that string safe.</p>
                <p><span className="text-foreground">Fix.</span> Bind the email as a parameter. Leave the rest of the handler alone.</p>
              </div>
            </Reveal>
            <Parallax distance={22}>
              <div
                className="pp-spot overflow-hidden border border-line bg-surface"
                onMouseMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect()
                  event.currentTarget.style.setProperty('--sx', `${event.clientX - rect.left}px`)
                  event.currentTarget.style.setProperty('--sy', `${event.clientY - rect.top}px`)
                }}
              >
                <div className="relative flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
                  <SeverityBadge severity="critical" />
                  <div>
                    <p className="text-[14px] font-medium">SQL Injection</p>
                    <p className="font-mono text-[11px] text-muted">app/api/users.py:42 · CWE-89 · Semgrep · 96%</p>
                  </div>
                </div>
                <pre className="relative overflow-auto bg-inset px-4 py-4 font-mono text-[12px] leading-7 text-secondary">
                  <div><span className="mr-4 text-muted">40</span>@router.get("/users")</div>
                  <div><span className="mr-4 text-muted">41</span>def find_user(email: str):</div>
                  <div className="bg-critical/12 text-foreground shadow-[inset_2px_0_0_var(--critical)]">
                    <span className="mr-4 text-critical">42</span>
                    statement = f"SELECT id, email FROM users WHERE email = '{`{email}`}'"
                  </div>
                  <div><span className="mr-4 text-muted">43</span>row = connection.execute(statement).fetchone()</div>
                </pre>
                <div className="relative grid border-t border-line sm:grid-cols-2">
                  <div className="border-b border-line px-4 py-4 sm:border-r sm:border-b-0">
                    <p className="font-mono text-[10px] tracking-[0.16em] text-critical uppercase">Before</p>
                    <p className="mt-2 font-mono text-[12px] text-critical">− statement = f"... '{`{email}`}'"</p>
                  </div>
                  <div className="px-4 py-4">
                    <p className="font-mono text-[10px] tracking-[0.16em] text-secure uppercase">After</p>
                    <p className="mt-2 font-mono text-[12px] text-secure">+ statement = "SELECT ... WHERE email = ?"</p>
                  </div>
                </div>
              </div>
            </Parallax>
          </div>
        </section>

        <section id="verification" className="scroll-mt-20 border-t border-line bg-inset">
          <div className="mx-auto w-full max-w-6xl px-5 py-24 lg:py-32">
            <Reveal className="max-w-2xl">
              <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">Verification</p>
              <h2 className="mt-3 text-[32px] leading-tight font-medium tracking-tight">A patch is not finished when it is written.</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-secondary">
                Syntax, build, tests, a second scan, and a regression check run in isolation. The finding closes only after they hold.
              </p>
            </Reveal>
            <ol className="mt-12 divide-y divide-line border-y border-line">
              {CHECKS.map(([name, detail], index) => (
                <Reveal key={name} delay={index * 0.05}>
                  <li className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4">
                    <span className="font-mono text-[12px] text-muted">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <p className="text-[15px]">{name}</p>
                      <p className="text-[13px] text-secondary">{detail}</p>
                    </div>
                    <span className="font-mono text-[11px] tracking-[0.14em] text-secure uppercase">Held</span>
                  </li>
                </Reveal>
              ))}
            </ol>
            <Reveal delay={0.2}>
              <p className="mt-8 font-mono text-[12px] tracking-[0.22em] text-secure uppercase">Patch verified</p>
            </Reveal>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-24 lg:flex-row lg:items-end lg:justify-between lg:py-32">
            <Reveal>
              <h2 className="max-w-xl text-[36px] leading-[1.1] font-medium tracking-tight sm:text-[44px]">
                Scan the repository. Hold the merge until the patch verifies.
              </h2>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="flex flex-wrap gap-2">
                <Button size="lg" className="h-11 px-4" asChild>
                  <Link to={scanTo}>
                    Scan Repository
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="secondary" className="h-11 px-4" onClick={() => void viewDemo()}>
                  View Demo
                </Button>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-6 text-[12px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>PatchPilot AI</span>
          <span>Isolated validation. No exploit traffic.</span>
        </div>
      </footer>
    </div>
  )
}

function Stat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const shown = useCountUp(value, 800)
  return (
    <div>
      <dt className="font-mono text-[22px] text-foreground tabular">{shown}{suffix}</dt>
      <dd className="mt-1 text-[12px] leading-snug text-muted">{label}</dd>
    </div>
  )
}

function MethodList() {
  const reduced = usePrefersReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 55%'] })
  const scaleY = useTransform(scrollYProgress, [0, 1], [0.08, 1])

  return (
    <div ref={ref} className="relative">
      <span className="absolute top-1 bottom-1 left-0 w-px bg-line" />
      <motion.span
        className="absolute top-1 bottom-1 left-0 w-px origin-top bg-accent"
        style={reduced ? { scaleY: 1 } : { scaleY }}
      />
      <ol>
        {STAGES.map(([index, title, body, result], item) => (
          <Reveal key={index} delay={item * 0.04}>
            <li className="grid grid-cols-[64px_minmax(0,1fr)] gap-4 border-b border-line py-6 last:border-b-0">
              <span className="pl-4 font-mono text-[12px] text-muted">{index}</span>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                <div className="max-w-md">
                  <h3 className="text-[18px] font-medium tracking-tight">{title}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-secondary">{body}</p>
                </div>
                <p className="shrink-0 font-mono text-[12px] text-accent">{result}</p>
              </div>
            </li>
          </Reveal>
        ))}
      </ol>
    </div>
  )
}
