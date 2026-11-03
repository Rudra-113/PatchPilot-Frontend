import { Check, Copy, ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import * as monaco from 'monaco-editor'
import { toast } from 'sonner'
import { Frame } from '@/components/layout/frame'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/context/theme'
import { definePatchpilotThemes, ensureMonaco, monacoLanguage } from '@/lib/monaco'
import { copyText } from '@/lib/utils'

ensureMonaco()

function releaseEditor(editor: { setModel: (model: null) => void; dispose: () => void } | undefined, models: Array<{ dispose: () => void } | undefined>) {
  editor?.setModel(null)
  editor?.dispose()
  for (const model of models) model?.dispose()
}

const options = {
  readOnly: true,
  minimap: { enabled: false },
  fontSize: 13,
  fontFamily: '"JetBrains Mono Variable", ui-monospace, monospace',
  fontLigatures: false,
  scrollBeyondLastLine: false,
  renderLineHighlight: 'line' as const,
  padding: { top: 12, bottom: 12 },
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
  guides: { indentation: false },
  stickyScroll: { enabled: false },
  automaticLayout: true,
}

export function CodeViewer({
  filename,
  code,
  vulnerableLines = [],
  fixedLines = [],
}: {
  filename: string
  code: string
  vulnerableLines?: number[]
  fixedLines?: number[]
}) {
  const { theme } = useTheme()
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const host = useRef<HTMLDivElement>(null)
  const height = expanded ? 640 : 380
  const themeName = theme === 'light' ? 'patchpilot-light' : 'patchpilot-dark'
  const sinkKey = vulnerableLines.join(',')
  const fixKey = fixedLines.join(',')

  useEffect(() => {
    const node = host.current
    if (!node) return
    definePatchpilotThemes(monaco)
    const model = monaco.editor.createModel(code, monacoLanguage(filename))
    const editor = monaco.editor.create(node, { ...options, model, theme: themeName })
    const marks = [
      ...vulnerableLines.map((line) => ({ line, kind: 'sink' as const })),
      ...fixedLines.map((line) => ({ line, kind: 'fix' as const })),
    ]
    editor.createDecorationsCollection(
      marks.map(({ line, kind }) => ({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: kind === 'sink' ? 'pp-sink-line' : 'pp-fix-line',
          marginClassName: kind === 'sink' ? 'pp-sink-margin' : 'pp-fix-margin',
        },
      })),
    )
    const focus = vulnerableLines[0] ?? fixedLines[0]
    if (focus) editor.revealLineInCenter(focus)
    return () => releaseEditor(editor, [model])
    // Line lists are read through sinkKey and fixKey so a new array identity does not rebuild the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, filename, themeName, sinkKey, fixKey])

  const copy = async () => {
    await copyText(code)
    setCopied(true)
    toast.success('Copied source')
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <Frame className="overflow-hidden rounded-lg border border-line bg-inset">
      <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
        <div className="min-w-0">
          <p className="truncate font-mono text-[12px] text-foreground">{filename}</p>
          <p className="text-[11px] text-muted">
            {vulnerableLines.length ? `Vulnerable line ${vulnerableLines[0]}${vulnerableLines.length > 1 ? `–${vulnerableLines.at(-1)}` : ''}` : 'Source'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={copy}>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setExpanded((value) => !value)}>
            {expanded ? <ChevronsDownUp className="size-3.5" /> : <ChevronsUpDown className="size-3.5" />}
            {expanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </div>
      <div ref={host} style={{ height }} />
    </Frame>
  )
}

export function DiffView({ filename, before, after }: { filename: string; before: string; after: string }) {
  const { theme } = useTheme()
  const [expanded, setExpanded] = useState(false)
  const host = useRef<HTMLDivElement>(null)
  const themeName = theme === 'light' ? 'patchpilot-light' : 'patchpilot-dark'

  useEffect(() => {
    const node = host.current
    if (!node) return
    definePatchpilotThemes(monaco)
    const language = monacoLanguage(filename)
    const original = monaco.editor.createModel(before, language)
    const modified = monaco.editor.createModel(after, language)
    const media = window.matchMedia('(min-width: 1024px)')
    const editor = monaco.editor.createDiffEditor(node, {
      ...options,
      automaticLayout: true,
      renderSideBySide: media.matches,
      originalEditable: false,
      theme: themeName,
    })
    editor.setModel({ original, modified })
    const onMedia = () => editor.updateOptions({ renderSideBySide: media.matches })
    media.addEventListener('change', onMedia)
    return () => {
      media.removeEventListener('change', onMedia)
      releaseEditor(editor, [original, modified])
    }
  }, [before, after, filename, themeName])

  return (
    <Frame className="overflow-hidden rounded-lg border border-line bg-inset">
      <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
        <div>
          <p className="font-mono text-[12px]">{filename}</p>
          <p className="text-[11px] text-muted">
            <span className="text-critical">Removed</span>
            <span className="px-1.5 text-muted">/</span>
            <span className="text-secure">Added</span>
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Collapse' : 'Expand'}
        </Button>
      </div>
      <div ref={host} style={{ height: expanded ? 680 : 440 }} />
    </Frame>
  )
}
