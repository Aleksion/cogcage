import React, { useRef, useEffect, useState } from 'react'

interface BrainStreamProps {
  botName: string
  botColor: string
  tokens: string
  isThinking: boolean
  lastAction: string | null
  history: string[]
  side: 'left' | 'right'
}

export default function BrainStream({
  botName,
  botColor,
  tokens,
  isThinking,
  lastAction,
  history,
  side,
}: BrainStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Character-by-character reveal
  const [revealed, setRevealed] = useState('')
  const revealRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const targetRef = useRef('')

  useEffect(() => {
    targetRef.current = tokens

    // If tokens shrunk (new stream started), reset
    if (tokens.length < revealed.length) {
      setRevealed('')
    }

    // Only start interval if there are unrevealed characters
    if (revealed.length < tokens.length && !revealRef.current) {
      revealRef.current = setInterval(() => {
        setRevealed((prev) => {
          const target = targetRef.current
          if (prev.length >= target.length) {
            if (revealRef.current) {
              clearInterval(revealRef.current)
              revealRef.current = null
            }
            return prev
          }
          return target.slice(0, prev.length + 1)
        })
      }, 30)
    }

    return () => {
      // Don't clear on every render — only on unmount
    }
  }, [tokens]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (revealRef.current) {
        clearInterval(revealRef.current)
        revealRef.current = null
      }
    }
  }, [])

  // When not thinking, show full text immediately
  const displayText = isThinking ? revealed : tokens

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [displayText])

  return (
    <div
      style={{
        position: 'fixed',
        top: 60,
        [side]: 0,
        bottom: 80,
        width: 280,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        borderLeft: side === 'right' ? `2px solid ${botColor}` : 'none',
        borderRight: side === 'left' ? `2px solid ${botColor}` : 'none',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        pointerEvents: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: `1px solid ${botColor}33`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isThinking ? botColor : '#333',
            boxShadow: isThinking ? `0 0 8px ${botColor}` : 'none',
            animation: isThinking ? 'brain-pulse-dot 1s infinite' : 'none',
          }}
        />
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.7rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            color: botColor,
            letterSpacing: '2px',
          }}
        >
          {botName} BRAIN
        </span>
      </div>

      {/* Status indicator */}
      <div
        style={{
          padding: '6px 14px',
          fontSize: '0.65rem',
          fontFamily: "'IBM Plex Mono', monospace",
          color: isThinking ? botColor : lastAction ? '#2ecc71' : '#666',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {isThinking ? (
          <span style={{ animation: 'brain-pulse-text 1.5s infinite' }}>PROCESSING...</span>
        ) : lastAction ? (
          <span>
            DECIDED:{' '}
            <strong style={{ color: '#2ecc71' }}>{lastAction}</strong>
          </span>
        ) : (
          'WAITING...'
        )}
      </div>

      {/* Token stream area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          padding: '10px 14px',
          overflow: 'auto',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.72rem',
          lineHeight: 1.6,
          color: 'rgba(255,255,255,0.7)',
          fontStyle: isThinking ? 'italic' : 'normal',
          opacity: isThinking ? 0.8 : 1,
          scrollbarWidth: 'thin',
          scrollbarColor: `${botColor}33 transparent`,
        }}
      >
        {displayText || (
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>
            Waiting for first decision...
          </span>
        )}
        {isThinking && (
          <span
            style={{
              display: 'inline-block',
              width: 2,
              height: 14,
              background: botColor,
              marginLeft: 1,
              animation: 'brain-blink-cursor 0.6s step-end infinite',
              verticalAlign: 'text-bottom',
              boxShadow: `0 0 4px ${botColor}`,
            }}
          />
        )}
      </div>

      {/* Decision history */}
      {history.length > 0 && (
        <div
          style={{
            padding: '8px 14px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            maxHeight: 80,
            overflow: 'auto',
          }}
        >
          {history.slice(-3).map((entry, i) => (
            <div
              key={i}
              style={{
                fontSize: '0.6rem',
                fontFamily: "'IBM Plex Mono', monospace",
                color: 'rgba(255,255,255,0.25)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                padding: '1px 0',
              }}
            >
              {entry}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes brain-pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes brain-pulse-text {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes brain-blink-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
