import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[13px] font-medium transition-[background-color,border-color,color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] hover:bg-accent-hover',
        secondary:
          'border border-line-strong/80 bg-elevated/80 text-foreground hover:border-accent/40 hover:bg-surface',
        ghost: 'text-secondary hover:bg-foreground/5 hover:text-foreground',
        danger: 'bg-critical-dim text-critical hover:bg-critical/20',
        secure: 'bg-secure text-background hover:brightness-110',
      },
      size: {
        sm: 'h-8 px-2.5',
        md: 'h-9 px-3',
        lg: 'h-10 px-3.5',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({ className, variant, size, asChild = false, type = 'button', ...props }: ButtonProps) {
  if (asChild) {
    return <Slot className={cn(buttonVariants({ variant, size }), className)} {...props} />
  }
  return <button className={cn(buttonVariants({ variant, size }), className)} type={type} {...props} />
}

export { buttonVariants }
