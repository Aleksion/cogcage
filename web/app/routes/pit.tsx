import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/pit')({
  component: PitRedirect,
})

function PitRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    void navigate({ to: '/play', replace: true })
  }, [navigate])

  return null
}
