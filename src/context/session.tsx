import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { enterDemo, signIn, signOut } from '@/services/auth'
import { readSession } from '@/services/session-store'
import type { Credentials, Session } from '@/types/api'

interface SessionContextValue {
  session: Session | null
  signInWith: (credentials: Credentials) => Promise<Session>
  enterDemoWorkspace: () => Promise<Session>
  signOutWorkspace: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(() => readSession())

  const signInWith = async (credentials: Credentials) => {
    const next = await signIn(credentials)
    setSession(next)
    queryClient.clear()
    return next
  }

  const enterDemoWorkspace = async () => {
    const next = await enterDemo()
    setSession(next)
    queryClient.clear()
    return next
  }

  const signOutWorkspace = async () => {
    await signOut()
    setSession(null)
    queryClient.clear()
  }

  return (
    <SessionContext.Provider value={{ session, signInWith, enterDemoWorkspace, signOutWorkspace }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error('SessionProvider is missing')
  return value
}
