import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

export function DropdownMenuContent({
  children,
  align = 'end',
  className,
}: {
  children: ReactNode
  align?: 'start' | 'center' | 'end'
  className?: string
}) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        align={align}
        sideOffset={6}
        className={cn(
          'pp-pop z-50 min-w-44 rounded-md border border-line-strong bg-elevated p-1',
          className,
        )}
      >
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  )
}

export function DropdownMenuItem({
  children,
  onSelect,
  disabled,
}: {
  children: ReactNode
  onSelect?: () => void
  disabled?: boolean
}) {
  return (
    <DropdownMenuPrimitive.Item
      disabled={disabled}
      onSelect={onSelect}
      className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-[13px] text-foreground outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-foreground/6"
    >
      {children}
    </DropdownMenuPrimitive.Item>
  )
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-2 py-1.5 text-[11px] tracking-wide text-muted uppercase">{children}</div>
}
