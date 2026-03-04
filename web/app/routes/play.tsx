import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/play')({
  component: PlayLegacyRedirect,
})

function PlayLegacyRedirect() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.replace(`/pit${window.location.search}`)
    }
  }, [])

  return null
}
