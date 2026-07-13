import React from 'react';

/** Small square tap target for header/HUD icon actions (settings, back, info). */
export function IconButton({ children, size = 44, active = false, onClick, style }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--r-sm)',
        background: active ? 'var(--curse-600)' : 'var(--ink-700)',
        border: '2px solid var(--ink-950)',
        color: active ? '#fff' : 'var(--text-on-dark)',
        boxShadow: 'var(--bevel-plate), 0 3px 0 var(--ink-950)',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'transform var(--dur-tap) var(--ease-press)',
        ...style,
      }}
      onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(2px)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'none'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
    >
      {children}
    </button>
  );
}
