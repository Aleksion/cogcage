// Stub — Three.js ArenaCanvas replaced by Babylon.js PitScene (WS21).
// Kept for CinematicBattle legacy imports; renders a placeholder div.
import React, { forwardRef, useImperativeHandle } from 'react'

export interface ArenaHandle {
  updatePositions: (
    posA: { x: number; y: number } | null,
    posB: { x: number; y: number } | null,
  ) => void
  triggerAttack: (attacker: 'botA' | 'botB', type: 'melee' | 'ranged') => void
  triggerHit: (target: 'botA' | 'botB', damage: number) => void
  triggerDeath: (target: 'botA' | 'botB') => void
  triggerGuard: (target: 'botA' | 'botB') => void
  shakeCamera: () => void
}

const ArenaCanvas = forwardRef<ArenaHandle, object>((_props, ref) => {
  useImperativeHandle(ref, () => ({
    updatePositions: () => {},
    triggerAttack: () => {},
    triggerHit: () => {},
    triggerDeath: () => {},
    triggerGuard: () => {},
    shakeCamera: () => {},
  }))
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#050510',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#00E5FF',
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '14px',
      }}
    >
      [BABYLON ARENA ACTIVE — see /play]
    </div>
  )
})

ArenaCanvas.displayName = 'ArenaCanvas'
export default ArenaCanvas
