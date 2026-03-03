import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/molts')({
  component: MoltsRedirect,
})

function MoltsRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    void navigate({ to: '/molds', replace: true })
  }, [navigate])

  return null
}
