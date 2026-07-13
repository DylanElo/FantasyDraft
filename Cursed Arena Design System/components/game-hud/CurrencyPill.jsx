import React from 'react';

const KIND = {
  gold: { color: 'var(--gold-400)', glyph: '●' },
  gem:  { color: 'var(--curse-400)', glyph: '◆' },
};

/** Top-HUD currency pill — always-visible gold/gem balance with a tappable + add affordance. */
export function CurrencyPill({ kind = 'gold', amount = 0, onAdd }) {
  const k = KIND[kind] || KIND.gold;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      height: 36, padding: '0 6px 0 12px', borderRadius: 'var(--r-pill)',
      background: 'var(--ink-800)', border: '2px solid var(--ink-950)',
      boxShadow: 'var(--bevel-plate)',
    }}>
      <span style={{ color: k.color, fontSize: 14 }}>{k.glyph}</span>
      <span className="ca-stat" style={{ fontSize: 'var(--fs-sm)' }}>{amount.toLocaleString()}</span>
      {onAdd && (
        <button onClick={onAdd} style={{
          width: 24, height: 24, borderRadius: '50%', border: 'none',
          background: 'var(--teal-500)', color: '#fff', fontWeight: 900, cursor: 'pointer',
        }}>+</button>
      )}
    </div>
  );
}
