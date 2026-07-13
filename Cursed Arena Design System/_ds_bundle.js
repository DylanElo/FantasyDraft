/* @ds-bundle: {"format":4,"namespace":"CursedArenaDesignSystem_845983","components":[{"name":"Card","sourcePath":"components/cards/Card.jsx"},{"name":"SkillCard","sourcePath":"components/cards/SkillCard.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Badge","sourcePath":"components/feedback/Badge.jsx"},{"name":"ProgressBar","sourcePath":"components/feedback/ProgressBar.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"CurrencyPill","sourcePath":"components/game-hud/CurrencyPill.jsx"},{"name":"EnergyPip","sourcePath":"components/game-hud/EnergyPip.jsx"},{"name":"TabBar","sourcePath":"components/navigation/TabBar.jsx"},{"name":"Sheet","sourcePath":"components/overlay/Sheet.jsx"}],"sourceHashes":{"components/cards/Card.jsx":"e0705e743aed","components/cards/SkillCard.jsx":"309f379b2e8f","components/core/Button.jsx":"d9e790547c42","components/core/IconButton.jsx":"534d64af771b","components/feedback/Badge.jsx":"b8dfdee66745","components/feedback/ProgressBar.jsx":"7b031e587a78","components/feedback/Toast.jsx":"9b5fe41d754b","components/game-hud/CurrencyPill.jsx":"6b4c0343d26b","components/game-hud/EnergyPip.jsx":"93500ef77fb4","components/navigation/TabBar.jsx":"a86c4c2e05ab","components/overlay/Sheet.jsx":"7bd356e06366","exports/phaser-design-tokens.js":"8d9f875c6b39","ui_kits/mobile-app-v2/AppV2.jsx":"1eb34373ef1b","ui_kits/mobile-app-v2/ScreensV2A.jsx":"c8e1b9e1b1dc","ui_kits/mobile-app-v2/ScreensV2B.jsx":"658c98abd6a4","ui_kits/mobile-app/App.jsx":"99365cf39542","ui_kits/mobile-app/Screens.jsx":"90b4ff154ceb","ui_kits/mobile-app/mock-data.js":"60264ab6c146"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.CursedArenaDesignSystem_845983 = window.CursedArenaDesignSystem_845983 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/cards/Card.jsx
try { (() => {
const RARITY = {
  common: {
    border: 'var(--rar-common)',
    glow: 'none'
  },
  rare: {
    border: 'var(--rar-rare)',
    glow: '0 0 20px rgba(61,123,255,0.35)'
  },
  epic: {
    border: 'var(--rar-epic)',
    glow: '0 0 20px rgba(168,85,247,0.4)'
  },
  legendary: {
    border: 'var(--rar-legendary)',
    glow: 'var(--aura-gold)'
  }
};

/** Rarity-framed collectible character card: portrait, name plate, faction badge. */
function Card({
  name,
  faction = 'Sorcerer',
  rarity = 'common',
  portraitUrl,
  selected = false,
  onClick
}) {
  const r = RARITY[rarity] || RARITY.common;
  const isMythic = rarity === 'mythic';
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      width: 168,
      borderRadius: 'var(--r-lg)',
      overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default',
      background: 'var(--ink-800)',
      border: isMythic ? '3px solid transparent' : `3px solid ${r.border}`,
      backgroundImage: isMythic ? `linear-gradient(var(--ink-800), var(--ink-800)), var(--rar-mythic)` : undefined,
      backgroundOrigin: isMythic ? 'border-box' : undefined,
      backgroundClip: isMythic ? 'padding-box, border-box' : undefined,
      boxShadow: selected ? `0 0 0 3px var(--curse-400), var(--shadow-md), ${r.glow}` : `var(--shadow-md), ${r.glow}`,
      transition: 'transform var(--dur-fast) var(--ease-out-back)',
      transform: selected ? 'translateY(-4px)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      aspectRatio: '3/4',
      width: '100%',
      backgroundImage: portraitUrl ? `url(${portraitUrl})` : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'top center',
      backgroundColor: 'var(--ink-700)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 10px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ca-h3",
    style: {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    className: "ca-label",
    style: {
      color: 'var(--text-on-dark-muted)'
    }
  }, faction)));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/Card.jsx", error: String((e && e.message) || e) }); }

// components/cards/SkillCard.jsx
try { (() => {
const ENERGY_COLOR = {
  B: 'var(--e-body)',
  T: 'var(--e-technique)',
  F: 'var(--e-focus)',
  C: 'var(--e-curse)',
  X: 'var(--e-wild)'
};

/** Bottom-dock technique card: cost pips, cooldown, effect line, and ready/blocked state. */
function SkillCard({
  name,
  cost = [],
  cooldown = 0,
  effect,
  state = 'ready',
  onClick
}) {
  const blocked = state !== 'ready';
  const stateLabel = {
    ready: null,
    cooldown: `CD ${cooldown}`,
    energy: 'NEED ENERGY',
    stunned: 'STUNNED'
  }[state];
  return /*#__PURE__*/React.createElement("button", {
    onClick: blocked ? undefined : onClick,
    style: {
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
      color: 'var(--text-on-dark)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ca-h3"
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4
    }
  }, cost.map((c, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: 14,
      height: 14,
      borderRadius: '50%',
      background: ENERGY_COLOR[c],
      border: '1.5px solid rgba(0,0,0,0.4)'
    }
  })))), effect && /*#__PURE__*/React.createElement("div", {
    className: "ca-body-sm"
  }, effect), stateLabel && /*#__PURE__*/React.createElement("div", {
    className: "ca-label",
    style: {
      color: 'var(--red-400)'
    }
  }, stateLabel));
}
Object.assign(__ds_scope, { SkillCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/SkillCard.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
const SIZES = {
  sm: {
    h: 40,
    fs: 'var(--fs-xs)',
    pad: '0 16px',
    radius: 'var(--r-sm)'
  },
  md: {
    h: 52,
    fs: 'var(--fs-md)',
    pad: '0 22px',
    radius: 'var(--r-md)'
  },
  lg: {
    h: 60,
    fs: 'var(--fs-lg)',
    pad: '0 28px',
    radius: 'var(--r-lg)'
  }
};
const VARIANTS = {
  primary: {
    background: 'linear-gradient(180deg, var(--curse-400), var(--curse-600))',
    color: '#fff',
    border: '2px solid var(--ink-950)',
    boxShadow: 'var(--bevel-plate), 0 4px 0 var(--curse-900), 0 10px 22px rgba(139,63,240,0.35)'
  },
  gold: {
    background: 'linear-gradient(180deg, var(--gold-300), var(--gold-500))',
    color: 'var(--ink-950)',
    border: '2px solid var(--ink-950)',
    boxShadow: 'var(--bevel-plate), 0 4px 0 var(--gold-800), 0 10px 22px rgba(240,168,46,0.35)'
  },
  secondary: {
    background: 'var(--ink-700)',
    color: 'var(--text-on-dark)',
    border: '2px solid var(--ink-950)',
    boxShadow: 'var(--bevel-plate), 0 4px 0 var(--ink-950)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-on-dark-dim)',
    border: '2px solid var(--border-hairline-hi)',
    boxShadow: 'none'
  },
  danger: {
    background: 'linear-gradient(180deg, var(--red-400), var(--red-600))',
    color: '#fff',
    border: '2px solid var(--ink-950)',
    boxShadow: 'var(--bevel-plate), 0 4px 0 var(--red-700), 0 10px 22px rgba(216,32,59,0.35)'
  }
};

/** Chunky, tactile CTA button — the brand's primary tap surface. */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon = null,
  fullWidth = false,
  onClick,
  style
}) {
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;
  return /*#__PURE__*/React.createElement("button", {
    onClick: disabled ? undefined : onClick,
    disabled: disabled,
    style: {
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
      ...style
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = 'translateY(3px) scale(0.98)';
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = 'none';
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = 'none';
    }
  }, icon, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
/** Small square tap target for header/HUD icon actions (settings, back, info). */
function IconButton({
  children,
  size = 44,
  active = false,
  onClick,
  style
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
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
      ...style
    },
    onMouseDown: e => {
      e.currentTarget.style.transform = 'translateY(2px)';
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = 'none';
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = 'none';
    }
  }, children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Badge.jsx
try { (() => {
const TONES = {
  neutral: {
    bg: 'var(--ink-700)',
    fg: 'var(--text-on-dark-dim)'
  },
  curse: {
    bg: 'rgba(139,63,240,0.18)',
    fg: 'var(--curse-300)'
  },
  gold: {
    bg: 'rgba(240,168,46,0.18)',
    fg: 'var(--gold-400)'
  },
  teal: {
    bg: 'rgba(23,179,155,0.18)',
    fg: 'var(--teal-400)'
  },
  red: {
    bg: 'rgba(216,32,59,0.18)',
    fg: 'var(--red-400)'
  }
};

/** Small pill label — faction, class, rarity, or status tag. */
function Badge({
  children,
  tone = 'neutral'
}) {
  const t = TONES[tone] || TONES.neutral;
  return /*#__PURE__*/React.createElement("span", {
    className: "ca-label",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: 'var(--r-pill)',
      background: t.bg,
      color: t.fg,
      letterSpacing: 'var(--ls-caps)'
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Badge.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ProgressBar.jsx
try { (() => {
const TONE_COLOR = {
  hp: 'var(--success)',
  danger: 'var(--danger)',
  xp: 'var(--curse-500)',
  energy: 'var(--gold-500)'
};

/** Segmented HP/XP bar with a lagging damage ghost trail. */
function ProgressBar({
  value = 100,
  max = 100,
  tone = 'hp',
  lagValue,
  height = 14
}) {
  const pct = Math.max(0, Math.min(100, value / max * 100));
  const lagPct = lagValue != null ? Math.max(0, Math.min(100, lagValue / max * 100)) : null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: '100%',
      height,
      borderRadius: 'var(--r-pill)',
      background: 'var(--ink-900)',
      border: '2px solid var(--ink-950)',
      boxShadow: 'var(--shadow-inset-well)',
      overflow: 'hidden'
    }
  }, lagPct != null && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      width: `${lagPct}%`,
      background: '#FB923C',
      opacity: 0.6,
      transition: 'width 500ms var(--ease-impact)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      width: `${pct}%`,
      background: `linear-gradient(180deg, color-mix(in srgb, ${TONE_COLOR[tone]} 80%, white), ${TONE_COLOR[tone]})`,
      transition: 'width 300ms var(--ease-impact)'
    }
  }));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
const TONE = {
  info: {
    bg: 'var(--ink-700)',
    accent: 'var(--curse-400)'
  },
  success: {
    bg: 'var(--ink-700)',
    accent: 'var(--teal-400)'
  },
  warning: {
    bg: 'var(--ink-700)',
    accent: 'var(--gold-400)'
  },
  danger: {
    bg: 'var(--ink-700)',
    accent: 'var(--red-400)'
  }
};

/** Transient toast for combat log lines, errors, and mission progress pings. */
function Toast({
  message,
  tone = 'info'
}) {
  const t = TONE[tone] || TONE.info;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 16px',
      borderRadius: 'var(--r-md)',
      background: t.bg,
      borderLeft: `4px solid ${t.accent}`,
      border: '2px solid var(--ink-950)',
      borderLeftWidth: 4,
      borderLeftColor: t.accent,
      boxShadow: 'var(--shadow-md)',
      color: 'var(--text-on-dark)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ca-body-sm",
    style: {
      color: 'var(--text-on-dark)'
    }
  }, message));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/game-hud/CurrencyPill.jsx
try { (() => {
const KIND = {
  gold: {
    color: 'var(--gold-400)',
    glyph: '●'
  },
  gem: {
    color: 'var(--curse-400)',
    glyph: '◆'
  }
};

/** Top-HUD currency pill — always-visible gold/gem balance with a tappable + add affordance. */
function CurrencyPill({
  kind = 'gold',
  amount = 0,
  onAdd
}) {
  const k = KIND[kind] || KIND.gold;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      height: 36,
      padding: '0 6px 0 12px',
      borderRadius: 'var(--r-pill)',
      background: 'var(--ink-800)',
      border: '2px solid var(--ink-950)',
      boxShadow: 'var(--bevel-plate)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: k.color,
      fontSize: 14
    }
  }, k.glyph), /*#__PURE__*/React.createElement("span", {
    className: "ca-stat",
    style: {
      fontSize: 'var(--fs-sm)'
    }
  }, amount.toLocaleString()), onAdd && /*#__PURE__*/React.createElement("button", {
    onClick: onAdd,
    style: {
      width: 24,
      height: 24,
      borderRadius: '50%',
      border: 'none',
      background: 'var(--teal-500)',
      color: '#fff',
      fontWeight: 900,
      cursor: 'pointer'
    }
  }, "+"));
}
Object.assign(__ds_scope, { CurrencyPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/game-hud/CurrencyPill.jsx", error: String((e && e.message) || e) }); }

// components/game-hud/EnergyPip.jsx
try { (() => {
const ENERGY = {
  B: {
    color: 'var(--e-body)',
    label: 'Body'
  },
  T: {
    color: 'var(--e-technique)',
    label: 'Technique'
  },
  F: {
    color: 'var(--e-focus)',
    label: 'Focus'
  },
  C: {
    color: 'var(--e-curse)',
    label: 'Curse'
  },
  X: {
    color: 'var(--e-wild)',
    label: 'Wild'
  }
};

/** Single physical energy bead — the HUD energy rail is a row of these. */
function EnergyPip({
  type = 'B',
  filled = true,
  size = 22
}) {
  const e = ENERGY[type] || ENERGY.B;
  return /*#__PURE__*/React.createElement("div", {
    title: e.label,
    style: {
      width: size,
      height: size,
      borderRadius: '50%',
      background: filled ? `radial-gradient(circle at 30% 28%, color-mix(in srgb, ${e.color} 55%, white) 0%, ${e.color} 45%, color-mix(in srgb, ${e.color} 60%, black) 100%)` : 'var(--ink-900)',
      border: filled ? '1.5px solid rgba(0,0,0,0.45)' : '1.5px dashed var(--ink-500)',
      boxShadow: filled ? `0 0 10px color-mix(in srgb, ${e.color} 55%, transparent)` : 'none',
      flexShrink: 0
    }
  });
}
Object.assign(__ds_scope, { EnergyPip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/game-hud/EnergyPip.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TabBar.jsx
try { (() => {
/** Bottom tab bar — Home, Roster, Battle (elevated), Missions, Profile. */
function TabBar({
  tabs,
  activeId,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-around',
      height: 'var(--tabbar-h)',
      paddingBottom: 'var(--safe-b)',
      background: 'var(--ink-900)',
      borderTop: '2px solid var(--ink-950)'
    }
  }, tabs.map(tab => {
    const isActive = tab.id === activeId;
    const isHero = tab.hero;
    return /*#__PURE__*/React.createElement("button", {
      key: tab.id,
      onClick: () => onChange && onChange(tab.id),
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        flex: 1,
        height: '100%',
        padding: '8px 4px 10px',
        transform: isHero ? 'translateY(-14px)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: isHero ? 56 : 32,
        height: isHero ? 56 : 32,
        borderRadius: isHero ? 'var(--r-lg)' : 'var(--r-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isHero ? 'linear-gradient(180deg, var(--curse-400), var(--curse-600))' : isActive ? 'var(--ink-700)' : 'transparent',
        border: isHero ? '2px solid var(--ink-950)' : 'none',
        boxShadow: isHero ? 'var(--bevel-plate), 0 4px 0 var(--curse-900)' : 'none',
        color: isActive || isHero ? '#fff' : 'var(--text-on-dark-muted)',
        fontSize: isHero ? 24 : 18
      }
    }, tab.icon), /*#__PURE__*/React.createElement("span", {
      className: "ca-eyebrow",
      style: {
        color: isActive ? 'var(--text-on-dark)' : 'var(--text-on-dark-muted)',
        fontSize: 9
      }
    }, tab.label));
  }));
}
Object.assign(__ds_scope, { TabBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TabBar.jsx", error: String((e && e.message) || e) }); }

// components/overlay/Sheet.jsx
try { (() => {
/** Bottom sheet overlay for Queue Review, character detail, and confirmation modals. */
function Sheet({
  open,
  title,
  children,
  onClose
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 50
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--surface-overlay)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      maxHeight: '80%',
      background: 'var(--ink-800)',
      borderTop: '3px solid var(--ink-950)',
      borderRadius: 'var(--r-2xl) var(--r-2xl) 0 0',
      boxShadow: '0 -12px 40px rgba(0,0,0,0.5)',
      padding: '10px 20px calc(20px + var(--safe-b))',
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 5,
      borderRadius: 'var(--r-pill)',
      background: 'var(--ink-500)',
      margin: '4px auto 0'
    }
  }), title && /*#__PURE__*/React.createElement("div", {
    className: "ca-h2"
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowY: 'auto'
    }
  }, children)));
}
Object.assign(__ds_scope, { Sheet });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlay/Sheet.jsx", error: String((e && e.message) || e) }); }

// exports/phaser-design-tokens.js
try { (() => {
/* Cursed Arena — Phaser design tokens.
   Same shape as web/static/phaser-design-tokens.js in the FantasyDraft repo,
   regenerated from the design system's tokens/*.css. Drop-in replacement:
   exposes window.JJK_MOBILE_TOKENS (alias window.CURSED_ARENA_TOKENS). */
(function () {
  'use strict';

  const colors = {
    ink950: '#0E0B16',
    ink900: '#171223',
    ink800: '#211A31',
    ink700: '#2C2340',
    ink500: '#4E4169',
    ink300: '#9285A9',
    ink100: '#E6E0EE',
    paper: '#FFFDF7',
    curse900: '#2E1065',
    curse600: '#6D28D9',
    curse500: '#8B3FF0',
    curse400: '#A855F7',
    curse300: '#C084FC',
    gold800: '#8A5A12',
    gold500: '#F0A82E',
    gold400: '#FBBF42',
    gold300: '#FFD873',
    teal500: '#17B39B',
    teal400: '#38D9BE',
    red600: '#D8203B',
    red500: '#F03A52',
    red400: '#FF6B7E',
    textMain: '#FBF8FF',
    textDim: '#C3B9D2',
    textMuted: '#9285A9'
  };
  const hex = c => parseInt(c.slice(1), 16);
  const phaserColors = {};
  Object.keys(colors).forEach(k => {
    phaserColors[k] = hex(colors[k]);
  });
  window.JJK_MOBILE_TOKENS = window.CURSED_ARENA_TOKENS = {
    colors,
    phaserColors,
    energy: {
      body: {
        label: 'B',
        key: 'green',
        color: '#3FBE6B',
        phaser: 0x3fbe6b
      },
      technique: {
        label: 'T',
        key: 'blue',
        color: '#3D7BFF',
        phaser: 0x3d7bff
      },
      focus: {
        label: 'F',
        key: 'gold',
        color: '#FBBF42',
        phaser: 0xfbbf42
      },
      curse: {
        label: 'C',
        key: 'red',
        color: '#D8203B',
        phaser: 0xd8203b
      },
      wild: {
        label: 'X',
        key: 'wild',
        color: '#4E4169',
        phaser: 0x4e4169
      }
    },
    combatStates: {
      selected: {
        color: colors.gold400,
        phaser: phaserColors.gold400
      },
      /* gold ring/plate */
      legalTarget: {
        color: colors.teal400,
        phaser: phaserColors.teal400
      },
      /* teal pulse */
      threat: {
        color: colors.red500,
        phaser: phaserColors.red500
      },
      /* enemy/damage only */
      domain: {
        color: colors.curse400,
        phaser: phaserColors.curse400
      } /* cinematic only */
    },
    rarity: {
      common: {
        color: '#9285A9',
        phaser: 0x9285a9
      },
      rare: {
        color: '#3D7BFF',
        phaser: 0x3d7bff
      },
      epic: {
        color: '#A855F7',
        phaser: 0xa855f7
      },
      legendary: {
        color: '#F0A82E',
        phaser: 0xf0a82e
      }
    },
    type: {
      display: '"Lilita One", Inter, sans-serif',
      ui: 'Inter, Arial, sans-serif',
      mono: '"JetBrains Mono", monospace'
    },
    radius: {
      panelMin: 16,
      panelMax: 28,
      skillCard: 16,
      skillCardLarge: 22,
      pill: 999
    },
    plate: {
      keylineWidth: 3,
      /* near-black sticker outline */
      keylineColor: 0x0e0b16,
      ledgeOffset: 4,
      /* hard 0 4px 0 colored ledge under buttons */
      bevelTopAlpha: 0.28,
      /* light inner top edge */
      bevelBottomAlpha: 0.22 /* dark inner bottom edge */
    },
    motion: {
      pressMs: 80,
      sheetMs: 240,
      targetPulseMs: 1200,
      damageRiseMs: 620,
      hpLagMs: 500,
      domainPulseMs: 3000,
      rewardPopMs: 380,
      easeOutBack: 'Back.easeOut',
      easeSnap: 'Cubic.easeOut',
      easeImpact: 'Quart.easeInOut'
    },
    frames: {
      small: {
        width: 360,
        height: 800
      },
      primary: {
        width: 390,
        height: 844
      },
      large: {
        width: 430,
        height: 932
      },
      desktopCenterAt: 620
    },
    touch: {
      minTarget: 44,
      lowerHalfPriority: 0.55
    }
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "exports/phaser-design-tokens.js", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app-v2/AppV2.jsx
try { (() => {
/* Cursed Arena V2 — shell + router. */

const {
  TabBar: TabBarV2
} = window.CursedArenaDesignSystem_845983;
function AppV2() {
  const [screen, setScreen] = React.useState('home');
  const go = setScreen;
  const inBattle = screen === 'combat' || screen === 'results';
  const body = {
    home: /*#__PURE__*/React.createElement(window.LobbyV2, {
      go: go
    }),
    roster: /*#__PURE__*/React.createElement(window.RosterV2, null),
    team: /*#__PURE__*/React.createElement(window.TeamV2, {
      go: go
    }),
    combat: /*#__PURE__*/React.createElement(window.CombatV2, {
      go: go
    }),
    results: /*#__PURE__*/React.createElement(window.ResultsV2, {
      go: go
    })
  }[screen];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 390,
      height: 844,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-app-grad)',
      color: 'var(--text-on-dark)',
      borderRadius: 24,
      overflow: 'hidden',
      border: '2px solid var(--ink-950)',
      fontFamily: 'var(--font-ui)',
      position: 'relative'
    },
    "data-screen-label": screen
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column'
    }
  }, body), !inBattle && /*#__PURE__*/React.createElement(TabBarV2, {
    activeId: screen === 'team' ? 'battle' : screen,
    onChange: id => go(id === 'battle' ? 'team' : id),
    tabs: [{
      id: 'home',
      label: 'Home',
      icon: '🏠'
    }, {
      id: 'roster',
      label: 'Roster',
      icon: '🗂'
    }, {
      id: 'battle',
      label: 'Battle',
      icon: '⚔',
      hero: true
    }, {
      id: 'missions',
      label: 'Missions',
      icon: '🗺'
    }, {
      id: 'profile',
      label: 'Profile',
      icon: '👤'
    }]
  }));
}
window.CAAppV2 = AppV2;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app-v2/AppV2.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app-v2/ScreensV2A.jsx
try { (() => {
/* Cursed Arena V2 — Lobby, Team Builder, Roster. Angular blade geometry,
   shine sweeps, ember field, poster-first composition. */

const DSv2 = window.CursedArenaDesignSystem_845983;
const {
  Button,
  Card,
  SkillCard,
  Badge,
  ProgressBar,
  EnergyPip,
  CurrencyPill,
  Sheet
} = DSv2;

/* ── Ambient layer: kanji watermark + embers ─────────────────────────── */
function AmbientField() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "fx-kanji-wm",
    style: {
      position: 'absolute',
      fontSize: 420,
      right: -110,
      top: 120,
      transform: 'rotate(8deg)'
    }
  }, "\u546A"), [8, 22, 41, 58, 74, 90].map((x, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "fx-ember",
    style: {
      '--x': x + '%',
      '--d': i * 0.9 + 's',
      bottom: 40
    }
  })));
}

/* ── Angular chrome bits ─────────────────────────────────────────────── */
function BladePlate({
  children,
  style,
  onClick,
  tone = 'ink'
}) {
  const bg = {
    ink: 'linear-gradient(180deg, var(--ink-700), var(--ink-800))',
    curse: 'linear-gradient(180deg, var(--curse-400), var(--curse-600))',
    gold: 'linear-gradient(180deg, var(--gold-300), var(--gold-500))'
  }[tone];
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      clipPath: 'var(--clip-blade)',
      background: 'var(--ink-950)',
      padding: 2.5,
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      clipPath: 'var(--clip-blade)',
      background: bg,
      width: '100%',
      height: '100%',
      boxShadow: 'var(--bevel-plate)'
    }
  }, children));
}
function SectionBanner({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-block',
      clipPath: 'var(--clip-tag)',
      background: 'var(--curse-600)',
      padding: '5px 22px 5px 12px',
      transform: 'skewX(-6deg)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ca-eyebrow",
    style: {
      color: '#fff',
      transform: 'skewX(6deg)',
      display: 'inline-block'
    }
  }, children));
}
function HudV2() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px 8px',
      position: 'relative',
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      clipPath: 'var(--clip-blade-both)',
      background: 'linear-gradient(180deg, var(--curse-400), var(--curse-600))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-display)',
      fontSize: 17,
      color: '#fff'
    }
  }, "28"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "ca-h3",
    style: {
      fontSize: 12
    }
  }, "KaidoMain"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      marginTop: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--gold-400)',
      fontSize: 11
    }
  }, "\uD83C\uDFC6"), /*#__PURE__*/React.createElement("span", {
    className: "ca-stat",
    style: {
      fontSize: 11,
      color: 'var(--gold-300)'
    }
  }, "1,284")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 7
    }
  }, /*#__PURE__*/React.createElement(CurrencyPill, {
    kind: "gold",
    amount: 4820,
    onAdd: () => {}
  }), /*#__PURE__*/React.createElement(CurrencyPill, {
    kind: "gem",
    amount: 128,
    onAdd: () => {}
  })));
}

/* ── LOBBY ───────────────────────────────────────────────────────────── */
function LobbyV2({
  go
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/portraits/gojo-young.svg",
    alt: "Featured fighter",
    style: {
      width: '100%',
      height: '68%',
      objectFit: 'cover',
      objectPosition: 'center 18%'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(180deg, rgba(14,11,22,0.25) 0%, transparent 22%, transparent 38%, rgba(14,11,22,0.94) 62%, var(--ink-950) 74%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "fx-scanlines",
    style: {
      position: 'absolute',
      inset: 0
    }
  })), /*#__PURE__*/React.createElement(AmbientField, null), /*#__PURE__*/React.createElement(HudV2, null), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 2,
      padding: '2px 16px'
    }
  }, /*#__PURE__*/React.createElement(SectionBanner, null, "Season 4 \xB7 Hidden Inventory")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 2,
      padding: '0 16px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 11
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ca-h1",
    style: {
      fontSize: 34,
      textShadow: '0 4px 0 rgba(0,0,0,0.45)'
    }
  }, "Welcome to", /*#__PURE__*/React.createElement("br", null), "Jujutsu High"), /*#__PURE__*/React.createElement("button", {
    onClick: () => go('team'),
    className: "fx-shine fx-breathe",
    style: {
      clipPath: 'var(--clip-blade-both)',
      border: 'none',
      cursor: 'pointer',
      background: 'linear-gradient(180deg, var(--curse-400) 0%, var(--curse-600) 100%)',
      height: 76,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      fontFamily: 'var(--font-display)',
      fontSize: 30,
      color: '#fff',
      textTransform: 'uppercase',
      letterSpacing: 1,
      textShadow: '0 3px 0 rgba(0,0,0,0.35)'
    }
  }, "\u2694 Battle"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement(BladePlate, {
    tone: "ink",
    onClick: () => go('team')
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 19
    }
  }, "\uD83E\uDD1D"), /*#__PURE__*/React.createElement("div", {
    className: "ca-h3",
    style: {
      fontSize: 13,
      marginTop: 2
    }
  }, "Private Match"), /*#__PURE__*/React.createElement("div", {
    className: "ca-body-sm",
    style: {
      fontSize: 10
    }
  }, "Challenge a friend"))), /*#__PURE__*/React.createElement(BladePlate, {
    tone: "ink",
    onClick: () => go('team')
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 19
    }
  }, "\uD83D\uDDFA"), /*#__PURE__*/React.createElement("div", {
    className: "ca-h3",
    style: {
      fontSize: 13,
      marginTop: 2
    }
  }, "Missions"), /*#__PURE__*/React.createElement("div", {
    className: "ca-body-sm",
    style: {
      fontSize: 10
    }
  }, "Student Era \xB7 3/9")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      padding: '10px 12px',
      clipPath: 'var(--clip-blade)',
      background: 'var(--ink-800)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "fx-shine",
    style: {
      width: 40,
      height: 40,
      clipPath: 'var(--clip-blade-both)',
      background: 'linear-gradient(180deg, var(--gold-300), var(--gold-500))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 18
    }
  }, "\uD83C\uDF81"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ca-h3",
    style: {
      fontSize: 12
    }
  }, "Arena Pass \xB7 Tier 7"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(ProgressBar, {
    value: 7,
    max: 10,
    tone: "energy",
    height: 8
  }))), /*#__PURE__*/React.createElement(Button, {
    variant: "gold",
    size: "sm"
  }, "Claim"))));
}

/* ── TEAM BUILDER ────────────────────────────────────────────────────── */
function TeamV2({
  go
}) {
  const [picked, setPicked] = React.useState(['yuji', 'megumi', 'nobara']);
  const toggle = id => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : p.length < 3 ? [...p, id] : p);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(AmbientField, null), /*#__PURE__*/React.createElement(HudV2, null), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px 8px',
      position: 'relative',
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement(SectionBanner, null, "Assemble Your Trio"), /*#__PURE__*/React.createElement("div", {
    className: "ca-h1",
    style: {
      fontSize: 28,
      marginTop: 6
    }
  }, "Team Builder")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 2,
      padding: '4px 16px 10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '8%',
      right: '8%',
      bottom: -7,
      height: 22,
      background: 'radial-gradient(ellipse, rgba(139,63,240,0.5), transparent 70%)',
      filter: 'blur(6px)'
    }
  }), [0, 1, 2].map(i => {
    const c = window.CA_ROSTER.find(r => r.id === picked[i]);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flex: 1,
        aspectRatio: '3/4.4',
        clipPath: 'var(--clip-blade-both)',
        background: c ? 'var(--ink-950)' : 'var(--ink-900)',
        padding: c ? 2.5 : 0,
        position: 'relative'
      }
    }, c ? /*#__PURE__*/React.createElement("img", {
      src: c.portrait,
      alt: c.name,
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        clipPath: 'var(--clip-blade-both)'
      }
    }) : /*#__PURE__*/React.createElement("div", {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px dashed var(--ink-500)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "ca-label"
    }, "Slot ", i + 1)));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      padding: '2px 16px 10px',
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 8,
      alignContent: 'start',
      position: 'relative',
      zIndex: 2
    }
  }, window.CA_ROSTER.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    onClick: () => toggle(c.id),
    className: picked.includes(c.id) ? '' : '',
    style: {
      position: 'relative',
      aspectRatio: '3/4',
      clipPath: 'var(--clip-blade)',
      cursor: 'pointer',
      background: picked.includes(c.id) ? 'var(--curse-400)' : 'var(--ink-950)',
      padding: 2.5
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: c.portrait,
    alt: c.name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      clipPath: 'var(--clip-blade)',
      filter: picked.includes(c.id) ? 'none' : 'saturate(0.85)'
    }
  }), picked.includes(c.id) && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 20,
      height: 20,
      borderRadius: '50%',
      background: 'var(--curse-500)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      fontWeight: 900,
      border: '2px solid var(--ink-950)'
    }
  }, "\u2713")))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 16px 14px',
      position: 'relative',
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    disabled: picked.length !== 3,
    onClick: () => go('combat')
  }, "Enter Arena")));
}

/* ── ROSTER ──────────────────────────────────────────────────────────── */
function RosterV2() {
  const [filter, setFilter] = React.useState('All');
  const [detail, setDetail] = React.useState(null);
  const factions = ['All', 'Tokyo', 'Kyoto', 'Sorcerer'];
  const roster = window.CA_ROSTER.filter(c => filter === 'All' || c.faction === filter);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(AmbientField, null), /*#__PURE__*/React.createElement(HudV2, null), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px 10px',
      position: 'relative',
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement(SectionBanner, null, "Collection \xB7 19 Unlocked"), /*#__PURE__*/React.createElement("div", {
    className: "ca-h1",
    style: {
      fontSize: 28,
      marginTop: 6
    }
  }, "Roster")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 7,
      padding: '0 16px 12px',
      position: 'relative',
      zIndex: 2
    }
  }, factions.map(f => /*#__PURE__*/React.createElement("button", {
    key: f,
    onClick: () => setFilter(f),
    className: "ca-label",
    style: {
      padding: '7px 13px',
      clipPath: 'var(--clip-blade)',
      border: 'none',
      background: filter === f ? 'var(--curse-600)' : 'var(--ink-800)',
      color: filter === f ? '#fff' : 'var(--text-on-dark-dim)',
      cursor: 'pointer'
    }
  }, f))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      padding: '0 16px 16px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12,
      alignContent: 'start',
      position: 'relative',
      zIndex: 2
    }
  }, roster.map(c => /*#__PURE__*/React.createElement(Card, {
    key: c.id,
    name: c.name,
    faction: c.faction,
    rarity: c.rarity,
    portraitUrl: c.portrait,
    onClick: () => setDetail(c)
  }))), /*#__PURE__*/React.createElement(Sheet, {
    open: !!detail,
    title: detail ? detail.name : '',
    onClose: () => setDetail(null)
  }, detail && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "teal"
  }, detail.faction), /*#__PURE__*/React.createElement(Badge, {
    tone: "curse"
  }, detail.role), /*#__PURE__*/React.createElement(Badge, {
    tone: "gold"
  }, detail.rarity)), (window.CA_SKILLS[detail.id] || window.CA_SKILLS.yuji).map(s => /*#__PURE__*/React.createElement(SkillCard, {
    key: s.name,
    name: s.name,
    cost: s.cost,
    cooldown: s.cooldown,
    effect: s.effect,
    state: "ready"
  })))));
}
Object.assign(window, {
  LobbyV2,
  TeamV2,
  RosterV2,
  AmbientField,
  BladePlate,
  SectionBanner,
  HudV2
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app-v2/ScreensV2A.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app-v2/ScreensV2B.jsx
try { (() => {
/* Cursed Arena V2 — Combat + Results. Versus header, perspective battlefield,
   focused-technique command console, burst-ray victory. */

const DSv2b = window.CursedArenaDesignSystem_845983;
const {
  Button: BtnV2,
  Badge: BadgeV2,
  ProgressBar: BarV2,
  EnergyPip: PipV2,
  CurrencyPill: CurV2,
  Sheet: SheetV2
} = DSv2b;

/* Cut-corner fighter card */
function FighterCardV2({
  c,
  hp,
  side,
  selected,
  targetable,
  onClick
}) {
  const rim = selected ? 'var(--gold-400)' : targetable ? 'var(--teal-400)' : 'var(--ink-950)';
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    className: targetable ? 'fx-target-pulse' : '',
    style: {
      width: 104,
      border: 'none',
      background: rim,
      padding: 2.5,
      cursor: 'pointer',
      clipPath: 'var(--clip-blade)',
      position: 'relative',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      clipPath: 'var(--clip-blade)',
      background: 'var(--ink-800)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: c.portrait,
    alt: c.name,
    style: {
      width: '100%',
      height: 88,
      objectFit: 'cover',
      objectPosition: 'top',
      display: 'block'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 88,
      background: side === 'enemy' ? 'linear-gradient(180deg, transparent 55%, rgba(216,32,59,0.28))' : 'linear-gradient(180deg, transparent 55%, rgba(14,11,22,0.55))'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '5px 7px 7px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ca-label",
    style: {
      fontSize: 8.5,
      color: 'var(--text-on-dark)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, c.name.split(' ')[0]), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(BarV2, {
    value: hp,
    max: 100,
    tone: side === 'enemy' ? 'danger' : 'hp',
    height: 8
  }))), selected && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 4,
      left: 4,
      clipPath: 'var(--clip-tag)',
      background: 'var(--gold-400)',
      color: 'var(--ink-950)',
      fontSize: 8,
      fontWeight: 900,
      padding: '2px 10px 2px 5px',
      textTransform: 'uppercase'
    }
  }, "Active")));
}

/* ── COMBAT ──────────────────────────────────────────────────────────── */
function CombatV2({
  go
}) {
  const allies = window.CA_ROSTER.slice(0, 3);
  const enemies = [window.CA_ROSTER[5], window.CA_ROSTER[3], window.CA_ROSTER[4]];
  const [caster, setCaster] = React.useState('yuji');
  const [tab, setTab] = React.useState(0);
  const [armed, setArmed] = React.useState(false);
  const [queued, setQueued] = React.useState([]);
  const [review, setReview] = React.useState(false);
  const skills = window.CA_SKILLS[caster] || window.CA_SKILLS.yuji;
  const skill = skills[tab];
  const pickTarget = enemy => {
    if (!armed) return;
    setQueued(q => [...q.filter(x => x.caster !== caster), {
      caster,
      skill,
      target: enemy.name
    }]);
    setArmed(false);
    const next = allies.find(a => a.id !== caster && !queued.some(q2 => q2.caster === a.id));
    if (next) {
      setCaster(next.id);
      setTab(0);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #1A0F2E 0%, var(--ink-950) 40%)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '12px 14px 6px',
      position: 'relative',
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(BarV2, {
    value: 269,
    max: 300,
    tone: "hp",
    height: 10
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 34,
      height: 34,
      clipPath: 'var(--clip-blade-both)',
      background: 'linear-gradient(180deg, var(--gold-300), var(--gold-500))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-display)',
      fontSize: 13,
      color: 'var(--ink-950)',
      transform: 'rotate(45deg)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      transform: 'rotate(-45deg)'
    }
  }, "VS")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(BarV2, {
    value: 246,
    max: 300,
    tone: "danger",
    height: 10
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '2px 14px 6px',
      position: 'relative',
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      clipPath: 'var(--clip-tag)',
      background: 'var(--gold-400)',
      padding: '4px 18px 4px 10px',
      transform: 'skewX(-6deg)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ca-eyebrow",
    style: {
      color: 'var(--ink-950)',
      display: 'inline-block',
      transform: 'skewX(6deg)'
    }
  }, "Your Turn")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      alignItems: 'center',
      padding: '5px 9px',
      borderRadius: 'var(--r-pill)',
      background: 'var(--ink-900)',
      boxShadow: 'var(--shadow-inset-well)'
    }
  }, ['B', 'B', 'T', 'F'].map((t, i) => /*#__PURE__*/React.createElement(PipV2, {
    key: i,
    type: t,
    size: 17
  })), /*#__PURE__*/React.createElement(PipV2, {
    type: "C",
    size: 17,
    filled: false
  })), /*#__PURE__*/React.createElement("span", {
    className: "ca-stat",
    style: {
      fontSize: 12,
      color: 'var(--text-on-dark-dim)'
    }
  }, "0:24")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      gap: 8,
      padding: '4px 0 2px',
      position: 'relative',
      zIndex: 2
    }
  }, enemies.map((c, i) => /*#__PURE__*/React.createElement(FighterCardV2, {
    key: c.id,
    c: c,
    hp: [84, 100, 62][i],
    side: "enemy",
    targetable: armed,
    onClick: () => pickTarget(c)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 46,
      position: 'relative',
      margin: '2px 0',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '-24%',
      right: '-24%',
      top: '10%',
      bottom: '-30%',
      backgroundImage: 'linear-gradient(rgba(139,63,240,0.16) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(139,63,240,0.16) 1.5px, transparent 1.5px)',
      backgroundSize: '44px 44px',
      transform: 'perspective(300px) rotateX(55deg)',
      transformOrigin: '50% 0%'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      clipPath: 'var(--clip-banner)',
      background: 'rgba(14,11,22,0.85)',
      padding: '8px 30px',
      border: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ca-body-sm",
    style: {
      fontSize: 12,
      color: armed ? 'var(--teal-400)' : 'var(--text-on-dark-dim)'
    }
  }, armed ? `Choose a target — ${skill.name}` : queued.length ? `${queued.length}/3 actions queued` : 'Pick a fighter, arm a technique')))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      gap: 8,
      padding: '2px 0 4px',
      position: 'relative',
      zIndex: 2
    }
  }, allies.map((c, i) => /*#__PURE__*/React.createElement(FighterCardV2, {
    key: c.id,
    c: c,
    hp: [100, 78, 91][i],
    side: "ally",
    selected: caster === c.id,
    onClick: () => {
      setCaster(c.id);
      setTab(0);
      setArmed(false);
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--ink-900)',
      borderTop: '2px solid var(--ink-950)',
      padding: '8px 14px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      position: 'relative',
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 6
    }
  }, skills.map((s, i) => /*#__PURE__*/React.createElement("button", {
    key: s.name,
    onClick: () => {
      setTab(i);
      setArmed(false);
    },
    style: {
      clipPath: 'var(--clip-blade)',
      border: 'none',
      cursor: 'pointer',
      padding: '7px 4px 6px',
      background: i === tab ? 'linear-gradient(180deg, var(--curse-400), var(--curse-600))' : 'var(--ink-700)',
      opacity: s.state !== 'ready' ? 0.5 : 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ca-label",
    style: {
      fontSize: 8,
      color: i === tab ? '#fff' : 'var(--text-on-dark-dim)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, s.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2.5,
      justifyContent: 'center',
      marginTop: 4
    }
  }, s.cost.map((t, j) => /*#__PURE__*/React.createElement(PipV2, {
    key: j,
    type: t,
    size: 9
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      clipPath: 'var(--clip-blade)',
      background: 'var(--ink-800)',
      padding: '10px 12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ca-h3",
    style: {
      fontSize: 14
    }
  }, skill.name), /*#__PURE__*/React.createElement("div", {
    className: "ca-body-sm",
    style: {
      fontSize: 11,
      marginTop: 2
    }
  }, skill.effect), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginTop: 6,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ca-stat",
    style: {
      fontSize: 10,
      color: 'var(--gold-400)'
    }
  }, "CD ", skill.cooldown), skill.state !== 'ready' && /*#__PURE__*/React.createElement(BadgeV2, {
    tone: "red"
  }, skill.state === 'cooldown' ? 'On Cooldown' : skill.state === 'energy' ? 'Need Energy' : 'Stunned'))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(BtnV2, {
    variant: armed ? 'gold' : 'primary',
    size: "md",
    disabled: skill.state !== 'ready',
    onClick: () => setArmed(a => !a)
  }, armed ? 'Armed ▲' : 'Use'))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(BtnV2, {
    variant: "ghost",
    size: "sm",
    onClick: () => {
      setQueued([]);
      setArmed(false);
    }
  }, "Reset"), /*#__PURE__*/React.createElement(BtnV2, {
    variant: "primary",
    size: "sm",
    fullWidth: true,
    disabled: queued.length === 0,
    onClick: () => setReview(true)
  }, "Review Queue (", queued.length, ")"))), /*#__PURE__*/React.createElement(SheetV2, {
    open: review,
    title: "Queue Review",
    onClose: () => setReview(false)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, queued.map((q, i) => {
    const c = window.CA_ROSTER.find(r => r.id === q.caster);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        clipPath: 'var(--clip-blade)',
        background: 'var(--ink-700)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "ca-stat",
      style: {
        fontSize: 14,
        color: 'var(--gold-400)'
      }
    }, i + 1), /*#__PURE__*/React.createElement("img", {
      src: c.portrait,
      alt: c.name,
      style: {
        width: 34,
        height: 34,
        borderRadius: '50%',
        objectFit: 'cover',
        border: '2px solid var(--ink-950)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "ca-h3",
      style: {
        fontSize: 12
      }
    }, q.skill.name), /*#__PURE__*/React.createElement("div", {
      className: "ca-body-sm",
      style: {
        fontSize: 11
      }
    }, "\u2192 ", q.target)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 3
      }
    }, q.skill.cost.map((t, j) => /*#__PURE__*/React.createElement(PipV2, {
      key: j,
      type: t,
      size: 13
    }))));
  }), /*#__PURE__*/React.createElement("div", {
    className: "ca-body-sm",
    style: {
      fontSize: 12
    }
  }, "Wild costs are paid from remaining energy, left to right."), /*#__PURE__*/React.createElement(BtnV2, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: () => go('results')
  }, "Confirm Queue"))));
}

/* ── RESULTS ─────────────────────────────────────────────────────────── */
function ResultsV2({
  go
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      padding: 24,
      textAlign: 'center',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "fx-rays",
    style: {
      position: 'absolute',
      width: 900,
      height: 900,
      left: '50%',
      top: '30%',
      marginLeft: -450,
      marginTop: -450,
      borderRadius: '50%'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(ellipse 90% 60% at 50% 24%, rgba(240,168,46,0.2), transparent 65%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "ca-display-hero ca-text-gradient-gold fx-pop-in",
    style: {
      position: 'relative',
      fontSize: 62,
      textShadow: 'none'
    }
  }, "Victory"), /*#__PURE__*/React.createElement("div", {
    className: "fx-pop-in",
    style: {
      position: 'relative',
      width: 170,
      clipPath: 'var(--clip-blade-both)',
      background: 'var(--gold-400)',
      padding: 3,
      animationDelay: '0.1s'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/portraits/yuji-black-flash.svg",
    alt: "MVP fighter",
    style: {
      width: '100%',
      display: 'block',
      clipPath: 'var(--clip-blade-both)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "fx-pop-in",
    style: {
      position: 'relative',
      animationDelay: '0.2s'
    }
  }, /*#__PURE__*/React.createElement(BadgeV2, {
    tone: "gold"
  }, "MVP \xB7 Yuji Itadori")), /*#__PURE__*/React.createElement("div", {
    className: "fx-pop-in",
    style: {
      position: 'relative',
      display: 'flex',
      gap: 10,
      animationDelay: '0.3s'
    }
  }, /*#__PURE__*/React.createElement(CurV2, {
    kind: "gold",
    amount: 240
  }), /*#__PURE__*/React.createElement(CurV2, {
    kind: "gem",
    amount: 5
  }), /*#__PURE__*/React.createElement(BadgeV2, {
    tone: "curse"
  }, "+38 XP"), /*#__PURE__*/React.createElement(BadgeV2, {
    tone: "gold"
  }, "\uD83C\uDFC6 +30")), /*#__PURE__*/React.createElement("div", {
    className: "fx-pop-in",
    style: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      width: '100%',
      maxWidth: 280,
      animationDelay: '0.4s'
    }
  }, /*#__PURE__*/React.createElement(BtnV2, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: () => go('team')
  }, "Battle Again"), /*#__PURE__*/React.createElement(BtnV2, {
    variant: "ghost",
    size: "md",
    fullWidth: true,
    onClick: () => go('home')
  }, "Home")));
}
Object.assign(window, {
  CombatV2,
  ResultsV2,
  FighterCardV2
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app-v2/ScreensV2B.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/App.jsx
try { (() => {
/* Cursed Arena — app shell: phone canvas, screen router, tab bar. */

const {
  TabBar
} = window.CursedArenaDesignSystem_845983;
function App() {
  const [screen, setScreen] = React.useState('home');
  const go = setScreen;
  const inBattle = screen === 'combat' || screen === 'results';
  const body = {
    home: /*#__PURE__*/React.createElement(window.LobbyScreen, {
      go: go
    }),
    roster: /*#__PURE__*/React.createElement(window.RosterScreen, null),
    team: /*#__PURE__*/React.createElement(window.TeamScreen, {
      go: go
    }),
    combat: /*#__PURE__*/React.createElement(window.CombatScreen, {
      go: go
    }),
    results: /*#__PURE__*/React.createElement(window.ResultsScreen, {
      go: go
    })
  }[screen];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 390,
      height: 844,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-app-grad)',
      color: 'var(--text-on-dark)',
      borderRadius: 24,
      overflow: 'hidden',
      border: '2px solid var(--ink-950)',
      fontFamily: 'var(--font-ui)',
      position: 'relative'
    },
    "data-screen-label": screen
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column'
    }
  }, body), !inBattle && /*#__PURE__*/React.createElement(TabBar, {
    activeId: screen === 'team' ? 'battle' : screen,
    onChange: id => go(id === 'battle' ? 'team' : id),
    tabs: [{
      id: 'home',
      label: 'Home',
      icon: '🏠'
    }, {
      id: 'roster',
      label: 'Roster',
      icon: '🗂'
    }, {
      id: 'battle',
      label: 'Battle',
      icon: '⚔',
      hero: true
    }, {
      id: 'missions',
      label: 'Missions',
      icon: '🗺'
    }, {
      id: 'profile',
      label: 'Profile',
      icon: '👤'
    }]
  }));
}
window.CAApp = App;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/Screens.jsx
try { (() => {
/* Cursed Arena — UI kit screens (Lobby, Roster, Team, Combat, Results).
   Loaded as text/babel; exposes screens on window for App.jsx. */

const DS = window.CursedArenaDesignSystem_845983;
const {
  Button,
  IconButton,
  Card,
  SkillCard,
  Badge,
  ProgressBar,
  EnergyPip,
  CurrencyPill,
  Sheet
} = DS;

/* ── Shared chrome ─────────────────────────────────────────────────── */

function TopHud({
  onStore
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px 10px',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 42,
      height: 42,
      borderRadius: 'var(--r-sm)',
      border: '2px solid var(--ink-950)',
      boxShadow: 'var(--bevel-plate)',
      background: 'linear-gradient(180deg, var(--curse-400), var(--curse-600))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-display)',
      fontSize: 18,
      color: '#fff'
    }
  }, "28"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "ca-h3",
    style: {
      fontSize: 13
    }
  }, "KaidoMain"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 74,
      marginTop: 3
    }
  }, /*#__PURE__*/React.createElement(ProgressBar, {
    value: 62,
    max: 100,
    tone: "xp",
    height: 7
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(CurrencyPill, {
    kind: "gold",
    amount: 4820,
    onAdd: onStore
  }), /*#__PURE__*/React.createElement(CurrencyPill, {
    kind: "gem",
    amount: 128,
    onAdd: onStore
  })));
}
function ScreenTitle({
  children,
  sub
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 20px 12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ca-h1",
    style: {
      fontSize: 30
    }
  }, children), sub && /*#__PURE__*/React.createElement("div", {
    className: "ca-body-sm",
    style: {
      marginTop: 2
    }
  }, sub));
}

/* ── Lobby / Home ──────────────────────────────────────────────────── */

function LobbyScreen({
  go
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement(TopHud, null), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '0 16px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      borderRadius: 'var(--r-xl)',
      overflow: 'hidden',
      border: '3px solid var(--ink-950)',
      boxShadow: 'var(--shadow-lg)',
      minHeight: 300,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/portraits/gojo-young.svg",
    alt: "Featured fighter poster",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(180deg, transparent 35%, rgba(14,11,22,0.92) 88%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "gold"
  }, "Season 4"), /*#__PURE__*/React.createElement(Badge, {
    tone: "curse"
  }, "Hidden Inventory")), /*#__PURE__*/React.createElement("div", {
    className: "ca-h2",
    style: {
      fontSize: 24
    }
  }, "Welcome to Jujutsu High"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: () => go('team')
  }, "\u2694\xA0 Battle"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(ModeTile, {
    emoji: "\uD83E\uDD1D",
    label: "Private Match",
    sub: "Play a friend",
    onClick: () => go('team')
  }), /*#__PURE__*/React.createElement(ModeTile, {
    emoji: "\uD83D\uDDFA",
    label: "Missions",
    sub: "Student Era 3/9",
    onClick: () => go('team')
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 14px',
      borderRadius: 'var(--r-md)',
      background: 'var(--ink-800)',
      border: '2px solid var(--ink-950)',
      boxShadow: 'var(--shadow-sm)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 'var(--r-sm)',
      background: 'linear-gradient(180deg, var(--gold-300), var(--gold-500))',
      border: '2px solid var(--ink-950)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 20
    }
  }, "\uD83C\uDF81"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ca-h3",
    style: {
      fontSize: 13
    }
  }, "Arena Pass"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 5
    }
  }, /*#__PURE__*/React.createElement(ProgressBar, {
    value: 7,
    max: 10,
    tone: "energy",
    height: 9
  }))), /*#__PURE__*/React.createElement(Button, {
    variant: "gold",
    size: "sm"
  }, "Claim"))));
}
function ModeTile({
  emoji,
  label,
  sub,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 4,
      padding: '14px 14px 12px',
      borderRadius: 'var(--r-md)',
      background: 'var(--ink-800)',
      border: '2px solid var(--ink-950)',
      boxShadow: 'var(--bevel-plate), 0 3px 0 var(--ink-950)',
      cursor: 'pointer',
      textAlign: 'left',
      color: 'var(--text-on-dark)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22
    }
  }, emoji), /*#__PURE__*/React.createElement("span", {
    className: "ca-h3",
    style: {
      fontSize: 14
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "ca-body-sm",
    style: {
      fontSize: 11
    }
  }, sub));
}

/* ── Roster / Collection ───────────────────────────────────────────── */

function RosterScreen() {
  const [filter, setFilter] = React.useState('All');
  const [detail, setDetail] = React.useState(null);
  const factions = ['All', 'Tokyo', 'Kyoto', 'Sorcerer'];
  const roster = window.CA_ROSTER.filter(c => filter === 'All' || c.faction === filter);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(TopHud, null), /*#__PURE__*/React.createElement(ScreenTitle, {
    sub: "19 fighters unlocked \xB7 Student Era"
  }, "Roster"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      padding: '0 16px 12px',
      overflowX: 'auto'
    }
  }, factions.map(f => /*#__PURE__*/React.createElement("button", {
    key: f,
    onClick: () => setFilter(f),
    className: "ca-label",
    style: {
      padding: '7px 14px',
      borderRadius: 'var(--r-pill)',
      border: '2px solid var(--ink-950)',
      background: filter === f ? 'var(--curse-600)' : 'var(--ink-800)',
      color: filter === f ? '#fff' : 'var(--text-on-dark-dim)',
      cursor: 'pointer',
      whiteSpace: 'nowrap'
    }
  }, f))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '0 16px 16px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12,
      alignContent: 'start'
    }
  }, roster.map(c => /*#__PURE__*/React.createElement(Card, {
    key: c.id,
    name: c.name,
    faction: c.faction,
    rarity: c.rarity,
    portraitUrl: c.portrait,
    onClick: () => setDetail(c)
  }))), /*#__PURE__*/React.createElement(Sheet, {
    open: !!detail,
    title: detail ? detail.name : '',
    onClose: () => setDetail(null)
  }, detail && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "teal"
  }, detail.faction), /*#__PURE__*/React.createElement(Badge, {
    tone: "curse"
  }, detail.role), /*#__PURE__*/React.createElement(Badge, {
    tone: "gold"
  }, detail.rarity)), (window.CA_SKILLS[detail.id] || window.CA_SKILLS.yuji).map(s => /*#__PURE__*/React.createElement(SkillCard, {
    key: s.name,
    name: s.name,
    cost: s.cost,
    cooldown: s.cooldown,
    effect: s.effect,
    state: "ready"
  })))));
}

/* ── Team builder (pick 3) ─────────────────────────────────────────── */

function TeamScreen({
  go
}) {
  const [picked, setPicked] = React.useState(['yuji', 'megumi', 'nobara']);
  const toggle = id => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : p.length < 3 ? [...p, id] : p);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement(TopHud, null), /*#__PURE__*/React.createElement(ScreenTitle, {
    sub: "Pick 3 fighters for your trio"
  }, "Team Builder"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      padding: '0 16px 12px'
    }
  }, [0, 1, 2].map(i => {
    const c = window.CA_ROSTER.find(r => r.id === picked[i]);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flex: 1,
        aspectRatio: '3/4',
        borderRadius: 'var(--r-md)',
        border: c ? '3px solid var(--curse-400)' : '3px dashed var(--ink-500)',
        overflow: 'hidden',
        background: 'var(--ink-800)',
        boxShadow: c ? 'var(--aura-curse)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, c ? /*#__PURE__*/React.createElement("img", {
      src: c.portrait,
      alt: c.name,
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
      }
    }) : /*#__PURE__*/React.createElement("span", {
      className: "ca-label"
    }, "Slot ", i + 1));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '0 16px 12px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 10,
      alignContent: 'start'
    }
  }, window.CA_ROSTER.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    onClick: () => toggle(c.id),
    style: {
      borderRadius: 'var(--r-sm)',
      overflow: 'hidden',
      border: picked.includes(c.id) ? '3px solid var(--curse-400)' : '3px solid var(--ink-950)',
      cursor: 'pointer',
      position: 'relative',
      aspectRatio: '3/4'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: c.portrait,
    alt: c.name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }), picked.includes(c.id) && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: 'var(--curse-500)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      fontWeight: 900,
      border: '2px solid var(--ink-950)'
    }
  }, "\u2713")))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 16px 16px'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    disabled: picked.length !== 3,
    onClick: () => go('combat')
  }, "Enter Arena")));
}

/* ── Combat ────────────────────────────────────────────────────────── */

function FighterToken({
  c,
  hp,
  side,
  selected,
  targetable,
  dead,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 5,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      width: 92,
      opacity: dead ? 0.35 : 1,
      filter: dead ? 'grayscale(1)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 68,
      height: 68,
      borderRadius: '50%',
      overflow: 'hidden',
      position: 'relative',
      border: selected ? '3px solid var(--gold-400)' : targetable ? '3px solid var(--teal-400)' : '3px solid var(--ink-950)',
      boxShadow: selected ? 'var(--aura-gold)' : targetable ? 'var(--aura-teal)' : 'var(--shadow-sm)',
      animation: targetable ? 'ca-pulse 1.2s ease-in-out infinite' : 'none'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: c.portrait,
    alt: c.name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      objectPosition: 'top'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 80
    }
  }, /*#__PURE__*/React.createElement(ProgressBar, {
    value: hp,
    max: 100,
    tone: side === 'enemy' ? 'danger' : 'hp',
    height: 9
  })), /*#__PURE__*/React.createElement("span", {
    className: "ca-label",
    style: {
      fontSize: 9,
      color: 'var(--text-on-dark-dim)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      maxWidth: 88
    }
  }, c.name.split(' ')[0]));
}
function CombatScreen({
  go
}) {
  const allies = window.CA_ROSTER.slice(0, 3);
  const enemies = [window.CA_ROSTER[5], window.CA_ROSTER[3], window.CA_ROSTER[4]];
  const [caster, setCaster] = React.useState('yuji');
  const [skill, setSkill] = React.useState(null);
  const [queued, setQueued] = React.useState([]);
  const [review, setReview] = React.useState(false);
  const skills = window.CA_SKILLS[caster] || window.CA_SKILLS.yuji;
  const pickTarget = enemy => {
    if (!skill) return;
    setQueued(q => [...q.filter(x => x.caster !== caster), {
      caster,
      skill,
      target: enemy.name
    }]);
    setSkill(null);
    const next = allies.find(a => a.id !== caster && !queued.some(q2 => q2.caster === a.id));
    if (next) setCaster(next.id);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px 8px'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "gold"
  }, "Your Turn"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 5
    }
  }, ['B', 'B', 'T', 'F'].map((t, i) => /*#__PURE__*/React.createElement(EnergyPip, {
    key: i,
    type: t,
    size: 18
  })), /*#__PURE__*/React.createElement(EnergyPip, {
    type: "C",
    size: 18,
    filled: false
  })), /*#__PURE__*/React.createElement("span", {
    className: "ca-stat",
    style: {
      fontSize: 12
    }
  }, "0:24")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      gap: 6,
      padding: '6px 0'
    }
  }, enemies.map((c, i) => /*#__PURE__*/React.createElement(FighterToken, {
    key: c.id,
    c: c,
    hp: [84, 100, 62][i],
    side: "enemy",
    targetable: !!skill,
    dead: false,
    onClick: () => pickTarget(c)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      margin: '4px 16px',
      borderRadius: 'var(--r-lg)',
      border: '2px solid var(--ink-950)',
      background: 'radial-gradient(ellipse at 50% 30%, var(--ink-700), var(--ink-900))',
      boxShadow: 'var(--shadow-inset-well)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 64
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ca-body-sm",
    style: {
      padding: '0 20px',
      textAlign: 'center'
    }
  }, skill ? `Choose a target for ${skill.name}` : queued.length ? `${queued.length}/3 actions queued` : 'Select a fighter, then a technique')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      gap: 6,
      padding: '6px 0'
    }
  }, allies.map((c, i) => /*#__PURE__*/React.createElement(FighterToken, {
    key: c.id,
    c: c,
    hp: [100, 78, 91][i],
    side: "ally",
    selected: caster === c.id,
    dead: false,
    onClick: () => {
      setCaster(c.id);
      setSkill(null);
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 16px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      background: 'var(--ink-900)',
      borderTop: '2px solid var(--ink-950)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8
    }
  }, skills.map(s => /*#__PURE__*/React.createElement(SkillCard, {
    key: s.name,
    name: s.name,
    cost: s.cost,
    cooldown: s.cooldown,
    effect: skill && skill.name === s.name ? s.effect : undefined,
    state: s.state,
    onClick: () => setSkill(s)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    onClick: () => {
      setQueued([]);
      setSkill(null);
    }
  }, "Reset"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    fullWidth: true,
    disabled: queued.length === 0,
    onClick: () => setReview(true)
  }, "Review Queue (", queued.length, ")"))), /*#__PURE__*/React.createElement(Sheet, {
    open: review,
    title: "Queue Review",
    onClose: () => setReview(false)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, queued.map((q, i) => {
    const c = window.CA_ROSTER.find(r => r.id === q.caster);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 'var(--r-md)',
        background: 'var(--ink-700)',
        border: '2px solid var(--ink-950)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "ca-stat",
      style: {
        fontSize: 13,
        color: 'var(--gold-400)'
      }
    }, i + 1), /*#__PURE__*/React.createElement("img", {
      src: c.portrait,
      alt: c.name,
      style: {
        width: 34,
        height: 34,
        borderRadius: '50%',
        objectFit: 'cover',
        border: '2px solid var(--ink-950)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "ca-h3",
      style: {
        fontSize: 12
      }
    }, q.skill.name), /*#__PURE__*/React.createElement("div", {
      className: "ca-body-sm",
      style: {
        fontSize: 11
      }
    }, "\u2192 ", q.target)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 3
      }
    }, q.skill.cost.map((t, j) => /*#__PURE__*/React.createElement(EnergyPip, {
      key: j,
      type: t,
      size: 13
    }))));
  }), /*#__PURE__*/React.createElement("div", {
    className: "ca-body-sm",
    style: {
      fontSize: 12
    }
  }, "Wild costs are paid from remaining energy, left to right."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: () => go('results')
  }, "Confirm Queue"))));
}

/* ── Results ───────────────────────────────────────────────────────── */

function ResultsScreen({
  go
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 18,
      padding: 24,
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(ellipse 90% 55% at 50% 20%, rgba(240,168,46,0.22), transparent 70%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "ca-display-hero ca-text-gradient-gold",
    style: {
      position: 'relative'
    }
  }, "Victory"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 160,
      borderRadius: 'var(--r-lg)',
      overflow: 'hidden',
      border: '3px solid var(--gold-400)',
      boxShadow: 'var(--aura-gold), var(--shadow-lg)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/portraits/yuji-black-flash.svg",
    alt: "MVP fighter",
    style: {
      width: '100%',
      display: 'block'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "gold"
  }, "MVP \xB7 Yuji Itadori")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(CurrencyPill, {
    kind: "gold",
    amount: 240
  }), /*#__PURE__*/React.createElement(CurrencyPill, {
    kind: "gem",
    amount: 5
  }), /*#__PURE__*/React.createElement(Badge, {
    tone: "curse"
  }, "+38 XP")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      width: '100%',
      maxWidth: 280
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: () => go('team')
  }, "Battle Again"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "md",
    fullWidth: true,
    onClick: () => go('home')
  }, "Home")));
}
Object.assign(window, {
  LobbyScreen,
  RosterScreen,
  TeamScreen,
  CombatScreen,
  ResultsScreen,
  TopHud
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/Screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/mock-data.js
try { (() => {
/* Cursed Arena — shared mock data for the UI kit prototype. */
window.CA_ROSTER = [{
  id: 'yuji',
  name: 'Yuji Itadori',
  faction: 'Tokyo',
  rarity: 'rare',
  role: 'Bruiser',
  portrait: '../../assets/portraits/yuji-black-flash.svg'
}, {
  id: 'megumi',
  name: 'Megumi Fushiguro',
  faction: 'Tokyo',
  rarity: 'rare',
  role: 'Control',
  portrait: '../../assets/portraits/megumi-fushiguro.svg'
}, {
  id: 'nobara',
  name: 'Nobara Kugisaki',
  faction: 'Tokyo',
  rarity: 'rare',
  role: 'Ranged',
  portrait: '../../assets/portraits/nobara-kugisaki.svg'
}, {
  id: 'maki',
  name: 'Maki Zenin',
  faction: 'Tokyo',
  rarity: 'epic',
  role: 'Weapons',
  portrait: '../../assets/portraits/maki-zenin.svg'
}, {
  id: 'toge',
  name: 'Toge Inumaki',
  faction: 'Tokyo',
  rarity: 'epic',
  role: 'Control',
  portrait: '../../assets/portraits/toge-inumaki.svg'
}, {
  id: 'todo',
  name: 'Aoi Todo',
  faction: 'Kyoto',
  rarity: 'epic',
  role: 'Bruiser',
  portrait: '../../assets/portraits/aoi-todo.svg'
}, {
  id: 'gojo',
  name: 'Satoru Gojo',
  faction: 'Sorcerer',
  rarity: 'legendary',
  role: 'Control',
  portrait: '../../assets/portraits/gojo-young.svg'
}, {
  id: 'yuta',
  name: 'Yuta Okkotsu',
  faction: 'Sorcerer',
  rarity: 'legendary',
  role: 'Defender',
  portrait: '../../assets/portraits/yuta-okkotsu-jjk-0.svg'
}];
window.CA_SKILLS = {
  yuji: [{
    name: 'Divergent Fist',
    cost: ['B', 'B'],
    cooldown: 0,
    effect: 'Delayed second hit, +12 dmg',
    state: 'ready'
  }, {
    name: 'Black Flash Setup',
    cost: ['B', 'X'],
    cooldown: 2,
    effect: 'Requires momentum stack',
    state: 'cooldown'
  }, {
    name: 'Reckless Guard',
    cost: ['F'],
    cooldown: 0,
    effect: '+destructible defense, self',
    state: 'ready'
  }, {
    name: 'Soul Bruise',
    cost: ['B', 'C'],
    cooldown: 1,
    effect: 'Bonus dmg vs marked target',
    state: 'ready'
  }],
  megumi: [{
    name: 'Divine Dogs: Nue',
    cost: ['T', 'T'],
    cooldown: 1,
    effect: 'Mark + soft control',
    state: 'ready'
  }, {
    name: 'Shikigami Scent',
    cost: ['T'],
    cooldown: 0,
    effect: 'Reveals queued enemy skill',
    state: 'ready'
  }, {
    name: 'Domain Ready Stance',
    cost: ['F', 'F'],
    cooldown: 2,
    effect: 'Blocks next control effect',
    state: 'energy'
  }, {
    name: 'Toad Pin',
    cost: ['T', 'X'],
    cooldown: 3,
    effect: 'Sure-hit vs airborne',
    state: 'ready'
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/mock-data.js", error: String((e && e.message) || e) }); }

__ds_ns.Card = __ds_scope.Card;

__ds_ns.SkillCard = __ds_scope.SkillCard;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.CurrencyPill = __ds_scope.CurrencyPill;

__ds_ns.EnergyPip = __ds_scope.EnergyPip;

__ds_ns.TabBar = __ds_scope.TabBar;

__ds_ns.Sheet = __ds_scope.Sheet;

})();
