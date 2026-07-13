import React from 'react';

const TONE_COLOR = { hp: 'var(--success)', danger: 'var(--danger)', xp: 'var(--curse-500)', energy: 'var(--gold-500)' };

/** Segmented HP/XP bar with a lagging damage ghost trail. */
export function ProgressBar({ value = 100, max = 100, tone = 'hp', lagValue, height = 14 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const lagPct = lagValue != null ? Math.max(0, Math.min(100, (lagValue / max) * 100)) : null;
  return (
    <div style={{
      position: 'relative', width: '100%', height,
      borderRadius: 'var(--r-pill)', background: 'var(--ink-900)',
      border: '2px solid var(--ink-950)', boxShadow: 'var(--shadow-inset-well)', overflow: 'hidden',
    }}>
      {lagPct != null && (
        <div style={{ position: 'absolute', inset: 0, width: `${lagPct}%`, background: '#FB923C', opacity: 0.6, transition: 'width 500ms var(--ease-impact)' }} />
      )}
      <div style={{
        position: 'absolute', inset: 0, width: `${pct}%`,
        background: `linear-gradient(180deg, color-mix(in srgb, ${TONE_COLOR[tone]} 80%, white), ${TONE_COLOR[tone]})`,
        transition: 'width 300ms var(--ease-impact)',
      }} />
    </div>
  );
}
