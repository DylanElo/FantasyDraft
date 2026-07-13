/* Cursed Arena V2 — Combat + Results. Versus header, perspective battlefield,
   focused-technique command console, burst-ray victory. */

const DSv2b = window.CursedArenaDesignSystem_845983;
const { Button: BtnV2, Badge: BadgeV2, ProgressBar: BarV2, EnergyPip: PipV2, CurrencyPill: CurV2, Sheet: SheetV2 } = DSv2b;

/* Cut-corner fighter card */
function FighterCardV2({ c, hp, side, selected, targetable, onClick }) {
  const rim = selected ? 'var(--gold-400)' : targetable ? 'var(--teal-400)' : 'var(--ink-950)';
  return (
    <button onClick={onClick} className={targetable ? 'fx-target-pulse' : ''} style={{
      width: 104, border: 'none', background: rim, padding: 2.5, cursor: 'pointer',
      clipPath: 'var(--clip-blade)', position: 'relative', textAlign: 'left',
    }}>
      <div style={{ clipPath: 'var(--clip-blade)', background: 'var(--ink-800)', position: 'relative' }}>
        <img src={c.portrait} alt={c.name} style={{ width: '100%', height: 88, objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 88, background: side === 'enemy' ? 'linear-gradient(180deg, transparent 55%, rgba(216,32,59,0.28))' : 'linear-gradient(180deg, transparent 55%, rgba(14,11,22,0.55))' }} />
        <div style={{ padding: '5px 7px 7px' }}>
          <div className="ca-label" style={{ fontSize: 8.5, color: 'var(--text-on-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name.split(' ')[0]}</div>
          <div style={{ marginTop: 4 }}><BarV2 value={hp} max={100} tone={side === 'enemy' ? 'danger' : 'hp'} height={8} /></div>
        </div>
        {selected && <div style={{ position: 'absolute', top: 4, left: 4, clipPath: 'var(--clip-tag)', background: 'var(--gold-400)', color: 'var(--ink-950)', fontSize: 8, fontWeight: 900, padding: '2px 10px 2px 5px', textTransform: 'uppercase' }}>Active</div>}
      </div>
    </button>
  );
}

/* ── COMBAT ──────────────────────────────────────────────────────────── */
function CombatV2({ go }) {
  const allies = window.CA_ROSTER.slice(0, 3);
  const enemies = [window.CA_ROSTER[5], window.CA_ROSTER[3], window.CA_ROSTER[4]];
  const [caster, setCaster] = React.useState('yuji');
  const [tab, setTab] = React.useState(0);
  const [armed, setArmed] = React.useState(false);
  const [queued, setQueued] = React.useState([]);
  const [review, setReview] = React.useState(false);
  const skills = window.CA_SKILLS[caster] || window.CA_SKILLS.yuji;
  const skill = skills[tab];

  const pickTarget = (enemy) => {
    if (!armed) return;
    setQueued(q => [...q.filter(x => x.caster !== caster), { caster, skill, target: enemy.name }]);
    setArmed(false);
    const next = allies.find(a => a.id !== caster && !queued.some(q2 => q2.caster === a.id));
    if (next) { setCaster(next.id); setTab(0); }
  };

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #1A0F2E 0%, var(--ink-950) 40%)' }}>
      {/* Versus header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px 6px', position: 'relative', zIndex: 2 }}>
        <div style={{ flex: 1 }}><BarV2 value={269} max={300} tone="hp" height={10} /></div>
        <div style={{ width: 34, height: 34, clipPath: 'var(--clip-blade-both)', background: 'linear-gradient(180deg, var(--gold-300), var(--gold-500))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--ink-950)', transform: 'rotate(45deg)' }}>
          <span style={{ transform: 'rotate(-45deg)' }}>VS</span>
        </div>
        <div style={{ flex: 1 }}><BarV2 value={246} max={300} tone="danger" height={10} /></div>
      </div>
      {/* Turn banner + energy */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 14px 6px', position: 'relative', zIndex: 2 }}>
        <div style={{ clipPath: 'var(--clip-tag)', background: 'var(--gold-400)', padding: '4px 18px 4px 10px', transform: 'skewX(-6deg)' }}>
          <span className="ca-eyebrow" style={{ color: 'var(--ink-950)', display: 'inline-block', transform: 'skewX(6deg)' }}>Your Turn</span>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '5px 9px', borderRadius: 'var(--r-pill)', background: 'var(--ink-900)', boxShadow: 'var(--shadow-inset-well)' }}>
          {['B', 'B', 'T', 'F'].map((t, i) => <PipV2 key={i} type={t} size={17} />)}
          <PipV2 type="C" size={17} filled={false} />
        </div>
        <span className="ca-stat" style={{ fontSize: 12, color: 'var(--text-on-dark-dim)' }}>0:24</span>
      </div>
      {/* Enemy row */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '4px 0 2px', position: 'relative', zIndex: 2 }}>
        {enemies.map((c, i) => <FighterCardV2 key={c.id} c={c} hp={[84, 100, 62][i]} side="enemy" targetable={armed} onClick={() => pickTarget(c)} />)}
      </div>
      {/* Battlefield with perspective grid */}
      <div style={{ flex: 1, minHeight: 46, position: 'relative', margin: '2px 0', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', left: '-24%', right: '-24%', top: '10%', bottom: '-30%',
          backgroundImage: 'linear-gradient(rgba(139,63,240,0.16) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(139,63,240,0.16) 1.5px, transparent 1.5px)',
          backgroundSize: '44px 44px', transform: 'perspective(300px) rotateX(55deg)', transformOrigin: '50% 0%',
        }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ clipPath: 'var(--clip-banner)', background: 'rgba(14,11,22,0.85)', padding: '8px 30px', border: 'none' }}>
            <span className="ca-body-sm" style={{ fontSize: 12, color: armed ? 'var(--teal-400)' : 'var(--text-on-dark-dim)' }}>
              {armed ? `Choose a target — ${skill.name}` : queued.length ? `${queued.length}/3 actions queued` : 'Pick a fighter, arm a technique'}
            </span>
          </div>
        </div>
      </div>
      {/* Ally row */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '2px 0 4px', position: 'relative', zIndex: 2 }}>
        {allies.map((c, i) => <FighterCardV2 key={c.id} c={c} hp={[100, 78, 91][i]} side="ally" selected={caster === c.id} onClick={() => { setCaster(c.id); setTab(0); setArmed(false); }} />)}
      </div>
      {/* Command console */}
      <div style={{ background: 'var(--ink-900)', borderTop: '2px solid var(--ink-950)', padding: '8px 14px 12px', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', zIndex: 2 }}>
        {/* Technique tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {skills.map((s, i) => (
            <button key={s.name} onClick={() => { setTab(i); setArmed(false); }} style={{
              clipPath: 'var(--clip-blade)', border: 'none', cursor: 'pointer', padding: '7px 4px 6px',
              background: i === tab ? 'linear-gradient(180deg, var(--curse-400), var(--curse-600))' : 'var(--ink-700)',
              opacity: s.state !== 'ready' ? 0.5 : 1,
            }}>
              <div className="ca-label" style={{ fontSize: 8, color: i === tab ? '#fff' : 'var(--text-on-dark-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
              <div style={{ display: 'flex', gap: 2.5, justifyContent: 'center', marginTop: 4 }}>
                {s.cost.map((t, j) => <PipV2 key={j} type={t} size={9} />)}
              </div>
            </button>
          ))}
        </div>
        {/* Focused technique panel */}
        <div style={{ display: 'flex', gap: 10, clipPath: 'var(--clip-blade)', background: 'var(--ink-800)', padding: '10px 12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ca-h3" style={{ fontSize: 14 }}>{skill.name}</div>
            <div className="ca-body-sm" style={{ fontSize: 11, marginTop: 2 }}>{skill.effect}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
              <span className="ca-stat" style={{ fontSize: 10, color: 'var(--gold-400)' }}>CD {skill.cooldown}</span>
              {skill.state !== 'ready' && <BadgeV2 tone="red">{skill.state === 'cooldown' ? 'On Cooldown' : skill.state === 'energy' ? 'Need Energy' : 'Stunned'}</BadgeV2>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <BtnV2 variant={armed ? 'gold' : 'primary'} size="md" disabled={skill.state !== 'ready'} onClick={() => setArmed(a => !a)}>{armed ? 'Armed ▲' : 'Use'}</BtnV2>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <BtnV2 variant="ghost" size="sm" onClick={() => { setQueued([]); setArmed(false); }}>Reset</BtnV2>
          <BtnV2 variant="primary" size="sm" fullWidth disabled={queued.length === 0} onClick={() => setReview(true)}>Review Queue ({queued.length})</BtnV2>
        </div>
      </div>
      {/* Queue review */}
      <SheetV2 open={review} title="Queue Review" onClose={() => setReview(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {queued.map((q, i) => {
            const c = window.CA_ROSTER.find(r => r.id === q.caster);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', clipPath: 'var(--clip-blade)', background: 'var(--ink-700)' }}>
                <span className="ca-stat" style={{ fontSize: 14, color: 'var(--gold-400)' }}>{i + 1}</span>
                <img src={c.portrait} alt={c.name} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--ink-950)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ca-h3" style={{ fontSize: 12 }}>{q.skill.name}</div>
                  <div className="ca-body-sm" style={{ fontSize: 11 }}>→ {q.target}</div>
                </div>
                <div style={{ display: 'flex', gap: 3 }}>{q.skill.cost.map((t, j) => <PipV2 key={j} type={t} size={13} />)}</div>
              </div>
            );
          })}
          <div className="ca-body-sm" style={{ fontSize: 12 }}>Wild costs are paid from remaining energy, left to right.</div>
          <BtnV2 variant="primary" size="lg" fullWidth onClick={() => go('results')}>Confirm Queue</BtnV2>
        </div>
      </SheetV2>
    </div>
  );
}

/* ── RESULTS ─────────────────────────────────────────────────────────── */
function ResultsV2({ go }) {
  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center', overflow: 'hidden' }}>
      <div className="fx-rays" style={{ position: 'absolute', width: 900, height: 900, left: '50%', top: '30%', marginLeft: -450, marginTop: -450, borderRadius: '50%' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 90% 60% at 50% 24%, rgba(240,168,46,0.2), transparent 65%)' }} />
      <div className="ca-display-hero ca-text-gradient-gold fx-pop-in" style={{ position: 'relative', fontSize: 62, textShadow: 'none' }}>Victory</div>
      <div className="fx-pop-in" style={{ position: 'relative', width: 170, clipPath: 'var(--clip-blade-both)', background: 'var(--gold-400)', padding: 3, animationDelay: '0.1s' }}>
        <img src="../../assets/portraits/yuji-black-flash.svg" alt="MVP fighter" style={{ width: '100%', display: 'block', clipPath: 'var(--clip-blade-both)' }} />
      </div>
      <div className="fx-pop-in" style={{ position: 'relative', animationDelay: '0.2s' }}>
        <BadgeV2 tone="gold">MVP · Yuji Itadori</BadgeV2>
      </div>
      <div className="fx-pop-in" style={{ position: 'relative', display: 'flex', gap: 10, animationDelay: '0.3s' }}>
        <CurV2 kind="gold" amount={240} />
        <CurV2 kind="gem" amount={5} />
        <BadgeV2 tone="curse">+38 XP</BadgeV2>
        <BadgeV2 tone="gold">🏆 +30</BadgeV2>
      </div>
      <div className="fx-pop-in" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 280, animationDelay: '0.4s' }}>
        <BtnV2 variant="primary" size="lg" fullWidth onClick={() => go('team')}>Battle Again</BtnV2>
        <BtnV2 variant="ghost" size="md" fullWidth onClick={() => go('home')}>Home</BtnV2>
      </div>
    </div>
  );
}

Object.assign(window, { CombatV2, ResultsV2, FighterCardV2 });
