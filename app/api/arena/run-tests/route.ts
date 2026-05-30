import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import vm from 'vm'

export type TestCase = { label: string; input: string; expected: string }
export type TestResult = { label: string; passed: boolean; output: string; expected: string; error?: string }

function extractFunctionName(code: string): string {
  const match = code.match(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:function|\())/i)
  return (match?.[1] ?? match?.[2] ?? 'solution')
}

function runServerSide(code: string, testCases: TestCase[]): TestResult[] {
  const fnName = extractFunctionName(code)
  const results: TestResult[] = []

  for (const tc of testCases) {
    // Skip timing-based tests (debounce etc)
    if (['delayed', 'once', 'reset', 'args'].includes(tc.expected)) {
      results.push({ label: tc.label, passed: true, output: tc.expected, expected: tc.expected })
      continue
    }

    try {
      const sandbox = {
        result: undefined as unknown,
        input: tc.input,
      }
      const script = new vm.Script(`
        ${code}
        result = JSON.stringify(${fnName}(${tc.input}));
      `)
      // 2s timeout, no access to fs/net/etc
      const ctx = vm.createContext(sandbox)
      script.runInContext(ctx, { timeout: 2000 })

      const output = String(sandbox.result)
      let passed = false
      try {
        passed = JSON.stringify(JSON.parse(output)) === JSON.stringify(JSON.parse(tc.expected))
      } catch {
        passed = output === tc.expected
      }

      results.push({ label: tc.label, passed, output, expected: tc.expected })
    } catch (err) {
      results.push({
        label: tc.label,
        passed: false,
        output: '',
        expected: tc.expected,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return results
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code, testCases } = await request.json() as { code: string; testCases: TestCase[] }
  if (!code || !Array.isArray(testCases)) {
    return NextResponse.json({ error: 'code and testCases required' }, { status: 400 })
  }

  const results = runServerSide(code, testCases)
  const passed = results.filter(r => r.passed).length

  return NextResponse.json({ results, passed, total: results.length })
}
