import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/molds')({
  component: MoldsLegacyRedirect,
})

function MoldsLegacyRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    void navigate({ to: '/molts', replace: true })
  }, [navigate])

  return null
}
