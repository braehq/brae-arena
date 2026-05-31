// CSS Battle test runner — evaluates DOM assertions against the player's
// rendered HTML using a same-origin srcdoc iframe.
// test case format: { label, input: "JS expression", expected: "\"true\"" }

export type CssTestCase = { label: string; input: string; expected: string }
export type CssTestResult = { label: string; passed: boolean; output: string; expected: string; error?: string }

export function runCssBattleTests(html: string, testCases: CssTestCase[]): Promise<CssTestResult[]> {
  return new Promise((resolve) => {
    if (testCases.length === 0) { resolve([]); return }

    // Create a hidden iframe with the player's HTML
    const iframe = document.createElement('iframe')
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin')
    iframe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:800px;height:600px;visibility:hidden;pointer-events:none'
    iframe.srcdoc = html
    document.body.appendChild(iframe)

    const cleanup = () => { try { document.body.removeChild(iframe) } catch {} }

    const timeout = setTimeout(() => {
      cleanup()
      resolve(testCases.map(tc => ({ label: tc.label, passed: false, output: '', expected: tc.expected, error: 'Timeout' })))
    }, 4000)

    iframe.onload = () => {
      clearTimeout(timeout)
      const results: CssTestResult[] = []

      for (const tc of testCases) {
        try {
          const win = iframe.contentWindow
          if (!win) { results.push({ label: tc.label, passed: false, output: '', expected: tc.expected, error: 'No iframe window' }); continue }
          // eslint-disable-next-line no-new-func
          const fn = new Function(`with(this) { return JSON.stringify(Boolean(${tc.input})); }`)
          const output = fn.call(win)
          const passed = output === tc.expected
          results.push({ label: tc.label, passed, output, expected: tc.expected })
        } catch (err) {
          results.push({ label: tc.label, passed: false, output: '', expected: tc.expected, error: String(err) })
        }
      }

      cleanup()
      resolve(results)
    }

    iframe.onerror = () => {
      clearTimeout(timeout)
      cleanup()
      resolve(testCases.map(tc => ({ label: tc.label, passed: false, output: '', expected: tc.expected, error: 'Iframe load error' })))
    }
  })
}
