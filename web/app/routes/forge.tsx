import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/forge')({
  component: ForgeLegacyRedirect,
})

function ForgeLegacyRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    void navigate({ to: '/shed', replace: true })
  }, [navigate])

  return null
}
