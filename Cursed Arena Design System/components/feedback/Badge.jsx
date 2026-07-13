import React from 'react';

const TONES = {
  neutral: { bg: 'var(--ink-700)', fg: 'var(--text-on-dark-dim)' },
  curse:   { bg: 'rgba(139,63,240,0.18)', fg: 'var(--curse-300)' },
  gold:    { bg: 'rgba(240,168,46,0.18)', fg: 'var(--gold-400)' },
  teal:    { bg: 'rgba(23,179,155,0.18)', fg: 'var(--teal-400)' },
  red:     { bg: 'rgba(216,32,59,0.18)', fg: 'var(--red-400)' },
};

/** Small pill label — faction, class, rarity, or status tag. */
export function Badge({ children, tone = 'neutral' }) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <span className="ca-label" style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '4px 10px', borderRadius: 'var(--r-pill)',
      background: t.bg, color: t.fg, letterSpacing: 'var(--ls-caps)',
    }}>
      {children}
    </span>
  );
}
