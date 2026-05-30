'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Play, ChevronDown, ChevronRight, Loader2, RefreshCw } from 'lucide-react'
import { CodeEditor } from '@/components/arena/code-editor'

interface TestCase { label: string; input: string; expected: string }
interface TestResult { label: string; passed: boolean; output: string; expected: string; error?: string }

interface Challenge {
  id: string
  slug: string
  title: string
  challenge_type: string
  difficulty: string
  mode: string
  starter_code: string | null
  test_cases: TestCase[] | null
  language: string
}

interface Props { challenges: Challenge[] }

const DIFF_COLORS: Record<string, string> = {
  easy: 'text-green-400 border-green-500/30 bg-green-500/10',
  medium: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  hard: 'text-red-400 border-red-500/30 bg-red-500/10',
  extreme: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
}

const TYPE_ICONS: Record<string, string> = {
  code_duel: '⚡',
  bug_hunt_code: '🐛',
  css_battle: '🎨',
  url_submit: '🚀',
}

function ChallengeRow({ challenge }: { challenge: Challenge }) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState(challenge.starter_code ?? '')
  const [results, setResults] = useState<TestResult[]>([])
  const [running, setRunning] = useState(false)
  const [ran, setRan] = useState(false)

  const testCases = challenge.test_cases ?? []
  const passed = results.filter(r => r.passed).length
  const total = testCases.length
  const allPassed = ran && passed === total && total > 0

  async function runTests() {
    setRunning(true)
    setRan(false)
    try {
      const res = await fetch('/api/arena/run-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, testCases }),
      })
      const data = await res.json()
      setResults(data.results ?? [])
      setRan(true)
    } catch (e) {
      console.error(e)
    }
    setRunning(false)
  }

  function resetCode() {
    setCode(challenge.starter_code ?? '')
    setResults([])
    setRan(false)
  }

  return (
    <div className={`rounded-xl border overflow-hidden transition-colors ${
      allPassed ? 'border-green-500/30' : ran && passed < total ? 'border-red-500/20' : 'border-border'
    }`}>
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-secondary/20 text-left transition-colors"
      >
        <span className="text-muted-foreground">{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
        <span className="text-base">{TYPE_ICONS[challenge.challenge_type]}</span>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-foreground">{challenge.title}</span>
          <span className="ml-2 text-xs text-muted-foreground font-mono">{challenge.slug}</span>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${DIFF_COLORS[challenge.difficulty] ?? ''}`}>
          {challenge.difficulty}
        </span>
        {ran ? (
          <span className={`shrink-0 text-sm font-semibold ${allPassed ? 'text-green-400' : 'text-red-400'}`}>
            {passed}/{total}
          </span>
        ) : (
          <span className="shrink-0 text-xs text-muted-foreground">{total} tests</span>
        )}
        {allPassed && <CheckCircle className="shrink-0 h-5 w-5 text-green-400" />}
        {ran && !allPassed && <XCircle className="shrink-0 h-5 w-5 text-red-400" />}
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-border">
          <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">

            {/* Left — editor */}
            <div className="flex flex-col" style={{ minHeight: 360 }}>
              <div className="flex items-center justify-between px-3 py-2 bg-[#1e1e1e] border-b border-zinc-700">
                <span className="text-xs text-zinc-400 font-mono">
                  {challenge.language === 'html' ? 'index.html' : `solution.${challenge.language ?? 'js'}`}
                </span>
                <div className="flex gap-2">
                  <button onClick={resetCode} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                    <RefreshCw className="h-3 w-3" /> Reset
                  </button>
                </div>
              </div>
              <div className="flex-1" style={{ minHeight: 300 }}>
                <CodeEditor
                  value={code}
                  onChange={setCode}
                  language={challenge.language ?? 'javascript'}
                  height="300px"
                />
              </div>
              <div className="flex items-center gap-3 p-3 bg-card border-t border-border">
                <button
                  onClick={runTests}
                  disabled={running || testCases.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Run {total} Tests
                </button>
                {ran && (
                  <span className={`text-sm font-semibold ${allPassed ? 'text-green-400' : 'text-red-400'}`}>
                    {passed}/{total} passing
                  </span>
                )}
              </div>
            </div>

            {/* Right — test cases + results */}
            <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
              <div className="p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Test Cases</p>
                <div className="space-y-2">
                  {testCases.map((tc, i) => {
                    const result = results[i]
                    return (
                      <div key={i} className={`rounded-lg border px-3 py-2.5 text-xs ${
                        !result ? 'border-border bg-secondary/20' :
                        result.passed ? 'border-green-500/30 bg-green-500/5' :
                        'border-red-500/30 bg-red-500/5'
                      }`}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          {result ? (
                            result.passed
                              ? <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />
                              : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                          ) : (
                            <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40 shrink-0" />
                          )}
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
                              <code className="text-red-400 truncate">
                                {result.error ?? (result.output || 'undefined')}
                              </code>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {testCases.length === 0 && (
                    <p className="text-sm text-muted-foreground">No test cases (CSS Battle — scored on speed).</p>
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

export function ChallengeTestLab({ challenges }: Props) {
  const [filter, setFilter] = useState<'all' | 'code_duel' | 'bug_hunt_code'>('all')

  const filtered = challenges.filter(c => filter === 'all' || c.challenge_type === filter)
  const codeDuel = challenges.filter(c => c.challenge_type === 'code_duel')
  const bugHunt = challenges.filter(c => c.challenge_type === 'bug_hunt_code')

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {([
          { key: 'all', label: `All (${challenges.length})` },
          { key: 'code_duel', label: `⚡ Code Duel (${codeDuel.length})` },
          { key: 'bug_hunt_code', label: `🐛 Bug Hunt (${bugHunt.length})` },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === key
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tip */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-300">
        <strong>How to use:</strong> Expand a challenge, write a correct solution in the editor, hit Run Tests.
        All tests should pass. For Bug Hunt challenges, the starter code should fail — fix the bugs, then all tests pass.
      </div>

      {/* Challenge rows */}
      <div className="space-y-2">
        {filtered.map(c => (
          <ChallengeRow key={c.id} challenge={c} />
        ))}
      </div>
    </div>
  )
}
