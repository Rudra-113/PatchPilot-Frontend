import { Link } from 'react-router'
import type { ActivityEvent } from '@/types/api'
import { formatClock } from '@/lib/format'
import { cn } from '@/lib/utils'

const tone: Record<ActivityEvent['tone'], string> = {
  info: 'bg-accent',
  warning: 'bg-warning',
  critical: 'bg-critical',
  secure: 'bg-secure',
  ai: 'bg-ai',
}

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (!events.length) {
    return <p className="px-4 py-6 text-[13px] text-secondary">No security activity yet.</p>
  }
  return (
    <ol>
      {events.map((event) => {
        const body = (
          <span className="flex items-start gap-2">
            <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', tone[event.tone])} />
            <span>{event.message}</span>
          </span>
        )
        return (
          <li key={event.id} className="grid grid-cols-[68px_minmax(0,1fr)] gap-3 border-t border-line px-4 py-2.5 first:border-t-0">
            <time className="pt-0.5 font-mono text-[11px] text-muted tabular" dateTime={event.at}>
              {formatClock(event.at)}
            </time>
            {event.href ? (
              <Link to={event.href} className="text-[13px] leading-5 text-foreground transition-colors hover:text-accent">
                {body}
              </Link>
            ) : (
              <p className="text-[13px] leading-5">{body}</p>
            )}
          </li>
        )
      })}
    </ol>
  )
}
