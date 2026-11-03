import { motion } from 'framer-motion'
import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { CommandPalette } from '@/components/layout/command-palette'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { Sheet } from '@/components/ui/sheet'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'

export function DashboardLayout() {
  const location = useLocation()
  const reduced = usePrefersReducedMotion()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('patchpilot.sidebar') === 'collapsed')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [palette, setPalette] = useState(false)

  useEffect(() => {
    localStorage.setItem('patchpilot.sidebar', collapsed ? 'collapsed' : 'open')
  }, [collapsed])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPalette(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <div className="flex min-h-screen bg-background">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <motion.div
        className="sticky top-0 hidden h-screen shrink-0 overflow-hidden lg:block"
        initial={false}
        animate={{ width: collapsed ? 72 : 236 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 32 }}
      >
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} className="w-full" />
      </motion.div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen} title="Navigation">
        <Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMobileOpen(true)} onSearch={() => setPalette(true)} />
        <main id="content" className="flex-1 px-4 py-6 sm:px-6">
          <Suspense
            fallback={
              <div className="h-px overflow-hidden bg-foreground/10">
                <div className="pp-route-bar h-full w-1/3 bg-accent" />
              </div>
            }
          >
            <motion.div
              key={location.pathname}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {reduced ? null : (
                <motion.div
                  className="mb-5 h-px origin-left bg-gradient-to-r from-accent via-complement to-transparent"
                  initial={{ scaleX: 0, opacity: 0.9 }}
                  animate={{ scaleX: 1, opacity: 0.35 }}
                  transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
              <Outlet />
            </motion.div>
          </Suspense>
        </main>
      </div>
      <CommandPalette open={palette} onOpenChange={setPalette} />
    </div>
  )
}
