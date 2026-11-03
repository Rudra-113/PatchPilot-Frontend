import { motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { useState } from 'react'
import { Link } from 'react-router'
import { Wordmark } from '@/components/brand/mark'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const LINKS = [
  ['Method', '#method'],
  ['Finding', '#finding'],
  ['Verification', '#verification'],
] as const

export function SiteHeader({ scanTo }: { scanTo: string }) {
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(() => typeof window !== 'undefined' && window.scrollY > 12)
  useMotionValueEvent(scrollY, 'change', (value) => {
    const next = value > 12
    setScrolled((current) => (current === next ? current : next))
  })

  return (
    <motion.header
      className={cn(
        'fixed inset-x-0 top-0 z-30 transition-[background-color,border-color,backdrop-filter] duration-200',
        scrolled ? 'border-b border-line bg-[#070b14]/80 backdrop-blur-md' : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
        <a href="#top" className="rounded-sm">
          <Wordmark />
        </a>
        <nav className="hidden items-center gap-6 md:flex">
          {LINKS.map(([label, href]) => (
            <a key={href} href={href} className="text-[13px] text-secondary transition-colors duration-150 hover:text-foreground">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden h-9 items-center px-3 text-[13px] text-secondary transition-colors hover:text-foreground sm:inline-flex">
            Sign in
          </Link>
          <Button asChild>
            <Link to={scanTo}>Scan Repository</Link>
          </Button>
        </div>
      </div>
    </motion.header>
  )
}
