import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { Wordmark } from '@/components/brand/mark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSession } from '@/context/session'
import { ApiError } from '@/services/errors'

export default function Login() {
  const { session, signInWith, enterDemoWorkspace } = useSession()
  const [params] = useSearchParams()
  const navigate = useNavigate()
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
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_440px]">
      <section className="relative hidden border-r border-line bg-surface lg:flex lg:flex-col lg:justify-between lg:p-10">
        <Wordmark />
        <div>
          <p className="max-w-sm text-[22px] leading-snug font-medium tracking-tight">Detect the sink. Explain it. Prove the patch.</p>
          <ol className="mt-6 space-y-2 text-[13px] text-secondary">
            {['Repository', 'Threat detection', 'AI analysis', 'Patch generation', 'Validation', 'Secure'].map((step, index) => (
              <li key={step} className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-muted">{String(index + 1).padStart(2, '0')}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <p className="text-[12px] text-muted">Northline demo data stays in this browser until an API base URL is set.</p>
      </section>
      <section className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mb-8 lg:hidden">
          <Wordmark />
        </div>
        <h1 className="text-[22px] font-medium tracking-tight">Sign in</h1>
        <p className="mt-1 text-[13px] text-secondary">Use any work email. With no API configured, the session stays in this browser.</p>
        <form className="mt-6 space-y-4" onSubmit={(event) => void submit(event)}>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
          </div>
          {error ? <p className="text-[13px] text-critical">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Signing in…' : 'Continue'}
          </Button>
        </form>
        <Button variant="secondary" className="mt-2 w-full" disabled={pending} onClick={() => void demo()}>
          Enter the Northline demo
        </Button>
        <p className="mt-6 text-[12px] text-muted">
          <Link to="/" className="hover:text-foreground">Back to PatchPilot</Link>
        </p>
      </section>
    </div>
  )
}
