'use client'

import { useRef } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'

interface Props {
  value: string
  onChange: (value: string) => void
  language?: string
  readOnly?: boolean
  height?: string
}

export function CodeEditor({ value, onChange, language = 'javascript', readOnly = false, height = '100%' }: Props) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor
    // Focus editor on mount
    editor.focus()
  }

  return (
    <Editor
      height={height}
      language={language === 'html' ? 'html' : language}
      value={value}
      theme="vs-dark"
      onChange={(val) => onChange(val ?? '')}
      onMount={handleMount}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        lineHeight: 22,
        fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", monospace',
        fontLigatures: true,
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 2,
        insertSpaces: true,
        automaticLayout: true,
        padding: { top: 16, bottom: 16 },
        scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        renderLineHighlight: 'gutter',
        bracketPairColorization: { enabled: true },
        suggest: { showKeywords: true },
        quickSuggestions: !readOnly,
      }}
      loading={
        <div className="flex h-full items-center justify-center bg-[#1e1e1e]">
          <div className="text-sm text-zinc-400">Loading editor…</div>
        </div>
      }
    />
  )
}
