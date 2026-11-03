import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-24 w-full resize-y rounded-md border border-line bg-inset px-3 py-2 text-[13px] text-foreground outline-none transition-colors duration-150 placeholder:text-muted focus:border-accent/70',
        className,
      )}
      {...props}
    />
  )
}
