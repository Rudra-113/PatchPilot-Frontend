export function padSink(source: string, targetLine: number) {
  const lines = source.replace(/^\n/, '').replace(/\s+$/, '').split('\n')
  const index = lines.findIndex((line) => line.includes('@@SINK@@'))
  const pad = targetLine - (index + 1)
  if (index < 0 || pad <= 0) return lines.join('\n')
  const indent = lines[index].match(/^\s*/)?.[0] ?? ''
  const notes = [
    'The analyst console reads a single subscriber at a time.',
    'Region rides along so the client does not issue a second query.',
    'Plan names are owned by billing and are opaque to this handler.',
    'The connection dependency closes itself when the request ends.',
    'Authentication is enforced by require_analyst before this body runs.',
    'An empty result is a successful lookup, not an error.',
    'Callers pass the email exactly as the operator typed it.',
  ]
  const block = Array.from({ length: pad }, (_, noteIndex) => notes[noteIndex] ?? `Lookup contract note ${noteIndex + 1}.`)
  lines.splice(index, 0, ...block.map((note) => `${indent}# ${note}`))
  return lines.join('\n')
}

export function materialize(source: string) {
  const raw = source.replace(/^\n/, '').replace(/\s+$/, '')
  const lines = raw.split('\n')
  let start = -1
  let end = -1
  const clean = lines.map((line, index) => {
    let next = line
    if (next.includes('@@SINK@@')) {
      if (start === -1) start = index
      end = index
      next = next.replaceAll('@@SINK@@', '')
    }
    if (next.includes('@@END@@')) {
      end = index
      next = next.replaceAll('@@END@@', '')
    }
    return next
  })
  const line = (start === -1 ? 0 : start) + 1
  return {
    content: clean.join('\n'),
    line,
    endLine: (end === -1 ? line - 1 : end) + 1,
  }
}
