import React from 'react';

/** Bottom tab bar — Home, Roster, Battle (elevated), Missions, Profile. */
export function TabBar({ tabs, activeId, onChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around',
      height: 'var(--tabbar-h)', paddingBottom: 'var(--safe-b)',
      background: 'var(--ink-900)', borderTop: '2px solid var(--ink-950)',
    }}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        const isHero = tab.hero;
        return (
          <button
            key={tab.id}
            onClick={() => onChange && onChange(tab.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 4, background: 'none', border: 'none', cursor: 'pointer',
              flex: 1, height: '100%', padding: '8px 4px 10px',
              transform: isHero ? 'translateY(-14px)' : 'none',
            }}
          >
            <div style={{
              width: isHero ? 56 : 32, height: isHero ? 56 : 32, borderRadius: isHero ? 'var(--r-lg)' : 'var(--r-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isHero ? 'linear-gradient(180deg, var(--curse-400), var(--curse-600))' : (isActive ? 'var(--ink-700)' : 'transparent'),
              border: isHero ? '2px solid var(--ink-950)' : 'none',
              boxShadow: isHero ? 'var(--bevel-plate), 0 4px 0 var(--curse-900)' : 'none',
              color: isActive || isHero ? '#fff' : 'var(--text-on-dark-muted)',
              fontSize: isHero ? 24 : 18,
            }}>
              {tab.icon}
            </div>
            <span className="ca-eyebrow" style={{ color: isActive ? 'var(--text-on-dark)' : 'var(--text-on-dark-muted)', fontSize: 9 }}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
