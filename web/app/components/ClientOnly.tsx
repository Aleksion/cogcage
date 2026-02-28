import { useState, useEffect, type ReactNode } from 'react'

/**
 * Renders children only on the client after hydration.
 * Replaces Astro's `client:only="react"` pattern — prevents SSR of
 * components that use browser APIs (window, document, localStorage, WebSocket, WebGL).
 */
export function ClientOnly({
  children,
  fallback,
}: {
  children: () => ReactNode
  fallback?: ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted ? <>{children()}</> : <>{fallback ?? null}</>
}
