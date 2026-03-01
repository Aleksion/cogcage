import { createFileRoute } from '@tanstack/react-router'
import React, { lazy, Suspense, useState, useEffect } from 'react'

const DEMO_STYLES = `
  body {
    overflow: hidden !important;
    margin: 0 !important;
    padding: 0 !important;
  }
`

export const Route = createFileRoute('/demo')({
  validateSearch: (search: Record<string, unknown>) => ({
    seed: search.seed ? Number(search.seed) : undefined,
  }),
  head: () => ({
    meta: [
      { title: 'LIVE BATTLE — CogCage AI Arena' },
      {
        name: 'description',
        content: 'Watch two AI agents fight in real-time. See their reasoning as they think.',
      },
    ],
    styles: [{ children: DEMO_STYLES }],
  }),
  component: DemoPage,
})

const CinematicBattle = lazy(() => import('~/components/arena/CinematicBattle'))

function DemoPage() {
  const { seed } = Route.useSearch()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#050510',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Bangers', display",
          fontSize: '2rem',
          color: '#FFD600',
        }}
      >
        LOADING ARENA...
      </div>
    )
  }

  return (
    <Suspense
      fallback={
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#050510',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Bangers', display",
            fontSize: '2rem',
            color: '#FFD600',
          }}
        >
          LOADING ARENA...
        </div>
      }
    >
      <CinematicBattle seed={seed} />
    </Suspense>
  )
}
