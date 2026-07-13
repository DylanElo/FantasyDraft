import React from 'react';

const TONE = { info: { bg: 'var(--ink-700)', accent: 'var(--curse-400)' }, success: { bg: 'var(--ink-700)', accent: 'var(--teal-400)' }, warning: { bg: 'var(--ink-700)', accent: 'var(--gold-400)' }, danger: { bg: 'var(--ink-700)', accent: 'var(--red-400)' } };

/** Transient toast for combat log lines, errors, and mission progress pings. */
export function Toast({ message, tone = 'info' }) {
  const t = TONE[tone] || TONE.info;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 16px', borderRadius: 'var(--r-md)',
      background: t.bg, borderLeft: `4px solid ${t.accent}`,
      border: '2px solid var(--ink-950)', borderLeftWidth: 4, borderLeftColor: t.accent,
      boxShadow: 'var(--shadow-md)', color: 'var(--text-on-dark)',
    }}>
      <span className="ca-body-sm" style={{ color: 'var(--text-on-dark)' }}>{message}</span>
    </div>
  );
}
