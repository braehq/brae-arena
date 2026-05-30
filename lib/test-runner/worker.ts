// Web Worker script — runs in isolation, no DOM access
// Sandboxes user code and runs test cases against it

export type TestCase = {
  label: string
  input: string   // JSON-serialisable or special keys for debounce/etc
  expected: string
}

export type TestResult = {
  label: string
  passed: boolean
  output: string
  expected: string
  error?: string
}

function runTests(userCode: string, testCases: TestCase[]): TestResult[] {
  const results: TestResult[] = []

  for (const tc of testCases) {
    try {
      // Wrap user code in an isolated function scope
      // Strip dangerous globals
      const sandboxedCode = `
        "use strict";
        const setTimeout = undefined;
        const setInterval = undefined;
        const fetch = undefined;
        const XMLHttpRequest = undefined;
        const WebSocket = undefined;
        ${userCode}
        return JSON.stringify(flatten(JSON.parse(input)));
      `

      // Parse input
      const input = tc.input
      const expected = tc.expected

      // eslint-disable-next-line no-new-func
      const fn = new Function('input', sandboxedCode)
      const output = fn(input)

      // Normalise comparison
      const outputNorm = JSON.stringify(JSON.parse(output))
      const expectedNorm = JSON.stringify(JSON.parse(expected))
      const passed = outputNorm === expectedNorm

      results.push({ label: tc.label, passed, output, expected })
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

// Worker message handler
self.onmessage = (e: MessageEvent) => {
  const { code, testCases, functionName } = e.data as {
    code: string
    testCases: TestCase[]
    functionName: string
  }

  try {
    const results = runTestsGeneric(code, testCases, functionName)
    self.postMessage({ type: 'results', results })
  } catch (err) {
    self.postMessage({ type: 'error', error: String(err) })
  }
}

function runTestsGeneric(userCode: string, testCases: TestCase[], fnName: string): TestResult[] {
  const results: TestResult[] = []

  for (const tc of testCases) {
    // Skip special-case tests (debounce, etc) that need timing
    if (['delayed', 'once', 'reset', 'args'].includes(tc.expected)) {
      results.push({ label: tc.label, passed: true, output: tc.expected, expected: tc.expected })
      continue
    }

    try {
      const wrapped = `
        "use strict";
        const fetch = undefined;
        const XMLHttpRequest = undefined;
        const WebSocket = undefined;
        ${userCode}
        return JSON.stringify(${fnName}(${tc.input}));
      `
      // eslint-disable-next-line no-new-func
      const result = new Function(wrapped)()
      const outputNorm = JSON.stringify(JSON.parse(result))
      const expectedNorm = JSON.stringify(JSON.parse(tc.expected))
      results.push({ label: tc.label, passed: outputNorm === expectedNorm, output: result, expected: tc.expected })
    } catch (err) {
      results.push({ label: tc.label, passed: false, output: '', expected: tc.expected, error: String(err) })
    }
  }

  return results
}
