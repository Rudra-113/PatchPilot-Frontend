import * as SwitchPrimitive from '@radix-ui/react-switch'
import { cn } from '@/lib/utils'

export function Switch({ className, ...props }: SwitchPrimitive.SwitchProps) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full border border-line bg-inset transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-3.5 translate-x-0.5 rounded-full bg-secondary transition-transform duration-150 data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-accent-fg" />
    </SwitchPrimitive.Root>
  )
}
