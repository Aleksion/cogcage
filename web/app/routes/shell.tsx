import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/shell')({
  validateSearch: (search: Record<string, unknown>) => ({
    returnTo: (search.returnTo as string) || '',
  }),
  component: ShellLegacyRedirect,
})

function ShellLegacyRedirect() {
  const navigate = useNavigate()
  const { returnTo } = useSearch({ from: '/shell' })

  useEffect(() => {
    void navigate({ to: '/mise', search: { returnTo }, replace: true })
  }, [navigate, returnTo])

  return null
}
