const ZONE = 'Asia/Kolkata'

export function formatClock(iso: string, timeZone = ZONE) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone,
  }).format(new Date(iso))
}

export function formatWhen(iso: string, timeZone = ZONE) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(new Date(iso))
}

export function formatDay(iso: string, timeZone = ZONE) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone,
  }).format(new Date(iso))
}

export function formatRelative(iso: string | null, now = Date.now()) {
  if (!iso) return 'Never'
  const delta = now - new Date(iso).getTime()
  const minutes = Math.round(delta / 60000)
  if (Math.abs(minutes) < 1) return 'Just now'
  if (Math.abs(minutes) < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export function formatDuration(ms: number | null) {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms}ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)
  return `${minutes}m ${rest}s`
}

export function elapsed(fromIso: string, to = Date.now()) {
  return formatDuration(Math.max(0, to - new Date(fromIso).getTime()))
}

export function shortSha(sha: string) {
  return sha.slice(0, 7)
}
