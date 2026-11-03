import type { Credentials, Session } from '@/types/api'
import { request } from '@/services/client'
import { readSession, writeSession } from '@/services/session-store'

export { readSession }

export async function signIn(credentials: Credentials) {
  const session = await request<Session>('/auth/session', { method: 'POST', body: credentials })
  writeSession(session)
  return session
}

export async function enterDemo() {
  const session = await request<Session>('/auth/demo', { method: 'POST' })
  writeSession(session)
  return session
}

export async function signOut() {
  try {
    await request('/auth/session', { method: 'DELETE' })
  } finally {
    writeSession(null)
  }
}
