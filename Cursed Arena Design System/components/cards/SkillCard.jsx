import React from 'react';

const ENERGY_COLOR = { B: 'var(--e-body)', T: 'var(--e-technique)', F: 'var(--e-focus)', C: 'var(--e-curse)', X: 'var(--e-wild)' };

/** Bottom-dock technique card: cost pips, cooldown, effect line, and ready/blocked state. */
export function SkillCard({ name, cost = [], cooldown = 0, effect, state = 'ready', onClick }) {
  const blocked = state !== 'ready';
  const stateLabel = { ready: null, cooldown: `CD ${cooldown}`, energy: 'NEED ENERGY', stunned: 'STUNNED' }[state];
  return (
    <button
      onClick={blocked ? undefined : onClick}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        textAlign: 'left',
        padding: '12px 14px',
        borderRadius: 'var(--r-md)',
        background: blocked ? 'var(--ink-700)' : 'linear-gradient(180deg, var(--ink-700), var(--ink-800))',
        border: '2px solid var(--ink-950)',
        boxShadow: blocked ? 'var(--shadow-inset-well)' : 'var(--bevel-plate), 0 3px 0 var(--ink-950)',
        opacity: blocked ? 0.55 : 1,
        cursor: blocked ? 'not-allowed' : 'pointer',
        color: 'var(--text-on-dark)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span className="ca-h3">{name}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {cost.map((c, i) => (
            <span key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: ENERGY_COLOR[c], border: '1.5px solid rgba(0,0,0,0.4)' }} />
          ))}
        </div>
      </div>
      {effect && <div className="ca-body-sm">{effect}</div>}
      {stateLabel && <div className="ca-label" style={{ color: 'var(--red-400)' }}>{stateLabel}</div>}
    </button>
  );
}
