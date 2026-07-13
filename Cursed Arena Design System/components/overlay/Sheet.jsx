import React from 'react';

/** Bottom sheet overlay for Queue Review, character detail, and confirmation modals. */
export function Sheet({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'var(--surface-overlay)' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '80%',
        background: 'var(--ink-800)', borderTop: '3px solid var(--ink-950)',
        borderRadius: 'var(--r-2xl) var(--r-2xl) 0 0',
        boxShadow: '0 -12px 40px rgba(0,0,0,0.5)',
        padding: '10px 20px calc(20px + var(--safe-b))',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ width: 40, height: 5, borderRadius: 'var(--r-pill)', background: 'var(--ink-500)', margin: '4px auto 0' }} />
        {title && <div className="ca-h2">{title}</div>}
        <div style={{ overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}
