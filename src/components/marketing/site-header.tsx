import { useMotionValueEvent, useScroll } from 'framer-motion'
import { useState } from 'react'
import { Link } from 'react-router'
import { Wordmark } from '@/components/brand/mark'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function SiteHeader({ scanTo }: { scanTo: string }) {
  const { scrollY } = useScroll()
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.scrollY > 8)
  useMotionValueEvent(scrollY, 'change', (value) => {
    const next = value > 8
    setCompact((current) => (current === next ? current : next))
  })

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-30 transition-[height,background-color,border-color] duration-200',
        compact ? 'h-12 border-b border-line bg-background/95 shadow-[inset_0_-1px_0_var(--complement)]' : 'h-16 border-b border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-5">
        <a href="#top">
          <Wordmark />
        </a>
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 md:flex">
          <a href="#scan" className="text-[13px] text-secondary transition-colors duration-150 hover:text-foreground">Scan</a>
          <a href="#record" className="text-[13px] text-secondary transition-colors duration-150 hover:text-foreground">Record</a>
          <a href="#inventory" className="text-[13px] text-secondary transition-colors duration-150 hover:text-foreground">Inventory</a>
        </nav>
        <div className="flex items-center gap-1">
          <Link
            to="/login"
            className="hidden h-8 items-center border border-complement/50 bg-complement/10 px-3 text-[13px] text-foreground transition-colors duration-150 hover:border-complement hover:bg-complement/20 sm:inline-flex"
          >
            Sign in
          </Link>
          <Button asChild>
            <Link to={scanTo}>Scan Repository</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
