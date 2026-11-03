import { loader, type Monaco } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/editor/editor.worker?worker'
import cssWorker from 'monaco-editor/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/language/html/html.worker?worker'
import jsonWorker from 'monaco-editor/language/json/json.worker?worker'
import tsWorker from 'monaco-editor/language/typescript/ts.worker?worker'

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === 'json') return new jsonWorker()
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
    if (label === 'typescript' || label === 'javascript') return new tsWorker()
    return new editorWorker()
  },
}

let configured = false
let themesDefined = false

export function ensureMonaco() {
  if (configured) return
  configured = true
  loader.config({ monaco })
}

export function definePatchpilotThemes(instance: Monaco) {
  if (themesDefined) return
  themesDefined = true
  instance.editor.defineTheme('patchpilot-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '667484' },
      { token: 'keyword', foreground: '8fb4f8' },
      { token: 'string', foreground: 'c5d4be' },
      { token: 'number', foreground: 'd4a054' },
    ],
    colors: {
      'editor.background': '#080e1a',
      'editor.foreground': '#e7eef8',
      'editorLineNumber.foreground': '#526278',
      'editorLineNumber.activeForeground': '#9aabc0',
      'editor.lineHighlightBackground': '#ffffff0a',
      'editor.selectionBackground': '#3ec0ff33',
      'editorCursor.foreground': '#e7eef8',
      'editorGutter.background': '#080e1a',
      'diffEditor.insertedTextBackground': '#3cba8b22',
      'diffEditor.removedTextBackground': '#e06a6a22',
      'diffEditor.insertedLineBackground': '#3cba8b12',
      'diffEditor.removedLineBackground': '#e06a6a12',
    },
  })
  instance.editor.defineTheme('patchpilot-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6b7c8d' },
      { token: 'keyword', foreground: '1d6fe3' },
      { token: 'string', foreground: '0d8a5f' },
      { token: 'number', foreground: '8d6410' },
    ],
    colors: {
      'editor.background': '#f7f8fa',
      'editor.foreground': '#141a21',
      'editorLineNumber.foreground': '#8b9aab',
      'editorLineNumber.activeForeground': '#4d5d6e',
      'editor.lineHighlightBackground': '#141a2108',
      'editor.selectionBackground': '#1d6fe322',
      'editorGutter.background': '#f7f8fa',
      'diffEditor.insertedTextBackground': '#0d8a5f18',
      'diffEditor.removedTextBackground': '#c23b3b18',
      'diffEditor.insertedLineBackground': '#0d8a5f10',
      'diffEditor.removedLineBackground': '#c23b3b10',
    },
  })
}

export function monacoLanguage(filename: string) {
  if (filename.endsWith('.py')) return 'python'
  if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return 'typescript'
  if (filename.endsWith('.js') || filename.endsWith('.jsx')) return 'javascript'
  if (filename.endsWith('.go')) return 'go'
  if (filename.endsWith('.java')) return 'java'
  if (filename.endsWith('.rs')) return 'rust'
  return 'plaintext'
}
