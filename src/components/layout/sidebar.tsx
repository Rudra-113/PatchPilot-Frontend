import { motion } from 'framer-motion'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { NavLink } from 'react-router'
import { Wordmark } from '@/components/brand/mark'
import { Tooltip } from '@/components/ui/tooltip'
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from '@/lib/nav'
import { cn } from '@/lib/utils'

function Item({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  const Icon = item.icon
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex h-9 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors duration-150',
          isActive ? 'text-foreground' : 'text-secondary hover:bg-foreground/4 hover:text-foreground',
          collapsed && 'justify-center px-0',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <motion.span
              layoutId="nav-active"
              className="absolute inset-0 rounded-md bg-foreground/6"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          ) : null}
          {isActive ? <span className="absolute top-1.5 bottom-1.5 left-0 w-px bg-accent" /> : null}
          <Icon className="relative size-4 shrink-0" strokeWidth={1.75} />
          {collapsed ? null : <span className="relative truncate">{item.label}</span>}
        </>
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
  return (
    <aside className={cn('flex h-full flex-col border-r border-line bg-surface', className)}>
      <div className={cn('flex h-14 items-center px-3', collapsed ? 'justify-center' : 'justify-between')}>
        <Wordmark compact={collapsed} />
        {onToggle && !collapsed ? (
          <button type="button" onClick={onToggle} className="rounded-md p-1.5 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground" aria-label="Collapse sidebar">
            <PanelLeftClose className="size-4" />
          </button>
        ) : null}
      </div>
      <nav className="flex-1 space-y-0.5 px-2">
        {PRIMARY_NAV.map((item) => (
          <Item key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className="space-y-0.5 border-t border-line px-2 py-2">
        {SECONDARY_NAV.map((item) => (
          <Item key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
        {onToggle && collapsed ? (
          <button type="button" onClick={onToggle} className="flex h-9 w-full items-center justify-center rounded-md text-muted hover:bg-foreground/5 hover:text-foreground" aria-label="Expand sidebar">
            <PanelLeftOpen className="size-4" />
          </button>
        ) : null}
      </div>
    </aside>
  )
}
