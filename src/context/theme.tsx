import { createContext, useContext, useState, type ReactNode } from 'react'
import type { ThemeMode } from '@/types/api'

interface ThemeContextValue {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.remove('dark', 'light')
  document.documentElement.classList.add(theme)
  localStorage.setItem('patchpilot.theme', theme)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f3f5f7' : '#07090c')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() =>
    document.documentElement.classList.contains('light') ? 'light' : 'dark',
  )

  const setTheme = (next: ThemeMode) => {
    setThemeState(next)
    applyTheme(next)
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('ThemeProvider is missing')
  return value
}
