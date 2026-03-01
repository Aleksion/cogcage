import React from 'react';
import type { Card as CardData } from '../../lib/cards';

/* ── Type → pastel color mapping (matches landing page aesthetic) ── */

const TYPE_STYLE: Record<string, { iconBg: string; badge: string; badgeText: string }> = {
  weapon: { iconBg: '#FEF9C3', badge: '#1A1A1A', badgeText: '#fff' },
  armor:  { iconBg: '#CFFAFE', badge: '#1A1A1A', badgeText: '#fff' },
  tool:   { iconBg: '#EDE9FE', badge: '#1A1A1A', badgeText: '#fff' },
};

interface CardProps {
  card: CardData;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  mini?: boolean;
}

export default function Card({ card, selected, disabled, onClick, mini }: CardProps) {
  const style = TYPE_STYLE[card.type] ?? TYPE_STYLE.tool;

  if (mini) {
    return (
      <div
        style={{
          width: 72, height: 90, borderRadius: 8,
          background: selected ? '#FEF9C3' : '#fff',
          border: `3px solid ${selected ? '#FFD600' : '#000'}`,
          boxShadow: selected ? `3px 3px 0 #FFD600` : '3px 3px 0 #000',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 3, cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.4 : 1, position: 'relative', overflow: 'hidden',
          transition: 'transform 0.1s',
        }}
        onClick={disabled ? undefined : onClick}
      >
        <div style={{
          width: '100%', flex: '1 0 auto',
          background: style.iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem',
        }}>
          {card.icon}
        </div>
        <span style={{
          color: '#111', fontSize: '0.55rem',
          fontFamily: "'Bangers', display",
          textAlign: 'center', lineHeight: 1.1, padding: '2px 4px 3px',
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
        width: 120, height: 180, borderRadius: 10,
        background: '#fff',
        border: `3px solid ${selected ? '#FFD600' : '#000'}`,
        boxShadow: selected ? '4px 4px 0 #FFD600' : '4px 4px 0 #000',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        transition: 'transform 0.1s ease',
        flexShrink: 0,
        position: 'relative',
      }}
      onClick={disabled ? undefined : onClick}
    >
      {/* Selected checkmark */}
      {selected && (
        <div style={{
          position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: '50%',
          background: '#FFD600', border: '2px solid #000',
          display: 'grid', placeItems: 'center',
          fontSize: '0.6rem', color: '#111', fontWeight: 900, zIndex: 2,
        }}>
          ✓
        </div>
      )}

      {/* Icon area — pastel bg */}
      <div style={{
        flex: '1 0 auto', minHeight: 80,
        background: style.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '2.4rem', lineHeight: 1,
      }}>
        {card.icon}
      </div>

      {/* Info area — white bg */}
      <div style={{
        background: '#fff',
        borderTop: '2px solid #000',
        padding: '4px 6px 5px',
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        {/* Type badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          background: style.badge, color: style.badgeText,
          fontSize: '0.5rem', fontWeight: 900, letterSpacing: '1px',
          textTransform: 'uppercase', padding: '1px 5px', borderRadius: 3,
          alignSelf: 'flex-start',
          fontFamily: "'Kanit', sans-serif",
        }}>
          {card.type}{card.subtype ? ` · ${card.subtype}` : ''}
        </div>

        {/* Card name */}
        <div style={{
          fontFamily: "'Bangers', display",
          fontSize: '0.85rem', color: '#111', lineHeight: 1.1,
          letterSpacing: '0.5px',
        }}>
          {card.name}
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.58rem', color: '#555',
          marginTop: 1,
        }}>
          {card.type === 'weapon' && (
            <>
              <span title="Damage">⚔{card.stats.damage}</span>
              <span title="Weight">⚖{card.stats.weight}</span>
              <span title="Energy" style={{ color: '#EB4D4B', fontWeight: 700 }}>+{card.stats.energyCost}</span>
            </>
          )}
          {card.type === 'armor' && (
            <>
              <span title="Defense">🛡{card.stats.defense}%</span>
              <span title="Weight">⚖{card.stats.weight}</span>
            </>
          )}
          {card.type === 'tool' && (
            <>
              <span title="Overhead">🧠{card.stats.overhead}</span>
              <span title="Weight">⚖{card.stats.weight}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
