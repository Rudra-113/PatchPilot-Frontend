import { motion } from 'framer-motion'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { Wordmark } from '@/components/brand/mark'
import { LandingField } from '@/components/marketing/landing-field'
import { RepoSphere } from '@/components/marketing/repo-sphere'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSession } from '@/context/session'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'
import { ApiError } from '@/services/errors'

const STEPS = ['Repository', 'Threat detection', 'AI analysis', 'Patch generation', 'Validation', 'Secure']

export default function Login() {
  const { session, signInWith, enterDemoWorkspace } = useSession()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const reduced = usePrefersReducedMotion()
  const next = params.get('next') || '/app'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (session) return <Navigate to={next} replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      await signInWith({ email, password })
      navigate(next)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Sign-in failed.')
    } finally {
      setPending(false)
    }
  }

  const demo = async () => {
    setPending(true)
    setError('')
    try {
      await enterDemoWorkspace()
      navigate('/app')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The demo workspace did not open.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="relative min-h-screen">
      <LandingField />
      <div className="relative z-10 grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,480px)]">
        <section className="flex flex-col justify-between px-6 py-8 sm:px-10 lg:py-10">
          <Link to="/" className="w-fit">
            <Wordmark />
          </Link>
          <div className="relative mx-auto hidden h-[380px] w-full max-w-md lg:block">
            <RepoSphere />
          </div>
          <div>
            <p className="max-w-sm text-[26px] leading-snug font-medium tracking-tight">Detect the sink. Explain it. Prove the patch.</p>
            <ol className="mt-5 grid max-w-lg grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step} className="flex items-center gap-2 text-[13px] text-secondary">
                  <span className={index % 2 === 0 ? 'font-mono text-[11px] text-accent' : 'font-mono text-[11px] text-complement'}>{String(index + 1).padStart(2, '0')}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </section>
        <motion.section
          className="flex items-center border-line px-6 py-12 sm:px-10 lg:border-l lg:bg-background/80"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="w-full border border-line bg-surface/95 shadow-[inset_0_2px_0_var(--accent),inset_3px_0_0_var(--complement)]">
            <div className="border-b border-line px-5 py-4">
              <p className="font-mono text-[11px] tracking-[0.16em] text-complement uppercase">Workspace</p>
              <h1 className="mt-1 text-[28px] font-medium tracking-tight">Sign in</h1>
              <p className="mt-1 text-[13px] leading-relaxed text-secondary">Any work email. Password of at least 8 characters. No API yet, so the session stays in this browser.</p>
            </div>
            <form className="space-y-4 px-5 py-5" onSubmit={(event) => void submit(event)}>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="avery.shah@northline.dev" required className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8 characters or more" required minLength={8} className="h-11" />
              </div>
              {error ? <p className="text-[13px] text-critical">{error}</p> : null}
              <Button type="submit" className="h-11 w-full" disabled={pending}>
                {pending ? 'Signing in…' : 'Continue'}
              </Button>
            </form>
            <div className="border-t border-line px-5 py-4">
              <p className="font-mono text-[11px] tracking-[0.14em] text-accent uppercase">Northline demo</p>
              <p className="mt-1 text-[13px] text-secondary">Avery Shah · Security engineer · six repositories already scanned.</p>
              <Button variant="secondary" className="mt-3 h-10 w-full border-accent/40" disabled={pending} onClick={() => void demo()}>
                Enter the Northline demo
              </Button>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
