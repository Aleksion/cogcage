import React from 'react';
import type { Card as CardData } from '../../lib/cards';

/* ── Type → color mapping ────────────────────────────────────── */

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  weapon: { bg: '#EB4D4B', text: '#fff' },
  armor:  { bg: '#00E5FF', text: '#000' },
  tool:   { bg: '#7C3AED', text: '#fff' },
};

const RARITY_DOT: Record<string, string> = {
  common: '#666',
  rare: '#FFD600',
  legendary: 'linear-gradient(135deg, #FFD600, #FF9F1C, #eb4d4b)',
};

interface CardProps {
  card: CardData;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  mini?: boolean;
}

export default function Card({ card, selected, disabled, onClick, mini }: CardProps) {
  const colors = TYPE_COLORS[card.type] ?? TYPE_COLORS.tool;

  if (mini) {
    return (
      <div
        style={{
          width: 72, height: 90, borderRadius: 8,
          background: '#111',
          border: selected ? '3px solid #FFD600' : '3px solid #000',
          boxShadow: selected ? '3px 3px 0 #FFD600' : '3px 3px 0 #000',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 2, cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.4 : 1, position: 'relative', overflow: 'hidden',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onClick={disabled ? undefined : onClick}
      >
        <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{card.icon}</span>
        <span style={{
          color: '#fff', fontSize: '0.6rem', fontFamily: "'Bangers', display",
          textAlign: 'center', lineHeight: 1.1, padding: '0 4px',
        }}>
          {card.name}
        </span>
      </div>
    );
  }

  return (
    <div
      className="armory-card"
      style={{
        width: 120, height: 180, borderRadius: 10, position: 'relative', overflow: 'hidden',
        background: '#111',
        border: selected ? '3px solid #FFD600' : '3px solid #000',
        boxShadow: selected ? '4px 4px 0 #FFD600' : '4px 4px 0 #000',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        display: 'flex', flexDirection: 'column',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        flexShrink: 0,
      }}
      onClick={disabled ? undefined : onClick}
    >
      {/* Rarity dot */}
      <div style={{
        position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%',
        background: RARITY_DOT[card.rarity] ?? '#666',
        boxShadow: card.rarity === 'legendary' ? '0 0 6px #FFD600' : 'none',
      }} />

      {/* Selected checkmark */}
      {selected && (
        <div style={{
          position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: '50%',
          background: '#FFD600', display: 'grid', placeItems: 'center',
          fontSize: '0.6rem', color: '#111', fontWeight: 900,
        }}>
          ✓
        </div>
      )}

      {/* Type label */}
      <div style={{
        padding: '4px 0', textAlign: 'center',
        fontSize: '0.55rem', fontWeight: 900, textTransform: 'uppercase',
        letterSpacing: '1.5px', color: colors.text,
        background: colors.bg,
      }}>
        {card.type}{card.subtype ? ` · ${card.subtype}` : ''}
      </div>

      {/* Icon */}
      <div style={{
        flex: '1 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '2.2rem', lineHeight: 1, minHeight: 50,
      }}>
        {card.icon}
      </div>

      {/* Name */}
      <div style={{
        textAlign: 'center', fontFamily: "'Bangers', display",
        fontSize: '0.85rem', color: '#fff', lineHeight: 1.1, padding: '0 6px',
      }}>
        {card.name}
      </div>

      {/* Flavor text */}
      <div style={{
        textAlign: 'center', fontStyle: 'italic', fontSize: '0.55rem',
        color: 'rgba(255,255,255,0.4)', lineHeight: 1.3, padding: '2px 8px 4px',
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>
        {card.flavorText}
      </div>

      {/* Stats footer */}
      <div style={{
        height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderTop: '1px solid rgba(255,255,255,0.1)', padding: '0 6px',
        fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: 'rgba(255,255,255,0.85)',
      }}>
        {card.type === 'weapon' && (
          <>
            <span title="Damage">⚔️{card.stats.damage}</span>
            <span title="Weight">⚖️{card.stats.weight}</span>
            <span title="Energy">⚡{card.stats.energyCost}</span>
          </>
        )}
        {card.type === 'armor' && (
          <>
            <span title="Defense">🛡️{card.stats.defense}%</span>
            <span title="Weight">⚖️{card.stats.weight}</span>
          </>
        )}
        {card.type === 'tool' && (
          <>
            <span title="Overhead">🧠{card.stats.overhead}</span>
            <span title="Weight">⚖️{card.stats.weight}</span>
          </>
        )}
      </div>
    </div>
  );
}
