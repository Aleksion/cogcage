import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/ledger')({
  component: LedgerRedirect,
})

function LedgerRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    void navigate({ to: '/ops-log', replace: true })
  }, [navigate])

  return null
}
