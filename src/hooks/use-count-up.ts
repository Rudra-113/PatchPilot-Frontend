import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'

export function useCountUp(target: number, duration = 700) {
  const reduced = usePrefersReducedMotion()
  const [value, setValue] = useState(reduced ? target : 0)

  useEffect(() => {
    if (reduced) {
      setValue(target)
      return
    }
    let frame = 0
    let start: number | null = null
    const step = (time: number) => {
      if (start === null) start = time
      const progress = Math.min(1, (time - start) / duration)
      const eased = 1 - (1 - progress) ** 3
      setValue(Math.round(target * eased))
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, duration, reduced])

  return value
}
