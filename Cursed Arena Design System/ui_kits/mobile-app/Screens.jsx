/* Cursed Arena — UI kit screens (Lobby, Roster, Team, Combat, Results).
   Loaded as text/babel; exposes screens on window for App.jsx. */

const DS = window.CursedArenaDesignSystem_845983;
const { Button, IconButton, Card, SkillCard, Badge, ProgressBar, EnergyPip, CurrencyPill, Sheet } = DS;

/* ── Shared chrome ─────────────────────────────────────────────────── */

function TopHud({ onStore }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 42, height: 42, borderRadius: 'var(--r-sm)', border: '2px solid var(--ink-950)', boxShadow: 'var(--bevel-plate)', background: 'linear-gradient(180deg, var(--curse-400), var(--curse-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 18, color: '#fff' }}>28</div>
        <div>
          <div className="ca-h3" style={{ fontSize: 13 }}>KaidoMain</div>
          <div style={{ width: 74, marginTop: 3 }}><ProgressBar value={62} max={100} tone="xp" height={7} /></div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <CurrencyPill kind="gold" amount={4820} onAdd={onStore} />
        <CurrencyPill kind="gem" amount={128} onAdd={onStore} />
      </div>
    </div>
  );
}

function ScreenTitle({ children, sub }) {
  return (
    <div style={{ padding: '4px 20px 12px' }}>
      <div className="ca-h1" style={{ fontSize: 30 }}>{children}</div>
      {sub && <div className="ca-body-sm" style={{ marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ── Lobby / Home ──────────────────────────────────────────────────── */

function LobbyScreen({ go }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopHud />
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Hero poster */}
        <div style={{ position: 'relative', borderRadius: 'var(--r-xl)', overflow: 'hidden', border: '3px solid var(--ink-950)', boxShadow: 'var(--shadow-lg)', minHeight: 300, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <img src="../../assets/portraits/gojo-young.svg" alt="Featured fighter poster" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 35%, rgba(14,11,22,0.92) 88%)' }} />
          <div style={{ position: 'relative', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <Badge tone="gold">Season 4</Badge>
              <Badge tone="curse">Hidden Inventory</Badge>
            </div>
            <div className="ca-h2" style={{ fontSize: 24 }}>Welcome to Jujutsu High</div>
            <Button variant="primary" size="lg" fullWidth onClick={() => go('team')}>⚔&nbsp; Battle</Button>
          </div>
        </div>
        {/* Secondary modes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <ModeTile emoji="🤝" label="Private Match" sub="Play a friend" onClick={() => go('team')} />
          <ModeTile emoji="🗺" label="Missions" sub="Student Era 3/9" onClick={() => go('team')} />
        </div>
        {/* Season pass strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--ink-800)', border: '2px solid var(--ink-950)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--r-sm)', background: 'linear-gradient(180deg, var(--gold-300), var(--gold-500))', border: '2px solid var(--ink-950)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎁</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ca-h3" style={{ fontSize: 13 }}>Arena Pass</div>
            <div style={{ marginTop: 5 }}><ProgressBar value={7} max={10} tone="energy" height={9} /></div>
          </div>
          <Button variant="gold" size="sm">Claim</Button>
        </div>
      </div>
    </div>
  );
}

function ModeTile({ emoji, label, sub, onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '14px 14px 12px', borderRadius: 'var(--r-md)', background: 'var(--ink-800)', border: '2px solid var(--ink-950)', boxShadow: 'var(--bevel-plate), 0 3px 0 var(--ink-950)', cursor: 'pointer', textAlign: 'left', color: 'var(--text-on-dark)' }}>
      <span style={{ fontSize: 22 }}>{emoji}</span>
      <span className="ca-h3" style={{ fontSize: 14 }}>{label}</span>
      <span className="ca-body-sm" style={{ fontSize: 11 }}>{sub}</span>
    </button>
  );
}

/* ── Roster / Collection ───────────────────────────────────────────── */

function RosterScreen() {
  const [filter, setFilter] = React.useState('All');
  const [detail, setDetail] = React.useState(null);
  const factions = ['All', 'Tokyo', 'Kyoto', 'Sorcerer'];
  const roster = window.CA_ROSTER.filter(c => filter === 'All' || c.faction === filter);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <TopHud />
      <ScreenTitle sub="19 fighters unlocked · Student Era">Roster</ScreenTitle>
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', overflowX: 'auto' }}>
        {factions.map(f => (
          <button key={f} onClick={() => setFilter(f)} className="ca-label" style={{ padding: '7px 14px', borderRadius: 'var(--r-pill)', border: '2px solid var(--ink-950)', background: filter === f ? 'var(--curse-600)' : 'var(--ink-800)', color: filter === f ? '#fff' : 'var(--text-on-dark-dim)', cursor: 'pointer', whiteSpace: 'nowrap' }}>{f}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignContent: 'start' }}>
        {roster.map(c => (
          <Card key={c.id} name={c.name} faction={c.faction} rarity={c.rarity} portraitUrl={c.portrait} onClick={() => setDetail(c)} />
        ))}
      </div>
      <Sheet open={!!detail} title={detail ? detail.name : ''} onClose={() => setDetail(null)}>
        {detail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <Badge tone="teal">{detail.faction}</Badge>
              <Badge tone="curse">{detail.role}</Badge>
              <Badge tone="gold">{detail.rarity}</Badge>
            </div>
            {(window.CA_SKILLS[detail.id] || window.CA_SKILLS.yuji).map(s => (
              <SkillCard key={s.name} name={s.name} cost={s.cost} cooldown={s.cooldown} effect={s.effect} state="ready" />
            ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}

/* ── Team builder (pick 3) ─────────────────────────────────────────── */

function TeamScreen({ go }) {
  const [picked, setPicked] = React.useState(['yuji', 'megumi', 'nobara']);
  const toggle = (id) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : (p.length < 3 ? [...p, id] : p));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopHud />
      <ScreenTitle sub="Pick 3 fighters for your trio">Team Builder</ScreenTitle>
      <div style={{ display: 'flex', gap: 10, padding: '0 16px 12px' }}>
        {[0, 1, 2].map(i => {
          const c = window.CA_ROSTER.find(r => r.id === picked[i]);
          return (
            <div key={i} style={{ flex: 1, aspectRatio: '3/4', borderRadius: 'var(--r-md)', border: c ? '3px solid var(--curse-400)' : '3px dashed var(--ink-500)', overflow: 'hidden', background: 'var(--ink-800)', boxShadow: c ? 'var(--aura-curse)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {c ? <img src={c.portrait} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span className="ca-label">Slot {i + 1}</span>}
            </div>
          );
        })}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, alignContent: 'start' }}>
        {window.CA_ROSTER.map(c => (
          <div key={c.id} onClick={() => toggle(c.id)} style={{ borderRadius: 'var(--r-sm)', overflow: 'hidden', border: picked.includes(c.id) ? '3px solid var(--curse-400)' : '3px solid var(--ink-950)', cursor: 'pointer', position: 'relative', aspectRatio: '3/4' }}>
            <img src={c.portrait} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {picked.includes(c.id) && <div style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'var(--curse-500)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, border: '2px solid var(--ink-950)' }}>✓</div>}
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 16px 16px' }}>
        <Button variant="primary" size="lg" fullWidth disabled={picked.length !== 3} onClick={() => go('combat')}>Enter Arena</Button>
      </div>
    </div>
  );
}

/* ── Combat ────────────────────────────────────────────────────────── */

function FighterToken({ c, hp, side, selected, targetable, dead, onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', width: 92, opacity: dead ? 0.35 : 1, filter: dead ? 'grayscale(1)' : 'none' }}>
      <div style={{
        width: 68, height: 68, borderRadius: '50%', overflow: 'hidden', position: 'relative',
        border: selected ? '3px solid var(--gold-400)' : targetable ? '3px solid var(--teal-400)' : '3px solid var(--ink-950)',
        boxShadow: selected ? 'var(--aura-gold)' : targetable ? 'var(--aura-teal)' : 'var(--shadow-sm)',
        animation: targetable ? 'ca-pulse 1.2s ease-in-out infinite' : 'none',
      }}>
        <img src={c.portrait} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
      </div>
      <div style={{ width: 80 }}><ProgressBar value={hp} max={100} tone={side === 'enemy' ? 'danger' : 'hp'} height={9} /></div>
      <span className="ca-label" style={{ fontSize: 9, color: 'var(--text-on-dark-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 88 }}>{c.name.split(' ')[0]}</span>
    </button>
  );
}

function CombatScreen({ go }) {
  const allies = window.CA_ROSTER.slice(0, 3);
  const enemies = [window.CA_ROSTER[5], window.CA_ROSTER[3], window.CA_ROSTER[4]];
  const [caster, setCaster] = React.useState('yuji');
  const [skill, setSkill] = React.useState(null);
  const [queued, setQueued] = React.useState([]);
  const [review, setReview] = React.useState(false);
  const skills = window.CA_SKILLS[caster] || window.CA_SKILLS.yuji;

  const pickTarget = (enemy) => {
    if (!skill) return;
    setQueued(q => [...q.filter(x => x.caster !== caster), { caster, skill, target: enemy.name }]);
    setSkill(null);
    const next = allies.find(a => a.id !== caster && !queued.some(q2 => q2.caster === a.id));
    if (next) setCaster(next.id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Combat HUD */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
        <Badge tone="gold">Your Turn</Badge>
        <div style={{ display: 'flex', gap: 5 }}>
          {['B', 'B', 'T', 'F'].map((t, i) => <EnergyPip key={i} type={t} size={18} />)}
          <EnergyPip type="C" size={18} filled={false} />
        </div>
        <span className="ca-stat" style={{ fontSize: 12 }}>0:24</span>
      </div>
      {/* Enemy row */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '6px 0' }}>
        {enemies.map((c, i) => <FighterToken key={c.id} c={c} hp={[84, 100, 62][i]} side="enemy" targetable={!!skill} dead={false} onClick={() => pickTarget(c)} />)}
      </div>
      {/* Battlefield */}
      <div style={{ flex: 1, margin: '4px 16px', borderRadius: 'var(--r-lg)', border: '2px solid var(--ink-950)', background: 'radial-gradient(ellipse at 50% 30%, var(--ink-700), var(--ink-900))', boxShadow: 'var(--shadow-inset-well)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 64 }}>
        <span className="ca-body-sm" style={{ padding: '0 20px', textAlign: 'center' }}>
          {skill ? `Choose a target for ${skill.name}` : queued.length ? `${queued.length}/3 actions queued` : 'Select a fighter, then a technique'}
        </span>
      </div>
      {/* Ally row */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '6px 0' }}>
        {allies.map((c, i) => <FighterToken key={c.id} c={c} hp={[100, 78, 91][i]} side="ally" selected={caster === c.id} dead={false} onClick={() => { setCaster(c.id); setSkill(null); }} />)}
      </div>
      {/* Command dock */}
      <div style={{ padding: '8px 16px 14px', display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--ink-900)', borderTop: '2px solid var(--ink-950)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {skills.map(s => (
            <SkillCard key={s.name} name={s.name} cost={s.cost} cooldown={s.cooldown} effect={skill && skill.name === s.name ? s.effect : undefined} state={s.state} onClick={() => setSkill(s)} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={() => { setQueued([]); setSkill(null); }}>Reset</Button>
          <Button variant="primary" size="sm" fullWidth disabled={queued.length === 0} onClick={() => setReview(true)}>Review Queue ({queued.length})</Button>
        </div>
      </div>
      {/* Queue Review sheet */}
      <Sheet open={review} title="Queue Review" onClose={() => setReview(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {queued.map((q, i) => {
            const c = window.CA_ROSTER.find(r => r.id === q.caster);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'var(--ink-700)', border: '2px solid var(--ink-950)' }}>
                <span className="ca-stat" style={{ fontSize: 13, color: 'var(--gold-400)' }}>{i + 1}</span>
                <img src={c.portrait} alt={c.name} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--ink-950)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ca-h3" style={{ fontSize: 12 }}>{q.skill.name}</div>
                  <div className="ca-body-sm" style={{ fontSize: 11 }}>→ {q.target}</div>
                </div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {q.skill.cost.map((t, j) => <EnergyPip key={j} type={t} size={13} />)}
                </div>
              </div>
            );
          })}
          <div className="ca-body-sm" style={{ fontSize: 12 }}>Wild costs are paid from remaining energy, left to right.</div>
          <Button variant="primary" size="lg" fullWidth onClick={() => go('results')}>Confirm Queue</Button>
        </div>
      </Sheet>
    </div>
  );
}

/* ── Results ───────────────────────────────────────────────────────── */

function ResultsScreen({ go }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 90% 55% at 50% 20%, rgba(240,168,46,0.22), transparent 70%)' }} />
      <div className="ca-display-hero ca-text-gradient-gold" style={{ position: 'relative' }}>Victory</div>
      <div style={{ position: 'relative', width: 160, borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '3px solid var(--gold-400)', boxShadow: 'var(--aura-gold), var(--shadow-lg)' }}>
        <img src="../../assets/portraits/yuji-black-flash.svg" alt="MVP fighter" style={{ width: '100%', display: 'block' }} />
      </div>
      <div style={{ position: 'relative' }}>
        <Badge tone="gold">MVP · Yuji Itadori</Badge>
      </div>
      <div style={{ position: 'relative', display: 'flex', gap: 10 }}>
        <CurrencyPill kind="gold" amount={240} />
        <CurrencyPill kind="gem" amount={5} />
        <Badge tone="curse">+38 XP</Badge>
      </div>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 280 }}>
        <Button variant="primary" size="lg" fullWidth onClick={() => go('team')}>Battle Again</Button>
        <Button variant="ghost" size="md" fullWidth onClick={() => go('home')}>Home</Button>
      </div>
    </div>
  );
}

Object.assign(window, { LobbyScreen, RosterScreen, TeamScreen, CombatScreen, ResultsScreen, TopHud });
