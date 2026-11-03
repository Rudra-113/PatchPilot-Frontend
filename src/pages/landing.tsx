import { ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { Wordmark } from '@/components/brand/mark'
import { SecurityEngine } from '@/components/marketing/security-engine'
import { SeverityBadge } from '@/components/security/badges'
import { Button } from '@/components/ui/button'
import { useSession } from '@/context/session'

const STEPS = [
  ['01', 'Repository', 'Read the branch, lockfiles, and the files a scanner can actually reach.'],
  ['02', 'Threat detection', 'Run Semgrep, CodeQL, Bandit, Trivy, and Gitleaks against the tree.'],
  ['03', 'AI analysis', 'Explain the sink, the impact, and the confidence in plain language.'],
  ['04', 'Patch generation', 'Draft a minimal diff that changes the vulnerable lines and little else.'],
  ['05', 'Validation', 'Build, test, and rescan the patch in isolation before anyone is asked to merge it.'],
  ['06', 'Secure', 'Close the finding only when verification holds.'],
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
    <div className="relative min-h-screen">
      <div className="technical-grid pointer-events-none absolute inset-x-0 top-0 h-[720px]" />
      <header className="relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
        <Wordmark />
        <nav className="flex items-center gap-2">
          <Link to="/login" className="hidden h-9 items-center px-3 text-[13px] text-secondary hover:text-foreground sm:inline-flex">
            Sign in
          </Link>
          <Button asChild>
            <Link to={scanTo}>Scan Repository</Link>
          </Button>
        </nav>
      </header>
      <main className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pt-10 pb-20 lg:grid-cols-2 lg:pt-16">
        <div>
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">Autonomous remediation</p>
          <h1 className="mt-3 text-[44px] leading-[1.05] font-medium tracking-tight sm:text-[56px]">
            PatchPilot AI
          </h1>
          <p className="mt-4 max-w-md text-[18px] leading-snug text-foreground">Autonomous vulnerability remediation for modern codebases.</p>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-secondary">
            Detect vulnerabilities. Understand the root cause. Generate secure patches. Validate the fix.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Button size="lg" asChild>
              <Link to={scanTo}>
                Scan Repository
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" onClick={() => void viewDemo()}>
              View Demo
            </Button>
          </div>
          <p className="mt-6 font-mono text-[11px] text-muted">Semgrep · CodeQL · Bandit · Trivy · Gitleaks</p>
        </div>
        <SecurityEngine />
      </main>
      <section className="relative border-t border-line">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-16 lg:grid-cols-[220px_1fr]">
          <div>
            <p className="font-mono text-[10px] tracking-[0.18em] text-muted uppercase">Method</p>
            <h2 className="mt-2 text-[20px] font-medium tracking-tight">The remediation loop</h2>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 xl:grid-cols-3">
            {STEPS.map(([index, title, body]) => (
              <li key={index} className="bg-surface p-4">
                <p className="font-mono text-[11px] text-muted">{index}</p>
                <h3 className="mt-2 text-[14px] font-medium">{title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-secondary">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="border-t border-line">
        <div className="mx-auto grid w-full max-w-6xl items-start gap-8 px-5 py-16 lg:grid-cols-[220px_1fr]">
          <div>
            <p className="font-mono text-[10px] tracking-[0.18em] text-muted uppercase">A finding</p>
            <h2 className="mt-2 text-[20px] font-medium tracking-tight">The sink, the cause, the diff.</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-secondary">Analysts stay in one view from the vulnerable line to a verified patch.</p>
          </div>
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
              <SeverityBadge severity="critical" />
              <div>
                <p className="text-[14px] font-medium">SQL Injection</p>
                <p className="font-mono text-[11px] text-muted">app/api/users.py:42 · CWE-89 · Semgrep</p>
              </div>
            </div>
            <pre className="overflow-auto bg-inset px-4 py-3 font-mono text-[12px] leading-6 text-secondary">
              <div>40  @router.get("/users")</div>
              <div>41  def find_user(...):</div>
              <div className="bg-critical/10 text-foreground shadow-[inset_2px_0_0_var(--critical)]">
                42  statement = f"SELECT ... WHERE email = '{`{email}`}'"
              </div>
            </pre>
            <div className="grid gap-4 border-t border-line px-4 py-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] tracking-[0.14em] text-ai uppercase">Root cause</p>
                <p className="mt-1 text-[13px] leading-relaxed text-secondary">The email filter is interpolated into the statement. Authentication does not make that string safe.</p>
              </div>
              <div>
                <p className="text-[11px] tracking-[0.14em] text-muted uppercase">Patch</p>
                <p className="mt-1 font-mono text-[12px] text-secure">+ statement = "SELECT ... WHERE email = ?"</p>
                <p className="font-mono text-[12px] text-critical">- statement = f"... '{`{email}`}'"</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-6 text-[12px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>PatchPilot AI</span>
          <span>Isolated validation. No exploit traffic.</span>
        </div>
      </footer>
    </div>
  )
}
