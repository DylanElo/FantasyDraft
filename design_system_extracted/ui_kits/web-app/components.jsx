// ────────────────────────────────────────────────────────────────────────
// components.jsx — shared atoms (icons, orbs, badges, buttons, toast)
// Exposes them on window so other Babel scripts can use them.
// ────────────────────────────────────────────────────────────────────────

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// ── Icons (Lucide family — round 2-2.5px stroke, currentColor) ──────────
const Icon = {
  ArrowRight: (p) => (
    <svg {...p} width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>),
  ArrowLeft: (p) => (
    <svg {...p} width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>),
  Draw: (p) => (
    <svg {...p} width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.34"/>
    </svg>),
  Check: (p) => (
    <svg {...p} width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>),
  X: (p) => (
    <svg {...p} width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>),
  Grid: (p) => (
    <svg {...p} width={p.size||19} height={p.size||19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>),
  Trophy: (p) => (
    <svg {...p} width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
    </svg>),
  Sparkles: (p) => (
    <svg {...p} width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>
    </svg>),
};

// ── Orb ─────────────────────────────────────────────────────────────────
function Orb({ kind = 'black', size = 'sm' }) {
  return <div className={`orb orb-${kind} ${size === 'lg' ? 'size-lg' : ''}`} title={kind} />;
}

// ── Faction badge ───────────────────────────────────────────────────────
function FactionBadge({ name }) {
  const f = FACTION[name] || 'other';
  return <span className={`faction-badge fac-${f}`}>{FACTION_LABEL[f]}</span>;
}

// ── Toast (controller) ──────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState('');
  const tRef = useRef(null);
  const push = useCallback((m) => {
    setMsg(m);
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setMsg(''), 2400);
  }, []);
  const node = msg ? <div className="toast show">{msg}</div> : null;
  return { push, node };
}

// ── Primary button with shine + audio click ────────────────────────────
function PrimaryButton({ children, onClick, type = 'primary' }) {
  const cn = type === 'ghost' ? 'btn-ghost' : 'btn-primary';
  return (
    <button
      className={cn}
      onMouseEnter={() => JJK.AudioBus.hover()}
      onClick={(e) => { JJK.AudioBus.click(); onClick && onClick(e); }}
    >
      {children}
    </button>
  );
}

// ── Skill row ──────────────────────────────────────────────────────────
function SkillRow({ char, skill }) {
  const isUlt = skillIsUlt(char, skill);
  return (
    <div className={`skill-item ${skillTypeClass(skill.classes)} ${isUlt ? 'is-ult' : ''}`}>
      <div className="skill-top">
        <span className="skill-name">{skill.name}</span>
        <div className="orbs">
          {(skill.energy || []).map((e, i) => <Orb key={i} kind={(e || 'none').toLowerCase()} />)}
        </div>
      </div>
      <div className="skill-desc">{skill.description}</div>
      <div className="skill-meta">
        <span>CD: {skill.cooldown && skill.cooldown !== 'None' && skill.cooldown !== '0' ? skill.cooldown : 'None'}</span>
        <span className="skill-class">{(skill.classes || '').split(',')[0].trim()}</span>
      </div>
    </div>
  );
}

Object.assign(window, { Icon, Orb, FactionBadge, useToast, PrimaryButton, SkillRow });
