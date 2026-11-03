import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-9 w-full rounded-md border border-line bg-inset px-3 text-[13px] text-foreground outline-none transition-colors duration-150 placeholder:text-muted focus:border-accent/70',
        className,
      )}
      {...props}
    />
  )
}
