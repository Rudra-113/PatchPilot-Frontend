interface DiffLine {
  type: ' ' | '-' | '+'
  line: string
}

function lineDiff(before: string[], after: string[]): DiffLine[] {
  const m = before.length
  const n = after.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      dp[i][j] =
        before[i] === after[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (before[i] === after[j]) {
      out.push({ type: ' ', line: before[i] })
      i += 1
      j += 1
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: '-', line: before[i] })
      i += 1
    } else {
      out.push({ type: '+', line: after[j] })
      j += 1
    }
  }
  while (i < m) {
    out.push({ type: '-', line: before[i] })
    i += 1
  }
  while (j < n) {
    out.push({ type: '+', line: after[j] })
    j += 1
  }
  return out
}

export function countChanges(before: string, after: string) {
  const diff = lineDiff(before.split('\n'), after.split('\n'))
  return {
    additions: diff.filter((line) => line.type === '+').length,
    deletions: diff.filter((line) => line.type === '-').length,
  }
}

export function unifiedDiff(filename: string, before: string, after: string) {
  const a = before.split('\n')
  const b = after.split('\n')
  const diff = lineDiff(a, b)
  const body = diff.map((line) => `${line.type}${line.line}`).join('\n')
  return [`--- a/${filename}`, `+++ b/${filename}`, `@@ -1,${a.length} +1,${b.length} @@`, body, ''].join(
    '\n',
  )
}
