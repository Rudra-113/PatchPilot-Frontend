import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Sheet({
  open,
  onOpenChange,
  children,
  title,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  title: string
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="pp-overlay fixed inset-0 z-50 bg-background/70 lg:hidden" />
        <DialogPrimitive.Content
          className={cn(
            'pp-dialog fixed inset-y-0 left-0 z-50 w-[240px] border-r border-line bg-surface lg:hidden',
          )}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
