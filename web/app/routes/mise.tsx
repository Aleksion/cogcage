import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/mise')({
  component: MiseRedirect,
})

function MiseRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    void navigate({ to: '/shell', replace: true })
  }, [navigate])

  return null
}
