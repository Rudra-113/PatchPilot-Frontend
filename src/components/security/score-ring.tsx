import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { toneForScore } from '@/lib/severity'
import { cn } from '@/lib/utils'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'

const toneStroke = {
  secure: 'var(--secure)',
  accent: 'var(--accent)',
  warning: 'var(--warning)',
  critical: 'var(--critical)',
}

export function ScoreRing({ score, size = 92, caption, center }: { score: number; size?: number; caption?: string; center?: ReactNode }) {
  const reduced = usePrefersReducedMotion()
  const stroke = size > 80 ? 5 : 4
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const shown = score > 0 ? score : 0
  const offset = circumference * (1 - shown / 100)
  const tone = score > 0 ? toneForScore(score) : 'accent'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--line-strong)" strokeWidth={stroke} />
        <circle
          className="pp-orbit"
          cx={size / 2}
          cy={size / 2}
          r={Math.max(4, radius - 9)}
          fill="none"
          stroke="var(--complement)"
          strokeOpacity={0.55}
          strokeWidth={1}
          strokeDasharray="1.5 5"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={toneStroke[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reduced ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduced ? 0 : 0.8, ease: [0.22, 1, 0.36, 1] }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {center ? (
        <span className="absolute inset-0 grid place-items-center">{center}</span>
      ) : caption ? (
        <span className={cn('absolute inset-0 grid place-items-center font-medium tabular', size > 80 ? 'text-[18px]' : 'text-[13px]')}>
          {score > 0 ? score : '—'}
        </span>
      ) : null}
    </div>
  )
}
