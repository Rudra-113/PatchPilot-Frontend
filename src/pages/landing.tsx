import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { LandingField } from '@/components/marketing/landing-field'
import { ProductConsole, type ConsoleStage } from '@/components/marketing/product-console'
import { RepoSphere } from '@/components/marketing/repo-sphere'
import { ScanType } from '@/components/marketing/scan-type'
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
  const reduced = usePrefersReducedMotion()
  const { scrollYProgress } = useScroll()
  const heroRef = useRef<HTMLElement>(null)
  const consoleRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const { scrollYProgress: consoleProgress } = useScroll({ target: consoleRef, offset: ['start end', 'center center'] })
  const sphereY = useTransform(heroProgress, [0, 1], [0, 72])
  const consoleTilt = useTransform(consoleProgress, [0, 1], [11, 0])
  const consoleLift = useTransform(consoleProgress, [0, 1], [32, 0])
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
    <div id="top" className="relative min-h-screen">
      <LandingField />
      {reduced ? null : (
        <motion.div className="fixed inset-x-0 top-0 z-40 h-0.5 origin-left bg-gradient-to-r from-accent to-complement" style={{ scaleX: scrollYProgress }} />
      )}
      <SiteHeader scanTo={scanTo} />
      <main className="relative z-10">
        <section ref={heroRef} className="relative mx-auto w-full max-w-6xl px-5 pt-24 pb-16 sm:pt-28">
          <div className="pointer-events-none absolute -top-16 left-0 h-[460px] w-[min(640px,80vw)] bg-[radial-gradient(ellipse_at_top_left,rgba(240,193,77,0.2),transparent_64%)]" />
          <div className="pointer-events-none absolute top-8 right-0 h-[480px] w-[min(640px,78vw)] bg-[radial-gradient(ellipse_at_center,rgba(61,126,255,0.22),transparent_62%)]" />
          <div className="relative grid items-center gap-2 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)]">
            <div>
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
                {['Semgrep', 'CodeQL', 'Bandit', 'Trivy', 'Gitleaks'].map((name, index) => (
                  <li key={name} className="flex items-center gap-2">
                    <span className={cn('size-1', index % 2 === 0 ? 'bg-accent' : 'bg-complement')} />
                    {name}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <motion.div className="relative h-[360px] sm:h-[480px]" style={reduced ? undefined : { y: sphereY }}>
                <RepoSphere />
              </motion.div>
              <p className="pointer-events-none mt-2 text-center font-mono text-[10px] tracking-[0.16em] text-muted uppercase">
                <span className="text-accent">1,284 files</span>
                <span className="mx-2 text-line-strong">/</span>
                <span className="text-complement">scan in motion</span>
              </p>
            </div>
          </div>
          <div ref={consoleRef} className="relative mt-6 [perspective:1400px] lg:mt-2">
            <motion.div
              className="origin-center"
              initial={reduced ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '0px 0px -8% 0px' }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              style={reduced ? undefined : { rotateX: consoleTilt, y: consoleLift }}
            >
              <ProductConsole stage="detected" />
            </motion.div>
          </div>
        </section>

        <ScanType />
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
                {INVENTORY.map(([name, language, score, open, when], row) => (
                  <motion.li
                    key={name}
                    className="grid grid-cols-1 gap-1 border-t border-line py-3 transition-colors duration-150 hover:bg-complement/5 md:grid-cols-[1.4fr_1fr_72px_110px_64px] md:items-baseline md:gap-4 md:py-3.5"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '0px 0px -8% 0px' }}
                    transition={{ duration: 0.35, delay: row * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <span className="text-[14px]">{name}</span>
                    <span className="text-[13px] text-secondary">{language}</span>
                    <span className={cn('font-mono text-[13px] tabular', Number(score) < 80 ? 'text-warning' : 'text-foreground')}>{score}</span>
                    <span className={cn('text-[13px]', open.startsWith('3') || open.startsWith('1 critical') ? 'text-critical' : 'text-secondary')}>{open}</span>
                    <span className="font-mono text-[12px] text-muted">{when}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-t border-line">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] lg:items-stretch lg:py-28">
            <div className="flex flex-col justify-between">
              <div>
                <p className="font-mono text-[11px] tracking-[0.18em] text-complement uppercase">Before the merge</p>
                <h2 className="mt-4 max-w-[11em] text-[40px] leading-[0.98] font-medium tracking-[-0.035em] sm:text-[56px]">Hold the merge until the patch verifies.</h2>
                <p className="mt-5 max-w-md text-[15px] leading-relaxed text-secondary">The finding stays open through the explanation, the diff, and an isolated check. Merge is the last step.</p>
              </div>
              <button type="button" onClick={() => void viewDemo()} className="mt-8 w-fit font-mono text-[12px] text-muted underline-offset-4 transition-colors hover:text-accent hover:underline">
                Or open the Northline demo
              </button>
            </div>
            <div className="grid gap-3">
              <Link to={scanTo} className="group relative overflow-hidden border border-accent/40 bg-accent/8 p-5 transition-colors duration-200 hover:border-accent hover:bg-accent/14">
                <span className="absolute inset-y-0 left-0 w-1 bg-accent" />
                <p className="font-mono text-[11px] tracking-[0.16em] text-accent uppercase">Scan repository</p>
                <h3 className="mt-2 text-[22px] font-medium tracking-tight">Point it at a branch.</h3>
                <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-secondary">Name the project, then a GitHub URL, a zip, or a folder. The scan types its stages. Nothing is executed.</p>
                <p className="mt-4 font-mono text-[12px] text-accent">Start a scan →</p>
              </Link>
              <Link to="/login" className="group relative overflow-hidden border border-complement/40 bg-complement/8 p-5 transition-colors duration-200 hover:border-complement hover:bg-complement/14">
                <span className="absolute inset-y-0 left-0 w-1 bg-complement" />
                <p className="font-mono text-[11px] tracking-[0.16em] text-complement uppercase">Sign in</p>
                <h3 className="mt-2 text-[22px] font-medium tracking-tight">Open the workspace.</h3>
                <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-secondary">Any work email and a password of 8 characters. With no API set, the session stays in this browser.</p>
                <p className="mt-4 font-mono text-[12px] text-complement">Sign in →</p>
              </Link>
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
  const tone = active.id === 'analysis' ? 'text-complement' : active.id === 'verified' ? 'text-secure' : 'text-accent'

  return (
    <section id="record" ref={ref} className="relative h-[280vh] scroll-mt-16 border-t border-line">
      <div className="sticky top-12 flex min-h-[calc(100vh-3rem)] items-center">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(280px,0.82fr)_minmax(0,1.18fr)] items-center gap-10 px-5 py-8">
          <div>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11px] tracking-[0.16em] text-complement uppercase">The record</p>
              <p className="font-mono text-[11px] text-muted">{String(index + 1).padStart(2, '0')} / 03</p>
            </div>
            <div className="mt-4 h-px overflow-hidden bg-line">
              <motion.div className="h-full origin-left bg-gradient-to-r from-complement to-accent" style={{ scaleX: scrollYProgress }} />
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className={cn('mt-6 font-mono text-[84px] leading-none tracking-[-0.06em]', tone)}>{active.index}</p>
                <h2 className="mt-2 text-[40px] leading-none font-medium tracking-[-0.03em]">{active.title}</h2>
                <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-secondary">{active.body}</p>
              </motion.div>
            </AnimatePresence>
            <ol className="mt-8 border-t border-line">
              {RECORD.map((step, stepIndex) => {
                const selected = stepIndex === index
                const stepTone = step.id === 'analysis' ? 'border-complement text-complement' : step.id === 'verified' ? 'border-secure text-secure' : 'border-accent text-accent'
                return (
                  <li key={step.id} className="border-b border-line">
                    <button type="button" onClick={() => go(stepIndex)} className="flex w-full items-baseline gap-4 py-3 text-left">
                      <span className={cn('w-8 font-mono text-[12px]', selected ? stepTone : 'text-muted')}>{step.index}</span>
                      <span className={cn('text-[15px] transition-colors duration-200', selected ? 'text-foreground' : 'text-muted')}>{step.title}</span>
                      {selected ? <span className={cn('ml-auto font-mono text-[10px] tracking-[0.14em] uppercase', stepTone)}>Live</span> : null}
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between font-mono text-[11px] text-muted">
              <span>northline/payment-gateway</span>
              <span className={tone}>{active.title}</span>
            </div>
            <ProductConsole stage={active.id satisfies ConsoleStage} />
          </div>
        </div>
      </div>
    </section>
  )
}
