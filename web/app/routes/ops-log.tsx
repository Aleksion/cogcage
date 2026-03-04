import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/ops-log')({
  component: OpsLogLegacyRedirect,
})

function OpsLogLegacyRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    void navigate({ to: '/ledger', replace: true })
  }, [navigate])

  return null
}
