import { ChevronDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export function SelectMenu({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}) {
  const current = options.find((option) => option.value === value)?.label ?? 'Any'
  return (
    <Popover>
      <PopoverTrigger className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-inset px-2.5 text-[12px] text-secondary transition-colors hover:border-line-strong">
        <span className="text-muted">{label}</span>
        <span className="text-foreground">{current}</span>
        <ChevronDown className="size-3.5 text-muted" />
      </PopoverTrigger>
      <PopoverContent className="max-h-64 overflow-auto">
        {options.map((option) => (
          <button
            key={option.value || 'any'}
            type="button"
            role="option"
            aria-selected={option.value === value}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex w-full rounded-sm px-2 py-1.5 text-left text-[13px] hover:bg-foreground/6',
              option.value === value ? 'text-foreground' : 'text-secondary',
            )}
          >
            {option.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
