/* Cursed Arena V2 — Lobby, Team Builder, Roster. Angular blade geometry,
   shine sweeps, ember field, poster-first composition. */

const DSv2 = window.CursedArenaDesignSystem_845983;
const { Button, Card, SkillCard, Badge, ProgressBar, EnergyPip, CurrencyPill, Sheet } = DSv2;

/* ── Ambient layer: kanji watermark + embers ─────────────────────────── */
function AmbientField() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div className="fx-kanji-wm" style={{ position: 'absolute', fontSize: 420, right: -110, top: 120, transform: 'rotate(8deg)' }}>呪</div>
      {[8, 22, 41, 58, 74, 90].map((x, i) => (
        <div key={i} className="fx-ember" style={{ '--x': x + '%', '--d': (i * 0.9) + 's', bottom: 40 }}></div>
      ))}
    </div>
  );
}

/* ── Angular chrome bits ─────────────────────────────────────────────── */
function BladePlate({ children, style, onClick, tone = 'ink' }) {
  const bg = {
    ink: 'linear-gradient(180deg, var(--ink-700), var(--ink-800))',
    curse: 'linear-gradient(180deg, var(--curse-400), var(--curse-600))',
    gold: 'linear-gradient(180deg, var(--gold-300), var(--gold-500))',
  }[tone];
  return (
    <div onClick={onClick} style={{ clipPath: 'var(--clip-blade)', background: 'var(--ink-950)', padding: 2.5, cursor: onClick ? 'pointer' : 'default', ...style }}>
      <div style={{ clipPath: 'var(--clip-blade)', background: bg, width: '100%', height: '100%', boxShadow: 'var(--bevel-plate)' }}>
        {children}
      </div>
    </div>
  );
}

function SectionBanner({ children }) {
  return (
    <div style={{ display: 'inline-block', clipPath: 'var(--clip-tag)', background: 'var(--curse-600)', padding: '5px 22px 5px 12px', transform: 'skewX(-6deg)' }}>
      <span className="ca-eyebrow" style={{ color: '#fff', transform: 'skewX(6deg)', display: 'inline-block' }}>{children}</span>
    </div>
  );
}

function HudV2() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 8px', position: 'relative', zIndex: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 44, height: 44, clipPath: 'var(--clip-blade-both)', background: 'linear-gradient(180deg, var(--curse-400), var(--curse-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 17, color: '#fff' }}>28</div>
        <div>
          <div className="ca-h3" style={{ fontSize: 12 }}>KaidoMain</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <span style={{ color: 'var(--gold-400)', fontSize: 11 }}>🏆</span>
            <span className="ca-stat" style={{ fontSize: 11, color: 'var(--gold-300)' }}>1,284</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 7 }}>
        <CurrencyPill kind="gold" amount={4820} onAdd={() => {}} />
        <CurrencyPill kind="gem" amount={128} onAdd={() => {}} />
      </div>
    </div>
  );
}

/* ── LOBBY ───────────────────────────────────────────────────────────── */
function LobbyV2({ go }) {
  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Poster hero fills the screen behind everything */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <img src="../../assets/portraits/gojo-young.svg" alt="Featured fighter" style={{ width: '100%', height: '68%', objectFit: 'cover', objectPosition: 'center 18%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(14,11,22,0.25) 0%, transparent 22%, transparent 38%, rgba(14,11,22,0.94) 62%, var(--ink-950) 74%)' }} />
        <div className="fx-scanlines" style={{ position: 'absolute', inset: 0 }} />
      </div>
      <AmbientField />
      <HudV2 />
      {/* Season banner */}
      <div style={{ position: 'relative', zIndex: 2, padding: '2px 16px' }}>
        <SectionBanner>Season 4 · Hidden Inventory</SectionBanner>
      </div>
      <div style={{ flex: 1 }} />
      {/* Command area */}
      <div style={{ position: 'relative', zIndex: 2, padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div className="ca-h1" style={{ fontSize: 34, textShadow: '0 4px 0 rgba(0,0,0,0.45)' }}>Welcome to<br />Jujutsu High</div>
        {/* Giant battle CTA */}
        <button onClick={() => go('team')} className="fx-shine fx-breathe" style={{
          clipPath: 'var(--clip-blade-both)', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(180deg, var(--curse-400) 0%, var(--curse-600) 100%)',
          height: 76, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          fontFamily: 'var(--font-display)', fontSize: 30, color: '#fff', textTransform: 'uppercase',
          letterSpacing: 1, textShadow: '0 3px 0 rgba(0,0,0,0.35)',
        }}>
          ⚔ Battle
        </button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
          <BladePlate tone="ink" onClick={() => go('team')}>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 19 }}>🤝</div>
              <div className="ca-h3" style={{ fontSize: 13, marginTop: 2 }}>Private Match</div>
              <div className="ca-body-sm" style={{ fontSize: 10 }}>Challenge a friend</div>
            </div>
          </BladePlate>
          <BladePlate tone="ink" onClick={() => go('team')}>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 19 }}>🗺</div>
              <div className="ca-h3" style={{ fontSize: 13, marginTop: 2 }}>Missions</div>
              <div className="ca-body-sm" style={{ fontSize: 10 }}>Student Era · 3/9</div>
            </div>
          </BladePlate>
        </div>
        {/* Arena pass strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', clipPath: 'var(--clip-blade)', background: 'var(--ink-800)' }}>
          <div className="fx-shine" style={{ width: 40, height: 40, clipPath: 'var(--clip-blade-both)', background: 'linear-gradient(180deg, var(--gold-300), var(--gold-500))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎁</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ca-h3" style={{ fontSize: 12 }}>Arena Pass · Tier 7</div>
            <div style={{ marginTop: 4 }}><ProgressBar value={7} max={10} tone="energy" height={8} /></div>
          </div>
          <Button variant="gold" size="sm">Claim</Button>
        </div>
      </div>
    </div>
  );
}

/* ── TEAM BUILDER ────────────────────────────────────────────────────── */
function TeamV2({ go }) {
  const [picked, setPicked] = React.useState(['yuji', 'megumi', 'nobara']);
  const toggle = (id) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : (p.length < 3 ? [...p, id] : p));
  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <AmbientField />
      <HudV2 />
      <div style={{ padding: '0 16px 8px', position: 'relative', zIndex: 2 }}>
        <SectionBanner>Assemble Your Trio</SectionBanner>
        <div className="ca-h1" style={{ fontSize: 28, marginTop: 6 }}>Team Builder</div>
      </div>
      {/* Pedestal */}
      <div style={{ position: 'relative', zIndex: 2, padding: '4px 16px 10px' }}>
        <div style={{ display: 'flex', gap: 10, position: 'relative' }}>
          <div style={{ position: 'absolute', left: '8%', right: '8%', bottom: -7, height: 22, background: 'radial-gradient(ellipse, rgba(139,63,240,0.5), transparent 70%)', filter: 'blur(6px)' }} />
          {[0, 1, 2].map(i => {
            const c = window.CA_ROSTER.find(r => r.id === picked[i]);
            return (
              <div key={i} style={{ flex: 1, aspectRatio: '3/4.4', clipPath: 'var(--clip-blade-both)', background: c ? 'var(--ink-950)' : 'var(--ink-900)', padding: c ? 2.5 : 0, position: 'relative' }}>
                {c
                  ? <img src={c.portrait} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover', clipPath: 'var(--clip-blade-both)' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--ink-500)' }}><span className="ca-label">Slot {i + 1}</span></div>}
              </div>
            );
          })}
        </div>
      </div>
      {/* Grid */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '2px 16px 10px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, alignContent: 'start', position: 'relative', zIndex: 2 }}>
        {window.CA_ROSTER.map(c => (
          <div key={c.id} onClick={() => toggle(c.id)} className={picked.includes(c.id) ? '' : ''} style={{ position: 'relative', aspectRatio: '3/4', clipPath: 'var(--clip-blade)', cursor: 'pointer', background: picked.includes(c.id) ? 'var(--curse-400)' : 'var(--ink-950)', padding: 2.5 }}>
            <img src={c.portrait} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover', clipPath: 'var(--clip-blade)', filter: picked.includes(c.id) ? 'none' : 'saturate(0.85)' }} />
            {picked.includes(c.id) && <div style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'var(--curse-500)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, border: '2px solid var(--ink-950)' }}>✓</div>}
          </div>
        ))}
      </div>
      <div style={{ padding: '8px 16px 14px', position: 'relative', zIndex: 2 }}>
        <Button variant="primary" size="lg" fullWidth disabled={picked.length !== 3} onClick={() => go('combat')}>Enter Arena</Button>
      </div>
    </div>
  );
}

/* ── ROSTER ──────────────────────────────────────────────────────────── */
function RosterV2() {
  const [filter, setFilter] = React.useState('All');
  const [detail, setDetail] = React.useState(null);
  const factions = ['All', 'Tokyo', 'Kyoto', 'Sorcerer'];
  const roster = window.CA_ROSTER.filter(c => filter === 'All' || c.faction === filter);
  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <AmbientField />
      <HudV2 />
      <div style={{ padding: '0 16px 10px', position: 'relative', zIndex: 2 }}>
        <SectionBanner>Collection · 19 Unlocked</SectionBanner>
        <div className="ca-h1" style={{ fontSize: 28, marginTop: 6 }}>Roster</div>
      </div>
      <div style={{ display: 'flex', gap: 7, padding: '0 16px 12px', position: 'relative', zIndex: 2 }}>
        {factions.map(f => (
          <button key={f} onClick={() => setFilter(f)} className="ca-label" style={{ padding: '7px 13px', clipPath: 'var(--clip-blade)', border: 'none', background: filter === f ? 'var(--curse-600)' : 'var(--ink-800)', color: filter === f ? '#fff' : 'var(--text-on-dark-dim)', cursor: 'pointer' }}>{f}</button>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignContent: 'start', position: 'relative', zIndex: 2 }}>
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

Object.assign(window, { LobbyV2, TeamV2, RosterV2, AmbientField, BladePlate, SectionBanner, HudV2 });
