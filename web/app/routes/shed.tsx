import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/shed')({
  component: ShedRedirect,
})

function ShedRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    void navigate({ to: '/forge', replace: true })
  }, [navigate])

  return null
}
