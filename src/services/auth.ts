import type { Credentials, Session } from '@/types/api'
import { ApiError } from '@/services/errors'
import { mockRequest } from '@/services/mock/router'
import { isDemoSession, readSession, writeSession } from '@/services/session-store'

export { readSession }

function displayName(email: string) {
  return email.split('@')[0].split(/[.\-_]/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') || 'Operator'
}

export async function signIn(credentials: Credentials) {
  const email = credentials.email?.trim().toLowerCase() ?? ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'Enter a valid email address.')
  if ((credentials.password ?? '').length < 8) throw new ApiError(400, 'Use a password of at least 8 characters.')
  const session: Session = {
    token: crypto.randomUUID(),
    workspace: 'empty',
    issuedAt: new Date().toISOString(),
    user: {
      id: `user_${email}`,
      name: displayName(email),
      email,
      role: 'Security engineer',
      organization: email.split('@')[1]?.split('.')[0] ?? 'Workspace',
      timezone: 'Asia/Kolkata',
    },
  }
  writeSession(session)
  return session
}

export async function enterDemo() {
  const session = await mockRequest<Session>('/api/v1/auth/demo', { method: 'POST', session: null })
  writeSession(session)
  return session
}

export async function signOut() {
  const session = readSession()
  if (session && isDemoSession()) await mockRequest('/api/v1/auth/session', { method: 'DELETE', session })
  writeSession(null)
}
