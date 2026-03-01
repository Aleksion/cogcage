import React, { useState, useCallback } from 'react'
import { PARTS, randomMold, type Part, type PartSlot } from '~/lib/ws2/parts'

/* ── Props ────────────────────────────────────────────────────── */

interface MoldBuilderProps {
  onConfirm: (playerMold: Part[], opponentMold: Part[], playerName: string) => void
}

/* ── Slot config ──────────────────────────────────────────────── */

const SLOT_ORDER: { slot: PartSlot; label: string }[] = [
  { slot: 'shell', label: 'SHELL' },
  { slot: 'claws', label: 'CLAWS' },
  { slot: 'directive', label: 'DIRECTIVE' },
  { slot: 'trait', label: 'TRAIT' },
]

const RARITY_BADGE: Record<string, { label: string; color: string }> = {
  common: { label: 'COMMON', color: 'rgba(255,255,255,0.35)' },
  rare: { label: 'RARE', color: '#9C27B0' },
  legendary: { label: 'LEGENDARY', color: '#FFD600' },
}

/* ── Default selections (one common from each slot) ───────────── */

function getDefaults(): Record<PartSlot, string> {
  const defaults: Record<string, string> = {}
  for (const { slot } of SLOT_ORDER) {
    const first = PARTS.find(p => p.slot === slot && p.rarity === 'common')
    if (first) defaults[slot] = first.id
  }
  return defaults as Record<PartSlot, string>
}

/* ── Hex to rgba helper ───────────────────────────────────────── */

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/* ── Component ────────────────────────────────────────────────── */

export default function MoldBuilder({ onConfirm }: MoldBuilderProps) {
  const [selected, setSelected] = useState<Record<PartSlot, string>>(getDefaults)
  const [name, setName] = useState('CRAWLER-1')

  const handleSelect = useCallback((slot: PartSlot, partId: string) => {
    setSelected(prev => ({ ...prev, [slot]: partId }))
  }, [])

  const handleConfirm = useCallback(() => {
    const playerMold = SLOT_ORDER.map(({ slot }) => {
      return PARTS.find(p => p.id === selected[slot])!
    })
    const opponentMold = randomMold()
    onConfirm(playerMold, opponentMold, name || 'CRAWLER-1')
  }, [selected, name, onConfirm])

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'radial-gradient(ellipse at 50% 20%, #0a0a2e 0%, #050510 60%, #000 100%)',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px 60px',
    }}>
      {/* Cyan dot grid overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'radial-gradient(rgba(0,229,255,0.12) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 900 }}>
        {/* Title */}
        <h1 style={{
          fontFamily: "'Bangers', display",
          fontSize: 'clamp(2rem, 6vw, 3rem)',
          color: '#FFD600',
          textAlign: 'center',
          textShadow: '3px 3px 0 #000, 0 0 30px rgba(255,214,0,0.3)',
          margin: '0 0 24px',
          letterSpacing: 2,
        }}>
          FORGE YOUR MOLD
        </h1>

        {/* Name input */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value.toUpperCase().slice(0, 20))}
            placeholder="YOUR CRAWLER NAME"
            maxLength={20}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '1.1rem',
              fontWeight: 600,
              color: '#00E5FF',
              background: 'rgba(0,0,0,0.5)',
              border: '2px solid rgba(0,229,255,0.4)',
              borderRadius: 8,
              padding: '10px 20px',
              textAlign: 'center',
              outline: 'none',
              width: '100%',
              maxWidth: 340,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#00E5FF'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0,229,255,0.2)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.4)'; e.currentTarget.style.boxShadow = 'none' }}
          />
        </div>

        {/* Part rows */}
        {SLOT_ORDER.map(({ slot, label }) => {
          const parts = PARTS.filter(p => p.slot === slot)
          return (
            <div key={slot} style={{ marginBottom: 28 }}>
              {/* Row label */}
              <div style={{
                fontFamily: "'Bangers', display",
                fontSize: '1.1rem',
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: 3,
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <span>{label}</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              </div>

              {/* Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${parts.length}, 1fr)`,
                gap: 12,
              }}>
                {parts.map(part => {
                  const isSelected = selected[slot] === part.id
                  const badge = RARITY_BADGE[part.rarity]
                  return (
                    <button
                      key={part.id}
                      onClick={() => handleSelect(slot, part.id)}
                      style={{
                        background: isSelected
                          ? hexToRgba(part.color, 0.15)
                          : 'rgba(0,0,0,0.6)',
                        border: isSelected
                          ? `2px solid ${part.color}`
                          : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10,
                        padding: '14px 14px 12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                        outline: 'none',
                        boxShadow: isSelected
                          ? `0 0 20px ${hexToRgba(part.color, 0.25)}, inset 0 0 30px ${hexToRgba(part.color, 0.05)}`
                          : 'none',
                      }}
                    >
                      {/* Rarity badge */}
                      <div style={{
                        position: 'absolute',
                        top: 8,
                        right: 10,
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '0.6rem',
                        fontWeight: 600,
                        color: badge.color,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                      }}>
                        {badge.label}
                      </div>

                      {/* Name */}
                      <div style={{
                        fontFamily: "'Bangers', display",
                        fontSize: '1rem',
                        color: isSelected ? part.color : '#fff',
                        marginBottom: 6,
                        lineHeight: 1.2,
                        paddingRight: 60,
                        textShadow: isSelected ? `0 0 10px ${hexToRgba(part.color, 0.4)}` : 'none',
                      }}>
                        {part.name}
                      </div>

                      {/* Lore */}
                      <div style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '0.68rem',
                        color: 'rgba(255,255,255,0.45)',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                        overflow: 'hidden',
                      }}>
                        {part.lore}
                      </div>

                      {/* Stat chips */}
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        {part.statDelta.hpBonus != null && part.statDelta.hpBonus > 0 && (
                          <span style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '0.6rem',
                            color: '#4CAF50',
                            background: 'rgba(76,175,80,0.15)',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontWeight: 600,
                          }}>
                            +{part.statDelta.hpBonus} HP
                          </span>
                        )}
                        {part.statDelta.armorType && (
                          <span style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '0.6rem',
                            color: '#FFD600',
                            background: 'rgba(255,214,0,0.1)',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                          }}>
                            {part.statDelta.armorType}
                          </span>
                        )}
                        {part.statDelta.damageMultiplier != null && part.statDelta.damageMultiplier !== 1.0 && (
                          <span style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '0.6rem',
                            color: '#F44336',
                            background: 'rgba(244,67,54,0.15)',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontWeight: 600,
                          }}>
                            {part.statDelta.damageMultiplier > 1 ? '+' : ''}{Math.round((part.statDelta.damageMultiplier - 1) * 100)}% DMG
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Opponent label */}
        <div style={{
          textAlign: 'center',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.75rem',
          color: 'rgba(255,255,255,0.2)',
          letterSpacing: 2,
          margin: '16px 0 24px',
          textTransform: 'uppercase',
        }}>
          --- OPPONENT: RANDOM MOLD ---
        </div>

        {/* Enter the pit button */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleConfirm}
            style={{
              fontFamily: "'Bangers', display",
              fontSize: 'clamp(1.4rem, 4vw, 2rem)',
              color: '#111',
              background: '#FFD600',
              border: '3px solid #000',
              borderRadius: 14,
              padding: '16px 48px',
              cursor: 'pointer',
              boxShadow: '4px 4px 0 #000, 0 0 30px rgba(255,214,0,0.2)',
              letterSpacing: 2,
              textTransform: 'uppercase',
              transition: 'transform 0.1s',
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'translate(2px, 2px)'; e.currentTarget.style.boxShadow = '2px 2px 0 #000' }}
            onMouseUp={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '4px 4px 0 #000, 0 0 30px rgba(255,214,0,0.2)' }}
          >
            ENTER THE PIT &rarr;
          </button>
        </div>
      </div>
    </div>
  )
}
