import type { Session } from '@/types/api'

const KEY = 'patchpilot.session'

export function readSession(): Session | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Session
  } catch {
    localStorage.removeItem(KEY)
    return null
  }
}

export function writeSession(session: Session | null) {
  if (!session) localStorage.removeItem(KEY)
  else localStorage.setItem(KEY, JSON.stringify(session))
}

export function isDemoSession() {
  return readSession()?.workspace === 'demo'
}
