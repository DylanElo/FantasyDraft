import React from 'react';

const ENERGY = {
  B: { color: 'var(--e-body)', label: 'Body' },
  T: { color: 'var(--e-technique)', label: 'Technique' },
  F: { color: 'var(--e-focus)', label: 'Focus' },
  C: { color: 'var(--e-curse)', label: 'Curse' },
  X: { color: 'var(--e-wild)', label: 'Wild' },
};

/** Single physical energy bead — the HUD energy rail is a row of these. */
export function EnergyPip({ type = 'B', filled = true, size = 22 }) {
  const e = ENERGY[type] || ENERGY.B;
  return (
    <div
      title={e.label}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: filled
          ? `radial-gradient(circle at 30% 28%, color-mix(in srgb, ${e.color} 55%, white) 0%, ${e.color} 45%, color-mix(in srgb, ${e.color} 60%, black) 100%)`
          : 'var(--ink-900)',
        border: filled ? '1.5px solid rgba(0,0,0,0.45)' : '1.5px dashed var(--ink-500)',
        boxShadow: filled ? `0 0 10px color-mix(in srgb, ${e.color} 55%, transparent)` : 'none',
        flexShrink: 0,
      }}
    />
  );
}
