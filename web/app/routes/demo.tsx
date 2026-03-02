import { createFileRoute } from '@tanstack/react-router'
import React, { lazy, Suspense, useState, useEffect } from 'react'
import type { Part } from '~/lib/ws2/parts'

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
    mode: search.mode === 'cinematic' ? 'cinematic' : 'quick',
  }),
  head: () => ({
    meta: [
      { title: 'LIVE BATTLE — The Molt Pit AI Arena' },
      {
        name: 'description',
        content: 'Play a live AP-based arena demo with map movement, or switch to cinematic build mode.',
      },
    ],
    styles: [{ children: DEMO_STYLES }],
  }),
  component: DemoPage,
})

const DemoLoop = lazy(() => import('~/components/DemoLoop'))
const CinematicBattle = lazy(() => import('~/components/arena/CinematicBattle'))
const MoldBuilder = lazy(() => import('~/components/MoldBuilder'))

function DemoPage() {
  const { seed, mode } = Route.useSearch()
  const [mounted, setMounted] = useState(false)
  const [phase, setPhase] = useState<'build' | 'battle'>('build')
  const [playerMold, setPlayerMold] = useState<Part[] | null>(null)
  const [opponentMold, setOpponentMold] = useState<Part[] | null>(null)
  const [playerName, setPlayerName] = useState('CRAWLER-1')
  const [webhookUrl, setWebhookUrl] = useState<string | undefined>()

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

  if (mode !== 'cinematic') {
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
            LOADING DEMO...
          </div>
        }
      >
        <DemoLoop />
      </Suspense>
    )
  }

  if (phase === 'build') {
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
            LOADING FORGE...
          </div>
        }
      >
        <MoldBuilder
          onConfirm={(pm, om, name, url) => {
            setPlayerMold(pm)
            setOpponentMold(om)
            setPlayerName(name)
            setWebhookUrl(url)
            setPhase('battle')
          }}
        />
      </Suspense>
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
      <CinematicBattle
        seed={seed}
        playerMold={playerMold}
        opponentMold={opponentMold}
        playerName={playerName}
        webhookUrl={webhookUrl}
      />
    </Suspense>
  )
}
