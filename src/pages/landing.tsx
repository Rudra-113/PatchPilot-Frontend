import { useMotionValueEvent, useScroll } from 'framer-motion'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ProductConsole, type ConsoleStage } from '@/components/marketing/product-console'
import { SiteHeader } from '@/components/marketing/site-header'
import { Button } from '@/components/ui/button'
import { useSession } from '@/context/session'
import { useMediaQuery } from '@/hooks/use-media-query'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'
import { cn } from '@/lib/utils'

const RECORD = [
  {
    id: 'analysis' as const,
    index: '01',
    title: 'Analysis',
    body: 'The model writes the data flow. Confidence is 96 because the email parameter reaches the statement, not because a rule fired.',
  },
  {
    id: 'patch' as const,
    index: '02',
    title: 'Patch',
    body: 'Two lines change. The email becomes a bound parameter. The handler and the response stay as they were.',
  },
  {
    id: 'verified' as const,
    index: '03',
    title: 'Verified',
    body: 'Syntax, build, tests, a rescan, and a regression check run in isolation. The finding closes only after they hold.',
  },
]

const INVENTORY = [
  ['Payment Gateway', 'Python · FastAPI', '72', '3 critical', '2h'],
  ['Ledger Ingest', 'Java · Spring', '85', '1 critical', '1d'],
  ['CyberGuard Backend', 'Python · FastAPI', '94', '1 high', '21m'],
  ['PatchPilot API', 'Python · FastAPI', '94', '1 high', '3h'],
  ['SecureAuth', 'Go', '96', '1 high', '5h'],
  ['Edge Proxy', 'Rust', '96', '1 high', '2d'],
]

export default function Landing() {
  const { session, enterDemoWorkspace } = useSession()
  const navigate = useNavigate()
  const scanTo = session ? '/app/projects/new' : '/login?next=/app/projects/new'

  const viewDemo = async () => {
    if (session?.workspace === 'demo') {
      navigate('/app')
      return
    }
    await enterDemoWorkspace()
    navigate('/app')
  }

  return (
    <div id="top" className="min-h-screen">
      <SiteHeader scanTo={scanTo} />
      <main>
        <section className="relative mx-auto w-full max-w-6xl px-5 pt-24 pb-16 sm:pt-28">
          <div className="pointer-events-none absolute -top-10 left-0 h-[420px] w-[min(720px,90vw)] bg-[radial-gradient(ellipse_at_top_left,rgba(228,194,122,0.14),transparent_62%)]" />
          <div className="relative">
            <p className="flex items-center gap-3 font-mono text-[11px] tracking-[0.18em] text-accent uppercase">
              <span className="h-px w-8 bg-accent" />
              Security remediation
            </p>
            <h1 className="mt-5 max-w-[11em] text-[44px] leading-[0.96] font-medium tracking-[-0.04em] text-foreground sm:text-[68px] lg:text-[76px]">
              Autonomous vulnerability remediation for modern codebases.
            </h1>
            <p className="mt-6 max-w-md text-[16px] leading-relaxed text-secondary">
              Detect vulnerabilities. Understand the root cause. Generate secure patches. Validate the fix.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              <Button size="lg" className="h-11 px-4" asChild>
                <Link to={scanTo}>Scan Repository</Link>
              </Button>
              <Button size="lg" variant="secondary" className="h-11 px-4" onClick={() => void viewDemo()}>
                View Demo
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-4 gap-y-2 font-mono text-[11px] text-muted">
              {['Semgrep', 'CodeQL', 'Bandit', 'Trivy', 'Gitleaks'].map((name) => (
                <li key={name} className="flex items-center gap-2">
                  <span className="size-1 bg-accent" />
                  {name}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mt-14">
            <ProductConsole stage="detected" />
          </div>
        </section>

        <Record />

        <section id="inventory" className="scroll-mt-16 border-t border-line">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 lg:py-28">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Inventory</p>
                <h2 className="mt-3 max-w-[14em] text-[32px] leading-[1.05] font-medium tracking-[-0.03em] sm:text-[40px]">Northline, as of the last scan.</h2>
              </div>
              <p className="hidden max-w-xs text-[13px] leading-relaxed text-secondary md:block">Score is the open-risk average for repositories that have finished a scan. Critical findings move it.</p>
            </div>
            <div className="mt-10 border-t border-line">
              <div className="hidden grid-cols-[1.4fr_1fr_72px_110px_64px] gap-4 py-2 font-mono text-[10px] tracking-[0.14em] text-muted uppercase md:grid">
                <span>Repository</span>
                <span>Language</span>
                <span>Score</span>
                <span>Open</span>
                <span>Scan</span>
              </div>
              <ul>
                {INVENTORY.map(([name, language, score, open, when]) => (
                  <li key={name} className="grid grid-cols-1 gap-1 border-t border-line py-3 transition-colors duration-150 hover:bg-foreground/3 md:grid-cols-[1.4fr_1fr_72px_110px_64px] md:items-baseline md:gap-4 md:py-3.5">
                    <span className="text-[14px]">{name}</span>
                    <span className="text-[13px] text-secondary">{language}</span>
                    <span className={cn('font-mono text-[13px] tabular', Number(score) < 80 ? 'text-warning' : 'text-foreground')}>{score}</span>
                    <span className={cn('text-[13px]', open.startsWith('3') || open.startsWith('1 critical') ? 'text-critical' : 'text-secondary')}>{open}</span>
                    <span className="font-mono text-[12px] text-muted">{when}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-24 sm:py-32 lg:flex-row lg:items-end lg:justify-between">
            <h2 className="max-w-[10em] text-[40px] leading-[0.98] font-medium tracking-[-0.035em] sm:text-[56px]">Hold the merge until the patch verifies.</h2>
            <div className="flex flex-wrap gap-2">
              <Button size="lg" className="h-10 px-3.5" asChild>
                <Link to={scanTo}>Scan Repository</Link>
              </Button>
              <Button size="lg" variant="secondary" className="h-10 px-3.5" onClick={() => void viewDemo()}>
                View Demo
              </Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-5 py-5 font-mono text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>PatchPilot AI</span>
          <span>Isolated validation. No exploit traffic.</span>
        </div>
      </footer>
    </div>
  )
}

function Record() {
  const wide = useMediaQuery('(min-width: 1024px)')
  const reduced = usePrefersReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const [index, setIndex] = useState(0)
  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    if (!wide || reduced) return
    const next = Math.min(RECORD.length - 1, Math.round(value * (RECORD.length - 1)))
    setIndex((current) => (current === next ? current : next))
  })

  const go = (next: number) => {
    const node = ref.current
    if (!node) return
    const start = node.getBoundingClientRect().top + window.scrollY
    const travel = node.offsetHeight - window.innerHeight
    window.scrollTo({ top: start + (travel * next) / (RECORD.length - 1), behavior: reduced ? 'auto' : 'smooth' })
  }

  if (!wide || reduced) {
    return (
      <section id="record" className="scroll-mt-16 border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-5 pt-16">
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">The record</p>
          <h2 className="mt-3 max-w-[14em] text-[32px] leading-[1.05] font-medium tracking-[-0.03em]">One finding, followed through.</h2>
        </div>
        <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-16">
          {RECORD.map((step) => (
            <article key={step.id} className="w-[min(88vw,560px)] shrink-0 snap-start">
              <p className="font-mono text-[11px] text-muted">{step.index}</p>
              <h3 className="mt-1 text-[18px] font-medium">{step.title}</h3>
              <p className="mt-2 mb-4 max-w-md text-[13px] leading-relaxed text-secondary">{step.body}</p>
              <ProductConsole stage={step.id} compact />
            </article>
          ))}
        </div>
      </section>
    )
  }

  const active = RECORD[index]

  return (
    <section id="record" ref={ref} className="relative h-[280vh] scroll-mt-16 border-t border-line">
      <div className="sticky top-12 mx-auto grid h-[calc(100vh-3rem)] w-full max-w-6xl grid-cols-[220px_minmax(0,1fr)] content-start items-start gap-10 px-5 pt-10">
        <div>
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">The record</p>
          <ol className="mt-6">
            {RECORD.map((step, stepIndex) => {
              const selected = stepIndex === index
              return (
                <li key={step.id} className="border-t border-line">
                  <button type="button" onClick={() => go(stepIndex)} className="w-full py-3 text-left">
                    <span className="font-mono text-[11px] text-muted">{step.index}</span>
                    <span className={cn('mt-1 block text-[18px] tracking-tight transition-colors duration-200', selected ? 'text-foreground' : 'text-muted')}>{step.title}</span>
                    {selected ? <span className="mt-2 block text-[13px] leading-relaxed text-secondary">{step.body}</span> : null}
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
        <ProductConsole stage={active.id satisfies ConsoleStage} />
      </div>
    </section>
  )
}
