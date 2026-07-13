import React from 'react';

const SIZES = {
  sm: { h: 40, fs: 'var(--fs-xs)', pad: '0 16px', radius: 'var(--r-sm)' },
  md: { h: 52, fs: 'var(--fs-md)', pad: '0 22px', radius: 'var(--r-md)' },
  lg: { h: 60, fs: 'var(--fs-lg)', pad: '0 28px', radius: 'var(--r-lg)' },
};

const VARIANTS = {
  primary: {
    background: 'linear-gradient(180deg, var(--curse-400), var(--curse-600))',
    color: '#fff',
    border: '2px solid var(--ink-950)',
    boxShadow: 'var(--bevel-plate), 0 4px 0 var(--curse-900), 0 10px 22px rgba(139,63,240,0.35)',
  },
  gold: {
    background: 'linear-gradient(180deg, var(--gold-300), var(--gold-500))',
    color: 'var(--ink-950)',
    border: '2px solid var(--ink-950)',
    boxShadow: 'var(--bevel-plate), 0 4px 0 var(--gold-800), 0 10px 22px rgba(240,168,46,0.35)',
  },
  secondary: {
    background: 'var(--ink-700)',
    color: 'var(--text-on-dark)',
    border: '2px solid var(--ink-950)',
    boxShadow: 'var(--bevel-plate), 0 4px 0 var(--ink-950)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-on-dark-dim)',
    border: '2px solid var(--border-hairline-hi)',
    boxShadow: 'none',
  },
  danger: {
    background: 'linear-gradient(180deg, var(--red-400), var(--red-600))',
    color: '#fff',
    border: '2px solid var(--ink-950)',
    boxShadow: 'var(--bevel-plate), 0 4px 0 var(--red-700), 0 10px 22px rgba(216,32,59,0.35)',
  },
};

/** Chunky, tactile CTA button — the brand's primary tap surface. */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon = null,
  fullWidth = false,
  onClick,
  style,
}) {
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: s.h,
        padding: s.pad,
        width: fullWidth ? '100%' : undefined,
        borderRadius: s.radius,
        fontFamily: 'var(--font-ui)',
        fontWeight: 'var(--fw-black)',
        fontSize: s.fs,
        letterSpacing: 'var(--ls-wide)',
        textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'transform var(--dur-tap) var(--ease-press), box-shadow var(--dur-tap) var(--ease-press)',
        userSelect: 'none',
        ...v,
        ...style,
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'translateY(3px) scale(0.98)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'none'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
    >
      {icon}
      {children}
    </button>
  );
}
