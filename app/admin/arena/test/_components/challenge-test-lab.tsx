'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { CheckCircle, XCircle, Play, ChevronDown, ChevronRight, Loader2, RefreshCw } from 'lucide-react'
import { CodeEditor } from '@/components/arena/code-editor'
import { runCssBattleTests, type CssTestCase } from '@/lib/css-battle-runner'
import { runRegexTests, REGEX_FLAGS, type RegexFlag, type RegexCorpusItem } from '@/lib/regex-duel-runner'

interface TestCase { label: string; input: string; expected: string }
interface TestResult { label: string; passed: boolean; output: string; expected: string; error?: string }

interface Challenge {
  id: string
  slug: string
  title: string
  description: string | null
  challenge_type: string
  difficulty: string
  mode: string
  starter_code: string | null
  solution_code: string | null
  test_cases: TestCase[] | null
  language: string
  target_image_url: string | null
}

interface Props { challenges: Challenge[] }

const DIFF_COLORS: Record<string, string> = {
  easy: 'text-green-400 border-green-500/30 bg-green-500/10',
  medium: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  hard: 'text-red-400 border-red-500/30 bg-red-500/10',
  extreme: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
}

// ─── Code Duel / Bug Hunt row (server-side test runner) ───────────────────────

function ChallengeRow({ challenge }: { challenge: Challenge }) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState(challenge.starter_code ?? '')
  const [results, setResults] = useState<TestResult[]>([])
  const [running, setRunning] = useState(false)
  const [ran, setRan] = useState(false)
  const [authError, setAuthError] = useState(false)

  const testCases = challenge.test_cases ?? []
  const passed = results.filter(r => r.passed).length
  const total = testCases.length
  const allPassed = ran && passed === total && total > 0

  async function runTests() {
    setRunning(true)
    setRan(false)
    setAuthError(false)
    try {
      const res = await fetch('/api/arena/run-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, testCases }),
      })
      if (res.status === 401) { setAuthError(true); setRunning(false); return }
      const data = await res.json()
      setResults(data.results ?? [])
      setRan(true)
    } catch (e) { console.error(e) }
    setRunning(false)
  }

  const icon = challenge.challenge_type === 'bug_hunt_code' ? '🐛' : '⚡'

  return (
    <div className={`rounded-xl border overflow-hidden transition-colors ${
      allPassed ? 'border-green-500/30' : ran && passed < total ? 'border-red-500/20' : 'border-border'
    }`}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-secondary/20 text-left transition-colors">
        <span className="text-muted-foreground">{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
        <span className="text-base">{icon}</span>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-foreground">{challenge.title}</span>
          <span className="ml-2 text-xs text-muted-foreground font-mono">{challenge.slug}</span>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${DIFF_COLORS[challenge.difficulty] ?? ''}`}>
          {challenge.difficulty}
        </span>
        {ran ? (
          <span className={`shrink-0 text-sm font-semibold ${allPassed ? 'text-green-400' : 'text-red-400'}`}>{passed}/{total}</span>
        ) : (
          <span className="shrink-0 text-xs text-muted-foreground">{total} tests</span>
        )}
        {allPassed && <CheckCircle className="shrink-0 h-5 w-5 text-green-400" />}
        {ran && !allPassed && <XCircle className="shrink-0 h-5 w-5 text-red-400" />}
      </button>

      {open && (
        <div className="border-t border-border">
          <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
            <div className="flex flex-col" style={{ minHeight: 360 }}>
              <div className="flex items-center justify-between px-3 py-2 bg-[#1e1e1e] border-b border-zinc-700">
                <span className="text-xs text-zinc-400 font-mono">
                  {challenge.language === 'html' ? 'index.html' : `solution.${challenge.language ?? 'js'}`}
                </span>
                <button onClick={() => { setCode(challenge.starter_code ?? ''); setResults([]); setRan(false); setAuthError(false) }}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                  <RefreshCw className="h-3 w-3" /> Reset
                </button>
              </div>
              <div className="flex-1" style={{ minHeight: 300 }}>
                <CodeEditor value={code} onChange={setCode} language={challenge.language ?? 'javascript'} height="300px" />
              </div>
              <div className="flex items-center gap-3 p-3 bg-card border-t border-border">
                <button onClick={runTests} disabled={running || testCases.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Run {total} Tests
                </button>
                {authError && (
                  <span className="text-sm text-amber-400">⚠️ Session expired — <a href="/login" className="underline">sign in</a></span>
                )}
                {ran && !authError && (
                  <span className={`text-sm font-semibold ${allPassed ? 'text-green-400' : 'text-red-400'}`}>{passed}/{total} passing</span>
                )}
              </div>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
              <div className="p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Test Cases</p>
                <div className="space-y-2">
                  {testCases.map((tc, i) => {
                    const result = results[i]
                    return (
                      <div key={i} className={`rounded-lg border px-3 py-2.5 text-xs ${
                        !result ? 'border-border bg-secondary/20' :
                        result.passed ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
                      }`}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          {result ? (
                            result.passed ? <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                          ) : <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40 shrink-0" />}
                          <span className="font-medium text-foreground">{tc.label}</span>
                        </div>
                        <div className="space-y-0.5 pl-5">
                          <div className="flex gap-2">
                            <span className="text-muted-foreground w-14 shrink-0">input:</span>
                            <code className="text-blue-400 truncate">{tc.input}</code>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-muted-foreground w-14 shrink-0">expected:</span>
                            <code className="text-green-400 truncate">{tc.expected}</code>
                          </div>
                          {result && !result.passed && (
                            <div className="flex gap-2">
                              <span className="text-muted-foreground w-14 shrink-0">got:</span>
                              <code className="text-red-400 truncate">{result.error ?? (result.output || 'undefined')}</code>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {testCases.length === 0 && (
                    <p className="text-sm text-muted-foreground">No test cases.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CSS Golf row (client-side DOM checks + live preview) ─────────────────────

function CssGolfRow({ challenge }: { challenge: Challenge }) {
  const [open, setOpen] = useState(false)
  const [html, setHtml] = useState(challenge.starter_code ?? '')
  const [liveHtml, setLiveHtml] = useState(challenge.starter_code ?? '')
  const [results, setResults] = useState<Array<{ label: string; passed: boolean }>>([])
  const [running, setRunning] = useState(false)
  const [ran, setRan] = useState(false)

  const testCases = (challenge.test_cases ?? []) as CssTestCase[]
  const parLength = typeof challenge.solution_code === 'string' ? challenge.solution_code.length : null
  const passed = results.filter(r => r.passed).length
  const total = testCases.length
  const allPassed = ran && passed === total && total > 0
  const charCount = html.length

  async function runTests() {
    setRunning(true)
    setLiveHtml(html)
    const res = await runCssBattleTests(html, testCases)
    setResults(res.map(r => ({ label: r.label, passed: r.passed })))
    setRan(true)
    setRunning(false)
  }

  function reset() {
    setHtml(challenge.starter_code ?? '')
    setLiveHtml(challenge.starter_code ?? '')
    setResults([])
    setRan(false)
  }

  return (
    <div className={`rounded-xl border overflow-hidden transition-colors ${
      allPassed ? 'border-green-500/30' : ran && passed < total ? 'border-red-500/20' : 'border-border'
    }`}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-secondary/20 text-left transition-colors">
        <span className="text-muted-foreground">{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
        <span className="text-base">🏌️</span>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-foreground">{challenge.title}</span>
          <span className="ml-2 text-xs text-muted-foreground font-mono">{challenge.slug}</span>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${DIFF_COLORS[challenge.difficulty] ?? ''}`}>
          {challenge.difficulty}
        </span>
        {parLength !== null && (
          <span className="shrink-0 text-xs text-muted-foreground font-mono">par {parLength}</span>
        )}
        {ran ? (
          <span className={`shrink-0 text-sm font-semibold ${allPassed ? 'text-green-400' : 'text-red-400'}`}>{passed}/{total}</span>
        ) : (
          <span className="shrink-0 text-xs text-muted-foreground">{total} checks</span>
        )}
        {allPassed && <CheckCircle className="shrink-0 h-5 w-5 text-green-400" />}
        {ran && !allPassed && <XCircle className="shrink-0 h-5 w-5 text-red-400" />}
      </button>

      {open && (
        <div className="border-t border-border">
          <div className="grid lg:grid-cols-[1fr_420px] divide-y lg:divide-y-0 lg:divide-x divide-border">

            {/* Left — editor */}
            <div className="flex flex-col" style={{ minHeight: 380 }}>
              <div className="flex items-center justify-between px-3 py-2 bg-[#1e1e1e] border-b border-zinc-700">
                <span className="text-xs text-zinc-400 font-mono">index.html</span>
                <button onClick={reset} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                  <RefreshCw className="h-3 w-3" /> Reset
                </button>
              </div>
              <div className="flex-1" style={{ minHeight: 300 }}>
                <CodeEditor value={html} onChange={setHtml} language="html" height="300px" />
              </div>
              <div className="flex items-center gap-3 p-3 bg-card border-t border-border flex-wrap">
                <button onClick={runTests} disabled={running}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Run DOM Checks
                </button>
                <span className="text-xs text-muted-foreground font-mono">
                  {charCount} chars
                  {parLength !== null && (
                    <span className={charCount <= parLength ? ' text-green-400' : ' text-amber-400'}>
                      {' '}(par {parLength}{charCount <= parLength ? ' ✓' : ` — +${charCount - parLength}`})
                    </span>
                  )}
                </span>
                {ran && (
                  <span className={`ml-auto text-sm font-semibold ${allPassed ? 'text-green-400' : 'text-red-400'}`}>
                    {passed}/{total} passing
                  </span>
                )}
              </div>
            </div>

            {/* Right — target + render + DOM check results */}
            <div className="flex flex-col divide-y divide-border">

              {/* Previews side by side (scaled to fit) */}
              <div className="flex items-start gap-4 p-4 flex-wrap">
                {challenge.target_image_url && (
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground mb-1.5">Target</p>
                    <Image
                      src={challenge.target_image_url}
                      alt="Target"
                      width={200}
                      height={150}
                      className="rounded border border-border"
                    />
                  </div>
                )}
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground mb-1.5">Your render</p>
                  <div className="rounded border border-border overflow-hidden" style={{ width: 200, height: 150 }}>
                    <iframe
                      srcDoc={liveHtml}
                      sandbox="allow-scripts allow-same-origin"
                      title="Live render"
                      style={{ width: 400, height: 300, border: 0, transformOrigin: 'top left', transform: 'scale(0.5)' }}
                    />
                  </div>
                </div>
              </div>

              {/* DOM check list */}
              <div className="overflow-y-auto p-3" style={{ maxHeight: 200 }}>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">DOM Checks</p>
                <div className="space-y-1.5">
                  {testCases.map((tc, i) => {
                    const result = results[i]
                    return (
                      <div key={i} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                        !result ? 'border-border bg-secondary/20' :
                        result.passed ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
                      }`}>
                        {result ? (
                          result.passed ? <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                        ) : <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40 shrink-0" />}
                        <span className="font-medium text-foreground">{tc.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Regex Duel row (live client-side evaluation) ─────────────────────────────

function RegexDuelRow({ challenge }: { challenge: Challenge }) {
  const [open, setOpen] = useState(false)
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState<Set<RegexFlag>>(new Set())

  const corpus = useMemo(() => (challenge.test_cases ?? []) as RegexCorpusItem[], [challenge.test_cases])
  const flagStr = REGEX_FLAGS.filter(f => flags.has(f)).join('')
  const run = useMemo(() => runRegexTests(pattern, flagStr, corpus), [pattern, flagStr, corpus])

  const matchItems = corpus.filter(c => c.expected === 'match')
  const rejectItems = corpus.filter(c => c.expected === 'reject')
  const hasPattern = pattern.length > 0
  const allPassed = hasPattern && run.total > 0 && run.passed === run.total

  function toggleFlag(f: RegexFlag) {
    setFlags(prev => { const next = new Set(prev); if (next.has(f)) next.delete(f); else next.add(f); return next })
  }

  return (
    <div className={`rounded-xl border overflow-hidden transition-colors ${
      allPassed ? 'border-green-500/30' : hasPattern && run.total > 0 ? 'border-red-500/20' : 'border-border'
    }`}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-secondary/20 text-left transition-colors">
        <span className="text-muted-foreground">{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
        <span className="text-base">🔍</span>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-foreground">{challenge.title}</span>
          <span className="ml-2 text-xs text-muted-foreground font-mono">{challenge.slug}</span>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${DIFF_COLORS[challenge.difficulty] ?? ''}`}>
          {challenge.difficulty}
        </span>
        {hasPattern ? (
          <span className={`shrink-0 text-sm font-semibold ${allPassed ? 'text-green-400' : 'text-red-400'}`}>{run.passed}/{run.total}</span>
        ) : (
          <span className="shrink-0 text-xs text-muted-foreground">{corpus.length} items</span>
        )}
        {allPassed && <CheckCircle className="shrink-0 h-5 w-5 text-green-400" />}
        {hasPattern && !allPassed && run.total > 0 && <XCircle className="shrink-0 h-5 w-5 text-red-400" />}
      </button>

      {open && (
        <div className="border-t border-border">
          <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">

            {/* Left — description + pattern input */}
            <div className="p-4 space-y-4">
              {challenge.description && (
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{challenge.description}</p>
              )}

              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Pattern (live evaluation)</label>
                <div className="flex items-center gap-1 rounded-lg border border-border bg-[#1e1e1e] px-3 py-2 font-mono text-sm">
                  <span className="text-zinc-500 shrink-0">/</span>
                  <input
                    value={pattern}
                    onChange={e => setPattern(e.target.value)}
                    placeholder="your regex here"
                    className="flex-1 bg-transparent text-foreground outline-none placeholder:text-zinc-600 min-w-0"
                    spellCheck={false}
                    autoComplete="off"
                  />
                  <span className="text-zinc-500 shrink-0">/{flagStr}</span>
                </div>
                {hasPattern && run.error && (
                  <p className="mt-1 text-xs text-red-400">{run.error}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Flags:</span>
                {REGEX_FLAGS.map(f => (
                  <button key={f} onClick={() => toggleFlag(f)}
                    className={`rounded px-2 py-0.5 text-xs font-mono border transition-colors ${
                      flags.has(f) ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
                    }`}>
                    {f}
                  </button>
                ))}
              </div>

              {hasPattern && !run.error && (
                <p className={`text-sm font-semibold ${allPassed ? 'text-green-400' : 'text-red-400'}`}>
                  {run.passed}/{run.total} passing
                </p>
              )}
            </div>

            {/* Right — corpus */}
            <div className="p-4 overflow-y-auto" style={{ maxHeight: 400 }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-green-400 mb-2">MATCH ({matchItems.length})</p>
                  <div className="space-y-1">
                    {matchItems.map((item, i) => {
                      const r = run.results.find(res => res.input === item.input && res.expected === 'match')
                      return (
                        <div key={i} className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-mono ${
                          hasPattern && r ? (r.passed ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300') : 'text-foreground'
                        }`}>
                          {hasPattern && r && (r.passed ? <CheckCircle className="h-3 w-3 shrink-0" /> : <XCircle className="h-3 w-3 shrink-0" />)}
                          <span className="truncate">{item.input}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-400 mb-2">REJECT ({rejectItems.length})</p>
                  <div className="space-y-1">
                    {rejectItems.map((item, i) => {
                      const r = run.results.find(res => res.input === item.input && res.expected === 'reject')
                      return (
                        <div key={i} className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-mono ${
                          hasPattern && r ? (r.passed ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300') : 'text-foreground'
                        }`}>
                          {hasPattern && r && (r.passed ? <CheckCircle className="h-3 w-3 shrink-0" /> : <XCircle className="h-3 w-3 shrink-0" />)}
                          <span className="truncate">{item.input}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main lab ─────────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'code_duel' | 'bug_hunt_code' | 'css_golf' | 'regex_duel'

export function ChallengeTestLab({ challenges }: Props) {
  const [filter, setFilter] = useState<FilterKey>('all')

  const counts = {
    code_duel: challenges.filter(c => c.challenge_type === 'code_duel').length,
    bug_hunt_code: challenges.filter(c => c.challenge_type === 'bug_hunt_code').length,
    css_golf: challenges.filter(c => c.challenge_type === 'css_golf').length,
    regex_duel: challenges.filter(c => c.challenge_type === 'regex_duel').length,
  }
  const filtered = challenges.filter(c => filter === 'all' || c.challenge_type === filter)

  const tabs: Array<{ key: FilterKey; label: string }> = [
    { key: 'all', label: `All (${challenges.length})` },
    { key: 'code_duel', label: `⚡ Code Duel (${counts.code_duel})` },
    { key: 'bug_hunt_code', label: `🐛 Bug Hunt (${counts.bug_hunt_code})` },
    { key: 'css_golf', label: `🏌️ CSS Golf (${counts.css_golf})` },
    { key: 'regex_duel', label: `🔍 Regex Duel (${counts.regex_duel})` },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === key
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-300">
        <strong>How to use:</strong> Code Duel / Bug Hunt — write a solution, hit Run Tests (server-side).
        CSS Golf — write HTML, hit Run DOM Checks (client-side iframe), watch char count vs par.
        Regex Duel — type a pattern; results update live.
      </div>

      <div className="space-y-2">
        {filtered.map(c => {
          if (c.challenge_type === 'css_golf') return <CssGolfRow key={c.id} challenge={c} />
          if (c.challenge_type === 'regex_duel') return <RegexDuelRow key={c.id} challenge={c} />
          return <ChallengeRow key={c.id} challenge={c} />
        })}
      </div>
    </div>
  )
}
