import React from 'react';

const RARITY = {
  common:    { border: 'var(--rar-common)',    glow: 'none' },
  rare:      { border: 'var(--rar-rare)',      glow: '0 0 20px rgba(61,123,255,0.35)' },
  epic:      { border: 'var(--rar-epic)',      glow: '0 0 20px rgba(168,85,247,0.4)' },
  legendary: { border: 'var(--rar-legendary)', glow: 'var(--aura-gold)' },
};

/** Rarity-framed collectible character card: portrait, name plate, faction badge. */
export function Card({ name, faction = 'Sorcerer', rarity = 'common', portraitUrl, selected = false, onClick }) {
  const r = RARITY[rarity] || RARITY.common;
  const isMythic = rarity === 'mythic';
  return (
    <div
      onClick={onClick}
      style={{
        width: 168,
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        background: 'var(--ink-800)',
        border: isMythic ? '3px solid transparent' : `3px solid ${r.border}`,
        backgroundImage: isMythic ? `linear-gradient(var(--ink-800), var(--ink-800)), var(--rar-mythic)` : undefined,
        backgroundOrigin: isMythic ? 'border-box' : undefined,
        backgroundClip: isMythic ? 'padding-box, border-box' : undefined,
        boxShadow: selected
          ? `0 0 0 3px var(--curse-400), var(--shadow-md), ${r.glow}`
          : `var(--shadow-md), ${r.glow}`,
        transition: 'transform var(--dur-fast) var(--ease-out-back)',
        transform: selected ? 'translateY(-4px)' : 'none',
      }}
    >
      <div style={{
        aspectRatio: '3/4', width: '100%',
        backgroundImage: portraitUrl ? `url(${portraitUrl})` : undefined,
        backgroundSize: 'cover', backgroundPosition: 'top center',
        backgroundColor: 'var(--ink-700)',
      }} />
      <div style={{ padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="ca-h3" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        <div className="ca-label" style={{ color: 'var(--text-on-dark-muted)' }}>{faction}</div>
      </div>
    </div>
  );
}
