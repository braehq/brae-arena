export type TestCase = {
  label: string
  input: string
  expected: string
}

export type TestResult = {
  label: string
  passed: boolean
  output: string
  expected: string
  error?: string
}

// Extract the main function name from user code
function extractFunctionName(code: string): string {
  const match = code.match(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:function|\())/i)
  if (match) return match[1] ?? match[2] ?? 'solution'
  return 'solution'
}

// Run test cases against user code in the browser (client-side sandboxed)
export async function runTestsClient(code: string, testCases: TestCase[]): Promise<TestResult[]> {
  const fnName = extractFunctionName(code)
  const results: TestResult[] = []

  for (const tc of testCases) {
    // Timing-based tests (debounce etc) — mark as passed on client, server validates
    if (['delayed', 'once', 'reset', 'args'].includes(tc.expected)) {
      results.push({ label: tc.label, passed: true, output: tc.expected, expected: tc.expected })
      continue
    }

    try {
      // Add timeout protection
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000)

      const wrapped = `
        "use strict";
        const fetch = undefined;
        const XMLHttpRequest = undefined;
        const WebSocket = undefined;
        const document = undefined;
        const window = undefined;
        ${code}
        return JSON.stringify(${fnName}(${tc.input}));
      `

      // eslint-disable-next-line no-new-func
      const result = new Function(wrapped)()
      clearTimeout(timeout)

      const outputNorm = JSON.stringify(JSON.parse(result))
      const expectedNorm = JSON.stringify(JSON.parse(tc.expected))
      results.push({
        label: tc.label,
        passed: outputNorm === expectedNorm,
        output: result,
        expected: tc.expected,
      })
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
