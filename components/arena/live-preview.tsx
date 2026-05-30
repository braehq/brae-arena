'use client'

import { useEffect, useRef } from 'react'

interface Props {
  html: string
  className?: string
}

export function LivePreview({ html, className = '' }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const doc = iframe.contentDocument
    if (!doc) return

    // Write full HTML into the iframe — sandboxed (no scripts from outside)
    doc.open()
    doc.write(html)
    doc.close()
  }, [html])

  return (
    <iframe
      ref={iframeRef}
      title="Live Preview"
      sandbox="allow-scripts allow-same-origin"
      className={`w-full h-full border-0 bg-white ${className}`}
    />
  )
}
