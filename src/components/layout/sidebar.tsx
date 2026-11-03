import { motion } from 'framer-motion'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useId, useState } from 'react'
import { NavLink } from 'react-router'
import { Wordmark } from '@/components/brand/mark'
import { Tooltip } from '@/components/ui/tooltip'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from '@/lib/nav'
import { cn } from '@/lib/utils'

function Item({
  item,
  index,
  collapsed,
  scope,
  onNavigate,
}: {
  item: NavItem
  index: number
  collapsed: boolean
  scope: string
  onNavigate?: () => void
}) {
  const reduced = usePrefersReducedMotion()
  const Icon = item.icon
  const [ripple, setRipple] = useState(0)
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative block overflow-hidden rounded-md text-[13px]',
          isActive ? 'text-foreground' : 'text-secondary',
        )
      }
    >
      {({ isActive }) => (
        <motion.span
          className={cn('relative flex h-10 items-center gap-2.5 px-2', collapsed && 'justify-center px-0')}
          initial={reduced ? false : { opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={reduced ? undefined : { x: collapsed ? 0 : 3 }}
          whileTap={reduced ? undefined : { scale: 0.96 }}
          transition={{ duration: 0.28, delay: reduced ? 0 : index * 0.035, ease: [0.22, 1, 0.36, 1] }}
          onPointerDown={() => {
            if (!reduced) setRipple((value) => value + 1)
          }}
        >
          {isActive ? (
            <motion.span
              layoutId={`nav-wash-${scope}`}
              className="absolute inset-0 rounded-md bg-gradient-to-r from-accent/18 via-accent/8 to-complement/14"
              transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 34 }}
            />
          ) : null}
          {isActive ? (
            <motion.span
              layoutId={`nav-rail-${scope}`}
              className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full bg-accent shadow-[0_0_12px_var(--accent)]"
              transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 32 }}
            />
          ) : null}
          {ripple > 0 && !reduced ? (
            <motion.span
              key={ripple}
              className="pointer-events-none absolute inset-y-0 left-0 w-full rounded-md bg-complement/40"
              initial={{ opacity: 0.7, scaleX: 0.15 }}
              animate={{ opacity: 0, scaleX: 1 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              style={{ originX: 0 }}
            />
          ) : null}
          <motion.span
            className="relative grid size-7 place-items-center"
            whileTap={reduced ? undefined : { scale: 1.2, rotate: -10 }}
            transition={{ type: 'spring', stiffness: 560, damping: 16 }}
          >
            <Icon className={cn('size-4', isActive ? 'text-accent' : 'text-secondary transition-colors duration-150 group-hover:text-complement')} strokeWidth={1.75} />
          </motion.span>
          {collapsed ? null : <span className={cn('relative truncate', isActive && 'font-medium')}>{item.label}</span>}
        </motion.span>
      )}
    </NavLink>
  )
  if (!collapsed) return link
  return (
    <Tooltip content={item.label} side="right">
      {link}
    </Tooltip>
  )
}

export function Sidebar({
  collapsed,
  onToggle,
  onNavigate,
  className,
}: {
  collapsed: boolean
  onToggle?: () => void
  onNavigate?: () => void
  className?: string
}) {
  const reduced = usePrefersReducedMotion()
  const scope = useId()
  return (
    <aside className={cn('flex h-full flex-col border-r border-line bg-surface shadow-[inset_0_1px_0_var(--accent)]', className)}>
      <div className={cn('flex h-14 items-center px-3', collapsed ? 'justify-center' : 'justify-between')}>
        <Wordmark compact={collapsed} />
        {onToggle && !collapsed ? (
          <motion.button
            type="button"
            onClick={onToggle}
            whileTap={reduced ? undefined : { scale: 0.88, rotate: -12 }}
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-complement/10 hover:text-complement"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="size-4" />
          </motion.button>
        ) : null}
      </div>
      <nav className="flex-1 space-y-0.5 px-2">
        {collapsed ? null : <p className="px-2 pt-1 pb-1.5 font-mono text-[10px] tracking-[0.16em] text-muted uppercase">Workspace</p>}
        {PRIMARY_NAV.map((item, index) => (
          <Item key={item.to} item={item} index={index} collapsed={collapsed} scope={scope} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className="space-y-0.5 border-t border-line px-2 py-2">
        {collapsed ? null : <p className="px-2 pt-1 pb-1.5 font-mono text-[10px] tracking-[0.16em] text-muted uppercase">Account</p>}
        {SECONDARY_NAV.map((item, index) => (
          <Item key={item.to} item={item} index={PRIMARY_NAV.length + index} collapsed={collapsed} scope={scope} onNavigate={onNavigate} />
        ))}
        {onToggle && collapsed ? (
          <motion.button
            type="button"
            onClick={onToggle}
            whileTap={reduced ? undefined : { scale: 0.9, rotate: 10 }}
            className="flex h-10 w-full items-center justify-center rounded-md text-muted hover:bg-complement/10 hover:text-complement"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="size-4" />
          </motion.button>
        ) : null}
      </div>
    </aside>
  )
}
